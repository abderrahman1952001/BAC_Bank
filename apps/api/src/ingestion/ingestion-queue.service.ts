import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { AdminIngestionJobResponse } from '@bac-bank/contracts/ingestion';
import { IngestionJobStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { resolvePositiveInteger } from '../runtime/runtime-config';
import { ProcessIngestionJobDto } from './dto/process-ingestion-job.dto';
import { isPublishedRevisionProvider } from './ingestion.constants';
import {
  buildIngestionPublishRequest,
  buildIngestionProcessRequest,
  type IngestionWorkerRequest,
  readIngestionWorkerRequest,
  withIngestionWorkerRequestMetadata,
  withoutIngestionWorkerRequestMetadata,
} from './ingestion-process-request';
import { IngestionProcessingEngineService } from './ingestion-processing-engine.service';
import { IngestionPublicationService } from './ingestion-publication.service';
import { IngestionReadService } from './ingestion-read.service';

const DEFAULT_PROCESSING_LEASE_MS = resolvePositiveInteger({
  value: process.env.INGESTION_PROCESSING_LEASE_MS,
  fallback: 30 * 60 * 1000,
  min: 60 * 1000,
});

@Injectable()
export class IngestionQueueService {
  private readonly logger = new Logger(IngestionQueueService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly readService: IngestionReadService,
    private readonly processingEngine: IngestionProcessingEngineService,
    private readonly publicationService: IngestionPublicationService,
  ) {}

  async processJob(
    jobId: string,
    payload: ProcessIngestionJobDto = {},
  ): Promise<AdminIngestionJobResponse> {
    const job = await this.readService.findJobOrThrow(jobId);
    const activeWorkerRequest = readIngestionWorkerRequest(job.metadata);

    if (job.status === IngestionJobStatus.PUBLISHED) {
      throw new BadRequestException(
        'Published ingestion jobs cannot be reprocessed from admin.',
      );
    }

    if (job.status === IngestionJobStatus.QUEUED) {
      throw new BadRequestException(
        activeWorkerRequest.action === 'publish'
          ? 'This ingestion job is already queued for publication.'
          : 'This ingestion job is already queued for processing.',
      );
    }

    if (job.status === IngestionJobStatus.PROCESSING) {
      throw new BadRequestException(
        activeWorkerRequest.action === 'publish'
          ? 'This ingestion job is already being published by a worker.'
          : 'This ingestion job is already being processed by a worker.',
      );
    }

    const draft = this.readService.hydrateDraft(job);
    const processRequest = buildIngestionProcessRequest({
      forceReprocess: this.readBooleanFlag(payload.force_reprocess),
      replaceExisting: this.readBooleanFlag(payload.replace_existing),
      skipExtraction: this.readBooleanFlag(payload.skip_extraction),
      jobStatus: job.status,
      isPublishedRevision: isPublishedRevisionProvider(draft.exam.provider),
    });
    const queuedAt = new Date(processRequest.queuedAt);

    return this.queueWorkerRequest(
      jobId,
      job.metadata,
      processRequest,
      queuedAt,
    );
  }

  async publishJob(jobId: string): Promise<AdminIngestionJobResponse> {
    const job = await this.readService.findJobOrThrow(jobId);
    const activeWorkerRequest = readIngestionWorkerRequest(job.metadata);

    if (job.status === IngestionJobStatus.PUBLISHED) {
      throw new BadRequestException(
        'Published ingestion jobs are frozen. Start a revision from the live library to make further changes.',
      );
    }

    if (job.status === IngestionJobStatus.QUEUED) {
      throw new BadRequestException(
        activeWorkerRequest.action === 'publish'
          ? 'This ingestion job is already queued for publication.'
          : 'This ingestion job is already queued for processing.',
      );
    }

    if (job.status === IngestionJobStatus.PROCESSING) {
      throw new BadRequestException(
        activeWorkerRequest.action === 'publish'
          ? 'This ingestion job is already being published by a worker.'
          : 'This ingestion job is already being processed by a worker.',
      );
    }

    const publishRequest = buildIngestionPublishRequest({
      jobStatus: job.status,
    });
    const queuedAt = new Date(publishRequest.queuedAt);

    return this.queueWorkerRequest(
      jobId,
      job.metadata,
      publishRequest,
      queuedAt,
    );
  }

  async runNextQueuedJob(workerId: string) {
    const claimedJob = await this.claimNextQueuedJob(workerId);

    if (!claimedJob) {
      return null;
    }

    const stopLeaseRefresh = this.startProcessingLeaseHeartbeat(
      claimedJob.id,
      workerId,
    );

    try {
      await this.processQueuedJob(
        claimedJob.id,
        readIngestionWorkerRequest(claimedJob.metadata),
      );
      return claimedJob.id;
    } finally {
      stopLeaseRefresh();
    }
  }

  private async processQueuedJob(
    jobId: string,
    workerRequest: IngestionWorkerRequest,
  ) {
    if (workerRequest.action === 'publish') {
      return this.publishQueuedJob(jobId);
    }

    return this.processingEngine.runStage(
      this.processingEngine.buildStageInput(
        jobId,
        workerRequest,
        IngestionJobStatus.IN_REVIEW,
      ),
    );
  }

  private async publishQueuedJob(jobId: string) {
    try {
      return await this.publicationService.publishQueuedJob(jobId);
    } catch (error) {
      await this.restoreApprovedStatusAfterPublishFailure(jobId, error);
      throw error;
    }
  }

  private async claimNextQueuedJob(workerId: string) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const now = new Date();
      const candidate = await this.prisma.ingestionJob.findFirst({
        where: {
          OR: [
            {
              status: IngestionJobStatus.QUEUED,
            },
            {
              status: IngestionJobStatus.PROCESSING,
              processingLeaseExpiresAt: {
                lt: now,
              },
            },
          ],
        },
        orderBy: [
          {
            processingRequestedAt: 'asc',
          },
          {
            createdAt: 'asc',
          },
        ],
        select: {
          id: true,
          metadata: true,
          processingAttemptCount: true,
          processingLeaseExpiresAt: true,
          status: true,
        },
      });

      if (!candidate) {
        return null;
      }

      const nextLeaseExpiresAt = new Date(
        Date.now() + DEFAULT_PROCESSING_LEASE_MS,
      );
      const claimResult = await this.prisma.ingestionJob.updateMany({
        where: {
          id: candidate.id,
          status: candidate.status,
          ...(candidate.status === IngestionJobStatus.PROCESSING
            ? {
                processingLeaseExpiresAt: candidate.processingLeaseExpiresAt,
              }
            : {}),
        },
        data: {
          status: IngestionJobStatus.PROCESSING,
          errorMessage: null,
          processingStartedAt: new Date(),
          processingLeaseExpiresAt: nextLeaseExpiresAt,
          processingWorkerId: workerId,
          processingAttemptCount: candidate.processingAttemptCount + 1,
        },
      });

      if (claimResult.count === 1) {
        return {
          id: candidate.id,
          metadata: candidate.metadata,
        };
      }
    }

    return null;
  }

  private startProcessingLeaseHeartbeat(jobId: string, workerId: string) {
    const refreshIntervalMs = Math.max(
      30_000,
      Math.floor(DEFAULT_PROCESSING_LEASE_MS / 3),
    );
    const timer = setInterval(() => {
      void this.prisma.ingestionJob
        .updateMany({
          where: {
            id: jobId,
            status: IngestionJobStatus.PROCESSING,
            processingWorkerId: workerId,
          },
          data: {
            processingLeaseExpiresAt: new Date(
              Date.now() + DEFAULT_PROCESSING_LEASE_MS,
            ),
          },
        })
        .catch((error) => {
          this.logger.warn(
            `Failed to refresh ingestion lease for ${jobId}: ${error instanceof Error ? error.message : String(error)}`,
          );
        });
    }, refreshIntervalMs);

    return () => {
      clearInterval(timer);
    };
  }

  private readBooleanFlag(value: unknown) {
    return value === true || value === 'true' || value === 1 || value === '1';
  }

  private async queueWorkerRequest(
    jobId: string,
    metadata: Prisma.JsonValue | null,
    workerRequest: IngestionWorkerRequest,
    queuedAt: Date,
  ) {
    await this.prisma.ingestionJob.update({
      where: {
        id: jobId,
      },
      data: {
        status: IngestionJobStatus.QUEUED,
        errorMessage: null,
        processingRequestedAt: queuedAt,
        processingStartedAt: null,
        processingFinishedAt: null,
        processingLeaseExpiresAt: null,
        processingWorkerId: null,
        metadata: this.toJsonValue(
          withIngestionWorkerRequestMetadata(metadata, workerRequest),
        ),
      },
    });

    return this.readService.getJob(jobId);
  }

  private async restoreApprovedStatusAfterPublishFailure(
    jobId: string,
    error: unknown,
  ) {
    const job = await this.readService.findJobOrThrow(jobId);

    if (job.status === IngestionJobStatus.PUBLISHED) {
      return;
    }

    await this.prisma.ingestionJob.update({
      where: {
        id: jobId,
      },
      data: {
        status: IngestionJobStatus.APPROVED,
        errorMessage: error instanceof Error ? error.message : String(error),
        processingFinishedAt: new Date(),
        processingLeaseExpiresAt: null,
        processingWorkerId: null,
        metadata: this.toJsonValue(
          withoutIngestionWorkerRequestMetadata(job.metadata),
        ),
      },
    });
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
