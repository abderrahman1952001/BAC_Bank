import { normalizeIngestionDraft } from './ingestion.contract';

function buildRawDraft() {
  return {
    exam: {
      year: 2025,
      streamCode: 'SE',
      subjectCode: 'MATH',
      sessionType: 'NORMAL',
      provider: 'manual_upload',
      title: 'Draft',
      minYear: 2025,
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
    variants: [],
  };
}

describe('normalizeIngestionDraft', () => {
  it('coerces integer-like exam years from legacy draft payloads', () => {
    const draft = normalizeIngestionDraft({
      ...buildRawDraft(),
      exam: {
        ...buildRawDraft().exam,
        year: '2025',
        minYear: '2008',
      },
    });

    expect(draft.exam.year).toBe(2025);
    expect(draft.exam.minYear).toBe(2008);
  });

  it('still rejects non-integer year values', () => {
    expect(() =>
      normalizeIngestionDraft({
        ...buildRawDraft(),
        exam: {
          ...buildRawDraft().exam,
          year: '2025.5',
        },
      }),
    ).toThrow('draft_json.exam.year must be an integer.');
  });

  it('normalizes asset cleanup flags and masks', () => {
    const draft = normalizeIngestionDraft({
      ...buildRawDraft(),
      assets: [
        {
          id: 'asset-1',
          sourcePageId: 'page-1',
          documentKind: 'EXAM',
          pageNumber: 1,
          role: 'PROMPT',
          classification: 'image',
          cropBox: {
            x: 0,
            y: 0,
            width: 100,
            height: 80,
          },
          cleanupRequired: true,
          cleanupMasks: [
            {
              x: 4,
              y: 5,
              width: 20,
              height: 10,
            },
          ],
          label: null,
          notes: null,
        },
      ],
    });

    expect(draft.assets[0]?.cleanupRequired).toBe(true);
    expect(draft.assets[0]?.cleanupMasks).toEqual([
      {
        x: 4,
        y: 5,
        width: 20,
        height: 10,
        fill: 'white',
      },
    ]);
  });
});
