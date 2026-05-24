import { describe, expect, it } from "vitest";
import {
  buildMathGeometryComplexWorkbenchResult,
  calculateDistance,
  calculateVectorAffix,
  evaluateMathGeometryComplexWorkbenchAnswer,
  getMathGeometryComplexPreset,
  makeMathGeometryComplexInitialAnswerCells,
  mathGeometryComplexPresets,
  toggleMathGeometryComplexObservation,
  updateMathGeometryComplexAnswerCell,
} from "./lab-math-geometry-complex-plane";

describe("Math Geometry & Complex Plane Workbench", () => {
  it("accepts a complex-circle triangle classification", () => {
    const preset = mathGeometryComplexPresets[0];
    const evaluation = evaluateMathGeometryComplexWorkbenchAnswer(preset, {
      answerCells: [
        { rowId: "mod-a", columnId: "value", value: 2 },
        { rowId: "arg-a", columnId: "value", value: "π/2" },
        { rowId: "mod-b", columnId: "value", value: 2 },
        { rowId: "arg-b", columnId: "value", value: "5π/6" },
        { rowId: "mod-c", columnId: "value", value: 2 },
        { rowId: "circle", columnId: "value", value: "O و 2" },
        {
          rowId: "triangle",
          columnId: "value",
          value: "متساوي الساقين في B",
        },
      ],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion:
        "النقط على دائرة مركزها O ونصف قطرها 2، والمثلث ABC متساوي الساقين في B.",
    });

    expect(evaluation).toMatchObject({
      passed: true,
      tablePassed: true,
      observationsPassed: true,
      conclusionPassed: true,
      correctCellCount: 7,
    });
  });

  it("reports missing vector observations and conclusion keywords", () => {
    const preset = mathGeometryComplexPresets[1];
    const evaluation = evaluateMathGeometryComplexWorkbenchAnswer(preset, {
      answerCells: [{ rowId: "ab", columnId: "value", value: "3+i" }],
      selectedObservationIds: ["same-vector"],
      conclusion: "نحسب المتجهات.",
    });

    expect(evaluation.passed).toBe(false);
    expect(evaluation.correctCellCount).toBe(1);
    expect(evaluation.missingObservationIds).toEqual([
      "aligned-points",
      "translation-image",
    ]);
    expect(evaluation.missingKeywords).toContain("ترجمة");
  });

  it("accepts vector translation and alignment checks", () => {
    const preset = mathGeometryComplexPresets[1];
    const evaluation = evaluateMathGeometryComplexWorkbenchAnswer(preset, {
      answerCells: [
        { rowId: "ab", columnId: "value", value: "3+i" },
        { rowId: "bc", columnId: "value", value: "3+i" },
        { rowId: "distance", columnId: "value", value: "√10" },
        { rowId: "alignment", columnId: "value", value: "مستقيمة" },
        { rowId: "translation", columnId: "value", value: "C" },
      ],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "بما أن zB-zA=3+i فإن النقط مستقيمة وصورة B بترجمة AB هي C.",
    });

    expect(evaluation.passed).toBe(true);
  });

  it("computes reusable distance/vector helpers", () => {
    const preset = mathGeometryComplexPresets[1];
    const [a, b] = preset.plane.points;

    expect(calculateDistance(a, b)).toBeCloseTo(Math.sqrt(10));
    expect(calculateVectorAffix(a, b)).toEqual({ real: 3, imaginary: 1 });
  });

  it("updates answer and observation state immutably", () => {
    const preset = mathGeometryComplexPresets[1];
    const initial = makeMathGeometryComplexInitialAnswerCells(preset);

    expect(
      updateMathGeometryComplexAnswerCell(initial, "ab", "value", "3+i")[0],
    ).toEqual({ rowId: "ab", columnId: "value", value: "3+i" });
    expect(toggleMathGeometryComplexObservation([], "same-vector")).toEqual([
      "same-vector",
    ]);
  });

  it("builds result JSON with the shared contract parser", () => {
    const preset = mathGeometryComplexPresets[1];
    const result = buildMathGeometryComplexWorkbenchResult({
      missionId: "mission-geometry",
      preset,
      answerCells: [
        { rowId: "ab", columnId: "value", value: "3+i" },
        { rowId: "bc", columnId: "value", value: "3+i" },
        { rowId: "distance", columnId: "value", value: "√10" },
        { rowId: "alignment", columnId: "value", value: "مستقيمة" },
        { rowId: "translation", columnId: "value", value: "C" },
      ],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "zB-zA=3+i والنقط مستقيمة وصورة B بترجمة AB هي C.",
    });

    expect(result).toMatchObject({
      tool: "math-geometry-complex-plane",
      missionId: "mission-geometry",
      presetId: "vectors-translation-alignment",
      evaluation: {
        passed: true,
      },
    });
  });

  it("falls back to the first preset when mission preset data is invalid", () => {
    expect(getMathGeometryComplexPreset({ bad: true }).id).toBe(
      "complex-circle-isosceles-triangle",
    );
  });
});
