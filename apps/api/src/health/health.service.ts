import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IngestionJobStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { resolvePositiveInteger } from '../runtime/runtime-config';
import { resolveBooleanFlag } from '../runtime/runtime-config';
import { describeError } from '../runtime/logging';

type DependencyStatus = 'ok' | 'degraded' | 'error';
type WorkerHeartbeatRecord = {
  workerId: string;
  startedAt: Date;
  lastHeartbeatAt: Date;
  stoppedAt?: Date | null;
};

type HealthPayload = {
  status: DependencyStatus;
  service: 'bac-bank-api';
  timestamp: string;
};

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  getLiveness(): HealthPayload {
    return {
      status: 'ok',
      service: 'bac-bank-api',
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness() {
    const timestamp = new Date().toISOString();
    const database = await this.checkDatabase();
    const redis = await this.checkRedis();
    const workerRequired = this.isWorkerRequired();

    if (database.status !== 'ok') {
      return {
        status: 'error' as const,
        service: 'bac-bank-api' as const,
        timestamp,
        checks: {
          database,
          redis,
          worker: {
            status: 'error' as const,
            required: workerRequired,
            activeWorkers: 0,
            staleThresholdMs: this.getWorkerStaleThresholdMs(),
            message:
              'Worker health is unavailable because the database is down.',
          },
          queue: {
            status: 'error' as const,
            queuedCount: null,
            processingCount: null,
            failedCount: null,
            staleProcessingCount: null,
            oldestQueuedAt: null,
            message:
              'Queue metrics are unavailable because the database is down.',
          },
        },
      };
    }

    const [worker, queue] = await Promise.all([
      this.checkWorker(),
      this.checkQueue(),
    ]);

    const overallStatus =
      redis.status === 'error' || (worker.required && worker.status === 'error')
        ? 'error'
        : [
              database.status,
              redis.status,
              queue.status,
              ...(worker.required ? [worker.status] : []),
            ].includes('degraded')
          ? 'degraded'
          : 'ok';

    return {
      status: overallStatus,
      service: 'bac-bank-api' as const,
      timestamp,
      checks: {
        database,
        redis,
        worker,
        queue,
      },
    };
  }

  private async checkDatabase() {
    const startedAt = Date.now();

    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok' as const,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        status: 'error' as const,
        latencyMs: Date.now() - startedAt,
        message: describeError(error),
      };
    }
  }

  private async checkRedis() {
    const startedAt = Date.now();
    const mode = this.redisService.getMode();
    const required = this.redisService.isRedisRequired();
    const configured = this.redisService.isRedisConfigured();

    if (mode === 'disabled') {
      return {
        status: required ? ('error' as const) : ('degraded' as const),
        mode,
        required,
        configured,
        latencyMs: 0,
        message: required
          ? 'Redis is required but REDIS_URL is not configured.'
          : 'Redis is disabled; rate limits use local in-memory counters.',
      };
    }

    if (mode === 'memory') {
      return {
        status: required ? ('error' as const) : ('degraded' as const),
        mode,
        required,
        configured,
        latencyMs: Date.now() - startedAt,
        message: required
          ? 'Redis is required but the client is not ready.'
          : 'Redis is unavailable; rate limits are using in-memory counters.',
      };
    }

    try {
      await this.redisService.ping();

      return {
        status: 'ok' as const,
        mode,
        required,
        configured,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        status: required ? ('error' as const) : ('degraded' as const),
        mode,
        required,
        configured,
        latencyMs: Date.now() - startedAt,
        message: describeError(error),
      };
    }
  }

  private async checkWorker() {
    const required = this.isWorkerRequired();
    const staleThresholdMs = this.getWorkerStaleThresholdMs();
    const staleBoundary = new Date(Date.now() - staleThresholdMs);
    const workerType = 'ingestion';
    const [activeWorkers, latestWorker] = await Promise.all([
      this.prisma.$queryRaw<WorkerHeartbeatRecord[]>`
        SELECT
          "worker_id" AS "workerId",
          "started_at" AS "startedAt",
          "last_heartbeat_at" AS "lastHeartbeatAt"
        FROM "worker_heartbeats"
        WHERE
          "worker_type" = ${workerType}
          AND "stopped_at" IS NULL
          AND "last_heartbeat_at" >= ${staleBoundary}
        ORDER BY "last_heartbeat_at" DESC
      `,
      this.prisma.$queryRaw<WorkerHeartbeatRecord[]>`
          SELECT
            "worker_id" AS "workerId",
            "started_at" AS "startedAt",
            "stopped_at" AS "stoppedAt",
            "last_heartbeat_at" AS "lastHeartbeatAt"
          FROM "worker_heartbeats"
          WHERE "worker_type" = ${workerType}
          ORDER BY "last_heartbeat_at" DESC
          LIMIT 1
        `.then((records) => records[0] ?? null),
    ]);

    if (activeWorkers.length > 0) {
      return {
        status: 'ok' as const,
        required,
        activeWorkers: activeWorkers.length,
        staleThresholdMs,
        latestHeartbeatAt: activeWorkers[0]?.lastHeartbeatAt.toISOString(),
        workers: activeWorkers.map((worker) => ({
          workerId: worker.workerId,
          startedAt: worker.startedAt.toISOString(),
          lastHeartbeatAt: worker.lastHeartbeatAt.toISOString(),
        })),
      };
    }

    return {
      status: required ? ('error' as const) : ('degraded' as const),
      required,
      activeWorkers: 0,
      staleThresholdMs,
      latestHeartbeatAt: latestWorker?.lastHeartbeatAt.toISOString() ?? null,
      message: latestWorker
        ? `No ingestion worker heartbeat has been seen within ${staleThresholdMs}ms.`
        : 'No ingestion worker heartbeat has been recorded yet.',
    };
  }

  private async checkQueue() {
    const now = new Date();
    const [
      queuedCount,
      processingCount,
      failedCount,
      staleProcessingCount,
      oldestQueuedJob,
    ] = await Promise.all([
      this.prisma.ingestionJob.count({
        where: {
          status: IngestionJobStatus.QUEUED,
        },
      }),
      this.prisma.ingestionJob.count({
        where: {
          status: IngestionJobStatus.PROCESSING,
        },
      }),
      this.prisma.ingestionJob.count({
        where: {
          status: IngestionJobStatus.FAILED,
        },
      }),
      this.prisma.ingestionJob.count({
        where: {
          status: IngestionJobStatus.PROCESSING,
          processingLeaseExpiresAt: {
            lt: now,
          },
        },
      }),
      this.prisma.ingestionJob.findFirst({
        where: {
          status: IngestionJobStatus.QUEUED,
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
          processingRequestedAt: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      status:
        staleProcessingCount > 0 ? ('degraded' as const) : ('ok' as const),
      queuedCount,
      processingCount,
      failedCount,
      staleProcessingCount,
      oldestQueuedAt:
        (
          oldestQueuedJob?.processingRequestedAt ?? oldestQueuedJob?.createdAt
        )?.toISOString() ?? null,
    };
  }

  private getWorkerStaleThresholdMs() {
    return resolvePositiveInteger({
      value: this.configService.get<string>('HEALTH_WORKER_STALE_MS'),
      fallback: 45_000,
      min: 5_000,
    });
  }

  private isWorkerRequired() {
    return resolveBooleanFlag({
      value: this.configService.get<string>('HEALTH_REQUIRE_WORKER'),
      fallback: true,
    });
  }
}
