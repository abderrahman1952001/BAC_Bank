import { describe, expect, it } from "vitest";
import type { CurriculumJourneysResponse } from "@/lib/study-api";
import {
  clampCurriculumJourneyProgress,
  getCurriculumJourneyConnectorPathLength,
  getCurriculumJourneyNodePresentation,
  getCurriculumJourneySectionSummary,
} from "./subject-curriculum-journey-view";

type CurriculumJourneyNode =
  CurriculumJourneysResponse["data"][number]["nodes"][number];
type CurriculumJourneySection =
  CurriculumJourneysResponse["data"][number]["sections"][number];

function makeNode(
  overrides: Partial<CurriculumJourneyNode> = {},
): CurriculumJourneyNode {
  return {
    id: "node-1",
    title: "الدوال",
    description: null,
    curriculumNodeCode: "functions",
    curriculumNodeName: "الدوال",
    topicCode: "functions",
    topicName: "الدوال",
    orderIndex: 1,
    estimatedSessions: 2,
    isOptional: false,
    sectionId: "section-1",
    recommendedPreviousNodeId: null,
    recommendedPreviousNodeTitle: null,
    status: "NOT_STARTED",
    progressPercent: 0,
    weaknessScore: 0,
    attemptedQuestions: 0,
    correctCount: 0,
    incorrectCount: 0,
    lastSeenAt: null,
    ...overrides,
  };
}

describe("subject curriculum journey view helpers", () => {
  it("clamps progress values before they are used by visual controls", () => {
    expect(clampCurriculumJourneyProgress(-12)).toBe(0);
    expect(clampCurriculumJourneyProgress(47)).toBe(47);
    expect(clampCurriculumJourneyProgress(130)).toBe(100);
  });

  it("maps node status into the visual tone and Arabic label", () => {
    expect(
      getCurriculumJourneyNodePresentation(makeNode({ status: "SOLID" }), {
        index: 0,
        isLast: false,
        isRecommended: false,
      }),
    ).toMatchObject({
      tone: "success",
      statusLabel: "ثابت",
      connectorPathLength: 1,
    });

    expect(
      getCurriculumJourneyNodePresentation(
        makeNode({
          status: "IN_PROGRESS",
          progressPercent: 42,
        }),
        {
          index: 1,
          isLast: false,
          isRecommended: true,
        },
      ),
    ).toMatchObject({
      tone: "brand",
      statusLabel: "قيد البناء",
      progressPercent: 42,
      isRecommended: true,
      connectorPathLength: 0.42,
    });
  });

  it("keeps unfinished connectors partial and hides the final connector", () => {
    expect(
      getCurriculumJourneyConnectorPathLength(
        makeNode({ status: "NEEDS_REVIEW", progressPercent: 8 }),
        false,
      ),
    ).toBe(0.25);
    expect(
      getCurriculumJourneyConnectorPathLength(
        makeNode({ status: "NOT_STARTED", progressPercent: 100 }),
        false,
      ),
    ).toBe(0);
    expect(
      getCurriculumJourneyConnectorPathLength(
        makeNode({ status: "SOLID", progressPercent: 100 }),
        true,
      ),
    ).toBe(0);
  });

  it("summarizes section progress from the node mix", () => {
    const section: CurriculumJourneySection = {
      id: "section-1",
      code: "analysis",
      title: "التحليل",
      description: null,
      orderIndex: 1,
      nodes: [
        makeNode({ id: "solid", status: "SOLID", progressPercent: 100 }),
        makeNode({ id: "review", status: "NEEDS_REVIEW", progressPercent: 30 }),
        makeNode({ id: "active", status: "IN_PROGRESS", progressPercent: 50 }),
      ],
    };

    expect(getCurriculumJourneySectionSummary(section)).toEqual({
      solidCount: 1,
      needsReviewCount: 1,
      progressPercent: 60,
    });
  });
});
