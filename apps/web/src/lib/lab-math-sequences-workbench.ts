import type {
  MathSequenceAnswerCell,
  MathSequenceExpectedCell,
  MathSequenceObservationItem,
  MathSequencesPreset,
  MathSequencesWorkbenchResult,
} from "@bac-bank/contracts/lab";
import {
  parseMathSequencesPreset,
  parseMathSequencesWorkbenchResult,
} from "@bac-bank/contracts/lab";
import { evaluateDocumentReasoning } from "@/lib/lab-document-reasoning-engine";
import {
  evaluateLabTableCells,
  type LabTableEvaluation,
} from "@/lib/lab-table-engine";

export type MathSequencesWorkbenchAnswer = {
  answerCells: MathSequenceAnswerCell[];
  selectedObservationIds: string[];
  conclusion: string;
};

export type MathSequencesWorkbenchEvaluation = {
  passed: boolean;
  tablePassed: boolean;
  observationsPassed: boolean;
  conclusionPassed: boolean;
  correctCellCount: number;
  totalCellCount: number;
  selectedRequiredObservationCount: number;
  requiredObservationCount: number;
  missingObservationIds: string[];
  missingObservationItems: MathSequenceObservationItem[];
  missingKeywords: string[];
  table: LabTableEvaluation;
};

export type MathSequenceGraphPoint = {
  n: number;
  value: number;
};

export const mathSequencesWorkbenchPresets: MathSequencesPreset[] = [
  {
    id: "affine-recurrence-fixed-point",
    title: "متتالية تراجعية ونقطة تثبيت",
    subtitle: "حساب حدود، تحويل هندسي، ثم استنتاج الرتابة والنهاية.",
    bacContext:
      "نمط حاضر في مواضيع BAC: u₀ مع علاقة تراجعية خطية أو دالية، حساب أول الحدود، إثبات الحصر والرتابة، ثم تحويل vₙ إلى متتالية هندسية لاستخراج النهاية.",
    sourceHint:
      "مستوحى من رياضيات GE 2025: u₀=2 و uₙ₊₁=3/5 uₙ + 8/5 ثم vₙ=uₙ-4.",
    definition: {
      sequenceName: "(uₙ)",
      formulaLabel: "u₀=2 ، uₙ₊₁ = 3/5 uₙ + 8/5",
      description:
        "نقطة التثبيت هي 4، لذلك ندرس vₙ=uₙ-4 لقراءة الأساس الهندسي والنهاية.",
      fixedPoint: 4,
    },
    table: {
      title: "جدول الحدود والتحويل",
      columns: [
        { id: "n", label: "n" },
        { id: "u", label: "uₙ" },
        { id: "v", label: "vₙ = uₙ - 4" },
      ],
      rows: [
        { id: "n0", label: "n=0", cells: { n: 0, u: 2, v: null } },
        { id: "n1", label: "n=1", cells: { n: 1, u: null, v: null } },
        { id: "n2", label: "n=2", cells: { n: 2, u: null, v: null } },
        {
          id: "ratio",
          label: "أساس vₙ",
          cells: { n: "q", u: "vₙ₊₁/vₙ", v: null },
        },
        {
          id: "limit",
          label: "النهاية",
          cells: { n: "+∞", u: null, v: 0 },
        },
      ],
    },
    expectedCells: [
      expectedSequenceCell("n0", "v", -2),
      expectedSequenceCell("n1", "u", 2.8, ["14/5", "2,8"]),
      expectedSequenceCell("n1", "v", -1.2, ["-6/5", "-1,2"]),
      expectedSequenceCell("n2", "u", 3.28, ["82/25", "3,28"]),
      expectedSequenceCell("n2", "v", -0.72, ["-18/25", "-0,72"]),
      expectedSequenceCell("ratio", "v", 0.6, ["3/5", "0,6"]),
      expectedSequenceCell("limit", "u", 4),
    ],
    observationItems: [
      {
        id: "terms-approach-4",
        label: "القيم u₀،u₁،u₂ ترتفع وتقترب من 4.",
        detail: "هذا يعطي تخمينا قبل البرهان بالحصر والفرق.",
        kind: "variation",
      },
      {
        id: "v-geometric-q",
        label: "vₙ=uₙ-4 هندسية أساسها 3/5.",
        detail: "التحويل يحول العلاقة التراجعية إلى شكل هندسي مباشر.",
        kind: "transform",
      },
      {
        id: "limit-fixed-point",
        label: "بما أن |3/5|<1 فإن vₙ→0 ومنه uₙ→4.",
        detail: "النهاية تأتي من الأساس الهندسي ونقطة التثبيت.",
        kind: "limit",
      },
      {
        id: "sequence-decreases",
        label: "المتتالية متناقصة وتتجه إلى 0.",
        detail: "اختيار مضلل: الحدود المحسوبة ترتفع من 2 نحو 4.",
        kind: "distractor",
      },
    ],
    prompt: {
      title: "استنتج الرتابة والنهاية من الجدول.",
      task: "أكمل الحدود والتحويل vₙ، اختر الملاحظات الصحيحة، ثم اكتب استنتاجا يربط الأساس الهندسي بالنهاية.",
      requiredObservationIds: [
        "terms-approach-4",
        "v-geometric-q",
        "limit-fixed-point",
      ],
      requiredConclusionKeywords: ["vₙ", "3/5", "هندسية", "uₙ", "4"],
      scaffoldPhrases: [
        "نحسب u₁=14/5 و u₂=82/25.",
        "بطرح 4 نحصل على vₙ₊₁=(3/5)vₙ.",
        "بما أن |3/5|<1 فإن vₙ يؤول إلى 0 ومنه uₙ يؤول إلى 4.",
      ],
    },
  },
  {
    id: "arithmetic-sequence-membership-sum",
    title: "متتالية حسابية ومجموع حدود",
    subtitle: "تحديد الأساس، اختبار انتماء حد، وحساب مجموع جزئي.",
    bacContext:
      "تتكرر في BAC أسئلة المتتاليات الحسابية: حساب الحدود الأولى، إثبات أن الأساس ثابت، حل uₙ=a، ثم استعمال صيغة المجموع.",
    sourceHint:
      "مستوحى من رياضيات LP/LE 2025: uₙ=3n-9، التحقق أن 2025 حد ثم حساب مجموع جزئي.",
    definition: {
      sequenceName: "(uₙ)",
      formulaLabel: "uₙ = 3n - 9",
      description:
        "صيغة الحد العام مباشرة؛ نقرأ منها الأساس r=3 ونستعملها لحل uₙ=2025.",
    },
    table: {
      title: "جدول التحقق والحساب",
      columns: [
        { id: "item", label: "المطلوب" },
        { id: "value", label: "القيمة" },
      ],
      rows: [
        { id: "u0", label: "u₀", cells: { item: "u₀", value: null } },
        { id: "u1", label: "u₁", cells: { item: "u₁", value: null } },
        { id: "u2", label: "u₂", cells: { item: "u₂", value: null } },
        { id: "r", label: "r", cells: { item: "الأساس r", value: null } },
        {
          id: "n2025",
          label: "uₙ=2025",
          cells: { item: "رتبة الحد 2025", value: null },
        },
        {
          id: "sum",
          label: "S",
          cells: { item: "u₀+...+u₆₇₈", value: null },
        },
      ],
    },
    expectedCells: [
      expectedSequenceCell("u0", "value", -9),
      expectedSequenceCell("u1", "value", -6),
      expectedSequenceCell("u2", "value", -3),
      expectedSequenceCell("r", "value", 3),
      expectedSequenceCell("n2025", "value", 678),
      expectedSequenceCell("sum", "value", 684432),
    ],
    observationItems: [
      {
        id: "difference-constant",
        label: "الفرق uₙ₊₁-uₙ ثابت ويساوي 3.",
        detail: "هذه علامة المتتالية الحسابية.",
        kind: "variation",
      },
      {
        id: "membership-rank",
        label: "حل 3n-9=2025 يعطي n=678.",
        detail: "إذن 2025 حد من حدود المتتالية.",
        kind: "term",
      },
      {
        id: "sum-first-last",
        label: "المجموع يحسب بعدد الحدود مضروبا في نصف مجموع الطرفين.",
        detail: "هنا عدد الحدود من 0 إلى 678 هو 679.",
        kind: "transform",
      },
      {
        id: "geometric-ratio-3",
        label: "النسبة uₙ₊₁/uₙ ثابتة وتساوي 3.",
        detail: "اختيار مضلل: العلاقة حسابية وليست هندسية.",
        kind: "distractor",
      },
    ],
    prompt: {
      title: "أثبت أن 2025 حد واحسب المجموع.",
      task: "أكمل الحدود والمعطيات، اختر الملاحظات الصحيحة، ثم اكتب خلاصة تبرر الأساس والانتماء والمجموع.",
      requiredObservationIds: [
        "difference-constant",
        "membership-rank",
        "sum-first-last",
      ],
      requiredConclusionKeywords: ["حسابية", "3", "678", "مجموع"],
      scaffoldPhrases: [
        "بما أن uₙ₊₁-uₙ=3 فإن المتتالية حسابية أساسها 3.",
        "حل المعادلة 3n-9=2025 يعطي n=678.",
        "نحسب S بعدد الحدود 679 وبالحدين u₀ و u₆₇₈.",
      ],
    },
  },
];

function expectedSequenceCell(
  rowId: string,
  columnId: string,
  expectedValue: number | string,
  acceptedText: string[] = [],
): MathSequenceExpectedCell {
  return {
    rowId,
    columnId,
    expectedValue,
    tolerance: typeof expectedValue === "number" ? 0.01 : undefined,
    acceptedText,
  };
}

export function getMathSequencesWorkbenchPresetById(presetId: string) {
  return (
    mathSequencesWorkbenchPresets.find((preset) => preset.id === presetId) ??
    null
  );
}

export function getMathSequencesWorkbenchPreset(value: unknown) {
  if (!value) {
    return mathSequencesWorkbenchPresets[0];
  }

  try {
    return parseMathSequencesPreset(value);
  } catch {
    return mathSequencesWorkbenchPresets[0];
  }
}

export function makeMathSequencesInitialAnswerCells(
  preset: MathSequencesPreset,
): MathSequenceAnswerCell[] {
  return preset.expectedCells.map((cell) => ({
    rowId: cell.rowId,
    columnId: cell.columnId,
    value: null,
  }));
}

export function updateMathSequencesAnswerCell(
  answerCells: MathSequenceAnswerCell[],
  rowId: string,
  columnId: string,
  value: string,
): MathSequenceAnswerCell[] {
  const nextValue = value.trim() ? value : null;

  return answerCells.some(
    (cell) => cell.rowId === rowId && cell.columnId === columnId,
  )
    ? answerCells.map((cell) =>
        cell.rowId === rowId && cell.columnId === columnId
          ? { ...cell, value: nextValue }
          : cell,
      )
    : [...answerCells, { rowId, columnId, value: nextValue }];
}

export function toggleMathSequenceObservation(
  selectedObservationIds: string[],
  observationId: string,
) {
  return selectedObservationIds.includes(observationId)
    ? selectedObservationIds.filter((selectedId) => selectedId !== observationId)
    : [...selectedObservationIds, observationId];
}

function readSequenceNumber(value: string | number | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", "."));

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function getMathSequenceGraphPoints(
  preset: MathSequencesPreset,
  answerCells: MathSequenceAnswerCell[] = [],
): MathSequenceGraphPoint[] {
  const answersByKey = new Map(
    answerCells.map((cell) => [`${cell.rowId}:${cell.columnId}`, cell.value]),
  );

  return preset.table.rows
    .map((row) => {
      const nValue = readSequenceNumber(row.cells.n);
      const knownU = readSequenceNumber(row.cells.u);
      const answeredU = answersByKey.get(`${row.id}:u`);
      const uValue = readSequenceNumber(answeredU) ?? knownU;

      return nValue !== null && uValue !== null
        ? { n: nValue, value: uValue }
        : null;
    })
    .filter((point): point is MathSequenceGraphPoint => Boolean(point));
}

export function evaluateMathSequencesWorkbenchAnswer(
  preset: MathSequencesPreset,
  answer: MathSequencesWorkbenchAnswer,
): MathSequencesWorkbenchEvaluation {
  const table = evaluateLabTableCells(preset.expectedCells, answer.answerCells);
  const reasoning = evaluateDocumentReasoning(
    {
      requiredEvidenceIds: preset.prompt.requiredObservationIds,
      requiredConclusionKeywords: preset.prompt.requiredConclusionKeywords,
    },
    {
      selectedEvidenceIds: answer.selectedObservationIds,
      conclusion: answer.conclusion,
    },
  );
  const missingObservationItems = preset.observationItems.filter((item) =>
    reasoning.missingEvidenceIds.includes(item.id),
  );

  return {
    passed: table.passed && reasoning.passed,
    tablePassed: table.passed,
    observationsPassed: reasoning.missingEvidenceIds.length === 0,
    conclusionPassed: reasoning.missingKeywords.length === 0,
    correctCellCount: table.correctCount,
    totalCellCount: table.totalCount,
    selectedRequiredObservationCount: reasoning.selectedRequiredCount,
    requiredObservationCount: reasoning.requiredEvidenceCount,
    missingObservationIds: reasoning.missingEvidenceIds,
    missingObservationItems,
    missingKeywords: reasoning.missingKeywords,
    table,
  };
}

export function buildMathSequencesWorkbenchResult({
  missionId,
  preset,
  answerCells,
  selectedObservationIds,
  conclusion,
}: {
  missionId?: string | null;
  preset: MathSequencesPreset;
  answerCells: MathSequenceAnswerCell[];
  selectedObservationIds: string[];
  conclusion: string;
}): MathSequencesWorkbenchResult {
  return parseMathSequencesWorkbenchResult({
    tool: "math-sequences-workbench",
    missionId: missionId ?? null,
    presetId: preset.id,
    answerCells,
    selectedObservationIds,
    conclusion,
    evaluation: evaluateMathSequencesWorkbenchAnswer(preset, {
      answerCells,
      selectedObservationIds,
      conclusion,
    }),
  });
}
