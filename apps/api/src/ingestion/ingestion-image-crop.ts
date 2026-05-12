import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { DraftAsset } from './ingestion.contract';

export async function cropAssetBuffer(pageBuffer: Buffer, asset: DraftAsset) {
  const cropped = await cropBufferWithBox(pageBuffer, asset.cropBox);
  return applyAssetCleanupMasks(cropped, asset);
}

export async function cropBufferWithBox(
  pageBuffer: Buffer,
  cropBox: DraftAsset['cropBox'],
) {
  const pageMetadata = await sharp(pageBuffer).metadata();
  const width = pageMetadata.width ?? 0;
  const height = pageMetadata.height ?? 0;

  if (!width || !height) {
    throw new BadRequestException('Source page image dimensions are missing.');
  }

  const left = Math.max(0, Math.floor(cropBox.x));
  const top = Math.max(0, Math.floor(cropBox.y));
  const cropWidth = Math.max(
    1,
    Math.min(width - left, Math.floor(cropBox.width)),
  );
  const cropHeight = Math.max(
    1,
    Math.min(height - top, Math.floor(cropBox.height)),
  );

  return sharp(pageBuffer)
    .extract({
      left,
      top,
      width: cropWidth,
      height: cropHeight,
    })
    .png()
    .toBuffer();
}

async function applyAssetCleanupMasks(cropBuffer: Buffer, asset: DraftAsset) {
  const masks = asset.cleanupMasks ?? [];

  if (masks.length === 0) {
    return cropBuffer;
  }

  const cropMetadata = await sharp(cropBuffer).metadata();
  const width = cropMetadata.width ?? 0;
  const height = cropMetadata.height ?? 0;

  if (!width || !height) {
    throw new BadRequestException('Cropped asset dimensions are missing.');
  }

  const rects = masks
    .map((mask) => {
      const x = Math.max(0, Math.floor(mask.x));
      const y = Math.max(0, Math.floor(mask.y));
      const rectWidth = Math.max(
        0,
        Math.min(width - x, Math.floor(mask.width)),
      );
      const rectHeight = Math.max(
        0,
        Math.min(height - y, Math.floor(mask.height)),
      );

      if (rectWidth <= 0 || rectHeight <= 0) {
        return null;
      }

      return `<rect x="${x}" y="${y}" width="${rectWidth}" height="${rectHeight}" fill="#fff" />`;
    })
    .filter((rect): rect is string => Boolean(rect));

  if (rects.length === 0) {
    return cropBuffer;
  }

  const overlay = Buffer.from(
    `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${rects.join('')}</svg>`,
  );

  return sharp(cropBuffer)
    .composite([
      {
        input: overlay,
        blend: 'over',
      },
    ])
    .png()
    .toBuffer();
}
