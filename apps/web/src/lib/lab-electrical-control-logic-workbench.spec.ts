import { describe, expect, it } from "vitest";
import {
  evaluateStructuredLabWorkbenchAnswer,
  makeStructuredInitialAnswerCells,
} from "./lab-structured-workbench";
import {
  electricalControlLogicWorkbenchPresets,
  getElectricalControlLogicWorkbenchPreset,
} from "./lab-electrical-control-logic-workbench";

describe("Electrical Control Logic Workbench", () => {
  it("accepts motor safety truth-table outputs", () => {
    const preset = electricalControlLogicWorkbenchPresets[0];
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [
        { rowId: "00", columnId: "km", value: 0 },
        { rowId: "01", columnId: "km", value: 0 },
        { rowId: "10", columnId: "km", value: 0 },
        { rowId: "11", columnId: "km", value: 1 },
      ],
      measurements: [],
      labels: [
        { targetId: "start-input", label: "M" },
        { targetId: "safety-input", label: "S" },
        { targetId: "output", label: "KM" },
      ],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "KM=M.S وهي علاقة AND مع شرط أمان.",
    });

    expect(evaluation.passed).toBe(true);
  });

  it("accepts GRAFCET actions and transitions", () => {
    const preset = electricalControlLogicWorkbenchPresets[1];
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [
        { rowId: "s0", columnId: "action", value: "repos" },
        { rowId: "s0", columnId: "transition", value: "dcy" },
        { rowId: "s1", columnId: "action", value: "A+" },
        { rowId: "s1", columnId: "transition", value: "a1" },
        { rowId: "s2", columnId: "action", value: "A-" },
        { rowId: "s2", columnId: "transition", value: "a0" },
      ],
      measurements: [],
      labels: [
        { targetId: "initial-step", label: "0" },
        { targetId: "transition-dcy", label: "dcy" },
        { targetId: "action-a-plus", label: "A+" },
        { targetId: "action-a-minus", label: "A-" },
      ],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "بعد dcy ننفذ A+ حتى a1 ثم A- حتى a0.",
    });

    expect(evaluation).toMatchObject({
      passed: true,
      tablePassed: true,
    });
  });

  it("falls back to the truth-table preset", () => {
    expect(getElectricalControlLogicWorkbenchPreset(null).id).toBe(
      "motor-safety-truth-table",
    );
    expect(makeStructuredInitialAnswerCells(electricalControlLogicWorkbenchPresets[1]))
      .toHaveLength(6);
  });
});
