import type { CSSProperties } from "react";
import type { StudyRoadmapsResponse } from "@/lib/study-api";

export type Roadmap = StudyRoadmapsResponse["data"][number];
export type RoadmapNode = Roadmap["nodes"][number];
export type RoadmapSection = Roadmap["sections"][number];
export type RoadmapTone = "brand" | "success" | "warning" | "accent";

export type RoadmapNodePresentation = {
  tone: RoadmapTone;
  statusLabel: string;
  progressPercent: number;
  connectorPathLength: number;
  isRecommended: boolean;
  style: CSSProperties &
    Record<"--roadmap-progress" | "--roadmap-delay", string>;
};

export function clampRoadmapProgress(value: number) {
  return Math.max(0, Math.min(value, 100));
}

export function getRoadmapNodeTone(node: RoadmapNode): RoadmapTone {
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

export function getRoadmapNodeStatusLabel(node: RoadmapNode) {
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

export function getRoadmapConnectorPathLength(
  node: RoadmapNode,
  isLast: boolean,
) {
  if (isLast) {
    return 0;
  }

  if (node.status === "SOLID") {
    return 1;
  }

  if (node.status === "IN_PROGRESS") {
    return clampRoadmapProgress(node.progressPercent) / 100;
  }

  if (node.status === "NEEDS_REVIEW") {
    return Math.max(0.25, clampRoadmapProgress(node.progressPercent) / 100);
  }

  return 0;
}

export function getRoadmapNodePresentation(
  node: RoadmapNode,
  input: {
    index: number;
    isLast: boolean;
    isRecommended: boolean;
  },
): RoadmapNodePresentation {
  const progressPercent = clampRoadmapProgress(node.progressPercent);
  const connectorPathLength = getRoadmapConnectorPathLength(node, input.isLast);

  return {
    tone: getRoadmapNodeTone(node),
    statusLabel: getRoadmapNodeStatusLabel(node),
    progressPercent,
    connectorPathLength,
    isRecommended: input.isRecommended,
    style: {
      "--roadmap-progress": `${progressPercent}%`,
      "--roadmap-delay": `${120 + input.index * 70}ms`,
    },
  };
}

export function getRoadmapSectionSummary(section: RoadmapSection) {
  const solidCount = section.nodes.filter((node) => node.status === "SOLID").length;
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
