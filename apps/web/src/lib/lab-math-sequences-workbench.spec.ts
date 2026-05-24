import { describe, expect, it } from "vitest";
import {
  buildMathSequencesWorkbenchResult,
  evaluateMathSequencesWorkbenchAnswer,
  getMathSequenceGraphPoints,
  getMathSequencesWorkbenchPreset,
  makeMathSequencesInitialAnswerCells,
  mathSequencesWorkbenchPresets,
  toggleMathSequenceObservation,
  updateMathSequencesAnswerCell,
} from "./lab-math-sequences-workbench";

describe("Math Sequences Workbench", () => {
  it("accepts an affine recurrence analysis with geometric transform", () => {
    const preset = mathSequencesWorkbenchPresets[0];
    const evaluation = evaluateMathSequencesWorkbenchAnswer(preset, {
      answerCells: [
        { rowId: "n0", columnId: "v", value: -2 },
        { rowId: "n1", columnId: "u", value: "14/5" },
        { rowId: "n1", columnId: "v", value: "-6/5" },
        { rowId: "n2", columnId: "u", value: "82/25" },
        { rowId: "n2", columnId: "v", value: "-18/25" },
        { rowId: "ratio", columnId: "v", value: "3/5" },
        { rowId: "limit", columnId: "u", value: 4 },
      ],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "vₙ متتالية هندسية أساسها 3/5، ومنه vₙ يؤول إلى 0 و uₙ يؤول إلى 4.",
    });

    expect(evaluation).toMatchObject({
      passed: true,
      tablePassed: true,
      observationsPassed: true,
      conclusionPassed: true,
      correctCellCount: 7,
      totalCellCount: 7,
    });
  });

  it("reports missing cells, observations, and conclusion keywords", () => {
    const preset = mathSequencesWorkbenchPresets[0];
    const evaluation = evaluateMathSequencesWorkbenchAnswer(preset, {
      answerCells: [{ rowId: "n1", columnId: "u", value: 2.8 }],
      selectedObservationIds: ["terms-approach-4"],
      conclusion: "نحسب بعض الحدود.",
    });

    expect(evaluation.passed).toBe(false);
    expect(evaluation.correctCellCount).toBe(1);
    expect(evaluation.missingObservationIds).toEqual([
      "v-geometric-q",
      "limit-fixed-point",
    ]);
    expect(evaluation.missingKeywords).toContain("هندسية");
  });

  it("accepts arithmetic sequence membership and sum checks", () => {
    const preset = mathSequencesWorkbenchPresets[1];
    const evaluation = evaluateMathSequencesWorkbenchAnswer(preset, {
      answerCells: [
        { rowId: "u0", columnId: "value", value: -9 },
        { rowId: "u1", columnId: "value", value: -6 },
        { rowId: "u2", columnId: "value", value: -3 },
        { rowId: "r", columnId: "value", value: 3 },
        { rowId: "n2025", columnId: "value", value: 678 },
        { rowId: "sum", columnId: "value", value: 684432 },
      ],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion:
        "المتتالية حسابية أساسها 3، وبتحل 3n-9=2025 نجد n=678 ثم نحسب مجموع الحدود.",
    });

    expect(evaluation.passed).toBe(true);
  });

  it("updates state and derives graph points from numeric sequence rows", () => {
    const preset = mathSequencesWorkbenchPresets[0];
    const initial = makeMathSequencesInitialAnswerCells(preset);
    const updated = updateMathSequencesAnswerCell(initial, "n1", "u", "2.8");

    expect(initial[1]).toEqual({ rowId: "n1", columnId: "u", value: null });
    expect(updated[1]).toEqual({ rowId: "n1", columnId: "u", value: "2.8" });
    expect(toggleMathSequenceObservation([], "v-geometric-q")).toEqual([
      "v-geometric-q",
    ]);
    expect(getMathSequenceGraphPoints(preset)).toEqual([{ n: 0, value: 2 }]);
  });

  it("builds result JSON with the shared contract parser", () => {
    const preset = mathSequencesWorkbenchPresets[1];
    const result = buildMathSequencesWorkbenchResult({
      missionId: "mission-sequence",
      preset,
      answerCells: [
        { rowId: "u0", columnId: "value", value: -9 },
        { rowId: "u1", columnId: "value", value: -6 },
        { rowId: "u2", columnId: "value", value: -3 },
        { rowId: "r", columnId: "value", value: 3 },
        { rowId: "n2025", columnId: "value", value: 678 },
        { rowId: "sum", columnId: "value", value: 684432 },
      ],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "حسابية أساسها 3 و n=678 ثم مجموع الحدود.",
    });

    expect(result).toMatchObject({
      tool: "math-sequences-workbench",
      missionId: "mission-sequence",
      presetId: "arithmetic-sequence-membership-sum",
      evaluation: {
        passed: true,
      },
    });
  });

  it("falls back to the first preset when mission preset data is invalid", () => {
    expect(getMathSequencesWorkbenchPreset({ bad: true }).id).toBe(
      "affine-recurrence-fixed-point",
    );
  });
});
