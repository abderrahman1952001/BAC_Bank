import { BadRequestException } from '@nestjs/common';

export function readPageNumberFromRasterFile(fileName: string) {
  const match = fileName.match(/page-(\d+)\.png$/);

  if (!match) {
    throw new BadRequestException(
      `Unexpected rasterized page file name ${fileName}.`,
    );
  }

  return Number.parseInt(match[1], 10);
}
