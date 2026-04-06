import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import {
  buildPublishedMediaCreateData,
  IngestionPublishedAssetsService,
} from './ingestion-published-assets.service';
import { type IngestionDraft } from './ingestion.contract';

type PutObjectInput = {
  key: string;
  body: Buffer;
  contentType: string;
  metadata?: Record<string, string>;
};

describe('IngestionPublishedAssetsService', () => {
  let prisma: {
    sourcePage: {
      findUnique: jest.Mock;
    };
    media: {
      findMany: jest.Mock;
      deleteMany: jest.Mock;
    };
  };
  let storageClient: {
    getObjectBuffer: jest.MockedFunction<(key: string) => Promise<Buffer>>;
    putObject: jest.MockedFunction<(input: PutObjectInput) => Promise<void>>;
    deleteObject: jest.MockedFunction<(key: string) => Promise<void>>;
  };
  let service: IngestionPublishedAssetsService;

  const draft = {
    schema: 'bac_ingestion_draft/v1',
    exam: {
      year: 2024,
      streamCode: 'SE',
      subjectCode: 'MATH',
      sessionType: 'NORMAL',
      provider: 'manual_upload',
      title: 'Draft',
      minYear: 2024,
      sourceListingUrl: null,
      sourceExamPageUrl: null,
      sourceCorrectionPageUrl: null,
      examDocumentId: null,
      correctionDocumentId: null,
      examDocumentStorageKey: null,
      correctionDocumentStorageKey: null,
      metadata: {},
    },
    sourcePages: [],
    assets: [
      {
        id: 'asset-1',
        sourcePageId: 'page-1',
        documentKind: 'EXAM',
        pageNumber: 1,
        variantCode: null,
        role: 'PROMPT',
        classification: 'image',
        cropBox: {
          x: 1,
          y: 1,
          width: 4,
          height: 3,
        },
        label: null,
        notes: null,
      },
      {
        id: 'asset-2',
        sourcePageId: 'page-2',
        documentKind: 'EXAM',
        pageNumber: 1,
        variantCode: null,
        role: 'PROMPT',
        classification: 'table',
        cropBox: {
          x: 0,
          y: 0,
          width: 2,
          height: 2,
        },
        label: null,
        notes: null,
      },
    ],
    variants: [
      {
        code: 'SUJET_1',
        title: 'Sujet 1',
        nodes: [
          {
            id: 'node-1',
            nodeType: 'EXERCISE',
            parentId: null,
            orderIndex: 1,
            label: 'Exercise',
            maxPoints: null,
            topicCodes: [],
            blocks: [
              {
                id: 'block-1',
                role: 'PROMPT',
                type: 'image',
                value: 'Asset 1',
                assetId: 'asset-1',
              },
              {
                id: 'block-2',
                role: 'PROMPT',
                type: 'image',
                value: 'Asset 2',
                assetId: 'asset-2',
              },
            ],
          },
        ],
      },
    ],
  } satisfies IngestionDraft;

  beforeEach(() => {
    prisma = {
      sourcePage: {
        findUnique: jest.fn(),
      },
      media: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },
    };
    storageClient = {
      getObjectBuffer: jest.fn(() => Promise.resolve(Buffer.from(''))),
      putObject: jest.fn(() => Promise.resolve(undefined)),
      deleteObject: jest.fn(() => Promise.resolve(undefined)),
    };
    service = new IngestionPublishedAssetsService(prisma as never);
  });

  async function buildPageBuffer() {
    return sharp({
      create: {
        width: 12,
        height: 10,
        channels: 3,
        background: {
          r: 255,
          g: 255,
          b: 255,
        },
      },
    })
      .png()
      .toBuffer();
  }

  it('prepares cropped assets from referenced draft blocks', async () => {
    prisma.sourcePage.findUnique
      .mockResolvedValueOnce({
        id: 'page-1',
        storageKey: 'page-1.png',
        document: {
          jobId: 'job-1',
        },
      })
      .mockResolvedValueOnce({
        id: 'page-2',
        storageKey: 'page-2.png',
        document: {
          jobId: 'job-1',
        },
      });
    storageClient.getObjectBuffer.mockResolvedValue(await buildPageBuffer());

    const preparedAssets = await service.preparePublishedAssets({
      jobId: 'job-1',
      draft,
      paperId: 'paper-1',
      storageClient: storageClient as never,
    });

    expect(preparedAssets).toHaveLength(2);
    expect(preparedAssets[0]).toMatchObject({
      assetId: 'asset-1',
      sourcePageId: 'page-1',
      width: 4,
      height: 3,
    });
    expect(preparedAssets[1]).toMatchObject({
      assetId: 'asset-2',
      sourcePageId: 'page-2',
      width: 2,
      height: 2,
    });
    expect(storageClient.putObject).toHaveBeenCalledTimes(2);
    const [firstPut] = storageClient.putObject.mock.calls[0] ?? [];
    expect(firstPut?.key).toMatch(
      /^published\/assets\/2024\/paper-1\/.+\.png$/,
    );
    expect(firstPut?.metadata).toEqual({
      sourcePageId: 'page-1',
      classification: 'image',
      documentKind: 'EXAM',
    });
  });

  it('rejects missing assets referenced by draft blocks', async () => {
    await expect(
      service.preparePublishedAssets({
        jobId: 'job-1',
        draft: {
          ...draft,
          assets: [],
        },
        paperId: 'paper-1',
        storageClient: storageClient as never,
      }),
    ).rejects.toThrow(
      new BadRequestException('Block references missing asset asset-1.'),
    );
  });

  it('cleans up already-uploaded assets when a later source page is invalid', async () => {
    prisma.sourcePage.findUnique
      .mockResolvedValueOnce({
        id: 'page-1',
        storageKey: 'page-1.png',
        document: {
          jobId: 'job-1',
        },
      })
      .mockResolvedValueOnce(null);
    storageClient.getObjectBuffer.mockResolvedValue(await buildPageBuffer());

    await expect(
      service.preparePublishedAssets({
        jobId: 'job-1',
        draft,
        paperId: 'paper-1',
        storageClient: storageClient as never,
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'Asset asset-2 references an unknown source page.',
      ),
    );

    expect(storageClient.deleteObject).toHaveBeenCalledTimes(1);
    const [deletedKey] = storageClient.deleteObject.mock.calls[0] ?? [];
    expect(deletedKey).toMatch(/^published\/assets\/2024\/paper-1\/.+\.png$/);
  });

  it('builds published media create payloads from prepared assets', () => {
    expect(
      buildPublishedMediaCreateData(
        {
          assetId: 'asset-1',
          mediaId: 'media-1',
          storageKey: 'published/assets/2024/paper-1/media-1.png',
          width: 400,
          height: 300,
          classification: 'graph',
          sourcePageId: 'page-1',
          cropBox: {
            x: 1,
            y: 2,
            width: 3,
            height: 4,
          },
        },
        'http://localhost:3001',
      ),
    ).toEqual({
      id: 'media-1',
      url: 'http://localhost:3001/api/v1/ingestion/media/media-1',
      type: 'IMAGE',
      metadata: {
        storageKey: 'published/assets/2024/paper-1/media-1.png',
        mimeType: 'image/png',
        width: 400,
        height: 300,
        classification: 'graph',
        sourcePageId: 'page-1',
        cropBox: {
          x: 1,
          y: 2,
          width: 3,
          height: 4,
        },
      },
    });
  });

  it('lists the currently published media attached to a paper', async () => {
    const tx = {
      media: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'media-1',
            metadata: {
              storageKey: 'published/assets/2024/paper-1/media-1.png',
            },
          },
          {
            id: 'media-2',
            metadata: null,
          },
        ]),
      },
    };

    await expect(
      service.listPublishedMediaForPaper(tx as never, 'paper-1'),
    ).resolves.toEqual([
      {
        id: 'media-1',
        storageKey: 'published/assets/2024/paper-1/media-1.png',
      },
      {
        id: 'media-2',
        storageKey: null,
      },
    ]);

    expect(tx.media.findMany).toHaveBeenCalledWith({
      where: {
        blocks: {
          some: {
            node: {
              variant: {
                paperId: 'paper-1',
              },
            },
          },
        },
      },
      select: {
        id: true,
        metadata: true,
      },
    });
  });

  it('cleans up orphaned published media rows only after deleting their blobs', async () => {
    prisma.media.findMany.mockResolvedValueOnce([
      {
        id: 'media-1',
        metadata: {
          storageKey: 'published/assets/2024/paper-1/media-1.png',
        },
      },
      {
        id: 'media-2',
        metadata: null,
      },
    ]);

    await service.cleanupOrphanedPublishedMedia({
      candidates: [
        {
          id: 'media-1',
          storageKey: 'published/assets/2024/paper-1/media-1.png',
        },
        {
          id: 'media-2',
          storageKey: null,
        },
      ],
      storageClient: storageClient as never,
    });

    expect(prisma.media.findMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ['media-1', 'media-2'],
        },
        blocks: {
          none: {},
        },
      },
      select: {
        id: true,
        metadata: true,
      },
    });
    expect(storageClient.deleteObject).toHaveBeenCalledWith(
      'published/assets/2024/paper-1/media-1.png',
    );
    expect(prisma.media.deleteMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ['media-1', 'media-2'],
        },
        blocks: {
          none: {},
        },
      },
    });
  });

  it('keeps orphaned media rows when blob cleanup fails', async () => {
    prisma.media.findMany.mockResolvedValueOnce([
      {
        id: 'media-1',
        metadata: {
          storageKey: 'published/assets/2024/paper-1/media-1.png',
        },
      },
    ]);
    storageClient.deleteObject.mockRejectedValueOnce(new Error('R2 down'));

    await service.cleanupOrphanedPublishedMedia({
      candidates: [
        {
          id: 'media-1',
          storageKey: 'published/assets/2024/paper-1/media-1.png',
        },
      ],
      storageClient: storageClient as never,
    });

    expect(prisma.media.deleteMany).not.toHaveBeenCalled();
  });
});
