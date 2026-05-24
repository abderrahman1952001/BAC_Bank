import type {
  MathProbabilityAnswerCell,
  MathProbabilityExpectedCell,
  MathProbabilityPreset,
  MathProbabilityTreeNode,
  MathProbabilityWorkbenchResult,
} from "@bac-bank/contracts/lab";
import {
  parseMathProbabilityPreset,
  parseMathProbabilityWorkbenchResult,
} from "@bac-bank/contracts/lab";
import { evaluateDocumentReasoning } from "@/lib/lab-document-reasoning-engine";
import {
  evaluateLabTableCells,
  type LabTableEvaluation,
} from "@/lib/lab-table-engine";

export type MathProbabilityWorkbenchAnswer = {
  answerCells: MathProbabilityAnswerCell[];
  conclusion: string;
};

export type MathProbabilityWorkbenchEvaluation = {
  passed: boolean;
  tablePassed: boolean;
  conclusionPassed: boolean;
  correctCellCount: number;
  totalCellCount: number;
  missingKeywords: string[];
  table: LabTableEvaluation;
};

export const mathProbabilityWorkbenchPresets: MathProbabilityPreset[] = [
  {
    id: "conditional-tree-two-stage-draw",
    title: "شجرة الاحتمالات في سحب على مرحلتين",
    subtitle: "إكمال شجرة احتمالات ثم استخراج احتمال تقاطع واحتمال شرطي.",
    bacContext:
      "نمط متكرر في BAC رياضيات، خاصة شعبة العلوم التجريبية: نقل شجرة احتمالات ناقصة، إكمال الفروع، ثم استعمالها لحساب احتمال حدث مركب أو احتمال شرطي.",
    sourceHint:
      "مستوحى من مواضيع رياضيات 2025 حيث يطلب من الطالب: انقل وأكمل شجرة الاحتمالات المقابلة.",
    tree: {
      title: "شجرة تجربة سحب كرتين تباعا",
      direction: "rtl",
      root: {
        id: "start",
        label: "البداية",
        children: [
          {
            id: "a",
            label: "A",
            edgeLabel: "A",
            probability: null,
            answerCell: { rowId: "p-a", columnId: "value" },
            children: [
              {
                id: "a-b",
                label: "B",
                edgeLabel: "B",
                probability: null,
                answerCell: { rowId: "p-b-given-a", columnId: "value" },
              },
              {
                id: "a-not-b",
                label: "B̄",
                edgeLabel: "B̄",
                probability: "9/10",
              },
            ],
          },
          {
            id: "not-a",
            label: "Ā",
            edgeLabel: "Ā",
            probability: null,
            answerCell: { rowId: "p-not-a", columnId: "value" },
            children: [
              {
                id: "not-a-b",
                label: "B",
                edgeLabel: "B",
                probability: "1/5",
              },
              {
                id: "not-a-not-b",
                label: "B̄",
                edgeLabel: "B̄",
                probability: null,
                answerCell: {
                  rowId: "p-not-b-given-not-a",
                  columnId: "value",
                },
              },
            ],
          },
        ],
      },
    },
    table: {
      title: "خلايا الإكمال والحساب",
      columns: [
        { id: "item", label: "العنصر" },
        { id: "value", label: "القيمة" },
      ],
      rows: [
        { id: "p-a", label: "P(A)", cells: { item: "P(A)", value: null } },
        {
          id: "p-not-a",
          label: "P(Ā)",
          cells: { item: "P(Ā)", value: null },
        },
        {
          id: "p-b-given-a",
          label: "P(B/A)",
          cells: { item: "P(B/A)", value: null },
        },
        {
          id: "p-not-b-given-not-a",
          label: "P(B̄/Ā)",
          cells: { item: "P(B̄/Ā)", value: null },
        },
        {
          id: "p-a-and-b",
          label: "P(A∩B)",
          cells: { item: "P(A∩B)", value: null },
        },
      ],
    },
    expectedCells: [
      expectedProbabilityCell("p-a", "value", 0.4, ["2/5", "0,4"]),
      expectedProbabilityCell("p-not-a", "value", 0.6, ["3/5", "0,6"]),
      expectedProbabilityCell("p-b-given-a", "value", 0.1, ["1/10", "0,1"]),
      expectedProbabilityCell("p-not-b-given-not-a", "value", 0.8, [
        "4/5",
        "0,8",
      ]),
      expectedProbabilityCell("p-a-and-b", "value", 0.04, ["1/25", "0,04"]),
    ],
    prompt: {
      title: "أكمل الشجرة ثم احسب احتمال A∩B.",
      task: "املأ الاحتمالات الناقصة في الشجرة والجدول، ثم اكتب جملة قصيرة تشرح استعمال قاعدة ضرب الاحتمالات.",
      requiredConclusionKeywords: ["P(A∩B)", "P(A)", "P(B/A)", "ضرب"],
      scaffoldPhrases: [
        "نستعمل قاعدة ضرب الاحتمالات على فرع الشجرة.",
        "P(A∩B)=P(A)×P(B/A).",
        "إذن P(A∩B)=2/5×1/10=1/25.",
      ],
    },
  },
  {
    id: "probability-law-expected-value",
    title: "قانون احتمال متغير عشوائي",
    subtitle: "ملء جدول قانون احتمال ثم حساب الأمل الرياضي.",
    bacContext:
      "تظهر في مواضيع الرياضيات أسئلة حول متغير عشوائي X: تحديد قيمه، ملء قانون الاحتمال، ثم حساب E(X) لتفسير ربح أو عدد كرات أو نتيجة لعبة.",
    sourceHint:
      "مستوحى من تمارين BAC 2025 التي تجمع بين جدول قانون احتمال وحساب الأمل الرياضي.",
    table: {
      title: "قانون احتمال X",
      columns: [
        { id: "x", label: "قيمة X" },
        { id: "probability", label: "P(X=x)" },
        { id: "weighted", label: "x × P(X=x)" },
      ],
      rows: [
        {
          id: "x0",
          label: "X = 0",
          cells: { x: 0, probability: null, weighted: null },
        },
        {
          id: "x1",
          label: "X = 1",
          cells: { x: 1, probability: null, weighted: null },
        },
        {
          id: "x2",
          label: "X = 2",
          cells: { x: 2, probability: null, weighted: null },
        },
        {
          id: "expectation",
          label: "E(X)",
          cells: { x: "E(X)", probability: "", weighted: null },
        },
      ],
    },
    expectedCells: [
      expectedProbabilityCell("x0", "probability", 0.2, ["1/5", "0,2"]),
      expectedProbabilityCell("x1", "probability", 0.5, ["1/2", "0,5"]),
      expectedProbabilityCell("x2", "probability", 0.3, ["3/10", "0,3"]),
      expectedProbabilityCell("x0", "weighted", 0, ["0"]),
      expectedProbabilityCell("x1", "weighted", 0.5, ["1/2", "0,5"]),
      expectedProbabilityCell("x2", "weighted", 0.6, ["3/5", "0,6"]),
      expectedProbabilityCell("expectation", "weighted", 1.1, [
        "11/10",
        "1,1",
      ]),
    ],
    prompt: {
      title: "أتمم قانون احتمال X واحسب E(X).",
      task: "املأ خلايا الاحتمال والمساهمة، ثم اكتب جملة تشرح أن الأمل الرياضي هو مجموع x×P(X=x).",
      requiredConclusionKeywords: ["E(X)", "مجموع", "x×P", "1.1"],
      scaffoldPhrases: [
        "نتحقق أولا أن مجموع الاحتمالات يساوي 1.",
        "نحسب كل مساهمة بالجداء x×P(X=x).",
        "إذن E(X)=0×1/5+1×1/2+2×3/10=1.1.",
      ],
    },
  },
];

function expectedProbabilityCell(
  rowId: string,
  columnId: string,
  expectedValue: number | string,
  acceptedText: string[] = [],
): MathProbabilityExpectedCell {
  return {
    rowId,
    columnId,
    expectedValue,
    tolerance: typeof expectedValue === "number" ? 0.005 : undefined,
    acceptedText,
  };
}

function treeAnswerCells(root: MathProbabilityTreeNode) {
  const cells: MathProbabilityAnswerCell[] = [];

  const walk = (node: MathProbabilityTreeNode) => {
    if (node.answerCell) {
      cells.push({
        rowId: node.answerCell.rowId,
        columnId: node.answerCell.columnId,
        value: null,
      });
    }

    for (const child of node.children ?? []) {
      walk(child);
    }
  };

  walk(root);
  return cells;
}

function tableAnswerCells(preset: MathProbabilityPreset) {
  return preset.table.rows.flatMap((row) =>
    preset.table.columns
      .filter((column) =>
        preset.expectedCells.some(
          (cell) => cell.rowId === row.id && cell.columnId === column.id,
        ),
      )
      .map((column) => ({
        rowId: row.id,
        columnId: column.id,
        value: null,
      })),
  );
}

function uniqueAnswerCells(answerCells: MathProbabilityAnswerCell[]) {
  const seen = new Set<string>();

  return answerCells.filter((cell) => {
    const key = `${cell.rowId}:${cell.columnId}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function getMathProbabilityWorkbenchPresetById(presetId: string) {
  return (
    mathProbabilityWorkbenchPresets.find((preset) => preset.id === presetId) ??
    null
  );
}

export function getMathProbabilityWorkbenchPreset(value: unknown) {
  if (!value) {
    return mathProbabilityWorkbenchPresets[0];
  }

  try {
    return parseMathProbabilityPreset(value);
  } catch {
    return mathProbabilityWorkbenchPresets[0];
  }
}

export function makeMathProbabilityInitialAnswerCells(
  preset: MathProbabilityPreset,
): MathProbabilityAnswerCell[] {
  return uniqueAnswerCells([
    ...(preset.tree ? treeAnswerCells(preset.tree.root) : []),
    ...tableAnswerCells(preset),
  ]);
}

export function updateMathProbabilityAnswerCell(
  answerCells: MathProbabilityAnswerCell[],
  rowId: string,
  columnId: string,
  value: string,
): MathProbabilityAnswerCell[] {
  const nextValue = value.trim() ? value : null;
  const updated = answerCells.some(
    (cell) => cell.rowId === rowId && cell.columnId === columnId,
  )
    ? answerCells.map((cell) =>
        cell.rowId === rowId && cell.columnId === columnId
          ? { ...cell, value: nextValue }
          : cell,
      )
    : [...answerCells, { rowId, columnId, value: nextValue }];

  return uniqueAnswerCells(updated);
}

export function evaluateMathProbabilityWorkbenchAnswer(
  preset: MathProbabilityPreset,
  answer: MathProbabilityWorkbenchAnswer,
): MathProbabilityWorkbenchEvaluation {
  const table = evaluateLabTableCells(preset.expectedCells, answer.answerCells);
  const reasoning = evaluateDocumentReasoning(
    {
      requiredEvidenceIds: [],
      requiredConclusionKeywords: preset.prompt.requiredConclusionKeywords,
    },
    {
      selectedEvidenceIds: [],
      conclusion: answer.conclusion,
    },
  );

  return {
    passed: table.passed && reasoning.passed,
    tablePassed: table.passed,
    conclusionPassed: reasoning.passed,
    correctCellCount: table.correctCount,
    totalCellCount: table.totalCount,
    missingKeywords: reasoning.missingKeywords,
    table,
  };
}

export function buildMathProbabilityWorkbenchResult({
  missionId,
  preset,
  answerCells,
  conclusion,
}: {
  missionId?: string | null;
  preset: MathProbabilityPreset;
  answerCells: MathProbabilityAnswerCell[];
  conclusion: string;
}): MathProbabilityWorkbenchResult {
  return parseMathProbabilityWorkbenchResult({
    tool: "math-probability-workbench",
    missionId: missionId ?? null,
    presetId: preset.id,
    answerCells,
    conclusion,
    evaluation: evaluateMathProbabilityWorkbenchAnswer(preset, {
      answerCells,
      conclusion,
    }),
  });
}
