import {
  importReviewedPaperExtract,
  parseReviewedPaperExtract,
} from './reviewed-paper-import';

function createBaseDraft() {
  return {
    schema: 'bac_ingestion_draft/v1' as const,
    exam: {
      year: 2023,
      streamCode: 'SE',
      subjectCode: 'PHYSICS',
      sessionType: 'NORMAL' as const,
      provider: 'eddirasa',
      title: 'BAC 2023 PHYSICS se',
      minYear: 2008,
      sourceListingUrl: 'https://example.com/list',
      sourceExamPageUrl: 'https://example.com/exam',
      sourceCorrectionPageUrl: 'https://example.com/correction',
      examDocumentId: 'exam-document-id',
      correctionDocumentId: 'correction-document-id',
      examDocumentStorageKey: 'bac/2023/documents/exam.pdf',
      correctionDocumentStorageKey: 'bac/2023/documents/correction.pdf',
      metadata: {
        paperStreamCodes: ['SE'],
      },
    },
    sourcePages: [
      {
        id: 'exam-page-1',
        documentId: 'exam-document-id',
        documentKind: 'EXAM' as const,
        pageNumber: 1,
        width: 1000,
        height: 1400,
      },
      {
        id: 'correction-page-2',
        documentId: 'correction-document-id',
        documentKind: 'CORRECTION' as const,
        pageNumber: 2,
        width: 1000,
        height: 1400,
      },
    ],
    assets: [],
    variants: [
      {
        code: 'SUJET_1' as const,
        title: 'الموضوع الأول',
        nodes: [],
      },
      {
        code: 'SUJET_2' as const,
        title: 'الموضوع الثاني',
        nodes: [],
      },
    ],
  };
}

describe('reviewed-paper-import', () => {
  it('converts the reviewed extract shape into an ingestion draft', () => {
    const extract = parseReviewedPaperExtract({
      variants: [
        {
          code: 'SUJET_1',
          title: 'الموضوع الأول',
          exercises: [
            {
              orderIndex: 1,
              title: 'التمرين الأول: (04 نقاط)',
              contextBlocks: [
                {
                  type: 'paragraph',
                  text: 'مقدمة التمرين.',
                },
              ],
              assetIds: ['asset-1'],
              questions: [
                {
                  orderIndex: 1,
                  promptBlocks: [
                    {
                      type: 'paragraph',
                      text: 'السؤال الأول',
                    },
                  ],
                  solutionBlocks: [
                    {
                      type: 'heading',
                      text: 'الحل',
                    },
                  ],
                  hintBlocks: [],
                  rubricBlocks: [],
                  assetIds: ['asset-2'],
                },
              ],
            },
          ],
        },
      ],
      assets: [
        {
          id: 'asset-1',
          exerciseOrderIndex: 1,
          documentKind: 'EXAM',
          role: 'PROMPT',
          classification: 'image',
          pageNumber: 1,
          caption: 'الشكل 1',
          variantCode: 'SUJET_1',
        },
        {
          id: 'asset-2',
          exerciseOrderIndex: 1,
          questionOrderIndex: 1,
          documentKind: 'CORRECTION',
          role: 'SOLUTION',
          classification: 'table',
          pageNumber: 2,
          caption: 'الجدول',
          variantCode: 'SUJET_1',
        },
      ],
      uncertainties: [],
      exam: {
        durationMinutes: 180,
        totalPoints: 20,
        title: 'عنوان الاستخراج القديم',
      },
    });

    const { draft, summary } = importReviewedPaperExtract({
      baseDraft: createBaseDraft(),
      reviewedExtract: extract,
      importFilePath: 'extracted papers/Physics/SE 2023.txt',
      importedAt: new Date('2026-04-18T00:00:00.000Z'),
    });

    expect(summary).toMatchObject({
      variantCount: 1,
      exerciseCount: 1,
      questionCount: 1,
      assetCount: 2,
      placeholderAssetCount: 2,
      missingVariantCodes: ['SUJET_2'],
    });
    expect(draft.exam.title).toBe('BAC 2023 PHYSICS se');
    expect(draft.exam.metadata).toMatchObject({
      importedFromReviewedExtract: true,
      reviewedExtractFile: 'extracted papers/Physics/SE 2023.txt',
      reviewedExtractExamTitle: 'عنوان الاستخراج القديم',
      durationMinutes: 180,
      totalPoints: 20,
    });
    expect(draft.assets).toHaveLength(2);
    expect(draft.assets[0]).toMatchObject({
      id: 'asset-1',
      sourcePageId: 'exam-page-1',
      cropBox: {
        x: 0,
        y: 0,
        width: 1000,
        height: 1400,
      },
    });
    expect(draft.variants[0]?.nodes).toHaveLength(2);
    expect(draft.variants[0]?.nodes[0]).toMatchObject({
      id: 'sujet_1_exercise_1',
      nodeType: 'EXERCISE',
      label: 'التمرين الأول: (04 نقاط)',
      maxPoints: 4,
    });
    expect(draft.variants[0]?.nodes[1]).toMatchObject({
      id: 'sujet_1_exercise_1_question_1',
      nodeType: 'QUESTION',
      parentId: 'sujet_1_exercise_1',
    });
  });
});
