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

  it('does not count a full-page fallback crop as debt when a trusted native table is present', () => {
    const draft = createDraftWithFullPageAsset();
    draft.assets[0].classification = 'table';
    draft.variants[0].nodes[0].blocks[0] = {
      ...draft.variants[0].nodes[0].blocks[0],
      type: 'table',
      data: {
        rows: [
          ['A', 'B'],
          ['1', '2'],
        ],
      },
    };

    const validation = validateIngestionDraft(draft);

    expect(validation.errors).toEqual([]);
    expect(validation.issues).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({
          code: 'asset_crop_placeholder',
          assetId: 'asset-1',
        }),
      ]),
    );
  });

  it('requires chemistry structures to be visually checked before clearing crop debt', () => {
    const draft = createDraftWithFullPageAsset();
    draft.variants[0].nodes[0].blocks[0].data = {
      kind: 'chemistry_structure',
      chemistryStructure: {
        format: 'smiles',
        source: 'CCO',
        reviewStatus: 'candidate',
      },
    };

    const candidateValidation = validateIngestionDraft(draft);

    expect(candidateValidation.errors).toEqual([]);
    expect(candidateValidation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'asset_crop_placeholder',
          assetId: 'asset-1',
        }),
        expect.objectContaining({
          code: 'chemistry_structure_needs_visual_check',
          blockId: 'sujet_1_exercise_1_prompt_1',
        }),
      ]),
    );

    draft.variants[0].nodes[0].blocks[0].data = {
      kind: 'chemistry_structure',
      chemistryStructure: {
        format: 'smiles',
        source: 'CCO',
        reviewStatus: 'visual_checked',
      },
    };

    const checkedValidation = validateIngestionDraft(draft);

    expect(checkedValidation.errors).toEqual([]);
    expect(checkedValidation.issues).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({
          code: 'asset_crop_placeholder',
          assetId: 'asset-1',
        }),
        expect.objectContaining({
          code: 'chemistry_structure_needs_visual_check',
          blockId: 'sujet_1_exercise_1_prompt_1',
        }),
      ]),
    );
  });

  it('recognizes visually checked chemistry structure panels as native renders', () => {
    const draft = createDraftWithFullPageAsset();
    draft.variants[0].nodes[0].blocks[0].data = {
      kind: 'chemistry_structure',
      chemistryStructure: {
        layout: 'grid',
        reviewStatus: 'visual_checked',
        items: [
          {
            title: 'Ala',
            source: 'NC(C)C(=O)O',
          },
          {
            title: 'Ser',
            source: 'NC(CO)C(=O)O',
          },
        ],
      },
    };

    const validation = validateIngestionDraft(draft);

    expect(validation.errors).toEqual([]);
    expect(validation.issues).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({
          code: 'asset_crop_placeholder',
          assetId: 'asset-1',
        }),
        expect.objectContaining({
          code: 'chemistry_structure_needs_visual_check',
          blockId: 'sujet_1_exercise_1_prompt_1',
        }),
      ]),
    );
  });

  it('requires technical diagrams to be visually checked before clearing crop debt', () => {
    const draft = createDraftWithFullPageAsset();
    draft.variants[0].nodes[0].blocks[0].data = {
      kind: 'technical_flow',
      reviewStatus: 'candidate',
      nodes: [
        {
          id: 'step-1',
          x: 20,
          y: 20,
          width: 120,
          height: 48,
          label: 'Step 1',
          type: 'step',
        },
      ],
    };

    const candidateValidation = validateIngestionDraft(draft);

    expect(candidateValidation.errors).toEqual([]);
    expect(candidateValidation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'asset_crop_placeholder',
          assetId: 'asset-1',
        }),
        expect.objectContaining({
          code: 'technical_diagram_needs_visual_check',
          blockId: 'sujet_1_exercise_1_prompt_1',
        }),
      ]),
    );

    draft.variants[0].nodes[0].blocks[0].data = {
      ...draft.variants[0].nodes[0].blocks[0].data,
      reviewStatus: 'visual_checked',
    };

    const checkedValidation = validateIngestionDraft(draft);

    expect(checkedValidation.errors).toEqual([]);
    expect(checkedValidation.issues).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({
          code: 'asset_crop_placeholder',
          assetId: 'asset-1',
        }),
        expect.objectContaining({
          code: 'technical_diagram_needs_visual_check',
          blockId: 'sujet_1_exercise_1_prompt_1',
        }),
      ]),
    );
  });

  it('requires civil diagrams to be visually checked before clearing crop debt', () => {
    const draft = createDraftWithFullPageAsset();
    draft.variants[0].nodes[0].blocks[0].data = {
      kind: 'civil_diagram',
      civilDiagram: {
        elements: [
          {
            type: 'line',
            from: { x: 10, y: 20 },
            to: { x: 180, y: 20 },
          },
        ],
        reviewStatus: 'candidate',
      },
    };

    const candidateValidation = validateIngestionDraft(draft);

    expect(candidateValidation.errors).toEqual([]);
    expect(candidateValidation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'asset_crop_placeholder',
          assetId: 'asset-1',
        }),
        expect.objectContaining({
          code: 'civil_diagram_needs_visual_check',
          blockId: 'sujet_1_exercise_1_prompt_1',
        }),
      ]),
    );

    const candidateData = draft.variants[0].nodes[0].blocks[0].data as {
      civilDiagram: Record<string, unknown>;
    };
    draft.variants[0].nodes[0].blocks[0].data = {
      ...candidateData,
      civilDiagram: {
        ...candidateData.civilDiagram,
        reviewStatus: 'visual_checked',
      },
    };

    const checkedValidation = validateIngestionDraft(draft);

    expect(checkedValidation.errors).toEqual([]);
    expect(checkedValidation.issues).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({
          code: 'asset_crop_placeholder',
          assetId: 'asset-1',
        }),
        expect.objectContaining({
          code: 'civil_diagram_needs_visual_check',
          blockId: 'sujet_1_exercise_1_prompt_1',
        }),
      ]),
    );
  });

  it('allows part-first roots with exercises nested under the root part', () => {
    const draft = createDraftWithFullPageAsset();
    draft.assets = [];
    draft.variants[0].nodes = [
      {
        id: 'sujet_1_part_1',
        nodeType: 'PART',
        parentId: null,
        orderIndex: 1,
        label: 'الجزء الأول',
        maxPoints: null,
        topicCodes: [],
        blocks: [],
      },
      {
        id: 'sujet_1_exercise_1',
        nodeType: 'EXERCISE',
        parentId: 'sujet_1_part_1',
        orderIndex: 1,
        label: 'التمرين الأول',
        maxPoints: null,
        topicCodes: [],
        blocks: [],
      },
      {
        id: 'sujet_1_question_1',
        nodeType: 'QUESTION',
        parentId: 'sujet_1_exercise_1',
        orderIndex: 1,
        label: 'السؤال 1',
        maxPoints: 2,
        topicCodes: [],
        blocks: [
          {
            id: 'sujet_1_question_1_prompt',
            role: 'PROMPT',
            type: 'paragraph',
            value: 'حلل الوثيقة.',
            assetId: null,
          },
        ],
      },
    ];

    const validation = validateIngestionDraft(draft);

    expect(validation.errors).toEqual([]);
    expect(validation.issues).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({
          code: 'draft_has_no_root_exercise',
        }),
        expect.objectContaining({
          code: 'node_invalid_root_type',
        }),
        expect.objectContaining({
          code: 'exercise_invalid_parent',
        }),
      ]),
    );
  });

  it('allows the intentionally empty second variant for single-paper optional-root drafts', () => {
    const draft = createDraftWithFullPageAsset();
    draft.exam.subjectCode = 'PHILOSOPHY';
    draft.exam.metadata = {
      ...draft.exam.metadata,
      paperChoiceMode: 'single_paper_optional_roots',
    };

    const validation = validateIngestionDraft(draft);

    expect(validation.errors).toEqual([]);
    expect(validation.issues).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({
          code: 'variant_empty',
          variantCode: 'SUJET_2',
        }),
      ]),
    );
  });
});
