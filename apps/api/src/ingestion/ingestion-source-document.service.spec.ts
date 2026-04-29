import { BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import { SessionType, SourceDocumentKind } from '@prisma/client';
import { IngestionSourceDocumentService } from './ingestion-source-document.service';
import { type CanonicalStorageContext } from './storage-naming';

describe('IngestionSourceDocumentService', () => {
  let prisma: {
    sourceDocument: {
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    sourcePage: {
      deleteMany: jest.Mock;
    };
  };
  let storageClient: {
    putObject: jest.Mock;
    deleteObject: jest.Mock;
  };
  let service: IngestionSourceDocumentService;

  const context: CanonicalStorageContext = {
    year: 2024,
    streamCode: 'SE',
    subjectCode: 'MATH',
    sessionType: SessionType.NORMAL,
    qualifierKey: null,
  };
  const fixedNow = new Date('2026-03-28T12:00:00.000Z');
  const pdfBuffer = Buffer.from('%PDF-1.4 fake bac bank pdf');

  beforeEach(() => {
    prisma = {
      sourceDocument: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      sourcePage: {
        deleteMany: jest.fn(),
      },
    };
    storageClient = {
      putObject: jest.fn().mockResolvedValue(undefined),
      deleteObject: jest.fn().mockResolvedValue(undefined),
    };
    service = new IngestionSourceDocumentService(prisma as never);
  });

  it('rejects empty and non-pdf uploads while allowing pdf-looking buffers', () => {
    expect(() =>
      service.assertPdfUpload(
        {
          buffer: Buffer.alloc(0),
          mimeType: 'application/pdf',
          originalFileName: 'exam.pdf',
        },
        'examDocument',
      ),
    ).toThrow(new BadRequestException('examDocument must not be empty.'));

    expect(() =>
      service.assertPdfUpload(
        {
          buffer: Buffer.from('plain-text'),
          mimeType: 'text/plain',
          originalFileName: 'notes.txt',
        },
        'examDocument',
      ),
    ).toThrow(new BadRequestException('examDocument must be a PDF.'));

    expect(() =>
      service.assertPdfUpload(
        {
          buffer: pdfBuffer,
          mimeType: 'application/octet-stream',
          originalFileName: 'upload.bin',
        },
        'examDocument',
      ),
    ).not.toThrow();
  });

  it('stores manual source documents with canonical keys and upload metadata', async () => {
    prisma.sourceDocument.create.mockResolvedValueOnce({
      id: 'doc-1',
      storageKey:
        'bac/2024/documents/math/bac-exam-math-se-2024-normal.pdf',
    });

    await service.storeManualSourceDocument({
      paperSourceId: 'paper-source-1',
      kind: SourceDocumentKind.EXAM,
      upload: {
        buffer: pdfBuffer,
        mimeType: 'application/pdf',
        originalFileName: 'exam-upload.pdf',
      },
      context,
      sourceReference: 'Official archive',
      storageClient: storageClient as never,
      now: fixedNow,
    });

    expect(storageClient.putObject).toHaveBeenCalledWith({
      key: 'bac/2024/documents/math/bac-exam-math-se-2024-normal.pdf',
      body: pdfBuffer,
      contentType: 'application/pdf',
      metadata: {
        intakeMethod: 'manual-upload',
      },
    });
    expect(prisma.sourceDocument.create).toHaveBeenCalledWith({
      data: {
        paperSourceId: 'paper-source-1',
        kind: SourceDocumentKind.EXAM,
        storageKey: 'bac/2024/documents/math/bac-exam-math-se-2024-normal.pdf',
        fileName: 'bac-exam-math-se-2024-normal.pdf',
        mimeType: 'application/pdf',
        pageCount: null,
        sha256: createHash('sha256').update(pdfBuffer).digest('hex'),
        sourceUrl: null,
        language: 'ar',
        metadata: {
          intakeMethod: 'manual_upload',
          uploadedFileName: 'exam-upload.pdf',
          uploadedMimeType: 'application/pdf',
          uploadedAt: '2026-03-28T12:00:00.000Z',
          sourceReference: 'Official archive',
        },
      },
      select: {
        id: true,
        storageKey: true,
      },
    });
  });

  it('replaces correction documents and clears stored pages before updating metadata', async () => {
    prisma.sourceDocument.update.mockResolvedValueOnce({
      id: 'doc-2',
      storageKey:
        'bac/2024/documents/math/bac-correction-math-se-2024-normal.pdf',
    });

    await service.replaceManualSourceDocument({
      sourceDocument: {
        id: 'doc-2',
        kind: SourceDocumentKind.CORRECTION,
        storageKey: 'bac/2023/documents/old-correction.pdf',
        pages: [
          {
            id: 'page-1',
            storageKey: 'bac/2023/pages/old-correction/page-001.png',
          },
        ],
      },
      upload: {
        buffer: pdfBuffer,
        mimeType: 'application/pdf',
        originalFileName: 'correction-upload.pdf',
      },
      context,
      sourceReference: 'Corrected archive',
      storageClient: storageClient as never,
      now: fixedNow,
    });

    expect(prisma.sourcePage.deleteMany).toHaveBeenCalledWith({
      where: {
        documentId: 'doc-2',
      },
    });
    expect(prisma.sourceDocument.update).toHaveBeenCalledWith({
      where: {
        id: 'doc-2',
      },
      data: {
        storageKey:
          'bac/2024/documents/math/bac-correction-math-se-2024-normal.pdf',
        fileName: 'bac-correction-math-se-2024-normal.pdf',
        mimeType: 'application/pdf',
        pageCount: null,
        sha256: createHash('sha256').update(pdfBuffer).digest('hex'),
        sourceUrl: null,
        language: 'ar',
        metadata: {
          intakeMethod: 'manual_upload',
          uploadedFileName: 'correction-upload.pdf',
          uploadedMimeType: 'application/pdf',
          uploadedAt: '2026-03-28T12:00:00.000Z',
          sourceReference: 'Corrected archive',
          replacedAt: '2026-03-28T12:00:00.000Z',
        },
      },
      select: {
        id: true,
        storageKey: true,
      },
    });
    expect(storageClient.deleteObject).toHaveBeenCalledTimes(2);
    expect(storageClient.deleteObject.mock.calls).toEqual(
      expect.arrayContaining([
        ['bac/2023/pages/old-correction/page-001.png'],
        ['bac/2023/documents/old-correction.pdf'],
      ]),
    );
  });

  it('deletes source documents from storage after removing their row', async () => {
    prisma.sourceDocument.delete.mockResolvedValueOnce({
      id: 'doc-9',
    });

    await service.deleteSourceDocument({
      sourceDocument: {
        id: 'doc-9',
        storageKey: 'bac/2024/documents/exam.pdf',
        pages: [
          {
            id: 'page-1',
            storageKey: 'bac/2024/pages/exam/page-001.png',
          },
          {
            id: 'page-2',
            storageKey: 'bac/2024/pages/exam/page-002.png',
          },
        ],
      },
      storageClient: storageClient as never,
    });

    expect(prisma.sourceDocument.delete).toHaveBeenCalledWith({
      where: {
        id: 'doc-9',
      },
    });
    expect(storageClient.deleteObject.mock.calls).toEqual(
      expect.arrayContaining([
        ['bac/2024/documents/exam.pdf'],
        ['bac/2024/pages/exam/page-001.png'],
        ['bac/2024/pages/exam/page-002.png'],
      ]),
    );
  });
});
