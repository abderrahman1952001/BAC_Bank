import { describe, expect, it } from "vitest";
import { extractTechnicalDiagramRenderData } from "./technical-diagram-renderer";

describe("technical diagram renderer data extraction", () => {
  it("accepts visually checked flow diagrams with explicit source geometry", () => {
    const data = extractTechnicalDiagramRenderData({
      kind: "technical_flow",
      reviewStatus: "visual_checked",
      nodes: [
        {
          id: "step-1",
          x: 10,
          y: 20,
          width: 120,
          height: 48,
          label: "1",
          type: "step",
        },
      ],
      connectors: [
        {
          from: "step-1",
          points: [
            { x: 130, y: 44 },
            { x: 180, y: 44 },
          ],
        },
      ],
    });

    expect(data).toMatchObject({
      kind: "technical_flow",
      reviewStatus: "visual_checked",
      nodes: [
        {
          id: "step-1",
          label: "1",
          type: "step",
        },
      ],
    });
  });

  it("accepts technical grid rows and defaults unchecked data to candidate", () => {
    const data = extractTechnicalDiagramRenderData({
      kind: "technical_grid",
      rows: [
        ["A", "B"],
        ["0", "1"],
      ],
    });

    expect(data).toMatchObject({
      kind: "technical_grid",
      reviewStatus: "candidate",
      rows: [
        ["A", "B"],
        ["0", "1"],
      ],
    });
  });

  it("rejects declared technical diagrams without renderable payload", () => {
    expect(
      extractTechnicalDiagramRenderData({
        kind: "technical_waveform",
        title: "Timing chart",
      }),
    ).toBeNull();
  });
});
