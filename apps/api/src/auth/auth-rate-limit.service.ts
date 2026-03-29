import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';

type AuthRateLimitAction = 'login' | 'register';

type AuthRateLimitScope = {
  action: AuthRateLimitAction;
  email?: string | null;
  ip?: string | null;
};

type AuthRateLimitPolicy = {
  maxPerEmail: number;
  maxPerIp: number;
  windowMs: number;
};

type AuthRateLimitKey = {
  key: string;
  maxAttempts: number;
};

@Injectable()
export class AuthRateLimitService {
  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async assertRequestAllowed(scope: AuthRateLimitScope) {
    const policy = this.getPolicy(scope.action);
    let retryAfterMs = 0;

    for (const key of this.getKeys(scope, policy)) {
      const snapshot = await this.redisService.readCounter(key.key);

      if (snapshot.count < key.maxAttempts) {
        continue;
      }

      retryAfterMs = Math.max(retryAfterMs, snapshot.ttlMs);
    }

    if (retryAfterMs > 0) {
      const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
      throw new HttpException(
        `Too many ${scope.action} attempts. Try again in ${retryAfterSeconds} seconds.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async recordFailure(scope: AuthRateLimitScope) {
    const policy = this.getPolicy(scope.action);

    for (const key of this.getKeys(scope, policy)) {
      await this.redisService.incrementCounter(key.key, policy.windowMs);
    }
  }

  async recordSuccess(scope: AuthRateLimitScope) {
    const policy = this.getPolicy(scope.action);

    await this.redisService.deleteCounters(
      this.getKeys(scope, policy).map((key) => key.key),
    );
  }

  private getKeys(
    scope: AuthRateLimitScope,
    policy: AuthRateLimitPolicy,
  ): AuthRateLimitKey[] {
    const keys: AuthRateLimitKey[] = [];
    const normalizedIp = this.normalizeIp(scope.ip);
    const normalizedEmail = this.normalizeEmail(scope.email);

    if (policy.maxPerIp > 0) {
      keys.push({
        key: `${scope.action}:ip:${normalizedIp}`,
        maxAttempts: policy.maxPerIp,
      });
    }

    if (normalizedEmail && policy.maxPerEmail > 0) {
      keys.push({
        key: `${scope.action}:email:${normalizedEmail}`,
        maxAttempts: policy.maxPerEmail,
      });
    }

    return keys;
  }

  private getPolicy(action: AuthRateLimitAction): AuthRateLimitPolicy {
    const windowMs = this.readPositiveInteger(
      'AUTH_RATE_LIMIT_WINDOW_MS',
      15 * 60 * 1000,
    );

    if (action === 'register') {
      return {
        windowMs,
        maxPerIp: this.readPositiveInteger(
          'AUTH_REGISTER_RATE_LIMIT_MAX_PER_IP',
          10,
        ),
        maxPerEmail: this.readPositiveInteger(
          'AUTH_REGISTER_RATE_LIMIT_MAX_PER_EMAIL',
          4,
        ),
      };
    }

    return {
      windowMs,
      maxPerIp: this.readPositiveInteger(
        'AUTH_LOGIN_RATE_LIMIT_MAX_PER_IP',
        20,
      ),
      maxPerEmail: this.readPositiveInteger(
        'AUTH_LOGIN_RATE_LIMIT_MAX_PER_EMAIL',
        8,
      ),
    };
  }

  private readPositiveInteger(name: string, fallback: number) {
    const rawValue = this.configService.get<string>(name);
    const parsedValue = rawValue ? Number.parseInt(rawValue, 10) : fallback;

    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
      return fallback;
    }

    return parsedValue;
  }

  private normalizeEmail(email?: string | null) {
    if (!email) {
      return null;
    }

    const trimmed = email.trim().toLowerCase();
    return trimmed.length ? trimmed : null;
  }

  private normalizeIp(ip?: string | null) {
    if (!ip) {
      return 'unknown';
    }

    const trimmed = ip.trim();
    return trimmed.length ? trimmed : 'unknown';
  }
}
