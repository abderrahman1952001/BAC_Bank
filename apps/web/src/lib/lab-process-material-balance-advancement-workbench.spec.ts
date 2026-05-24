import { describe, expect, it } from "vitest";
import {
  evaluateStructuredLabWorkbenchAnswer,
  makeStructuredInitialAnswerCells,
} from "./lab-structured-workbench";
import {
  getProcessMaterialBalanceAdvancementWorkbenchPreset,
  processMaterialBalanceAdvancementWorkbenchPresets,
} from "./lab-process-material-balance-advancement-workbench";

describe("Process Material Balance and Advancement Workbench", () => {
  it("accepts ester yield and mass balance", () => {
    const preset = processMaterialBalanceAdvancementWorkbenchPresets[0];
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [
        { rowId: "n-ester", columnId: "value", value: 0.3 },
        { rowId: "m-ester", columnId: "value", value: 39 },
      ],
      measurements: [
        { id: "ester-amount", value: 0.3, unit: "mol" },
        { id: "ester-mass", value: 39, unit: "g" },
      ],
      labels: [],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "المردود 60% يعطي 0.3 mol وكتلة 39 g.",
    });

    expect(evaluation).toMatchObject({
      passed: true,
      measurementsPassed: true,
    });
  });

  it("accepts advancement-table limiting reagent reasoning", () => {
    const preset = processMaterialBalanceAdvancementWorkbenchPresets[1];
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [
        { rowId: "n2", columnId: "final", value: 1 },
        { rowId: "h2", columnId: "final", value: 0 },
        { rowId: "nh3", columnId: "final", value: 2 },
        { rowId: "xmax", columnId: "final", value: 1 },
      ],
      measurements: [
        { id: "xmax", value: 1, unit: "mol" },
        { id: "ammonia-final", value: 2, unit: "mol" },
      ],
      labels: [],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "H2 هو المحد، xmax=1 mol و NH3 النهائي يساوي 2 mol.",
    });

    expect(evaluation.passed).toBe(true);
  });

  it("falls back to the ester yield preset", () => {
    expect(
      getProcessMaterialBalanceAdvancementWorkbenchPreset(undefined).id,
    ).toBe("ester-yield-mass-balance");
    expect(
      makeStructuredInitialAnswerCells(
        processMaterialBalanceAdvancementWorkbenchPresets[1],
      ),
    ).toHaveLength(4);
  });
});
