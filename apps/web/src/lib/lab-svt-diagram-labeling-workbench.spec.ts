import { describe, expect, it } from "vitest";
import {
  evaluateStructuredLabWorkbenchAnswer,
  makeStructuredInitialLabels,
} from "./lab-structured-workbench";
import {
  getSvtDiagramLabelingWorkbenchPreset,
  svtDiagramLabelingWorkbenchPresets,
} from "./lab-svt-diagram-labeling-workbench";

describe("SVT Diagram Labeling Workbench", () => {
  it("accepts enzyme active-site labels and reasoning", () => {
    const preset = svtDiagramLabelingWorkbenchPresets[0];
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [],
      measurements: [],
      labels: [
        { targetId: "enzyme", label: "إنزيم" },
        { targetId: "active-site", label: "الموقع الفعال" },
        { targetId: "substrate", label: "ركيزة" },
        { targetId: "products", label: "نواتج" },
      ],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "يمتلك الإنزيم موقع فعال نوعي يتكامل مع الركيزة.",
    });

    expect(evaluation).toMatchObject({
      passed: true,
      labelsPassed: true,
      observationsPassed: true,
    });
  });

  it("accepts chloroplast structure labels", () => {
    const preset = svtDiagramLabelingWorkbenchPresets[1];
    const evaluation = evaluateStructuredLabWorkbenchAnswer(preset, {
      answerCells: [],
      measurements: [],
      labels: [
        { targetId: "outer-membrane", label: "غشاء" },
        { targetId: "stroma", label: "stroma" },
        { targetId: "granum", label: "غرانا" },
        { targetId: "thylakoid", label: "تيلاكويد" },
      ],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion: "التفاعلات ضوئية على التيلاكويد وتثبيت CO₂ في الستروما.",
    });

    expect(evaluation.passed).toBe(true);
  });

  it("falls back to the first diagram preset", () => {
    expect(getSvtDiagramLabelingWorkbenchPreset(undefined).id).toBe(
      "enzyme-active-site-labeling",
    );
    expect(makeStructuredInitialLabels(svtDiagramLabelingWorkbenchPresets[0]))
      .toHaveLength(4);
  });
});
