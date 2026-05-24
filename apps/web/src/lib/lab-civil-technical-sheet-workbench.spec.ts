import { describe, expect, it } from "vitest";
import {
  evaluateStructuredLabWorkbenchAnswer,
  makeStructuredInitialAnswerCells,
} from "./lab-structured-workbench";
import {
  civilTechnicalSheetWorkbenchPresets,
  getCivilTechnicalSheetWorkbenchPreset,
} from "./lab-civil-technical-sheet-workbench";

describe("Civil Technical Sheet Workbench", () => {
  it("accepts concrete quantity takeoff from a technical sheet", () => {
    const preset = civilTechnicalSheetWorkbenchPresets[0];
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [{ rowId: "volume", columnId: "value", value: 1.6 }],
      measurements: [{ id: "concrete-volume", value: 1.6, unit: "m³" }],
      labels: [
        { targetId: "foundation", label: "semelle" },
        { targetId: "concrete", label: "béton" },
        { targetId: "dimensions", label: "L b h" },
      ],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "V=L×b×h=1.6 m³.",
    });

    expect(evaluation.passed).toBe(true);
  });

  it("accepts construction sequence answer-file cells", () => {
    const preset = civilTechnicalSheetWorkbenchPresets[1];
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [
        { rowId: "step-1", columnId: "operation", value: "توقيع المحاور" },
        { rowId: "step-2", columnId: "operation", value: "حفر" },
        { rowId: "step-3", columnId: "operation", value: "coffrage" },
        { rowId: "step-4", columnId: "operation", value: "ferraillage" },
        { rowId: "step-5", columnId: "operation", value: "صب" },
      ],
      measurements: [],
      labels: [],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "الترتيب هو توقيع ثم حفر ثم قوالب ثم تسليح ثم صب.",
    });

    expect(evaluation).toMatchObject({
      passed: true,
      tablePassed: true,
    });
  });

  it("falls back to the quantity preset", () => {
    expect(getCivilTechnicalSheetWorkbenchPreset(false).id).toBe(
      "foundation-quantity-takeoff",
    );
    expect(makeStructuredInitialAnswerCells(civilTechnicalSheetWorkbenchPresets[1]))
      .toHaveLength(5);
  });
});
