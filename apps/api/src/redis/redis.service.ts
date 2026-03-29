import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import {
  isProductionEnvironment,
  resolveBooleanFlag,
} from '../runtime/runtime-config';
import { describeError, serializeLogEvent } from '../runtime/logging';

type CounterSnapshot = {
  count: number;
  ttlMs: number;
};

type MemoryCounterEntry = {
  count: number;
  expiresAt: number;
};

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly redisUrl: string | null;
  private readonly requireRedis: boolean;
  private readonly memoryCounters = new Map<string, MemoryCounterEntry>();
  private client: ReturnType<typeof createClient> | null = null;
  private ready = false;

  constructor(private readonly configService: ConfigService) {
    this.redisUrl = this.configService.get<string>('REDIS_URL')?.trim() || null;
    this.requireRedis = resolveBooleanFlag({
      value: this.configService.get<string>('REDIS_REQUIRED'),
      fallback: isProductionEnvironment(
        this.configService.get<string>('NODE_ENV'),
      ),
    });
  }

  async onModuleInit() {
    if (!this.redisUrl) {
      return;
    }

    const client = createClient({
      url: this.redisUrl,
      socket: {
        reconnectStrategy: false,
      },
    });

    client.on('error', (error: unknown) => {
      this.logger.warn(
        serializeLogEvent('redis_client_error', {
          message: describeError(error),
        }),
      );
    });

    try {
      await client.connect();
      this.client = client;
      this.ready = true;
      this.logger.log(
        serializeLogEvent('redis_connected', {
          mode: 'redis',
        }),
      );
    } catch (error) {
      this.ready = false;
      this.client = null;
      await client.disconnect().catch(() => undefined);

      if (this.requireRedis) {
        throw error;
      }

      this.logger.warn(
        serializeLogEvent('redis_fallback_to_memory', {
          message: describeError(error),
        }),
      );
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.disconnect().catch(() => undefined);
    }
  }

  isRedisReady() {
    return this.ready && this.client !== null;
  }

  isRedisRequired() {
    return this.requireRedis;
  }

  isRedisConfigured() {
    return this.redisUrl !== null;
  }

  getMode() {
    if (this.client) {
      return 'redis' as const;
    }

    if (!this.redisUrl) {
      return 'disabled' as const;
    }

    return 'memory' as const;
  }

  async ping() {
    if (!this.client) {
      throw new Error('Redis client is not ready.');
    }

    return this.client.ping();
  }

  async readCounter(key: string): Promise<CounterSnapshot> {
    if (this.client) {
      const result = await this.client.multi().get(key).pTTL(key).exec();
      const value = result[0];
      const ttlMs = result[1];

      return {
        count: typeof value === 'string' ? Number.parseInt(value, 10) || 0 : 0,
        ttlMs: typeof ttlMs === 'number' && ttlMs > 0 ? ttlMs : 0,
      };
    }

    const now = Date.now();
    const current = this.memoryCounters.get(key);

    if (!current || current.expiresAt <= now) {
      this.memoryCounters.delete(key);
      return {
        count: 0,
        ttlMs: 0,
      };
    }

    return {
      count: current.count,
      ttlMs: current.expiresAt - now,
    };
  }

  async incrementCounter(key: string, windowMs: number) {
    if (this.client) {
      const count = await this.client.incr(key);

      if (count === 1) {
        await this.client.pExpire(key, windowMs);
      }

      return count;
    }

    const now = Date.now();
    const current = this.memoryCounters.get(key);
    const nextCount =
      current && current.expiresAt > now ? current.count + 1 : 1;

    this.memoryCounters.set(key, {
      count: nextCount,
      expiresAt: now + windowMs,
    });

    return nextCount;
  }

  async deleteCounters(keys: string[]) {
    const uniqueKeys = [...new Set(keys.filter(Boolean))];

    if (uniqueKeys.length === 0) {
      return;
    }

    if (this.client) {
      await this.client.del(uniqueKeys);
      return;
    }

    for (const key of uniqueKeys) {
      this.memoryCounters.delete(key);
    }
  }
}
