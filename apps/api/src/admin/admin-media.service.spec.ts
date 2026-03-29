import { BadRequestException, NotFoundException } from '@nestjs/common';
import sharp from 'sharp';
import { AdminMediaService } from './admin-media.service';

type PutObjectInput = {
  key: string;
  body: Buffer;
  contentType: string;
  metadata?: Record<string, string>;
};
type MediaCreateInput = {
  data: {
    id: string;
    url: string;
    type: string;
    metadata: unknown;
  };
};
type MediaRecord = {
  metadata: Record<string, unknown> | null;
};

describe('AdminMediaService', () => {
  let prisma: {
    media: {
      create: jest.MockedFunction<(input: MediaCreateInput) => Promise<void>>;
      findUnique: jest.MockedFunction<
        (input: unknown) => Promise<MediaRecord | null>
      >;
    };
  };
  let storageClient: {
    putObject: jest.MockedFunction<(input: PutObjectInput) => Promise<void>>;
    deleteObject: jest.MockedFunction<(key: string) => Promise<void>>;
    getObjectBuffer: jest.MockedFunction<(key: string) => Promise<Buffer>>;
  };
  let service: AdminMediaService;

  beforeEach(() => {
    prisma = {
      media: {
        create: jest.fn(() => Promise.resolve(undefined)),
        findUnique: jest.fn(() => Promise.resolve(null)),
      },
    };
    storageClient = {
      putObject: jest.fn(() => Promise.resolve(undefined)),
      deleteObject: jest.fn(() => Promise.resolve(undefined)),
      getObjectBuffer: jest.fn(() => Promise.resolve(Buffer.from(''))),
    };
    service = new AdminMediaService(prisma as never);
    (service as { storageClient: unknown }).storageClient = storageClient;
    process.env.PUBLIC_API_BASE_URL = 'http://localhost:3001';
  });

  afterEach(() => {
    delete process.env.PUBLIC_API_BASE_URL;
  });

  async function buildPngDataUrl() {
    const buffer = await sharp({
      create: {
        width: 6,
        height: 4,
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

    return `data:image/png;base64,${buffer.toString('base64')}`;
  }

  it('uploads admin images to storage and persists media metadata', async () => {
    const result = await service.uploadImage({
      fileName: 'figure.png',
      contentBase64: await buildPngDataUrl(),
    });

    expect(result.file_name).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(result.url).toBe(
      `http://localhost:3001/api/v1/admin/uploads/images/${result.file_name}`,
    );
    expect(storageClient.putObject).toHaveBeenCalledTimes(1);
    const [createInput] = prisma.media.create.mock.calls[0] ?? [];
    expect(createInput).toMatchObject({
      data: {
        id: result.file_name,
        url: result.url,
        type: 'IMAGE',
      },
    });
    const createMetadata =
      createInput &&
      typeof createInput === 'object' &&
      'data' in createInput &&
      createInput.data &&
      typeof createInput.data === 'object' &&
      'metadata' in createInput.data
        ? createInput.data.metadata
        : null;
    expect(createMetadata).toEqual(
      expect.objectContaining({
        storageKey: `admin/images/${result.file_name}.png`,
        mimeType: 'image/png',
        originalFileName: 'figure.png',
        width: 6,
        height: 4,
        source: 'admin_upload_r2',
      }),
    );
  });

  it('cleans up stored objects if media persistence fails', async () => {
    prisma.media.create.mockRejectedValueOnce(new Error('db failed'));

    await expect(
      service.uploadImage({
        fileName: 'figure.png',
        contentBase64: await buildPngDataUrl(),
      }),
    ).rejects.toThrow('db failed');

    expect(storageClient.deleteObject).toHaveBeenCalledTimes(1);
    const [deletedKey] = storageClient.deleteObject.mock.calls[0] ?? [];
    expect(deletedKey).toMatch(/^admin\/images\/.+\.png$/);
  });

  it('rejects invalid image payloads', async () => {
    await expect(
      service.uploadImage({
        fileName: 'figure.png',
        contentBase64: 'not-a-data-url',
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'content_base64 must be a data URL with an image mime type.',
      ),
    );
  });

  it('reads stored admin images from media metadata', async () => {
    prisma.media.findUnique.mockResolvedValueOnce({
      metadata: {
        storageKey: 'admin/images/image-1.png',
        mimeType: 'image/png',
      },
    });
    storageClient.getObjectBuffer.mockResolvedValueOnce(Buffer.from('image'));

    await expect(service.getImage('../image-1')).resolves.toEqual({
      mimeType: 'image/png',
      data: Buffer.from('image'),
    });
    expect(prisma.media.findUnique).toHaveBeenCalledWith({
      where: {
        id: 'image-1',
      },
      select: {
        metadata: true,
      },
    });
  });

  it('throws when the requested admin image does not exist', async () => {
    prisma.media.findUnique.mockResolvedValueOnce(null);

    await expect(service.getImage('missing')).rejects.toThrow(
      new NotFoundException('Image missing not found.'),
    );
  });
});
