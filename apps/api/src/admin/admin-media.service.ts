import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MediaType, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { basename, extname } from 'path';
import sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service';
import { R2StorageClient, readR2ConfigFromEnv } from '../ingestion/r2-storage';

const MAX_IMAGE_SIZE_BYTES = 6 * 1024 * 1024;

@Injectable()
export class AdminMediaService {
  private storageClient: R2StorageClient | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async uploadImage(input: { fileName: string; contentBase64: string }) {
    const { mimeType, data } = this.parseBase64Image(input.contentBase64);

    if (data.length > MAX_IMAGE_SIZE_BYTES) {
      throw new BadRequestException('Image size exceeds 6MB limit.');
    }

    const extension = this.resolveFileExtension(input.fileName, mimeType);
    const mediaId = randomUUID();
    const storageKey = `admin/images/${mediaId}${extension}`;
    const imageMetadata = await sharp(data)
      .metadata()
      .catch(() => null);
    const apiBase = this.getApiBaseUrl();
    const url = `${apiBase}/api/v1/admin/uploads/images/${mediaId}`;

    await this.getStorageClient().putObject({
      key: storageKey,
      body: data,
      contentType: mimeType,
      metadata: {
        source: 'admin_upload',
      },
    });

    try {
      await this.prisma.media.create({
        data: {
          id: mediaId,
          url,
          type: MediaType.IMAGE,
          metadata: toJsonValue({
            storageKey,
            mimeType,
            originalFileName: input.fileName,
            width: imageMetadata?.width ?? null,
            height: imageMetadata?.height ?? null,
            source: 'admin_upload_r2',
          }),
        },
      });
    } catch (error) {
      await this.getStorageClient()
        .deleteObject(storageKey)
        .catch(() => undefined);
      throw error;
    }

    return {
      file_name: mediaId,
      url,
    };
  }

  async getImage(fileName: string) {
    const safeName = basename(fileName);
    const media = await this.prisma.media.findUnique({
      where: {
        id: safeName,
      },
      select: {
        metadata: true,
      },
    });

    if (media) {
      const storageKey = readStringField(media.metadata, 'storageKey');

      if (storageKey) {
        return {
          mimeType:
            readStringField(media.metadata, 'mimeType') ??
            'application/octet-stream',
          data: await this.getStorageClient().getObjectBuffer(storageKey),
        };
      }
    }

    throw new NotFoundException(`Image ${fileName} not found.`);
  }

  private parseBase64Image(value: string) {
    const directMatch = value.match(
      /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/,
    );

    if (!directMatch) {
      throw new BadRequestException(
        'content_base64 must be a data URL with an image mime type.',
      );
    }

    const mimeType = directMatch[1].toLowerCase();
    const base64Payload = directMatch[2];

    if (!mimeType.startsWith('image/')) {
      throw new BadRequestException('Only image uploads are supported.');
    }

    const data = Buffer.from(base64Payload, 'base64');

    if (!data.length) {
      throw new BadRequestException('Invalid base64 image content.');
    }

    return {
      mimeType,
      data,
    };
  }

  private resolveFileExtension(fileName: string, mimeType: string) {
    const explicitExtension = extname(fileName).toLowerCase();

    if (explicitExtension) {
      return explicitExtension;
    }

    if (mimeType === 'image/png') {
      return '.png';
    }

    if (mimeType === 'image/jpeg') {
      return '.jpg';
    }

    if (mimeType === 'image/webp') {
      return '.webp';
    }

    if (mimeType === 'image/gif') {
      return '.gif';
    }

    if (mimeType === 'image/svg+xml') {
      return '.svg';
    }

    return '.img';
  }

  private getStorageClient() {
    if (!this.storageClient) {
      this.storageClient = new R2StorageClient(readR2ConfigFromEnv());
    }

    return this.storageClient;
  }

  private getApiBaseUrl() {
    const explicit = process.env.PUBLIC_API_BASE_URL;

    if (explicit) {
      return explicit.replace(/\/$/, '');
    }

    return `http://localhost:${process.env.PORT ?? 3001}`;
  }
}

function readStringField(value: Prisma.JsonValue | null, field: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const objectValue = value as Record<string, unknown>;
  const fieldValue = objectValue[field];

  if (typeof fieldValue !== 'string') {
    return null;
  }

  const trimmed = fieldValue.trim();
  return trimmed.length ? trimmed : null;
}

function toJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
