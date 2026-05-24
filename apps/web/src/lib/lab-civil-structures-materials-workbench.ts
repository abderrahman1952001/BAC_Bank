import type { StructuredLabWorkbenchPreset } from "@bac-bank/contracts/lab";
import { getStructuredLabWorkbenchPreset } from "@/lib/lab-structured-workbench";

export const civilStructuresMaterialsWorkbenchPresets: StructuredLabWorkbenchPreset[] = [
  {
    id: "reinforced-concrete-steel-area",
    title: "مقطع خرسانة مسلحة ومساحة التسليح",
    subtitle: "تسمية عناصر المقطع وحساب مساحة قضبان الشد.",
    bacContext:
      "في الهندسة المدنية تظهر مقاطع خرسانة مسلحة مع جدول قضبان، ويطلب حساب مساحة التسليح وقراءة دور الخرسانة والفولاذ.",
    sourceHint:
      "مستند إلى ملفات béton armé حيث يستغل الطالب قطر القضبان وعددها ومساحة المقطع.",
    instrument: {
      subjectLabel: "Civil Tech Lab",
      title: "ورشة المنشآت والمواد",
      iconKind: "technical",
    },
    sourceDocuments: [
      {
        id: "rc-section-data",
        title: "معطيات المقطع",
        bullets: [
          "مقطع جائز مستطيل b=20 cm و h=40 cm.",
          "تسليح الشد: 4HA12.",
          "مساحة قضيب واحد قطره 12 mm هي تقريبا 113 mm².",
        ],
      },
    ],
    table: {
      title: "جدول التسليح",
      columns: [
        { id: "item", label: "العنصر" },
        { id: "value", label: "القيمة" },
        { id: "unit", label: "الوحدة" },
      ],
      rows: [
        { id: "bar-count", label: "n", cells: { item: "عدد القضبان", value: 4, unit: "-" } },
        { id: "bar-area", label: "A1", cells: { item: "مساحة قضيب HA12", value: 113, unit: "mm²" } },
        { id: "steel-area", label: "As", cells: { item: "مساحة التسليح", value: null, unit: "mm²" } },
      ],
    },
    diagram: {
      title: "مقطع خرسانة مسلحة",
      description: "سمّ مواد وعناصر المقطع قبل استغلال جدول التسليح.",
      targets: [
        { id: "concrete", label: "1", x: 48, y: 42, expectedLabel: "خرسانة", acceptedLabels: ["béton", "concrete"] },
        { id: "tension-steel", label: "2", x: 42, y: 74, expectedLabel: "تسليح الشد", acceptedLabels: ["HA12", "فولاذ"] },
        { id: "stirrup", label: "3", x: 65, y: 60, expectedLabel: "كانة", acceptedLabels: ["étrier"] },
      ],
    },
    measurements: [
      { id: "steel-area", label: "مساحة التسليح As", unitHint: "mm²" },
    ],
    expectedCells: [
      { rowId: "steel-area", columnId: "value", expectedValue: 452, tolerance: 8, acceptedText: ["452 mm²"] },
    ],
    expectedMeasurements: [
      {
        id: "steel-area",
        expected: { value: 452, unit: "mm²" },
        tolerance: 8,
        acceptedUnits: ["mm2", "mm^2"],
      },
    ],
    observationItems: [
      {
        id: "steel-in-tension",
        label: "قضبان الشد توضع في منطقة الجر أسفل الجائز.",
        detail: "الفولاذ يقاوم قوى الشد.",
        kind: "material",
      },
      {
        id: "area-count",
        label: "مساحة التسليح تساوي عدد القضبان في مساحة قضيب واحد.",
        detail: "As=n×A1.",
        kind: "calculation",
      },
      {
        id: "as-value",
        label: "4×113=452 mm².",
        detail: "هذه القيمة تدخل في تحقق المقطع.",
        kind: "calculation",
      },
      {
        id: "concrete-tension-best",
        label: "الخرسانة وحدها هي الأفضل لمقاومة الشد.",
        detail: "اختيار مضلل: الخرسانة ضعيفة في الشد.",
        kind: "distractor",
      },
    ],
    prompt: {
      title: "احسب مساحة تسليح الشد.",
      task: "سمّ المقطع، أكمل As، اكتب القياس بوحدته، ثم اربط المادة بوظيفتها.",
      requiredObservationIds: ["steel-in-tension", "area-count", "as-value"],
      requiredConclusionKeywords: ["As", "4", "113", "452", "mm²"],
      scaffoldPhrases: [
        "التسليح السفلي هو تسليح الشد.",
        "مساحة التسليح As=n×A1.",
        "إذن As=4×113=452 mm².",
      ],
    },
  },
  {
    id: "material-stress-check",
    title: "تحقق إجهاد في مادة",
    subtitle: "قراءة مقطع ومواد ثم حساب الإجهاد σ=N/A.",
    bacContext:
      "في ملفات المنشآت والمواد يقرأ الطالب قوة محورية ومساحة مقطع ثم يقارن الإجهاد بالمقاومة المسموحة.",
    sourceHint:
      "مستوحى من جداول المواد ومقاطع الأعمدة حيث يستعمل σ=N/A مع تحويل الوحدات.",
    instrument: {
      subjectLabel: "Civil Tech Lab",
      title: "ورشة المنشآت والمواد",
      iconKind: "technical",
    },
    sourceDocuments: [
      {
        id: "stress-data",
        title: "معطيات التحقق",
        bullets: [
          "عمود مستطيل أبعاده 20 cm × 30 cm.",
          "قوة ضغط محورية N=120 kN.",
          "الإجهاد المسموح للمادة σadm=8 MPa.",
        ],
      },
    ],
    table: {
      title: "جدول التحقق",
      columns: [
        { id: "item", label: "العنصر" },
        { id: "value", label: "القيمة" },
        { id: "unit", label: "الوحدة" },
      ],
      rows: [
        { id: "area", label: "A", cells: { item: "مساحة المقطع", value: null, unit: "m²" } },
        { id: "stress", label: "σ", cells: { item: "الإجهاد", value: null, unit: "MPa" } },
        { id: "decision", label: "قرار", cells: { item: "المقارنة مع σadm", value: null, unit: "-" } },
      ],
    },
    diagram: {
      title: "مقطع عمود مضغوط",
      description: "حدد القوة المحورية والمقطع قبل الحساب.",
      targets: [
        { id: "axial-load", label: "1", x: 50, y: 22, expectedLabel: "قوة ضغط", acceptedLabels: ["N"] },
        { id: "section", label: "2", x: 50, y: 58, expectedLabel: "مقطع", acceptedLabels: ["A"] },
        { id: "material", label: "3", x: 70, y: 58, expectedLabel: "مادة", acceptedLabels: ["خرسانة"] },
      ],
    },
    measurements: [
      { id: "stress", label: "الإجهاد σ", unitHint: "MPa" },
    ],
    expectedCells: [
      { rowId: "area", columnId: "value", expectedValue: 0.06, tolerance: 0.003, acceptedText: ["0.06 m²"] },
      { rowId: "stress", columnId: "value", expectedValue: 2, tolerance: 0.2, acceptedText: ["2 MPa"] },
      { rowId: "decision", columnId: "value", expectedValue: "مقبول", acceptedText: ["آمن", "غير متجاوز"] },
    ],
    expectedMeasurements: [
      {
        id: "stress",
        expected: { value: 2, unit: "MPa" },
        tolerance: 0.2,
      },
    ],
    observationItems: [
      {
        id: "area-conversion",
        label: "20 cm × 30 cm = 0.06 m².",
        detail: "تحويل cm² إلى m² ضروري.",
        kind: "unit",
      },
      {
        id: "stress-formula",
        label: "الإجهاد يحسب بالعلاقة σ=N/A.",
        detail: "N=120 kN و A=0.06 m².",
        kind: "formula",
      },
      {
        id: "stress-safe",
        label: "σ≈2 MPa أصغر من σadm=8 MPa، إذن التحقق مقبول.",
        detail: "المقارنة النهائية هي قرار تقني.",
        kind: "decision",
      },
      {
        id: "stress-too-high",
        label: "2 MPa أكبر من 8 MPa.",
        detail: "اختيار مضلل: 2 أصغر من 8.",
        kind: "distractor",
      },
    ],
    prompt: {
      title: "تحقق إجهاد الضغط في المقطع.",
      task: "سمّ العناصر، أكمل المساحة والإجهاد والقرار، ثم اكتب خلاصة التحقق.",
      requiredObservationIds: ["area-conversion", "stress-formula", "stress-safe"],
      requiredConclusionKeywords: ["σ", "N/A", "2", "MPa", "مقبول"],
      scaffoldPhrases: [
        "نحسب مساحة المقطع A=0.20×0.30=0.06 m².",
        "الإجهاد σ=N/A=120 kN/0.06 m²≈2 MPa.",
        "بما أن 2 MPa أصغر من 8 MPa فالتحقق مقبول.",
      ],
    },
  },
];

export function getCivilStructuresMaterialsWorkbenchPreset(value: unknown) {
  return getStructuredLabWorkbenchPreset(
    value,
    civilStructuresMaterialsWorkbenchPresets[0],
  );
}
