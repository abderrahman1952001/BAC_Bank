import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma, SourceDocumentKind } from '@prisma/client';
import { execFile } from 'child_process';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import { PrismaService } from '../prisma/prisma.service';
import { R2StorageClient } from './r2-storage';
import { deleteStorageKeysBestEffort } from './storage-cleanup';
import {
  CanonicalStorageContext,
  buildCanonicalDocumentFileName,
  buildCanonicalDocumentStorageKey,
} from './storage-naming';

const execFileAsync = promisify(execFile);

export type IntakeUploadDocumentInput = {
  buffer: Buffer;
  mimeType: string;
  originalFileName: string;
};

export type IntakeSourceDocumentInput = {
  buffer: Buffer;
  fileName: string;
  storageKey: string;
  sourceUrl: string | null;
  metadata: Prisma.InputJsonValue;
  storageMetadata?: Record<string, string>;
  mimeType?: string;
  language?: string | null;
};

export type StoredSourceDocumentWithPages = {
  id: string;
  kind: SourceDocumentKind;
  storageKey: string;
  pages: Array<{
    id: string;
    storageKey: string;
  }>;
};

@Injectable()
export class IngestionSourceDocumentService {
  private readonly logger = new Logger(IngestionSourceDocumentService.name);

  constructor(private readonly prisma: PrismaService) {}

  assertPdfUpload(upload: IntakeUploadDocumentInput, fieldName: string) {
    if (!upload.buffer.length) {
      throw new BadRequestException(`${fieldName} must not be empty.`);
    }

    const looksLikePdf =
      upload.mimeType === 'application/pdf' ||
      upload.originalFileName.toLowerCase().endsWith('.pdf') ||
      upload.buffer.subarray(0, 4).toString('utf8') === '%PDF';

    if (!looksLikePdf) {
      throw new BadRequestException(`${fieldName} must be a PDF.`);
    }
  }

  async storeManualSourceDocument(input: {
    paperSourceId: string;
    kind: SourceDocumentKind;
    upload: IntakeUploadDocumentInput;
    context: CanonicalStorageContext;
    sourceReference: string | null;
    storageClient: R2StorageClient;
    now?: Date;
  }) {
    const fileName = buildCanonicalDocumentFileName(input.context, input.kind);
    const storageKey = buildCanonicalDocumentStorageKey(
      input.context,
      fileName,
    );

    return this.storeSourceDocument({
      paperSourceId: input.paperSourceId,
      kind: input.kind,
      document: {
        buffer: input.upload.buffer,
        fileName,
        storageKey,
        sourceUrl: null,
        mimeType: 'application/pdf',
        language: 'ar',
        metadata: toJsonValue(
          this.buildManualSourceDocumentMetadata({
            upload: input.upload,
            sourceReference: input.sourceReference,
            now: input.now,
          }),
        ),
        storageMetadata: {
          intakeMethod: 'manual-upload',
        },
      },
      storageClient: input.storageClient,
    });
  }

  async replaceManualSourceDocument(input: {
    sourceDocument: StoredSourceDocumentWithPages;
    upload: IntakeUploadDocumentInput;
    context: CanonicalStorageContext;
    sourceReference: string | null;
    storageClient: R2StorageClient;
    now?: Date;
  }) {
    const fileName = buildCanonicalDocumentFileName(
      input.context,
      input.sourceDocument.kind,
    );
    const storageKey = buildCanonicalDocumentStorageKey(
      input.context,
      fileName,
    );
    return this.replaceSourceDocument({
      sourceDocument: input.sourceDocument,
      document: {
        buffer: input.upload.buffer,
        fileName,
        storageKey,
        sourceUrl: null,
        mimeType: 'application/pdf',
        language: 'ar',
        metadata: toJsonValue(
          this.buildManualSourceDocumentMetadata({
            upload: input.upload,
            sourceReference: input.sourceReference,
            now: input.now,
            replaced: true,
          }),
        ),
        storageMetadata: {
          intakeMethod: 'manual-upload',
        },
      },
      storageClient: input.storageClient,
    });
  }

  async storeSourceDocument(input: {
    paperSourceId: string;
    kind: SourceDocumentKind;
    document: IntakeSourceDocumentInput;
    storageClient: R2StorageClient;
  }) {
    const pageCount = await this.readPdfPageCount(input.document.buffer);
    const sha256 = createHash('sha256')
      .update(input.document.buffer)
      .digest('hex');

    await input.storageClient.putObject({
      key: input.document.storageKey,
      body: input.document.buffer,
      contentType: input.document.mimeType ?? 'application/pdf',
      metadata: input.document.storageMetadata,
    });

    return this.prisma.sourceDocument.create({
      data: {
        paperSourceId: input.paperSourceId,
        kind: input.kind,
        storageKey: input.document.storageKey,
        fileName: input.document.fileName,
        mimeType: input.document.mimeType ?? 'application/pdf',
        pageCount,
        sha256,
        sourceUrl: input.document.sourceUrl,
        language: input.document.language ?? 'ar',
        metadata: input.document.metadata,
      },
      select: {
        id: true,
        storageKey: true,
      },
    });
  }

  async replaceSourceDocument(input: {
    sourceDocument: StoredSourceDocumentWithPages;
    document: IntakeSourceDocumentInput;
    storageClient: R2StorageClient;
  }) {
    const pageCount = await this.readPdfPageCount(input.document.buffer);
    const sha256 = createHash('sha256')
      .update(input.document.buffer)
      .digest('hex');

    await input.storageClient.putObject({
      key: input.document.storageKey,
      body: input.document.buffer,
      contentType: input.document.mimeType ?? 'application/pdf',
      metadata: input.document.storageMetadata,
    });

    const obsoleteStorageKeys = input.sourceDocument.pages.map(
      (page) => page.storageKey,
    );

    if (input.sourceDocument.storageKey !== input.document.storageKey) {
      obsoleteStorageKeys.push(input.sourceDocument.storageKey);
    }

    if (input.sourceDocument.pages.length > 0) {
      await this.prisma.sourcePage.deleteMany({
        where: {
          documentId: input.sourceDocument.id,
        },
      });
    }

    const updated = await this.prisma.sourceDocument.update({
      where: {
        id: input.sourceDocument.id,
      },
      data: {
        storageKey: input.document.storageKey,
        fileName: input.document.fileName,
        mimeType: input.document.mimeType ?? 'application/pdf',
        pageCount,
        sha256,
        sourceUrl: input.document.sourceUrl,
        language: input.document.language ?? 'ar',
        metadata: input.document.metadata,
      },
      select: {
        id: true,
        storageKey: true,
      },
    });

    const { failedKeys } = await deleteStorageKeysBestEffort(
      input.storageClient,
      obsoleteStorageKeys,
    );

    if (failedKeys.length > 0) {
      this.logger.warn(
        `Failed to clean ${failedKeys.length} obsolete source document object(s) for ${input.sourceDocument.id}: ${failedKeys.join(', ')}`,
      );
    }

    return updated;
  }

  async deleteSourceDocument(input: {
    sourceDocument: Pick<
      StoredSourceDocumentWithPages,
      'id' | 'storageKey' | 'pages'
    >;
    storageClient: R2StorageClient;
  }) {
    await this.prisma.sourceDocument.delete({
      where: {
        id: input.sourceDocument.id,
      },
    });

    const { failedKeys } = await deleteStorageKeysBestEffort(
      input.storageClient,
      [
        input.sourceDocument.storageKey,
        ...input.sourceDocument.pages.map((page) => page.storageKey),
      ],
    );

    if (failedKeys.length > 0) {
      this.logger.warn(
        `Failed to clean ${failedKeys.length} deleted source document object(s) for ${input.sourceDocument.id}: ${failedKeys.join(', ')}`,
      );
    }
  }

  private buildManualSourceDocumentMetadata(input: {
    upload: IntakeUploadDocumentInput;
    sourceReference: string | null;
    now?: Date;
    replaced?: boolean;
  }) {
    const uploadedAt = input.now?.toISOString() ?? new Date().toISOString();
    const replacedAt = input.replaced
      ? (input.now?.toISOString() ?? new Date().toISOString())
      : null;

    return {
      intakeMethod: 'manual_upload',
      uploadedFileName: input.upload.originalFileName,
      uploadedMimeType: input.upload.mimeType,
      uploadedAt,
      sourceReference: input.sourceReference,
      ...(replacedAt ? { replacedAt } : {}),
    };
  }

  private async readPdfPageCount(buffer: Buffer) {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bac-upload-'));
    const pdfPath = path.join(tempDir, 'upload.pdf');

    try {
      await fs.writeFile(pdfPath, buffer);
      const { stdout } = await execFileAsync('pdfinfo', [pdfPath]);
      const match = stdout.match(/^Pages:\s+(\d+)/m);

      if (!match) {
        return null;
      }

      const count = Number.parseInt(match[1], 10);
      return Number.isInteger(count) && count > 0 ? count : null;
    } catch {
      return null;
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
