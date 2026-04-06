import { Injectable } from '@nestjs/common';
import {
  IngestionJobStatus,
  Prisma,
  SessionType,
  SourceDocumentKind,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IngestionDraft, normalizeIngestionDraft } from './ingestion.contract';
import { projectIngestionJobMetadataFromDraft } from './ingestion-job-metadata';
import { IngestionPaperSourceService } from './ingestion-paper-source.service';
import {
  IngestionSourceDocumentService,
  IntakeSourceDocumentInput,
} from './ingestion-source-document.service';
import { R2StorageClient } from './r2-storage';

export type SourceIntakeJobDocumentInput = {
  kind: SourceDocumentKind;
  document: IntakeSourceDocumentInput;
};

@Injectable()
export class IngestionSourceIntakeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paperSourceService: IngestionPaperSourceService,
    private readonly sourceDocumentService: IngestionSourceDocumentService,
  ) {}

  async upsertExternalSourceJob(input: {
    externalExamUrl: string;
    replaceExisting: boolean;
    storageClient: R2StorageClient;
    draft: IngestionDraft;
    metadata: Prisma.InputJsonValue;
    reviewNotes?: string | null;
    job: {
      label: string;
      provider: string;
      sourceListingUrl: string | null;
      sourceExamPageUrl: string | null;
      sourceCorrectionPageUrl: string | null;
      year: number;
      streamCode: string | null;
      subjectCode: string | null;
      sessionType: SessionType;
      minYear: number;
    };
    documents: SourceIntakeJobDocumentInput[];
  }) {
    const draft = normalizeIngestionDraft(input.draft);
    const streamCodes = this.resolveDraftStreamCodes(draft);
    const paperSource = await this.paperSourceService.upsertPaperSource({
      provider: input.job.provider,
      year: input.job.year,
      sessionType: input.job.sessionType,
      subjectCode: input.job.subjectCode ?? draft.exam.subjectCode ?? undefined,
      familyCode: this.readPaperFamilyCode(draft, streamCodes),
      streamCodes,
      sourceListingUrl: input.job.sourceListingUrl,
      sourceExamPageUrl: input.job.sourceExamPageUrl,
      sourceCorrectionPageUrl: input.job.sourceCorrectionPageUrl,
      metadata: input.metadata,
    });
    const projectedMetadata = projectIngestionJobMetadataFromDraft(draft);
    const existing = await this.prisma.ingestionJob.findFirst({
      where: {
        paperSourceId: paperSource.id,
        metadata: {
          path: ['examPdfUrl'],
          equals: input.externalExamUrl,
        },
      },
      include: {
        paperSource: {
          include: {
            sourceDocuments: {
              include: {
                pages: {
                  select: {
                    id: true,
                    storageKey: true,
                  },
                },
              },
              orderBy: {
                kind: 'asc',
              },
            },
          },
        },
      },
    });

    if (
      existing &&
      existing.status !== IngestionJobStatus.DRAFT &&
      existing.status !== IngestionJobStatus.FAILED
    ) {
      return null;
    }

    const savedJob = existing
      ? await this.prisma.ingestionJob.update({
          where: {
            id: existing.id,
          },
          data: {
            ...projectedMetadata,
            paperSourceId: paperSource.id,
            status: IngestionJobStatus.DRAFT,
            reviewNotes: input.reviewNotes ?? null,
            errorMessage: null,
            reviewedAt: null,
            processingRequestedAt: null,
            processingStartedAt: null,
            processingFinishedAt: null,
            processingLeaseExpiresAt: null,
            processingWorkerId: null,
            draftJson: toJsonValue(draft),
            metadata: input.metadata,
          },
        })
      : await this.prisma.ingestionJob.create({
          data: {
            ...projectedMetadata,
            paperSourceId: paperSource.id,
            status: IngestionJobStatus.DRAFT,
            reviewNotes: input.reviewNotes ?? null,
            draftJson: toJsonValue(draft),
            metadata: input.metadata,
          },
        });
    const savedPaperSource = await this.prisma.paperSource.findUniqueOrThrow({
      where: {
        id: paperSource.id,
      },
      include: {
        sourceDocuments: {
          include: {
            pages: {
              select: {
                id: true,
                storageKey: true,
              },
            },
          },
          orderBy: {
            kind: 'asc',
          },
        },
      },
    });

    const sourceDocumentsByKind = new Map(
      savedPaperSource.sourceDocuments.map((document) => [
        document.kind,
        document,
      ]),
    );
    const documentKinds = new Set(input.documents.map((entry) => entry.kind));

    for (const entry of input.documents) {
      const existingDocument = sourceDocumentsByKind.get(entry.kind) ?? null;
      const stored = existingDocument
        ? await this.sourceDocumentService.replaceSourceDocument({
            sourceDocument: existingDocument,
            document: entry.document,
            storageClient: input.storageClient,
          })
        : await this.sourceDocumentService.storeSourceDocument({
            paperSourceId: paperSource.id,
            kind: entry.kind,
            document: entry.document,
            storageClient: input.storageClient,
          });

      applyDocumentToDraft(draft, entry.kind, stored.id, stored.storageKey);
    }

    if (!documentKinds.has(SourceDocumentKind.CORRECTION)) {
      const correctionDocument =
        sourceDocumentsByKind.get(SourceDocumentKind.CORRECTION) ?? null;

      if (input.replaceExisting && correctionDocument) {
        await this.sourceDocumentService.deleteSourceDocument({
          sourceDocument: correctionDocument,
          storageClient: input.storageClient,
        });
        clearDocumentFromDraft(draft, SourceDocumentKind.CORRECTION);
      } else if (correctionDocument) {
        applyDocumentToDraft(
          draft,
          SourceDocumentKind.CORRECTION,
          correctionDocument.id,
          correctionDocument.storageKey,
        );
      }
    }

    if (!documentKinds.has(SourceDocumentKind.EXAM)) {
      const examDocument = sourceDocumentsByKind.get(SourceDocumentKind.EXAM);

      if (examDocument) {
        applyDocumentToDraft(
          draft,
          SourceDocumentKind.EXAM,
          examDocument.id,
          examDocument.storageKey,
        );
      }
    }

    await this.prisma.ingestionJob.update({
      where: {
        id: savedJob.id,
      },
      data: {
        ...projectIngestionJobMetadataFromDraft(draft),
        status: IngestionJobStatus.DRAFT,
        errorMessage: null,
        reviewedAt: null,
        processingRequestedAt: null,
        processingStartedAt: null,
        processingFinishedAt: null,
        processingLeaseExpiresAt: null,
        processingWorkerId: null,
        draftJson: toJsonValue(draft),
      },
    });

    return {
      jobId: savedJob.id,
    };
  }

  private resolveDraftStreamCodes(draft: IngestionDraft) {
    const paperStreamCodes = this.readMetadataStringArray(
      draft.exam.metadata,
      'paperStreamCodes',
    );

    if (paperStreamCodes.length > 0) {
      return paperStreamCodes;
    }

    const sharedStreamCodes = this.readMetadataStringArray(
      draft.exam.metadata,
      'sharedStreamCodes',
    );
    const orderedCodes = [
      draft.exam.streamCode?.trim().toUpperCase() ?? null,
      ...sharedStreamCodes,
    ].filter((value): value is string => Boolean(value));

    return Array.from(new Set(orderedCodes));
  }

  private readPaperFamilyCode(draft: IngestionDraft, streamCodes: string[]) {
    const metadataFamilyCode =
      this.readMetadataString(draft.exam.metadata, 'paperFamilyCode') ??
      this.readMetadataString(draft.exam.metadata, 'sharedPaperCode');

    return (
      metadataFamilyCode ?? this.paperSourceService.buildFamilyCode(streamCodes)
    );
  }

  private readMetadataString(value: Record<string, unknown>, field: string) {
    const raw = value[field];

    if (typeof raw !== 'string' || !raw.trim()) {
      return null;
    }

    return raw.trim();
  }

  private readMetadataStringArray(
    value: Record<string, unknown>,
    field: string,
  ) {
    const raw = value[field];

    if (!Array.isArray(raw)) {
      return [];
    }

    return raw
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim().toUpperCase())
      .filter((entry) => entry.length > 0);
  }
}

function applyDocumentToDraft(
  draft: IngestionDraft,
  kind: SourceDocumentKind,
  documentId: string,
  storageKey: string,
) {
  if (kind === SourceDocumentKind.EXAM) {
    draft.exam.examDocumentId = documentId;
    draft.exam.examDocumentStorageKey = storageKey;
    return;
  }

  draft.exam.correctionDocumentId = documentId;
  draft.exam.correctionDocumentStorageKey = storageKey;
}

function clearDocumentFromDraft(
  draft: IngestionDraft,
  kind: SourceDocumentKind,
) {
  if (kind === SourceDocumentKind.EXAM) {
    draft.exam.examDocumentId = null;
    draft.exam.examDocumentStorageKey = null;
    return;
  }

  draft.exam.correctionDocumentId = null;
  draft.exam.correctionDocumentStorageKey = null;
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
