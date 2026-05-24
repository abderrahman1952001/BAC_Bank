import type { StructuredLabWorkbenchPreset } from "@bac-bank/contracts/lab";
import { getStructuredLabWorkbenchPreset } from "@/lib/lab-structured-workbench";

export const electricalTechnicalFileWorkbenchPresets: StructuredLabWorkbenchPreset[] = [
  {
    id: "motor-starter-component-identification",
    title: "قراءة ملف تقني لمشغل محرك",
    subtitle: "تسمية مكونات سلسلة القدرة والحماية.",
    bacContext:
      "في ملفات التكنولوجيا الكهربائية يطلب BAC التعرف على المكونات من مخطط قدرة/تحكم وربط كل رمز بوظيفته.",
    sourceHint:
      "مستند إلى ملف مشغل محرك: قاطع/مصهر، كونتاكتور، مرحل حراري، محرك.",
    instrument: {
      subjectLabel: "Electrical Tech Lab",
      title: "ورشة الملف التقني الكهربائي",
      iconKind: "technical",
    },
    sourceDocuments: [
      {
        id: "starter-file",
        title: "مقتطف من الملف التقني",
        bullets: [
          "QF يحمي الدارة من القصر.",
          "KM ينجز وصل وفصل المحرك.",
          "RT يحمي من زيادة الحمل.",
          "M هو المحرك ثلاثي الأطوار.",
        ],
      },
    ],
    table: {
      title: "جدول تعريف المكونات",
      columns: [
        { id: "symbol", label: "الرمز" },
        { id: "component", label: "المكون" },
        { id: "function", label: "الوظيفة" },
      ],
      rows: [
        { id: "qf", label: "QF", cells: { symbol: "QF", component: null, function: null } },
        { id: "km", label: "KM", cells: { symbol: "KM", component: null, function: null } },
        { id: "rt", label: "RT", cells: { symbol: "RT", component: null, function: null } },
        { id: "m", label: "M", cells: { symbol: "M", component: null, function: null } },
      ],
    },
    diagram: {
      title: "سلسلة قدرة مشغل محرك",
      description: "سمّ الرموز الأساسية في ملف القدرة.",
      targets: [
        { id: "breaker", label: "1", x: 22, y: 38, expectedLabel: "QF", acceptedLabels: ["قاطع"] },
        { id: "contactor", label: "2", x: 42, y: 46, expectedLabel: "KM", acceptedLabels: ["كونتاكتور"] },
        { id: "thermal-relay", label: "3", x: 62, y: 54, expectedLabel: "RT", acceptedLabels: ["مرحل حراري"] },
        { id: "motor", label: "4", x: 82, y: 60, expectedLabel: "M", acceptedLabels: ["محرك"] },
      ],
    },
    expectedCells: [
      { rowId: "qf", columnId: "component", expectedValue: "قاطع", acceptedText: ["مصهر", "disjoncteur"] },
      { rowId: "qf", columnId: "function", expectedValue: "حماية", acceptedText: ["حماية من القصر"] },
      { rowId: "km", columnId: "component", expectedValue: "كونتاكتور", acceptedText: ["contacteur"] },
      { rowId: "km", columnId: "function", expectedValue: "وصل", acceptedText: ["تشغيل", "فصل"] },
      { rowId: "rt", columnId: "component", expectedValue: "مرحل حراري", acceptedText: ["relais thermique"] },
      { rowId: "m", columnId: "component", expectedValue: "محرك", acceptedText: ["moteur"] },
    ],
    observationItems: [
      {
        id: "qf-protects-short",
        label: "QF عنصر حماية من القصر أو زيادة التيار.",
        detail: "يوضع في بداية سلسلة القدرة.",
        kind: "component",
      },
      {
        id: "km-switches-power",
        label: "KM عنصر وصل وفصل يتحكم في تغذية المحرك.",
        detail: "الملف في التحكم والتلامسات في القدرة.",
        kind: "component",
      },
      {
        id: "rt-overload",
        label: "RT يحمي المحرك من زيادة الحمل.",
        detail: "الحماية الحرارية مرتبطة بتيار المحرك.",
        kind: "safety",
      },
      {
        id: "motor-is-protection",
        label: "M هو عنصر حماية الدارة.",
        detail: "اختيار مضلل: M هو المحرك.",
        kind: "distractor",
      },
    ],
    prompt: {
      title: "عرّف مكونات ملف مشغل محرك.",
      task: "سمّ عناصر المخطط، أكمل جدول التعريف، ثم اكتب خلاصة وظيفة الحماية والتحكم.",
      requiredObservationIds: ["qf-protects-short", "km-switches-power", "rt-overload"],
      requiredConclusionKeywords: ["QF", "KM", "RT", "محرك"],
      scaffoldPhrases: [
        "QF عنصر حماية في بداية الدارة.",
        "KM ينجز وصل وفصل تغذية المحرك.",
        "RT يحمي المحرك من زيادة الحمل.",
      ],
    },
  },
  {
    id: "motor-current-protection-choice",
    title: "حساب تيار محرك واختيار حماية",
    subtitle: "استغلال بطاقة محرك أحادي الطور لاختيار عيار حماية مناسب.",
    bacContext:
      "في الملف التقني يقرأ الطالب القدرة والتوتر وعوامل التصحيح ثم يحسب التيار لاختيار عيار الحماية.",
    sourceHint:
      "مستند إلى بطاقات المحركات حيث I=P/(U.cosφ.η).",
    instrument: {
      subjectLabel: "Electrical Tech Lab",
      title: "ورشة الملف التقني الكهربائي",
      iconKind: "technical",
    },
    sourceDocuments: [
      {
        id: "motor-plate",
        title: "بطاقة محرك",
        bullets: [
          "القدرة المفيدة P=1.5 kW.",
          "التوتر U=230 V.",
          "cosφ=0.8 و المردود η=0.75.",
          "نختار حماية معيارية أعلى مباشرة من التيار المحسوب.",
        ],
      },
    ],
    table: {
      title: "ملف الحساب والحماية",
      columns: [
        { id: "item", label: "العنصر" },
        { id: "value", label: "القيمة" },
        { id: "unit", label: "الوحدة" },
      ],
      rows: [
        { id: "power", label: "P", cells: { item: "القدرة", value: 1.5, unit: "kW" } },
        { id: "voltage", label: "U", cells: { item: "التوتر", value: 230, unit: "V" } },
        { id: "current", label: "I", cells: { item: "تيار المحرك", value: null, unit: "A" } },
        { id: "protection", label: "QF", cells: { item: "عيار الحماية", value: null, unit: "A" } },
      ],
    },
    measurements: [
      { id: "motor-current", label: "تيار المحرك I", unitHint: "A" },
    ],
    expectedCells: [
      { rowId: "current", columnId: "value", expectedValue: 10.9, tolerance: 0.5, acceptedText: ["10.9 A"] },
      { rowId: "protection", columnId: "value", expectedValue: 16, tolerance: 0.5, acceptedText: ["16 A"] },
    ],
    expectedMeasurements: [
      {
        id: "motor-current",
        expected: { value: 10.9, unit: "A" },
        tolerance: 0.5,
        acceptedUnits: ["ampere"],
      },
    ],
    observationItems: [
      {
        id: "power-converted",
        label: "نحوّل 1.5 kW إلى 1500 W قبل الحساب.",
        detail: "الواط هو وحدة القدرة في العلاقة.",
        kind: "unit",
      },
      {
        id: "current-formula",
        label: "I=P/(U.cosφ.η).",
        detail: "العلاقة تستغل التوتر ومعامل القدرة والمردود.",
        kind: "formula",
      },
      {
        id: "protection-above-current",
        label: "نختار عيارا معياريا أعلى من 10.9 A، أي 16 A.",
        detail: "لا نختار عيارا أصغر من تيار التشغيل.",
        kind: "choice",
      },
      {
        id: "choose-10a",
        label: "نختار حماية 10 A لأنها أقرب إلى التيار.",
        detail: "اختيار مضلل: 10 A أصغر من تيار التشغيل المحسوب.",
        kind: "distractor",
      },
    ],
    prompt: {
      title: "احسب تيار المحرك واختر الحماية.",
      task: "أكمل التيار وعيار الحماية، اكتب القياس، ثم اشرح الاختيار.",
      requiredObservationIds: [
        "power-converted",
        "current-formula",
        "protection-above-current",
      ],
      requiredConclusionKeywords: ["I", "10.9", "A", "16"],
      scaffoldPhrases: [
        "نحوّل القدرة إلى P=1500 W.",
        "نحسب I=1500/(230×0.8×0.75)≈10.9 A.",
        "نختار عيار حماية أعلى مباشرة: 16 A.",
      ],
    },
  },
];

export function getElectricalTechnicalFileWorkbenchPreset(value: unknown) {
  return getStructuredLabWorkbenchPreset(
    value,
    electricalTechnicalFileWorkbenchPresets[0],
  );
}
