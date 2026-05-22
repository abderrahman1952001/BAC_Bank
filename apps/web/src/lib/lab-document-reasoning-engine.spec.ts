import { describe, expect, it } from "vitest";
import {
  evaluateDocumentReasoning,
  groupEvidenceByDocument,
  type LabEvidenceItem,
} from "./lab-document-reasoning-engine";

describe("lab document reasoning engine", () => {
  it("checks required evidence selection and conclusion keywords", () => {
    expect(
      evaluateDocumentReasoning(
        {
          requiredEvidenceIds: ["doc1-rate", "doc2-control"],
          requiredConclusionKeywords: ["enzyme", "temperature"],
        },
        {
          selectedEvidenceIds: ["doc1-rate"],
          conclusion: "The enzyme changes with pH.",
        },
      ),
    ).toEqual({
      passed: false,
      selectedRequiredCount: 1,
      requiredEvidenceCount: 2,
      missingEvidenceIds: ["doc2-control"],
      missingKeywords: ["temperature"],
    });
  });

  it("groups evidence by source document", () => {
    const evidence = [
      { id: "a", documentId: "doc1", label: "A" },
      { id: "b", documentId: "doc2", label: "B" },
      { id: "c", documentId: "doc1", label: "C" },
    ] satisfies LabEvidenceItem[];

    expect(groupEvidenceByDocument(evidence)).toEqual([
      {
        documentId: "doc1",
        items: [
          { id: "a", documentId: "doc1", label: "A" },
          { id: "c", documentId: "doc1", label: "C" },
        ],
      },
      {
        documentId: "doc2",
        items: [{ id: "b", documentId: "doc2", label: "B" }],
      },
    ]);
  });
});

