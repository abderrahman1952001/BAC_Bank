type JsonRecord = Record<string, unknown>;

type Point = {
  x: number;
  y: number;
};

export type LabMissionExitCheckEvaluation = {
  kind: string | null;
  passed: boolean;
  message: string;
  details?: JsonRecord;
};

const DEFAULT_ROOT_TOLERANCE = 0.25;
const DEFAULT_VERTEX_TOLERANCE = 0.5;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readString(source: JsonRecord | null | undefined, key: string) {
  const value = source?.[key];

  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readNumber(source: JsonRecord | null | undefined, key: string) {
  const value = source?.[key];

  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readNumberArray(source: JsonRecord | null | undefined, key: string) {
  const value = source?.[key];

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is number => typeof item === 'number' && Number.isFinite(item),
  );
}

function readStringArray(source: JsonRecord | null | undefined, key: string) {
  const value = source?.[key];

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function readPoint(value: unknown): Point | null {
  if (!isRecord(value)) {
    return null;
  }

  const x = readNumber(value, 'x');
  const y = readNumber(value, 'y');

  return x === null || y === null ? null : { x, y };
}

function normalizeSequence(value: string) {
  return value.toUpperCase().replace(/\s+/g, '');
}

function normalizeEffect(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  switch (normalized) {
    case 'no_visible_change':
    case 'no-visible-change':
    case 'silent':
      return 'silent';
    case 'amino_acid_change':
    case 'amino-acid-change':
      return 'amino-acid-change';
    case 'premature_stop':
    case 'premature-stop':
    case 'stop':
      return 'stop';
    case 'frameshift':
      return 'frameshift';
    default:
      return normalized;
  }
}

function buildEvaluation(
  kind: string | null,
  passed: boolean,
  message: string,
  details?: JsonRecord,
): LabMissionExitCheckEvaluation {
  return details
    ? { kind, passed, message, details }
    : { kind, passed, message };
}

function hasValidationError(resultJson: JsonRecord) {
  const validationError = readString(resultJson, 'validationError');

  return validationError
    ? buildEvaluation(
        readString(resultJson, 'kind'),
        false,
        'أصلح مدخلات المختبر قبل إنهاء المهمة.',
        { validationError },
      )
    : null;
}

function matchesExpectedRoots(
  expectedRoots: number[],
  actualRoots: number[],
  tolerance: number,
) {
  if (!expectedRoots.length || !actualRoots.length) {
    return false;
  }

  const expectedMatched = expectedRoots.every((expected) =>
    actualRoots.some((actual) => Math.abs(actual - expected) <= tolerance),
  );
  const actualMatched = actualRoots.every((actual) =>
    expectedRoots.some((expected) => Math.abs(actual - expected) <= tolerance),
  );

  return expectedMatched && actualMatched;
}

function evaluateRootsNear(
  kind: string,
  exitCheck: JsonRecord,
  resultJson: JsonRecord,
) {
  const validation = hasValidationError(resultJson);

  if (validation) {
    return { ...validation, kind };
  }

  const expectedRoots = readNumberArray(exitCheck, 'expectedRoots');
  const actualRoots = readNumberArray(resultJson, 'roots');
  const tolerance =
    readNumber(exitCheck, 'tolerance') ?? DEFAULT_ROOT_TOLERANCE;
  const passed = matchesExpectedRoots(expectedRoots, actualRoots, tolerance);

  return buildEvaluation(
    kind,
    passed,
    passed
      ? 'الجذور الحالية توافق شرط المهمة.'
      : 'الجذور الحالية لا تطابق الجذور المطلوبة بعد.',
    {
      expectedRoots,
      actualRoots,
      tolerance,
    },
  );
}

function collectPointCandidates(resultJson: JsonRecord) {
  const candidates: Point[] = [];
  const vertex = readPoint(resultJson.vertex);

  if (vertex) {
    candidates.push(vertex);
  }

  const extrema = isRecord(resultJson.extrema) ? resultJson.extrema : null;
  const minimum = readPoint(extrema?.minimum);
  const maximum = readPoint(extrema?.maximum);

  if (minimum) {
    candidates.push(minimum);
  }

  if (maximum) {
    candidates.push(maximum);
  }

  const tableRows = Array.isArray(resultJson.tableRows)
    ? resultJson.tableRows
    : [];

  for (const row of tableRows) {
    const point = readPoint(row);

    if (point) {
      candidates.push(point);
    }
  }

  return candidates;
}

function evaluateVertexNear(exitCheck: JsonRecord, resultJson: JsonRecord) {
  const validation = hasValidationError(resultJson);

  if (validation) {
    return { ...validation, kind: 'VERTEX_NEAR' };
  }

  const expectedVertex = readPoint(exitCheck.expectedVertex);
  const candidates = collectPointCandidates(resultJson);
  const tolerance =
    readNumber(exitCheck, 'tolerance') ?? DEFAULT_VERTEX_TOLERANCE;
  const matchedCandidate = expectedVertex
    ? candidates.find(
        (candidate) =>
          Math.abs(candidate.x - expectedVertex.x) <= tolerance &&
          Math.abs(candidate.y - expectedVertex.y) <= tolerance,
      )
    : null;
  const passed = Boolean(expectedVertex && matchedCandidate);

  return buildEvaluation(
    'VERTEX_NEAR',
    passed,
    passed
      ? 'نقطة الرأس الحالية توافق شرط المهمة.'
      : 'نقطة الرأس الحالية لا تطابق المطلوب بعد.',
    {
      expectedVertex,
      actualCandidates: candidates,
      tolerance,
    },
  );
}

function evaluateMrnaAndCodons(exitCheck: JsonRecord, resultJson: JsonRecord) {
  const expectedMrna = readString(exitCheck, 'expectedMrna');
  const actualMrna = readString(resultJson, 'mrnaSequence');
  const expectedCodons = readStringArray(exitCheck, 'expectedCodons').map(
    normalizeSequence,
  );
  const actualCodons = readStringArray(resultJson, 'mrnaCodons').map(
    normalizeSequence,
  );
  const mrnaMatches =
    Boolean(expectedMrna && actualMrna) &&
    normalizeSequence(expectedMrna ?? '') ===
      normalizeSequence(actualMrna ?? '');
  const codonsMatch =
    expectedCodons.length > 0 &&
    expectedCodons.length === actualCodons.length &&
    expectedCodons.every((codon, index) => codon === actualCodons[index]);
  const passed = mrnaMatches && codonsMatch;

  return buildEvaluation(
    'MRNA_AND_CODONS',
    passed,
    passed
      ? 'mRNA والرامزات توافق شرط المهمة.'
      : 'mRNA أو الرامزات لا تطابق المطلوب بعد.',
    {
      expectedMrna,
      actualMrna,
      expectedCodons,
      actualCodons,
    },
  );
}

function evaluateMutationEffect(exitCheck: JsonRecord, resultJson: JsonRecord) {
  const acceptedEffects = readStringArray(exitCheck, 'acceptedEffects').map(
    normalizeEffect,
  );
  const actualEffect =
    normalizeEffect(readString(resultJson, 'mutationEffect')) ??
    normalizeEffect(readString(resultJson, 'comparisonKind'));
  const passed = Boolean(
    actualEffect && acceptedEffects.includes(actualEffect),
  );

  return buildEvaluation(
    'MUTATION_EFFECT',
    passed,
    passed
      ? 'أثر الطفرة الحالي يقع ضمن الشروط المقبولة.'
      : 'أثر الطفرة الحالي لا يطابق المطلوب بعد.',
    {
      acceptedEffects,
      actualEffect,
    },
  );
}

export function evaluateLabMissionExitCheck(
  exitCheck: JsonRecord | null,
  resultJson: JsonRecord | null | undefined,
): LabMissionExitCheckEvaluation {
  if (!exitCheck) {
    return buildEvaluation(null, true, 'لا يوجد شرط تحقق لهذه المهمة.');
  }

  const kind = readString(exitCheck, 'kind');

  if (!kind) {
    return buildEvaluation(
      null,
      false,
      'شرط تحقق المهمة غير مكتمل ولا يمكن اعتماد الإنجاز.',
    );
  }

  if (!resultJson) {
    return buildEvaluation(
      kind,
      false,
      'لم أجد نتيجة المختبر لحفظ إنجاز المهمة.',
    );
  }

  switch (kind) {
    case 'ROOTS_NEAR':
    case 'SIGN_INTERVALS':
      return evaluateRootsNear(kind, exitCheck, resultJson);
    case 'VERTEX_NEAR':
      return evaluateVertexNear(exitCheck, resultJson);
    case 'MRNA_AND_CODONS':
      return evaluateMrnaAndCodons(exitCheck, resultJson);
    case 'MUTATION_EFFECT':
      return evaluateMutationEffect(exitCheck, resultJson);
    default:
      return buildEvaluation(
        kind,
        false,
        'هذا النوع من تحقق المهمة غير مدعوم بعد.',
      );
  }
}
