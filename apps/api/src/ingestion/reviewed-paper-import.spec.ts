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

  it('preserves existing crop geometry when a refreshed extract omits crop boxes', () => {
    const baseDraft = createBaseDraft();
    baseDraft.assets = [
      {
        id: 'asset-1',
        sourcePageId: 'exam-page-1',
        documentKind: 'EXAM',
        pageNumber: 1,
        variantCode: 'SUJET_1',
        role: 'PROMPT',
        classification: 'image',
        cropBox: {
          x: 120,
          y: 240,
          width: 360,
          height: 220,
        },
        label: 'الشكل 1',
        notes: 'Reviewed crop.',
        nativeSuggestion: null,
      },
    ];
    const extract = parseReviewedPaperExtract({
      variants: [
        {
          code: 'SUJET_1',
          title: 'الموضوع الأول',
          exercises: [
            {
              orderIndex: 1,
              title: 'التمرين الأول',
              contextBlocks: [],
              assetIds: ['asset-1'],
              questions: [],
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
      ],
      uncertainties: [],
      exam: {},
    });

    const { draft, summary } = importReviewedPaperExtract({
      baseDraft,
      reviewedExtract: extract,
      importFilePath: 'extracted papers/SVT/M-2017.txt',
      importedAt: new Date('2026-04-18T00:00:00.000Z'),
    });

    expect(summary.placeholderAssetCount).toBe(0);
    expect(draft.exam.metadata.reviewedExtractCropGeometryCount).toBe(1);
    expect(draft.assets[0]).toMatchObject({
      id: 'asset-1',
      cropBox: {
        x: 120,
        y: 240,
        width: 360,
        height: 220,
      },
      notes:
        'Preserved existing crop geometry during reviewed extract import; verify before publication.',
    });
  });

  it('imports premium draft graph nodes with crop geometry and native render suggestions', () => {
    const extract = parseReviewedPaperExtract({
      variants: [
        {
          code: 'SUJET_1',
          title: 'الموضوع الأول',
          nodes: [
            {
              id: 's1_ex1',
              nodeType: 'EXERCISE',
              parentId: null,
              orderIndex: 1,
              label: 'التمرين الأول',
              maxPoints: 4,
              topicCodes: ['  unit_1 '],
              blocks: [
                {
                  id: 's1_ex1_prompt_1',
                  role: 'PROMPT',
                  type: 'paragraph',
                  value: 'سياق التمرين.',
                },
              ],
            },
            {
              id: 's1_ex1_q1',
              nodeType: 'QUESTION',
              parentId: 's1_ex1',
              orderIndex: 1,
              label: 'السؤال 1',
              maxPoints: 4,
              topicCodes: [],
              blocks: [
                {
                  id: 's1_ex1_q1_prompt_1',
                  role: 'PROMPT',
                  type: 'image',
                  value: '',
                  assetId: 'asset-table-1',
                },
              ],
            },
          ],
        },
      ],
      assets: [
        {
          id: 'asset-table-1',
          sourcePageId: 'exam-page-1',
          documentKind: 'EXAM',
          role: 'PROMPT',
          classification: 'table',
          pageNumber: 1,
          cropBox: {
            x: 100,
            y: 200,
            width: 420,
            height: 180,
          },
          label: 'جدول القياسات',
          variantCode: 'SUJET_1',
          nativeSuggestion: {
            type: 'table',
            value: '',
            data: {
              rows: [
                ['x', '0', '1'],
                ['f(x)', '2', '3'],
              ],
            },
            status: 'suggested',
            source: 'codex_app_extraction',
            notes: ['Rendered natively with image fallback.'],
          },
        },
      ],
      uncertainties: [],
      exam: {
        durationMinutes: 180,
        totalPoints: 20,
      },
    });

    const { draft, summary } = importReviewedPaperExtract({
      baseDraft: createBaseDraft(),
      reviewedExtract: extract,
      importFilePath: 'tmp/reviewed/svt-2025.json',
      importedAt: new Date('2026-04-18T00:00:00.000Z'),
    });

    expect(summary).toMatchObject({
      variantCount: 1,
      exerciseCount: 1,
      questionCount: 1,
      assetCount: 1,
      placeholderAssetCount: 0,
      missingVariantCodes: ['SUJET_2'],
    });
    expect(draft.exam.metadata).toMatchObject({
      reviewedExtractShape: 'draft_graph',
      reviewedExtractCropGeometryCount: 1,
      reviewedExtractNativeSuggestionCount: 1,
    });
    expect(draft.assets[0]).toMatchObject({
      id: 'asset-table-1',
      sourcePageId: 'exam-page-1',
      cropBox: {
        x: 100,
        y: 200,
        width: 420,
        height: 180,
      },
      nativeSuggestion: {
        type: 'table',
        source: 'codex_app_extraction',
      },
    });
    expect(draft.variants[0]?.nodes[0]?.topicCodes).toEqual(['UNIT_1']);
    expect(draft.variants[0]?.nodes[1]?.blocks[0]).toMatchObject({
      type: 'table',
      assetId: 'asset-table-1',
      data: {
        rows: [
          ['x', '0', '1'],
          ['f(x)', '2', '3'],
        ],
      },
    });
  });

  it('uses native asset suggestions for legacy reviewed asset blocks', () => {
    const extract = parseReviewedPaperExtract({
      variants: [
        {
          code: 'SUJET_1',
          title: 'الموضوع الأول',
          exercises: [
            {
              orderIndex: 1,
              title: 'التمرين الأول',
              contextBlocks: [],
              assetIds: ['asset-graph-1'],
              questions: [],
            },
          ],
        },
      ],
      assets: [
        {
          id: 'asset-graph-1',
          exerciseOrderIndex: 1,
          documentKind: 'EXAM',
          role: 'PROMPT',
          classification: 'graph',
          pageNumber: 1,
          caption: 'المنحنى',
          variantCode: 'SUJET_1',
          nativeSuggestion: {
            type: 'graph',
            value: '',
            data: {
              kind: 'formula_graph',
              curves: [{ fn: 'x^2' }],
            },
            source: 'reviewed_extract',
            notes: [],
          },
        },
      ],
      uncertainties: [],
      exam: {},
    });

    const { draft } = importReviewedPaperExtract({
      baseDraft: createBaseDraft(),
      reviewedExtract: extract,
      importFilePath: 'tmp/reviewed/graph.json',
    });

    expect(draft.variants[0]?.nodes[0]?.blocks[0]).toMatchObject({
      type: 'graph',
      assetId: 'asset-graph-1',
      data: {
        kind: 'formula_graph',
        curves: [{ fn: 'x^2' }],
      },
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
