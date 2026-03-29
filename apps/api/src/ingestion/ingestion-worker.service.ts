import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { resolvePositiveInteger } from '../runtime/runtime-config';
import { describeError, serializeLogEvent } from '../runtime/logging';
import { IngestionService } from './ingestion.service';

const DEFAULT_QUEUE_POLL_INTERVAL_MS = resolvePositiveInteger({
  value: process.env.INGESTION_QUEUE_POLL_INTERVAL_MS,
  fallback: 5000,
  min: 1000,
});
const DEFAULT_WORKER_HEARTBEAT_INTERVAL_MS = resolvePositiveInteger({
  value: process.env.WORKER_HEARTBEAT_INTERVAL_MS,
  fallback: 10_000,
  min: 1000,
});

@Injectable()
export class IngestionWorkerService implements OnModuleDestroy {
  private readonly logger = new Logger(IngestionWorkerService.name);
  private stopRequested = false;
  private workerId: string | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly ingestionService: IngestionService,
    private readonly prisma: PrismaService,
  ) {}

  async run() {
    const workerId = this.workerId ?? `ingestion-worker-${randomUUID()}`;
    this.workerId = workerId;
    await this.recordHeartbeat(workerId, null);
    this.startHeartbeat(workerId);
    this.logger.log(
      serializeLogEvent('ingestion_worker_started', {
        workerId,
        pollIntervalMs: DEFAULT_QUEUE_POLL_INTERVAL_MS,
      }),
    );

    try {
      while (!this.stopRequested) {
        try {
          const jobId = await this.ingestionService.runNextQueuedJob(workerId);

          if (!jobId) {
            await sleep(DEFAULT_QUEUE_POLL_INTERVAL_MS);
            continue;
          }

          this.logger.log(
            serializeLogEvent('ingestion_job_processed', {
              workerId,
              jobId,
            }),
          );
        } catch (error) {
          this.logger.error(
            serializeLogEvent('ingestion_worker_loop_failed', {
              workerId,
              message: describeError(error),
            }),
          );
          await sleep(DEFAULT_QUEUE_POLL_INTERVAL_MS);
        }
      }
    } finally {
      this.stopHeartbeat();
      await this.recordHeartbeat(workerId, new Date());
      this.logger.log(
        serializeLogEvent('ingestion_worker_stopped', {
          workerId,
        }),
      );
    }
  }

  requestStop() {
    this.stopRequested = true;
  }

  onModuleDestroy() {
    this.requestStop();
  }

  private startHeartbeat(workerId: string) {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      void this.recordHeartbeat(workerId, null);
    }, DEFAULT_WORKER_HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat() {
    if (!this.heartbeatTimer) {
      return;
    }

    clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  private async recordHeartbeat(workerId: string, stoppedAt: Date | null) {
    const heartbeatAt = new Date();
    const workerType = 'ingestion';
    const metadataJson = JSON.stringify({
      pollIntervalMs: DEFAULT_QUEUE_POLL_INTERVAL_MS,
    });

    await this.prisma.$executeRaw`
      INSERT INTO "worker_heartbeats" (
        "worker_id",
        "worker_type",
        "last_heartbeat_at",
        "started_at",
        "stopped_at",
        "metadata",
        "created_at",
        "updated_at"
      )
      VALUES (
        ${workerId},
        ${workerType},
        ${heartbeatAt},
        ${heartbeatAt},
        ${stoppedAt},
        ${metadataJson}::jsonb,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT ("worker_id")
      DO UPDATE SET
        "worker_type" = EXCLUDED."worker_type",
        "last_heartbeat_at" = EXCLUDED."last_heartbeat_at",
        "stopped_at" = EXCLUDED."stopped_at",
        "metadata" = EXCLUDED."metadata",
        "updated_at" = CURRENT_TIMESTAMP
    `;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
