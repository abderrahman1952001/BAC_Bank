import {
  BlockRole,
  BlockType as PrismaBlockType,
  Prisma,
} from '@prisma/client';
import {
  mapNodeBlocksToContentBlocks,
  parseExerciseMetadata,
  readOptionalTopicCodes,
} from './admin-domain-serialization';

describe('admin-domain-serialization', () => {
  it('parses exercise metadata and normalizes nested context blocks', () => {
    expect(
      parseExerciseMetadata({
        theme: 'algebra',
        difficulty: 'medium',
        tags: ['tag-1', 'tag-2'],
        adminOrder: 3,
        hierarchyMeta: {
          year: 2025,
          session: 'normal',
          contextBlocks: [
            {
              id: 'block-1',
              type: 'paragraph',
              value: 'Context',
            },
            {
              id: 'block-2',
              type: 'unknown',
              value: 'Ignored',
            },
          ],
        },
      } as Prisma.JsonObject),
    ).toEqual({
      theme: 'algebra',
      difficulty: 'medium',
      tags: ['tag-1', 'tag-2'],
      adminOrder: 3,
      hierarchyMeta: {
        year: 2025,
        session: 'normal',
        contextBlocks: [
          {
            id: 'block-1',
            type: 'paragraph',
            value: 'Context',
          },
        ],
      },
    });
  });

  it('maps stored node blocks into admin content blocks with media metadata fallback', () => {
    expect(
      mapNodeBlocksToContentBlocks([
        {
          id: 'image-1',
          role: BlockRole.PROMPT,
          orderIndex: 1,
          blockType: PrismaBlockType.IMAGE,
          textValue: null,
          data: {
            url: 'https://cdn.example.com/figure.png',
          } as Prisma.JsonObject,
          media: {
            url: 'https://cdn.example.com/figure.png',
            metadata: {
              caption: 'Figure 1',
            } as Prisma.JsonObject,
          },
        },
      ]),
    ).toEqual([
      {
        id: 'image-1',
        type: 'image',
        value: 'https://cdn.example.com/figure.png',
        data: {
          url: 'https://cdn.example.com/figure.png',
        },
        meta: {
          caption: 'Figure 1',
        },
      },
    ]);
  });

  it('reads topic codes from snake_case and camelCase payloads', () => {
    expect(
      readOptionalTopicCodes({
        topic_codes: [' algebra ', 'ALGEBRA', '', 'geometry'],
      }),
    ).toEqual(['ALGEBRA', 'GEOMETRY']);
    expect(
      readOptionalTopicCodes({
        topicCodes: ['functions'],
      }),
    ).toEqual(['FUNCTIONS']);
  });
});
