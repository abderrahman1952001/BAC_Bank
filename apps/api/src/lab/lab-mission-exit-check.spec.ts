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
});
