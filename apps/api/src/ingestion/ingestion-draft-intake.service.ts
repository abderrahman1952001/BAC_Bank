import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AdminIngestionJobResponse } from '@bac-bank/contracts/ingestion';
import {
  BlockRole,
  BlockType as PrismaBlockType,
  ExamNodeType,
  ExamVariantCode,
  IngestionJobStatus,
  Prisma,
  PublicationStatus,
  SessionType,
  SourceDocumentKind,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  DraftAsset,
  DraftAssetClassification,
  DraftBlock,
  DraftBlockRole,
  DraftCropBox,
  DraftDocumentKind,
  DraftNode,
  DraftSourcePage,
  DraftVariantCode,
  createEmptyDraft,
} from './ingestion.contract';
import {
  asJsonRecord,
  buildStorageContextFromDraft,
  readJsonString,
  readNonEmptyText,
  readOptionalMetadataInteger,
  readOptionalString,
  readStrictPositiveYear,
  resolveDraftStreamCodes,
  resolvePaperFamilyCode,
  toJsonValue,
} from './ingestion-draft-support';
import {
  draftSessionTypeToPrismaSessionType,
  projectIngestionJobMetadataFromDraft,
} from './ingestion-job-metadata';
import { IngestionPaperSourceService } from './ingestion-paper-source.service';
import { IngestionReadService } from './ingestion-read.service';
import {
  IngestionSourceDocumentService,
  type IntakeUploadDocumentInput,
} from './ingestion-source-document.service';
import { PUBLISHED_REVISION_PROVIDER } from './ingestion.constants';
import { R2StorageClient, readR2ConfigFromEnv } from './r2-storage';
import { CanonicalStorageContext } from './storage-naming';

export type CreateManualUploadJobInput = {
  year: number;
  paperStreamCodes?: string[];
  subjectCode: string;
  sessionType: 'NORMAL' | 'MAKEUP';
  title: string;
  qualifierKey?: string | null;
  sourceReference?: string | null;
  examDocument: IntakeUploadDocumentInput;
  correctionDocument?: IntakeUploadDocumentInput | null;
};

export type AttachCorrectionDocumentInput = {
  correctionDocument: IntakeUploadDocumentInput;
};

type PublishedRevisionDraftContext = {
  variantCode: DraftVariantCode;
  assets: DraftAsset[];
  sourcePagesById: Map<string, DraftSourcePage>;
};

@Injectable()
export class IngestionDraftIntakeService {
  private storageClient: R2StorageClient | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly readService: IngestionReadService,
    private readonly paperSourceService: IngestionPaperSourceService,
    private readonly sourceDocumentService: IngestionSourceDocumentService,
  ) {}

  async createManualUploadJob(
    input: CreateManualUploadJobInput,
  ): Promise<AdminIngestionJobResponse> {
    const subjectCode = readOptionalString(input.subjectCode);
    const qualifierKey = readOptionalString(input.qualifierKey);
    const sourceReference = readOptionalString(input.sourceReference);

    if (!subjectCode) {
      throw new BadRequestException(
        'paperStreamCodes and subjectCode are required for manual intake.',
      );
    }

    const title = readNonEmptyText(input.title, 'title');
    const year = readStrictPositiveYear(input.year);
    const selectedPaperStreamCodes = Array.from(
      new Set(
        (input.paperStreamCodes ?? [])
          .map((value) => readOptionalString(value)?.toUpperCase() ?? null)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    if (selectedPaperStreamCodes.length === 0) {
      throw new BadRequestException(
        'At least one paper stream is required for manual intake.',
      );
    }

    this.sourceDocumentService.assertPdfUpload(
      input.examDocument,
      'examDocument',
    );

    if (input.correctionDocument) {
      this.sourceDocumentService.assertPdfUpload(
        input.correctionDocument,
        'correctionDocument',
      );
    }

    const draft = createEmptyDraft({
      year,
      subjectCode,
      sessionType: input.sessionType,
      provider: 'manual_upload',
      title,
      minYear: year,
      metadata: {
        intakeMethod: 'manual_upload',
        sourceReference,
        qualifierKey,
        paperStreamCodes: selectedPaperStreamCodes,
        uploadedAt: new Date().toISOString(),
      },
    });
    const sessionType = draftSessionTypeToPrismaSessionType(input.sessionType);
    const paperSource = await this.paperSourceService.upsertPaperSource({
      provider: draft.exam.provider,
      year,
      sessionType,
      subjectCode,
      familyCode: resolvePaperFamilyCode(draft, this.paperSourceService),
      streamCodes: resolveDraftStreamCodes(draft, this.paperSourceService),
      sourceListingUrl: draft.exam.sourceListingUrl,
      sourceExamPageUrl: draft.exam.sourceExamPageUrl,
      sourceCorrectionPageUrl: draft.exam.sourceCorrectionPageUrl,
      metadata: toJsonValue(draft.exam.metadata),
    });
    const context: CanonicalStorageContext = {
      year,
      streamCode: null,
      familyCode: paperSource.familyCode,
      subjectCode,
      sessionType,
      qualifierKey,
    };

    const metadata = {
      intakeMethod: 'manual_upload',
      sourceReference,
      qualifierKey,
      paperStreamCodes: selectedPaperStreamCodes,
      uploadedAt: new Date().toISOString(),
    };
    const job = await this.prisma.ingestionJob.create({
      data: {
        paperSourceId: paperSource.id,
        ...projectIngestionJobMetadataFromDraft(draft),
        status: IngestionJobStatus.DRAFT,
        reviewNotes: sourceReference,
        draftJson: toJsonValue(draft),
        metadata: toJsonValue(metadata),
      },
      select: {
        id: true,
      },
    });

    try {
      const examDocument =
        await this.sourceDocumentService.storeManualSourceDocument({
          paperSourceId: paperSource.id,
          kind: SourceDocumentKind.EXAM,
          upload: input.examDocument,
          context,
          sourceReference,
          storageClient: this.getStorageClient(),
        });
      draft.exam.examDocumentId = examDocument.id;
      draft.exam.examDocumentStorageKey = examDocument.storageKey;

      let correctionDocumentId: string | null = null;
      let correctionDocumentStorageKey: string | null = null;

      if (input.correctionDocument) {
        const correctionDocument =
          await this.sourceDocumentService.storeManualSourceDocument({
            paperSourceId: paperSource.id,
            kind: SourceDocumentKind.CORRECTION,
            upload: input.correctionDocument,
            context,
            sourceReference,
            storageClient: this.getStorageClient(),
          });
        correctionDocumentId = correctionDocument.id;
        correctionDocumentStorageKey = correctionDocument.storageKey;
      }

      draft.exam.correctionDocumentId = correctionDocumentId;
      draft.exam.correctionDocumentStorageKey = correctionDocumentStorageKey;

      await this.prisma.ingestionJob.update({
        where: {
          id: job.id,
        },
        data: {
          ...projectIngestionJobMetadataFromDraft(draft),
          draftJson: toJsonValue(draft),
          errorMessage: null,
          status: IngestionJobStatus.DRAFT,
        },
      });

      return this.readService.getJob(job.id);
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

  async createPublishedRevisionJob(
    paperId: string,
  ): Promise<AdminIngestionJobResponse> {
    const paper = await this.prisma.paper.findUnique({
      where: {
        id: paperId,
      },
      select: {
        id: true,
        year: true,
        sessionType: true,
        subject: {
          select: {
            code: true,
            name: true,
          },
        },
        paperSourceId: true,
        familyCode: true,
        officialSourceReference: true,
        paperSource: {
          select: {
            sourceDocuments: {
              orderBy: {
                kind: 'asc',
              },
              select: {
                id: true,
                kind: true,
                storageKey: true,
                pages: {
                  orderBy: {
                    pageNumber: 'asc',
                  },
                  select: {
                    id: true,
                    documentId: true,
                    pageNumber: true,
                    width: true,
                    height: true,
                  },
                },
              },
            },
          },
        },
        offerings: {
          where: {
            isPublished: true,
          },
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
                topicMappings: {
                  select: {
                    topic: {
                      select: {
                        code: true,
                      },
                    },
                  },
                },
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
                        id: true,
                        url: true,
                        metadata: true,
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

    if (!paper || paper.offerings.length === 0) {
      throw new NotFoundException(`Published paper ${paperId} not found.`);
    }

    const existingJob = await this.prisma.ingestionJob.findFirst({
      where: {
        paperSourceId: paper.paperSourceId,
        publishedPaperId: paper.id,
        status: {
          in: [
            IngestionJobStatus.DRAFT,
            IngestionJobStatus.QUEUED,
            IngestionJobStatus.PROCESSING,
            IngestionJobStatus.IN_REVIEW,
            IngestionJobStatus.APPROVED,
          ],
        },
      },
      select: {
        id: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    if (existingJob) {
      return this.readService.getJob(existingJob.id);
    }

    const draft = this.createPublishedRevisionDraft(paper);
    const created = await this.prisma.ingestionJob.create({
      data: {
        paperSourceId: paper.paperSourceId,
        ...projectIngestionJobMetadataFromDraft(draft),
        status: IngestionJobStatus.DRAFT,
        reviewNotes: null,
        draftJson: toJsonValue(draft),
        metadata: toJsonValue(draft.exam.metadata),
        publishedPaperId: paper.id,
      },
      select: {
        id: true,
      },
    });

    return this.readService.getJob(created.id);
  }

  async attachCorrectionDocument(
    jobId: string,
    input: AttachCorrectionDocumentInput,
  ): Promise<AdminIngestionJobResponse> {
    const job = await this.readService.findJobOrThrow(jobId);

    if (job.status === IngestionJobStatus.PUBLISHED) {
      throw new BadRequestException(
        'Published ingestion jobs cannot accept a new correction PDF.',
      );
    }

    if (
      job.status === IngestionJobStatus.QUEUED ||
      job.status === IngestionJobStatus.PROCESSING ||
      job.status === IngestionJobStatus.IN_REVIEW ||
      job.status === IngestionJobStatus.APPROVED
    ) {
      throw new BadRequestException(
        'Add or replace the correction PDF before processing or review starts. Reprocessing reviewed jobs is intentionally blocked unless you force it explicitly.',
      );
    }

    this.sourceDocumentService.assertPdfUpload(
      input.correctionDocument,
      'correctionDocument',
    );

    const draft = this.readService.hydrateDraft(job);
    const context = buildStorageContextFromDraft(
      draft,
      this.paperSourceService,
    );
    const sourceReference = readJsonString(
      draft.exam.metadata,
      'sourceReference',
    );
    const existingCorrection =
      job.sourceDocuments.find(
        (document) => document.kind === SourceDocumentKind.CORRECTION,
      ) ?? null;

    const correctionDocument = existingCorrection
      ? await this.sourceDocumentService.replaceManualSourceDocument({
          sourceDocument: existingCorrection,
          upload: input.correctionDocument,
          context,
          sourceReference,
          storageClient: this.getStorageClient(),
        })
      : await this.sourceDocumentService.storeManualSourceDocument({
          paperSourceId: job.paperSourceId,
          kind: SourceDocumentKind.CORRECTION,
          upload: input.correctionDocument,
          context,
          sourceReference,
          storageClient: this.getStorageClient(),
        });

    draft.exam.correctionDocumentId = correctionDocument.id;
    draft.exam.correctionDocumentStorageKey = correctionDocument.storageKey;

    await this.prisma.ingestionJob.update({
      where: {
        id: job.id,
      },
      data: {
        ...projectIngestionJobMetadataFromDraft(draft),
        status: IngestionJobStatus.DRAFT,
        errorMessage: null,
        draftJson: toJsonValue(draft),
      },
    });

    return this.readService.getJob(job.id);
  }

  private createPublishedRevisionDraft(paper: {
    id: string;
    sessionType: SessionType;
    year: number;
    subject: {
      code: string;
      name: string;
    };
    familyCode: string;
    officialSourceReference: string | null;
    paperSource: {
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
        }>;
      }>;
    };
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
        topicMappings: Array<{
          topic: {
            code: string;
          };
        }>;
        blocks: Array<{
          id: string;
          role: BlockRole;
          blockType: PrismaBlockType;
          textValue: string | null;
          data: Prisma.JsonValue | null;
          media: {
            id: string;
            url: string;
            metadata: Prisma.JsonValue | null;
          } | null;
        }>;
      }>;
    }>;
  }) {
    const paperStreamCodes = Array.from(
      new Set(paper.offerings.map((offering) => offering.stream.code)),
    ).sort((left, right) => left.localeCompare(right));
    const title = [
      'Library Revision',
      paper.year,
      paper.subject.name,
      paperStreamCodes.join(' + '),
    ].join(' · ');
    const draft = createEmptyDraft({
      year: paper.year,
      subjectCode: paper.subject.code,
      sessionType:
        paper.sessionType === SessionType.MAKEUP ? 'MAKEUP' : 'NORMAL',
      provider: PUBLISHED_REVISION_PROVIDER,
      title,
      minYear: paper.year,
      metadata: {
        editingMode: PUBLISHED_REVISION_PROVIDER,
        paperFamilyCode: paper.familyCode,
        sourceReference: paper.officialSourceReference,
        paperStreamCodes,
        originPaperId: paper.id,
        originOfferingIds: paper.offerings.map((offering) => offering.id),
      },
    });
    const sourcePagesById = new Map<string, DraftSourcePage>();

    for (const document of paper.paperSource.sourceDocuments) {
      if (document.kind === SourceDocumentKind.EXAM) {
        draft.exam.examDocumentId = document.id;
        draft.exam.examDocumentStorageKey = document.storageKey;
      }

      if (document.kind === SourceDocumentKind.CORRECTION) {
        draft.exam.correctionDocumentId = document.id;
        draft.exam.correctionDocumentStorageKey = document.storageKey;
      }

      for (const page of document.pages) {
        const draftPage: DraftSourcePage = {
          id: page.id,
          documentId: page.documentId,
          documentKind: this.fromSourceDocumentKind(document.kind),
          pageNumber: page.pageNumber,
          width: page.width,
          height: page.height,
        };

        sourcePagesById.set(draftPage.id, draftPage);
        draft.sourcePages.push(draftPage);
      }
    }

    const revisionAssets: DraftAsset[] = [];
    const variantsByCode = new Map(
      paper.variants.map((variant) => [
        variant.code,
        {
          code: variant.code as DraftVariantCode,
          title:
            variant.title ??
            (variant.code === ExamVariantCode.SUJET_2
              ? 'الموضوع الثاني'
              : 'الموضوع الأول'),
          nodes: variant.nodes.map((node) =>
            this.mapPublishedNodeToDraft(node, {
              variantCode: variant.code as DraftVariantCode,
              assets: revisionAssets,
              sourcePagesById,
            }),
          ),
        },
      ]),
    );

    draft.variants = draft.variants.map(
      (variant) =>
        variantsByCode.get(variant.code as ExamVariantCode) ?? variant,
    );
    draft.assets = revisionAssets;

    return draft;
  }

  private mapPublishedNodeToDraft(
    node: {
      id: string;
      parentId: string | null;
      nodeType: ExamNodeType;
      orderIndex: number;
      label: string | null;
      maxPoints: Prisma.Decimal | null;
      topicMappings: Array<{
        topic: {
          code: string;
        };
      }>;
      blocks: Array<{
        id: string;
        role: BlockRole;
        blockType: PrismaBlockType;
        textValue: string | null;
        data: Prisma.JsonValue | null;
        media: {
          id: string;
          url: string;
          metadata: Prisma.JsonValue | null;
        } | null;
      }>;
    },
    context: PublishedRevisionDraftContext,
  ): DraftNode {
    return {
      id: node.id,
      nodeType: node.nodeType,
      parentId: node.parentId,
      orderIndex: node.orderIndex,
      label: node.label,
      maxPoints: node.maxPoints !== null ? Number(node.maxPoints) : null,
      topicCodes: node.topicMappings.map((mapping) => mapping.topic.code),
      blocks: node.blocks.map((block) =>
        this.mapPublishedBlockToDraft(block, context),
      ),
    };
  }

  private mapPublishedBlockToDraft(
    block: {
      id: string;
      role: BlockRole;
      blockType: PrismaBlockType;
      textValue: string | null;
      data: Prisma.JsonValue | null;
      media: {
        id: string;
        url: string;
        metadata: Prisma.JsonValue | null;
      } | null;
    },
    context: PublishedRevisionDraftContext,
  ): DraftBlock {
    const rawData = asJsonRecord(block.data);
    const nextData = rawData ? { ...rawData } : {};

    delete nextData.assetId;

    const mediaUrl = block.media?.url ?? readJsonString(nextData, 'url');
    const type = this.fromPublishedBlockType(
      block.blockType,
      nextData,
      Boolean(mediaUrl),
    );
    const preservedAsset = this.buildDraftAssetFromPublishedMedia(
      block,
      type,
      context,
    );

    if (preservedAsset) {
      context.assets.push(preservedAsset);
      delete nextData.url;
    } else if (mediaUrl && type === 'image') {
      nextData.url = mediaUrl;
    }

    const level = readOptionalMetadataInteger(nextData, 'level');
    const language = readJsonString(nextData, 'language');

    return {
      id: block.id,
      role: this.fromPublishedBlockRole(block.role),
      type,
      value:
        type === 'image' && mediaUrl && !preservedAsset
          ? mediaUrl
          : (block.textValue ?? ''),
      assetId: preservedAsset?.id,
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

  private buildDraftAssetFromPublishedMedia(
    block: {
      id: string;
      role: BlockRole;
      textValue: string | null;
      media: {
        metadata: Prisma.JsonValue | null;
      } | null;
    },
    blockType: DraftBlock['type'],
    context: PublishedRevisionDraftContext,
  ): DraftAsset | null {
    const metadata = block.media ? asJsonRecord(block.media.metadata) : null;
    const sourcePageId = readJsonString(metadata, 'sourcePageId');
    const sourcePage = sourcePageId
      ? context.sourcePagesById.get(sourcePageId)
      : null;
    const cropBox = this.readPublishedCropBox(metadata?.cropBox);

    if (!sourcePage || !cropBox) {
      return null;
    }

    return {
      id: `revision_asset_${block.id}`,
      sourcePageId: sourcePage.id,
      documentKind: sourcePage.documentKind,
      pageNumber: sourcePage.pageNumber,
      variantCode: context.variantCode,
      role: this.fromPublishedBlockRole(block.role),
      classification: this.readPublishedAssetClassification(
        metadata,
        blockType,
      ),
      cropBox,
      label: readOptionalString(block.textValue),
      notes: 'Preserved from published human-verified crop.',
      nativeSuggestion: null,
    };
  }

  private readPublishedAssetClassification(
    metadata: Record<string, unknown> | null,
    blockType: DraftBlock['type'],
  ): DraftAssetClassification {
    const classification = readJsonString(metadata, 'classification');

    if (
      classification === 'table' ||
      classification === 'tree' ||
      classification === 'graph' ||
      classification === 'image'
    ) {
      return classification;
    }

    if (
      blockType === 'table' ||
      blockType === 'tree' ||
      blockType === 'graph'
    ) {
      return blockType;
    }

    return 'image';
  }

  private readPublishedCropBox(value: unknown): DraftCropBox | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const raw = value as Record<string, unknown>;
    const x = readFiniteNumber(raw.x);
    const y = readFiniteNumber(raw.y);
    const width = readFiniteNumber(raw.width);
    const height = readFiniteNumber(raw.height);

    if (x === null || y === null || width === null || height === null) {
      return null;
    }

    return {
      x,
      y,
      width,
      height,
    };
  }

  private fromSourceDocumentKind(kind: SourceDocumentKind): DraftDocumentKind {
    return kind === SourceDocumentKind.CORRECTION ? 'CORRECTION' : 'EXAM';
  }

  private fromPublishedBlockRole(role: BlockRole): DraftBlockRole {
    if (role === BlockRole.SOLUTION) {
      return 'SOLUTION';
    }

    if (role === BlockRole.HINT) {
      return 'HINT';
    }

    if (role === BlockRole.RUBRIC) {
      return 'RUBRIC';
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
      return Array.isArray(data.rows)
        ? 'table'
        : hasMediaUrl
          ? 'image'
          : 'table';
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
    const kind = readJsonString(data, 'kind');

    return (
      kind === 'formula_graph' ||
      isRecordWithKey(data, 'formulaGraph') ||
      isRecordWithKey(data, 'graph')
    );
  }

  private hasPublishedProbabilityTreeData(data: Record<string, unknown>) {
    const kind = readJsonString(data, 'kind');

    return (
      kind === 'probability_tree' ||
      isRecordWithKey(data, 'probabilityTree') ||
      isRecordWithKey(data, 'tree')
    );
  }

  private getStorageClient() {
    if (!this.storageClient) {
      this.storageClient = new R2StorageClient(readR2ConfigFromEnv());
    }

    return this.storageClient;
  }
}

function isRecordWithKey(value: unknown, key: string) {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.prototype.hasOwnProperty.call(value, key)
  );
}

function readFiniteNumber(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return value;
}
