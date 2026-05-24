import type {
  StructuredLabAnswerCell,
  StructuredLabLabelAnswer,
  StructuredLabMeasurementAnswer,
  StructuredLabObservationItem,
  StructuredLabWorkbenchPreset,
  StructuredLabWorkbenchResult,
} from "@bac-bank/contracts/lab";
import {
  parseStructuredLabWorkbenchPreset,
  parseStructuredLabWorkbenchResult,
} from "@bac-bank/contracts/lab";
import { evaluateDiagramLabels } from "@/lib/lab-diagram-labeling-engine";
import { evaluateDocumentReasoning } from "@/lib/lab-document-reasoning-engine";
import { evaluateLabMeasurements } from "@/lib/lab-formula-unit-engine";
import {
  evaluateLabTableCells,
  type LabTableEvaluation,
} from "@/lib/lab-table-engine";

export type StructuredLabWorkbenchAnswer = {
  answerCells: StructuredLabAnswerCell[];
  measurements: StructuredLabMeasurementAnswer[];
  labels: StructuredLabLabelAnswer[];
  selectedObservationIds: string[];
  conclusion: string;
};

export type StructuredLabWorkbenchEvaluation = {
  passed: boolean;
  tablePassed: boolean;
  measurementsPassed: boolean;
  labelsPassed: boolean;
  observationsPassed: boolean;
  conclusionPassed: boolean;
  correctCellCount: number;
  totalCellCount: number;
  missingObservationIds: string[];
  missingObservationItems: StructuredLabObservationItem[];
  missingKeywords: string[];
  table: LabTableEvaluation;
  measurements: ReturnType<typeof evaluateLabMeasurements>;
  diagram: ReturnType<typeof evaluateDiagramLabels>;
};

const emptyTableEvaluation: LabTableEvaluation = {
  passed: true,
  correctCount: 0,
  totalCount: 0,
  cells: [],
};

const emptyMeasurementEvaluation: ReturnType<typeof evaluateLabMeasurements> = {
  passed: true,
  measurements: [],
};

const emptyDiagramEvaluation: ReturnType<typeof evaluateDiagramLabels> = {
  passed: true,
  correctCount: 0,
  totalCount: 0,
  labels: [],
};

export function getStructuredLabWorkbenchPreset(
  value: unknown,
  fallback: StructuredLabWorkbenchPreset,
) {
  if (!value) {
    return fallback;
  }

  try {
    return parseStructuredLabWorkbenchPreset(value);
  } catch {
    return fallback;
  }
}

export function makeStructuredInitialAnswerCells(
  preset: StructuredLabWorkbenchPreset,
): StructuredLabAnswerCell[] {
  return (preset.expectedCells ?? []).map((cell) => ({
    rowId: cell.rowId,
    columnId: cell.columnId,
    value: null,
  }));
}

export function makeStructuredInitialMeasurements(
  preset: StructuredLabWorkbenchPreset,
): StructuredLabMeasurementAnswer[] {
  return (preset.measurements ?? []).map((measurement) => ({
    id: measurement.id,
    value: null,
    unit: measurement.unitHint ?? "",
  }));
}

export function makeStructuredInitialLabels(
  preset: StructuredLabWorkbenchPreset,
): StructuredLabLabelAnswer[] {
  return (preset.diagram?.targets ?? []).map((target) => ({
    targetId: target.id,
    label: "",
  }));
}

export function updateStructuredAnswerCell(
  answerCells: StructuredLabAnswerCell[],
  rowId: string,
  columnId: string,
  value: string,
): StructuredLabAnswerCell[] {
  const nextValue = value.trim() ? value : null;

  return answerCells.some(
    (cell) => cell.rowId === rowId && cell.columnId === columnId,
  )
    ? answerCells.map((cell) =>
        cell.rowId === rowId && cell.columnId === columnId
          ? { ...cell, value: nextValue }
          : cell,
      )
    : [...answerCells, { rowId, columnId, value: nextValue }];
}

export function updateStructuredMeasurement(
  measurements: StructuredLabMeasurementAnswer[],
  id: string,
  next: Partial<Pick<StructuredLabMeasurementAnswer, "value" | "unit">>,
): StructuredLabMeasurementAnswer[] {
  return measurements.some((measurement) => measurement.id === id)
    ? measurements.map((measurement) =>
        measurement.id === id ? { ...measurement, ...next } : measurement,
      )
    : [...measurements, { id, value: next.value ?? null, unit: next.unit ?? "" }];
}

export function updateStructuredLabel(
  labels: StructuredLabLabelAnswer[],
  targetId: string,
  label: string,
): StructuredLabLabelAnswer[] {
  return labels.some((answer) => answer.targetId === targetId)
    ? labels.map((answer) =>
        answer.targetId === targetId ? { ...answer, label } : answer,
      )
    : [...labels, { targetId, label }];
}

export function toggleStructuredObservation(
  selectedObservationIds: string[],
  observationId: string,
) {
  return selectedObservationIds.includes(observationId)
    ? selectedObservationIds.filter((selectedId) => selectedId !== observationId)
    : [...selectedObservationIds, observationId];
}

export function evaluateStructuredLabWorkbenchAnswer(
  preset: StructuredLabWorkbenchPreset,
  answer: StructuredLabWorkbenchAnswer,
): StructuredLabWorkbenchEvaluation {
  const table = preset.expectedCells?.length
    ? evaluateLabTableCells(preset.expectedCells, answer.answerCells)
    : emptyTableEvaluation;
  const measurements = preset.expectedMeasurements?.length
    ? evaluateLabMeasurements(
        preset.expectedMeasurements.map((measurement) => ({
          ...measurement,
          label:
            preset.measurements?.find((item) => item.id === measurement.id)
              ?.label ?? measurement.id,
        })),
        answer.measurements
          .filter(
            (measurement): measurement is {
              id: string;
              value: number;
              unit: string;
            } => measurement.value !== null,
          )
          .map((measurement) => ({
            id: measurement.id,
            value: measurement.value,
            unit: measurement.unit,
          })),
      )
    : emptyMeasurementEvaluation;
  const diagram = preset.diagram?.targets.length
    ? evaluateDiagramLabels(
        preset.diagram.targets.map((target) => ({
          id: target.id,
          title: target.label,
          hotspot: { x: target.x, y: target.y },
          expectedLabel: target.expectedLabel,
          acceptedLabels: target.acceptedLabels,
        })),
        answer.labels,
      )
    : emptyDiagramEvaluation;
  const reasoning = evaluateDocumentReasoning(
    {
      requiredEvidenceIds: preset.prompt.requiredObservationIds,
      requiredConclusionKeywords: preset.prompt.requiredConclusionKeywords,
    },
    {
      selectedEvidenceIds: answer.selectedObservationIds,
      conclusion: answer.conclusion,
    },
  );
  const missingObservationItems = preset.observationItems.filter((item) =>
    reasoning.missingEvidenceIds.includes(item.id),
  );

  return {
    passed:
      table.passed &&
      measurements.passed &&
      diagram.passed &&
      reasoning.passed,
    tablePassed: table.passed,
    measurementsPassed: measurements.passed,
    labelsPassed: diagram.passed,
    observationsPassed: reasoning.missingEvidenceIds.length === 0,
    conclusionPassed: reasoning.missingKeywords.length === 0,
    correctCellCount: table.correctCount,
    totalCellCount: table.totalCount,
    missingObservationIds: reasoning.missingEvidenceIds,
    missingObservationItems,
    missingKeywords: reasoning.missingKeywords,
    table,
    measurements,
    diagram,
  };
}

export function buildStructuredLabWorkbenchResult({
  tool,
  missionId,
  preset,
  answerCells,
  measurements,
  labels,
  graphPoints = [],
  selectedObservationIds,
  conclusion,
}: {
  tool: string;
  missionId?: string | null;
  preset: StructuredLabWorkbenchPreset;
  answerCells: StructuredLabAnswerCell[];
  measurements: StructuredLabMeasurementAnswer[];
  labels: StructuredLabLabelAnswer[];
  graphPoints?: { x: number; y: number; label?: string }[];
  selectedObservationIds: string[];
  conclusion: string;
}): StructuredLabWorkbenchResult {
  return parseStructuredLabWorkbenchResult({
    tool,
    missionId: missionId ?? null,
    presetId: preset.id,
    answerCells,
    measurements,
    labels,
    graphPoints,
    selectedObservationIds,
    conclusion,
    evaluation: evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells,
      measurements,
      labels,
      selectedObservationIds,
      conclusion,
    }),
  });
}
