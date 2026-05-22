export type LabTableCellValue = string | number | null;

export type LabTableCellAddress = {
  rowId: string;
  columnId: string;
};

export type LabTableExpectedCell = LabTableCellAddress & {
  expectedValue: LabTableCellValue;
  tolerance?: number;
  acceptedText?: string[];
};

export type LabTableAnswerCell = LabTableCellAddress & {
  value: LabTableCellValue;
};

export type LabTableCellEvaluation = LabTableCellAddress & {
  expectedValue: LabTableCellValue;
  actualValue: LabTableCellValue;
  passed: boolean;
  reason: "MATCH" | "MISSING" | "NUMERIC_MISMATCH" | "TEXT_MISMATCH";
};

export type LabTableEvaluation = {
  passed: boolean;
  correctCount: number;
  totalCount: number;
  cells: LabTableCellEvaluation[];
};

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function toNumber(value: LabTableCellValue) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", "."));

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function makeAnswerKey(address: LabTableCellAddress) {
  return `${address.rowId}:${address.columnId}`;
}

export function evaluateLabTableCells(
  expectedCells: LabTableExpectedCell[],
  answerCells: LabTableAnswerCell[],
): LabTableEvaluation {
  const answersByKey = new Map(
    answerCells.map((answer) => [makeAnswerKey(answer), answer]),
  );
  const cells = expectedCells.map<LabTableCellEvaluation>((expected) => {
    const answer = answersByKey.get(makeAnswerKey(expected));

    if (!answer || answer.value === null || answer.value === "") {
      return {
        rowId: expected.rowId,
        columnId: expected.columnId,
        expectedValue: expected.expectedValue,
        actualValue: answer?.value ?? null,
        passed: false,
        reason: "MISSING",
      };
    }

    const expectedNumber = toNumber(expected.expectedValue);
    const actualNumber = toNumber(answer.value);

    if (expectedNumber !== null && actualNumber !== null) {
      const tolerance = expected.tolerance ?? 0;
      const passed = Math.abs(actualNumber - expectedNumber) <= tolerance;

      return {
        rowId: expected.rowId,
        columnId: expected.columnId,
        expectedValue: expected.expectedValue,
        actualValue: answer.value,
        passed,
        reason: passed ? "MATCH" : "NUMERIC_MISMATCH",
      };
    }

    const acceptedText = [
      String(expected.expectedValue ?? ""),
      ...(expected.acceptedText ?? []),
    ].map(normalizeText);
    const actualText = normalizeText(String(answer.value));
    const passed = acceptedText.includes(actualText);

    return {
      rowId: expected.rowId,
      columnId: expected.columnId,
      expectedValue: expected.expectedValue,
      actualValue: answer.value,
      passed,
      reason: passed ? "MATCH" : "TEXT_MISMATCH",
    };
  });
  const correctCount = cells.filter((cell) => cell.passed).length;

  return {
    passed: correctCount === cells.length,
    correctCount,
    totalCount: cells.length,
    cells,
  };
}

export function summarizeLabTableRows(evaluation: LabTableEvaluation) {
  const rowTotals = new Map<string, { correct: number; total: number }>();

  for (const cell of evaluation.cells) {
    const row = rowTotals.get(cell.rowId) ?? { correct: 0, total: 0 };
    row.total += 1;
    row.correct += cell.passed ? 1 : 0;
    rowTotals.set(cell.rowId, row);
  }

  return Array.from(rowTotals.entries()).map(([rowId, totals]) => ({
    rowId,
    ...totals,
    passed: totals.correct === totals.total,
  }));
}
