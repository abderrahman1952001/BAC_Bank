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
});
