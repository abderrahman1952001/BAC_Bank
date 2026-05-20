import { HttpException, HttpStatus } from '@nestjs/common';
import { StudyCommandUsageGuardService } from './study-command-usage-guard.service';

function createService(input?: {
  env?: Record<string, string | undefined>;
  nextCount?: number;
}) {
  const env = input?.env ?? {};
  const redisService = {
    incrementCounter: jest.fn().mockResolvedValue(input?.nextCount ?? 1),
  };
  const configService = {
    get: jest.fn((key: string) => env[key]),
  };

  return {
    redisService,
    configService,
    service: new StudyCommandUsageGuardService(
      redisService as never,
      configService as never,
    ),
  };
}

describe('StudyCommandUsageGuardService', () => {
  it('uses Redis counters for per-user Study Command actions', async () => {
    const { service, redisService } = createService({
      env: {
        STUDY_COMMAND_RATE_LIMIT_WINDOW_MS: '1500',
        STUDY_COMMAND_PROPOSE_LIMIT_PER_WINDOW: '2',
      },
    });

    await service.consume('user-1', 'propose');

    expect(redisService.incrementCounter).toHaveBeenCalledWith(
      'rate:study-command:propose:user-1',
      1500,
    );
  });

  it('can be disabled explicitly for local diagnostics', async () => {
    const { service, redisService } = createService({
      env: {
        STUDY_COMMAND_RATE_LIMIT_ENABLED: 'false',
      },
      nextCount: 99,
    });

    await service.consume('user-1', 'accept');

    expect(redisService.incrementCounter).not.toHaveBeenCalled();
  });

  it('rejects requests after the configured window limit', async () => {
    const { service } = createService({
      env: {
        STUDY_COMMAND_ACCEPT_LIMIT_PER_WINDOW: '1',
      },
      nextCount: 2,
    });

    await expect(service.consume('user-1', 'accept')).rejects.toBeInstanceOf(
      HttpException,
    );

    try {
      await service.consume('user-1', 'accept');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  });
});
