import type { StructuredLabWorkbenchPreset } from "@bac-bank/contracts/lab";
import { getStructuredLabWorkbenchPreset } from "@/lib/lab-structured-workbench";

export const civilBeamStaticsWorkbenchPresets: StructuredLabWorkbenchPreset[] = [
  {
    id: "simply-supported-beam-reactions",
    title: "جائزة بسيطة وردود الأفعال",
    subtitle: "تسمية المساند، كتابة معادلات التوازن، وحساب RA وRB.",
    bacContext:
      "في التكنولوجيا المدنية يطلب BAC قراءة جائزة محملة، تحديد المساند والقوى، ثم حساب ردود الأفعال باستعمال شروط التوازن.",
    sourceHint:
      "مستند إلى مسائل الجائزتين بمسندين وحمل مركز حيث تظهر معادلات ΣF=0 وΣM=0.",
    instrument: {
      subjectLabel: "Civil Tech Lab",
      title: "تحليل الجوائز",
      iconKind: "technical",
    },
    sourceDocuments: [
      {
        id: "beam-data",
        title: "معطيات الجائزة",
        bullets: [
          "جائزة AB طولها L=6 m محمولة على مسندين بسيطين.",
          "حمل مركز P=12 kN مطبق في منتصف الجائزة.",
          "بسبب التناظر ننتظر RA=RB.",
        ],
      },
    ],
    table: {
      title: "جدول ردود الأفعال",
      columns: [
        { id: "item", label: "العنصر" },
        { id: "value", label: "القيمة" },
        { id: "unit", label: "الوحدة" },
      ],
      rows: [
        { id: "load", label: "P", cells: { item: "الحمل المركز", value: 12, unit: "kN" } },
        { id: "ra", label: "RA", cells: { item: "رد الفعل عند A", value: null, unit: "kN" } },
        { id: "rb", label: "RB", cells: { item: "رد الفعل عند B", value: null, unit: "kN" } },
      ],
    },
    diagram: {
      title: "مخطط الجائزة البسيطة",
      description: "سمّ المساند والحمل قبل حل التوازن.",
      targets: [
        { id: "support-a", label: "1", x: 20, y: 70, expectedLabel: "مسند A", acceptedLabels: ["A"] },
        { id: "point-load", label: "2", x: 50, y: 36, expectedLabel: "حمل مركز", acceptedLabels: ["P"] },
        { id: "support-b", label: "3", x: 80, y: 70, expectedLabel: "مسند B", acceptedLabels: ["B"] },
      ],
    },
    measurements: [
      { id: "reaction-a", label: "رد الفعل RA", unitHint: "kN" },
      { id: "reaction-b", label: "رد الفعل RB", unitHint: "kN" },
    ],
    expectedCells: [
      { rowId: "ra", columnId: "value", expectedValue: 6, tolerance: 0.2, acceptedText: ["6 kN"] },
      { rowId: "rb", columnId: "value", expectedValue: 6, tolerance: 0.2, acceptedText: ["6 kN"] },
    ],
    expectedMeasurements: [
      { id: "reaction-a", expected: { value: 6, unit: "kN" }, tolerance: 0.2 },
      { id: "reaction-b", expected: { value: 6, unit: "kN" }, tolerance: 0.2 },
    ],
    observationItems: [
      {
        id: "symmetry",
        label: "الحمل في المنتصف يجعل ردَي الفعل متساويين.",
        detail: "التناظر يختصر التوازن.",
        kind: "model",
      },
      {
        id: "vertical-equilibrium",
        label: "من ΣFy=0 نحصل على RA+RB=12 kN.",
        detail: "توازن القوى العمودية.",
        kind: "equilibrium",
      },
      {
        id: "reaction-six",
        label: "إذن RA=RB=6 kN.",
        detail: "تقسيم الحمل بالتساوي بين المسندين.",
        kind: "calculation",
      },
      {
        id: "one-support-takes-all",
        label: "المسند A يحمل كامل P لأن الجائزة تبدأ منه.",
        detail: "اختيار مضلل: الحمل متمركز والجائزة متناظرة.",
        kind: "distractor",
      },
    ],
    prompt: {
      title: "احسب ردود الأفعال لجائزة بسيطة.",
      task: "سمّ عناصر الجائزة، أكمل RA وRB، ثم اكتب خلاصة التوازن.",
      requiredObservationIds: ["symmetry", "vertical-equilibrium", "reaction-six"],
      requiredConclusionKeywords: ["ΣFy", "RA", "RB", "6", "kN"],
      scaffoldPhrases: [
        "بسبب التناظر يكون RA=RB.",
        "من توازن القوى العمودية: RA+RB=P=12 kN.",
        "إذن RA=RB=6 kN.",
      ],
    },
  },
  {
    id: "cantilever-uniform-load-bending",
    title: "جائزة كابولية وحمل موزع",
    subtitle: "حساب القص الأعظمي والعزم الأعظمي عند التثبيت.",
    bacContext:
      "في تمارين المقاومة يطلب من الطالب قراءة حمل موزع على كابولي ثم استنتاج Vmax وMmax عند التثبيت.",
    sourceHint:
      "مبني على نمط جائزة كابولية طولها L تحت حمل منتظم q حيث Vmax=qL وMmax=qL²/2.",
    instrument: {
      subjectLabel: "Civil Tech Lab",
      title: "تحليل الجوائز",
      iconKind: "technical",
    },
    sourceDocuments: [
      {
        id: "cantilever-data",
        title: "معطيات المقاومة",
        bullets: [
          "جائزة كابولية طولها L=4 m مثبتة عند A.",
          "حمل موزع منتظم q=3 kN/m على كامل الطول.",
          "أكبر قص وعزم يظهران عند التثبيت.",
        ],
      },
    ],
    table: {
      title: "قيم القص والعزم",
      columns: [
        { id: "item", label: "العنصر" },
        { id: "value", label: "القيمة" },
        { id: "unit", label: "الوحدة" },
      ],
      rows: [
        { id: "q", label: "q", cells: { item: "الحمل الموزع", value: 3, unit: "kN/m" } },
        { id: "vmax", label: "Vmax", cells: { item: "القص الأعظمي", value: null, unit: "kN" } },
        { id: "mmax", label: "Mmax", cells: { item: "العزم الأعظمي", value: null, unit: "kN.m" } },
      ],
    },
    diagram: {
      title: "جائزة كابولية",
      description: "حدد التثبيت والحمل الموزع ومقطع العزم الأعظمي.",
      targets: [
        { id: "fixed-support", label: "1", x: 18, y: 62, expectedLabel: "تثبيت", acceptedLabels: ["encastrement", "A"] },
        { id: "uniform-load", label: "2", x: 52, y: 34, expectedLabel: "حمل موزع", acceptedLabels: ["q"] },
        { id: "free-end", label: "3", x: 84, y: 62, expectedLabel: "طرف حر", acceptedLabels: ["B"] },
      ],
    },
    measurements: [
      { id: "max-shear", label: "Vmax", unitHint: "kN" },
      { id: "max-moment", label: "Mmax", unitHint: "kN.m" },
    ],
    expectedCells: [
      { rowId: "vmax", columnId: "value", expectedValue: 12, tolerance: 0.4, acceptedText: ["12 kN"] },
      { rowId: "mmax", columnId: "value", expectedValue: 24, tolerance: 0.8, acceptedText: ["24 kN.m"] },
    ],
    expectedMeasurements: [
      { id: "max-shear", expected: { value: 12, unit: "kN" }, tolerance: 0.4 },
      {
        id: "max-moment",
        expected: { value: 24, unit: "kN.m" },
        tolerance: 0.8,
        acceptedUnits: ["kN.m", "kN⋅m"],
      },
    ],
    observationItems: [
      {
        id: "fixed-end-max",
        label: "في الكابولي تظهر القيم العظمى عند التثبيت.",
        detail: "التثبيت يقاوم القص والعزم.",
        kind: "mechanics",
      },
      {
        id: "shear-q-l",
        label: "القص الأعظمي يساوي qL=3×4=12 kN.",
        detail: "محصلة الحمل الموزع.",
        kind: "calculation",
      },
      {
        id: "moment-q-l2",
        label: "العزم الأعظمي يساوي qL²/2=24 kN.m.",
        detail: "محصلة الحمل تؤثر عند L/2.",
        kind: "calculation",
      },
      {
        id: "max-at-free-end",
        label: "العزم الأعظمي عند الطرف الحر.",
        detail: "اختيار مضلل: عند الطرف الحر العزم معدوم.",
        kind: "distractor",
      },
    ],
    prompt: {
      title: "احسب Vmax وMmax لجائزة كابولية.",
      task: "سمّ الرسم، أكمل الجدول، اكتب القياسات بوحداتها، ثم استنتج مكان الخطر.",
      requiredObservationIds: ["fixed-end-max", "shear-q-l", "moment-q-l2"],
      requiredConclusionKeywords: ["qL", "Vmax", "Mmax", "تثبيت"],
      scaffoldPhrases: [
        "محصلة الحمل الموزع هي qL=12 kN.",
        "إذن Vmax=12 kN عند التثبيت.",
        "العزم الأعظمي Mmax=qL²/2=24 kN.m عند التثبيت.",
      ],
    },
  },
];

export function getCivilBeamStaticsWorkbenchPreset(value: unknown) {
  return getStructuredLabWorkbenchPreset(value, civilBeamStaticsWorkbenchPresets[0]);
}
