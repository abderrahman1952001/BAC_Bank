import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import {
  resolveBooleanFlag,
  resolvePositiveInteger,
} from '../runtime/runtime-config';

type StudyCommandUsageAction = 'propose' | 'accept';

type StudyCommandRateLimitConfig = {
  enabled: boolean;
  windowMs: number;
  proposeLimit: number;
  acceptLimit: number;
};

const DEFAULT_STUDY_COMMAND_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_STUDY_COMMAND_PROPOSE_LIMIT = 30;
const DEFAULT_STUDY_COMMAND_ACCEPT_LIMIT = 12;

@Injectable()
export class StudyCommandUsageGuardService {
  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async consume(userId: string, action: StudyCommandUsageAction) {
    const config = this.resolveConfig();

    if (!config.enabled) {
      return;
    }

    const limit =
      action === 'accept' ? config.acceptLimit : config.proposeLimit;
    const count = await this.redisService.incrementCounter(
      this.buildKey(userId, action),
      config.windowMs,
    );

    if (count <= limit) {
      return;
    }

    throw new HttpException(
      {
        message:
          'Study Command is receiving too many requests. Wait a moment and try again.',
        code: 'STUDY_COMMAND_RATE_LIMITED',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private resolveConfig(): StudyCommandRateLimitConfig {
    return {
      enabled: resolveBooleanFlag({
        value: this.configService.get<string>(
          'STUDY_COMMAND_RATE_LIMIT_ENABLED',
        ),
        fallback: true,
      }),
      windowMs: resolvePositiveInteger({
        value: this.configService.get<string>(
          'STUDY_COMMAND_RATE_LIMIT_WINDOW_MS',
        ),
        fallback: DEFAULT_STUDY_COMMAND_RATE_LIMIT_WINDOW_MS,
        min: 1_000,
      }),
      proposeLimit: resolvePositiveInteger({
        value: this.configService.get<string>(
          'STUDY_COMMAND_PROPOSE_LIMIT_PER_WINDOW',
        ),
        fallback: DEFAULT_STUDY_COMMAND_PROPOSE_LIMIT,
        min: 1,
      }),
      acceptLimit: resolvePositiveInteger({
        value: this.configService.get<string>(
          'STUDY_COMMAND_ACCEPT_LIMIT_PER_WINDOW',
        ),
        fallback: DEFAULT_STUDY_COMMAND_ACCEPT_LIMIT,
        min: 1,
      }),
    };
  }

  private buildKey(userId: string, action: StudyCommandUsageAction) {
    return `rate:study-command:${action}:${userId}`;
  }
}
