import { createEmptyDraft } from './ingestion.contract';
import { validateIngestionDraft } from './ingestion-validation';

function createDraftWithFullPageAsset() {
  const draft = createEmptyDraft({
    year: 2025,
    streamCode: 'SE',
    subjectCode: 'MATHEMATICS',
    sessionType: 'NORMAL',
    provider: 'eddirasa',
    title: 'BAC 2025 Mathematics',
    minYear: 2008,
  });

  draft.exam.examDocumentId = 'doc-exam';
  draft.exam.correctionDocumentId = 'doc-correction';
  draft.sourcePages = [
    {
      id: 'exam-page-1',
      documentId: 'doc-exam',
      documentKind: 'EXAM',
      pageNumber: 1,
      width: 1000,
      height: 1400,
    },
  ];
  draft.assets = [
    {
      id: 'asset-1',
      sourcePageId: 'exam-page-1',
      documentKind: 'EXAM',
      pageNumber: 1,
      variantCode: 'SUJET_1',
      role: 'PROMPT',
      classification: 'image',
      cropBox: {
        x: 0,
        y: 0,
        width: 1000,
        height: 1400,
      },
      label: 'Placeholder figure',
      notes: 'Imported without crop geometry; refine before approval.',
      nativeSuggestion: null,
    },
  ];
  draft.variants[0].nodes = [
    {
      id: 'sujet_1_exercise_1',
      nodeType: 'EXERCISE',
      parentId: null,
      orderIndex: 1,
      label: 'التمرين الأول',
      maxPoints: null,
      topicCodes: [],
      blocks: [
        {
          id: 'sujet_1_exercise_1_prompt_1',
          role: 'PROMPT',
          type: 'image',
          value: '',
          assetId: 'asset-1',
        },
      ],
    },
  ];

  return draft;
}

describe('ingestion draft validation', () => {
  it('warns when an asset still uses a full-page placeholder crop', () => {
    const validation = validateIngestionDraft(createDraftWithFullPageAsset());

    expect(validation.errors).toEqual([]);
    expect(validation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'warning',
          code: 'asset_crop_placeholder',
          assetId: 'asset-1',
          sourcePageId: 'exam-page-1',
          field: 'cropBox',
        }),
      ]),
    );
  });
});
