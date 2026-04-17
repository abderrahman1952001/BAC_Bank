import { Injectable, NotFoundException } from '@nestjs/common';
import {
  type AdminIngestionActiveOperation,
  type AdminIngestionJobListResponse,
  type AdminIngestionJobResponse,
  type AdminIngestionPublishedExam,
  type AdminIngestionStatus,
  type AdminIngestionWorkflow,
} from '@bac-bank/contracts/ingestion';
import {
  IngestionJobStatus,
  Prisma,
  PublicationStatus,
  SessionType,
  SourceDocumentKind,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  DraftDocumentKind,
  IngestionDraft,
  createEmptyDraft,
  normalizeIngestionDraft,
} from './ingestion.contract';
import { prismaSessionTypeToDraftSessionType } from './ingestion-job-metadata';
import { cropAssetBuffer } from './ingestion-image-crop';
import { isPublishedRevisionProvider } from './ingestion.constants';
import {
  canApproveIngestionJob,
  canPublishIngestionJob,
} from './ingestion-workflow';
import { readIngestionWorkerRequest } from './ingestion-process-request';
import { validateIngestionDraft } from './ingestion-validation';
import { R2StorageClient, readR2ConfigFromEnv } from './r2-storage';

const fullIngestionJobInclude = {
  include: {
    paperSource: {
      include: {
        subject: {
          select: {
            code: true,
          },
        },
        streamMappings: {
          orderBy: {
            streamId: 'asc',
          },
          select: {
            stream: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
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
} satisfies Prisma.IngestionJobDefaultArgs;

type RawIngestionJobRecord = Prisma.IngestionJobGetPayload<
  typeof fullIngestionJobInclude
>;
export type FullIngestionJobRecord = RawIngestionJobRecord & {
  sourceDocuments: RawIngestionJobRecord['paperSource']['sourceDocuments'];
};

@Injectable()
export class IngestionReadService {
  private storageClient: R2StorageClient | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async listJobs(): Promise<AdminIngestionJobListResponse> {
    const jobs = await this.prisma.ingestionJob.findMany({
      ...fullIngestionJobInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      data: jobs.map((rawJob) => {
        const job = this.attachSourceDocuments(rawJob);
        const draft = this.hydrateDraft(job);

        return {
          id: job.id,
          label: draft.exam.title,
          draft_kind: this.getDraftKind(draft.exam.provider),
          provider: draft.exam.provider,
          year: draft.exam.year,
          stream_codes: this.resolveDraftStreamCodes(
            draft,
            job.paperSource.streamMappings.map(
              (mapping) => mapping.stream.code,
            ),
          ),
          subject_code: draft.exam.subjectCode,
          session:
            draft.exam.sessionType === 'MAKEUP' ? 'rattrapage' : 'normal',
          min_year: draft.exam.minYear,
          status: this.fromIngestionStatus(job.status),
          review_notes: job.reviewNotes,
          error_message: job.errorMessage,
          source_document_count: job.sourceDocuments.length,
          source_page_count: job.sourceDocuments.reduce(
            (sum, document) => sum + document.pages.length,
            0,
          ),
          workflow: this.buildWorkflowState({
            provider: draft.exam.provider,
            status: job.status,
            metadata: job.metadata,
            sourceDocuments: job.sourceDocuments,
          }),
          published_paper_id: job.publishedPaperId,
          published_exams: this.mapPublishedExamOfferings(job),
          created_at: job.createdAt,
          updated_at: job.updatedAt,
        };
      }),
    };
  }

  async getJob(jobId: string): Promise<AdminIngestionJobResponse> {
    const job = await this.findJobOrThrow(jobId);
    const draft = this.hydrateDraft(job);
    return this.mapJobDetail(job, draft);
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
            paperSourceId: true,
          },
        },
      },
    });

    if (!page || page.document.paperSourceId !== job.paperSourceId) {
      throw new NotFoundException(
        `Asset ${assetId} references an unknown source page.`,
      );
    }

    const pageBuffer = await this.getStorageClient().getObjectBuffer(
      page.storageKey,
    );
    const cropped = await cropAssetBuffer(pageBuffer, asset);

    return {
      mimeType: 'image/png',
      data: cropped,
    };
  }

  async findJobOrThrow(jobId: string): Promise<FullIngestionJobRecord> {
    const job = await this.prisma.ingestionJob.findUnique({
      where: {
        id: jobId,
      },
      ...fullIngestionJobInclude,
    });

    if (!job) {
      throw new NotFoundException(`Ingestion job ${jobId} not found.`);
    }

    return this.attachSourceDocuments(job);
  }

  hydrateDraft(job: {
    paperSource: {
      provider: string;
      year: number;
      sessionType: SessionType;
      sourceListingUrl: string | null;
      sourceExamPageUrl: string | null;
      sourceCorrectionPageUrl: string | null;
      subject: {
        code: string;
      };
      streamMappings: Array<{
        stream: {
          code: string;
        };
      }>;
    };
    label: string;
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
        year: job.paperSource.year,
        subjectCode: job.paperSource.subject.code,
        sessionType: prismaSessionTypeToDraftSessionType(
          job.paperSource.sessionType,
        ),
        provider: job.paperSource.provider,
        title: job.label,
        minYear: job.paperSource.year,
        sourceListingUrl: job.paperSource.sourceListingUrl,
        sourceExamPageUrl: job.paperSource.sourceExamPageUrl,
        sourceCorrectionPageUrl: job.paperSource.sourceCorrectionPageUrl,
        metadata: {
          paperStreamCodes: job.paperSource.streamMappings.map(
            (mapping) => mapping.stream.code,
          ),
        },
      });
    }

    draft.exam.year = draft.exam.year || job.paperSource.year;
    draft.exam.subjectCode =
      draft.exam.subjectCode ?? job.paperSource.subject.code;
    draft.exam.provider = draft.exam.provider || job.paperSource.provider;
    draft.exam.minYear =
      Number.isInteger(draft.exam.minYear) && draft.exam.minYear > 0
        ? draft.exam.minYear
        : job.paperSource.year;
    draft.exam.sourceListingUrl =
      draft.exam.sourceListingUrl ?? job.paperSource.sourceListingUrl;
    draft.exam.sourceExamPageUrl =
      draft.exam.sourceExamPageUrl ?? job.paperSource.sourceExamPageUrl;
    draft.exam.sourceCorrectionPageUrl =
      draft.exam.sourceCorrectionPageUrl ??
      job.paperSource.sourceCorrectionPageUrl;
    draft.exam.metadata = this.ensureDraftMetadata(draft.exam.metadata, {
      paperStreamCodes: this.resolveDraftStreamCodes(
        draft,
        job.paperSource.streamMappings.map((mapping) => mapping.stream.code),
      ),
    });

    const examDocument =
      job.sourceDocuments.find(
        (document) => document.kind === SourceDocumentKind.EXAM,
      ) ?? null;
    const correctionDocument =
      job.sourceDocuments.find(
        (document) => document.kind === SourceDocumentKind.CORRECTION,
      ) ?? null;

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

  mapJobDetail(
    job: {
      id: string;
      status: IngestionJobStatus;
      reviewNotes: string | null;
      errorMessage: string | null;
      paperSource: {
        streamMappings: Array<{
          stream: {
            code: string;
          };
        }>;
      };
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
      metadata: Prisma.JsonValue | null;
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
  ): AdminIngestionJobResponse {
    const validation = validateIngestionDraft(draft);
    const workflow = this.buildWorkflowState({
      provider: draft.exam.provider,
      status: job.status,
      metadata: job.metadata,
      sourceDocuments: job.sourceDocuments,
    });
    const requiresSourceDocuments = !this.isPublishedRevisionProvider(
      draft.exam.provider,
    );

    return {
      job: {
        id: job.id,
        label: draft.exam.title,
        draft_kind: this.getDraftKind(draft.exam.provider),
        provider: draft.exam.provider,
        year: draft.exam.year,
        stream_codes: this.resolveDraftStreamCodes(
          draft,
          job.paperSource.streamMappings.map((mapping) => mapping.stream.code),
        ),
        subject_code: draft.exam.subjectCode,
        session: draft.exam.sessionType === 'MAKEUP' ? 'rattrapage' : 'normal',
        min_year: draft.exam.minYear,
        status: this.fromIngestionStatus(job.status),
        review_notes: job.reviewNotes,
        error_message: job.errorMessage,
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
          (!requiresSourceDocuments || workflow.has_correction_document) &&
          canApproveIngestionJob({
            status: job.status,
            provider: draft.exam.provider,
          }),
        can_publish:
          validation.errors.length === 0 &&
          (!requiresSourceDocuments || workflow.has_correction_document) &&
          canPublishIngestionJob(job.status),
      },
    };
  }

  private buildWorkflowState(job: {
    provider: string;
    status: IngestionJobStatus;
    metadata: Prisma.JsonValue | null;
    sourceDocuments: Array<{
      kind: SourceDocumentKind;
    }>;
  }): AdminIngestionWorkflow {
    const reviewStarted =
      job.status === IngestionJobStatus.IN_REVIEW ||
      job.status === IngestionJobStatus.APPROVED ||
      job.status === IngestionJobStatus.PUBLISHED;
    const activeOperation = this.resolveActiveOperation(
      job.status,
      job.metadata,
    );

    if (this.isPublishedRevisionProvider(job.provider)) {
      return {
        has_exam_document: false,
        has_correction_document: false,
        awaiting_correction: false,
        can_process: false,
        review_started: reviewStarted,
        active_operation: activeOperation,
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
        job.status !== IngestionJobStatus.QUEUED &&
        job.status !== IngestionJobStatus.PROCESSING &&
        job.status !== IngestionJobStatus.PUBLISHED,
      review_started: reviewStarted,
      active_operation: activeOperation,
    };
  }

  private resolveActiveOperation(
    status: IngestionJobStatus,
    metadata: Prisma.JsonValue | null,
  ): AdminIngestionActiveOperation {
    if (
      status !== IngestionJobStatus.QUEUED &&
      status !== IngestionJobStatus.PROCESSING
    ) {
      return 'idle';
    }

    return readIngestionWorkerRequest(metadata).action === 'publish'
      ? 'publishing'
      : 'processing';
  }

  private isPublishedRevisionProvider(provider: string) {
    return isPublishedRevisionProvider(provider);
  }

  private getDraftKind(provider: string) {
    return this.isPublishedRevisionProvider(provider)
      ? ('revision' as const)
      : ('ingestion' as const);
  }

  private fromIngestionStatus(
    status: IngestionJobStatus,
  ): AdminIngestionStatus {
    if (status === IngestionJobStatus.QUEUED) {
      return 'queued';
    }

    if (status === IngestionJobStatus.PROCESSING) {
      return 'processing';
    }

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

  private fromSessionType(value: SessionType | null) {
    if (value === SessionType.MAKEUP) {
      return 'rattrapage';
    }

    if (value === SessionType.NORMAL) {
      return 'normal';
    }

    return null;
  }

  private mapPublishedExamOfferings(job: {
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
  }): AdminIngestionPublishedExam[] {
    const offerings = new Map<
      string,
      {
        id: string;
        stream_code: string;
        stream_name: string;
      }
    >();

    for (const offering of job.publishedPaper?.offerings ?? []) {
      offerings.set(offering.id, {
        id: offering.id,
        stream_code: offering.stream.code,
        stream_name: offering.stream.name,
      });
    }

    if (offerings.size === 0 && job.publishedExam) {
      offerings.set(job.publishedExam.id, {
        id: job.publishedExam.id,
        stream_code: job.publishedExam.stream.code,
        stream_name: job.publishedExam.stream.name,
      });
    }

    return [...offerings.values()].sort((left, right) =>
      left.stream_code.localeCompare(right.stream_code),
    );
  }

  private resolveDraftStreamCodes(
    draft: IngestionDraft,
    fallbackStreamCodes?: string[],
  ) {
    const metadata = this.asJsonRecord(draft.exam.metadata);
    const paperStreamCodes = this.readMetadataStringArray(
      metadata,
      'paperStreamCodes',
    );

    if (paperStreamCodes.length > 0) {
      return paperStreamCodes;
    }

    const sharedStreamCodes = this.readMetadataStringArray(
      metadata,
      'sharedStreamCodes',
    );
    const legacyCodes = [
      draft.exam.streamCode?.trim().toUpperCase() ?? null,
      ...sharedStreamCodes,
      ...(fallbackStreamCodes ?? []),
    ].filter((value): value is string => Boolean(value));

    return Array.from(new Set(legacyCodes));
  }

  private ensureDraftMetadata(
    value: Record<string, unknown>,
    patch: Record<string, unknown>,
  ) {
    return {
      ...value,
      ...patch,
    };
  }

  private asJsonRecord(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  }

  private readMetadataStringArray(
    value: Record<string, unknown> | null,
    field: string,
  ) {
    const raw = value?.[field];

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

  private attachSourceDocuments(
    job: RawIngestionJobRecord,
  ): FullIngestionJobRecord {
    return {
      ...job,
      sourceDocuments: job.paperSource.sourceDocuments,
    };
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

  private getStorageClient() {
    if (!this.storageClient) {
      this.storageClient = new R2StorageClient(readR2ConfigFromEnv());
    }

    return this.storageClient;
  }

  private getApiBaseUrl() {
    const explicit = process.env.PUBLIC_API_BASE_URL;

    if (explicit) {
      return explicit.replace(/\/$/, '');
    }

    return `http://localhost:${process.env.PORT ?? 3001}`;
  }
}
