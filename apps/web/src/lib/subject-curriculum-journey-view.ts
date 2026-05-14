import type { CSSProperties } from "react";
import type { CurriculumJourneysResponse } from "@/lib/study-api";

export type CurriculumJourney = CurriculumJourneysResponse["data"][number];
export type CurriculumJourneyNode = CurriculumJourney["nodes"][number];
export type CurriculumJourneySection = CurriculumJourney["sections"][number];
export type CurriculumJourneyTone = "brand" | "success" | "warning" | "accent";

export type CurriculumJourneyNodePresentation = {
  tone: CurriculumJourneyTone;
  statusLabel: string;
  progressPercent: number;
  connectorPathLength: number;
  isRecommended: boolean;
  style: CSSProperties &
    Record<
      "--curriculum-journey-progress" | "--curriculum-journey-delay",
      string
    >;
};

export function clampCurriculumJourneyProgress(value: number) {
  return Math.max(0, Math.min(value, 100));
}

export function getCurriculumJourneyNodeTone(
  node: CurriculumJourneyNode,
): CurriculumJourneyTone {
  if (node.status === "NEEDS_REVIEW") {
    return "warning";
  }

  if (node.status === "IN_PROGRESS") {
    return "brand";
  }

  if (node.status === "SOLID") {
    return "success";
  }

  return "accent";
}

export function getCurriculumJourneyNodeStatusLabel(
  node: CurriculumJourneyNode,
) {
  switch (node.status) {
    case "SOLID":
      return "ثابت";
    case "IN_PROGRESS":
      return "قيد البناء";
    case "NEEDS_REVIEW":
      return "مراجعة الآن";
    default:
      return "جاهز";
  }
}

export function getCurriculumJourneyConnectorPathLength(
  node: CurriculumJourneyNode,
  isLast: boolean,
) {
  if (isLast) {
    return 0;
  }

  if (node.status === "SOLID") {
    return 1;
  }

  if (node.status === "IN_PROGRESS") {
    return clampCurriculumJourneyProgress(node.progressPercent) / 100;
  }

  if (node.status === "NEEDS_REVIEW") {
    return Math.max(
      0.25,
      clampCurriculumJourneyProgress(node.progressPercent) / 100,
    );
  }

  return 0;
}

export function getCurriculumJourneyNodePresentation(
  node: CurriculumJourneyNode,
  input: {
    index: number;
    isLast: boolean;
    isRecommended: boolean;
  },
): CurriculumJourneyNodePresentation {
  const progressPercent = clampCurriculumJourneyProgress(node.progressPercent);
  const connectorPathLength = getCurriculumJourneyConnectorPathLength(
    node,
    input.isLast,
  );

  return {
    tone: getCurriculumJourneyNodeTone(node),
    statusLabel: getCurriculumJourneyNodeStatusLabel(node),
    progressPercent,
    connectorPathLength,
    isRecommended: input.isRecommended,
    style: {
      "--curriculum-journey-progress": `${progressPercent}%`,
      "--curriculum-journey-delay": `${120 + input.index * 70}ms`,
    },
  };
}

export function getCurriculumJourneySectionSummary(
  section: CurriculumJourneySection,
) {
  const solidCount = section.nodes.filter(
    (node) => node.status === "SOLID",
  ).length;
  const needsReviewCount = section.nodes.filter(
    (node) => node.status === "NEEDS_REVIEW",
  ).length;
  const progressPercent = section.nodes.length
    ? Math.round(
        section.nodes.reduce((sum, node) => sum + node.progressPercent, 0) /
          section.nodes.length,
      )
    : 0;

  return {
    solidCount,
    needsReviewCount,
    progressPercent,
  };
}
