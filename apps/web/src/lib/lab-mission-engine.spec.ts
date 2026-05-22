import { describe, expect, it } from "vitest";
import { evaluateReusableLabMissionExitCheck } from "./lab-mission-engine";

describe("lab mission engine", () => {
  it("evaluates table mission checks through the reusable table engine", () => {
    expect(
      evaluateReusableLabMissionExitCheck(
        {
          kind: "TABLE_CELLS",
          expectedCells: [
            {
              rowId: "trial-1",
              columnId: "ph",
              expectedValue: 7.2,
              tolerance: 0.1,
            },
          ],
        },
        {
          answerCells: [{ rowId: "trial-1", columnId: "ph", value: 7.25 }],
        },
      ),
    ).toMatchObject({
      kind: "TABLE_CELLS",
      passed: true,
    });
  });

  it("evaluates document evidence and graph point checks", () => {
    expect(
      evaluateReusableLabMissionExitCheck(
        {
          kind: "DOCUMENT_EVIDENCE",
          requiredEvidenceIds: ["doc-a"],
          requiredConclusionKeywords: ["enzyme"],
        },
        {
          selectedEvidenceIds: ["doc-a"],
          conclusion: "The enzyme activity changes.",
        },
      ),
    ).toMatchObject({
      passed: true,
    });
    expect(
      evaluateReusableLabMissionExitCheck(
        {
          kind: "GRAPH_POINT",
          x: 2,
          y: 8,
          tolerance: 0.25,
        },
        {
          graphPoints: [{ x: 2.1, y: 8.1 }],
        },
      ),
    ).toMatchObject({
      passed: true,
    });
  });
});

