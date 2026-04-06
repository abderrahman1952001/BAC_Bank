import type { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { IngestionOpsService } from '../src/ingestion/ingestion-ops.service';
import { IngestionService } from '../src/ingestion/ingestion.service';
import { PrismaService } from '../src/prisma/prisma.service';

export type IngestionScriptContext = {
  app: INestApplicationContext;
  prisma: PrismaService;
  ingestionOpsService: IngestionOpsService;
  ingestionService: IngestionService;
};

export async function createIngestionScriptContext(): Promise<IngestionScriptContext> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  return {
    app,
    prisma: app.get(PrismaService, { strict: false }),
    ingestionOpsService: app.get(IngestionOpsService, { strict: false }),
    ingestionService: app.get(IngestionService, { strict: false }),
  };
}
