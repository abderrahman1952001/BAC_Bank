import { describe, expect, it } from "vitest";
import {
  evaluateStructuredLabWorkbenchAnswer,
  makeStructuredInitialAnswerCells,
} from "./lab-structured-workbench";
import {
  getMechanicalDrawingWorkbenchPreset,
  mechanicalDrawingWorkbenchPresets,
} from "./lab-mechanical-drawing-workbench";

describe("Mechanical Drawing Workbench", () => {
  it("accepts assembly drawing and nomenclature reading", () => {
    const preset = mechanicalDrawingWorkbenchPresets[0];
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [
        { rowId: "08", columnId: "designation", value: "عمود" },
        { rowId: "08", columnId: "material", value: "فولاذ" },
        { rowId: "12", columnId: "designation", value: "محمل" },
        { rowId: "13", columnId: "designation", value: "علبة" },
        { rowId: "22", columnId: "designation", value: "ترس" },
      ],
      measurements: [],
      labels: [
        { targetId: "shaft", label: "عمود" },
        { targetId: "bearing", label: "محمل" },
        { targetId: "gear", label: "ترس" },
        { targetId: "housing", label: "علبة" },
      ],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "نستعمل رقم القطعة في الرسم ثم جدول المدونة لتحديد عمود ومحمل.",
    });

    expect(evaluation).toMatchObject({
      passed: true,
      tablePassed: true,
      labelsPassed: true,
    });
  });

  it("accepts definition drawing section and tolerance reading", () => {
    const preset = mechanicalDrawingWorkbenchPresets[1];
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [
        { rowId: "diameter", columnId: "answer", value: "Ø25 h7" },
        { rowId: "diameter", columnId: "reason", value: "سطح وظيفي" },
        { rowId: "tolerance", columnId: "answer", value: "توازي" },
        { rowId: "roughness", columnId: "answer", value: "Ra 1.6" },
        { rowId: "section", columnId: "answer", value: "مقطع A-A" },
      ],
      measurements: [],
      labels: [
        { targetId: "diameter-symbol", label: "Ø25 h7" },
        { targetId: "datum", label: "A" },
        { targetId: "roughness-symbol", label: "Ra 1.6" },
        { targetId: "section-view", label: "A-A" },
      ],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "القطر له سماحة، والخشونة تحدد حالة السطح، والمقطع يوضح الداخل.",
    });

    expect(evaluation.passed).toBe(true);
  });

  it("falls back to the assembly preset", () => {
    expect(getMechanicalDrawingWorkbenchPreset(undefined).id).toBe(
      "assembly-nomenclature-reading",
    );
    expect(
      makeStructuredInitialAnswerCells(mechanicalDrawingWorkbenchPresets[1]),
    ).toHaveLength(5);
  });
});
