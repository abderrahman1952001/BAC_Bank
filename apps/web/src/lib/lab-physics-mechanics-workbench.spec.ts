import { describe, expect, it } from "vitest";
import {
  evaluateStructuredLabWorkbenchAnswer,
  makeStructuredInitialAnswerCells,
} from "./lab-structured-workbench";
import {
  getPhysicsMechanicsWorkbenchPreset,
  physicsMechanicsWorkbenchPresets,
} from "./lab-physics-mechanics-workbench";

describe("Physics Mechanics Workbench", () => {
  it("accepts Newton-law reasoning from a velocity graph", () => {
    const preset = physicsMechanicsWorkbenchPresets[0];
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [
        { rowId: "acceleration", columnId: "value", value: "2 m/s²" },
        { rowId: "resultant", columnId: "value", value: 1 },
      ],
      measurements: [{ id: "resultant-force", value: 1, unit: "N" }],
      labels: [
        { targetId: "weight", label: "P" },
        { targetId: "normal", label: "R" },
        { targetId: "friction", label: "احتكاك" },
      ],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "من ميل v(t) نجد تسارع 2، وبما أن ΣF=m.a فالمحصلة 1 N.",
    });

    expect(evaluation.passed).toBe(true);
  });

  it("accepts spring stiffness from an oscillation period", () => {
    const preset = physicsMechanicsWorkbenchPresets[1];
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [
        { rowId: "period", columnId: "value", value: 0.4 },
        { rowId: "stiffness", columnId: "value", value: "25 N/m" },
      ],
      measurements: [{ id: "stiffness", value: 24.7, unit: "N/m" }],
      labels: [
        { targetId: "spring", label: "نابض" },
        { targetId: "mass", label: "كتلة" },
        { targetId: "equilibrium", label: "O" },
      ],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "نقرأ الدور T ثم نستعمل k=4π²m/T² فنجد k≈24.7 N/m.",
    });

    expect(evaluation).toMatchObject({
      passed: true,
      measurementsPassed: true,
      conclusionPassed: true,
    });
  });

  it("falls back to the first mechanics preset", () => {
    expect(getPhysicsMechanicsWorkbenchPreset(null).id).toBe(
      "inclined-plane-newton-law",
    );
    expect(makeStructuredInitialAnswerCells(physicsMechanicsWorkbenchPresets[0]))
      .toHaveLength(2);
  });
});
