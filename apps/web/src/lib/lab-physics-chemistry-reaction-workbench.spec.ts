import { describe, expect, it } from "vitest";
import {
  evaluateStructuredLabWorkbenchAnswer,
  makeStructuredInitialMeasurements,
} from "./lab-structured-workbench";
import {
  getPhysicsChemistryReactionWorkbenchPreset,
  physicsChemistryReactionWorkbenchPresets,
} from "./lab-physics-chemistry-reaction-workbench";

describe("Physics Chemistry Reaction Workbench", () => {
  it("accepts titration equivalence and concentration reasoning", () => {
    const preset = physicsChemistryReactionWorkbenchPresets[0];
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [
        { rowId: "ve", columnId: "value", value: 12 },
        { rowId: "ca", columnId: "value", value: 0.06 },
      ],
      measurements: [
        { id: "acid-concentration", value: 0.06, unit: "mol/L" },
      ],
      labels: [
        { targetId: "burette", label: "سحاحة" },
        { targetId: "beaker", label: "كأس" },
        { targetId: "ph-meter", label: "pH-meter" },
      ],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "عند التكافؤ نقرأ VE=12 mL ومن CA.VA=CB.VE نجد CA=0.060 mol/L.",
    });

    expect(evaluation.passed).toBe(true);
  });

  it("accepts advancement-table limiting-reagent reasoning", () => {
    const preset = physicsChemistryReactionWorkbenchPresets[1];
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [
        { rowId: "xmax", columnId: "value", value: 0.025 },
        { rowId: "limiting", columnId: "value", value: "H+" },
        { rowId: "h2-final", columnId: "value", value: "2.5e-2" },
      ],
      measurements: [{ id: "hydrogen-amount", value: 0.025, unit: "mol" }],
      labels: [
        { targetId: "flask", label: "دورق" },
        { targetId: "gas-tube", label: "أنبوب" },
        { targetId: "graduated-cylinder", label: "مخبار" },
      ],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "نجد xmax=0.025 mol لأن H⁺ محدد، وبالتالي n(H₂)=0.025 mol.",
    });

    expect(evaluation).toMatchObject({
      passed: true,
      tablePassed: true,
      measurementsPassed: true,
    });
  });

  it("falls back to the titration preset and creates measurement inputs", () => {
    expect(getPhysicsChemistryReactionWorkbenchPreset(false).id).toBe(
      "acid-base-titration-equivalence",
    );
    expect(
      makeStructuredInitialMeasurements(physicsChemistryReactionWorkbenchPresets[0]),
    ).toEqual([{ id: "acid-concentration", value: null, unit: "mol/L" }]);
  });
});
