import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { execFile } from 'child_process';
import {
  BlockRole,
  BlockType as PrismaBlockType,
  ExamNodeType,
  ExamVariantCode,
  IngestionJobStatus,
  MediaType,
  Prisma,
  PublicationStatus,
  SessionType,
  SourceDocumentKind,
} from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service';
import {
  DraftAsset,
  DraftBlock,
  DraftBlockRole,
  DraftDocumentKind,
  DraftNode,
  DraftVariantCode,
  IngestionDraft,
  createEmptyDraft,
  normalizeIngestionDraft,
} from './ingestion.contract';
import {
  extractDraftWithGemini,
  hasGeminiApiKeyConfigured,
  hasGeminiExtraction,
  readDefaultGeminiMaxOutputTokens,
  readDefaultGeminiModel,
  readDefaultGeminiTemperature,
  recoverBlockSuggestionFromGemini,
} from './gemini-extractor';
import { validateIngestionDraft } from './ingestion-validation';
import { mapWithConcurrency } from './intake-runtime';
import { R2StorageClient, readR2ConfigFromEnv } from './r2-storage';
import {
  CanonicalStorageContext,
  buildCanonicalDocumentFileName,
  buildCanonicalDocumentStorageKey,
  buildCanonicalPageStorageKey,
} from './storage-naming';

const execFileAsync = promisify(execFile);
const DEFAULT_RASTER_DPI = readPositiveIntegerEnv(
  process.env.INGESTION_RASTER_DPI,
  220,
  72,
);
const DEFAULT_PAGE_CONCURRENCY = readPositiveIntegerEnv(
  process.env.INGESTION_PAGE_CONCURRENCY,
  4,
);
const PUBLISHED_REVISION_PROVIDER = 'published_revision';

type AdminIngestionStatus =
  | 'draft'
  | 'in_review'
  | 'approved'
  | 'published'
  | 'failed';

type IntakeUploadDocumentInput = {
  buffer: Buffer;
  mimeType: string;
  originalFileName: string;
};

type FullIngestionJobRecord = Prisma.IngestionJobGetPayload<{
  include: {
    sourceDocuments: {
      include: {
        pages: {
          orderBy: {
            pageNumber: 'asc';
          };
        };
      };
      orderBy: {
        kind: 'asc';
      };
    };
  };
}>;

type PreparedPublishedAsset = {
  assetId: string;
  mediaId: string;
  storageKey: string;
  width: number | null;
  height: number | null;
  classification: DraftAsset['classification'];
  sourcePageId: string;
  cropBox: DraftAsset['cropBox'];
};

@Injectable()
export class IngestionService {
  private storageClient: R2StorageClient | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async listJobs() {
    const jobs = await this.prisma.ingestionJob.findMany({
      include: {
        sourceDocuments: {
          include: {
            pages: {
              select: {
                id: true,
              },
            },
          },
        },
        publishedExam: {
          select: {
            id: true,
            stream: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
        publishedPaper: {
          select: {
            offerings: {
              select: {
                id: true,
                stream: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      data: jobs.map((job) => ({
        id: job.id,
        label: job.label,
        provider: job.provider,
        year: job.year,
        stream_code: job.streamCode,
        subject_code: job.subjectCode,
        session: this.fromSessionType(job.sessionType),
        min_year: job.minYear,
        status: this.fromIngestionStatus(job.status),
        source_document_count: job.sourceDocuments.length,
        source_page_count: job.sourceDocuments.reduce(
          (sum, document) => sum + document.pages.length,
          0,
        ),
        workflow: this.buildWorkflowState(job),
        published_exam_id: job.publishedExamId,
        published_paper_id: job.publishedPaperId,
        published_exams: this.mapPublishedExamOfferings(job),
        created_at: job.createdAt,
        updated_at: job.updatedAt,
      })),
    };
  }

  async createManualUploadJob(input: {
    year: number;
    streamCode: string;
    paperStreamCodes?: string[];
    subjectCode: string;
    sessionType: 'NORMAL' | 'MAKEUP';
    title: string;
    qualifierKey?: string | null;
    sourceReference?: string | null;
    examDocument: IntakeUploadDocumentInput;
    correctionDocument?: IntakeUploadDocumentInput | null;
  }) {
    const streamCode = this.readOptionalString(input.streamCode);
    const subjectCode = this.readOptionalString(input.subjectCode);
    const qualifierKey = this.readOptionalString(input.qualifierKey);
    const sourceReference = this.readOptionalString(input.sourceReference);

    if (!streamCode || !subjectCode) {
      throw new BadRequestException(
        'streamCode and subjectCode are required for manual intake.',
      );
    }

    const title = this.readNonEmptyText(input.title, 'title');
    const year = this.readStrictPositiveYear(input.year);
    const sessionType =
      input.sessionType === 'MAKEUP' ? SessionType.MAKEUP : SessionType.NORMAL;
    const selectedPaperStreamCodes = Array.from(
      new Set(
        (input.paperStreamCodes ?? [])
          .map((value) => this.readOptionalString(value)?.toUpperCase() ?? null)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    if (!selectedPaperStreamCodes.includes(streamCode)) {
      selectedPaperStreamCodes.unshift(streamCode);
    }

    const sharedStreamCodes = selectedPaperStreamCodes.filter(
      (value) => value !== streamCode,
    );
    const context: CanonicalStorageContext = {
      year,
      streamCode,
      subjectCode,
      sessionType,
      qualifierKey,
    };

    this.assertPdfUpload(input.examDocument, 'examDocument');

    if (input.correctionDocument) {
      this.assertPdfUpload(input.correctionDocument, 'correctionDocument');
    }

    const draft = createEmptyDraft({
      year,
      streamCode,
      subjectCode,
      sessionType: input.sessionType,
      provider: 'manual_upload',
      title,
      minYear: year,
      metadata: {
        intakeMethod: 'manual_upload',
        sourceReference,
        qualifierKey,
        sharedStreamCodes,
        uploadedAt: new Date().toISOString(),
      },
    });

    const job = await this.prisma.ingestionJob.create({
      data: {
        label: title,
        provider: 'manual_upload',
        sourceListingUrl: null,
        sourceExamPageUrl: null,
        sourceCorrectionPageUrl: null,
        year,
        streamCode,
        subjectCode,
        sessionType,
        minYear: year,
        status: IngestionJobStatus.DRAFT,
        reviewNotes: sourceReference,
        draftJson: this.toJsonValue(draft),
        metadata: this.toJsonValue({
          intakeMethod: 'manual_upload',
          sourceReference,
          qualifierKey,
          sharedStreamCodes,
          uploadedAt: new Date().toISOString(),
        }),
      },
      include: {
        sourceDocuments: {
          include: {
            pages: {
              orderBy: {
                pageNumber: 'asc',
              },
            },
          },
          orderBy: {
            kind: 'asc',
          },
        },
      },
    });

    try {
      const examDocument = await this.storeManualSourceDocument({
        jobId: job.id,
        kind: SourceDocumentKind.EXAM,
        upload: input.examDocument,
        context,
        sourceReference,
      });
      draft.exam.examDocumentId = examDocument.id;
      draft.exam.examDocumentStorageKey = examDocument.storageKey;

      let correctionDocumentId: string | null = null;
      let correctionDocumentStorageKey: string | null = null;

      if (input.correctionDocument) {
        const correctionDocument = await this.storeManualSourceDocument({
          jobId: job.id,
          kind: SourceDocumentKind.CORRECTION,
          upload: input.correctionDocument,
          context,
          sourceReference,
        });
        correctionDocumentId = correctionDocument.id;
        correctionDocumentStorageKey = correctionDocument.storageKey;
      }

      draft.exam.correctionDocumentId = correctionDocumentId;
      draft.exam.correctionDocumentStorageKey = correctionDocumentStorageKey;

      const saved = await this.prisma.ingestionJob.update({
        where: {
          id: job.id,
        },
        data: {
          draftJson: this.toJsonValue(draft),
          errorMessage: null,
          status: IngestionJobStatus.DRAFT,
        },
        include: {
          sourceDocuments: {
            include: {
              pages: {
                orderBy: {
                  pageNumber: 'asc',
                },
              },
            },
            orderBy: {
              kind: 'asc',
            },
          },
        },
      });

      return this.mapJobDetail(saved, this.hydrateDraft(saved));
    } catch (error) {
      await this.prisma.ingestionJob.update({
        where: {
          id: job.id,
        },
        data: {
          status: IngestionJobStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }
  }

  async createPublishedRevisionJob(examId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: {
        id: examId,
      },
      select: {
        id: true,
        year: true,
        sessionType: true,
        isPublished: true,
        stream: {
          select: {
            code: true,
            name: true,
          },
        },
        subject: {
          select: {
            code: true,
            name: true,
          },
        },
        paper: {
          select: {
            id: true,
            familyCode: true,
            officialSourceReference: true,
            offerings: {
              orderBy: {
                createdAt: 'asc',
              },
              select: {
                id: true,
                stream: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
              },
            },
            variants: {
              where: {
                status: PublicationStatus.PUBLISHED,
              },
              orderBy: {
                code: 'asc',
              },
              select: {
                code: true,
                title: true,
                nodes: {
                  where: {
                    status: PublicationStatus.PUBLISHED,
                  },
                  orderBy: [
                    {
                      orderIndex: 'asc',
                    },
                  ],
                  select: {
                    id: true,
                    parentId: true,
                    nodeType: true,
                    orderIndex: true,
                    label: true,
                    maxPoints: true,
                    blocks: {
                      orderBy: [
                        {
                          role: 'asc',
                        },
                        {
                          orderIndex: 'asc',
                        },
                      ],
                      select: {
                        id: true,
                        role: true,
                        blockType: true,
                        textValue: true,
                        data: true,
                        media: {
                          select: {
                            url: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!exam || !exam.isPublished) {
      throw new NotFoundException(`Published exam ${examId} not found.`);
    }

    const existingJob = await this.prisma.ingestionJob.findFirst({
      where: {
        provider: PUBLISHED_REVISION_PROVIDER,
        publishedPaperId: exam.paper.id,
        status: {
          in: [
            IngestionJobStatus.DRAFT,
            IngestionJobStatus.IN_REVIEW,
            IngestionJobStatus.APPROVED,
          ],
        },
      },
      include: {
        sourceDocuments: {
          include: {
            pages: {
              orderBy: {
                pageNumber: 'asc',
              },
            },
          },
          orderBy: {
            kind: 'asc',
          },
        },
        publishedExam: {
          select: {
            id: true,
            stream: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
        publishedPaper: {
          select: {
            offerings: {
              select: {
                id: true,
                stream: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    if (existingJob) {
      return this.mapJobDetail(existingJob, this.hydrateDraft(existingJob));
    }

    const draft = this.createPublishedRevisionDraft(exam);
    const label = [
      'Library Revision',
      exam.year,
      exam.subject.code,
      exam.stream.code,
    ].join(' · ');

    const created = await this.prisma.ingestionJob.create({
      data: {
        label,
        provider: PUBLISHED_REVISION_PROVIDER,
        sourceListingUrl: null,
        sourceExamPageUrl: null,
        sourceCorrectionPageUrl: null,
        year: exam.year,
        streamCode: exam.stream.code,
        subjectCode: exam.subject.code,
        sessionType: exam.sessionType,
        minYear: exam.year,
        status: IngestionJobStatus.DRAFT,
        reviewNotes: null,
        draftJson: this.toJsonValue(draft),
        metadata: this.toJsonValue(draft.exam.metadata),
        publishedExamId: exam.id,
        publishedPaperId: exam.paper.id,
      },
      include: {
        sourceDocuments: {
          include: {
            pages: {
              orderBy: {
                pageNumber: 'asc',
              },
            },
          },
          orderBy: {
            kind: 'asc',
          },
        },
        publishedExam: {
          select: {
            id: true,
            stream: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
        publishedPaper: {
          select: {
            offerings: {
              select: {
                id: true,
                stream: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return this.mapJobDetail(created, draft);
  }

  async attachCorrectionDocument(
    jobId: string,
    input: {
      correctionDocument: IntakeUploadDocumentInput;
    },
  ) {
    const job = await this.findJobOrThrow(jobId);

    if (job.status === IngestionJobStatus.PUBLISHED) {
      throw new BadRequestException(
        'Published ingestion jobs cannot accept a new correction PDF.',
      );
    }

    if (
      job.status === IngestionJobStatus.IN_REVIEW ||
      job.status === IngestionJobStatus.APPROVED
    ) {
      throw new BadRequestException(
        'Add or replace the correction PDF before review starts. Reprocessing reviewed jobs is intentionally blocked unless you force it explicitly.',
      );
    }

    this.assertPdfUpload(input.correctionDocument, 'correctionDocument');

    const draft = this.hydrateDraft(job);
    const context = this.buildStorageContextFromDraft(draft);
    const sourceReference = this.readJsonString(
      draft.exam.metadata,
      'sourceReference',
    );
    const existingCorrection =
      job.sourceDocuments.find(
        (document) => document.kind === SourceDocumentKind.CORRECTION,
      ) ?? null;

    const correctionDocument = existingCorrection
      ? await this.replaceManualSourceDocument({
          sourceDocument: existingCorrection,
          upload: input.correctionDocument,
          context,
          sourceReference,
        })
      : await this.storeManualSourceDocument({
          jobId: job.id,
          kind: SourceDocumentKind.CORRECTION,
          upload: input.correctionDocument,
          context,
          sourceReference,
        });

    draft.exam.correctionDocumentId = correctionDocument.id;
    draft.exam.correctionDocumentStorageKey = correctionDocument.storageKey;

    const saved = await this.prisma.ingestionJob.update({
      where: {
        id: job.id,
      },
      data: {
        status: IngestionJobStatus.DRAFT,
        errorMessage: null,
        draftJson: this.toJsonValue(draft),
      },
      include: {
        sourceDocuments: {
          include: {
            pages: {
              orderBy: {
                pageNumber: 'asc',
              },
            },
          },
          orderBy: {
            kind: 'asc',
          },
        },
      },
    });

    return this.mapJobDetail(saved, this.hydrateDraft(saved));
  }

  async processJob(jobId: string, payload: Record<string, unknown> = {}) {
    const job = await this.findJobOrThrow(jobId);

    if (job.status === IngestionJobStatus.PUBLISHED) {
      throw new BadRequestException(
        'Published ingestion jobs cannot be reprocessed from admin.',
      );
    }

    const replaceExisting = this.readBooleanFlag(payload.replace_existing);
    const skipExtraction = this.readBooleanFlag(payload.skip_extraction);
    const forceReprocess = this.readBooleanFlag(payload.force_reprocess);
    let draft = this.hydrateDraft(job);

    try {
      const examDocument = job.sourceDocuments.find(
        (document) => document.kind === SourceDocumentKind.EXAM,
      );

      if (!examDocument) {
        throw new BadRequestException(
          `Missing EXAM source document for ingestion job ${job.label}.`,
        );
      }

      const correctionDocument =
        job.sourceDocuments.find(
          (document) => document.kind === SourceDocumentKind.CORRECTION,
        ) ?? null;

      if (!correctionDocument) {
        throw new BadRequestException(
          'Add the correction PDF before processing this job.',
        );
      }

      if (
        !forceReprocess &&
        (job.status === IngestionJobStatus.IN_REVIEW ||
          job.status === IngestionJobStatus.APPROVED)
      ) {
        throw new BadRequestException(
          'This job already entered review. Reprocessing can replace reviewed draft edits. Retry with force_reprocess if you really want to rerun extraction.',
        );
      }

      await this.ensureStoredPagesForDocument({
        sourceDocument: examDocument,
        year: draft.exam.year,
        replaceExisting,
      });

      await this.ensureStoredPagesForDocument({
        sourceDocument: correctionDocument,
        year: draft.exam.year,
        replaceExisting,
      });

      const refreshedJob = await this.findJobOrThrow(jobId);
      draft = this.hydrateDraft(refreshedJob);
      const shouldRunExtraction =
        !skipExtraction && (replaceExisting || !hasGeminiExtraction(draft));

      if (shouldRunExtraction) {
        if (!hasGeminiApiKeyConfigured()) {
          throw new BadRequestException(
            'Gemini extraction is not configured. Set GEMINI_API_KEY or GOOGLE_API_KEY before processing this job.',
          );
        }

        const examDocumentForExtraction = refreshedJob.sourceDocuments.find(
          (document) => document.kind === SourceDocumentKind.EXAM,
        );

        if (!examDocumentForExtraction) {
          throw new BadRequestException(
            `Missing EXAM source document for ingestion job ${refreshedJob.label}.`,
          );
        }

        const correctionDocumentForExtraction =
          refreshedJob.sourceDocuments.find(
            (document) => document.kind === SourceDocumentKind.CORRECTION,
          ) ?? null;

        draft = await extractDraftWithGemini({
          draft,
          label: refreshedJob.label,
          model: readDefaultGeminiModel(),
          maxOutputTokens: readDefaultGeminiMaxOutputTokens(),
          temperature: readDefaultGeminiTemperature(),
          examDocument: {
            fileName: examDocumentForExtraction.fileName,
            buffer: await this.readSourceDocumentBuffer(
              examDocumentForExtraction,
            ),
          },
          correctionDocument:
            correctionDocumentForExtraction !== null
              ? {
                  fileName: correctionDocumentForExtraction.fileName,
                  buffer: await this.readSourceDocumentBuffer(
                    correctionDocumentForExtraction,
                  ),
                }
              : null,
        });
      }

      const saved = await this.prisma.ingestionJob.update({
        where: {
          id: jobId,
        },
        data: {
          label: draft.exam.title,
          provider: draft.exam.provider,
          sourceListingUrl: draft.exam.sourceListingUrl,
          sourceExamPageUrl: draft.exam.sourceExamPageUrl,
          sourceCorrectionPageUrl: draft.exam.sourceCorrectionPageUrl,
          year: draft.exam.year,
          streamCode: draft.exam.streamCode,
          subjectCode: draft.exam.subjectCode,
          sessionType: this.toPrismaSessionType(draft.exam.sessionType),
          minYear: draft.exam.minYear,
          status: IngestionJobStatus.IN_REVIEW,
          reviewedAt: null,
          errorMessage: null,
          draftJson: this.toJsonValue(draft),
        },
        include: {
          sourceDocuments: {
            include: {
              pages: {
                orderBy: {
                  pageNumber: 'asc',
                },
              },
            },
            orderBy: {
              kind: 'asc',
            },
          },
        },
      });

      return this.mapJobDetail(saved, this.hydrateDraft(saved));
    } catch (error) {
      await this.prisma.ingestionJob.update({
        where: {
          id: jobId,
        },
        data: {
          status: IngestionJobStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });

      throw error;
    }
  }

  async getJob(jobId: string) {
    const job = await this.prisma.ingestionJob.findUnique({
      where: {
        id: jobId,
      },
      include: {
        sourceDocuments: {
          include: {
            pages: {
              orderBy: {
                pageNumber: 'asc',
              },
            },
          },
          orderBy: {
            kind: 'asc',
          },
        },
        publishedExam: {
          select: {
            id: true,
            stream: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
        publishedPaper: {
          select: {
            offerings: {
              select: {
                id: true,
                stream: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException(`Ingestion job ${jobId} not found.`);
    }

    const draft = this.hydrateDraft(job);
    return this.mapJobDetail(job, draft);
  }

  async updateJob(jobId: string, payload: Record<string, unknown>) {
    const job = await this.prisma.ingestionJob.findUnique({
      where: {
        id: jobId,
      },
      include: {
        sourceDocuments: {
          include: {
            pages: {
              orderBy: {
                pageNumber: 'asc',
              },
            },
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException(`Ingestion job ${jobId} not found.`);
    }

    const currentDraft = this.hydrateDraft(job);
    let draft = currentDraft;
    const reviewNotes = Object.prototype.hasOwnProperty.call(
      payload,
      'review_notes',
    )
      ? this.readOptionalString(payload.review_notes)
      : job.reviewNotes;

    if (Object.prototype.hasOwnProperty.call(payload, 'draft_json')) {
      try {
        draft = normalizeIngestionDraft(payload.draft_json);
      } catch (error) {
        throw new BadRequestException(
          error instanceof Error
            ? error.message
            : 'Invalid draft_json payload.',
        );
      }
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'year')) {
      draft.exam.year = this.readInteger(payload.year, 'year');
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'stream_code')) {
      draft.exam.streamCode = this.readOptionalString(payload.stream_code);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'subject_code')) {
      draft.exam.subjectCode = this.readOptionalString(payload.subject_code);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'session')) {
      draft.exam.sessionType = this.toDraftSessionType(payload.session);
    }

    const status = Object.prototype.hasOwnProperty.call(payload, 'status')
      ? this.toIngestionStatus(payload.status)
      : job.status;

    const saved = await this.prisma.ingestionJob.update({
      where: {
        id: jobId,
      },
      data: {
        year: draft.exam.year,
        streamCode: draft.exam.streamCode,
        subjectCode: draft.exam.subjectCode,
        sessionType: this.toPrismaSessionType(draft.exam.sessionType),
        reviewNotes,
        status,
        reviewedAt:
          status === IngestionJobStatus.APPROVED ? new Date() : job.reviewedAt,
        draftJson: this.toJsonValue(draft),
      },
      include: {
        sourceDocuments: {
          include: {
            pages: {
              orderBy: {
                pageNumber: 'asc',
              },
            },
          },
        },
      },
    });

    return this.mapJobDetail(saved, this.hydrateDraft(saved));
  }

  async approveJob(jobId: string) {
    const job = await this.findJobOrThrow(jobId);

    const draft = this.hydrateDraft(job);
    const validation = validateIngestionDraft(draft);
    this.throwIfDraftValidationFails(validation, 'approve');

    const saved = await this.prisma.ingestionJob.update({
      where: {
        id: jobId,
      },
      data: {
        year: draft.exam.year,
        streamCode: draft.exam.streamCode,
        subjectCode: draft.exam.subjectCode,
        sessionType: this.toPrismaSessionType(draft.exam.sessionType),
        status: IngestionJobStatus.APPROVED,
        reviewedAt: new Date(),
        draftJson: this.toJsonValue(draft),
      },
      include: {
        sourceDocuments: {
          include: {
            pages: {
              orderBy: {
                pageNumber: 'asc',
              },
            },
          },
          orderBy: {
            kind: 'asc',
          },
        },
      },
    });

    return this.mapJobDetail(saved, this.hydrateDraft(saved));
  }

  async publishJob(jobId: string) {
    const job = await this.findJobOrThrow(jobId);

    if (
      job.status !== IngestionJobStatus.APPROVED &&
      job.status !== IngestionJobStatus.PUBLISHED
    ) {
      throw new BadRequestException(
        'Approve the ingestion job before publishing it.',
      );
    }

    const draft = this.hydrateDraft(job);
    const validation = validateIngestionDraft(draft);
    this.throwIfDraftValidationFails(validation, 'publish');

    const selectedStreamCodes = this.resolveDraftStreamCodes(draft);

    if (!selectedStreamCodes.length || !draft.exam.subjectCode) {
      throw new BadRequestException(
        'draft_json.exam.subjectCode and at least one paper stream must be set before publication.',
      );
    }

    const sessionType = this.toPrismaSessionType(draft.exam.sessionType);
    const [streams, subject] = await Promise.all([
      this.prisma.stream.findMany({
        where: {
          code: {
            in: selectedStreamCodes,
          },
        },
        select: {
          id: true,
          code: true,
          name: true,
        },
      }),
      this.prisma.subject.findUnique({
        where: {
          code: draft.exam.subjectCode,
        },
        select: {
          id: true,
        },
      }),
    ]);

    const streamsByCode = new Map(
      streams.map((stream) => [stream.code, stream]),
    );
    const selectedStreams = selectedStreamCodes
      .map((code) => streamsByCode.get(code) ?? null)
      .filter(
        (
          stream,
        ): stream is {
          id: string;
          code: string;
          name: string;
        } => Boolean(stream),
      );

    if (selectedStreams.length !== selectedStreamCodes.length || !subject) {
      const missingStreamCodes = selectedStreamCodes.filter(
        (code) => !streamsByCode.has(code),
      );
      const missingDetail = missingStreamCodes.length
        ? ` Missing streams: ${missingStreamCodes.join(', ')}.`
        : '';

      throw new BadRequestException(
        `Review metadata must resolve to existing stream and subject codes.${missingDetail}`,
      );
    }

    const primaryStreamCode =
      draft.exam.streamCode?.trim().toUpperCase() ?? selectedStreamCodes[0];
    const primaryStream =
      selectedStreams.find((stream) => stream.code === primaryStreamCode) ??
      selectedStreams[0];
    const selectedStreamIds = selectedStreams.map((stream) => stream.id);
    const paperFamilyCode = this.resolvePaperFamilyCode(draft);
    const existingPaper =
      job.publishedPaperId ??
      (
        await this.prisma.paper.findFirst({
          where: {
            year: draft.exam.year,
            subjectId: subject.id,
            sessionType,
            familyCode: paperFamilyCode,
          },
          select: {
            id: true,
          },
        })
      )?.id ??
      null;

    if (existingPaper && job.publishedPaperId !== existingPaper) {
      throw new BadRequestException(
        'A canonical paper already exists for this year/subject/session/family.',
      );
    }

    const conflictingExams = await this.prisma.exam.findMany({
      where: {
        year: draft.exam.year,
        subjectId: subject.id,
        sessionType,
        streamId: {
          in: selectedStreamIds,
        },
      },
      select: {
        id: true,
        streamId: true,
        paperId: true,
      },
    });

    for (const conflict of conflictingExams) {
      if (existingPaper && conflict.paperId === existingPaper) {
        continue;
      }

      const streamCode =
        selectedStreams.find((stream) => stream.id === conflict.streamId)
          ?.code ?? conflict.streamId;

      throw new BadRequestException(
        `A live exam already exists for stream ${streamCode} in this year/subject/session.`,
      );
    }

    const paperId = existingPaper ?? randomUUID();
    const preparedAssets = await this.preparePublishedAssets(
      job.id,
      draft,
      paperId,
    );

    let examIdResult: string;
    let paperIdResult: string;
    let publishedExamIdsResult: string[] = [];

    try {
      const publishResult: {
        examId: string;
        paperId: string;
        publishedExamIds: string[];
      } = await this.prisma.$transaction(async (tx) => {
        const currentExistingPaper =
          job.publishedPaperId ??
          (
            await tx.paper.findFirst({
              where: {
                year: draft.exam.year,
                subjectId: subject.id,
                sessionType,
                familyCode: paperFamilyCode,
              },
              select: {
                id: true,
              },
            })
          )?.id ??
          null;

        if (currentExistingPaper && currentExistingPaper !== paperId) {
          throw new BadRequestException(
            'A canonical paper already exists for this year/subject/session/family.',
          );
        }

        const officialSourceReference = this.buildOfficialSourceReference(
          job,
          draft,
        );
        const durationMinutes = this.readOptionalMetadataInteger(
          draft.exam.metadata,
          'durationMinutes',
        );
        const totalPoints = this.readOptionalMetadataInteger(
          draft.exam.metadata,
          'totalPoints',
        );

        if (currentExistingPaper) {
          await tx.paper.update({
            where: {
              id: paperId,
            },
            data: {
              year: draft.exam.year,
              subjectId: subject.id,
              sessionType,
              familyCode: paperFamilyCode,
              durationMinutes: durationMinutes ?? 210,
              totalPoints: totalPoints ?? 40,
              officialSourceReference,
            },
          });

          await tx.examVariant.deleteMany({
            where: {
              paperId,
            },
          });
        } else {
          await tx.paper.create({
            data: {
              id: paperId,
              year: draft.exam.year,
              subjectId: subject.id,
              sessionType,
              familyCode: paperFamilyCode,
              durationMinutes: durationMinutes ?? 210,
              totalPoints: totalPoints ?? 40,
              officialSourceReference,
            },
          });
        }

        const currentPaperOfferings = await tx.exam.findMany({
          where: {
            paperId,
          },
          select: {
            id: true,
            streamId: true,
          },
        });
        const currentConflictingExams = await tx.exam.findMany({
          where: {
            year: draft.exam.year,
            subjectId: subject.id,
            sessionType,
            streamId: {
              in: selectedStreamIds,
            },
          },
          select: {
            id: true,
            streamId: true,
            paperId: true,
          },
        });

        for (const conflict of currentConflictingExams) {
          if (conflict.paperId === paperId) {
            continue;
          }

          const streamCode =
            selectedStreams.find((stream) => stream.id === conflict.streamId)
              ?.code ?? conflict.streamId;

          throw new BadRequestException(
            `A live exam already exists for stream ${streamCode} in this year/subject/session.`,
          );
        }

        const matchedOfferingsByStreamId = new Map(
          currentPaperOfferings.map((offering) => [
            offering.streamId,
            offering,
          ]),
        );
        const reusableOfferings = currentPaperOfferings.filter(
          (offering) => !selectedStreamIds.includes(offering.streamId),
        );
        const publishedExamIdsByStreamCode = new Map<string, string>();
        const activeExamIds = new Set<string>();

        for (const stream of selectedStreams) {
          const matchedOffering = matchedOfferingsByStreamId.get(stream.id);

          if (matchedOffering) {
            await tx.exam.update({
              where: {
                id: matchedOffering.id,
              },
              data: {
                year: draft.exam.year,
                streamId: stream.id,
                subjectId: subject.id,
                sessionType,
                paperId,
                isPublished: true,
              },
            });

            activeExamIds.add(matchedOffering.id);
            publishedExamIdsByStreamCode.set(stream.code, matchedOffering.id);
            continue;
          }

          const reusableOffering = reusableOfferings.shift();

          if (reusableOffering) {
            await tx.exam.update({
              where: {
                id: reusableOffering.id,
              },
              data: {
                year: draft.exam.year,
                streamId: stream.id,
                subjectId: subject.id,
                sessionType,
                paperId,
                isPublished: true,
              },
            });

            activeExamIds.add(reusableOffering.id);
            publishedExamIdsByStreamCode.set(stream.code, reusableOffering.id);
            continue;
          }

          const nextExamId = randomUUID();
          await tx.exam.create({
            data: {
              id: nextExamId,
              year: draft.exam.year,
              streamId: stream.id,
              subjectId: subject.id,
              sessionType,
              paperId,
              isPublished: true,
            },
          });

          activeExamIds.add(nextExamId);
          publishedExamIdsByStreamCode.set(stream.code, nextExamId);
        }

        const staleOfferingIds = currentPaperOfferings
          .filter((offering) => !activeExamIds.has(offering.id))
          .map((offering) => offering.id);

        if (staleOfferingIds.length > 0) {
          await tx.exam.deleteMany({
            where: {
              id: {
                in: staleOfferingIds,
              },
            },
          });
        }

        const assetMediaIds = new Map<string, string>();

        for (const preparedAsset of preparedAssets) {
          await tx.media.create({
            data: {
              id: preparedAsset.mediaId,
              url: `${this.getApiBaseUrl()}/api/v1/ingestion/media/${preparedAsset.mediaId}`,
              type: MediaType.IMAGE,
              metadata: this.toJsonValue({
                storageKey: preparedAsset.storageKey,
                mimeType: 'image/png',
                width: preparedAsset.width,
                height: preparedAsset.height,
                classification: preparedAsset.classification,
                sourcePageId: preparedAsset.sourcePageId,
                cropBox: preparedAsset.cropBox,
              }),
            },
          });

          assetMediaIds.set(preparedAsset.assetId, preparedAsset.mediaId);
        }

        for (const variant of draft.variants) {
          const variantId = randomUUID();

          await tx.examVariant.create({
            data: {
              id: variantId,
              paperId,
              code: this.toPrismaVariantCode(variant.code),
              title: variant.title,
              status: PublicationStatus.PUBLISHED,
              metadata: this.toJsonValue({
                importedFromJobId: job.id,
              }),
            },
          });

          const nodesByParent = this.groupNodesByParent(variant.nodes);
          await this.createVariantNodes(
            tx,
            variantId,
            null,
            nodesByParent,
            assetMediaIds,
          );
        }

        const publishedExamIds = Array.from(
          publishedExamIdsByStreamCode.values(),
        );
        const primaryExamId =
          publishedExamIdsByStreamCode.get(primaryStream.code) ??
          publishedExamIds[0];

        if (!primaryExamId) {
          throw new BadRequestException(
            'Publishing did not produce any exam offerings for this paper.',
          );
        }

        await tx.ingestionJob.update({
          where: {
            id: job.id,
          },
          data: {
            status: IngestionJobStatus.PUBLISHED,
            publishedAt: new Date(),
            publishedExamId: primaryExamId,
            publishedPaperId: paperId,
            draftJson: this.toJsonValue(draft),
          },
        });

        return {
          examId: primaryExamId,
          paperId,
          publishedExamIds,
        };
      });

      examIdResult = publishResult.examId;
      paperIdResult = publishResult.paperId;
      publishedExamIdsResult = publishResult.publishedExamIds;
    } catch (error) {
      await Promise.allSettled(
        preparedAssets.map((asset) =>
          this.getStorageClient().deleteObject(asset.storageKey),
        ),
      );
      throw error;
    }

    return {
      job_id: job.id,
      published_exam_id: examIdResult,
      published_paper_id: paperIdResult,
      published_exam_ids: publishedExamIdsResult,
    };
  }

  async getDocumentFile(documentId: string) {
    const document = await this.prisma.sourceDocument.findUnique({
      where: {
        id: documentId,
      },
      select: {
        fileName: true,
        mimeType: true,
        storageKey: true,
      },
    });

    if (!document) {
      throw new NotFoundException(`Source document ${documentId} not found.`);
    }

    return {
      fileName: document.fileName,
      mimeType: document.mimeType,
      data: await this.getStorageClient().getObjectBuffer(document.storageKey),
    };
  }

  async getPageImage(pageId: string) {
    const page = await this.prisma.sourcePage.findUnique({
      where: {
        id: pageId,
      },
      select: {
        storageKey: true,
      },
    });

    if (!page) {
      throw new NotFoundException(`Source page ${pageId} not found.`);
    }

    return {
      mimeType: 'image/png',
      data: await this.getStorageClient().getObjectBuffer(page.storageKey),
    };
  }

  async getPublishedMedia(mediaId: string) {
    const media = await this.prisma.media.findFirst({
      where: {
        id: mediaId,
        blocks: {
          some: {
            node: {
              status: PublicationStatus.PUBLISHED,
              variant: {
                status: PublicationStatus.PUBLISHED,
                paper: {
                  offerings: {
                    some: {
                      isPublished: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      select: {
        url: true,
        metadata: true,
      },
    });

    if (!media) {
      throw new NotFoundException(`Published media ${mediaId} not found.`);
    }

    const storageKey = this.readJsonString(media.metadata, 'storageKey');

    if (!storageKey) {
      throw new NotFoundException(
        `Media ${mediaId} is not backed by R2 storage.`,
      );
    }

    return {
      mimeType: this.readJsonString(media.metadata, 'mimeType') ?? 'image/png',
      data: await this.getStorageClient().getObjectBuffer(storageKey),
    };
  }

  async getAssetPreview(jobId: string, assetId: string) {
    const job = await this.findJobOrThrow(jobId);

    const draft = this.hydrateDraft(job);
    const asset = draft.assets.find((entry) => entry.id === assetId);

    if (!asset) {
      throw new NotFoundException(
        `Asset ${assetId} not found in job ${jobId}.`,
      );
    }

    const page = await this.prisma.sourcePage.findUnique({
      where: {
        id: asset.sourcePageId,
      },
      include: {
        document: {
          select: {
            jobId: true,
          },
        },
      },
    });

    if (!page || page.document.jobId !== jobId) {
      throw new NotFoundException(
        `Asset ${assetId} references an unknown source page.`,
      );
    }

    const pageBuffer = await this.getStorageClient().getObjectBuffer(
      page.storageKey,
    );
    const cropped = await this.cropAssetBuffer(pageBuffer, asset);

    return {
      mimeType: 'image/png',
      data: cropped,
    };
  }

  async recoverAssetContent(
    jobId: string,
    assetId: string,
    payload: Record<string, unknown> = {},
  ) {
    const job = await this.findJobOrThrow(jobId);
    const draft = this.hydrateDraft(job);
    const asset = draft.assets.find((entry) => entry.id === assetId);

    if (!asset) {
      throw new NotFoundException(
        `Asset ${assetId} not found in job ${jobId}.`,
      );
    }

    const page = await this.findSourcePageForJobOrThrow(
      jobId,
      asset.sourcePageId,
    );
    const mode = this.toGeminiRecoveryMode(payload.mode, asset.classification);
    const suggestion = await this.recoverSuggestionFromCrop({
      pageStorageKey: page.storageKey,
      cropBox: asset.cropBox,
      label: asset.label ?? asset.id,
      mode,
      fileName: `${asset.id}.png`,
      notes: asset.notes,
    });

    return {
      asset: {
        id: asset.id,
        classification: asset.classification,
        source_page_id: asset.sourcePageId,
        page_number: asset.pageNumber,
      },
      recovery: {
        mode,
        type: suggestion.type,
        value: suggestion.value,
        data: suggestion.data,
        notes: suggestion.notes,
      },
    };
  }

  async recoverSnippetContent(
    jobId: string,
    payload: Record<string, unknown> = {},
  ) {
    const sourcePageId = this.readOptionalString(payload.source_page_id);

    if (!sourcePageId) {
      throw new BadRequestException('source_page_id is required.');
    }

    const cropBox = this.readCropBoxPayload(payload.crop_box);
    const page = await this.findSourcePageForJobOrThrow(jobId, sourcePageId);
    const mode = this.toGeminiRecoveryMode(payload.mode, 'image');
    const suggestion = await this.recoverSuggestionFromCrop({
      pageStorageKey: page.storageKey,
      cropBox,
      label:
        this.readOptionalString(payload.label) ??
        `${page.document.kind} page ${page.pageNumber} snippet`,
      mode,
      fileName: `snippet-${page.id}.png`,
      caption: this.readOptionalString(payload.caption),
      notes: this.readOptionalString(payload.notes),
    });

    return {
      source_page: {
        id: page.id,
        page_number: page.pageNumber,
        document_kind:
          page.document.kind === SourceDocumentKind.CORRECTION
            ? 'CORRECTION'
            : 'EXAM',
      },
      recovery: {
        mode,
        type: suggestion.type,
        value: suggestion.value,
        data: suggestion.data,
        notes: suggestion.notes,
      },
    };
  }

  private async preparePublishedAssets(
    jobId: string,
    draft: IngestionDraft,
    examId: string,
  ) {
    const preparedAssets: PreparedPublishedAsset[] = [];
    const uploadedKeys: string[] = [];

    try {
      for (const assetId of this.collectReferencedAssetIds(draft)) {
        const asset = draft.assets.find((entry) => entry.id === assetId);

        if (!asset) {
          throw new BadRequestException(
            `Block references missing asset ${assetId}.`,
          );
        }

        const page = await this.prisma.sourcePage.findUnique({
          where: {
            id: asset.sourcePageId,
          },
          include: {
            document: {
              select: {
                jobId: true,
              },
            },
          },
        });

        if (!page || page.document.jobId !== jobId) {
          throw new BadRequestException(
            `Asset ${asset.id} references an unknown source page.`,
          );
        }

        const pageBuffer = await this.getStorageClient().getObjectBuffer(
          page.storageKey,
        );
        const cropped = await this.cropAssetBuffer(pageBuffer, asset);
        const mediaId = randomUUID();
        const storageKey = [
          'published',
          'assets',
          `${draft.exam.year}`,
          examId,
          `${mediaId}.png`,
        ].join('/');

        await this.getStorageClient().putObject({
          key: storageKey,
          body: cropped,
          contentType: 'image/png',
          metadata: {
            sourcePageId: asset.sourcePageId,
            classification: asset.classification,
            documentKind: asset.documentKind,
          },
        });
        uploadedKeys.push(storageKey);

        const imageInfo = await sharp(cropped).metadata();

        preparedAssets.push({
          assetId: asset.id,
          mediaId,
          storageKey,
          width: imageInfo.width ?? null,
          height: imageInfo.height ?? null,
          classification: asset.classification,
          sourcePageId: asset.sourcePageId,
          cropBox: asset.cropBox,
        });
      }

      return preparedAssets;
    } catch (error) {
      await Promise.allSettled(
        uploadedKeys.map((storageKey) =>
          this.getStorageClient().deleteObject(storageKey),
        ),
      );
      throw error;
    }
  }

  private collectReferencedAssetIds(draft: IngestionDraft) {
    const assetIds = new Set<string>();

    for (const variant of draft.variants) {
      for (const node of variant.nodes) {
        for (const block of node.blocks) {
          if (block.assetId) {
            assetIds.add(block.assetId);
          }
        }
      }
    }

    return assetIds;
  }

  private groupNodesByParent(nodes: DraftNode[]) {
    const map = new Map<string | null, DraftNode[]>();

    for (const node of nodes) {
      const bucket = map.get(node.parentId) ?? [];
      bucket.push(node);
      map.set(node.parentId, bucket);
    }

    for (const bucket of map.values()) {
      bucket.sort((left, right) => left.orderIndex - right.orderIndex);
    }

    return map;
  }

  private async createVariantNodes(
    tx: Prisma.TransactionClient,
    variantId: string,
    parentDraftNodeId: string | null,
    nodesByParent: Map<string | null, DraftNode[]>,
    assetMediaIds: Map<string, string>,
    parentId: string | null = null,
  ) {
    const nodes = nodesByParent.get(parentDraftNodeId) ?? [];

    for (const node of nodes) {
      const nodeId = randomUUID();

      await tx.examNode.create({
        data: {
          id: nodeId,
          variantId,
          parentId,
          nodeType: this.toPrismaNodeType(node.nodeType),
          orderIndex: node.orderIndex,
          label: node.label,
          maxPoints: node.maxPoints,
          status: PublicationStatus.PUBLISHED,
          metadata: this.toJsonValue({
            importedFromDraftNodeId: node.id,
          }),
        },
      });

      await this.createNodeBlocks(tx, nodeId, node.blocks, assetMediaIds);
      await this.createVariantNodes(
        tx,
        variantId,
        node.id,
        nodesByParent,
        assetMediaIds,
        nodeId,
      );
    }
  }

  private async createNodeBlocks(
    tx: Prisma.TransactionClient,
    nodeId: string,
    blocks: DraftBlock[],
    assetMediaIds: Map<string, string>,
  ) {
    for (let index = 0; index < blocks.length; index += 1) {
      const block = blocks[index];
      const mediaId =
        block.assetId !== undefined && block.assetId !== null
          ? (assetMediaIds.get(block.assetId) ?? null)
          : null;

      await tx.examNodeBlock.create({
        data: {
          nodeId,
          role: this.toPrismaBlockRole(block.role),
          orderIndex: index + 1,
          blockType: this.toPrismaBlockType(block),
          textValue:
            mediaId &&
            block.type !== 'table' &&
            block.type !== 'list' &&
            !this.hasStructuredRenderData(block)
              ? null
              : block.value,
          mediaId,
          data: this.toJsonValue({
            ...(this.asDraftBlockData(block) ?? {}),
            ...(this.inferStructuredKind(block) &&
            this.readJsonString(block.data ?? null, 'kind') === null
              ? {
                  kind: this.inferStructuredKind(block),
                }
              : {}),
            ...(block.meta?.level !== undefined
              ? {
                  level: block.meta.level,
                }
              : {}),
            ...(block.meta?.language
              ? {
                  language: block.meta.language,
                }
              : {}),
            ...(block.assetId
              ? {
                  assetId: block.assetId,
                }
              : {}),
            ...(mediaId
              ? {
                  kind: this.inferStructuredKind(block) ?? 'reviewed_asset',
                }
              : {}),
          }),
        },
      });
    }
  }

  private async cropAssetBuffer(pageBuffer: Buffer, asset: DraftAsset) {
    return this.cropBufferWithBox(pageBuffer, asset.cropBox);
  }

  private async cropBufferWithBox(
    pageBuffer: Buffer,
    cropBox: DraftAsset['cropBox'],
  ) {
    const pageMetadata = await sharp(pageBuffer).metadata();
    const width = pageMetadata.width ?? 0;
    const height = pageMetadata.height ?? 0;

    if (!width || !height) {
      throw new BadRequestException(
        'Source page image dimensions are missing.',
      );
    }

    const left = Math.max(0, Math.floor(cropBox.x));
    const top = Math.max(0, Math.floor(cropBox.y));
    const cropWidth = Math.max(
      1,
      Math.min(width - left, Math.floor(cropBox.width)),
    );
    const cropHeight = Math.max(
      1,
      Math.min(height - top, Math.floor(cropBox.height)),
    );

    return sharp(pageBuffer)
      .extract({
        left,
        top,
        width: cropWidth,
        height: cropHeight,
      })
      .png()
      .toBuffer();
  }

  private async recoverSuggestionFromCrop(input: {
    pageStorageKey: string;
    cropBox: DraftAsset['cropBox'];
    label: string;
    mode: 'text' | 'latex' | 'table' | 'tree' | 'graph';
    fileName: string;
    caption?: string | null;
    notes?: string | null;
  }) {
    const pageBuffer = await this.getStorageClient().getObjectBuffer(
      input.pageStorageKey,
    );
    const cropped = await this.cropBufferWithBox(pageBuffer, input.cropBox);

    return recoverBlockSuggestionFromGemini({
      label: input.label,
      mode: input.mode,
      model: readDefaultGeminiModel(),
      maxOutputTokens: readDefaultGeminiMaxOutputTokens(),
      temperature: readDefaultGeminiTemperature(),
      imageBuffer: cropped,
      fileName: input.fileName,
      caption: input.caption,
      notes: input.notes,
    });
  }

  private async findSourcePageForJobOrThrow(jobId: string, pageId: string) {
    const page = await this.prisma.sourcePage.findUnique({
      where: {
        id: pageId,
      },
      include: {
        document: {
          select: {
            jobId: true,
            kind: true,
          },
        },
      },
    });

    if (!page || page.document.jobId !== jobId) {
      throw new NotFoundException(
        `Source page ${pageId} was not found in job ${jobId}.`,
      );
    }

    return page;
  }

  private async findJobOrThrow(jobId: string): Promise<FullIngestionJobRecord> {
    const job = await this.prisma.ingestionJob.findUnique({
      where: {
        id: jobId,
      },
      include: {
        sourceDocuments: {
          include: {
            pages: {
              orderBy: {
                pageNumber: 'asc',
              },
            },
          },
          orderBy: {
            kind: 'asc',
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException(`Ingestion job ${jobId} not found.`);
    }

    return job;
  }

  private async ensureStoredPagesForDocument(input: {
    sourceDocument: FullIngestionJobRecord['sourceDocuments'][number];
    year: number;
    replaceExisting: boolean;
  }) {
    if (
      !input.replaceExisting &&
      input.sourceDocument.pageCount !== null &&
      input.sourceDocument.pages.length === input.sourceDocument.pageCount
    ) {
      return {
        pageCount: input.sourceDocument.pageCount,
      };
    }

    const pdfBuffer = await this.readSourceDocumentBuffer(input.sourceDocument);
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bac-ingestion-'));
    const pdfPath = path.join(tempDir, input.sourceDocument.fileName);

    try {
      await fs.writeFile(pdfPath, pdfBuffer);
      const rasterizedPages = await this.rasterizePdf(
        pdfPath,
        tempDir,
        DEFAULT_RASTER_DPI,
      );
      const existingPageMap = new Map(
        input.sourceDocument.pages.map((page) => [page.pageNumber, page]),
      );

      if (input.replaceExisting) {
        const nextPageNumbers = new Set(
          rasterizedPages.map((page) => page.pageNumber),
        );
        const stalePageIds = input.sourceDocument.pages
          .filter((page) => !nextPageNumbers.has(page.pageNumber))
          .map((page) => page.id);

        if (stalePageIds.length > 0) {
          await this.prisma.sourcePage.deleteMany({
            where: {
              id: {
                in: stalePageIds,
              },
            },
          });
        }
      }

      await this.prisma.sourceDocument.update({
        where: {
          id: input.sourceDocument.id,
        },
        data: {
          pageCount: rasterizedPages.length,
          metadata: this.toJsonValue({
            ...(this.asJsonRecord(input.sourceDocument.metadata) ?? {}),
            rasterDpi: DEFAULT_RASTER_DPI,
            processedAt: new Date().toISOString(),
          }),
        },
      });

      await mapWithConcurrency(
        rasterizedPages,
        DEFAULT_PAGE_CONCURRENCY,
        async (page) => {
          const storageKey = buildCanonicalPageStorageKey(
            {
              year: input.year,
            },
            input.sourceDocument.fileName,
            page.pageNumber,
          );
          const existingPage = existingPageMap.get(page.pageNumber) ?? null;
          const pageBuffer = await fs.readFile(page.filePath);
          const sha256 = createHash('sha256').update(pageBuffer).digest('hex');

          if (
            !existingPage ||
            input.replaceExisting ||
            existingPage.storageKey !== storageKey
          ) {
            await this.getStorageClient().putObject({
              key: storageKey,
              body: pageBuffer,
              contentType: 'image/png',
            });
          }

          const metadata = this.asJsonRecord(existingPage?.metadata ?? null);

          if (existingPage) {
            await this.prisma.sourcePage.update({
              where: {
                id: existingPage.id,
              },
              data: {
                storageKey,
                width: page.width,
                height: page.height,
                sha256,
                metadata: this.toJsonValue({
                  ...(metadata ?? {}),
                  rasterDpi: DEFAULT_RASTER_DPI,
                }),
              },
            });
            return;
          }

          await this.prisma.sourcePage.create({
            data: {
              documentId: input.sourceDocument.id,
              pageNumber: page.pageNumber,
              storageKey,
              width: page.width,
              height: page.height,
              sha256,
              metadata: this.toJsonValue({
                rasterDpi: DEFAULT_RASTER_DPI,
              }),
            },
          });
        },
      );

      return {
        pageCount: rasterizedPages.length,
      };
    } finally {
      await fs.rm(tempDir, {
        recursive: true,
        force: true,
      });
    }
  }

  private async rasterizePdf(
    pdfPath: string,
    outputDir: string,
    rasterDpi: number,
  ) {
    const prefix = path.join(outputDir, 'page');

    await execFileAsync('pdftoppm', [
      '-r',
      `${rasterDpi}`,
      '-png',
      pdfPath,
      prefix,
    ]);

    const files = (await fs.readdir(outputDir))
      .filter((fileName) => /^page-\d+\.png$/.test(fileName))
      .sort(
        (left, right) =>
          this.readPageNumberFromRasterFile(left) -
          this.readPageNumberFromRasterFile(right),
      );

    const pages: Array<{
      filePath: string;
      pageNumber: number;
      width: number;
      height: number;
    }> = [];

    for (const fileName of files) {
      const filePath = path.join(outputDir, fileName);
      const metadata = await sharp(filePath).metadata();

      pages.push({
        filePath,
        pageNumber: this.readPageNumberFromRasterFile(fileName),
        width: metadata.width ?? 0,
        height: metadata.height ?? 0,
      });
    }

    return pages;
  }

  private async readSourceDocumentBuffer(
    sourceDocument: FullIngestionJobRecord['sourceDocuments'][number],
  ) {
    return this.getStorageClient().getObjectBuffer(sourceDocument.storageKey);
  }

  private readPageNumberFromRasterFile(fileName: string) {
    const match = fileName.match(/page-(\d+)\.png$/);

    if (!match) {
      throw new BadRequestException(
        `Unexpected rasterized page file name ${fileName}.`,
      );
    }

    return Number.parseInt(match[1], 10);
  }

  private hydrateDraft(job: {
    year: number;
    streamCode: string | null;
    subjectCode: string | null;
    sessionType: SessionType | null;
    provider: string;
    label: string;
    minYear: number;
    sourceListingUrl: string | null;
    sourceExamPageUrl: string | null;
    sourceCorrectionPageUrl: string | null;
    draftJson: unknown;
    sourceDocuments: Array<{
      id: string;
      kind: SourceDocumentKind;
      storageKey: string;
      pages: Array<{
        id: string;
        documentId: string;
        pageNumber: number;
        width: number;
        height: number;
        metadata: Prisma.JsonValue | null;
      }>;
    }>;
  }) {
    let draft: IngestionDraft;

    try {
      draft = normalizeIngestionDraft(job.draftJson);
    } catch {
      draft = createEmptyDraft({
        year: job.year,
        streamCode: job.streamCode,
        subjectCode: job.subjectCode,
        sessionType:
          job.sessionType === SessionType.MAKEUP ? 'MAKEUP' : 'NORMAL',
        provider: job.provider,
        title: job.label,
        minYear: job.minYear,
        sourceListingUrl: job.sourceListingUrl,
        sourceExamPageUrl: job.sourceExamPageUrl,
        sourceCorrectionPageUrl: job.sourceCorrectionPageUrl,
      });
    }

    const examDocument =
      job.sourceDocuments.find(
        (document) => document.kind === SourceDocumentKind.EXAM,
      ) ?? null;
    const correctionDocument =
      job.sourceDocuments.find(
        (document) => document.kind === SourceDocumentKind.CORRECTION,
      ) ?? null;

    draft.exam.year = job.year;
    draft.exam.streamCode = job.streamCode ?? draft.exam.streamCode;
    draft.exam.subjectCode = job.subjectCode ?? draft.exam.subjectCode;
    draft.exam.sessionType =
      job.sessionType === SessionType.MAKEUP ? 'MAKEUP' : 'NORMAL';
    draft.exam.provider = job.provider;
    draft.exam.title = job.label;
    draft.exam.minYear = job.minYear;
    draft.exam.sourceListingUrl =
      job.sourceListingUrl ?? draft.exam.sourceListingUrl;
    draft.exam.sourceExamPageUrl =
      job.sourceExamPageUrl ?? draft.exam.sourceExamPageUrl;
    draft.exam.sourceCorrectionPageUrl =
      job.sourceCorrectionPageUrl ?? draft.exam.sourceCorrectionPageUrl;
    draft.exam.examDocumentId = examDocument?.id ?? draft.exam.examDocumentId;
    draft.exam.correctionDocumentId =
      correctionDocument?.id ?? draft.exam.correctionDocumentId;
    draft.exam.examDocumentStorageKey =
      examDocument?.storageKey ?? draft.exam.examDocumentStorageKey;
    draft.exam.correctionDocumentStorageKey =
      correctionDocument?.storageKey ?? draft.exam.correctionDocumentStorageKey;
    draft.sourcePages = job.sourceDocuments.flatMap((document) =>
      document.pages.map((page) => ({
        id: page.id,
        documentId: page.documentId,
        documentKind:
          document.kind === SourceDocumentKind.CORRECTION
            ? ('CORRECTION' as DraftDocumentKind)
            : ('EXAM' as DraftDocumentKind),
        pageNumber: page.pageNumber,
        width: page.width,
        height: page.height,
      })),
    );

    return draft;
  }

  private mapJobDetail(
    job: {
      id: string;
      label: string;
      provider: string;
      year: number;
      streamCode: string | null;
      subjectCode: string | null;
      sessionType: SessionType | null;
      minYear: number;
      status: IngestionJobStatus;
      reviewNotes: string | null;
      errorMessage: string | null;
      publishedExamId: string | null;
      publishedPaperId: string | null;
      publishedExam?: {
        id: string;
        stream: {
          code: string;
          name: string;
        };
      } | null;
      publishedPaper?: {
        offerings: Array<{
          id: string;
          stream: {
            code: string;
            name: string;
          };
        }>;
      } | null;
      createdAt: Date;
      updatedAt: Date;
      sourceDocuments: Array<{
        id: string;
        kind: SourceDocumentKind;
        fileName: string;
        mimeType: string;
        pageCount: number | null;
        sha256: string | null;
        sourceUrl: string | null;
        storageKey: string;
        pages: Array<{
          id: string;
          pageNumber: number;
          width: number;
          height: number;
          metadata: Prisma.JsonValue | null;
        }>;
      }>;
    },
    draft: IngestionDraft,
  ) {
    const validation = validateIngestionDraft(draft);
    const workflow = this.buildWorkflowState(job);
    const requiresSourceDocuments = !this.isPublishedRevisionProvider(job.provider);

    return {
      job: {
        id: job.id,
        label: job.label,
        provider: job.provider,
        year: job.year,
        stream_code: job.streamCode,
        subject_code: job.subjectCode,
        session: this.fromSessionType(job.sessionType),
        min_year: job.minYear,
        status: this.fromIngestionStatus(job.status),
        review_notes: job.reviewNotes,
        error_message: job.errorMessage,
        published_exam_id: job.publishedExamId,
        published_paper_id: job.publishedPaperId,
        published_exams: this.mapPublishedExamOfferings(job),
        created_at: job.createdAt,
        updated_at: job.updatedAt,
      },
      workflow,
      documents: job.sourceDocuments.map((document) => ({
        id: document.id,
        kind:
          document.kind === SourceDocumentKind.CORRECTION
            ? 'correction'
            : 'exam',
        file_name: document.fileName,
        mime_type: document.mimeType,
        page_count: document.pageCount,
        sha256: document.sha256,
        source_url: document.sourceUrl,
        storage_key: document.storageKey,
        download_url: `${this.getApiBaseUrl()}/api/v1/ingestion/documents/${document.id}/file`,
        pages: document.pages.map((page) => ({
          id: page.id,
          page_number: page.pageNumber,
          width: page.width,
          height: page.height,
          image_url: `${this.getApiBaseUrl()}/api/v1/ingestion/pages/${page.id}/image`,
        })),
      })),
      draft_json: draft,
      asset_preview_base_url: `${this.getApiBaseUrl()}/api/v1/ingestion/jobs/${job.id}/assets`,
      validation: {
        errors: validation.errors,
        warnings: validation.warnings,
        issues: validation.issues,
        can_approve:
          validation.errors.length === 0 &&
          (!requiresSourceDocuments || workflow.has_correction_document),
        can_publish:
          validation.errors.length === 0 &&
          (!requiresSourceDocuments || workflow.has_correction_document),
      },
    };
  }

  private buildWorkflowState(job: {
    provider: string;
    status: IngestionJobStatus;
    sourceDocuments: Array<{
      kind: SourceDocumentKind;
    }>;
  }) {
    const reviewStarted =
      job.status === IngestionJobStatus.IN_REVIEW ||
      job.status === IngestionJobStatus.APPROVED ||
      job.status === IngestionJobStatus.PUBLISHED;

    if (this.isPublishedRevisionProvider(job.provider)) {
      return {
        has_exam_document: false,
        has_correction_document: false,
        awaiting_correction: false,
        can_process: false,
        review_started: reviewStarted,
      };
    }

    const hasExamDocument = job.sourceDocuments.some(
      (document) => document.kind === SourceDocumentKind.EXAM,
    );
    const hasCorrectionDocument = job.sourceDocuments.some(
      (document) => document.kind === SourceDocumentKind.CORRECTION,
    );

    return {
      has_exam_document: hasExamDocument,
      has_correction_document: hasCorrectionDocument,
      awaiting_correction: hasExamDocument && !hasCorrectionDocument,
      can_process:
        hasExamDocument &&
        hasCorrectionDocument &&
        job.status !== IngestionJobStatus.PUBLISHED,
      review_started: reviewStarted,
    };
  }

  private isPublishedRevisionProvider(provider: string) {
    return provider === PUBLISHED_REVISION_PROVIDER;
  }

  private createPublishedRevisionDraft(exam: {
    id: string;
    year: number;
    sessionType: SessionType;
    stream: {
      code: string;
      name: string;
    };
    subject: {
      code: string;
      name: string;
    };
    paper: {
      id: string;
      familyCode: string;
      officialSourceReference: string | null;
      offerings: Array<{
        id: string;
        stream: {
          code: string;
          name: string;
        };
      }>;
      variants: Array<{
        code: ExamVariantCode;
        title: string | null;
        nodes: Array<{
          id: string;
          parentId: string | null;
          nodeType: ExamNodeType;
          orderIndex: number;
          label: string | null;
          maxPoints: Prisma.Decimal | null;
          blocks: Array<{
            id: string;
            role: BlockRole;
            blockType: PrismaBlockType;
            textValue: string | null;
            data: Prisma.JsonValue | null;
            media: {
              url: string;
            } | null;
          }>;
        }>;
      }>;
    };
  }) {
    const sharedStreamCodes = Array.from(
      new Set(exam.paper.offerings.map((offering) => offering.stream.code)),
    ).sort((left, right) => left.localeCompare(right));
    const title = [
      'Published Paper Revision',
      exam.year,
      exam.subject.name,
      exam.stream.name,
    ].join(' · ');
    const draft = createEmptyDraft({
      year: exam.year,
      streamCode: exam.stream.code,
      subjectCode: exam.subject.code,
      sessionType:
        exam.sessionType === SessionType.MAKEUP ? 'MAKEUP' : 'NORMAL',
      provider: PUBLISHED_REVISION_PROVIDER,
      title,
      minYear: exam.year,
      metadata: {
        editingMode: PUBLISHED_REVISION_PROVIDER,
        paperFamilyCode: exam.paper.familyCode,
        sourceReference: exam.paper.officialSourceReference,
        sharedStreamCodes,
        originExamId: exam.id,
        originPaperId: exam.paper.id,
        originOfferingIds: exam.paper.offerings.map((offering) => offering.id),
      },
    });
    const variantsByCode = new Map(
      exam.paper.variants.map((variant) => [
        variant.code,
        {
          code: variant.code as DraftVariantCode,
          title:
            variant.title ??
            (variant.code === ExamVariantCode.SUJET_2
              ? 'الموضوع الثاني'
              : 'الموضوع الأول'),
          nodes: variant.nodes.map((node) =>
            this.mapPublishedNodeToDraft(node),
          ),
        },
      ]),
    );

    draft.variants = draft.variants.map(
      (variant) =>
        variantsByCode.get(variant.code as ExamVariantCode) ?? variant,
    );

    return draft;
  }

  private mapPublishedNodeToDraft(node: {
    id: string;
    parentId: string | null;
    nodeType: ExamNodeType;
    orderIndex: number;
    label: string | null;
    maxPoints: Prisma.Decimal | null;
    blocks: Array<{
      id: string;
      role: BlockRole;
      blockType: PrismaBlockType;
      textValue: string | null;
      data: Prisma.JsonValue | null;
      media: {
        url: string;
      } | null;
    }>;
  }): DraftNode {
    return {
      id: node.id,
      nodeType: node.nodeType,
      parentId: node.parentId,
      orderIndex: node.orderIndex,
      label: node.label,
      maxPoints: node.maxPoints !== null ? Number(node.maxPoints) : null,
      blocks: node.blocks.map((block) => this.mapPublishedBlockToDraft(block)),
    };
  }

  private mapPublishedBlockToDraft(block: {
    id: string;
    role: BlockRole;
    blockType: PrismaBlockType;
    textValue: string | null;
    data: Prisma.JsonValue | null;
    media: {
      url: string;
    } | null;
  }): DraftBlock {
    const rawData = this.asJsonRecord(block.data);
    const nextData = rawData ? { ...rawData } : {};

    delete nextData.assetId;

    const mediaUrl = block.media?.url ?? this.readJsonString(nextData, 'url');
    const type = this.fromPublishedBlockType(
      block.blockType,
      nextData,
      Boolean(mediaUrl),
    );

    if (mediaUrl && type === 'image') {
      nextData.url = mediaUrl;
    }

    const level = this.readOptionalMetadataInteger(nextData, 'level');
    const language = this.readJsonString(nextData, 'language');

    return {
      id: block.id,
      role: this.fromPublishedBlockRole(block.role),
      type,
      value:
        type === 'image' && mediaUrl
          ? mediaUrl
          : (block.textValue ?? ''),
      ...(Object.keys(nextData).length
        ? {
            data: nextData,
          }
        : {}),
      ...(level !== null || language
        ? {
            meta: {
              ...(level !== null
                ? {
                    level,
                  }
                : {}),
              ...(language
                ? {
                    language,
                  }
                : {}),
            },
          }
        : {}),
    };
  }

  private fromPublishedBlockRole(role: BlockRole): DraftBlockRole {
    if (role === BlockRole.SOLUTION) {
      return 'SOLUTION';
    }

    if (role === BlockRole.HINT || role === BlockRole.RUBRIC) {
      return 'HINT';
    }

    if (role === BlockRole.META) {
      return 'META';
    }

    return 'PROMPT';
  }

  private fromPublishedBlockType(
    blockType: PrismaBlockType,
    data: Record<string, unknown>,
    hasMediaUrl: boolean,
  ): DraftBlock['type'] {
    if (blockType === PrismaBlockType.HEADING) {
      return 'heading';
    }

    if (blockType === PrismaBlockType.LATEX) {
      return 'latex';
    }

    if (blockType === PrismaBlockType.CODE) {
      return 'code';
    }

    if (blockType === PrismaBlockType.LIST) {
      return 'list';
    }

    if (blockType === PrismaBlockType.TABLE) {
      return Array.isArray(data.rows) ? 'table' : hasMediaUrl ? 'image' : 'table';
    }

    if (blockType === PrismaBlockType.GRAPH) {
      return this.hasPublishedFormulaGraphData(data)
        ? 'graph'
        : hasMediaUrl
          ? 'image'
          : 'paragraph';
    }

    if (blockType === PrismaBlockType.TREE) {
      return this.hasPublishedProbabilityTreeData(data)
        ? 'tree'
        : hasMediaUrl
          ? 'image'
          : 'paragraph';
    }

    if (blockType === PrismaBlockType.IMAGE) {
      return 'image';
    }

    return 'paragraph';
  }

  private hasPublishedFormulaGraphData(data: Record<string, unknown>) {
    const kind = this.readJsonString(data, 'kind');

    return (
      kind === 'formula_graph' ||
      isRecordWithKey(data, 'formulaGraph') ||
      isRecordWithKey(data, 'graph')
    );
  }

  private hasPublishedProbabilityTreeData(data: Record<string, unknown>) {
    const kind = this.readJsonString(data, 'kind');

    return (
      kind === 'probability_tree' ||
      isRecordWithKey(data, 'probabilityTree') ||
      isRecordWithKey(data, 'tree')
    );
  }

  private async storeManualSourceDocument(input: {
    jobId: string;
    kind: SourceDocumentKind;
    upload: IntakeUploadDocumentInput;
    context: CanonicalStorageContext;
    sourceReference: string | null;
  }) {
    const storageClient = this.getStorageClient();
    const fileName = buildCanonicalDocumentFileName(input.context, input.kind);
    const storageKey = buildCanonicalDocumentStorageKey(
      input.context,
      fileName,
    );
    const pageCount = await this.readPdfPageCount(input.upload.buffer);
    const sha256 = createHash('sha256')
      .update(input.upload.buffer)
      .digest('hex');

    await storageClient.putObject({
      key: storageKey,
      body: input.upload.buffer,
      contentType: 'application/pdf',
      metadata: {
        intakeMethod: 'manual-upload',
      },
    });

    return this.prisma.sourceDocument.create({
      data: {
        jobId: input.jobId,
        kind: input.kind,
        storageKey,
        fileName,
        mimeType: 'application/pdf',
        pageCount,
        sha256,
        sourceUrl: null,
        language: 'ar',
        metadata: this.toJsonValue({
          intakeMethod: 'manual_upload',
          uploadedFileName: input.upload.originalFileName,
          uploadedMimeType: input.upload.mimeType,
          uploadedAt: new Date().toISOString(),
          sourceReference: input.sourceReference,
        }),
      },
      select: {
        id: true,
        storageKey: true,
      },
    });
  }

  private async replaceManualSourceDocument(input: {
    sourceDocument: FullIngestionJobRecord['sourceDocuments'][number];
    upload: IntakeUploadDocumentInput;
    context: CanonicalStorageContext;
    sourceReference: string | null;
  }) {
    const storageClient = this.getStorageClient();
    const fileName = buildCanonicalDocumentFileName(
      input.context,
      input.sourceDocument.kind,
    );
    const storageKey = buildCanonicalDocumentStorageKey(
      input.context,
      fileName,
    );
    const pageCount = await this.readPdfPageCount(input.upload.buffer);
    const sha256 = createHash('sha256')
      .update(input.upload.buffer)
      .digest('hex');

    await storageClient.putObject({
      key: storageKey,
      body: input.upload.buffer,
      contentType: 'application/pdf',
      metadata: {
        intakeMethod: 'manual-upload',
      },
    });

    if (input.sourceDocument.pages.length > 0) {
      await this.prisma.sourcePage.deleteMany({
        where: {
          documentId: input.sourceDocument.id,
        },
      });
    }

    return this.prisma.sourceDocument.update({
      where: {
        id: input.sourceDocument.id,
      },
      data: {
        storageKey,
        fileName,
        mimeType: 'application/pdf',
        pageCount,
        sha256,
        sourceUrl: null,
        language: 'ar',
        metadata: this.toJsonValue({
          intakeMethod: 'manual_upload',
          uploadedFileName: input.upload.originalFileName,
          uploadedMimeType: input.upload.mimeType,
          uploadedAt: new Date().toISOString(),
          sourceReference: input.sourceReference,
          replacedAt: new Date().toISOString(),
        }),
      },
      select: {
        id: true,
        storageKey: true,
      },
    });
  }

  private buildStorageContextFromDraft(
    draft: IngestionDraft,
  ): CanonicalStorageContext {
    return {
      year: draft.exam.year,
      streamCode: draft.exam.streamCode,
      subjectCode: draft.exam.subjectCode,
      sessionType: this.toPrismaSessionType(draft.exam.sessionType),
      qualifierKey: this.readJsonString(draft.exam.metadata, 'qualifierKey'),
    };
  }

  private async readPdfPageCount(buffer: Buffer) {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bac-upload-'));
    const pdfPath = path.join(tempDir, 'upload.pdf');

    try {
      await fs.writeFile(pdfPath, buffer);
      const { stdout } = await execFileAsync('pdfinfo', [pdfPath]);
      const match = stdout.match(/^Pages:\s+(\d+)/m);

      if (!match) {
        return null;
      }

      const count = Number.parseInt(match[1], 10);
      return Number.isInteger(count) && count > 0 ? count : null;
    } catch {
      return null;
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }

  private assertPdfUpload(
    upload: IntakeUploadDocumentInput,
    fieldName: string,
  ) {
    if (!upload.buffer.length) {
      throw new BadRequestException(`${fieldName} must not be empty.`);
    }

    const looksLikePdf =
      upload.mimeType === 'application/pdf' ||
      upload.originalFileName.toLowerCase().endsWith('.pdf') ||
      upload.buffer.subarray(0, 4).toString('utf8') === '%PDF';

    if (!looksLikePdf) {
      throw new BadRequestException(`${fieldName} must be a PDF.`);
    }
  }

  private readStrictPositiveYear(value: number) {
    if (!Number.isInteger(value) || value < 1900 || value > 2100) {
      throw new BadRequestException('year must be a valid integer year.');
    }

    return value;
  }

  private readNonEmptyText(value: string, fieldName: string) {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`${fieldName} is required.`);
    }

    return value.trim();
  }

  private buildOfficialSourceReference(
    job: {
      sourceExamPageUrl: string | null;
      sourceCorrectionPageUrl: string | null;
      sourceDocuments: Array<{
        kind: SourceDocumentKind;
        storageKey: string;
      }>;
    },
    draft: IngestionDraft,
  ) {
    const parts = [
      `Provider: ${draft.exam.provider}`,
      `MIN_YEAR: ${draft.exam.minYear}`,
    ];

    if (job.sourceExamPageUrl) {
      parts.push(`Exam page: ${job.sourceExamPageUrl}`);
    }

    if (job.sourceCorrectionPageUrl) {
      parts.push(`Correction page: ${job.sourceCorrectionPageUrl}`);
    }

    const examDocument = job.sourceDocuments.find(
      (document) => document.kind === SourceDocumentKind.EXAM,
    );
    const correctionDocument = job.sourceDocuments.find(
      (document) => document.kind === SourceDocumentKind.CORRECTION,
    );

    if (examDocument) {
      parts.push(`Exam PDF key: ${examDocument.storageKey}`);
    }

    if (correctionDocument) {
      parts.push(`Correction PDF key: ${correctionDocument.storageKey}`);
    }

    const sourceReference = this.readJsonString(
      draft.exam.metadata,
      'sourceReference',
    );

    if (sourceReference) {
      parts.push(`Source reference: ${sourceReference}`);
    }

    return parts.join(' | ');
  }

  private resolvePaperFamilyCode(draft: IngestionDraft) {
    const explicitFamilyCode =
      this.readJsonString(draft.exam.metadata, 'paperFamilyCode') ??
      this.readJsonString(draft.exam.metadata, 'sharedPaperCode');

    if (explicitFamilyCode) {
      return explicitFamilyCode;
    }

    const streamCodes = [...this.resolveDraftStreamCodes(draft)].sort(
      (left, right) => left.localeCompare(right),
    );
    const subjectCode =
      draft.exam.subjectCode?.trim().toUpperCase() ?? 'UNKNOWN_SUBJECT';

    if (streamCodes.length > 1) {
      return `SHARED__${streamCodes.join('__')}__${subjectCode}`;
    }

    return `${streamCodes[0] ?? 'GENERAL'}__${subjectCode}`;
  }

  private fromIngestionStatus(
    status: IngestionJobStatus,
  ): AdminIngestionStatus {
    if (status === IngestionJobStatus.IN_REVIEW) {
      return 'in_review';
    }

    if (status === IngestionJobStatus.APPROVED) {
      return 'approved';
    }

    if (status === IngestionJobStatus.PUBLISHED) {
      return 'published';
    }

    if (status === IngestionJobStatus.FAILED) {
      return 'failed';
    }

    return 'draft';
  }

  private toIngestionStatus(value: unknown): IngestionJobStatus {
    if (
      value === 'draft' ||
      value === 'DRAFT' ||
      value === undefined ||
      value === null
    ) {
      return IngestionJobStatus.DRAFT;
    }

    if (value === 'in_review' || value === 'IN_REVIEW') {
      return IngestionJobStatus.IN_REVIEW;
    }

    if (value === 'approved' || value === 'APPROVED') {
      return IngestionJobStatus.APPROVED;
    }

    if (value === 'published' || value === 'PUBLISHED') {
      return IngestionJobStatus.PUBLISHED;
    }

    if (value === 'failed' || value === 'FAILED') {
      return IngestionJobStatus.FAILED;
    }

    throw new BadRequestException(
      'status must be one of draft, in_review, approved, published, or failed.',
    );
  }

  private fromSessionType(value: SessionType | null) {
    if (value === SessionType.MAKEUP) {
      return 'rattrapage';
    }

    if (value === SessionType.NORMAL) {
      return 'normal';
    }

    return null;
  }

  private toDraftSessionType(value: unknown) {
    if (value === 'rattrapage' || value === 'MAKEUP') {
      return 'MAKEUP' as const;
    }

    if (value === 'normal' || value === 'NORMAL') {
      return 'NORMAL' as const;
    }

    throw new BadRequestException('session must be normal or rattrapage.');
  }

  private toPrismaSessionType(value: IngestionDraft['exam']['sessionType']) {
    return value === 'MAKEUP' ? SessionType.MAKEUP : SessionType.NORMAL;
  }

  private toPrismaVariantCode(value: DraftVariantCode) {
    return value === 'SUJET_2'
      ? ExamVariantCode.SUJET_2
      : ExamVariantCode.SUJET_1;
  }

  private toPrismaNodeType(value: DraftNode['nodeType']) {
    if (value === 'PART') {
      return ExamNodeType.PART;
    }

    if (value === 'QUESTION') {
      return ExamNodeType.QUESTION;
    }

    if (value === 'SUBQUESTION') {
      return ExamNodeType.SUBQUESTION;
    }

    if (value === 'CONTEXT') {
      return ExamNodeType.CONTEXT;
    }

    return ExamNodeType.EXERCISE;
  }

  private toPrismaBlockRole(value: DraftBlockRole) {
    if (value === 'SOLUTION') {
      return BlockRole.SOLUTION;
    }

    if (value === 'HINT') {
      return BlockRole.HINT;
    }

    if (value === 'META') {
      return BlockRole.META;
    }

    return BlockRole.PROMPT;
  }

  private toPrismaBlockType(value: DraftBlock) {
    if (value.type === 'heading') {
      return PrismaBlockType.HEADING;
    }

    if (value.type === 'latex') {
      return PrismaBlockType.LATEX;
    }

    if (value.type === 'code') {
      return PrismaBlockType.CODE;
    }

    if (value.type === 'list') {
      return PrismaBlockType.LIST;
    }

    if (this.isFormulaGraphBlock(value)) {
      if (!this.hasFormulaGraphData(value) && value.assetId) {
        return PrismaBlockType.IMAGE;
      }

      return this.hasFormulaGraphData(value)
        ? PrismaBlockType.GRAPH
        : PrismaBlockType.PARAGRAPH;
    }

    if (this.isProbabilityTreeBlock(value)) {
      if (!this.hasProbabilityTreeData(value) && value.assetId) {
        return PrismaBlockType.IMAGE;
      }

      return this.hasProbabilityTreeData(value)
        ? PrismaBlockType.TREE
        : PrismaBlockType.PARAGRAPH;
    }

    if (value.type === 'table') {
      if (value.assetId && !this.hasStructuredTableData(value)) {
        return PrismaBlockType.IMAGE;
      }

      return PrismaBlockType.TABLE;
    }

    if (value.type === 'image' || value.assetId) {
      return PrismaBlockType.IMAGE;
    }

    return PrismaBlockType.PARAGRAPH;
  }

  private asDraftBlockData(block: DraftBlock) {
    if (
      !block.data ||
      typeof block.data !== 'object' ||
      Array.isArray(block.data)
    ) {
      return null;
    }

    return block.data;
  }

  private hasStructuredTableData(block: DraftBlock) {
    const data = this.asDraftBlockData(block);

    if (!data) {
      return false;
    }

    return Array.isArray(data.rows);
  }

  private hasFormulaGraphData(block: DraftBlock) {
    const data = this.asDraftBlockData(block);

    if (!data) {
      return false;
    }

    const kind = this.readJsonString(data, 'kind');

    return (
      kind === 'formula_graph' ||
      isRecordWithKey(data, 'formulaGraph') ||
      isRecordWithKey(data, 'graph')
    );
  }

  private hasProbabilityTreeData(block: DraftBlock) {
    const data = this.asDraftBlockData(block);

    if (!data) {
      return false;
    }

    const kind = this.readJsonString(data, 'kind');

    return (
      kind === 'probability_tree' ||
      isRecordWithKey(data, 'probabilityTree') ||
      isRecordWithKey(data, 'tree')
    );
  }

  private isFormulaGraphBlock(block: DraftBlock) {
    return block.type === 'graph' || this.hasFormulaGraphData(block);
  }

  private isProbabilityTreeBlock(block: DraftBlock) {
    return block.type === 'tree' || this.hasProbabilityTreeData(block);
  }

  private inferStructuredKind(block: DraftBlock) {
    if (this.isFormulaGraphBlock(block)) {
      return 'formula_graph';
    }

    if (this.isProbabilityTreeBlock(block)) {
      return 'probability_tree';
    }

    return this.readJsonString(block.data ?? null, 'kind');
  }

  private toGeminiRecoveryMode(
    value: unknown,
    fallback: DraftAsset['classification'],
  ): 'text' | 'latex' | 'table' | 'tree' | 'graph' {
    if (
      value === 'text' ||
      value === 'latex' ||
      value === 'table' ||
      value === 'tree' ||
      value === 'graph'
    ) {
      return value;
    }

    if (fallback === 'table' || fallback === 'tree' || fallback === 'graph') {
      return fallback;
    }

    return 'text';
  }

  private hasStructuredRenderData(block: DraftBlock) {
    return (
      this.hasStructuredTableData(block) ||
      this.hasFormulaGraphData(block) ||
      this.hasProbabilityTreeData(block)
    );
  }

  private resolveDraftStreamCodes(draft: IngestionDraft) {
    const sharedStreamCodes = this.readJsonStringArray(
      draft.exam.metadata,
      'sharedStreamCodes',
    );
    const orderedCodes = [
      draft.exam.streamCode?.trim().toUpperCase() ?? null,
      ...sharedStreamCodes,
    ].filter((value): value is string => Boolean(value));

    return Array.from(new Set(orderedCodes));
  }

  private readOptionalMetadataInteger(
    value: Record<string, unknown>,
    field: string,
  ) {
    const raw = value[field];

    if (typeof raw !== 'number' || !Number.isInteger(raw)) {
      return null;
    }

    return raw;
  }

  private readJsonString(value: unknown, field: string) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const raw = (value as Record<string, unknown>)[field];

    if (typeof raw !== 'string' || !raw.trim()) {
      return null;
    }

    return raw.trim();
  }

  private readJsonStringArray(value: unknown, field: string) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return [];
    }

    const raw = (value as Record<string, unknown>)[field];

    if (!Array.isArray(raw)) {
      return [];
    }

    return Array.from(
      new Set(
        raw
          .filter((entry): entry is string => typeof entry === 'string')
          .map((entry) => entry.trim().toUpperCase())
          .filter((entry) => entry.length > 0),
      ),
    );
  }

  private mapPublishedExamOfferings(job: {
    publishedExamId: string | null;
    publishedExam?: {
      id: string;
      stream: {
        code: string;
        name: string;
      };
    } | null;
    publishedPaper?: {
      offerings: Array<{
        id: string;
        stream: {
          code: string;
          name: string;
        };
      }>;
    } | null;
  }) {
    const offerings = new Map<
      string,
      {
        id: string;
        stream_code: string;
        stream_name: string;
        is_primary: boolean;
      }
    >();

    for (const offering of job.publishedPaper?.offerings ?? []) {
      offerings.set(offering.id, {
        id: offering.id,
        stream_code: offering.stream.code,
        stream_name: offering.stream.name,
        is_primary: offering.id === job.publishedExamId,
      });
    }

    if (offerings.size === 0 && job.publishedExam) {
      offerings.set(job.publishedExam.id, {
        id: job.publishedExam.id,
        stream_code: job.publishedExam.stream.code,
        stream_name: job.publishedExam.stream.name,
        is_primary: true,
      });
    }

    return [...offerings.values()].sort((left, right) => {
      if (left.is_primary !== right.is_primary) {
        return left.is_primary ? -1 : 1;
      }

      return left.stream_code.localeCompare(right.stream_code);
    });
  }

  private asJsonRecord(value: Prisma.JsonValue | null) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  }

  private readOptionalString(value: unknown) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('Expected a string value.');
    }

    const trimmed = value.trim();
    return trimmed || null;
  }

  private readCropBoxPayload(value: unknown): DraftAsset['cropBox'] {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('crop_box must be an object.');
    }

    const raw = value as Record<string, unknown>;

    return {
      x: this.readNonNegativeNumber(raw.x, 'crop_box.x'),
      y: this.readNonNegativeNumber(raw.y, 'crop_box.y'),
      width: this.readPositiveNumber(raw.width, 'crop_box.width'),
      height: this.readPositiveNumber(raw.height, 'crop_box.height'),
    };
  }

  private readInteger(value: unknown, fieldName: string) {
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      !Number.isInteger(value)
    ) {
      throw new BadRequestException(`${fieldName} must be an integer.`);
    }

    return value;
  }

  private readBooleanFlag(value: unknown) {
    return value === true || value === 'true' || value === 1 || value === '1';
  }

  private readNonNegativeNumber(value: unknown, fieldName: string) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new BadRequestException(
        `${fieldName} must be a non-negative number.`,
      );
    }

    return Math.round(value);
  }

  private readPositiveNumber(value: unknown, fieldName: string) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive number.`);
    }

    return Math.round(value);
  }

  private throwIfDraftValidationFails(
    validation: ReturnType<typeof validateIngestionDraft>,
    action: 'approve' | 'publish',
  ) {
    if (validation.errors.length === 0) {
      return;
    }

    const preview = validation.errors.slice(0, 3).join(' | ');
    throw new BadRequestException(
      `Cannot ${action} this draft until validation errors are resolved. ${preview}`,
    );
  }

  private getStorageClient() {
    if (!this.storageClient) {
      this.storageClient = new R2StorageClient(readR2ConfigFromEnv());
    }

    return this.storageClient;
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private getApiBaseUrl() {
    const explicit = process.env.PUBLIC_API_BASE_URL;

    if (explicit) {
      return explicit.replace(/\/$/, '');
    }

    return `http://localhost:${process.env.PORT ?? 3001}`;
  }
}

function readPositiveIntegerEnv(
  value: string | undefined,
  fallback: number,
  minimum = 1,
) {
  const parsed = value ? Number.parseInt(value, 10) : NaN;

  return Number.isInteger(parsed) && parsed >= minimum ? parsed : fallback;
}

function isRecordWithKey(value: unknown, key: string) {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.prototype.hasOwnProperty.call(value, key)
  );
}
