import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthRateLimitService } from './auth-rate-limit.service';

describe('AuthRateLimitService', () => {
  let configService: Pick<ConfigService, 'get'>;
  let redisService: {
    deleteCounters: jest.Mock;
    incrementCounter: jest.Mock;
    readCounter: jest.Mock;
  };
  let service: AuthRateLimitService;

  beforeEach(() => {
    const values: Record<string, string> = {
      AUTH_RATE_LIMIT_WINDOW_MS: '60000',
      AUTH_LOGIN_RATE_LIMIT_MAX_PER_IP: '3',
      AUTH_LOGIN_RATE_LIMIT_MAX_PER_EMAIL: '2',
      AUTH_REGISTER_RATE_LIMIT_MAX_PER_IP: '2',
      AUTH_REGISTER_RATE_LIMIT_MAX_PER_EMAIL: '2',
    };

    configService = {
      get: jest.fn((name: string) => values[name]),
    };
    redisService = {
      deleteCounters: jest.fn().mockResolvedValue(undefined),
      incrementCounter: jest.fn().mockResolvedValue(1),
      readCounter: jest.fn().mockResolvedValue({
        count: 0,
        ttlMs: 0,
      }),
    };
    service = new AuthRateLimitService(
      configService as ConfigService,
      redisService as never,
    );
  });

  it('blocks login attempts after repeated failures', async () => {
    const scope = {
      action: 'login' as const,
      email: 'student@example.com',
      ip: '127.0.0.1',
    };

    redisService.readCounter.mockImplementation((key: string) =>
      Promise.resolve({
        count: key.includes('email:') ? 2 : 1,
        ttlMs: 45000,
      }),
    );

    await expect(service.assertRequestAllowed(scope)).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    } satisfies Partial<HttpException>);
  });

  it('clears accumulated failures after a successful request', async () => {
    const scope = {
      action: 'register' as const,
      email: 'student@example.com',
      ip: '127.0.0.1',
    };

    await service.recordFailure(scope);
    await service.recordSuccess(scope);

    expect(redisService.incrementCounter).toHaveBeenCalledTimes(2);
    expect(redisService.deleteCounters).toHaveBeenCalledWith([
      'register:ip:127.0.0.1',
      'register:email:student@example.com',
    ]);
  });
});
