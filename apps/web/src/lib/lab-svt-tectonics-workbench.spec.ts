import { describe, expect, it } from "vitest";
import {
  evaluateStructuredLabWorkbenchAnswer,
  makeStructuredInitialMeasurements,
} from "./lab-structured-workbench";
import {
  getSvtTectonicsWorkbenchPreset,
  svtTectonicsWorkbenchPresets,
} from "./lab-svt-tectonics-workbench";

describe("SVT Tectonics Workbench", () => {
  it("accepts subduction cross-section labels", () => {
    const preset = svtTectonicsWorkbenchPresets[0];
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [],
      measurements: [],
      labels: [
        { targetId: "oceanic-plate", label: "صفيحة محيطية" },
        { targetId: "continental-plate", label: "صفيحة قارية" },
        { targetId: "trench", label: "خندق" },
        { targetId: "benioff", label: "Benioff" },
        { targetId: "volcano", label: "بركان" },
      ],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "وجود خندق ومستوى بنيوف يدل على اندساس صفيحة محيطية.",
    });

    expect(evaluation.passed).toBe(true);
  });

  it("accepts ridge spreading-rate calculation", () => {
    const preset = svtTectonicsWorkbenchPresets[1];
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [{ rowId: "rate", columnId: "value", value: 2 }],
      measurements: [{ id: "spreading-rate", value: 2, unit: "cm/year" }],
      labels: [
        { targetId: "ridge-axis", label: "ذروة" },
        { targetId: "new-crust", label: "قشرة حديثة" },
        { targetId: "old-crust", label: "قشرة أقدم" },
        { targetId: "spreading", label: "تباعد" },
      ],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "عند الذروة يحدث اتساع وتباعد بسرعة 2 cm/year.",
    });

    expect(evaluation).toMatchObject({
      passed: true,
      measurementsPassed: true,
    });
  });

  it("falls back to the subduction preset", () => {
    expect(getSvtTectonicsWorkbenchPreset(123).id).toBe(
      "subduction-cross-section-interpretation",
    );
    expect(makeStructuredInitialMeasurements(svtTectonicsWorkbenchPresets[1]))
      .toEqual([{ id: "spreading-rate", value: null, unit: "cm/year" }]);
  });
});
