import { describe, expect, it } from "vitest";
import {
  buildSvtExperimentalWorkbenchResult,
  evaluateSvtExperimentalWorkbenchAnswer,
  getSvtExperimentalExpectedReadingValue,
  getSvtExperimentalGraphInsights,
  getSvtExperimentalWorkbenchPreset,
  makeSvtExperimentalInitialReadings,
  svtExperimentalGraphTablePresets,
  toggleSvtExperimentalObservation,
  updateSvtExperimentalReading,
} from "./lab-svt-experimental-graph-table";

describe("SVT Experimental Graph & Table Workbench", () => {
  it("accepts a complete enzyme activity analysis", () => {
    const preset = svtExperimentalGraphTablePresets[0];
    const readings = [
      { id: "without-activity-25", value: 9.1 },
      { id: "with-activity-25", value: 4.3 },
    ];

    expect(
      evaluateSvtExperimentalWorkbenchAnswer(preset, {
        readings,
        selectedObservationIds: preset.prompt.requiredObservationIds,
        conclusion:
          "Glucobay يثبط نشاط α غلوكوزيداز لأنه ينافس الركيزة على الموقع الفعال، فيقل تشكل الغلوكوز.",
      }),
    ).toMatchObject({
      passed: true,
      readingsPassed: true,
      observationsPassed: true,
      conclusionPassed: true,
    });
  });

  it("reports missing graph readings, observations, and conclusion keywords", () => {
    const preset = svtExperimentalGraphTablePresets[0];

    const evaluation = evaluateSvtExperimentalWorkbenchAnswer(preset, {
      readings: [{ id: "without-activity-25", value: 5 }],
      selectedObservationIds: ["without-rises-plateaus"],
      conclusion: "الدواء يغير النتيجة.",
    });

    expect(evaluation).toMatchObject({
      passed: false,
      readingsPassed: false,
      observationsPassed: false,
      conclusionPassed: false,
      missingObservationIds: [
        "glucobay-lowers-activity",
        "active-site-competition",
      ],
    });
    expect(evaluation.missingReadingIds).toEqual([
      "without-activity-25",
      "with-activity-25",
    ]);
    expect(evaluation.missingKeywords).toContain("α غلوكوزيداز");
  });

  it("derives graph/table readings through the reusable engines", () => {
    const glucobay = svtExperimentalGraphTablePresets[0];
    const ph = svtExperimentalGraphTablePresets[1];

    expect(
      getSvtExperimentalExpectedReadingValue(
        glucobay,
        glucobay.expectedReadings[0],
      ),
    ).toBe(9);
    expect(
      getSvtExperimentalExpectedReadingValue(ph, ph.expectedReadings[0]),
    ).toBe(7);
    expect(getSvtExperimentalGraphInsights(ph)[0]).toMatchObject({
      maximum: { x: 7, y: 100 },
    });
  });

  it("updates observation and reading state immutably", () => {
    const preset = svtExperimentalGraphTablePresets[0];
    const initialReadings = makeSvtExperimentalInitialReadings(preset);

    expect(initialReadings).toEqual([
      { id: "without-activity-25", value: null },
      { id: "with-activity-25", value: null },
    ]);
    expect(
      updateSvtExperimentalReading(initialReadings, "with-activity-25", 4.2),
    ).toEqual([
      { id: "without-activity-25", value: null },
      { id: "with-activity-25", value: 4.2 },
    ]);
    expect(
      toggleSvtExperimentalObservation([], "glucobay-lowers-activity"),
    ).toEqual(["glucobay-lowers-activity"]);
    expect(
      toggleSvtExperimentalObservation(
        ["glucobay-lowers-activity"],
        "glucobay-lowers-activity",
      ),
    ).toEqual([]);
  });

  it("builds mission result JSON with the contract parser", () => {
    const preset = svtExperimentalGraphTablePresets[1];
    const result = buildSvtExperimentalWorkbenchResult({
      missionId: "mission-1",
      preset,
      readings: [
        { id: "optimum-ph", value: 7 },
        { id: "max-activity", value: 100 },
      ],
      selectedObservationIds: preset.prompt.requiredObservationIds,
      conclusion:
        "عند pH 7 يكون النشاط أعظميا، وتغير pH يؤثر في بنية الموقع الفعال.",
    });

    expect(result).toMatchObject({
      tool: "svt-experimental-graph-table",
      missionId: "mission-1",
      presetId: "enzyme-ph-optimum",
      evaluation: {
        passed: true,
      },
    });
  });

  it("falls back to the first preset when mission preset data is invalid", () => {
    expect(getSvtExperimentalWorkbenchPreset({ bad: true }).id).toBe(
      "glucobay-alpha-glucosidase",
    );
  });
});
