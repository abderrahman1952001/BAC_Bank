import { describe, expect, it } from "vitest";
import { extractChemistryStructureRenderData } from "./chemistry-structure-renderer";

describe("chemistry structure renderer data extraction", () => {
  it("accepts visually checked nested chemistry structures using the outer kind", () => {
    const data = extractChemistryStructureRenderData({
      kind: "chemistry_structure",
      chemistryStructure: {
        source: "CCO",
        title: "Ethanol",
        reviewStatus: "visual_checked",
      },
    });

    expect(data).toMatchObject({
      kind: "chemistry_structure",
      source: "CCO",
      title: "Ethanol",
      reviewStatus: "visual_checked",
    });
  });

  it("accepts multi-molecule panels and defaults unchecked data to candidate", () => {
    const data = extractChemistryStructureRenderData({
      kind: "chemistry_structure",
      layout: "grid",
      items: [
        {
          title: "Ala",
          smiles: "NC(C)C(=O)O",
        },
        {
          title: "Ser",
          smiles: "NC(CO)C(=O)O",
        },
      ],
    });

    expect(data).toMatchObject({
      kind: "chemistry_structure",
      layout: "grid",
      reviewStatus: "candidate",
      items: [
        {
          title: "Ala",
          source: "NC(C)C(=O)O",
        },
        {
          title: "Ser",
          source: "NC(CO)C(=O)O",
        },
      ],
    });
  });

  it("rejects declared chemistry structures without a molecule source", () => {
    expect(
      extractChemistryStructureRenderData({
        kind: "chemistry_structure",
        title: "Missing molecule",
      }),
    ).toBeNull();
  });
});
