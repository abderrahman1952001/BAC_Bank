import { describe, expect, it } from "vitest";
import {
  evaluateStructuredLabWorkbenchAnswer,
  makeStructuredInitialAnswerCells,
} from "./lab-structured-workbench";
import {
  electricalTechnicalFileWorkbenchPresets,
  getElectricalTechnicalFileWorkbenchPreset,
} from "./lab-electrical-technical-file-workbench";

describe("Electrical Technical File Workbench", () => {
  it("accepts motor starter component identification", () => {
    const preset = electricalTechnicalFileWorkbenchPresets[0];
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [
        { rowId: "qf", columnId: "component", value: "قاطع" },
        { rowId: "qf", columnId: "function", value: "حماية من القصر" },
        { rowId: "km", columnId: "component", value: "كونتاكتور" },
        { rowId: "km", columnId: "function", value: "وصل" },
        { rowId: "rt", columnId: "component", value: "مرحل حراري" },
        { rowId: "m", columnId: "component", value: "محرك" },
      ],
      measurements: [],
      labels: [
        { targetId: "breaker", label: "QF" },
        { targetId: "contactor", label: "KM" },
        { targetId: "thermal-relay", label: "RT" },
        { targetId: "motor", label: "M" },
      ],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "QF يحمي، KM يشغل المحرك، وRT يحمي المحرك من الحمل.",
    });

    expect(evaluation).toMatchObject({
      passed: true,
      tablePassed: true,
      labelsPassed: true,
    });
  });

  it("accepts motor current and protection choice with numeric tolerance", () => {
    const preset = electricalTechnicalFileWorkbenchPresets[1];
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [
        { rowId: "current", columnId: "value", value: 11 },
        { rowId: "protection", columnId: "value", value: 16 },
      ],
      measurements: [{ id: "motor-current", value: 10.9, unit: "A" }],
      labels: [],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "I يساوي تقريبا 10.9 A لذلك نختار حماية 16 A.",
    });

    expect(evaluation).toMatchObject({
      passed: true,
      tablePassed: true,
      measurementsPassed: true,
    });
  });

  it("falls back to the component identification preset", () => {
    expect(getElectricalTechnicalFileWorkbenchPreset(undefined).id).toBe(
      "motor-starter-component-identification",
    );
    expect(
      makeStructuredInitialAnswerCells(
        electricalTechnicalFileWorkbenchPresets[0],
      ),
    ).toHaveLength(6);
  });
});
