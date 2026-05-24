import type { StructuredLabWorkbenchPreset } from "@bac-bank/contracts/lab";
import { getStructuredLabWorkbenchPreset } from "@/lib/lab-structured-workbench";

export const physicsChemistryReactionWorkbenchPresets: StructuredLabWorkbenchPreset[] = [
  {
    id: "acid-base-titration-equivalence",
    title: "معايرة حمضية قاعدية وحساب التركيز",
    subtitle: "قراءة حجم التكافؤ من منحنى pH، ثم حساب تركيز المحلول المدروس.",
    bacContext:
      "في كيمياء BAC يطلب كثيرا تحديد نقطة التكافؤ من منحنى معايرة، ثم استغلال العلاقة الستوكيومترية لحساب التركيز.",
    sourceHint:
      "مستند إلى نمط منحنيات pH=f(VB) وأسئلة تحديد VE ثم تطبيق CA.VA=CB.VE.",
    instrument: {
      subjectLabel: "Physics Lab",
      title: "ورشة الكيمياء والتفاعلات",
      iconKind: "chemistry",
    },
    sourceDocuments: [
      {
        id: "titration-protocol",
        title: "بروتوكول المعايرة",
        bullets: [
          "نعاير حجما VA=20.0 mL من حمض أحادي القاعدة بمحلول NaOH تركيزه CB=0.10 mol/L.",
          "يمثل المنحنى تغير pH بدلالة حجم القاعدة المضافة VB.",
          "يقابل التكافؤ نقطة الانعطاف حيث يحدث تغير سريع في pH.",
        ],
      },
    ],
    table: {
      title: "ملف المعايرة",
      columns: [
        { id: "symbol", label: "الرمز" },
        { id: "value", label: "القيمة" },
        { id: "unit", label: "الوحدة" },
      ],
      rows: [
        { id: "va", label: "VA", cells: { symbol: "VA", value: 20.0, unit: "mL" } },
        { id: "cb", label: "CB", cells: { symbol: "CB", value: 0.10, unit: "mol/L" } },
        { id: "ve", label: "VE", cells: { symbol: "VE", value: null, unit: "mL" } },
        { id: "ca", label: "CA", cells: { symbol: "CA", value: null, unit: "mol/L" } },
      ],
    },
    graph: {
      title: "منحنى المعايرة pH=f(VB)",
      xAxis: { label: "VB", unit: "mL", min: 0, max: 20 },
      yAxis: { label: "pH", min: 2, max: 12 },
      series: [
        {
          id: "ph",
          title: "pH",
          kind: "line",
          points: [
            { x: 0, y: 2.8 },
            { x: 4, y: 3.2 },
            { x: 8, y: 4.1 },
            { x: 11, y: 5.8 },
            { x: 12, y: 8.4 },
            { x: 13, y: 10.4 },
            { x: 16, y: 11.1 },
            { x: 20, y: 11.5 },
          ],
        },
      ],
    },
    diagram: {
      title: "جهاز المعايرة",
      description: "سمّ العناصر التي تظهر في تركيب المعايرة قبل استعمال المنحنى.",
      targets: [
        { id: "burette", label: "1", x: 36, y: 28, expectedLabel: "سحاحة", acceptedLabels: ["burette"] },
        { id: "beaker", label: "2", x: 54, y: 70, expectedLabel: "بيشر", acceptedLabels: ["كأس"] },
        { id: "ph-meter", label: "3", x: 74, y: 52, expectedLabel: "pH متر", acceptedLabels: ["pH-meter"] },
      ],
    },
    measurements: [
      { id: "acid-concentration", label: "تركيز الحمض CA", unitHint: "mol/L" },
    ],
    expectedCells: [
      { rowId: "ve", columnId: "value", expectedValue: 12, tolerance: 0.5, acceptedText: ["12 mL"] },
      { rowId: "ca", columnId: "value", expectedValue: 0.06, tolerance: 0.004, acceptedText: ["6e-2"] },
    ],
    expectedMeasurements: [
      {
        id: "acid-concentration",
        expected: { value: 0.06, unit: "mol/L" },
        tolerance: 0.004,
        acceptedUnits: ["mol.L-1", "mol/L"],
      },
    ],
    observationItems: [
      {
        id: "equivalence-jump",
        label: "القفزة السريعة في pH تحدد مجال التكافؤ.",
        detail: "نقطة الانعطاف وسط القفزة تعطي VE.",
        kind: "graph",
      },
      {
        id: "ve-reading",
        label: "من المنحنى نقرأ VE≈12 mL.",
        detail: "هذه القراءة تدخل مباشرة في علاقة التكافؤ.",
        kind: "reading",
      },
      {
        id: "concentration-relation",
        label: "عند التكافؤ: CA.VA=CB.VE، ومنه CA=0.060 mol/L.",
        detail: "التفاعل حمض/قاعدة بنسبة 1:1.",
        kind: "formula",
      },
      {
        id: "initial-ph-is-ve",
        label: "حجم التكافؤ يقرأ عند pH الابتدائي.",
        detail: "اختيار مضلل: التكافؤ يقرأ عند القفزة.",
        kind: "distractor",
      },
    ],
    prompt: {
      title: "احسب تركيز الحمض من منحنى المعايرة.",
      task: "سمّ الجهاز، اقرأ VE، أكمل الجدول والقياس، ثم اكتب خلاصة تربط التكافؤ بالتركيز.",
      requiredObservationIds: [
        "equivalence-jump",
        "ve-reading",
        "concentration-relation",
      ],
      requiredConclusionKeywords: ["VE", "تكافؤ", "CA", "0.060", "mol/L"],
      scaffoldPhrases: [
        "نحدد VE من وسط قفزة pH، فنقرأ VE≈12 mL.",
        "عند التكافؤ: CA.VA=CB.VE.",
        "إذن CA=0.10×12/20=0.060 mol/L.",
      ],
    },
  },
  {
    id: "zinc-acid-advancement-table",
    title: "جدول تقدم تفاعل الزنك مع الحمض",
    subtitle: "تحديد المتفاعل المحد، xmax، وكمية H2 المتشكلة.",
    bacContext:
      "جداول التقدم من أدوات الكيمياء المركزية في BAC: يحدد الطالب xmax والمتفاعل المحد ثم يستنتج الكميات النهائية.",
    sourceHint:
      "مستوحى من تفاعل معدن مع حمض ومتابعة غازية حيث تستغل العلاقة بين التقدم والحالة النهائية.",
    instrument: {
      subjectLabel: "Physics Lab",
      title: "ورشة الكيمياء والتفاعلات",
      iconKind: "chemistry",
    },
    sourceDocuments: [
      {
        id: "reaction-data",
        title: "معطيات التفاعل",
        bullets: [
          "المعادلة: Zn + 2H⁺ → Zn²⁺ + H₂.",
          "كمية المادة الابتدائية للزنك n(Zn)=0.030 mol.",
          "كمية المادة الابتدائية لأيونات H⁺ هي n(H⁺)=0.050 mol.",
          "نقارن n(Zn)/1 و n(H⁺)/2 لتحديد xmax.",
        ],
      },
    ],
    table: {
      title: "جدول التقدم المختصر",
      columns: [
        { id: "item", label: "العنصر" },
        { id: "value", label: "القيمة" },
        { id: "unit", label: "الوحدة" },
      ],
      rows: [
        { id: "zn-initial", label: "n0(Zn)", cells: { item: "كمية Zn", value: 0.030, unit: "mol" } },
        { id: "h-initial", label: "n0(H+)", cells: { item: "كمية H⁺", value: 0.050, unit: "mol" } },
        { id: "xmax", label: "xmax", cells: { item: "التقدم الأعظمي", value: null, unit: "mol" } },
        { id: "limiting", label: "المحد", cells: { item: "المتفاعل المحد", value: null, unit: "-" } },
        { id: "h2-final", label: "n(H2)", cells: { item: "كمية H₂ النهائية", value: null, unit: "mol" } },
      ],
    },
    graph: {
      title: "تغير حجم H₂ بدلالة الزمن",
      xAxis: { label: "t", unit: "min", min: 0, max: 8 },
      yAxis: { label: "V(H2)", unit: "mL", min: 0, max: 620 },
      series: [
        {
          id: "hydrogen",
          title: "V(H2)",
          kind: "line",
          points: [
            { x: 0, y: 0 },
            { x: 1, y: 220 },
            { x: 2, y: 380 },
            { x: 4, y: 520 },
            { x: 6, y: 590 },
            { x: 8, y: 600 },
          ],
        },
      ],
    },
    diagram: {
      title: "تركيب متابعة التفاعل",
      description: "حدد عناصر التركيب التجريبي لتجميع الغاز.",
      targets: [
        { id: "flask", label: "1", x: 30, y: 62, expectedLabel: "دورق", acceptedLabels: ["flask"] },
        { id: "gas-tube", label: "2", x: 54, y: 42, expectedLabel: "أنبوب غاز", acceptedLabels: ["أنبوب"] },
        { id: "graduated-cylinder", label: "3", x: 78, y: 50, expectedLabel: "مخبار مدرج", acceptedLabels: ["مخبار"] },
      ],
    },
    measurements: [
      { id: "hydrogen-amount", label: "كمية H₂ النهائية", unitHint: "mol" },
    ],
    expectedCells: [
      { rowId: "xmax", columnId: "value", expectedValue: 0.025, tolerance: 0.001, acceptedText: ["2.5e-2"] },
      { rowId: "limiting", columnId: "value", expectedValue: "H⁺", acceptedText: ["H+", "أيونات الهيدروجين", "الحمض"] },
      { rowId: "h2-final", columnId: "value", expectedValue: 0.025, tolerance: 0.001, acceptedText: ["2.5e-2"] },
    ],
    expectedMeasurements: [
      {
        id: "hydrogen-amount",
        expected: { value: 0.025, unit: "mol" },
        tolerance: 0.001,
      },
    ],
    observationItems: [
      {
        id: "stoichiometry-two-h",
        label: "المعادلة تستهلك 2 mol من H⁺ لكل 1 mol من Zn.",
        detail: "المعاملات الستوكيومترية ضرورية في مقارنة التقدم.",
        kind: "reaction",
      },
      {
        id: "limiting-h",
        label: "n(H⁺)/2=0.025 mol أصغر من n(Zn)=0.030 mol.",
        detail: "لذلك H⁺ هو المتفاعل المحد.",
        kind: "comparison",
      },
      {
        id: "h2-equals-xmax",
        label: "بما أن معامل H₂ هو 1 فإن n(H₂)=xmax=0.025 mol.",
        detail: "كمية الغاز النهائية تساوي التقدم النهائي.",
        kind: "table",
      },
      {
        id: "zn-limiting",
        label: "الزنك هو المتفاعل المحد لأنه صلب.",
        detail: "اختيار مضلل: المقارنة الكمية هي الحاسمة.",
        kind: "distractor",
      },
    ],
    prompt: {
      title: "أكمل جدول التقدم وحدد الغاز المتشكل.",
      task: "سمّ تركيب المتابعة، احسب xmax، حدد المتفاعل المحد، ثم اربط كمية H₂ بالتقدم.",
      requiredObservationIds: [
        "stoichiometry-two-h",
        "limiting-h",
        "h2-equals-xmax",
      ],
      requiredConclusionKeywords: ["xmax", "H⁺", "محدد", "H₂", "0.025"],
      scaffoldPhrases: [
        "نقارن n0(Zn)/1=0.030 و n0(H⁺)/2=0.025.",
        "إذن H⁺ هو المتفاعل المحد وxmax=0.025 mol.",
        "بما أن معامل H₂ يساوي 1 فإن n(H₂)=0.025 mol.",
      ],
    },
  },
];

export function getPhysicsChemistryReactionWorkbenchPreset(value: unknown) {
  return getStructuredLabWorkbenchPreset(
    value,
    physicsChemistryReactionWorkbenchPresets[0],
  );
}
