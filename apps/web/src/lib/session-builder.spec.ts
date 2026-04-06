import { describe, expect, it } from "vitest";
import type { FiltersResponse } from "@/lib/qbank";
import {
  buildBuilderPlanText,
  buildSessionBuilderViewModel,
  buildCreateSessionRequest,
  buildPreviewSessionRequest,
  buildSelectedTopicLabel,
  buildYearsFromRange,
  buildZeroResultsGuidance,
  isBuilderStepCompleted,
  isBuilderStepEnabled,
  resolveDefaultStreamCodes,
  resolveStoredSessionBuilderState,
} from "./session-builder";

const filters = {
  streams: [
    {
      code: "SE",
      name: "Sciences experimentales",
      subjectCodes: ["MATH"],
      family: {
        code: "SCI",
        name: "Sciences",
      },
    },
    {
      code: "TM",
      name: "Techniques mathematiques",
      subjectCodes: ["MATH"],
      family: {
        code: "MATH_FAMILY",
        name: "Math family",
      },
    },
  ],
  subjects: [
    {
      code: "MATH",
      name: "Mathematics",
      streams: [
        {
          code: "SE",
          name: "Sciences experimentales",
          family: {
            code: "SCI",
            name: "Sciences",
          },
        },
      ],
      streamCodes: ["SE"],
    },
  ],
  years: [2025, 2024, 2023, 2022, 2021],
  topics: [
    {
      code: "ALG",
      name: "Algebra",
      slug: "algebra",
      parentCode: null,
      displayOrder: 1,
      isSelectable: true,
      subject: {
        code: "MATH",
        name: "Mathematics",
      },
      streamCodes: ["SE", "TM"],
    },
    {
      code: "FUNC",
      name: "Functions",
      slug: "functions",
      parentCode: null,
      displayOrder: 2,
      isSelectable: true,
      subject: {
        code: "MATH",
        name: "Mathematics",
      },
      streamCodes: ["SE"],
    },
  ],
  sessionTypes: ["NORMAL", "MAKEUP"],
} satisfies FiltersResponse;

describe("session builder helpers", () => {
  it("builds years from numeric and custom ranges", () => {
    expect(buildYearsFromRange(filters.years, "3", null, null)).toEqual([
      2025, 2024, 2023,
    ]);
    expect(buildYearsFromRange(filters.years, "custom", 2022, 2024)).toEqual([
      2024, 2023, 2022,
    ]);
  });

  it("resolves default streams by code or family", () => {
    expect(resolveDefaultStreamCodes(filters.streams, "SE")).toEqual(["SE"]);
    expect(resolveDefaultStreamCodes(filters.streams, "SCI")).toEqual(["SE"]);
  });

  it("restores only preferences that are valid for the current filters", () => {
    const restored = resolveStoredSessionBuilderState(
      {
        subjectCode: "MATH",
        topicCodes: ["ALG"],
        streamCodes: ["SE"],
        topicMode: "custom",
        yearMode: "custom",
        yearStart: 2022,
        yearEnd: 2025,
        sessionTypes: ["NORMAL", "MAKEUP", "INVALID" as never],
        exerciseCount: 10,
      },
      filters,
      "SCI",
    );

    expect(restored.subjectCode).toBe("MATH");
    expect(restored.topicCodes).toEqual(["ALG"]);
    expect(restored.topicSelectionMode).toBe("custom");
    expect(restored.selectedStreamCodes).toEqual(["SE"]);
    expect(restored.yearMode).toBe("custom");
    expect(restored.yearStart).toBe(2022);
    expect(restored.yearEnd).toBe(2025);
    expect(restored.sessionTypes).toEqual(["NORMAL", "MAKEUP"]);
    expect(restored.exerciseCount).toBe(10);
  });

  it("builds preview and create requests without empty stream filters", () => {
    expect(
      buildPreviewSessionRequest({
        subjectCode: "MATH",
        topicCodes: ["ALG"],
        effectiveStreamCodes: [],
        selectedYears: [2025, 2024],
        sessionTypes: ["NORMAL"],
      }),
    ).toEqual({
      subjectCode: "MATH",
      topicCodes: ["ALG"],
      streamCodes: undefined,
      years: [2025, 2024],
      sessionTypes: ["NORMAL"],
    });

    expect(
      buildCreateSessionRequest({
        title: "  Calculus sprint  ",
        subjectCode: "MATH",
        topicCodes: ["ALG"],
        effectiveStreamCodes: ["SE"],
        selectedYears: [2025],
        sessionTypes: [],
        exerciseCount: 8,
      }),
    ).toEqual({
      title: "Calculus sprint",
      subjectCode: "MATH",
      topicCodes: ["ALG"],
      streamCodes: ["SE"],
      years: [2025],
      sessionTypes: [],
      exerciseCount: 8,
    });
  });

  it("builds summary labels for topics and plan text", () => {
    const selectedTopicLabel = buildSelectedTopicLabel({
      selectedSubjectName: "Mathematics",
      topicSelectionComplete: true,
      topicSelectionMode: "custom",
      topicCodes: ["ALG", "FUNC"],
      topicLookup: new Map([
        ["ALG", { name: "Algebra" }],
        ["FUNC", { name: "Functions" }],
      ]),
    });

    expect(selectedTopicLabel).toBe("2 محاور");
    expect(
      buildBuilderPlanText({
        selectedSubjectName: "Mathematics",
        topicSelectionComplete: true,
        yearSelectionComplete: true,
        selectedTopicLabel,
        selectedYearsLabel: "بين 2022 و 2025",
        effectiveStreamCodes: ["SE", "TM"],
        availableStreams: filters.streams,
        previewMatchingExerciseCount: 6,
        exerciseCount: 8,
        sessionTypes: ["NORMAL", "MAKEUP"],
      }),
    ).toBe(
      "6 تمارين · 2 محاور · Sciences experimentales + Techniques mathematiques · بين 2022 و 2025 · عادية + استدراكية.",
    );
  });

  it("builds a builder view model from filters, stream defaults, and preview state", () => {
    const viewModel = buildSessionBuilderViewModel({
      filters,
      userStreamCode: "SCI",
      subjectCode: "MATH",
      topicCodes: ["ALG"],
      topicSelectionMode: "custom",
      selectedStreamCodes: null,
      yearMode: "3",
      yearStart: null,
      yearEnd: null,
      sessionTypes: ["NORMAL"],
      exerciseCount: 8,
      preview: null,
      previewLoading: false,
    });

    expect(viewModel.suggestedSubjects.map((subject) => subject.code)).toEqual([
      "MATH",
    ]);
    expect(viewModel.defaultStreamCodes).toEqual(["SE"]);
    expect(viewModel.effectiveStreamCodes).toEqual(["SE"]);
    expect(viewModel.availableTopics.map((topic) => topic.code)).toEqual([
      "ALG",
      "FUNC",
    ]);
    expect(viewModel.selectedYears).toEqual([2025, 2024, 2023]);
    expect(viewModel.selectedTopicLabel).toBe("Algebra");
    expect(viewModel.builderReadyToPreview).toBe(true);
    expect(viewModel.maxExerciseCount).toBe(20);
  });

  it("prioritizes zero-results guidance from narrowest filters outward", () => {
    expect(
      buildZeroResultsGuidance({
        builderReadyToPreview: true,
        previewLoading: false,
        previewMatchingExerciseCount: 0,
        topicSelectionMode: "custom",
        topicCodesLength: 2,
        effectiveStreamCodesLength: 1,
        sessionTypesLength: 1,
        totalYearsCount: 5,
        selectedYearsLength: 2,
        yearMode: "custom",
      }),
    ).toMatchObject({
      action: "open_all_topics",
      actionLabel: "فتح كل المحاور",
    });

    expect(
      buildZeroResultsGuidance({
        builderReadyToPreview: true,
        previewLoading: false,
        previewMatchingExerciseCount: 0,
        topicSelectionMode: "all",
        topicCodesLength: 0,
        effectiveStreamCodesLength: 0,
        sessionTypesLength: 0,
        totalYearsCount: 5,
        selectedYearsLength: 2,
        yearMode: "custom",
      }),
    ).toMatchObject({
      action: "open_all_years",
      actionLabel: "كل السنوات",
    });
  });

  it("computes step enablement and completion consistently", () => {
    expect(
      isBuilderStepEnabled(3, {
        subjectCode: "MATH",
        topicSelectionComplete: true,
        yearSelectionComplete: false,
      }),
    ).toBe(true);
    expect(
      isBuilderStepEnabled(4, {
        subjectCode: "MATH",
        topicSelectionComplete: true,
        yearSelectionComplete: false,
      }),
    ).toBe(false);
    expect(
      isBuilderStepCompleted(4, {
        subjectCode: "MATH",
        topicSelectionComplete: true,
        yearSelectionComplete: true,
        hasPreviewResults: true,
      }),
    ).toBe(true);
  });
});
