import { describe, expect, it } from "vitest";
import {
  evaluateStructuredLabWorkbenchAnswer,
  makeStructuredInitialAnswerCells,
} from "./lab-structured-workbench";
import {
  getPhysicsExperimentGraphPreset,
  physicsExperimentGraphPresets,
} from "./lab-physics-experiment-graphs";

describe("Physics Experimental Graphs Workbench", () => {
  it("accepts RC time-constant graph readings", () => {
    const preset = physicsExperimentGraphPresets[0];
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [
        { rowId: "u-final", columnId: "value", value: 6 },
        { rowId: "u-tau", columnId: "value", value: 3.8 },
        { rowId: "tau", columnId: "value", value: 4 },
        { rowId: "initial-slope", columnId: "value", value: 1.5 },
      ],
      measurements: [],
      labels: [],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "نقرأ τ عند 63% من E، وهي ثابت الزمن RC أثناء شحن المكثفة.",
    });

    expect(evaluation).toMatchObject({
      passed: true,
      tablePassed: true,
      observationsPassed: true,
      conclusionPassed: true,
    });
  });

  it("accepts velocity-time slope reasoning", () => {
    const preset = physicsExperimentGraphPresets[1];
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [
        { rowId: "v0", columnId: "value", value: 1 },
        { rowId: "v3", columnId: "value", value: 7 },
        { rowId: "slope", columnId: "value", value: "2 m/s²" },
        {
          rowId: "motion-kind",
          columnId: "value",
          value: "متسارعة بانتظام",
        },
      ],
      measurements: [],
      labels: [],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "ميل v(t) هو تسارع ثابت قيمته 2، لذلك الحركة متسارعة.",
    });

    expect(evaluation.passed).toBe(true);
  });

  it("falls back to the first preset and creates initial cells", () => {
    expect(getPhysicsExperimentGraphPreset({ bad: true }).id).toBe(
      "rc-charging-time-constant",
    );
    expect(makeStructuredInitialAnswerCells(physicsExperimentGraphPresets[1]))
      .toHaveLength(4);
  });
});
