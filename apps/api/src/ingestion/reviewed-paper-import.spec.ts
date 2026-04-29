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
      label: 'التمرين الأول',
      maxPoints: 4,
    });
    expect(draft.variants[0]?.nodes[1]).toMatchObject({
      id: 'sujet_1_exercise_1_question_1',
      nodeType: 'QUESTION',
      parentId: 'sujet_1_exercise_1',
      label: 'السؤال 1',
    });
  });

  it('normalizes Roman exercise sections into named part nodes', () => {
    const extract = parseReviewedPaperExtract({
      variants: [
        {
          code: 'SUJET_1',
          title: 'الموضوع الأول',
          exercises: [
            {
              orderIndex: 2,
              title: 'التمرين الثاني',
              contextBlocks: [
                {
                  type: 'paragraph',
                  text: 'تمهيد مشترك.\nI - سياق الجزء الأول.',
                },
              ],
              assetIds: [],
              questions: [
                {
                  orderIndex: 1,
                  promptBlocks: [
                    {
                      type: 'paragraph',
                      text: '1) سؤال في الجزء الأول.',
                    },
                  ],
                  solutionBlocks: [],
                  hintBlocks: [],
                  rubricBlocks: [],
                  assetIds: [],
                },
                {
                  orderIndex: 2,
                  promptBlocks: [
                    {
                      type: 'paragraph',
                      text: 'II - سياق الجزء الثاني.',
                    },
                    {
                      type: 'paragraph',
                      text: '1) سؤال في الجزء الثاني.',
                    },
                  ],
                  solutionBlocks: [],
                  hintBlocks: [],
                  rubricBlocks: [],
                  assetIds: [],
                },
                {
                  orderIndex: 3,
                  promptBlocks: [
                    {
                      type: 'paragraph',
                      text: 'III- اكتب نصا علميا.',
                    },
                  ],
                  solutionBlocks: [],
                  hintBlocks: [],
                  rubricBlocks: [],
                  assetIds: [],
                },
              ],
            },
          ],
        },
      ],
      assets: [],
      uncertainties: [],
      exam: {},
    });

    const { draft } = importReviewedPaperExtract({
      baseDraft: createBaseDraft(),
      reviewedExtract: extract,
      importFilePath: 'extracted papers/SVT/M-2017.txt',
      importedAt: new Date('2026-04-18T00:00:00.000Z'),
    });

    const nodes = draft.variants[0]?.nodes ?? [];
    const exercise = nodes.find((node) => node.id === 'sujet_1_exercise_2');
    const parts = nodes.filter((node) => node.nodeType === 'PART');
    const questions = nodes.filter((node) => node.nodeType === 'QUESTION');

    expect(exercise?.blocks.map((block) => block.value)).toEqual([
      'تمهيد مشترك.',
    ]);
    expect(parts.map((part) => part.label)).toEqual([
      'الجزء الأول',
      'الجزء الثاني',
      'الجزء الثالث',
    ]);
    expect(parts.map((part) => part.parentId)).toEqual([
      'sujet_1_exercise_2',
      'sujet_1_exercise_2',
      'sujet_1_exercise_2',
    ]);
    expect(parts[0]?.blocks.map((block) => block.value)).toEqual([
      'سياق الجزء الأول.',
    ]);
    expect(parts[1]?.blocks.map((block) => block.value)).toEqual([
      'سياق الجزء الثاني.',
    ]);
    expect(questions.map((question) => question.parentId)).toEqual([
      'sujet_1_exercise_2_part_1',
      'sujet_1_exercise_2_part_2',
      'sujet_1_exercise_2_part_3',
    ]);
    expect(questions[1]?.blocks[0]?.value).toBe('سؤال في الجزء الثاني.');
    expect(questions[2]?.blocks[0]?.value).toBe('اكتب نصا علميا.');
  });

  it('nests Arabic-letter subquestions under numbered questions with labels and points', () => {
    const extract = parseReviewedPaperExtract({
      variants: [
        {
          code: 'SUJET_1',
          title: 'الموضوع الأول',
          exercises: [
            {
              orderIndex: 2,
              title: 'التمرين الثاني: (06 نقاط)',
              contextBlocks: [
                {
                  type: 'paragraph',
                  text: 'I - سياق الجزء الأول.',
                },
              ],
              assetIds: [],
              questions: [
                {
                  orderIndex: 1,
                  promptBlocks: [
                    {
                      type: 'paragraph',
                      text: '1) من الشكل (1):\nأ) تعرّف على العنصرين.',
                    },
                  ],
                  solutionBlocks: [],
                  hintBlocks: [],
                  rubricBlocks: [
                    {
                      type: 'paragraph',
                      text: 'التعرف والتعليل: 0.25×2',
                    },
                  ],
                  assetIds: [],
                },
                {
                  orderIndex: 2,
                  promptBlocks: [
                    {
                      type: 'paragraph',
                      text: 'ب) حدّد الاتجاه مع التعليل.',
                    },
                  ],
                  solutionBlocks: [],
                  hintBlocks: [],
                  rubricBlocks: [
                    {
                      type: 'paragraph',
                      text: 'الاتجاه: 0.5\nالتبرير: 0.5',
                    },
                  ],
                  assetIds: [],
                },
                {
                  orderIndex: 3,
                  promptBlocks: [
                    {
                      type: 'paragraph',
                      text: '2- أ) استخرج النتيجة.',
                    },
                  ],
                  solutionBlocks: [],
                  hintBlocks: [],
                  rubricBlocks: [
                    {
                      type: 'paragraph',
                      text: 'المجموع: 1.5',
                    },
                  ],
                  assetIds: [],
                },
              ],
            },
          ],
        },
      ],
      assets: [],
      uncertainties: [],
      exam: {},
    });

    const { draft } = importReviewedPaperExtract({
      baseDraft: createBaseDraft(),
      reviewedExtract: extract,
      importFilePath: 'extracted papers/SVT/M-2017.txt',
      importedAt: new Date('2026-04-18T00:00:00.000Z'),
    });

    const nodes = draft.variants[0]?.nodes ?? [];
    const part = nodes.find((node) => node.nodeType === 'PART');
    const questions = nodes.filter((node) => node.nodeType === 'QUESTION');
    const subquestions = nodes.filter(
      (node) => node.nodeType === 'SUBQUESTION',
    );

    expect(nodes.find((node) => node.nodeType === 'EXERCISE')).toMatchObject({
      label: 'التمرين الثاني',
      maxPoints: 6,
    });
    expect(part).toMatchObject({
      label: 'الجزء الأول',
      maxPoints: 3,
    });
    expect(questions.map((question) => question.label)).toEqual([
      'السؤال 1',
      'السؤال 2',
    ]);
    expect(questions.map((question) => question.maxPoints)).toEqual([1.5, 1.5]);
    expect(questions[0]?.blocks.map((block) => block.value)).toEqual([
      'من الشكل (1):',
    ]);
    expect(questions[1]?.blocks.map((block) => block.value)).toEqual([]);
    expect(subquestions.map((subquestion) => subquestion.parentId)).toEqual([
      'sujet_1_exercise_2_part_1_question_1',
      'sujet_1_exercise_2_part_1_question_1',
      'sujet_1_exercise_2_part_1_question_2',
    ]);
    expect(subquestions.map((subquestion) => subquestion.label)).toEqual([
      'الفقرة أ',
      'الفقرة ب',
      'الفقرة أ',
    ]);
    expect(subquestions.map((subquestion) => subquestion.maxPoints)).toEqual([
      0.5, 1, 1.5,
    ]);
    expect(
      subquestions.map((subquestion) => subquestion.blocks[0]?.value),
    ).toEqual([
      'تعرّف على العنصرين.',
      'حدّد الاتجاه مع التعليل.',
      'استخرج النتيجة.',
    ]);
  });

  it('splits multiple Arabic-letter subquestions packed into one source block', () => {
    const extract = parseReviewedPaperExtract({
      variants: [
        {
          code: 'SUJET_1',
          title: 'الموضوع الأول',
          exercises: [
            {
              orderIndex: 2,
              title: 'التمرين الثاني: (10 نقاط)',
              contextBlocks: [
                {
                  type: 'paragraph',
                  text: 'I - سياق الجزء الأول.',
                },
              ],
              assetIds: [],
              questions: [
                {
                  orderIndex: 1,
                  promptBlocks: [
                    {
                      type: 'paragraph',
                      text: [
                        '1- أ- حدّد النشاط.',
                        'ب- تعرّف على المرحلتين.',
                        'جـ- علّل إجابتك.',
                      ].join('\n'),
                    },
                  ],
                  solutionBlocks: [
                    {
                      type: 'paragraph',
                      text: [
                        '1 - أ - النشاط: بلعمة.',
                        'ب - المرحلتان: تثبيت ثم إحاطة.',
                        'جـ - التعليل: يستمر النشاط.',
                      ].join('\n'),
                    },
                  ],
                  hintBlocks: [],
                  rubricBlocks: [
                    {
                      type: 'paragraph',
                      text: ['1.75', '0.25', '2×0.50', '0.50'].join('\n'),
                    },
                  ],
                  assetIds: [],
                },
              ],
            },
          ],
        },
      ],
      assets: [],
      uncertainties: [],
      exam: {},
    });

    const { draft } = importReviewedPaperExtract({
      baseDraft: createBaseDraft(),
      reviewedExtract: extract,
      importFilePath: 'extracted papers/SVT/M-2016.txt',
      importedAt: new Date('2026-04-18T00:00:00.000Z'),
    });

    const nodes = draft.variants[0]?.nodes ?? [];
    const question = nodes.find((node) => node.nodeType === 'QUESTION');
    const subquestions = nodes.filter(
      (node) => node.nodeType === 'SUBQUESTION',
    );

    expect(question).toMatchObject({
      label: 'السؤال 1',
      maxPoints: 1.75,
    });
    expect(question?.blocks).toEqual([]);
    expect(subquestions.map((subquestion) => subquestion.label)).toEqual([
      'الفقرة أ',
      'الفقرة ب',
      'الفقرة ج',
    ]);
    expect(subquestions.map((subquestion) => subquestion.maxPoints)).toEqual([
      0.25, 1, 0.5,
    ]);
    expect(
      subquestions.map((subquestion) => subquestion.blocks[0]?.value),
    ).toEqual(['حدّد النشاط.', 'تعرّف على المرحلتين.', 'علّل إجابتك.']);
  });
});
