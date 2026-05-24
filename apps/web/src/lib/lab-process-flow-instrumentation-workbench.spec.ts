import { describe, expect, it } from "vitest";
import {
  evaluateStructuredLabWorkbenchAnswer,
  makeStructuredInitialAnswerCells,
} from "./lab-structured-workbench";
import {
  getProcessFlowInstrumentationWorkbenchPreset,
  processFlowInstrumentationWorkbenchPresets,
} from "./lab-process-flow-instrumentation-workbench";

describe("Process Flow and Instrumentation Workbench", () => {
  it("accepts distillation flow diagram reading", () => {
    const preset = processFlowInstrumentationWorkbenchPresets[0];
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [
        { rowId: "c1", columnId: "name", value: "عمود تقطير" },
        { rowId: "c1", columnId: "function", value: "فصل" },
        { rowId: "e1", columnId: "name", value: "مكثف" },
        { rowId: "b1", columnId: "name", value: "غلاية" },
        { rowId: "f", columnId: "name", value: "تغذية" },
      ],
      measurements: [],
      labels: [
        { targetId: "column", label: "عمود تقطير" },
        { targetId: "condenser", label: "مكثف" },
        { targetId: "reboiler", label: "مسخن" },
        { targetId: "feed", label: "تغذية" },
      ],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "تدخل تغذية إلى عمود، يتكثف القمة في مكثف، وتسخن الغلاية القاع.",
    });

    expect(evaluation).toMatchObject({
      passed: true,
      labelsPassed: true,
    });
  });

  it("accepts reactor instrumentation control-loop reading", () => {
    const preset = processFlowInstrumentationWorkbenchPresets[1];
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [
        { rowId: "tt", columnId: "role", value: "قياس" },
        { rowId: "tt", columnId: "variable", value: "درجة الحرارة" },
        { rowId: "tic", columnId: "role", value: "تحكم" },
        { rowId: "tv", columnId: "role", value: "صمام" },
        { rowId: "cooling", columnId: "variable", value: "تدفق" },
      ],
      measurements: [],
      labels: [
        { targetId: "reactor", label: "reactor" },
        { targetId: "temperature-transmitter", label: "TT" },
        { targetId: "controller", label: "TIC" },
        { targetId: "control-valve", label: "TV" },
      ],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "TT يقيس الحرارة، TIC يتحكم في TV لزيادة التبريد.",
    });

    expect(evaluation.passed).toBe(true);
  });

  it("falls back to the distillation flow preset", () => {
    expect(getProcessFlowInstrumentationWorkbenchPreset(undefined).id).toBe(
      "distillation-flow-diagram-reading",
    );
    expect(
      makeStructuredInitialAnswerCells(
        processFlowInstrumentationWorkbenchPresets[0],
      ),
    ).toHaveLength(5);
  });
});
