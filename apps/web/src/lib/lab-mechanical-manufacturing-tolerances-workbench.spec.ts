import { describe, expect, it } from "vitest";
import {
  evaluateStructuredLabWorkbenchAnswer,
  makeStructuredInitialAnswerCells,
} from "./lab-structured-workbench";
import {
  getMechanicalManufacturingTolerancesWorkbenchPreset,
  mechanicalManufacturingTolerancesWorkbenchPresets,
} from "./lab-mechanical-manufacturing-tolerances-workbench";

describe("Mechanical Manufacturing and Tolerances Workbench", () => {
  it("accepts a shaft machining process sheet", () => {
    const preset = mechanicalManufacturingTolerancesWorkbenchPresets[0];
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [
        { rowId: "end-face", columnId: "operation", value: "dressage" },
        { rowId: "end-face", columnId: "machine", value: "مخرطة" },
        { rowId: "cylinder", columnId: "operation", value: "خراطة" },
        { rowId: "cylinder", columnId: "control", value: "ميكرومتر" },
        { rowId: "groove", columnId: "tool", value: "أداة مجرى" },
      ],
      measurements: [],
      labels: [],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "نختار مخرطة للخراطة ونراقب القطر بميكرومتر.",
    });

    expect(evaluation).toMatchObject({
      passed: true,
      tablePassed: true,
    });
  });

  it("accepts clearance fit calculations", () => {
    const preset = mechanicalManufacturingTolerancesWorkbenchPresets[1];
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [
        { rowId: "clearance-min", columnId: "min", value: 0.009 },
        { rowId: "clearance-min", columnId: "type", value: "خلوص" },
        { rowId: "clearance-max", columnId: "max", value: 0.05 },
        { rowId: "clearance-max", columnId: "type", value: "خلوص" },
      ],
      measurements: [
        { id: "min-clearance", value: 0.009, unit: "mm" },
        { id: "max-clearance", value: 0.05, unit: "mm" },
      ],
      labels: [],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "Jmin و Jmax موجبان إذن الملاءمة بخلوص.",
    });

    expect(evaluation).toMatchObject({
      passed: true,
      measurementsPassed: true,
    });
  });

  it("falls back to the machining process preset", () => {
    expect(
      getMechanicalManufacturingTolerancesWorkbenchPreset(undefined).id,
    ).toBe("shaft-machining-process-sheet");
    expect(
      makeStructuredInitialAnswerCells(
        mechanicalManufacturingTolerancesWorkbenchPresets[0],
      ),
    ).toHaveLength(5);
  });
});
