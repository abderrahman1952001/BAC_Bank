import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { DraftAsset } from './ingestion.contract';

export async function cropAssetBuffer(pageBuffer: Buffer, asset: DraftAsset) {
  return cropBufferWithBox(pageBuffer, asset.cropBox);
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
