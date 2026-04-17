import {
  resolveCurriculumStreamCodes,
  resolveSubjectCurriculumDefinitions,
} from './curriculum-sharing';

describe('curriculum-sharing', () => {
  it('keeps exact TM family codes intact for technology subjects', () => {
    expect(
      resolveSubjectCurriculumDefinitions({
        subjectCode: 'TECHNOLOGY_CIVIL',
        subjectStreamCodes: ['MT_CIVIL'],
      }),
    ).toEqual([
      expect.objectContaining({
        familyCode: 'mt-civil',
        streamCodes: ['MT_CIVIL'],
      }),
    ]);
  });

  it('expands shared family codes to the expected leaf streams', () => {
    expect(
      resolveCurriculumStreamCodes({
        familyCode: 'lp-le',
        subjectStreamCodes: ['LP', 'LE_GERMAN', 'LE_SPANISH', 'LE_ITALIAN'],
      }),
    ).toEqual(['LP', 'LE_GERMAN', 'LE_SPANISH', 'LE_ITALIAN']);
  });

  it('returns all subject streams for all-shared families', () => {
    expect(
      resolveCurriculumStreamCodes({
        familyCode: 'all',
        subjectStreamCodes: ['SE', 'M', 'MT_MECH'],
      }),
    ).toEqual(['SE', 'M', 'MT_MECH']);
  });
});
