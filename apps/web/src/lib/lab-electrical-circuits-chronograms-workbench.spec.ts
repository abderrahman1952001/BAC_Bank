import { describe, expect, it } from "vitest";
import {
  evaluateStructuredLabWorkbenchAnswer,
  makeStructuredInitialAnswerCells,
} from "./lab-structured-workbench";
import {
  electricalCircuitsChronogramsWorkbenchPresets,
  getElectricalCircuitsChronogramsWorkbenchPreset,
} from "./lab-electrical-circuits-chronograms-workbench";

describe("Electrical Circuits and Chronograms Workbench", () => {
  it("accepts relay circuit state reading", () => {
    const preset = electricalCircuitsChronogramsWorkbenchPresets[0];
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [
        { rowId: "open", columnId: "ka", value: 0 },
        { rowId: "open", columnId: "h", value: 0 },
        { rowId: "closed", columnId: "ka", value: 1 },
        { rowId: "closed", columnId: "h", value: 1 },
      ],
      measurements: [],
      labels: [
        { targetId: "switch", label: "S" },
        { targetId: "coil", label: "KA" },
        { targetId: "contact", label: "NO" },
        { targetId: "lamp", label: "H" },
      ],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "عند S يتغذى KA فيغلق NO ويضيء H.",
    });

    expect(evaluation.passed).toBe(true);
  });

  it("accepts TON chronogram output timing", () => {
    const preset = electricalCircuitsChronogramsWorkbenchPresets[1];
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [
        { rowId: "0-1", columnId: "q", value: 0 },
        { rowId: "1-3", columnId: "q", value: 0 },
        { rowId: "3-5", columnId: "q", value: 1 },
        { rowId: "5-6", columnId: "q", value: 0 },
      ],
      measurements: [],
      labels: [],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "مؤقت TON بتأخر 2s يجعل Q=1 عند 3s.",
    });

    expect(evaluation).toMatchObject({
      passed: true,
      tablePassed: true,
    });
  });

  it("falls back to the relay circuit preset", () => {
    expect(getElectricalCircuitsChronogramsWorkbenchPreset(undefined).id).toBe(
      "relay-control-circuit-reading",
    );
    expect(
      makeStructuredInitialAnswerCells(
        electricalCircuitsChronogramsWorkbenchPresets[1],
      ),
    ).toHaveLength(4);
  });
});
