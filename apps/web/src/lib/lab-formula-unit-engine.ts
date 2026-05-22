export type LabMeasurement = {
  value: number;
  unit: string;
};

export type LabExpectedMeasurement = {
  id: string;
  label: string;
  expected: LabMeasurement;
  tolerance?: number;
  acceptedUnits?: string[];
};

export type LabSubmittedMeasurement = {
  id: string;
  value: number;
  unit: string;
};

export type LabMeasurementEvaluation = {
  id: string;
  passed: boolean;
  valueMatches: boolean;
  unitMatches: boolean;
  expected: LabMeasurement;
  actual: LabMeasurement | null;
};

export type LabFormulaStepEvaluation = {
  passed: boolean;
  missingStepIds: string[];
};

function normalizeUnit(unit: string) {
  return unit
    .trim()
    .replace(/\s+/g, "")
    .replace(/[·⋅]/g, ".")
    .toLowerCase();
}

export function compareLabMeasurement(
  expected: LabExpectedMeasurement,
  actual: LabSubmittedMeasurement | null | undefined,
): LabMeasurementEvaluation {
  if (!actual || !Number.isFinite(actual.value)) {
    return {
      id: expected.id,
      passed: false,
      valueMatches: false,
      unitMatches: false,
      expected: expected.expected,
      actual: null,
    };
  }

  const tolerance = expected.tolerance ?? 0;
  const valueMatches =
    Math.abs(actual.value - expected.expected.value) <= tolerance;
  const acceptedUnits = [
    expected.expected.unit,
    ...(expected.acceptedUnits ?? []),
  ].map(normalizeUnit);
  const unitMatches = acceptedUnits.includes(normalizeUnit(actual.unit));

  return {
    id: expected.id,
    passed: valueMatches && unitMatches,
    valueMatches,
    unitMatches,
    expected: expected.expected,
    actual: {
      value: actual.value,
      unit: actual.unit,
    },
  };
}

export function evaluateLabMeasurements(
  expectedMeasurements: LabExpectedMeasurement[],
  submittedMeasurements: LabSubmittedMeasurement[],
) {
  const submittedById = new Map(
    submittedMeasurements.map((measurement) => [measurement.id, measurement]),
  );
  const measurements = expectedMeasurements.map((expected) =>
    compareLabMeasurement(expected, submittedById.get(expected.id)),
  );

  return {
    passed: measurements.every((measurement) => measurement.passed),
    measurements,
  };
}

export function evaluateFormulaSteps(
  requiredStepIds: string[],
  submittedStepIds: string[],
): LabFormulaStepEvaluation {
  const submitted = new Set(submittedStepIds);
  const missingStepIds = requiredStepIds.filter(
    (stepId) => !submitted.has(stepId),
  );

  return {
    passed: missingStepIds.length === 0,
    missingStepIds,
  };
}
