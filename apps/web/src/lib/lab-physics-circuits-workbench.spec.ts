import { describe, expect, it } from "vitest";
import {
  evaluateStructuredLabWorkbenchAnswer,
  makeStructuredInitialLabels,
  makeStructuredInitialMeasurements,
} from "./lab-structured-workbench";
import {
  getPhysicsCircuitsWorkbenchPreset,
  physicsCircuitsWorkbenchPresets,
} from "./lab-physics-circuits-workbench";

describe("Physics Circuits Workbench", () => {
  it("accepts an RC capacitance calculation from the time constant", () => {
    const preset = physicsCircuitsWorkbenchPresets[0];
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [{ rowId: "c", columnId: "value", value: 0.00004 }],
      measurements: [{ id: "capacitance", value: 0.00004, unit: "F" }],
      labels: [
        { targetId: "generator", label: "مولد" },
        { targetId: "resistor", label: "R" },
        { targetId: "capacitor", label: "C" },
        { targetId: "switch", label: "قاطعة" },
      ],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "نقرأ τ من المنحنى ثم نستعمل τ=RC فنجد C=4e-5 F.",
    });

    expect(evaluation).toMatchObject({
      passed: true,
      labelsPassed: true,
      tablePassed: true,
      measurementsPassed: true,
      observationsPassed: true,
      conclusionPassed: true,
    });
  });

  it("accepts an RL inductance calculation from the time constant", () => {
    const preset = physicsCircuitsWorkbenchPresets[1];
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [{ rowId: "l", columnId: "value", value: "40 mH" }],
      measurements: [{ id: "inductance", value: 0.04, unit: "H" }],
      labels: [
        { targetId: "generator", label: "E" },
        { targetId: "resistor", label: "مقاومة" },
        { targetId: "inductor", label: "وشيعة" },
      ],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "في دارة RL يكون τ=L/R، والوشيعة تعطي L=0.04 H.",
    });

    expect(evaluation.passed).toBe(true);
  });

  it("falls back to the first preset and creates expected inputs", () => {
    expect(getPhysicsCircuitsWorkbenchPreset({ bad: true }).id).toBe(
      "rc-circuit-capacitance-from-tau",
    );
    expect(makeStructuredInitialLabels(physicsCircuitsWorkbenchPresets[0]))
      .toHaveLength(4);
    expect(makeStructuredInitialMeasurements(physicsCircuitsWorkbenchPresets[1]))
      .toEqual([{ id: "inductance", value: null, unit: "H" }]);
  });
});
