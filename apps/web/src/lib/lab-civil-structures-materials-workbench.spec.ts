import { describe, expect, it } from "vitest";
import {
  evaluateStructuredLabWorkbenchAnswer,
  makeStructuredInitialAnswerCells,
} from "./lab-structured-workbench";
import {
  civilStructuresMaterialsWorkbenchPresets,
  getCivilStructuresMaterialsWorkbenchPreset,
} from "./lab-civil-structures-materials-workbench";

describe("Civil Structures and Materials Workbench", () => {
  it("accepts reinforced-concrete steel-area reasoning", () => {
    const preset = civilStructuresMaterialsWorkbenchPresets[0];
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [{ rowId: "steel-area", columnId: "value", value: 452 }],
      measurements: [{ id: "steel-area", value: 452, unit: "mm²" }],
      labels: [
        { targetId: "concrete", label: "خرسانة" },
        { targetId: "tension-steel", label: "HA12" },
        { targetId: "stirrup", label: "كانة" },
      ],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "As=4×113=452 mm² لتسليح الشد.",
    });

    expect(evaluation.passed).toBe(true);
  });

  it("accepts a material stress check", () => {
    const preset = civilStructuresMaterialsWorkbenchPresets[1];
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [
        { rowId: "area", columnId: "value", value: 0.06 },
        { rowId: "stress", columnId: "value", value: "2 MPa" },
        { rowId: "decision", columnId: "value", value: "مقبول" },
      ],
      measurements: [{ id: "stress", value: 2, unit: "MPa" }],
      labels: [
        { targetId: "axial-load", label: "N" },
        { targetId: "section", label: "A" },
        { targetId: "material", label: "خرسانة" },
      ],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "نطبق σ=N/A فنجد 2 MPa وهي قيمة مقبول لأنها أقل من المسموح.",
    });

    expect(evaluation).toMatchObject({
      passed: true,
      tablePassed: true,
      measurementsPassed: true,
    });
  });

  it("falls back to the steel-area preset", () => {
    expect(getCivilStructuresMaterialsWorkbenchPreset(null).id).toBe(
      "reinforced-concrete-steel-area",
    );
    expect(
      makeStructuredInitialAnswerCells(civilStructuresMaterialsWorkbenchPresets[1]),
    ).toHaveLength(3);
  });
});
