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

function readRecordArray(source: JsonRecord | null | undefined, key: string) {
  const value = source?.[key];

  return Array.isArray(value) ? value.filter(isRecord) : [];
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

function normalizeCheckText(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function readComparableNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.replace(',', '.'));

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function readComparableText(value: unknown) {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value);
  }

  return null;
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

function evaluateTableCells(exitCheck: JsonRecord, resultJson: JsonRecord) {
  const expectedCells = readRecordArray(exitCheck, 'expectedCells');
  const answerCells = readRecordArray(resultJson, 'answerCells');
  const answersByKey = new Map(
    answerCells.map((answer) => [
      `${readString(answer, 'rowId')}:${readString(answer, 'columnId')}`,
      answer,
    ]),
  );
  const cells = expectedCells.map((expected) => {
    const rowId = readString(expected, 'rowId');
    const columnId = readString(expected, 'columnId');
    const answer = answersByKey.get(`${rowId}:${columnId}`) ?? null;
    const expectedValue = expected.expectedValue;
    const actualValue = answer?.value ?? null;
    const expectedNumber = readComparableNumber(expectedValue);
    const actualNumber = readComparableNumber(actualValue);
    const expectedText = readComparableText(expectedValue);
    const actualText = readComparableText(actualValue);
    const tolerance = readNumber(expected, 'tolerance') ?? 0;
    const passed =
      expectedNumber !== null && actualNumber !== null
        ? Math.abs(actualNumber - expectedNumber) <= tolerance
        : actualText !== null &&
          [expectedText, ...readStringArray(expected, 'acceptedText')]
            .filter((value): value is string => value !== null)
            .map(normalizeCheckText)
            .includes(normalizeCheckText(actualText));

    return {
      rowId,
      columnId,
      expectedValue,
      actualValue,
      passed,
    };
  });
  const correctCount = cells.filter((cell) => cell.passed).length;
  const passed =
    expectedCells.length > 0 && correctCount === expectedCells.length;

  return buildEvaluation(
    'TABLE_CELLS',
    passed,
    passed
      ? 'خلايا الجدول توافق المهمة.'
      : 'بعض خلايا الجدول لا تزال غير صحيحة.',
    {
      correctCount,
      totalCount: expectedCells.length,
      cells,
    },
  );
}

function evaluateDiagramLabels(exitCheck: JsonRecord, resultJson: JsonRecord) {
  const targets = readRecordArray(exitCheck, 'targets');
  const labels = readRecordArray(resultJson, 'labels');
  const labelsByTarget = new Map(
    labels.map((label) => [readString(label, 'targetId'), label]),
  );
  const checkedLabels = targets.map((target) => {
    const targetId = readString(target, 'id');
    const expectedLabel = readString(target, 'expectedLabel') ?? '';
    const answer = labelsByTarget.get(targetId);
    const actualLabel = answer ? readString(answer, 'label') : null;
    const acceptedLabels = [
      expectedLabel,
      ...readStringArray(target, 'acceptedLabels'),
    ].map(normalizeCheckText);
    const passed = Boolean(
      actualLabel && acceptedLabels.includes(normalizeCheckText(actualLabel)),
    );

    return {
      targetId,
      expectedLabel,
      actualLabel,
      passed,
    };
  });
  const correctCount = checkedLabels.filter((label) => label.passed).length;
  const passed = targets.length > 0 && correctCount === targets.length;

  return buildEvaluation(
    'DIAGRAM_LABELS',
    passed,
    passed
      ? 'تسميات الرسم توافق المهمة.'
      : 'بعض تسميات الرسم لا تزال غير صحيحة.',
    {
      correctCount,
      totalCount: targets.length,
      labels: checkedLabels,
    },
  );
}

function evaluateDocumentEvidence(
  exitCheck: JsonRecord,
  resultJson: JsonRecord,
) {
  const requiredEvidenceIds = readStringArray(exitCheck, 'requiredEvidenceIds');
  const selectedEvidenceIds = new Set(
    readStringArray(resultJson, 'selectedEvidenceIds'),
  );
  const missingEvidenceIds = requiredEvidenceIds.filter(
    (evidenceId) => !selectedEvidenceIds.has(evidenceId),
  );
  const conclusion = normalizeCheckText(
    readString(resultJson, 'conclusion') ?? '',
  );
  const missingKeywords = readStringArray(
    exitCheck,
    'requiredConclusionKeywords',
  ).filter((keyword) => !conclusion.includes(normalizeCheckText(keyword)));
  const passed =
    missingEvidenceIds.length === 0 && missingKeywords.length === 0;

  return buildEvaluation(
    'DOCUMENT_EVIDENCE',
    passed,
    passed
      ? 'الأدلة والاستنتاج يوافقان المهمة.'
      : 'الأدلة أو الاستنتاج لا تزال ناقصة.',
    {
      requiredEvidenceIds,
      missingEvidenceIds,
      missingKeywords,
    },
  );
}

function evaluateFormulaValue(exitCheck: JsonRecord, resultJson: JsonRecord) {
  const expectedMeasurements = readRecordArray(
    exitCheck,
    'expectedMeasurements',
  );
  const measurements = readRecordArray(resultJson, 'measurements');
  const measurementsById = new Map(
    measurements.map((measurement) => [
      readString(measurement, 'id'),
      measurement,
    ]),
  );
  const checkedMeasurements = expectedMeasurements.map((expected) => {
    const id = readString(expected, 'id');
    const expectedPayload = isRecord(expected.expected)
      ? expected.expected
      : {};
    const actual = measurementsById.get(id) ?? null;
    const expectedValue = readNumber(expectedPayload, 'value');
    const actualValue = actual ? readNumber(actual, 'value') : null;
    const expectedUnit = readString(expectedPayload, 'unit') ?? '';
    const actualUnit = actual ? readString(actual, 'unit') : null;
    const tolerance = readNumber(expected, 'tolerance') ?? 0;
    const unitMatches = Boolean(
      actualUnit &&
      [expectedUnit, ...readStringArray(expected, 'acceptedUnits')]
        .map(normalizeCheckText)
        .includes(normalizeCheckText(actualUnit)),
    );
    const valueMatches = Boolean(
      expectedValue !== null &&
      actualValue !== null &&
      Math.abs(actualValue - expectedValue) <= tolerance,
    );

    return {
      id,
      expected: { value: expectedValue, unit: expectedUnit },
      actual: actual ? { value: actualValue, unit: actualUnit } : null,
      valueMatches,
      unitMatches,
      passed: valueMatches && unitMatches,
    };
  });
  const passed =
    checkedMeasurements.length > 0 &&
    checkedMeasurements.every((measurement) => measurement.passed);

  return buildEvaluation(
    'FORMULA_VALUE',
    passed,
    passed
      ? 'القيم والوحدات توافق المهمة.'
      : 'راجع القيم أو الوحدات قبل إنهاء المهمة.',
    {
      measurements: checkedMeasurements,
    },
  );
}

function evaluateGraphPoint(exitCheck: JsonRecord, resultJson: JsonRecord) {
  const expectedX = readNumber(exitCheck, 'x');
  const expectedY = readNumber(exitCheck, 'y');
  const tolerance = readNumber(exitCheck, 'tolerance') ?? 0;
  const graphPoints = readRecordArray(resultJson, 'graphPoints');
  const point = isRecord(resultJson.point) ? resultJson.point : null;
  const candidates = point ? [point, ...graphPoints] : graphPoints;
  const passed = candidates.some((candidate) => {
    const actualX = readNumber(candidate, 'x');
    const actualY = readNumber(candidate, 'y');

    return Boolean(
      expectedX !== null &&
      expectedY !== null &&
      actualX !== null &&
      actualY !== null &&
      Math.abs(actualX - expectedX) <= tolerance &&
      Math.abs(actualY - expectedY) <= tolerance,
    );
  });

  return buildEvaluation(
    'GRAPH_POINT',
    passed,
    passed
      ? 'النقطة المقروءة من المنحنى توافق المهمة.'
      : 'النقطة المقروءة من المنحنى لا تطابق المطلوب بعد.',
    {
      expected: {
        x: expectedX,
        y: expectedY,
        tolerance,
      },
      candidates,
    },
  );
}

function evaluateSvtExperimentalGraphTable(
  exitCheck: JsonRecord,
  resultJson: JsonRecord,
) {
  const expectedReadings = readRecordArray(exitCheck, 'expectedReadings');
  const readings = readRecordArray(resultJson, 'readings');
  const readingsById = new Map(
    readings.map((reading) => [readString(reading, 'id'), reading]),
  );
  const checkedReadings = expectedReadings.map((expected) => {
    const id = readString(expected, 'id');
    const expectedValue = readNumber(expected, 'expectedValue');
    const tolerance = readNumber(expected, 'tolerance') ?? 0;
    const answer = readingsById.get(id) ?? null;
    const actualValue = answer ? readComparableNumber(answer.value) : null;
    const passed =
      expectedValue !== null &&
      actualValue !== null &&
      Math.abs(actualValue - expectedValue) <= tolerance;

    return {
      id,
      label: readString(expected, 'label'),
      expectedValue,
      actualValue,
      tolerance,
      passed,
    };
  });
  const requiredObservationIds = readStringArray(
    exitCheck,
    'requiredObservationIds',
  );
  const selectedObservationIds = new Set(
    readStringArray(resultJson, 'selectedObservationIds'),
  );
  const missingObservationIds = requiredObservationIds.filter(
    (observationId) => !selectedObservationIds.has(observationId),
  );
  const conclusion = normalizeCheckText(
    readString(resultJson, 'conclusion') ?? '',
  );
  const missingKeywords = readStringArray(
    exitCheck,
    'requiredConclusionKeywords',
  ).filter((keyword) => !conclusion.includes(normalizeCheckText(keyword)));
  const readingPassCount = checkedReadings.filter(
    (reading) => reading.passed,
  ).length;
  const readingsPassed =
    expectedReadings.length > 0 && readingPassCount === expectedReadings.length;
  const passed =
    readingsPassed &&
    missingObservationIds.length === 0 &&
    missingKeywords.length === 0;

  return buildEvaluation(
    'SVT_EXPERIMENTAL_GRAPH_TABLE',
    passed,
    passed
      ? 'القراءات والملاحظات والاستنتاج توافق المهمة.'
      : 'القراءات أو الملاحظات أو الاستنتاج لا تزال ناقصة.',
    {
      readingPassCount,
      totalReadingCount: expectedReadings.length,
      readings: checkedReadings,
      requiredObservationIds,
      missingObservationIds,
      missingKeywords,
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
    case 'TABLE_CELLS':
      return evaluateTableCells(exitCheck, resultJson);
    case 'DIAGRAM_LABELS':
      return evaluateDiagramLabels(exitCheck, resultJson);
    case 'DOCUMENT_EVIDENCE':
      return evaluateDocumentEvidence(exitCheck, resultJson);
    case 'FORMULA_VALUE':
      return evaluateFormulaValue(exitCheck, resultJson);
    case 'GRAPH_POINT':
      return evaluateGraphPoint(exitCheck, resultJson);
    case 'SVT_EXPERIMENTAL_GRAPH_TABLE':
      return evaluateSvtExperimentalGraphTable(exitCheck, resultJson);
    default:
      return buildEvaluation(
        kind,
        false,
        'هذا النوع من تحقق المهمة غير مدعوم بعد.',
      );
  }
}
