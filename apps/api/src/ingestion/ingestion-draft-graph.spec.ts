import {
  collectDraftTopicCodes,
  collectReferencedAssetIds,
  groupDraftNodesByParent,
} from './ingestion-draft-graph';
import { type IngestionDraft } from './ingestion.contract';

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
          orderIndex: 2,
          label: 'Exercise 1',
          maxPoints: null,
          topicCodes: ['ALG', 'FUNC'],
          blocks: [
            {
              id: 'block-1',
              role: 'PROMPT',
              type: 'image',
              value: 'Image block',
              assetId: 'asset-1',
            },
          ],
        },
        {
          id: 'exercise-0',
          nodeType: 'EXERCISE',
          parentId: null,
          orderIndex: 1,
          label: 'Exercise 0',
          maxPoints: null,
          topicCodes: ['GEOM'],
          blocks: [],
        },
        {
          id: 'question-1',
          nodeType: 'QUESTION',
          parentId: 'exercise-1',
          orderIndex: 1,
          label: 'Q1',
          maxPoints: 4,
          topicCodes: ['ALG'],
          blocks: [
            {
              id: 'block-2',
              role: 'PROMPT',
              type: 'paragraph',
              value: 'Prompt',
              assetId: 'asset-1',
            },
            {
              id: 'block-3',
              role: 'SOLUTION',
              type: 'image',
              value: 'Solution image',
              assetId: 'asset-2',
            },
          ],
        },
      ],
    },
  ],
} satisfies IngestionDraft;

describe('ingestion draft graph helpers', () => {
  it('collects unique referenced asset ids across nested nodes', () => {
    expect(Array.from(collectReferencedAssetIds(draft))).toEqual([
      'asset-1',
      'asset-2',
    ]);
  });

  it('collects unique topic codes across all draft variants', () => {
    expect(collectDraftTopicCodes(draft)).toEqual(['ALG', 'FUNC', 'GEOM']);
  });

  it('groups nodes by parent and sorts siblings by order index', () => {
    const grouped = groupDraftNodesByParent(draft.variants[0].nodes);

    expect(grouped.get(null)?.map((node) => node.id)).toEqual([
      'exercise-0',
      'exercise-1',
    ]);
    expect(grouped.get('exercise-1')?.map((node) => node.id)).toEqual([
      'question-1',
    ]);
  });
});
