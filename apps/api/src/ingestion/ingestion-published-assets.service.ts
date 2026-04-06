import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { MediaType, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service';
import { IngestionDraft, type DraftAsset } from './ingestion.contract';
import { collectReferencedAssetIds } from './ingestion-draft-graph';
import { cropAssetBuffer } from './ingestion-image-crop';
import { R2StorageClient } from './r2-storage';
import { deleteStorageKeysBestEffort } from './storage-cleanup';

export type PreparedPublishedAsset = {
  assetId: string;
  mediaId: string;
  storageKey: string;
  width: number | null;
  height: number | null;
  classification: DraftAsset['classification'];
  sourcePageId: string;
  cropBox: DraftAsset['cropBox'];
};

export type PublishedMediaCleanupCandidate = {
  id: string;
  storageKey: string | null;
};

@Injectable()
export class IngestionPublishedAssetsService {
  private readonly logger = new Logger(IngestionPublishedAssetsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async preparePublishedAssets(input: {
    paperSourceId: string;
    draft: IngestionDraft;
    paperId: string;
    storageClient: R2StorageClient;
  }) {
    const preparedAssets: PreparedPublishedAsset[] = [];
    const uploadedKeys: string[] = [];

    try {
      for (const assetId of collectReferencedAssetIds(input.draft)) {
        const asset = input.draft.assets.find((entry) => entry.id === assetId);

        if (!asset) {
          throw new BadRequestException(
            `Block references missing asset ${assetId}.`,
          );
        }

        const page = await this.prisma.sourcePage.findUnique({
          where: {
            id: asset.sourcePageId,
          },
          include: {
            document: {
              select: {
                paperSourceId: true,
              },
            },
          },
        });

        if (!page || page.document.paperSourceId !== input.paperSourceId) {
          throw new BadRequestException(
            `Asset ${asset.id} references an unknown source page.`,
          );
        }

        const pageBuffer = await input.storageClient.getObjectBuffer(
          page.storageKey,
        );
        const cropped = await cropAssetBuffer(pageBuffer, asset);
        const mediaId = randomUUID();
        const storageKey = [
          'published',
          'assets',
          `${input.draft.exam.year}`,
          input.paperId,
          `${mediaId}.png`,
        ].join('/');

        await input.storageClient.putObject({
          key: storageKey,
          body: cropped,
          contentType: 'image/png',
          metadata: {
            sourcePageId: asset.sourcePageId,
            classification: asset.classification,
            documentKind: asset.documentKind,
          },
        });
        uploadedKeys.push(storageKey);

        const imageInfo = await sharp(cropped).metadata();

        preparedAssets.push({
          assetId: asset.id,
          mediaId,
          storageKey,
          width: imageInfo.width ?? null,
          height: imageInfo.height ?? null,
          classification: asset.classification,
          sourcePageId: asset.sourcePageId,
          cropBox: asset.cropBox,
        });
      }

      return preparedAssets;
    } catch (error) {
      const { failedKeys } = await deleteStorageKeysBestEffort(
        input.storageClient,
        uploadedKeys,
      );

      if (failedKeys.length > 0) {
        this.logger.warn(
          `Failed to clean ${failedKeys.length} prepared published asset object(s): ${failedKeys.join(', ')}`,
        );
      }
      throw error;
    }
  }

  async cleanupPreparedAssets(
    preparedAssets: PreparedPublishedAsset[],
    storageClient: R2StorageClient,
  ) {
    const { failedKeys } = await deleteStorageKeysBestEffort(
      storageClient,
      preparedAssets.map((asset) => asset.storageKey),
    );

    if (failedKeys.length > 0) {
      this.logger.warn(
        `Failed to clean ${failedKeys.length} prepared published asset object(s): ${failedKeys.join(', ')}`,
      );
    }
  }

  async listPublishedMediaForPaper(
    tx: Prisma.TransactionClient,
    paperId: string,
  ): Promise<PublishedMediaCleanupCandidate[]> {
    const media = await tx.media.findMany({
      where: {
        blocks: {
          some: {
            node: {
              variant: {
                paperId,
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

    return media.map((entry) => ({
      id: entry.id,
      storageKey: readJsonString(entry.metadata, 'storageKey'),
    }));
  }

  async cleanupOrphanedPublishedMedia(input: {
    candidates: PublishedMediaCleanupCandidate[];
    storageClient: R2StorageClient;
  }) {
    const candidateIds = Array.from(
      new Set(input.candidates.map((candidate) => candidate.id)),
    );

    if (!candidateIds.length) {
      return;
    }

    const orphanedMedia = await this.prisma.media.findMany({
      where: {
        id: {
          in: candidateIds,
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

    if (!orphanedMedia.length) {
      return;
    }

    const orphanedStorageKeyById = new Map(
      orphanedMedia.map((entry) => [
        entry.id,
        readJsonString(entry.metadata, 'storageKey'),
      ]),
    );
    const { failedKeys } = await deleteStorageKeysBestEffort(
      input.storageClient,
      Array.from(orphanedStorageKeyById.values()),
    );
    const failedKeySet = new Set(failedKeys);
    const deletableMediaIds = orphanedMedia
      .filter((entry) => {
        const storageKey = orphanedStorageKeyById.get(entry.id) ?? null;
        return !storageKey || !failedKeySet.has(storageKey);
      })
      .map((entry) => entry.id);

    if (failedKeys.length > 0) {
      this.logger.warn(
        `Failed to clean ${failedKeys.length} obsolete published media object(s): ${failedKeys.join(', ')}`,
      );
    }

    if (!deletableMediaIds.length) {
      return;
    }

    await this.prisma.media.deleteMany({
      where: {
        id: {
          in: deletableMediaIds,
        },
        blocks: {
          none: {},
        },
      },
    });
  }
}

export function buildPublishedMediaCreateData(
  preparedAsset: PreparedPublishedAsset,
  apiBaseUrl: string,
) {
  return {
    id: preparedAsset.mediaId,
    url: `${apiBaseUrl}/api/v1/ingestion/media/${preparedAsset.mediaId}`,
    type: MediaType.IMAGE,
    metadata: toJsonValue({
      storageKey: preparedAsset.storageKey,
      mimeType: 'image/png',
      width: preparedAsset.width,
      height: preparedAsset.height,
      classification: preparedAsset.classification,
      sourcePageId: preparedAsset.sourcePageId,
      cropBox: preparedAsset.cropBox,
    }),
  };
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function readJsonString(metadata: Prisma.JsonValue | null, key: string) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}
