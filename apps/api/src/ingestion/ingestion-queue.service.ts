import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { AdminIngestionJobResponse } from '@bac-bank/contracts/ingestion';
import { IngestionJobStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { resolvePositiveInteger } from '../runtime/runtime-config';
import { ProcessIngestionJobDto } from './dto/process-ingestion-job.dto';
import { isPublishedRevisionProvider } from './ingestion.constants';
import {
  buildIngestionProcessRequest,
  IngestionProcessRequest,
  readIngestionProcessRequest,
  withIngestionProcessRequestMetadata,
} from './ingestion-process-request';
import { IngestionProcessingEngineService } from './ingestion-processing-engine.service';
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
  ) {}

  async processJob(
    jobId: string,
    payload: ProcessIngestionJobDto = {},
  ): Promise<AdminIngestionJobResponse> {
    const job = await this.readService.findJobOrThrow(jobId);

    if (job.status === IngestionJobStatus.PUBLISHED) {
      throw new BadRequestException(
        'Published ingestion jobs cannot be reprocessed from admin.',
      );
    }

    if (job.status === IngestionJobStatus.QUEUED) {
      throw new BadRequestException(
        'This ingestion job is already queued for processing.',
      );
    }

    if (job.status === IngestionJobStatus.PROCESSING) {
      throw new BadRequestException(
        'This ingestion job is already being processed by a worker.',
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
        metadata: withIngestionProcessRequestMetadata(job.metadata, processRequest),
      },
    });

    return this.readService.getJob(jobId);
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
        readIngestionProcessRequest(claimedJob.metadata),
      );
      return claimedJob.id;
    } finally {
      stopLeaseRefresh();
    }
  }

  private async processQueuedJob(
    jobId: string,
    processRequest: IngestionProcessRequest,
  ) {
    return this.processingEngine.runStage(
      this.processingEngine.buildStageInput(
        jobId,
        processRequest,
        IngestionJobStatus.IN_REVIEW,
      ),
    );
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
}
