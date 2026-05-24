import type { StructuredLabWorkbenchPreset } from "@bac-bank/contracts/lab";
import { getStructuredLabWorkbenchPreset } from "@/lib/lab-structured-workbench";

export const processMaterialBalanceAdvancementWorkbenchPresets: StructuredLabWorkbenchPreset[] =
  [
    {
      id: "ester-yield-mass-balance",
      title: "موازنة مادة ومردود أسترة",
      subtitle: "استعمال المردود لحساب كمية وكتلة الإستر.",
      bacContext:
        "تتكرر في هندسة الطرائق حسابات المردود والكتلة من كمية مادة المتفاعل أو الناتج، خاصة في الأسترة.",
      sourceHint:
        "مستند إلى نمط محلي: R=60%، n(acide)=0.5 mol، و M(ester)=130 g/mol.",
      instrument: {
        subjectLabel: "Process Tech Lab",
        title: "ورشة الموازنة والتقدم",
        iconKind: "technical",
      },
      sourceDocuments: [
        {
          id: "yield-data",
          title: "معطيات الإنتاج",
          bullets: [
            "كمية الحمض الابتدائية n0=0.5 mol.",
            "مردود التفاعل R=60%.",
            "الكتلة المولية للإستر M=130 g/mol.",
            "n(ester)=R×n0/100 ثم m=n×M.",
          ],
        },
      ],
      table: {
        title: "جدول المردود والكتلة",
        columns: [
          { id: "item", label: "العنصر" },
          { id: "value", label: "القيمة" },
          { id: "unit", label: "الوحدة" },
        ],
        rows: [
          { id: "n0", label: "n0", cells: { item: "كمية الحمض", value: 0.5, unit: "mol" } },
          { id: "yield", label: "R", cells: { item: "المردود", value: 60, unit: "%" } },
          { id: "n-ester", label: "n ester", cells: { item: "كمية الإستر", value: null, unit: "mol" } },
          { id: "m-ester", label: "m ester", cells: { item: "كتلة الإستر", value: null, unit: "g" } },
        ],
      },
      measurements: [
        { id: "ester-amount", label: "كمية الإستر", unitHint: "mol" },
        { id: "ester-mass", label: "كتلة الإستر", unitHint: "g" },
      ],
      expectedCells: [
        { rowId: "n-ester", columnId: "value", expectedValue: 0.3, tolerance: 0.02, acceptedText: ["0.3 mol"] },
        { rowId: "m-ester", columnId: "value", expectedValue: 39, tolerance: 1, acceptedText: ["39 g"] },
      ],
      expectedMeasurements: [
        {
          id: "ester-amount",
          expected: { value: 0.3, unit: "mol" },
          tolerance: 0.02,
        },
        {
          id: "ester-mass",
          expected: { value: 39, unit: "g" },
          tolerance: 1,
        },
      ],
      observationItems: [
        {
          id: "yield-reduces-theoretical",
          label: "المردود 60% يعني أن n(ester)=0.60×n0.",
          detail: "نحوّل النسبة المئوية إلى عدد عشري.",
          kind: "yield",
        },
        {
          id: "amount-before-mass",
          label: "نحسب كمية الإستر قبل الكتلة.",
          detail: "m=n×M بعد إيجاد n.",
          kind: "sequence",
        },
        {
          id: "mass-is-39",
          label: "0.3 mol من إستر كتلته المولية 130 g/mol تعطي 39 g.",
          detail: "0.3×130=39.",
          kind: "calculation",
        },
        {
          id: "use-yield-as-60",
          label: "نعوض R=60 مباشرة دون القسمة على 100.",
          detail: "اختيار مضلل: يجب استعمال 0.60.",
          kind: "distractor",
        },
      ],
      prompt: {
        title: "احسب كمية وكتلة الإستر من المردود.",
        task: "أكمل جدول الموازنة، أدخل القيم المحسوبة، ثم اكتب خلاصة قصيرة.",
        requiredObservationIds: [
          "yield-reduces-theoretical",
          "amount-before-mass",
          "mass-is-39",
        ],
        requiredConclusionKeywords: ["0.3", "39", "مردود"],
        scaffoldPhrases: [
          "نحول R=60% إلى 0.60.",
          "n(ester)=0.60×0.5=0.3 mol.",
          "m=0.3×130=39 g.",
        ],
      },
    },
    {
      id: "advancement-limiting-reagent-table",
      title: "جدول تقدم وتفاعل محدود",
      subtitle: "تحديد المتفاعل المحد والتقدم الأقصى والنواتج.",
      bacContext:
        "جدول التقدم أداة أساسية في مسائل الطرائق والكيمياء، خاصة عندما يطلب تحديد المتفاعل المحد والكمية النهائية.",
      sourceHint:
        "نموذج مبسط لتفاعل N2 + 3H2 -> 2NH3 مع n0(N2)=2 mol و n0(H2)=3 mol.",
      instrument: {
        subjectLabel: "Process Tech Lab",
        title: "ورشة الموازنة والتقدم",
        iconKind: "technical",
      },
      sourceDocuments: [
        {
          id: "advancement-data",
          title: "معطيات جدول التقدم",
          bullets: [
            "المعادلة: N2 + 3H2 -> 2NH3.",
            "n0(N2)=2 mol و n0(H2)=3 mol.",
            "xmax يحدد من أصغر n0/المعامل الستوكيومتري.",
          ],
        },
      ],
      table: {
        title: "جدول التقدم",
        columns: [
          { id: "species", label: "النوع" },
          { id: "initial", label: "ابتدائي" },
          { id: "change", label: "تغير" },
          { id: "final", label: "نهائي" },
        ],
        rows: [
          { id: "n2", label: "N2", cells: { species: "N2", initial: 2, change: "-x", final: null } },
          { id: "h2", label: "H2", cells: { species: "H2", initial: 3, change: "-3x", final: null } },
          { id: "nh3", label: "NH3", cells: { species: "NH3", initial: 0, change: "+2x", final: null } },
          { id: "xmax", label: "xmax", cells: { species: "xmax", initial: null, change: null, final: null } },
        ],
      },
      measurements: [
        { id: "xmax", label: "التقدم الأقصى xmax", unitHint: "mol" },
        { id: "ammonia-final", label: "كمية NH3 النهائية", unitHint: "mol" },
      ],
      expectedCells: [
        { rowId: "n2", columnId: "final", expectedValue: 1, tolerance: 0.05, acceptedText: ["1 mol"] },
        { rowId: "h2", columnId: "final", expectedValue: 0, tolerance: 0.05 },
        { rowId: "nh3", columnId: "final", expectedValue: 2, tolerance: 0.05, acceptedText: ["2 mol"] },
        { rowId: "xmax", columnId: "final", expectedValue: 1, tolerance: 0.05, acceptedText: ["1 mol"] },
      ],
      expectedMeasurements: [
        { id: "xmax", expected: { value: 1, unit: "mol" }, tolerance: 0.05 },
        {
          id: "ammonia-final",
          expected: { value: 2, unit: "mol" },
          tolerance: 0.05,
        },
      ],
      observationItems: [
        {
          id: "h2-limiting",
          label: "H2 هو المتفاعل المحد لأن 3/3=1 أصغر من 2/1=2.",
          detail: "نقارن n0 على المعامل.",
          kind: "limiting",
        },
        {
          id: "xmax-one",
          label: "التقدم الأقصى xmax=1 mol.",
          detail: "عندها ينعدم H2.",
          kind: "advancement",
        },
        {
          id: "nh3-two",
          label: "كمية NH3 النهائية تساوي 2xmax=2 mol.",
          detail: "معامل NH3 هو 2.",
          kind: "stoichiometry",
        },
        {
          id: "n2-limiting",
          label: "N2 هو المتفاعل المحد لأنه كميته الابتدائية أكبر.",
          detail: "اختيار مضلل: لا نقارن الكميات وحدها.",
          kind: "distractor",
        },
      ],
      prompt: {
        title: "أكمل جدول التقدم وحدد المتفاعل المحد.",
        task: "املأ الكميات النهائية، أدخل xmax وكمية NH3، ثم اكتب خلاصة.",
        requiredObservationIds: ["h2-limiting", "xmax-one", "nh3-two"],
        requiredConclusionKeywords: ["H2", "xmax", "2"],
        scaffoldPhrases: [
          "نقارن 2/1 و3/3، فنجد H2 محدا.",
          "xmax=1 mol.",
          "n(NH3)=2xmax=2 mol.",
        ],
      },
    },
  ];

export function getProcessMaterialBalanceAdvancementWorkbenchPreset(
  value: unknown,
) {
  return getStructuredLabWorkbenchPreset(
    value,
    processMaterialBalanceAdvancementWorkbenchPresets[0],
  );
}
