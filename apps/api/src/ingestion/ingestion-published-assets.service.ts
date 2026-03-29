import { BadRequestException, Injectable } from '@nestjs/common';
import { MediaType, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service';
import { IngestionDraft, type DraftAsset } from './ingestion.contract';
import { collectReferencedAssetIds } from './ingestion-draft-graph';
import { cropAssetBuffer } from './ingestion-image-crop';
import { R2StorageClient } from './r2-storage';

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

@Injectable()
export class IngestionPublishedAssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async preparePublishedAssets(input: {
    jobId: string;
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
                jobId: true,
              },
            },
          },
        });

        if (!page || page.document.jobId !== input.jobId) {
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
      await Promise.allSettled(
        uploadedKeys.map((storageKey) =>
          input.storageClient.deleteObject(storageKey),
        ),
      );
      throw error;
    }
  }

  async cleanupPreparedAssets(
    preparedAssets: PreparedPublishedAsset[],
    storageClient: R2StorageClient,
  ) {
    await Promise.allSettled(
      preparedAssets.map((asset) =>
        storageClient.deleteObject(asset.storageKey),
      ),
    );
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
