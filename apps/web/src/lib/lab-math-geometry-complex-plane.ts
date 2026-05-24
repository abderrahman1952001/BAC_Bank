import type {
  MathGeometryComplexAnswerCell,
  MathGeometryComplexExpectedCell,
  MathGeometryComplexObservationItem,
  MathGeometryComplexPoint,
  MathGeometryComplexPreset,
  MathGeometryComplexWorkbenchResult,
} from "@bac-bank/contracts/lab";
import {
  parseMathGeometryComplexPreset,
  parseMathGeometryComplexWorkbenchResult,
} from "@bac-bank/contracts/lab";
import { evaluateDocumentReasoning } from "@/lib/lab-document-reasoning-engine";
import {
  evaluateLabTableCells,
  type LabTableEvaluation,
} from "@/lib/lab-table-engine";

export type MathGeometryComplexWorkbenchAnswer = {
  answerCells: MathGeometryComplexAnswerCell[];
  selectedObservationIds: string[];
  conclusion: string;
};

export type MathGeometryComplexEvaluation = {
  passed: boolean;
  tablePassed: boolean;
  observationsPassed: boolean;
  conclusionPassed: boolean;
  correctCellCount: number;
  totalCellCount: number;
  selectedRequiredObservationCount: number;
  requiredObservationCount: number;
  missingObservationIds: string[];
  missingObservationItems: MathGeometryComplexObservationItem[];
  missingKeywords: string[];
  table: LabTableEvaluation;
};

export const mathGeometryComplexPresets: MathGeometryComplexPreset[] = [
  {
    id: "complex-circle-isosceles-triangle",
    title: "لواحق ونقاط على دائرة",
    subtitle: "قراءة الشكل المثلثي، نصف القطر، وطبيعة المثلث من المستوى المركب.",
    bacContext:
      "نمط BAC متكرر: تعطى لواحق A وB وC، يطلب الشكل المثلثي، الانتماء إلى دائرة، ثم تحديد طبيعة المثلث أو مركزه.",
    sourceHint:
      "مستوحى من رياضيات SE 2025: zA=2i و zB=-√3+i و zC=conj(zB).",
    plane: {
      title: "المستوى المركب (O; u, v)",
      xMin: -3,
      xMax: 3,
      yMin: -3,
      yMax: 3,
      points: [
        { id: "a", label: "A", x: 0, y: 2, affixLabel: "2i" },
        { id: "b", label: "B", x: -1.732, y: 1, affixLabel: "-√3+i" },
        { id: "c", label: "C", x: -1.732, y: -1, affixLabel: "-√3-i" },
      ],
    },
    table: {
      title: "قراءات هندسية من اللواحق",
      columns: [
        { id: "item", label: "العنصر" },
        { id: "value", label: "القيمة" },
      ],
      rows: [
        { id: "mod-a", label: "|zA|", cells: { item: "|zA|", value: null } },
        { id: "arg-a", label: "arg zA", cells: { item: "arg(zA)", value: null } },
        { id: "mod-b", label: "|zB|", cells: { item: "|zB|", value: null } },
        { id: "arg-b", label: "arg zB", cells: { item: "arg(zB)", value: null } },
        { id: "mod-c", label: "|zC|", cells: { item: "|zC|", value: null } },
        { id: "circle", label: "الدائرة", cells: { item: "المركز ونصف القطر", value: null } },
        { id: "triangle", label: "ABC", cells: { item: "طبيعة المثلث", value: null } },
      ],
    },
    expectedCells: [
      expectedGeometryCell("mod-a", "value", 2),
      expectedGeometryCell("arg-a", "value", "π/2", ["90°", "pi/2"]),
      expectedGeometryCell("mod-b", "value", 2),
      expectedGeometryCell("arg-b", "value", "5π/6", ["150°", "5pi/6"]),
      expectedGeometryCell("mod-c", "value", 2),
      expectedGeometryCell("circle", "value", "O و 2", [
        "المركز O ونصف القطر 2",
        "O,2",
      ]),
      expectedGeometryCell("triangle", "value", "متساوي الساقين في B", [
        "AB=BC",
        "مثلث متساوي الساقين",
      ]),
    ],
    observationItems: [
      {
        id: "same-modulus",
        label: "للنقط A وB وC نفس الطول OA=OB=OC=2.",
        detail: "هذا هو دليل الانتماء إلى دائرة مركزها O.",
        kind: "modulus",
      },
      {
        id: "conjugate-symmetry",
        label: "B و C متناظرتان بالنسبة لمحور الفواصل لأن zC مرافق zB.",
        detail: "تناظر اللواحق يسهل قراءة الشكل.",
        kind: "shape",
      },
      {
        id: "isosceles-at-b",
        label: "AB و BC لهما الطول نفسه، إذن ABC متساوي الساقين في B.",
        detail: "المقارنة بالمسافات تكمل نتيجة الدائرة.",
        kind: "distance",
      },
      {
        id: "center-a",
        label: "الدائرة مركزها A لأن zA على محور التراتيب.",
        detail: "اختيار مضلل: تساوي OA وOB وOC يجعل المركز O.",
        kind: "distractor",
      },
    ],
    prompt: {
      title: "استنتج الدائرة وطبيعة المثلث.",
      task: "أكمل جدول الأطوال والحجج، اختر الملاحظات الصحيحة، ثم اكتب خلاصة هندسية من اللواحق.",
      requiredObservationIds: [
        "same-modulus",
        "conjugate-symmetry",
        "isosceles-at-b",
      ],
      requiredConclusionKeywords: ["دائرة", "O", "2", "متساوي الساقين", "B"],
      scaffoldPhrases: [
        "نلاحظ أن |zA|=|zB|=|zC|=2.",
        "إذن A وB وC تنتمي إلى دائرة مركزها O ونصف قطرها 2.",
        "كما أن AB=BC ومنه ABC مثلث متساوي الساقين في B.",
      ],
    },
  },
  {
    id: "vectors-translation-alignment",
    title: "متجهات وترجمة في المستوى المركب",
    subtitle: "استعمال الفروق بين اللواحق لقراءة المتجهة والاستقامة والترجمة.",
    bacContext:
      "في تمارين الهندسة والأعداد المركبة تظهر أسئلة: احسب لاحقة متجهة، تحقق من الاستقامية، أو عين صورة نقطة بترجمة.",
    sourceHint:
      "مبني على نمط BAC: نقاط ذات لواحق ثم برهان باستعمال الفروق zB-zA و zC-zB.",
    plane: {
      title: "نقاط A وB وC في معلم متعامد",
      xMin: 0,
      xMax: 8,
      yMin: 0,
      yMax: 5,
      points: [
        { id: "a", label: "A", x: 1, y: 2, affixLabel: "1+2i" },
        { id: "b", label: "B", x: 4, y: 3, affixLabel: "4+3i" },
        { id: "c", label: "C", x: 7, y: 4, affixLabel: "7+4i" },
      ],
    },
    table: {
      title: "جدول المتجهات والتحويل",
      columns: [
        { id: "item", label: "العنصر" },
        { id: "value", label: "القيمة" },
      ],
      rows: [
        { id: "ab", label: "zB-zA", cells: { item: "zB-zA", value: null } },
        { id: "bc", label: "zC-zB", cells: { item: "zC-zB", value: null } },
        { id: "distance", label: "AB", cells: { item: "AB", value: null } },
        { id: "alignment", label: "الاستقامية", cells: { item: "A,B,C", value: null } },
        { id: "translation", label: "الترجمة", cells: { item: "صورة B بمتجهة AB", value: null } },
      ],
    },
    expectedCells: [
      expectedGeometryCell("ab", "value", "3+i", ["3 + i", "(3,1)"]),
      expectedGeometryCell("bc", "value", "3+i", ["3 + i", "(3,1)"]),
      expectedGeometryCell("distance", "value", "√10", ["sqrt(10)", "racine 10"]),
      expectedGeometryCell("alignment", "value", "مستقيمة", [
        "A وB وC مستقيمة",
        "نعم",
      ]),
      expectedGeometryCell("translation", "value", "C", ["النقطة C"]),
    ],
    observationItems: [
      {
        id: "same-vector",
        label: "zB-zA و zC-zB متساويان ويساويان 3+i.",
        detail: "هذا يقرأ المتجهتين AB وBC مباشرة.",
        kind: "vector",
      },
      {
        id: "aligned-points",
        label: "تساوي المتجهتين يدل أن A وB وC مستقيمة وB منتصف [AC].",
        detail: "نفس الاتجاه ونفس الطول.",
        kind: "shape",
      },
      {
        id: "translation-image",
        label: "صورة B بالترجمة ذات المتجهة AB هي C.",
        detail: "لأن zC=zB+(zB-zA).",
        kind: "vector",
      },
      {
        id: "right-triangle",
        label: "A وB وC تشكل مثلثا قائما.",
        detail: "اختيار مضلل: النقاط على استقامة واحدة.",
        kind: "distractor",
      },
    ],
    prompt: {
      title: "اربط الفروق بين اللواحق بالترجمة.",
      task: "املأ جدول المتجهات، اختر الملاحظات الصحيحة، ثم اكتب خلاصة حول الاستقامية وصورة B.",
      requiredObservationIds: [
        "same-vector",
        "aligned-points",
        "translation-image",
      ],
      requiredConclusionKeywords: ["zB-zA", "3+i", "مستقيمة", "ترجمة", "C"],
      scaffoldPhrases: [
        "نحسب zB-zA=3+i و zC-zB=3+i.",
        "إذن المتجهتان AB وBC متساويتان، فتكون A وB وC مستقيمة.",
        "صورة B بالترجمة ذات المتجهة AB هي C.",
      ],
    },
  },
];

function expectedGeometryCell(
  rowId: string,
  columnId: string,
  expectedValue: number | string,
  acceptedText: string[] = [],
): MathGeometryComplexExpectedCell {
  return {
    rowId,
    columnId,
    expectedValue,
    tolerance: typeof expectedValue === "number" ? 0.02 : undefined,
    acceptedText,
  };
}

export function calculateDistance(
  first: MathGeometryComplexPoint,
  second: MathGeometryComplexPoint,
) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

export function calculateVectorAffix(
  first: MathGeometryComplexPoint,
  second: MathGeometryComplexPoint,
) {
  return {
    real: second.x - first.x,
    imaginary: second.y - first.y,
  };
}

export function getMathGeometryComplexPresetById(presetId: string) {
  return (
    mathGeometryComplexPresets.find((preset) => preset.id === presetId) ?? null
  );
}

export function getMathGeometryComplexPreset(value: unknown) {
  if (!value) {
    return mathGeometryComplexPresets[0];
  }

  try {
    return parseMathGeometryComplexPreset(value);
  } catch {
    return mathGeometryComplexPresets[0];
  }
}

export function makeMathGeometryComplexInitialAnswerCells(
  preset: MathGeometryComplexPreset,
): MathGeometryComplexAnswerCell[] {
  return preset.expectedCells.map((cell) => ({
    rowId: cell.rowId,
    columnId: cell.columnId,
    value: null,
  }));
}

export function updateMathGeometryComplexAnswerCell(
  answerCells: MathGeometryComplexAnswerCell[],
  rowId: string,
  columnId: string,
  value: string,
): MathGeometryComplexAnswerCell[] {
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

export function toggleMathGeometryComplexObservation(
  selectedObservationIds: string[],
  observationId: string,
) {
  return selectedObservationIds.includes(observationId)
    ? selectedObservationIds.filter((selectedId) => selectedId !== observationId)
    : [...selectedObservationIds, observationId];
}

export function evaluateMathGeometryComplexWorkbenchAnswer(
  preset: MathGeometryComplexPreset,
  answer: MathGeometryComplexWorkbenchAnswer,
): MathGeometryComplexEvaluation {
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

export function buildMathGeometryComplexWorkbenchResult({
  missionId,
  preset,
  answerCells,
  selectedObservationIds,
  conclusion,
}: {
  missionId?: string | null;
  preset: MathGeometryComplexPreset;
  answerCells: MathGeometryComplexAnswerCell[];
  selectedObservationIds: string[];
  conclusion: string;
}): MathGeometryComplexWorkbenchResult {
  return parseMathGeometryComplexWorkbenchResult({
    tool: "math-geometry-complex-plane",
    missionId: missionId ?? null,
    presetId: preset.id,
    answerCells,
    selectedObservationIds,
    conclusion,
    evaluation: evaluateMathGeometryComplexWorkbenchAnswer(preset, {
      answerCells,
      selectedObservationIds,
      conclusion,
    }),
  });
}
