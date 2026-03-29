import { HealthService } from './health.service';

describe('HealthService', () => {
  it('reports healthy readiness when dependencies are up', async () => {
    const prisma = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([{ '?column?': 1 }])
        .mockResolvedValueOnce([
          {
            workerId: 'worker-1',
            startedAt: new Date('2026-03-28T12:00:00.000Z'),
            lastHeartbeatAt: new Date('2026-03-28T12:00:20.000Z'),
          },
        ])
        .mockResolvedValueOnce([
          {
            workerId: 'worker-1',
            startedAt: new Date('2026-03-28T12:00:00.000Z'),
            stoppedAt: null,
            lastHeartbeatAt: new Date('2026-03-28T12:00:20.000Z'),
          },
        ]),
      ingestionJob: {
        count: jest
          .fn()
          .mockResolvedValueOnce(1)
          .mockResolvedValueOnce(1)
          .mockResolvedValueOnce(0)
          .mockResolvedValueOnce(0),
        findFirst: jest.fn().mockResolvedValue({
          processingRequestedAt: new Date('2026-03-28T12:00:00.000Z'),
          createdAt: new Date('2026-03-28T11:59:00.000Z'),
        }),
      },
    };
    const redisService = {
      getMode: jest.fn(() => 'redis'),
      isRedisRequired: jest.fn(() => true),
      isRedisConfigured: jest.fn(() => true),
      ping: jest.fn().mockResolvedValue('PONG'),
    };
    const configService = {
      get: jest.fn(() => undefined),
    };

    const service = new HealthService(
      prisma as never,
      redisService as never,
      configService as never,
    );

    await expect(service.getReadiness()).resolves.toMatchObject({
      status: 'ok',
      checks: {
        database: {
          status: 'ok',
        },
        redis: {
          status: 'ok',
        },
        worker: {
          status: 'ok',
          activeWorkers: 1,
        },
        queue: {
          status: 'ok',
          queuedCount: 1,
          processingCount: 1,
        },
      },
    });
  });

  it('reports an error when the worker heartbeat is stale', async () => {
    const prisma = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([{ '?column?': 1 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            workerId: 'worker-1',
            startedAt: new Date('2026-03-28T12:00:00.000Z'),
            stoppedAt: null,
            lastHeartbeatAt: new Date('2026-03-28T12:00:00.000Z'),
          },
        ]),
      ingestionJob: {
        count: jest
          .fn()
          .mockResolvedValueOnce(0)
          .mockResolvedValueOnce(0)
          .mockResolvedValueOnce(0)
          .mockResolvedValueOnce(0),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const redisService = {
      getMode: jest.fn(() => 'redis'),
      isRedisRequired: jest.fn(() => true),
      isRedisConfigured: jest.fn(() => true),
      ping: jest.fn().mockResolvedValue('PONG'),
    };
    const configService = {
      get: jest.fn((name: string) =>
        name === 'HEALTH_WORKER_STALE_MS' ? '1000' : undefined,
      ),
    };

    const service = new HealthService(
      prisma as never,
      redisService as never,
      configService as never,
    );

    await expect(service.getReadiness()).resolves.toMatchObject({
      status: 'error',
      checks: {
        worker: {
          status: 'error',
        },
      },
    });
  });

  it('allows readiness without a worker when worker health is optional', async () => {
    const prisma = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([{ '?column?': 1 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]),
      ingestionJob: {
        count: jest
          .fn()
          .mockResolvedValueOnce(0)
          .mockResolvedValueOnce(0)
          .mockResolvedValueOnce(0)
          .mockResolvedValueOnce(0),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const redisService = {
      getMode: jest.fn(() => 'redis'),
      isRedisRequired: jest.fn(() => true),
      isRedisConfigured: jest.fn(() => true),
      ping: jest.fn().mockResolvedValue('PONG'),
    };
    const configService = {
      get: jest.fn((name: string) =>
        name === 'HEALTH_REQUIRE_WORKER' ? 'false' : undefined,
      ),
    };

    const service = new HealthService(
      prisma as never,
      redisService as never,
      configService as never,
    );

    await expect(service.getReadiness()).resolves.toMatchObject({
      status: 'ok',
      checks: {
        worker: {
          status: 'degraded',
          required: false,
          activeWorkers: 0,
        },
      },
    });
  });
});
