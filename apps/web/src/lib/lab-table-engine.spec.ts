import { describe, expect, it } from "vitest";
import {
  evaluateLabTableCells,
  summarizeLabTableRows,
  type LabTableAnswerCell,
  type LabTableExpectedCell,
} from "./lab-table-engine";

describe("lab table engine", () => {
  it("checks numeric cells with tolerance and text cells with aliases", () => {
    const expected = [
      {
        rowId: "r1",
        columnId: "mass",
        expectedValue: 12.5,
        tolerance: 0.1,
      },
      {
        rowId: "r1",
        columnId: "state",
        expectedValue: "positive",
        acceptedText: ["موجب", "+"],
      },
    ] satisfies LabTableExpectedCell[];
    const answers = [
      { rowId: "r1", columnId: "mass", value: "12,45" },
      { rowId: "r1", columnId: "state", value: "+" },
    ] satisfies LabTableAnswerCell[];

    expect(evaluateLabTableCells(expected, answers)).toMatchObject({
      passed: true,
      correctCount: 2,
      totalCount: 2,
    });
  });

  it("reports missing and mismatched cells with row summaries", () => {
    const evaluation = evaluateLabTableCells(
      [
        { rowId: "r1", columnId: "a", expectedValue: 3 },
        { rowId: "r1", columnId: "b", expectedValue: "enzyme" },
      ],
      [{ rowId: "r1", columnId: "a", value: 4 }],
    );

    expect(evaluation.passed).toBe(false);
    expect(evaluation.cells.map((cell) => cell.reason)).toEqual([
      "NUMERIC_MISMATCH",
      "MISSING",
    ]);
    expect(summarizeLabTableRows(evaluation)).toEqual([
      {
        rowId: "r1",
        correct: 0,
        total: 2,
        passed: false,
      },
    ]);
  });
});
