import sharp from 'sharp';
import { cropAssetBuffer, cropBufferWithBox } from './ingestion-image-crop';

describe('ingestion image crop helpers', () => {
  async function buildPageBuffer() {
    return sharp({
      create: {
        width: 10,
        height: 8,
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

  it('crops a page buffer to the requested box', async () => {
    const cropped = await cropBufferWithBox(await buildPageBuffer(), {
      x: 2,
      y: 1,
      width: 4,
      height: 3,
    });
    const metadata = await sharp(cropped).metadata();

    expect(metadata.width).toBe(4);
    expect(metadata.height).toBe(3);
  });

  it('clamps crop boxes to the source image bounds', async () => {
    const cropped = await cropAssetBuffer(await buildPageBuffer(), {
      id: 'asset-1',
      sourcePageId: 'page-1',
      documentKind: 'EXAM',
      pageNumber: 1,
      variantCode: null,
      role: 'PROMPT',
      classification: 'image',
      cropBox: {
        x: 8,
        y: 6,
        width: 10,
        height: 10,
      },
      label: null,
      notes: null,
    });
    const metadata = await sharp(cropped).metadata();

    expect(metadata.width).toBe(2);
    expect(metadata.height).toBe(2);
  });
});
