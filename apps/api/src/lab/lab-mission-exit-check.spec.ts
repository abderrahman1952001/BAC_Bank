import { evaluateLabMissionExitCheck } from './lab-mission-exit-check';

describe('evaluateLabMissionExitCheck', () => {
  it('accepts roots that match the expected values within tolerance', () => {
    expect(
      evaluateLabMissionExitCheck(
        {
          kind: 'ROOTS_NEAR',
          expectedRoots: [1, 3],
          tolerance: 0.25,
        },
        {
          roots: [1.01, 2.99],
        },
      ),
    ).toMatchObject({
      passed: true,
      kind: 'ROOTS_NEAR',
    });
  });

  it('rejects roots when an extra unmatched root appears', () => {
    expect(
      evaluateLabMissionExitCheck(
        {
          kind: 'ROOTS_NEAR',
          expectedRoots: [1, 3],
          tolerance: 0.25,
        },
        {
          roots: [1, 2, 3],
        },
      ),
    ).toMatchObject({
      passed: false,
    });
  });

  it('accepts a vertex from the sampled extrema payload', () => {
    expect(
      evaluateLabMissionExitCheck(
        {
          kind: 'VERTEX_NEAR',
          expectedVertex: { x: 1, y: -4 },
          tolerance: 0.5,
        },
        {
          extrema: {
            minimum: { x: 1.02, y: -3.99 },
          },
        },
      ),
    ).toMatchObject({
      passed: true,
      kind: 'VERTEX_NEAR',
    });
  });

  it('accepts matching mRNA and codons', () => {
    expect(
      evaluateLabMissionExitCheck(
        {
          kind: 'MRNA_AND_CODONS',
          expectedMrna: 'AUGCUUGAA',
          expectedCodons: ['AUG', 'CUU', 'GAA'],
        },
        {
          mrnaSequence: 'AUGCUUGAA',
          mrnaCodons: ['AUG', 'CUU', 'GAA'],
        },
      ),
    ).toMatchObject({
      passed: true,
      kind: 'MRNA_AND_CODONS',
    });
  });

  it('accepts normalized mutation effects from tool comparison kinds', () => {
    expect(
      evaluateLabMissionExitCheck(
        {
          kind: 'MUTATION_EFFECT',
          acceptedEffects: ['amino-acid-change'],
        },
        {
          comparisonKind: 'AMINO_ACID_CHANGE',
        },
      ),
    ).toMatchObject({
      passed: true,
      kind: 'MUTATION_EFFECT',
    });
  });

  it('accepts reusable table and document checks', () => {
    expect(
      evaluateLabMissionExitCheck(
        {
          kind: 'TABLE_CELLS',
          expectedCells: [
            {
              rowId: 'trial-1',
              columnId: 'ph',
              expectedValue: 7.2,
              tolerance: 0.1,
            },
          ],
        },
        {
          answerCells: [{ rowId: 'trial-1', columnId: 'ph', value: 7.25 }],
        },
      ),
    ).toMatchObject({
      passed: true,
      kind: 'TABLE_CELLS',
    });

    expect(
      evaluateLabMissionExitCheck(
        {
          kind: 'DOCUMENT_EVIDENCE',
          requiredEvidenceIds: ['doc-a'],
          requiredConclusionKeywords: ['enzyme'],
        },
        {
          selectedEvidenceIds: ['doc-a'],
          conclusion: 'The enzyme activity changes.',
        },
      ),
    ).toMatchObject({
      passed: true,
      kind: 'DOCUMENT_EVIDENCE',
    });
  });

  it('accepts reusable diagram, formula, and graph checks', () => {
    expect(
      evaluateLabMissionExitCheck(
        {
          kind: 'DIAGRAM_LABELS',
          targets: [
            {
              id: 'target-1',
              expectedLabel: 'Ribosome',
              acceptedLabels: ['الريبوزوم'],
            },
          ],
        },
        {
          labels: [{ targetId: 'target-1', label: 'الريبوزوم' }],
        },
      ),
    ).toMatchObject({
      passed: true,
      kind: 'DIAGRAM_LABELS',
    });

    expect(
      evaluateLabMissionExitCheck(
        {
          kind: 'FORMULA_VALUE',
          expectedMeasurements: [
            {
              id: 'tau',
              expected: { value: 0.47, unit: 's' },
              tolerance: 0.02,
              acceptedUnits: ['sec'],
            },
          ],
        },
        {
          measurements: [{ id: 'tau', value: 0.48, unit: 'sec' }],
        },
      ),
    ).toMatchObject({
      passed: true,
      kind: 'FORMULA_VALUE',
    });

    expect(
      evaluateLabMissionExitCheck(
        {
          kind: 'GRAPH_POINT',
          x: 2,
          y: 8,
          tolerance: 0.25,
        },
        {
          graphPoints: [{ x: 2.1, y: 8.1 }],
        },
      ),
    ).toMatchObject({
      passed: true,
      kind: 'GRAPH_POINT',
    });
  });

  it('rejects SVT document workbench results when evidence or conclusion is missing', () => {
    expect(
      evaluateLabMissionExitCheck(
        {
          kind: 'DOCUMENT_EVIDENCE',
          requiredEvidenceIds: [
            'ldl-normal-entry',
            'r2-stop-codon',
            'ldl-accumulation',
          ],
          requiredConclusionKeywords: ['LDL', 'مستقبل', 'طفرة'],
        },
        {
          selectedEvidenceIds: ['ldl-normal-entry'],
          conclusion: 'تغيرت الحالة الصحية للشخص المصاب.',
        },
      ),
    ).toMatchObject({
      passed: false,
      kind: 'DOCUMENT_EVIDENCE',
      details: {
        missingEvidenceIds: ['r2-stop-codon', 'ldl-accumulation'],
        missingKeywords: ['LDL', 'مستقبل', 'طفرة'],
      },
    });
  });

  it('accepts SVT experimental graph/table results with required readings and observations', () => {
    expect(
      evaluateLabMissionExitCheck(
        {
          kind: 'SVT_EXPERIMENTAL_GRAPH_TABLE',
          expectedReadings: [
            {
              id: 'without-activity-25',
              label: 'النشاط دون الدواء عند 25 mmol',
              expectedValue: 9,
              tolerance: 0.4,
            },
            {
              id: 'with-activity-25',
              label: 'النشاط مع Glucobay عند 25 mmol',
              expectedValue: 4.2,
              tolerance: 0.45,
            },
          ],
          requiredObservationIds: [
            'without-rises-plateaus',
            'glucobay-lowers-activity',
          ],
          requiredConclusionKeywords: ['Glucobay', 'α غلوكوزيداز', 'يثبط'],
        },
        {
          readings: [
            { id: 'without-activity-25', value: 9.1 },
            { id: 'with-activity-25', value: 4.3 },
          ],
          selectedObservationIds: [
            'without-rises-plateaus',
            'glucobay-lowers-activity',
          ],
          conclusion: 'Glucobay يثبط نشاط α غلوكوزيداز.',
        },
      ),
    ).toMatchObject({
      passed: true,
      kind: 'SVT_EXPERIMENTAL_GRAPH_TABLE',
    });
  });

  it('rejects SVT experimental graph/table results with missing readings or conclusion terms', () => {
    expect(
      evaluateLabMissionExitCheck(
        {
          kind: 'SVT_EXPERIMENTAL_GRAPH_TABLE',
          expectedReadings: [
            {
              id: 'optimum-ph',
              label: 'pH الأمثل',
              expectedValue: 7,
              tolerance: 0.1,
            },
          ],
          requiredObservationIds: ['ph7-optimum'],
          requiredConclusionKeywords: ['pH', 'الموقع الفعال'],
        },
        {
          readings: [{ id: 'optimum-ph', value: 5 }],
          selectedObservationIds: [],
          conclusion: 'النشاط يتغير.',
        },
      ),
    ).toMatchObject({
      passed: false,
      kind: 'SVT_EXPERIMENTAL_GRAPH_TABLE',
      details: {
        readingPassCount: 0,
        missingObservationIds: ['ph7-optimum'],
        missingKeywords: ['pH', 'الموقع الفعال'],
      },
    });
  });
});
