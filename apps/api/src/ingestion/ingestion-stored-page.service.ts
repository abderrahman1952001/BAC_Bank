import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { execFile } from 'child_process';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service';
import { mapWithConcurrency } from './intake-runtime';
import { readPageNumberFromRasterFile } from './ingestion-raster-pages';
import { R2StorageClient } from './r2-storage';
import { buildCanonicalPageStorageKey } from './storage-naming';

const execFileAsync = promisify(execFile);

export type StoredSourceDocumentPageRecord = {
  id: string;
  pageNumber: number;
  storageKey: string;
  width: number;
  height: number;
  metadata: Prisma.JsonValue | null;
};

export type StoredSourceDocumentRecord = {
  id: string;
  fileName: string;
  storageKey: string;
  pageCount: number | null;
  metadata: Prisma.JsonValue | null;
  pages: StoredSourceDocumentPageRecord[];
};

@Injectable()
export class IngestionStoredPageService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureStoredPagesForDocument(input: {
    sourceDocument: StoredSourceDocumentRecord;
    year: number;
    replaceExisting: boolean;
    storageClient: R2StorageClient;
    rasterDpi: number;
    pageConcurrency: number;
  }) {
    if (
      !input.replaceExisting &&
      input.sourceDocument.pageCount !== null &&
      input.sourceDocument.pages.length === input.sourceDocument.pageCount
    ) {
      return {
        pageCount: input.sourceDocument.pageCount,
      };
    }

    const pdfBuffer = await this.readSourceDocumentBuffer(
      input.sourceDocument,
      input.storageClient,
    );
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bac-ingestion-'));
    const pdfPath = path.join(tempDir, input.sourceDocument.fileName);

    try {
      await fs.writeFile(pdfPath, pdfBuffer);
      const rasterizedPages = await this.rasterizePdf(
        pdfPath,
        tempDir,
        input.rasterDpi,
      );
      const existingPageMap = new Map(
        input.sourceDocument.pages.map((page) => [page.pageNumber, page]),
      );

      if (input.replaceExisting) {
        const nextPageNumbers = new Set(
          rasterizedPages.map((page) => page.pageNumber),
        );
        const stalePageIds = input.sourceDocument.pages
          .filter((page) => !nextPageNumbers.has(page.pageNumber))
          .map((page) => page.id);

        if (stalePageIds.length > 0) {
          await this.prisma.sourcePage.deleteMany({
            where: {
              id: {
                in: stalePageIds,
              },
            },
          });
        }
      }

      await this.prisma.sourceDocument.update({
        where: {
          id: input.sourceDocument.id,
        },
        data: {
          pageCount: rasterizedPages.length,
          metadata: toJsonValue({
            ...(asJsonRecord(input.sourceDocument.metadata) ?? {}),
            rasterDpi: input.rasterDpi,
            processedAt: new Date().toISOString(),
          }),
        },
      });

      await mapWithConcurrency(
        rasterizedPages,
        input.pageConcurrency,
        async (page) => {
          const storageKey = buildCanonicalPageStorageKey(
            {
              year: input.year,
            },
            input.sourceDocument.fileName,
            page.pageNumber,
          );
          const existingPage = existingPageMap.get(page.pageNumber) ?? null;
          const pageBuffer = await fs.readFile(page.filePath);
          const sha256 = createHash('sha256').update(pageBuffer).digest('hex');

          if (
            !existingPage ||
            input.replaceExisting ||
            existingPage.storageKey !== storageKey
          ) {
            await input.storageClient.putObject({
              key: storageKey,
              body: pageBuffer,
              contentType: 'image/png',
            });
          }

          const metadata = asJsonRecord(existingPage?.metadata ?? null);

          if (existingPage) {
            await this.prisma.sourcePage.update({
              where: {
                id: existingPage.id,
              },
              data: {
                storageKey,
                width: page.width,
                height: page.height,
                sha256,
                metadata: toJsonValue({
                  ...(metadata ?? {}),
                  rasterDpi: input.rasterDpi,
                }),
              },
            });
            return;
          }

          await this.prisma.sourcePage.create({
            data: {
              documentId: input.sourceDocument.id,
              pageNumber: page.pageNumber,
              storageKey,
              width: page.width,
              height: page.height,
              sha256,
              metadata: toJsonValue({
                rasterDpi: input.rasterDpi,
              }),
            },
          });
        },
      );

      return {
        pageCount: rasterizedPages.length,
      };
    } finally {
      await fs.rm(tempDir, {
        recursive: true,
        force: true,
      });
    }
  }

  async readSourceDocumentBuffer(
    sourceDocument: Pick<StoredSourceDocumentRecord, 'storageKey'>,
    storageClient: R2StorageClient,
  ) {
    return storageClient.getObjectBuffer(sourceDocument.storageKey);
  }

  private async rasterizePdf(
    pdfPath: string,
    outputDir: string,
    rasterDpi: number,
  ) {
    const prefix = path.join(outputDir, 'page');

    await execFileAsync('pdftoppm', [
      '-r',
      `${rasterDpi}`,
      '-png',
      pdfPath,
      prefix,
    ]);

    const files = (await fs.readdir(outputDir))
      .filter((fileName) => /^page-\d+\.png$/.test(fileName))
      .sort(
        (left, right) =>
          readPageNumberFromRasterFile(left) -
          readPageNumberFromRasterFile(right),
      );

    const pages: Array<{
      filePath: string;
      pageNumber: number;
      width: number;
      height: number;
    }> = [];

    for (const fileName of files) {
      const filePath = path.join(outputDir, fileName);
      const metadata = await sharp(filePath).metadata();

      pages.push({
        filePath,
        pageNumber: readPageNumberFromRasterFile(fileName),
        width: metadata.width ?? 0,
        height: metadata.height ?? 0,
      });
    }

    return pages;
  }
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function asJsonRecord(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}
