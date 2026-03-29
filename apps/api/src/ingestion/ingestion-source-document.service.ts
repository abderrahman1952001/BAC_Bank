import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, SourceDocumentKind } from '@prisma/client';
import { execFile } from 'child_process';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import { PrismaService } from '../prisma/prisma.service';
import { R2StorageClient } from './r2-storage';
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

export type StoredSourceDocumentWithPages = {
  id: string;
  kind: SourceDocumentKind;
  pages: Array<{
    id: string;
  }>;
};

@Injectable()
export class IngestionSourceDocumentService {
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
    jobId: string;
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
    const pageCount = await this.readPdfPageCount(input.upload.buffer);
    const sha256 = createHash('sha256')
      .update(input.upload.buffer)
      .digest('hex');

    await input.storageClient.putObject({
      key: storageKey,
      body: input.upload.buffer,
      contentType: 'application/pdf',
      metadata: {
        intakeMethod: 'manual-upload',
      },
    });

    return this.prisma.sourceDocument.create({
      data: {
        jobId: input.jobId,
        kind: input.kind,
        storageKey,
        fileName,
        mimeType: 'application/pdf',
        pageCount,
        sha256,
        sourceUrl: null,
        language: 'ar',
        metadata: toJsonValue(
          this.buildManualSourceDocumentMetadata({
            upload: input.upload,
            sourceReference: input.sourceReference,
            now: input.now,
          }),
        ),
      },
      select: {
        id: true,
        storageKey: true,
      },
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
    const pageCount = await this.readPdfPageCount(input.upload.buffer);
    const sha256 = createHash('sha256')
      .update(input.upload.buffer)
      .digest('hex');

    await input.storageClient.putObject({
      key: storageKey,
      body: input.upload.buffer,
      contentType: 'application/pdf',
      metadata: {
        intakeMethod: 'manual-upload',
      },
    });

    if (input.sourceDocument.pages.length > 0) {
      await this.prisma.sourcePage.deleteMany({
        where: {
          documentId: input.sourceDocument.id,
        },
      });
    }

    return this.prisma.sourceDocument.update({
      where: {
        id: input.sourceDocument.id,
      },
      data: {
        storageKey,
        fileName,
        mimeType: 'application/pdf',
        pageCount,
        sha256,
        sourceUrl: null,
        language: 'ar',
        metadata: toJsonValue(
          this.buildManualSourceDocumentMetadata({
            upload: input.upload,
            sourceReference: input.sourceReference,
            now: input.now,
            replaced: true,
          }),
        ),
      },
      select: {
        id: true,
        storageKey: true,
      },
    });
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
