import { describe, expect, it } from "vitest";
import {
  evaluateStructuredLabWorkbenchAnswer,
  makeStructuredInitialAnswerCells,
} from "./lab-structured-workbench";
import {
  getMechanicalMechanismKinematicsWorkbenchPreset,
  mechanicalMechanismKinematicsWorkbenchPresets,
} from "./lab-mechanical-mechanism-kinematics-workbench";

describe("Mechanical Mechanism and Kinematics Workbench", () => {
  it("accepts gear reducer speed-ratio reasoning", () => {
    const preset = mechanicalMechanismKinematicsWorkbenchPresets[0];
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [
        { rowId: "ratio", columnId: "value", value: "1/3" },
        { rowId: "ratio", columnId: "unit", value: "تخفيض" },
        { rowId: "n2", columnId: "value", value: 400 },
        { rowId: "direction", columnId: "value", value: "معاكس" },
      ],
      measurements: [{ id: "output-speed", value: 400, unit: "rpm" }],
      labels: [
        { targetId: "driver", label: "Z1" },
        { targetId: "driven", label: "Z2" },
        { targetId: "input-speed", label: "n1" },
        { targetId: "opposite-direction", label: "معاكس" },
      ],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "من Z1 و Z2 نحسب n2=400 tr/min والاتجاه معاكس.",
    });

    expect(evaluation).toMatchObject({
      passed: true,
      measurementsPassed: true,
      labelsPassed: true,
    });
  });

  it("accepts rack-pinion displacement calculation", () => {
    const preset = mechanicalMechanismKinematicsWorkbenchPresets[1];
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [
        { rowId: "input", columnId: "answer", value: "دوران" },
        { rowId: "output", columnId: "answer", value: "انتقال" },
        { rowId: "law", columnId: "answer", value: "L=πdn" },
        { rowId: "displacement", columnId: "answer", value: 251 },
      ],
      measurements: [{ id: "rack-displacement", value: 251.3, unit: "mm" }],
      labels: [
        { targetId: "pinion", label: "ترس" },
        { targetId: "rack", label: "جريدة" },
        { targetId: "rotation", label: "دوران" },
        { targetId: "translation", label: "انتقال" },
      ],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "الآلية تحول دوران الترس إلى انتقال الجريدة بقيمة 251 mm.",
    });

    expect(evaluation.passed).toBe(true);
  });

  it("falls back to the gear reducer preset", () => {
    expect(getMechanicalMechanismKinematicsWorkbenchPreset(undefined).id).toBe(
      "gear-reducer-speed-ratio",
    );
    expect(
      makeStructuredInitialAnswerCells(
        mechanicalMechanismKinematicsWorkbenchPresets[0],
      ),
    ).toHaveLength(4);
  });
});
