import { describe, expect, it } from "vitest";
import {
  evaluateStructuredLabWorkbenchAnswer,
  makeStructuredInitialMeasurements,
} from "./lab-structured-workbench";
import {
  civilBeamStaticsWorkbenchPresets,
  getCivilBeamStaticsWorkbenchPreset,
} from "./lab-civil-beam-statics-workbench";

describe("Civil Beam Statics Workbench", () => {
  it("accepts simply supported beam reactions", () => {
    const preset = civilBeamStaticsWorkbenchPresets[0];
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [
        { rowId: "ra", columnId: "value", value: 6 },
        { rowId: "rb", columnId: "value", value: 6 },
      ],
      measurements: [
        { id: "reaction-a", value: 6, unit: "kN" },
        { id: "reaction-b", value: 6, unit: "kN" },
      ],
      labels: [
        { targetId: "support-a", label: "A" },
        { targetId: "point-load", label: "P" },
        { targetId: "support-b", label: "B" },
      ],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "من ΣFy يكون RA+RB=12 kN وبالتناظر RA=RB=6.",
    });

    expect(evaluation.passed).toBe(true);
  });

  it("accepts cantilever shear and moment values", () => {
    const preset = civilBeamStaticsWorkbenchPresets[1];
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [
        { rowId: "vmax", columnId: "value", value: "12 kN" },
        { rowId: "mmax", columnId: "value", value: "24 kN.m" },
      ],
      measurements: [
        { id: "max-shear", value: 12, unit: "kN" },
        { id: "max-moment", value: 24, unit: "kN.m" },
      ],
      labels: [
        { targetId: "fixed-support", label: "A" },
        { targetId: "uniform-load", label: "q" },
        { targetId: "free-end", label: "طرف حر" },
      ],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "نحسب qL للحصول على Vmax وMmax=qL²/2 عند التثبيت.",
    });

    expect(evaluation).toMatchObject({
      passed: true,
      measurementsPassed: true,
    });
  });

  it("falls back to the first civil beam preset", () => {
    expect(getCivilBeamStaticsWorkbenchPreset({ nope: true }).id).toBe(
      "simply-supported-beam-reactions",
    );
    expect(makeStructuredInitialMeasurements(civilBeamStaticsWorkbenchPresets[0]))
      .toHaveLength(2);
  });
});
