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
});
