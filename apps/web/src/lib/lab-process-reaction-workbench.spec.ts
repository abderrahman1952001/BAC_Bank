import { describe, expect, it } from "vitest";
import {
  evaluateStructuredLabWorkbenchAnswer,
  makeStructuredInitialAnswerCells,
} from "./lab-structured-workbench";
import {
  getProcessReactionWorkbenchPreset,
  processReactionWorkbenchPresets,
} from "./lab-process-reaction-workbench";

describe("Process Reaction Workbench", () => {
  it("accepts esterification scheme reasoning", () => {
    const preset = processReactionWorkbenchPresets[0];
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [
        { rowId: "a", columnId: "compound", value: "حمض" },
        { rowId: "a", columnId: "family", value: "حمض كربوكسيلي" },
        { rowId: "b", columnId: "compound", value: "كحول" },
        { rowId: "c", columnId: "compound", value: "إستر" },
        { rowId: "condition", columnId: "compound", value: "H2SO4" },
        { rowId: "condition", columnId: "family", value: "وسيط" },
      ],
      measurements: [],
      labels: [
        { targetId: "acid", label: "حمض كربوكسيلي" },
        { targetId: "alcohol", label: "كحول" },
        { targetId: "ester", label: "إستر" },
        { targetId: "water", label: "H2O" },
        { targetId: "catalyst", label: "H2SO4" },
      ],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "حمض مع كحول يعطي إستر وماء بوجود H2SO4.",
    });

    expect(evaluation.passed).toBe(true);
  });

  it("accepts polyester condensation scheme reasoning", () => {
    const preset = processReactionWorkbenchPresets[1];
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [
        { rowId: "monomer-a", columnId: "answer", value: "ثنائي حمض" },
        { rowId: "monomer-b", columnId: "answer", value: "ثنائي كحول" },
        { rowId: "polymer", columnId: "answer", value: "بولي إستر" },
        { rowId: "polymer", columnId: "meaning", value: "رابطة إستر" },
        { rowId: "byproduct", columnId: "answer", value: "ماء" },
      ],
      measurements: [],
      labels: [
        { targetId: "diacid", label: "ثنائي حمض" },
        { targetId: "diol", label: "diol" },
        { targetId: "polyester", label: "polyester" },
        { targetId: "water-loss", label: "H2O" },
      ],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "بولي إستر ينتج ببلمرة تكاثف مع ماء.",
    });

    expect(evaluation).toMatchObject({ passed: true, labelsPassed: true });
  });

  it("falls back to the esterification preset", () => {
    expect(getProcessReactionWorkbenchPreset(undefined).id).toBe(
      "esterification-reaction-scheme",
    );
    expect(
      makeStructuredInitialAnswerCells(processReactionWorkbenchPresets[1]),
    ).toHaveLength(5);
  });
});
