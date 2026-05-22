import { describe, expect, it } from "vitest";
import {
  evaluateDiagramLabels,
  revealDiagramLabels,
  type LabDiagramLabelTarget,
} from "./lab-diagram-labeling-engine";

const targets = [
  {
    id: "ribosome",
    title: "1",
    hotspot: { x: 42, y: 64, radius: 8 },
    expectedLabel: "Ribosome",
    acceptedLabels: ["الريبوزوم"],
  },
  {
    id: "mrna",
    title: "2",
    hotspot: { x: 20, y: 75 },
    expectedLabel: "mRNA",
  },
] satisfies LabDiagramLabelTarget[];

describe("lab diagram labeling engine", () => {
  it("checks labels with aliases and reveal payloads", () => {
    const evaluation = evaluateDiagramLabels(targets, [
      { targetId: "ribosome", label: " الريبوزوم " },
      { targetId: "mrna", label: "ARNm" },
    ]);

    expect(evaluation).toMatchObject({
      passed: false,
      correctCount: 1,
      totalCount: 2,
    });
    expect(revealDiagramLabels(targets)).toEqual([
      {
        targetId: "ribosome",
        label: "Ribosome",
        hotspot: { x: 42, y: 64, radius: 8 },
      },
      {
        targetId: "mrna",
        label: "mRNA",
        hotspot: { x: 20, y: 75 },
      },
    ]);
  });
});
