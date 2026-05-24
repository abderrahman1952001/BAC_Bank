import type { StructuredLabWorkbenchPreset } from "@bac-bank/contracts/lab";
import { getStructuredLabWorkbenchPreset } from "@/lib/lab-structured-workbench";

export const civilTechnicalSheetWorkbenchPresets: StructuredLabWorkbenchPreset[] = [
  {
    id: "foundation-quantity-takeoff",
    title: "قراءة مخطط وحساب كمية خرسانة",
    subtitle: "استخراج أبعاد أساس شريطي من بطاقة تقنية ثم حساب الحجم.",
    bacContext:
      "في ملفات الهندسة المدنية يطلب BAC قراءة مخطط أو بطاقة تقنية، استخراج الأبعاد، ثم حساب الكميات اللازمة للإنجاز.",
    sourceHint:
      "مستند إلى جداول الكميات والأساسات الشريطية في ملفات إنجاز مشروع بناء.",
    instrument: {
      subjectLabel: "Civil Tech Lab",
      title: "ورشة البطاقة التقنية المدنية",
      iconKind: "technical",
    },
    sourceDocuments: [
      {
        id: "foundation-sheet",
        title: "بطاقة تقنية للأساس",
        bullets: [
          "طول الأساس L=8.0 m.",
          "عرض الأساس b=0.50 m.",
          "ارتفاع الخرسانة h=0.40 m.",
          "حجم الخرسانة يحسب بالعلاقة V=L×b×h.",
        ],
      },
    ],
    table: {
      title: "جدول الكميات",
      columns: [
        { id: "item", label: "العنصر" },
        { id: "value", label: "القيمة" },
        { id: "unit", label: "الوحدة" },
      ],
      rows: [
        { id: "length", label: "L", cells: { item: "الطول", value: 8, unit: "m" } },
        { id: "width", label: "b", cells: { item: "العرض", value: 0.5, unit: "m" } },
        { id: "height", label: "h", cells: { item: "الارتفاع", value: 0.4, unit: "m" } },
        { id: "volume", label: "V", cells: { item: "حجم الخرسانة", value: null, unit: "m³" } },
      ],
    },
    diagram: {
      title: "مقطع أساس شريطي",
      description: "سمّ عناصر المقطع قبل حساب الكمية.",
      targets: [
        { id: "foundation", label: "1", x: 48, y: 66, expectedLabel: "أساس", acceptedLabels: ["semelle"] },
        { id: "concrete", label: "2", x: 58, y: 54, expectedLabel: "خرسانة", acceptedLabels: ["béton"] },
        { id: "dimensions", label: "3", x: 74, y: 38, expectedLabel: "أبعاد", acceptedLabels: ["L b h"] },
      ],
    },
    measurements: [
      { id: "concrete-volume", label: "حجم الخرسانة", unitHint: "m³" },
    ],
    expectedCells: [
      { rowId: "volume", columnId: "value", expectedValue: 1.6, tolerance: 0.05, acceptedText: ["1.6 m³"] },
    ],
    expectedMeasurements: [
      {
        id: "concrete-volume",
        expected: { value: 1.6, unit: "m³" },
        tolerance: 0.05,
        acceptedUnits: ["m3", "m^3"],
      },
    ],
    observationItems: [
      {
        id: "dimensions-from-sheet",
        label: "الأبعاد L وb وh تستخرج من البطاقة التقنية.",
        detail: "القراءة الدقيقة للأبعاد تسبق الحساب.",
        kind: "document",
      },
      {
        id: "volume-formula",
        label: "حجم الأساس المستطيل يحسب بالعلاقة V=L×b×h.",
        detail: "كل الأبعاد بالمتر.",
        kind: "formula",
      },
      {
        id: "volume-value",
        label: "V=8×0.50×0.40=1.6 m³.",
        detail: "هذه كمية الخرسانة المطلوبة.",
        kind: "quantity",
      },
      {
        id: "add-dimensions",
        label: "الحجم يحسب بجمع L+b+h.",
        detail: "اختيار مضلل: الحجم حاصل ضرب الأبعاد.",
        kind: "distractor",
      },
    ],
    prompt: {
      title: "احسب كمية الخرسانة من بطاقة تقنية.",
      task: "سمّ عناصر المقطع، أكمل الحجم، اكتب القياس بوحدته، ثم اكتب خلاصة الكمية.",
      requiredObservationIds: [
        "dimensions-from-sheet",
        "volume-formula",
        "volume-value",
      ],
      requiredConclusionKeywords: ["V", "L", "b", "h", "1.6", "m³"],
      scaffoldPhrases: [
        "نستخرج الأبعاد من البطاقة: L=8 m وb=0.50 m وh=0.40 m.",
        "نطبق V=L×b×h.",
        "إذن V=1.6 m³ من الخرسانة.",
      ],
    },
  },
  {
    id: "construction-sequence-answer-file",
    title: "ترتيب مراحل إنجاز أساس",
    subtitle: "إكمال جدول مراحل التنفيذ كما في ملف الإجابة التقنية.",
    bacContext:
      "في التكنولوجيا المدنية تظهر أسئلة ترتيب خطوات الإنجاز وربط كل خطوة بأداة أو مراقبة، وهو نمط قريب من ملف الإجابة.",
    sourceHint:
      "مستند إلى بطاقات تنفيذ الأساسات: التخطيط، الحفر، القوالب، التسليح، الصب، المعالجة.",
    instrument: {
      subjectLabel: "Civil Tech Lab",
      title: "ورشة البطاقة التقنية المدنية",
      iconKind: "technical",
    },
    sourceDocuments: [
      {
        id: "sequence-sheet",
        title: "مقتطف من بطاقة التنفيذ",
        bullets: [
          "لا يبدأ الصب قبل وضع التسليح ومراقبة القوالب.",
          "الحفر يأتي بعد التوقيع الطبوغرافي.",
          "المعالجة تأتي بعد صب الخرسانة.",
        ],
      },
    ],
    table: {
      title: "ملف الإجابة: ترتيب المراحل",
      columns: [
        { id: "step", label: "الرتبة" },
        { id: "operation", label: "العملية" },
        { id: "control", label: "المراقبة" },
      ],
      rows: [
        { id: "step-1", label: "1", cells: { step: 1, operation: null, control: "المحاور" } },
        { id: "step-2", label: "2", cells: { step: 2, operation: null, control: "المنسوب" } },
        { id: "step-3", label: "3", cells: { step: 3, operation: null, control: "الأبعاد" } },
        { id: "step-4", label: "4", cells: { step: 4, operation: null, control: "التموضع" } },
        { id: "step-5", label: "5", cells: { step: 5, operation: null, control: "الجودة" } },
      ],
    },
    expectedCells: [
      { rowId: "step-1", columnId: "operation", expectedValue: "توقيع", acceptedText: ["توقيع المحاور", "implantation"] },
      { rowId: "step-2", columnId: "operation", expectedValue: "حفر", acceptedText: ["الحفر", "terrassement"] },
      { rowId: "step-3", columnId: "operation", expectedValue: "قوالب", acceptedText: ["وضع القوالب", "coffrage"] },
      { rowId: "step-4", columnId: "operation", expectedValue: "تسليح", acceptedText: ["وضع التسليح", "ferraillage"] },
      { rowId: "step-5", columnId: "operation", expectedValue: "صب", acceptedText: ["صب الخرسانة", "coulage"] },
    ],
    observationItems: [
      {
        id: "layout-before-digging",
        label: "التوقيع الطبوغرافي يسبق الحفر.",
        detail: "يحدد المحاور والمنسوب.",
        kind: "sequence",
      },
      {
        id: "formwork-before-steel",
        label: "القوالب تضبط الأبعاد قبل وضع التسليح.",
        detail: "تسلسل إنجاز منطقي.",
        kind: "sequence",
      },
      {
        id: "casting-after-steel",
        label: "الصب يأتي بعد التسليح والمراقبة.",
        detail: "لا يصب العنصر قبل التحقق.",
        kind: "sequence",
      },
      {
        id: "casting-before-digging",
        label: "الصب هو أول مرحلة في إنجاز الأساس.",
        detail: "اختيار مضلل: الصب مرحلة متأخرة.",
        kind: "distractor",
      },
    ],
    prompt: {
      title: "أكمل ترتيب مراحل الإنجاز.",
      task: "املأ جدول العمليات، اختر قواعد الترتيب الصحيحة، ثم اكتب خلاصة مختصرة.",
      requiredObservationIds: [
        "layout-before-digging",
        "formwork-before-steel",
        "casting-after-steel",
      ],
      requiredConclusionKeywords: ["توقيع", "حفر", "قوالب", "تسليح", "صب"],
      scaffoldPhrases: [
        "نبدأ بتوقيع المحاور ثم الحفر.",
        "بعد ذلك توضع القوالب ثم التسليح.",
        "يأتي صب الخرسانة بعد المراقبة.",
      ],
    },
  },
];

export function getCivilTechnicalSheetWorkbenchPreset(value: unknown) {
  return getStructuredLabWorkbenchPreset(value, civilTechnicalSheetWorkbenchPresets[0]);
}
