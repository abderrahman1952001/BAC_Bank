import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { resolveBooleanFlag } from '../runtime/runtime-config';

@Injectable()
export class CatalogBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CatalogBootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    const shouldBootstrapCatalog = resolveBooleanFlag({
      value: process.env.CATALOG_BOOTSTRAP_ON_STARTUP,
      fallback: true,
    });

    if (!shouldBootstrapCatalog) {
      return;
    }

    const existingStreamCount = await this.prisma.stream.count();

    if (existingStreamCount > 0) {
      return;
    }

    this.logger.log(
      'No stream rows were found. Bootstrapping the BAC catalog.',
    );

    try {
      process.env.BAC_BANK_IMPORT_CATALOG_SEED = '1';
      require('ts-node/register/transpile-only');

      const seedModulePath = this.resolveSeedModulePath();
      const seedModule = require(seedModulePath) as {
        runCatalogSeed: () => Promise<void>;
      };

      await seedModule.runCatalogSeed();
    } catch (error) {
      this.logger.error(
        'The BAC catalog bootstrap failed.',
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    } finally {
      delete process.env.BAC_BANK_IMPORT_CATALOG_SEED;
    }
  }

  private resolveSeedModulePath() {
    const candidates = [
      resolve(process.cwd(), 'apps/api/prisma/seed.ts'),
      resolve(process.cwd(), 'prisma/seed.ts'),
    ];

    const match = candidates.find((candidate) => existsSync(candidate));

    if (!match) {
      throw new Error('Could not resolve the Prisma seed module path.');
    }

    return match;
  }
}
