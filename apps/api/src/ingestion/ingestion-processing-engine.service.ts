import { BadRequestException, Injectable } from '@nestjs/common';
import { IngestionJobStatus, Prisma, SourceDocumentKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  extractDraftWithGemini,
  hasGeminiApiKeyConfigured,
  hasGeminiExtraction,
  readDefaultGeminiMaxOutputTokens,
  readDefaultGeminiModel,
  readDefaultGeminiTemperature,
} from './gemini-extractor';
import { projectIngestionJobMetadataFromDraft } from './ingestion-job-metadata';
import { IngestionReadService } from './ingestion-read.service';
import {
  IngestionWorkerRequest,
  withoutIngestionWorkerRequestMetadata,
} from './ingestion-process-request';
import { IngestionStoredPageService } from './ingestion-stored-page.service';
import { readR2ConfigFromEnv, R2StorageClient } from './r2-storage';

const DEFAULT_RASTER_DPI = readPositiveIntegerEnv(
  process.env.INGESTION_RASTER_DPI,
  220,
  72,
);
const DEFAULT_PAGE_CONCURRENCY = readPositiveIntegerEnv(
  process.env.INGESTION_PAGE_CONCURRENCY,
  4,
);

type CompletionStatus = 'DRAFT' | 'IN_REVIEW';

@Injectable()
export class IngestionProcessingEngineService {
  private storageClient: R2StorageClient | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly readService: IngestionReadService,
    private readonly storedPageService: IngestionStoredPageService,
  ) {}

  async runStage(input: {
    jobId: string;
    replaceExisting: boolean;
    skipExtraction: boolean;
    completionStatus: CompletionStatus;
    clearProcessingRequestMetadata?: boolean;
    geminiModel?: string;
    geminiMaxOutputTokens?: number;
    geminiTemperature?: number;
  }) {
    const job = await this.readService.findJobOrThrow(input.jobId);

    if (job.status === IngestionJobStatus.PUBLISHED) {
      throw new BadRequestException(
        'Published ingestion jobs cannot be reprocessed.',
      );
    }

    let draft = this.readService.hydrateDraft(job);
    if (input.replaceExisting) {
      draft.sourcePages = [];
      draft.assets = [];
    }

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

      await this.storedPageService.ensureStoredPagesForDocument({
        sourceDocument: examDocument,
        year: draft.exam.year,
        replaceExisting: input.replaceExisting,
        storageClient: this.getStorageClient(),
        rasterDpi: DEFAULT_RASTER_DPI,
        pageConcurrency: DEFAULT_PAGE_CONCURRENCY,
      });

      await this.storedPageService.ensureStoredPagesForDocument({
        sourceDocument: correctionDocument,
        year: draft.exam.year,
        replaceExisting: input.replaceExisting,
        storageClient: this.getStorageClient(),
        rasterDpi: DEFAULT_RASTER_DPI,
        pageConcurrency: DEFAULT_PAGE_CONCURRENCY,
      });

      const refreshedJob = await this.readService.findJobOrThrow(input.jobId);
      draft = this.readService.hydrateDraft(refreshedJob);

      if (input.replaceExisting) {
        draft.assets = [];
      }

      const shouldRunExtraction =
        !input.skipExtraction &&
        (input.replaceExisting || !hasGeminiExtraction(draft));

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

        if (!correctionDocumentForExtraction) {
          throw new BadRequestException(
            'Add the correction PDF before processing this job.',
          );
        }

        draft = await extractDraftWithGemini({
          draft,
          label: refreshedJob.label,
          model: input.geminiModel ?? readDefaultGeminiModel(),
          maxOutputTokens:
            input.geminiMaxOutputTokens ?? readDefaultGeminiMaxOutputTokens(),
          temperature:
            input.geminiTemperature ?? readDefaultGeminiTemperature(),
          examDocument: {
            fileName: examDocumentForExtraction.fileName,
            buffer: await this.storedPageService.readSourceDocumentBuffer(
              examDocumentForExtraction,
              this.getStorageClient(),
            ),
          },
          correctionDocument: {
            fileName: correctionDocumentForExtraction.fileName,
            buffer: await this.storedPageService.readSourceDocumentBuffer(
              correctionDocumentForExtraction,
              this.getStorageClient(),
            ),
          },
        });
      }

      const savedJob = await this.prisma.ingestionJob.update({
        where: {
          id: input.jobId,
        },
        data: {
          ...projectIngestionJobMetadataFromDraft(draft),
          status: input.completionStatus,
          reviewedAt: null,
          errorMessage: null,
          processingRequestedAt:
            input.completionStatus === IngestionJobStatus.DRAFT
              ? null
              : refreshedJob.processingRequestedAt,
          processingStartedAt:
            input.completionStatus === IngestionJobStatus.DRAFT
              ? null
              : refreshedJob.processingStartedAt,
          processingFinishedAt:
            input.completionStatus === IngestionJobStatus.IN_REVIEW
              ? new Date()
              : null,
          processingLeaseExpiresAt: null,
          processingWorkerId: null,
          draftJson: toJsonValue(draft),
          metadata: toJsonValue(
            input.clearProcessingRequestMetadata
              ? withoutIngestionWorkerRequestMetadata(refreshedJob.metadata)
              : (refreshedJob.metadata ?? {}),
          ),
        },
      });
      const saved = await this.readService.findJobOrThrow(savedJob.id);

      return {
        detail: this.readService.mapJobDetail(
          saved,
          this.readService.hydrateDraft(saved),
        ),
        summary: {
          documents: refreshedJob.sourceDocuments.filter(
            (document) =>
              document.kind === SourceDocumentKind.EXAM ||
              document.kind === SourceDocumentKind.CORRECTION,
          ).length,
          pages: draft.sourcePages.length,
        },
      };
    } catch (error) {
      await this.prisma.ingestionJob.update({
        where: {
          id: input.jobId,
        },
        data: {
          status: IngestionJobStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : String(error),
          processingFinishedAt: new Date(),
          processingLeaseExpiresAt: null,
          processingWorkerId: null,
          metadata: toJsonValue(
            input.clearProcessingRequestMetadata
              ? withoutIngestionWorkerRequestMetadata(job.metadata)
              : (job.metadata ?? {}),
          ),
        },
      });

      throw error;
    }
  }

  buildStageInput(
    jobId: string,
    workerRequest: IngestionWorkerRequest,
    completionStatus: CompletionStatus,
  ) {
    return {
      jobId,
      replaceExisting: workerRequest.replaceExisting,
      skipExtraction: workerRequest.skipExtraction,
      completionStatus,
      clearProcessingRequestMetadata: true,
    };
  }

  private getStorageClient() {
    if (!this.storageClient) {
      this.storageClient = new R2StorageClient(readR2ConfigFromEnv());
    }

    return this.storageClient;
  }
}

function readPositiveIntegerEnv(
  value: string | undefined,
  fallback: number,
  min = 1,
) {
  const parsed = Number.parseInt(value ?? '', 10);

  if (!Number.isInteger(parsed) || parsed < min) {
    return fallback;
  }

  return parsed;
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
