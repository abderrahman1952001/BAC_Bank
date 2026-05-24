import { describe, expect, it } from "vitest";
import {
  buildMathProbabilityWorkbenchResult,
  evaluateMathProbabilityWorkbenchAnswer,
  getMathProbabilityWorkbenchPreset,
  makeMathProbabilityInitialAnswerCells,
  mathProbabilityWorkbenchPresets,
  updateMathProbabilityAnswerCell,
} from "./lab-math-probability-workbench";

describe("Math Probability Workbench", () => {
  it("accepts a completed probability tree analysis with fraction answers", () => {
    const preset = mathProbabilityWorkbenchPresets[0];

    const evaluation = evaluateMathProbabilityWorkbenchAnswer(preset, {
      answerCells: [
        { rowId: "p-a", columnId: "value", value: "2/5" },
        { rowId: "p-not-a", columnId: "value", value: "3/5" },
        { rowId: "p-b-given-a", columnId: "value", value: "1/10" },
        {
          rowId: "p-not-b-given-not-a",
          columnId: "value",
          value: "4/5",
        },
        { rowId: "p-a-and-b", columnId: "value", value: "1/25" },
      ],
      conclusion: "نستعمل P(A∩B)=P(A) ضرب P(B/A).",
    });

    expect(evaluation).toMatchObject({
      passed: true,
      tablePassed: true,
      conclusionPassed: true,
      correctCellCount: 5,
      totalCellCount: 5,
    });
  });

  it("reports missing cells and missing conclusion keywords", () => {
    const preset = mathProbabilityWorkbenchPresets[0];

    const evaluation = evaluateMathProbabilityWorkbenchAnswer(preset, {
      answerCells: [{ rowId: "p-a", columnId: "value", value: "0.4" }],
      conclusion: "نحسب من الشجرة.",
    });

    expect(evaluation.passed).toBe(false);
    expect(evaluation.correctCellCount).toBe(1);
    expect(evaluation.table.cells.filter((cell) => !cell.passed)).toHaveLength(
      4,
    );
    expect(evaluation.missingKeywords).toContain("P(A∩B)");
    expect(evaluation.missingKeywords).toContain("ضرب");
  });

  it("supports probability law and expected value checks", () => {
    const preset = mathProbabilityWorkbenchPresets[1];
    const evaluation = evaluateMathProbabilityWorkbenchAnswer(preset, {
      answerCells: [
        { rowId: "x0", columnId: "probability", value: "1/5" },
        { rowId: "x1", columnId: "probability", value: "0.5" },
        { rowId: "x2", columnId: "probability", value: "3/10" },
        { rowId: "x0", columnId: "weighted", value: "0" },
        { rowId: "x1", columnId: "weighted", value: "1/2" },
        { rowId: "x2", columnId: "weighted", value: "3/5" },
        { rowId: "expectation", columnId: "weighted", value: "1.1" },
      ],
      conclusion: "E(X) هو مجموع x×P(X=x)، ومنه E(X)=1.1.",
    });

    expect(evaluation.passed).toBe(true);
  });

  it("creates stable initial answer cells and immutable updates", () => {
    const preset = mathProbabilityWorkbenchPresets[0];
    const initial = makeMathProbabilityInitialAnswerCells(preset);

    expect(initial).toEqual([
      { rowId: "p-a", columnId: "value", value: null },
      { rowId: "p-b-given-a", columnId: "value", value: null },
      { rowId: "p-not-a", columnId: "value", value: null },
      { rowId: "p-not-b-given-not-a", columnId: "value", value: null },
      { rowId: "p-a-and-b", columnId: "value", value: null },
    ]);
    expect(
      updateMathProbabilityAnswerCell(initial, "p-a", "value", "2/5"),
    ).toEqual([
      { rowId: "p-a", columnId: "value", value: "2/5" },
      { rowId: "p-b-given-a", columnId: "value", value: null },
      { rowId: "p-not-a", columnId: "value", value: null },
      { rowId: "p-not-b-given-not-a", columnId: "value", value: null },
      { rowId: "p-a-and-b", columnId: "value", value: null },
    ]);
  });

  it("builds result JSON with the shared contract parser", () => {
    const preset = mathProbabilityWorkbenchPresets[1];
    const result = buildMathProbabilityWorkbenchResult({
      missionId: "mission-probability",
      preset,
      answerCells: [
        { rowId: "x0", columnId: "probability", value: 0.2 },
        { rowId: "x1", columnId: "probability", value: 0.5 },
        { rowId: "x2", columnId: "probability", value: 0.3 },
        { rowId: "x0", columnId: "weighted", value: 0 },
        { rowId: "x1", columnId: "weighted", value: 0.5 },
        { rowId: "x2", columnId: "weighted", value: 0.6 },
        { rowId: "expectation", columnId: "weighted", value: 1.1 },
      ],
      conclusion: "E(X) هو مجموع x×P ومنه E(X)=1.1.",
    });

    expect(result).toMatchObject({
      tool: "math-probability-workbench",
      missionId: "mission-probability",
      presetId: "probability-law-expected-value",
      evaluation: {
        passed: true,
      },
    });
  });

  it("falls back to the first preset when mission preset data is invalid", () => {
    expect(getMathProbabilityWorkbenchPreset({ bad: true }).id).toBe(
      "conditional-tree-two-stage-draw",
    );
  });
});
