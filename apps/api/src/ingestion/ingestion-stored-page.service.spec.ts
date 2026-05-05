import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import sharp from 'sharp';
import { IngestionStoredPageService } from './ingestion-stored-page.service';

describe('IngestionStoredPageService', () => {
  let prisma: {
    sourceDocument: {
      update: jest.Mock;
    };
    sourcePage: {
      deleteMany: jest.Mock;
      update: jest.Mock;
      create: jest.Mock;
    };
  };
  let storageClient: {
    getObjectBuffer: jest.Mock;
    putObject: jest.Mock;
    deleteObject: jest.Mock;
  };
  let service: IngestionStoredPageService;

  beforeEach(() => {
    prisma = {
      sourceDocument: {
        update: jest.fn(),
      },
      sourcePage: {
        deleteMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
    };
    storageClient = {
      getObjectBuffer: jest.fn(),
      putObject: jest.fn(),
      deleteObject: jest.fn(),
    };
    service = new IngestionStoredPageService(prisma as never);
  });

  it('skips rasterization work when all document pages are already stored', async () => {
    await expect(
      service.ensureStoredPagesForDocument({
        sourceDocument: {
          id: 'doc-1',
          fileName: 'exam.pdf',
          storageKey: 'bac/2024/documents/exam.pdf',
          pageCount: 2,
          metadata: {
            rasterDpi: 220,
          },
          pages: [
            {
              id: 'page-1',
              pageNumber: 1,
              storageKey: 'page-1.png',
              width: 800,
              height: 1200,
              metadata: null,
            },
            {
              id: 'page-2',
              pageNumber: 2,
              storageKey: 'page-2.png',
              width: 800,
              height: 1200,
              metadata: null,
            },
          ],
        },
        year: 2024,
        replaceExisting: false,
        storageClient: storageClient as never,
        rasterDpi: 220,
        pageConcurrency: 4,
      }),
    ).resolves.toEqual({
      pageCount: 2,
    });

    expect(storageClient.getObjectBuffer).not.toHaveBeenCalled();
    expect(prisma.sourceDocument.update).not.toHaveBeenCalled();
    expect(prisma.sourcePage.create).not.toHaveBeenCalled();
    expect(prisma.sourcePage.update).not.toHaveBeenCalled();
  });

  it('reads document buffers through the storage client', async () => {
    storageClient.getObjectBuffer.mockResolvedValueOnce(
      Buffer.from('pdf-data'),
    );

    await expect(
      service.readSourceDocumentBuffer(
        {
          storageKey: 'bac/2024/documents/exam.pdf',
        },
        storageClient as never,
      ),
    ).resolves.toEqual(Buffer.from('pdf-data'));

    expect(storageClient.getObjectBuffer).toHaveBeenCalledWith(
      'bac/2024/documents/exam.pdf',
    );
  });

  it('deletes stale and renamed page blobs after replacing stored pages', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'stored-pages-'));
    const pagePath = path.join(tempDir, 'page-1.png');
    await sharp({
      create: {
        width: 4,
        height: 5,
        channels: 3,
        background: {
          r: 255,
          g: 255,
          b: 255,
        },
      },
    })
      .png()
      .toFile(pagePath);

    jest
      .spyOn(service as never, 'readSourceDocumentBuffer')
      .mockResolvedValue(Buffer.from('%PDF'));
    jest.spyOn(service as never, 'rasterizePdf').mockResolvedValue([
      {
        filePath: pagePath,
        pageNumber: 1,
        width: 4,
        height: 5,
      },
    ]);

    try {
      await expect(
        service.ensureStoredPagesForDocument({
          sourceDocument: {
            id: 'doc-1',
            fileName: 'new-exam.pdf',
            storageKey: 'bac/2024/documents/new-exam.pdf',
            pageCount: 2,
            metadata: null,
            pages: [
              {
                id: 'page-1',
                pageNumber: 1,
                storageKey: 'bac/2024/pages/old-exam/page-001.png',
                width: 800,
                height: 1200,
                metadata: null,
              },
              {
                id: 'page-2',
                pageNumber: 2,
                storageKey: 'bac/2024/pages/old-exam/page-002.png',
                width: 800,
                height: 1200,
                metadata: null,
              },
            ],
          },
          year: 2024,
          replaceExisting: true,
          storageClient: storageClient as never,
          rasterDpi: 220,
          pageConcurrency: 1,
        }),
      ).resolves.toEqual({
        pageCount: 1,
      });

      expect(prisma.sourcePage.deleteMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: ['page-2'],
          },
        },
      });
      expect(prisma.sourcePage.update).toHaveBeenCalledWith({
        where: {
          id: 'page-1',
        },
        data: expect.objectContaining({
          storageKey: 'bac/2024/pages/new-exam/page-001.png',
          width: 4,
          height: 5,
        }),
      });
      expect(storageClient.deleteObject.mock.calls).toEqual(
        expect.arrayContaining([
          ['bac/2024/pages/old-exam/page-001.png'],
          ['bac/2024/pages/old-exam/page-002.png'],
        ]),
      );
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});
