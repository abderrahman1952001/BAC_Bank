import type {
  SvtDocumentWorkbenchEvidenceItem,
  SvtDocumentWorkbenchPreset,
  SvtDocumentWorkbenchResult,
} from "@bac-bank/contracts/lab";
import {
  parseSvtDocumentWorkbenchPreset,
  parseSvtDocumentWorkbenchResult,
} from "@bac-bank/contracts/lab";
import {
  evaluateDocumentReasoning,
} from "@/lib/lab-document-reasoning-engine";

export type SvtDocumentWorkbenchAnswer = {
  selectedEvidenceIds: string[];
  conclusion: string;
};

export type SvtDocumentWorkbenchEvaluation = {
  passed: boolean;
  selectedRequiredCount: number;
  requiredEvidenceCount: number;
  selectedEvidenceCount: number;
  missingEvidenceIds: string[];
  missingEvidenceItems: SvtDocumentWorkbenchEvidenceItem[];
  missingKeywords: string[];
};

export const svtDocumentWorkbenchPresets: SvtDocumentWorkbenchPreset[] = [
  {
    id: "ldl-receptor-structure-function",
    title: "مستقبل LDL والبنية الوظيفية",
    subtitle: "استغلال وثائق بنية البروتين لتفسير حالة مرضية.",
    bacContext:
      "نمط متكرر في مواضيع SVT: وثائق عن أليل سليم/مصاب، جدول أحماض أمينية، ثم مناقشة علاقة البنية بالوظيفة.",
    sourceDocuments: [
      {
        id: "doc-ldl-entry",
        title: "الوثيقة 1: دخول LDL إلى الخلية",
        kind: "diagram",
        sourceLabel: "رسم وظيفي",
        blocks: [
          {
            type: "diagram",
            title: "آلية التثبيت والاقتناص",
            description:
              "يرتبط LDL بمستقبل غشائي نوعي R، ثم تقتنصه الخلية لاستعمال الكولسترول. إذا اختل المستقبل لا يتم تثبيت LDL بكفاءة.",
            labels: ["LDL", "المستقبل R", "غشاء الخلية", "اقتناص خلوي"],
          },
          {
            type: "text",
            body: "الشخص السليم يملك مستقبلا R ببنية فراغية تسمح بتثبيت LDL. الشخص المصاب يملك مستقبلا غير فعال، فلا يدخل LDL إلى الخلايا بشكل كاف.",
          },
        ],
      },
      {
        id: "doc-r-alleles",
        title: "الوثيقة 2: مقارنة جزء من الأليلين R1 و R2",
        kind: "table",
        sourceLabel: "جدول مقارنة",
        blocks: [
          {
            type: "table",
            title: "أثر اختلاف رامزة واحدة في البروتين",
            columns: [
              { id: "allele", label: "الأليل" },
              { id: "codon", label: "الرامزة عند الموضع 33" },
              { id: "protein", label: "الأثر على السلسلة" },
            ],
            rows: [
              {
                id: "r1",
                cells: {
                  allele: "R1",
                  codon: "CAG",
                  protein: "Gln ثم استمرار تركيب المستقبل",
                },
              },
              {
                id: "r2",
                cells: {
                  allele: "R2",
                  codon: "UAG",
                  protein: "رامزة توقف مبكرة وسلسلة قصيرة",
                },
              },
            ],
          },
        ],
      },
      {
        id: "doc-ldl-graph",
        title: "الوثيقة 3: تغير LDL في الدم",
        kind: "graph",
        sourceLabel: "منحنى",
        blocks: [
          {
            type: "graph",
            title: "كمية LDL المتبقية في الدم بعد وجبة دسمة",
            xAxis: { label: "الزمن", unit: "ساعات" },
            yAxis: { label: "LDL في الدم", unit: "وحدة نسبية" },
            series: [
              {
                id: "healthy",
                title: "شخص سليم",
                kind: "line",
                points: [
                  { x: 0, y: 72 },
                  { x: 2, y: 58 },
                  { x: 4, y: 43 },
                  { x: 6, y: 32 },
                ],
              },
              {
                id: "affected",
                title: "شخص مصاب",
                kind: "line",
                points: [
                  { x: 0, y: 74 },
                  { x: 2, y: 78 },
                  { x: 4, y: 82 },
                  { x: 6, y: 86 },
                ],
              },
            ],
          },
        ],
      },
    ],
    evidenceItems: [
      {
        id: "ldl-normal-entry",
        documentId: "doc-ldl-entry",
        label: "المستقبل R السليم يسمح بتثبيت LDL واقتناصه.",
        detail:
          "هذه المعلومة تربط البنية الغشائية بالوظيفة الخلوية المباشرة.",
        keywords: ["مستقبل", "LDL", "اقتناص"],
      },
      {
        id: "r2-stop-codon",
        documentId: "doc-r-alleles",
        label: "الأليل R2 يعطي رامزة توقف مبكرة UAG.",
        detail:
          "رامزة التوقف تختصر السلسلة البروتينية، فتتغير البنية الفراغية.",
        keywords: ["طفرة", "رامزة توقف", "سلسلة قصيرة"],
      },
      {
        id: "ldl-accumulation",
        documentId: "doc-ldl-graph",
        label: "LDL يبقى مرتفعا عند المصاب بدل أن ينخفض.",
        detail: "المنحنى يدعم أن الخلايا لا تقتنص LDL بالفعالية نفسها.",
        keywords: ["LDL", "يتراكم", "المصاب"],
      },
      {
        id: "healthy-ldl-falls",
        documentId: "doc-ldl-graph",
        label: "LDL ينخفض تدريجيا عند الشخص السليم.",
        detail: "هذا شاهد مقارن مفيد، لكنه ليس وحده سبب المرض.",
        keywords: ["سليم", "ينخفض"],
      },
    ],
    prompt: {
      title: "ناقش العلاقة بين بنية المستقبل R والحالة الصحية.",
      task: "اختر الأدلة التي تربط الطفرة بتغير بنية المستقبل ثم اكتب استنتاجا يفسر تراكم LDL عند المصاب.",
      requiredEvidenceIds: [
        "ldl-normal-entry",
        "r2-stop-codon",
        "ldl-accumulation",
      ],
      requiredConclusionKeywords: [
        "LDL",
        "مستقبل",
        "طفرة",
        "رامزة توقف",
        "بنية",
      ],
      scaffoldPhrases: [
        "تدل الوثيقة 1 على أن المستقبل R السليم يثبت LDL.",
        "يبين جدول الأليلين أن الطفرة حولت رامزة إلى رامزة توقف.",
        "أستنتج أن تغير البنية الفراغية للمستقبل يمنع اقتناص LDL.",
      ],
    },
  },
  {
    id: "protein-synthesis-document-chain",
    title: "من الوثائق إلى نص تركيب البروتين",
    subtitle: "ربط ADN و ARNm والترجمة بالبنية الفراغية للبروتين.",
    bacContext:
      "نمط BAC كلاسيكي: وثيقة مراحل تركيب البروتين، جدول عناصر ضرورية، ثم نص علمي يربط المعلومة الوراثية بالبنية.",
    sourceDocuments: [
      {
        id: "doc-synthesis-diagram",
        title: "الوثيقة 1: مرحلتا تركيب البروتين",
        kind: "diagram",
        sourceLabel: "رسم تخطيطي",
        blocks: [
          {
            type: "diagram",
            title: "من المورثة إلى السلسلة البيبتيدية",
            description:
              "داخل النواة تستنسخ المورثة إلى ARNm، ثم ينتقل ARNm إلى الهيولى حيث تقرأ الريبوزومات رامزاته لتشكيل سلسلة أحماض أمينية.",
            labels: ["ADN", "ARNm", "ريبوزوم", "أحماض أمينية"],
          },
        ],
      },
      {
        id: "doc-synthesis-elements",
        title: "الوثيقة 2: عناصر المرحلتين",
        kind: "table",
        sourceLabel: "جدول عناصر",
        blocks: [
          {
            type: "table",
            title: "العناصر الضرورية ودورها",
            columns: [
              { id: "stage", label: "المرحلة" },
              { id: "element", label: "عنصر ضروري" },
              { id: "role", label: "دوره" },
            ],
            rows: [
              {
                id: "transcription",
                cells: {
                  stage: "الاستنساخ",
                  element: "ADN + نكليوتيدات ريبية",
                  role: "تشكيل ARNm وفق ترتيب المورثة",
                },
              },
              {
                id: "translation",
                cells: {
                  stage: "الترجمة",
                  element: "ARNm + ريبوزومات + ARNt",
                  role: "تحويل الرامزات إلى أحماض أمينية",
                },
              },
            ],
          },
        ],
      },
      {
        id: "doc-amino-count",
        title: "الوثيقة 3: قراءة عدد الرامزات",
        kind: "text",
        sourceLabel: "معطى حسابي",
        blocks: [
          {
            type: "text",
            body: "إذا كان ARNm يحتوي 327 نكليوتيدة، وتوجد رامزة بداية ورامزة توقف، فإن عدد الأحماض الأمينية في السلسلة الوظيفية يحسب من الرامزات المترجمة فقط.",
          },
        ],
      },
    ],
    evidenceItems: [
      {
        id: "dna-carries-message",
        documentId: "doc-synthesis-diagram",
        label: "ADN يحمل المعلومة الوراثية في ترتيب نكليوتيداته.",
        detail: "هذه بداية سلسلة البرهان من المورثة.",
        keywords: ["ADN", "معلومة وراثية"],
      },
      {
        id: "mrna-working-copy",
        documentId: "doc-synthesis-elements",
        label: "ARNm نسخة عمل تنقل ترتيب المورثة إلى الهيولى.",
        detail: "الاستنساخ يحافظ على ترتيب الرامزات.",
        keywords: ["ARNm", "استنساخ"],
      },
      {
        id: "ribosome-translates",
        documentId: "doc-synthesis-elements",
        label: "الريبوزوم يترجم رامزات ARNm إلى أحماض أمينية.",
        detail: "هذه خطوة تحويل الرسالة إلى سلسلة بروتينية.",
        keywords: ["ترجمة", "أحماض أمينية"],
      },
      {
        id: "amino-order-shapes-protein",
        documentId: "doc-amino-count",
        label: "عدد وترتيب الأحماض الأمينية يحددان بنية البروتين.",
        detail: "البنية الفراغية تظهر من السلسلة البيبتيدية الناتجة.",
        keywords: ["بنية فراغية", "سلسلة"],
      },
    ],
    prompt: {
      title: "اكتب نصا علميا يبين كيف يتحكم ADN في بنية البروتين.",
      task: "اختر الأدلة التي تبني سلسلة ADN → ARNm → أحماض أمينية، ثم اكتب خلاصة تربط ترتيب المعلومة بالبنية الفراغية.",
      requiredEvidenceIds: [
        "dna-carries-message",
        "mrna-working-copy",
        "ribosome-translates",
        "amino-order-shapes-protein",
      ],
      requiredConclusionKeywords: ["ADN", "ARNm", "ترجمة", "أحماض", "بنية"],
      scaffoldPhrases: [
        "يحمل ADN المعلومة الوراثية في ترتيب النيكليوتيدات.",
        "ينقل ARNm نسخة من هذه المعلومة إلى الهيولى.",
        "تترجم الريبوزومات الرامزات إلى أحماض أمينية تحدد بنية البروتين.",
      ],
    },
  },
];

const fallbackPreset = svtDocumentWorkbenchPresets[0];

export function getSvtDocumentWorkbenchPreset(value: unknown) {
  try {
    return parseSvtDocumentWorkbenchPreset(value);
  } catch {
    return fallbackPreset;
  }
}

export function getSvtDocumentWorkbenchPresetById(presetId: string) {
  return (
    svtDocumentWorkbenchPresets.find((preset) => preset.id === presetId) ??
    fallbackPreset
  );
}

export function toggleSvtDocumentEvidence(
  selectedEvidenceIds: string[],
  evidenceId: string,
) {
  return selectedEvidenceIds.includes(evidenceId)
    ? selectedEvidenceIds.filter((selectedId) => selectedId !== evidenceId)
    : [...selectedEvidenceIds, evidenceId];
}

export function evaluateSvtDocumentWorkbenchAnswer(
  preset: SvtDocumentWorkbenchPreset,
  answer: SvtDocumentWorkbenchAnswer,
): SvtDocumentWorkbenchEvaluation {
  const reasoning = evaluateDocumentReasoning(
    {
      requiredEvidenceIds: preset.prompt.requiredEvidenceIds,
      requiredConclusionKeywords: preset.prompt.requiredConclusionKeywords,
    },
    answer,
  );
  const evidenceById = new Map(
    preset.evidenceItems.map((evidence) => [evidence.id, evidence]),
  );

  return {
    ...reasoning,
    selectedEvidenceCount: answer.selectedEvidenceIds.length,
    missingEvidenceItems: reasoning.missingEvidenceIds
      .map((evidenceId) => evidenceById.get(evidenceId))
      .filter((evidence): evidence is SvtDocumentWorkbenchEvidenceItem =>
        Boolean(evidence),
      ),
  };
}

export function buildSvtDocumentWorkbenchResult(input: {
  missionId?: string | null;
  preset: SvtDocumentWorkbenchPreset;
  selectedEvidenceIds: string[];
  conclusion: string;
}): SvtDocumentWorkbenchResult {
  const evaluation = evaluateSvtDocumentWorkbenchAnswer(input.preset, {
    selectedEvidenceIds: input.selectedEvidenceIds,
    conclusion: input.conclusion,
  });

  return parseSvtDocumentWorkbenchResult({
    tool: "svt-document-workbench",
    missionId: input.missionId ?? null,
    presetId: input.preset.id,
    selectedEvidenceIds: input.selectedEvidenceIds,
    conclusion: input.conclusion,
    evaluation: {
      passed: evaluation.passed,
      selectedRequiredCount: evaluation.selectedRequiredCount,
      requiredEvidenceCount: evaluation.requiredEvidenceCount,
      selectedEvidenceCount: evaluation.selectedEvidenceCount,
      missingEvidenceIds: evaluation.missingEvidenceIds,
      missingKeywords: evaluation.missingKeywords,
    },
  });
}

export function groupSvtEvidenceByDocument(
  evidenceItems: SvtDocumentWorkbenchEvidenceItem[],
) {
  const groups = new Map<string, SvtDocumentWorkbenchEvidenceItem[]>();

  for (const item of evidenceItems) {
    groups.set(item.documentId, [...(groups.get(item.documentId) ?? []), item]);
  }

  return Array.from(groups.entries()).map(([documentId, items]) => ({
    documentId,
    items,
  }));
}

export function getSvtDocumentKindLabel(kind: SvtDocumentWorkbenchPreset[
  "sourceDocuments"
][number]["kind"]) {
  switch (kind) {
    case "diagram":
      return "رسم";
    case "graph":
      return "منحنى";
    case "table":
      return "جدول";
    case "text":
      return "نص";
  }
}
