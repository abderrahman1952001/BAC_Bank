import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { resolveBooleanFlag } from '../runtime/runtime-config';

const execFileAsync = promisify(execFile);

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

    const existingStreamFamilyCount = await this.prisma.streamFamily.count();

    if (existingStreamFamilyCount > 0) {
      return;
    }

    this.logger.log(
      'No stream catalog rows were found. Bootstrapping the BAC catalog.',
    );

    try {
      const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      const { stdout, stderr } = await execFileAsync(
        npmExecutable,
        ['run', 'prisma:seed', '-w', '@bac-bank/api'],
        {
          cwd: process.cwd(),
          env: process.env,
          maxBuffer: 10 * 1024 * 1024,
        },
      );

      if (stdout.trim()) {
        this.logger.log(stdout.trim());
      }

      if (stderr.trim()) {
        this.logger.warn(stderr.trim());
      }
    } catch (error) {
      this.logger.error(
        'The BAC catalog bootstrap failed.',
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
