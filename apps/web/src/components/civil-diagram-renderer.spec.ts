import { describe, expect, it } from "vitest";
import { extractCivilDiagramRenderData } from "./civil-diagram-renderer";

describe("civil diagram renderer data extraction", () => {
  it("accepts visually checked nested civil diagrams with supported elements", () => {
    const data = extractCivilDiagramRenderData({
      civilDiagram: {
        kind: "civil_diagram",
        reviewStatus: "visual_checked",
        viewBox: [0, 0, 240, 120],
        elements: [
          {
            type: "line",
            from: { x: 20, y: 70 },
            to: { x: 220, y: 70 },
            label: "AB",
          },
          {
            type: "support",
            support: "pin",
            at: { x: 20, y: 70 },
          },
        ],
      },
    });

    expect(data).toMatchObject({
      kind: "civil_diagram",
      reviewStatus: "visual_checked",
      viewBox: [0, 0, 240, 120],
      elements: [
        {
          type: "line",
          label: "AB",
        },
        {
          type: "support",
          support: "pin",
        },
      ],
    });
  });

  it("defaults unchecked diagrams to candidate", () => {
    const data = extractCivilDiagramRenderData({
      kind: "civil_diagram",
      elements: [
        {
          type: "rect",
          x: 10,
          y: 20,
          width: 80,
          height: 40,
        },
      ],
    });

    expect(data).toMatchObject({
      kind: "civil_diagram",
      reviewStatus: "candidate",
    });
  });

  it("rejects diagrams whose elements cannot render faithfully", () => {
    expect(
      extractCivilDiagramRenderData({
        kind: "civil_diagram",
        elements: [
          {
            type: "dense-plan",
            label: "Do not render natively",
          },
        ],
      }),
    ).toBeNull();
  });
});
