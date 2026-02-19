import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly connectOnStartup: boolean;

  constructor(configService: ConfigService) {
    super({
      datasourceUrl: configService.get<string>('DATABASE_URL'),
    });
    this.connectOnStartup =
      configService.get<string>('PRISMA_CONNECT_ON_STARTUP', 'true') === 'true';
  }

  async onModuleInit(): Promise<void> {
    if (this.connectOnStartup) {
      await this.$connect();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
