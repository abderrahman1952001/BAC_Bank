import type { StructuredLabWorkbenchPreset } from "@bac-bank/contracts/lab";
import { getStructuredLabWorkbenchPreset } from "@/lib/lab-structured-workbench";

export const svtTectonicsWorkbenchPresets: StructuredLabWorkbenchPreset[] = [
  {
    id: "subduction-cross-section-interpretation",
    title: "مقطع اندساس وتفسير زلزالي",
    subtitle: "تسمية عناصر منطقة اندساس وربط الزلازل بمستوى بنيوف.",
    bacContext:
      "في الجيولوجيا تظهر خرائط ومقاطع اندساس مع توزع بؤر زلزالية، ويطلب استنتاج طبيعة حركة الصفائح.",
    sourceHint:
      "مستند إلى وثائق الاندساس: خندق محيطي، صفيحة محيطية غائرة، قوس بركاني، وميل بؤر الزلازل.",
    instrument: {
      subjectLabel: "SVT Lab",
      title: "ورشة التكتونية",
      iconKind: "graph",
    },
    sourceDocuments: [
      {
        id: "subduction-doc",
        title: "مفتاح قراءة المقطع",
        bullets: [
          "تنتظم بؤر الزلازل على مستوى مائل يسمى مستوى بنيوف.",
          "تنغرز الصفيحة المحيطية الأكثر كثافة تحت صفيحة قارية.",
          "يرافق الاندساس خندق محيطي ونشاط بركاني.",
        ],
      },
    ],
    diagram: {
      title: "منطقة اندساس",
      description: "سمّ العناصر الأساسية في المقطع الجيولوجي.",
      targets: [
        { id: "oceanic-plate", label: "1", x: 28, y: 62, expectedLabel: "صفيحة محيطية", acceptedLabels: ["ليتوسفير محيطي"] },
        { id: "continental-plate", label: "2", x: 70, y: 42, expectedLabel: "صفيحة قارية", acceptedLabels: ["ليتوسفير قاري"] },
        { id: "trench", label: "3", x: 44, y: 48, expectedLabel: "خندق محيطي", acceptedLabels: ["خندق"] },
        { id: "benioff", label: "4", x: 58, y: 66, expectedLabel: "مستوى بنيوف", acceptedLabels: ["Benioff"] },
        { id: "volcano", label: "5", x: 78, y: 28, expectedLabel: "بركان", acceptedLabels: ["قوس بركاني"] },
      ],
    },
    observationItems: [
      {
        id: "inclined-earthquakes",
        label: "تنتظم بؤر الزلازل على مستوى مائل نحو العمق.",
        detail: "هذا هو مؤشر الاندساس في المقطع.",
        kind: "evidence",
      },
      {
        id: "oceanic-descends",
        label: "الصفيحة المحيطية تنغرز تحت الصفيحة القارية.",
        detail: "تفسر الخندق والنشاط الزلزالي.",
        kind: "model",
      },
      {
        id: "volcanism-related",
        label: "النشاط البركاني يرافق منطقة الاندساس.",
        detail: "القوس البركاني من دلائل الحدود التقاربية.",
        kind: "evidence",
      },
      {
        id: "divergence-at-trench",
        label: "الخندق يدل على تباعد صفائح وتكون قشرة جديدة.",
        detail: "اختيار مضلل: تكون القشرة الجديدة عند الذروة المحيطية.",
        kind: "distractor",
      },
    ],
    prompt: {
      title: "فسر المقطع كمنطقة اندساس.",
      task: "سمّ عناصر المقطع، اختر الأدلة الصحيحة، ثم اكتب خلاصة عن حركة الصفائح.",
      requiredObservationIds: [
        "inclined-earthquakes",
        "oceanic-descends",
        "volcanism-related",
      ],
      requiredConclusionKeywords: ["اندساس", "صفيحة محيطية", "بنيوف", "خندق"],
      scaffoldPhrases: [
        "توزع الزلازل على مستوى مائل يمثل مستوى بنيوف.",
        "تنغرز الصفيحة المحيطية تحت الصفيحة القارية.",
        "يدل وجود الخندق والقوس البركاني على حد تقاربي اندساسي.",
      ],
    },
  },
  {
    id: "ocean-ridge-spreading-rate",
    title: "ذروة محيطية وسرعة الاتساع",
    subtitle: "قراءة أشرطة العمر حول الذروة ثم حساب سرعة اتساع الصفيحة.",
    bacContext:
      "في تكتونية الصفائح يستغل الطالب خرائط عمر القشرة المحيطية حول الذروة لحساب سرعة الاتساع ودعم فرضية التباعد.",
    sourceHint:
      "مبني على وثائق الأعمار المتماثلة على جانبي الذروة وحساب المسافة/الزمن.",
    instrument: {
      subjectLabel: "SVT Lab",
      title: "ورشة التكتونية",
      iconKind: "graph",
    },
    sourceDocuments: [
      {
        id: "ridge-doc",
        title: "معطيات الخريطة",
        bullets: [
          "توجد صخور عمرها 2 Ma على بعد 40 km من محور الذروة.",
          "الأعمار متماثلة تقريبا على جانبي الذروة.",
          "سرعة الاتساع الجانبية تحسب من المسافة/العمر.",
        ],
      },
    ],
    table: {
      title: "حساب سرعة الاتساع",
      columns: [
        { id: "item", label: "العنصر" },
        { id: "value", label: "القيمة" },
        { id: "unit", label: "الوحدة" },
      ],
      rows: [
        { id: "distance", label: "d", cells: { item: "المسافة عن الذروة", value: 40, unit: "km" } },
        { id: "age", label: "t", cells: { item: "العمر", value: 2, unit: "Ma" } },
        { id: "rate", label: "v", cells: { item: "سرعة الاتساع", value: null, unit: "cm/year" } },
      ],
    },
    diagram: {
      title: "خريطة أعمار حول ذروة محيطية",
      description: "سمّ محور الذروة واتجاه اتساع القشرة.",
      targets: [
        { id: "ridge-axis", label: "1", x: 50, y: 50, expectedLabel: "محور الذروة", acceptedLabels: ["ذروة"] },
        { id: "new-crust", label: "2", x: 44, y: 42, expectedLabel: "قشرة حديثة", acceptedLabels: ["صخور حديثة"] },
        { id: "old-crust", label: "3", x: 20, y: 64, expectedLabel: "قشرة أقدم", acceptedLabels: ["صخور قديمة"] },
        { id: "spreading", label: "4", x: 68, y: 36, expectedLabel: "اتساع", acceptedLabels: ["تباعد"] },
      ],
    },
    measurements: [
      { id: "spreading-rate", label: "سرعة الاتساع", unitHint: "cm/year" },
    ],
    expectedCells: [
      { rowId: "rate", columnId: "value", expectedValue: 2, tolerance: 0.2, acceptedText: ["2 cm/year", "2 cm/an"] },
    ],
    expectedMeasurements: [
      {
        id: "spreading-rate",
        expected: { value: 2, unit: "cm/year" },
        tolerance: 0.2,
        acceptedUnits: ["cm/an", "cm.yr-1"],
      },
    ],
    observationItems: [
      {
        id: "ages-symmetric",
        label: "الأعمار متماثلة على جانبي الذروة.",
        detail: "يدعم ذلك اتساعا ثنائيا من المحور.",
        kind: "map",
      },
      {
        id: "young-at-axis",
        label: "أحدث القشرة توجد عند محور الذروة.",
        detail: "تتكون القشرة المحيطية الجديدة عند الذروة.",
        kind: "evidence",
      },
      {
        id: "rate-calculation",
        label: "40 km خلال 2 Ma تعطي 2 cm/year.",
        detail: "تحويل km/Ma إلى cm/year ضروري.",
        kind: "calculation",
      },
      {
        id: "old-at-axis",
        label: "أقدم الصخور توجد في محور الذروة.",
        detail: "اختيار مضلل: الأحدث توجد في المحور.",
        kind: "distractor",
      },
    ],
    prompt: {
      title: "احسب سرعة الاتساع عند ذروة محيطية.",
      task: "سمّ الخريطة، أكمل السرعة، اكتب القياس بوحدته، ثم استنتج حركة الصفائح.",
      requiredObservationIds: [
        "ages-symmetric",
        "young-at-axis",
        "rate-calculation",
      ],
      requiredConclusionKeywords: ["ذروة", "اتساع", "2", "cm/year", "تباعد"],
      scaffoldPhrases: [
        "الأعمار متماثلة على جانبي الذروة وتزداد بالابتعاد عن المحور.",
        "نحسب v=d/t=40 km/2 Ma=20 km/Ma.",
        "بعد التحويل نحصل على v≈2 cm/year، ما يدل على تباعد الصفائح.",
      ],
    },
  },
];

export function getSvtTectonicsWorkbenchPreset(value: unknown) {
  return getStructuredLabWorkbenchPreset(value, svtTectonicsWorkbenchPresets[0]);
}
