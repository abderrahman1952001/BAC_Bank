import { describe, expect, it } from "vitest";
import {
  evaluateStructuredLabWorkbenchAnswer,
  makeStructuredInitialAnswerCells,
} from "./lab-structured-workbench";
import {
  getSvtEnergyMetabolismWorkbenchPreset,
  svtEnergyMetabolismWorkbenchPresets,
} from "./lab-svt-energy-metabolism-workbench";

describe("SVT Energy Metabolism Workbench", () => {
  it("accepts photosynthesis gas-exchange graph reasoning", () => {
    const preset = svtEnergyMetabolismWorkbenchPresets[0];
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [
        { rowId: "rate-200", columnId: "value", value: 18 },
        { rowId: "rate-600", columnId: "value", value: 40 },
        { rowId: "threshold", columnId: "value", value: 600 },
      ],
      measurements: [{ id: "plateau-rate", value: 40, unit: "u.a" }],
      labels: [],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "يزداد O₂ مع الإضاءة أثناء التركيب الضوئي ثم يحدث تشبع.",
    });

    expect(evaluation.passed).toBe(true);
  });

  it("accepts respiration and fermentation ATP comparison", () => {
    const preset = svtEnergyMetabolismWorkbenchPresets[1];
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [
        { rowId: "with-o2", columnId: "pathway", value: "تنفس خلوي" },
        { rowId: "with-o2", columnId: "atp", value: 36 },
        { rowId: "without-o2", columnId: "pathway", value: "تخمر" },
        { rowId: "without-o2", columnId: "atp", value: 2 },
        { rowId: "yield-ratio", columnId: "atp", value: 18 },
      ],
      measurements: [],
      labels: [],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "وجود O₂ يسمح بحدوث تنفس ذي مردود ATP كبير، أما التخمر فمردوده ضعيف.",
    });

    expect(evaluation).toMatchObject({
      passed: true,
      tablePassed: true,
      conclusionPassed: true,
    });
  });

  it("falls back to the photosynthesis preset", () => {
    expect(getSvtEnergyMetabolismWorkbenchPreset({ nope: true }).id).toBe(
      "photosynthesis-light-oxygen-release",
    );
    expect(makeStructuredInitialAnswerCells(svtEnergyMetabolismWorkbenchPresets[1]))
      .toHaveLength(5);
  });
});
