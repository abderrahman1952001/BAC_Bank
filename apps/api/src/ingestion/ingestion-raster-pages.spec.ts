import { BadRequestException } from '@nestjs/common';
import { readPageNumberFromRasterFile } from './ingestion-raster-pages';

describe('ingestion raster page helpers', () => {
  it('reads a page number from rasterized page file names', () => {
    expect(readPageNumberFromRasterFile('page-001.png')).toBe(1);
    expect(readPageNumberFromRasterFile('page-12.png')).toBe(12);
  });

  it('rejects unexpected raster file names', () => {
    expect(() => readPageNumberFromRasterFile('cover.png')).toThrow(
      new BadRequestException(
        'Unexpected rasterized page file name cover.png.',
      ),
    );
  });
});
