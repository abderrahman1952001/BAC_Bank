import { describe, expect, it } from "vitest";
import type { StructuredLabWorkbenchPreset } from "@bac-bank/contracts/lab";
import {
  buildStructuredLabWorkbenchResult,
  evaluateStructuredLabWorkbenchAnswer,
  makeStructuredInitialAnswerCells,
  makeStructuredInitialLabels,
  makeStructuredInitialMeasurements,
  toggleStructuredObservation,
  updateStructuredAnswerCell,
  updateStructuredLabel,
  updateStructuredMeasurement,
} from "./lab-structured-workbench";

const preset = {
  id: "structured-demo",
  title: "Structured demo",
  subtitle: "Table, formula, diagram, and reasoning.",
  bacContext: "BAC-style structured workbench.",
  instrument: {
    subjectLabel: "Physics Lab",
    title: "Demo",
  },
  table: {
    title: "Readings",
    columns: [
      { id: "item", label: "Item" },
      { id: "value", label: "Value" },
    ],
    rows: [{ id: "tau", label: "tau", cells: { item: "tau", value: null } }],
  },
  diagram: {
    title: "Circuit",
    description: "RC circuit.",
    targets: [
      {
        id: "capacitor",
        label: "C",
        x: 45,
        y: 55,
        expectedLabel: "مكثفة",
        acceptedLabels: ["C"],
      },
    ],
  },
  measurements: [{ id: "capacitance", label: "C", unitHint: "F" }],
  expectedCells: [
    { rowId: "tau", columnId: "value", expectedValue: 4, tolerance: 0.1 },
  ],
  expectedMeasurements: [
    {
      id: "capacitance",
      expected: { value: 0.00004, unit: "F" },
      tolerance: 0.000001,
      acceptedUnits: ["farad"],
    },
  ],
  observationItems: [
    { id: "tau-63", label: "tau is read at 63%." },
    { id: "cap-stores-energy", label: "The capacitor stores energy." },
  ],
  prompt: {
    title: "Analyze",
    task: "Read tau and conclude.",
    requiredObservationIds: ["tau-63", "cap-stores-energy"],
    requiredConclusionKeywords: ["tau", "مكثفة"],
  },
} satisfies StructuredLabWorkbenchPreset;

describe("structured lab workbench", () => {
  it("evaluates table, formula, diagram, observations, and conclusion", () => {
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [{ rowId: "tau", columnId: "value", value: 4.02 }],
      measurements: [{ id: "capacitance", value: 0.00004, unit: "farad" }],
      labels: [{ targetId: "capacitor", label: "C" }],
      selectedObservationIds: ["tau-63", "cap-stores-energy"],
      conclusion: "tau يقرأ من المنحنى وشحن المكثفة يفسر الظاهرة.",
    });

    expect(evaluation).toMatchObject({
      passed: true,
      tablePassed: true,
      measurementsPassed: true,
      labelsPassed: true,
      observationsPassed: true,
      conclusionPassed: true,
    });
  });

  it("updates initial structured answer state immutably", () => {
    expect(makeStructuredInitialAnswerCells(preset)).toEqual([
      { rowId: "tau", columnId: "value", value: null },
    ]);
    expect(makeStructuredInitialMeasurements(preset)).toEqual([
      { id: "capacitance", value: null, unit: "F" },
    ]);
    expect(makeStructuredInitialLabels(preset)).toEqual([
      { targetId: "capacitor", label: "" },
    ]);
    expect(
      updateStructuredAnswerCell([], "tau", "value", "4")[0],
    ).toEqual({ rowId: "tau", columnId: "value", value: "4" });
    expect(updateStructuredMeasurement([], "capacitance", { unit: "F" })).toEqual([
      { id: "capacitance", value: null, unit: "F" },
    ]);
    expect(updateStructuredLabel([], "capacitor", "C")).toEqual([
      { targetId: "capacitor", label: "C" },
    ]);
    expect(toggleStructuredObservation([], "tau-63")).toEqual(["tau-63"]);
  });

  it("builds contract-valid result JSON", () => {
    const result = buildStructuredLabWorkbenchResult({
      tool: "physics-experiment-graphs",
      missionId: "mission-1",
      preset,
      answerCells: [{ rowId: "tau", columnId: "value", value: 4 }],
      measurements: [{ id: "capacitance", value: 0.00004, unit: "F" }],
      labels: [{ targetId: "capacitor", label: "مكثفة" }],
      selectedObservationIds: ["tau-63", "cap-stores-energy"],
      conclusion: "tau يقرأ من المنحنى وشحن المكثفة يفسر الظاهرة.",
    });

    expect(result).toMatchObject({
      tool: "physics-experiment-graphs",
      missionId: "mission-1",
      presetId: "structured-demo",
      evaluation: {
        passed: true,
      },
    });
  });
});
