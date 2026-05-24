import { describe, expect, it } from "vitest";
import {
  evaluateStructuredLabWorkbenchAnswer,
  makeStructuredInitialLabels,
} from "./lab-structured-workbench";
import {
  getSvtNervousImmuneResponseWorkbenchPreset,
  svtNervousImmuneResponseWorkbenchPresets,
} from "./lab-svt-nervous-immune-response-workbench";

describe("SVT Nervous and Immune Response Workbench", () => {
  it("accepts reflex arc labels and reasoning", () => {
    const preset = svtNervousImmuneResponseWorkbenchPresets[0];
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [],
      measurements: [],
      labels: [
        { targetId: "receptor", label: "مستقبل" },
        { targetId: "sensory-neuron", label: "عصبون حسي" },
        { targetId: "spinal-cord", label: "مركز عصبي" },
        { targetId: "motor-neuron", label: "عصبون حركي" },
        { targetId: "muscle", label: "عضلة" },
      ],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "مستقبل ثم عصبون حسي نحو النخاع ثم عصبون حركي إلى عضلة.",
    });

    expect(evaluation.passed).toBe(true);
  });

  it("accepts humoral immune response labels", () => {
    const preset = svtNervousImmuneResponseWorkbenchPresets[1];
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [],
      measurements: [],
      labels: [
        { targetId: "antigen", label: "مولد ضد" },
        { targetId: "apc", label: "CPA" },
        { targetId: "t-helper", label: "LT4" },
        { targetId: "b-cell", label: "LB" },
        { targetId: "antibody", label: "جسم مضاد" },
      ],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "مولد ضد نوعية ينشط LT4 ثم LB لإنتاج أجسام مضادة.",
    });

    expect(evaluation).toMatchObject({
      passed: true,
      labelsPassed: true,
    });
  });

  it("falls back to the reflex preset", () => {
    expect(getSvtNervousImmuneResponseWorkbenchPreset("bad").id).toBe(
      "reflex-arc-synapse-flow",
    );
    expect(makeStructuredInitialLabels(svtNervousImmuneResponseWorkbenchPresets[1]))
      .toHaveLength(5);
  });
});
