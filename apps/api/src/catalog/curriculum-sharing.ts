export type SubjectCurriculumWindowDefinition = {
  familyCode: string;
  validFromYear: number;
  validToYear?: number | null;
};

export type ResolvedSubjectCurriculumDefinition =
  SubjectCurriculumWindowDefinition & {
    code: string;
    streamCodes: string[];
  };

const STREAM_ORDER: Record<string, number> = {
  SE: 10,
  M: 20,
  MT_CIVIL: 31,
  MT_ELEC: 32,
  MT_MECH: 33,
  MT_PROC: 34,
  GE: 40,
  LP: 50,
  LE_GERMAN: 61,
  LE_SPANISH: 62,
  LE_ITALIAN: 63,
  ARTS: 70,
};

export const SUBJECT_CURRICULUM_WINDOWS: Record<
  string,
  SubjectCurriculumWindowDefinition[]
> = {
  ACCOUNTING_FINANCE: [{ familyCode: 'ge', validFromYear: 2008 }],
  AMAZIGH: [{ familyCode: 'all', validFromYear: 2008 }],
  ARABIC: [
    { familyCode: 'se-m-tm-ge', validFromYear: 2008 },
    { familyCode: 'lp', validFromYear: 2008 },
    { familyCode: 'le', validFromYear: 2008 },
  ],
  ARTS: [{ familyCode: 'arts', validFromYear: 2008 }],
  ECONOMICS_MANAGEMENT: [{ familyCode: 'ge', validFromYear: 2008 }],
  ENGLISH: [
    { familyCode: 'se-m-tm-ge', validFromYear: 2008 },
    { familyCode: 'lp', validFromYear: 2008 },
    { familyCode: 'le', validFromYear: 2008 },
  ],
  FRENCH: [
    { familyCode: 'se-m-tm-ge', validFromYear: 2008 },
    { familyCode: 'lp', validFromYear: 2008 },
    { familyCode: 'le', validFromYear: 2008 },
  ],
  GERMAN: [{ familyCode: 'le', validFromYear: 2008 }],
  HISTORY_GEOGRAPHY: [
    { familyCode: 'se-m-tm', validFromYear: 2008 },
    { familyCode: 'ge', validFromYear: 2008 },
    { familyCode: 'lp', validFromYear: 2008 },
    { familyCode: 'le', validFromYear: 2008 },
  ],
  ISLAMIC_STUDIES: [{ familyCode: 'all', validFromYear: 2008 }],
  ITALIAN: [{ familyCode: 'le', validFromYear: 2015 }],
  LAW: [{ familyCode: 'ge', validFromYear: 2008 }],
  MATHEMATICS: [
    { familyCode: 'se', validFromYear: 2008 },
    { familyCode: 'm', validFromYear: 2008 },
    { familyCode: 'tm', validFromYear: 2008 },
    { familyCode: 'ge', validFromYear: 2008 },
    { familyCode: 'lp-le', validFromYear: 2008 },
  ],
  NATURAL_SCIENCES: [
    { familyCode: 'se', validFromYear: 2008 },
    { familyCode: 'm', validFromYear: 2008 },
  ],
  PHILOSOPHY: [
    {
      familyCode: 'se-m-tm-ge',
      validFromYear: 2008,
      validToYear: 2011,
    },
    { familyCode: 'se-m', validFromYear: 2012 },
    { familyCode: 'tm-ge', validFromYear: 2012 },
    { familyCode: 'lp', validFromYear: 2008 },
    { familyCode: 'le', validFromYear: 2008 },
  ],
  PHYSICS: [
    { familyCode: 'se', validFromYear: 2008 },
    { familyCode: 'm-tm', validFromYear: 2008 },
  ],
  SPANISH: [{ familyCode: 'le', validFromYear: 2008 }],
  TECHNOLOGY_CIVIL: [{ familyCode: 'mt-civil', validFromYear: 2008 }],
  TECHNOLOGY_ELECTRICAL: [{ familyCode: 'mt-elec', validFromYear: 2008 }],
  TECHNOLOGY_MECHANICAL: [{ familyCode: 'mt-mech', validFromYear: 2008 }],
  TECHNOLOGY_PROCESS: [{ familyCode: 'mt-proc', validFromYear: 2008 }],
};

export function buildSubjectCurriculumCode(
  definition: SubjectCurriculumWindowDefinition,
) {
  const familySegment = definition.familyCode
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_');
  const endYear =
    definition.validToYear === null || definition.validToYear === undefined
      ? 'OPEN'
      : `${definition.validToYear}`;

  return `${familySegment}__${definition.validFromYear}__${endYear}`;
}

export function buildSubjectCurriculumTitle(
  subjectName: string,
  definition: SubjectCurriculumWindowDefinition,
) {
  const familyLabel = definition.familyCode.toUpperCase();
  const rangeLabel =
    definition.validToYear === null || definition.validToYear === undefined
      ? `${definition.validFromYear}+`
      : `${definition.validFromYear}-${definition.validToYear}`;

  return `${subjectName} • ${familyLabel} • ${rangeLabel}`;
}

export function resolveSubjectCurriculumDefinitions(input: {
  subjectCode: string;
  subjectStreamCodes: string[];
}) {
  const windows = SUBJECT_CURRICULUM_WINDOWS[input.subjectCode] ?? [];

  return windows.map((definition) => ({
    ...definition,
    code: buildSubjectCurriculumCode(definition),
    streamCodes: resolveCurriculumStreamCodes({
      familyCode: definition.familyCode,
      subjectStreamCodes: input.subjectStreamCodes,
    }),
  }));
}

export function resolveCurriculumStreamCodes(input: {
  familyCode: string;
  subjectStreamCodes: string[];
}) {
  const normalizedSubjectStreamCodes = normalizeStreamCodes(
    input.subjectStreamCodes,
  );

  if (input.familyCode === 'all') {
    return normalizedSubjectStreamCodes;
  }

  const exactFamilyCodes = expandFamilyTokenToStreamCodes(
    input.familyCode,
    normalizedSubjectStreamCodes,
  );

  if (exactFamilyCodes.length > 0) {
    return normalizeStreamCodes(exactFamilyCodes);
  }

  const expandedCodes = input.familyCode
    .split('-')
    .flatMap((token) =>
      expandFamilyTokenToStreamCodes(token, normalizedSubjectStreamCodes),
    );

  return normalizeStreamCodes(
    expandedCodes.filter((code) => normalizedSubjectStreamCodes.includes(code)),
  );
}

function normalizeStreamCodes(streamCodes: string[]) {
  return Array.from(
    new Set(
      streamCodes
        .map((value) => value.trim().toUpperCase())
        .filter((value) => value.length > 0),
    ),
  ).sort(compareStreamCodes);
}

function compareStreamCodes(left: string, right: string) {
  const leftRank = STREAM_ORDER[left] ?? Number.MAX_SAFE_INTEGER;
  const rightRank = STREAM_ORDER[right] ?? Number.MAX_SAFE_INTEGER;

  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  return left.localeCompare(right);
}

function expandFamilyTokenToStreamCodes(
  token: string,
  subjectStreamCodes: string[],
) {
  switch (token.trim().toLowerCase()) {
    case 'se':
      return subjectStreamCodes.filter((code) => code === 'SE');
    case 'm':
      return subjectStreamCodes.filter((code) => code === 'M');
    case 'tm':
      return subjectStreamCodes.filter((code) => code.startsWith('MT_'));
    case 'ge':
      return subjectStreamCodes.filter((code) => code === 'GE');
    case 'lp':
      return subjectStreamCodes.filter((code) => code === 'LP');
    case 'le':
      return subjectStreamCodes.filter((code) => code.startsWith('LE_'));
    case 'arts':
      return subjectStreamCodes.filter((code) => code === 'ARTS');
    case 'mt-civil':
      return subjectStreamCodes.filter((code) => code === 'MT_CIVIL');
    case 'mt-elec':
      return subjectStreamCodes.filter((code) => code === 'MT_ELEC');
    case 'mt-mech':
      return subjectStreamCodes.filter((code) => code === 'MT_MECH');
    case 'mt-proc':
      return subjectStreamCodes.filter((code) => code === 'MT_PROC');
    default: {
      const normalizedToken = token.trim().toUpperCase().replace(/-/g, '_');

      return subjectStreamCodes.filter((code) => code === normalizedToken);
    }
  }
}
