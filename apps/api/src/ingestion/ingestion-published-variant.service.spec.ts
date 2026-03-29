import { BadRequestException } from '@nestjs/common';
import { IngestionPublishedVariantService } from './ingestion-published-variant.service';
import { type IngestionDraft } from './ingestion.contract';

describe('IngestionPublishedVariantService', () => {
  let service: IngestionPublishedVariantService;
  let tx: {
    topic: {
      findMany: jest.Mock;
    };
    examVariant: {
      create: jest.Mock;
    };
    examNode: {
      create: jest.Mock;
    };
    examNodeTopic: {
      createMany: jest.Mock;
    };
    examNodeBlock: {
      create: jest.Mock;
    };
  };

  const draft = {
    schema: 'bac_ingestion_draft/v1',
    exam: {
      year: 2024,
      streamCode: 'SE',
      subjectCode: 'MATH',
      sessionType: 'NORMAL',
      provider: 'manual_upload',
      title: 'Draft',
      minYear: 2024,
      sourceListingUrl: null,
      sourceExamPageUrl: null,
      sourceCorrectionPageUrl: null,
      examDocumentId: null,
      correctionDocumentId: null,
      examDocumentStorageKey: null,
      correctionDocumentStorageKey: null,
      metadata: {},
    },
    sourcePages: [],
    assets: [],
    variants: [
      {
        code: 'SUJET_1',
        title: 'Sujet 1',
        nodes: [
          {
            id: 'exercise-1',
            nodeType: 'EXERCISE',
            parentId: null,
            orderIndex: 1,
            label: 'Exercise 1',
            maxPoints: null,
            topicCodes: ['ALG'],
            blocks: [
              {
                id: 'block-image',
                role: 'PROMPT',
                type: 'image',
                value: 'See figure',
                assetId: 'asset-1',
              },
            ],
          },
          {
            id: 'question-1',
            nodeType: 'QUESTION',
            parentId: 'exercise-1',
            orderIndex: 1,
            label: 'Q1',
            maxPoints: 4,
            topicCodes: ['FUNC'],
            blocks: [
              {
                id: 'block-graph',
                role: 'SOLUTION',
                type: 'graph',
                value: 'Rendered graph',
                assetId: 'asset-2',
                data: {
                  kind: 'formula_graph',
                  points: [],
                },
                meta: {
                  language: 'latex',
                },
              },
            ],
          },
        ],
      },
    ],
  } satisfies IngestionDraft;

  beforeEach(() => {
    service = new IngestionPublishedVariantService();
    tx = {
      topic: {
        findMany: jest.fn(),
      },
      examVariant: {
        create: jest.fn().mockResolvedValue(undefined),
      },
      examNode: {
        create: jest.fn().mockResolvedValue(undefined),
      },
      examNodeTopic: {
        createMany: jest.fn().mockResolvedValue(undefined),
      },
      examNodeBlock: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    };
  });

  it('builds subject topic maps and rejects invalid draft topic codes', async () => {
    tx.topic.findMany.mockResolvedValueOnce([
      {
        id: 'topic-1',
        code: 'ALG',
      },
    ]);

    await expect(
      service.buildSubjectTopicIdMap(
        tx as never,
        'subject-1',
        ['ALG', 'FUNC'],
        'MATH',
      ),
    ).rejects.toThrow(
      new BadRequestException('Invalid topic codes for MATH: FUNC.'),
    );
  });

  it('creates published variants, nodes, topics, and blocks with structured metadata', async () => {
    await service.createPublishedVariants({
      tx: tx as never,
      jobId: 'job-1',
      paperId: 'paper-1',
      draft,
      topicIdsByCode: new Map([
        ['ALG', 'topic-1'],
        ['FUNC', 'topic-2'],
      ]),
      assetMediaIds: new Map([
        ['asset-1', 'media-1'],
        ['asset-2', 'media-2'],
      ]),
      createId: createDeterministicIdFactory([
        'variant-1',
        'node-exercise-1',
        'node-question-1',
      ]),
    });

    expect(tx.examVariant.create).toHaveBeenCalledWith({
      data: {
        id: 'variant-1',
        paperId: 'paper-1',
        code: 'SUJET_1',
        title: 'Sujet 1',
        status: 'PUBLISHED',
        metadata: {
          importedFromJobId: 'job-1',
        },
      },
    });
    expect(tx.examNode.create).toHaveBeenNthCalledWith(1, {
      data: {
        id: 'node-exercise-1',
        variantId: 'variant-1',
        parentId: null,
        nodeType: 'EXERCISE',
        orderIndex: 1,
        label: 'Exercise 1',
        maxPoints: null,
        status: 'PUBLISHED',
        metadata: {
          importedFromDraftNodeId: 'exercise-1',
        },
      },
    });
    expect(tx.examNode.create).toHaveBeenNthCalledWith(2, {
      data: {
        id: 'node-question-1',
        variantId: 'variant-1',
        parentId: 'node-exercise-1',
        nodeType: 'QUESTION',
        orderIndex: 1,
        label: 'Q1',
        maxPoints: 4,
        status: 'PUBLISHED',
        metadata: {
          importedFromDraftNodeId: 'question-1',
        },
      },
    });
    expect(tx.examNodeTopic.createMany).toHaveBeenNthCalledWith(1, {
      data: [
        {
          nodeId: 'node-exercise-1',
          topicId: 'topic-1',
        },
      ],
      skipDuplicates: true,
    });
    expect(tx.examNodeBlock.create).toHaveBeenNthCalledWith(1, {
      data: {
        nodeId: 'node-exercise-1',
        role: 'PROMPT',
        orderIndex: 1,
        blockType: 'IMAGE',
        textValue: null,
        mediaId: 'media-1',
        data: {
          assetId: 'asset-1',
          kind: 'reviewed_asset',
        },
      },
    });
    expect(tx.examNodeBlock.create).toHaveBeenNthCalledWith(2, {
      data: {
        nodeId: 'node-question-1',
        role: 'SOLUTION',
        orderIndex: 1,
        blockType: 'GRAPH',
        textValue: 'Rendered graph',
        mediaId: 'media-2',
        data: {
          kind: 'formula_graph',
          points: [],
          language: 'latex',
          assetId: 'asset-2',
        },
      },
    });
  });
});

function createDeterministicIdFactory(ids: string[]) {
  let index = 0;

  return () => {
    const next = ids[index];

    if (!next) {
      throw new Error('Out of deterministic ids.');
    }

    index += 1;
    return next;
  };
}
