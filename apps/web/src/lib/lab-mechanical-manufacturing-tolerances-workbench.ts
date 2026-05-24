import type { StructuredLabWorkbenchPreset } from "@bac-bank/contracts/lab";
import { getStructuredLabWorkbenchPreset } from "@/lib/lab-structured-workbench";

export const mechanicalManufacturingTolerancesWorkbenchPresets: StructuredLabWorkbenchPreset[] =
  [
    {
      id: "shaft-machining-process-sheet",
      title: "ورقة تحضير تصنيع محور",
      subtitle: "ترتيب العمليات واختيار الآلة والأداة والمراقبة.",
      bacContext:
        "في دراسة التحضير يملأ طالب BAC جدول وسائل الصنع: المادة، الخام، الآلة، أدوات القطع، وأدوات المراقبة لسطوح محددة.",
      sourceHint:
        "مستند إلى ملفات 2022: محور توجيه من 35C وقطر خام Ø37 mm.",
      instrument: {
        subjectLabel: "Mechanical Tech Lab",
        title: "ورشة التصنيع والتسامحات",
        iconKind: "technical",
      },
      sourceDocuments: [
        {
          id: "process-brief",
          title: "مقتطف من بطاقة التحضير",
          bullets: [
            "القطعة: محور توجيه مصنوع من فولاذ 35C.",
            "الخام: قضيب دائري Ø37 mm.",
            "السطحان 7 و8 أسطوانيان ويشغلان على المخرطة.",
            "المراقبة النهائية للقطر تتم بميكرومتر.",
          ],
        },
      ],
      table: {
        title: "جدول وسائل الصنع",
        columns: [
          { id: "surface", label: "السطح" },
          { id: "operation", label: "العملية" },
          { id: "machine", label: "الآلة" },
          { id: "tool", label: "الأداة" },
          { id: "control", label: "المراقبة" },
        ],
        rows: [
          {
            id: "end-face",
            label: "وجه",
            cells: {
              surface: "وجه البداية",
              operation: null,
              machine: null,
              tool: null,
              control: null,
            },
          },
          {
            id: "cylinder",
            label: "أسطوانة",
            cells: {
              surface: "سطح أسطواني",
              operation: null,
              machine: null,
              tool: null,
              control: null,
            },
          },
          {
            id: "groove",
            label: "مجرى",
            cells: {
              surface: "مجرى تثبيت",
              operation: null,
              machine: null,
              tool: null,
              control: null,
            },
          },
        ],
      },
      expectedCells: [
        {
          rowId: "end-face",
          columnId: "operation",
          expectedValue: "تسوية وجه",
          acceptedText: ["dressage"],
        },
        {
          rowId: "end-face",
          columnId: "machine",
          expectedValue: "مخرطة",
          acceptedText: ["tour"],
        },
        {
          rowId: "cylinder",
          columnId: "operation",
          expectedValue: "خراطة",
          acceptedText: ["chariotage"],
        },
        {
          rowId: "cylinder",
          columnId: "control",
          expectedValue: "ميكرومتر",
          acceptedText: ["micromètre", "micrometre"],
        },
        {
          rowId: "groove",
          columnId: "tool",
          expectedValue: "أداة مجرى",
          acceptedText: ["outil a gorge", "outil à gorge"],
        },
      ],
      observationItems: [
        {
          id: "shaft-on-lathe",
          label: "السطوح الأسطوانية للمحور تشغل على المخرطة.",
          detail: "الدوران حول محور القطعة يطابق الخراطة.",
          kind: "process",
        },
        {
          id: "diameter-control-micrometer",
          label: "القطر النهائي يراقب بميكرومتر.",
          detail: "الميكرومتر أنسب للدقة من المسطرة.",
          kind: "control",
        },
        {
          id: "operation-order-matters",
          label: "نبدأ بتسوية الوجه ثم الخراطة قبل المجرى.",
          detail: "التدرج يحافظ على المرجع وعلى شروط التشغيل.",
          kind: "sequence",
        },
        {
          id: "use-drill-for-cylinder",
          label: "تشغيل السطح الأسطواني الخارجي يتم بالمثقاب.",
          detail: "اختيار مضلل: المثقاب للثقوب، لا للخراطة الخارجية.",
          kind: "distractor",
        },
      ],
      prompt: {
        title: "أكمل ورقة تحضير تصنيع محور.",
        task: "املأ العمليات والآلة والأداة والمراقبة، ثم اكتب خلاصة اختيار وسائل الصنع.",
        requiredObservationIds: [
          "shaft-on-lathe",
          "diameter-control-micrometer",
          "operation-order-matters",
        ],
        requiredConclusionKeywords: ["مخرطة", "خراطة", "ميكرومتر"],
        scaffoldPhrases: [
          "المحور ذو سطوح أسطوانية لذلك نختار المخرطة.",
          "نراقب القطر النهائي بميكرومتر.",
          "نرتب العمليات من التسوية إلى الخراطة ثم المجرى.",
        ],
      },
    },
    {
      id: "fit-clearance-tolerance-check",
      title: "تحقق من تلاؤم H7/g6",
      subtitle: "حساب الخلوص الأدنى والأكبر من حدود الثقب والعمود.",
      bacContext:
        "تظهر التسامحات والملاءمات في الرسم التعريفي وتحضير التصنيع، ويطلب من الطالب تفسير نوع الملاءمة أو حساب الخلوص.",
      sourceHint:
        "مهمة V1 مبسطة لقراءة حدود ثقب 40H7 وعمود 40g6.",
      instrument: {
        subjectLabel: "Mechanical Tech Lab",
        title: "ورشة التصنيع والتسامحات",
        iconKind: "technical",
      },
      sourceDocuments: [
        {
          id: "fit-data",
          title: "حدود الملاءمة",
          bullets: [
            "الثقب 40H7: من 40.000 mm إلى 40.025 mm.",
            "العمود 40g6: من 39.975 mm إلى 39.991 mm.",
            "الخلوص الأدنى = أصغر ثقب - أكبر عمود.",
            "الخلوص الأكبر = أكبر ثقب - أصغر عمود.",
          ],
        },
      ],
      table: {
        title: "جدول التحقق من الملاءمة",
        columns: [
          { id: "item", label: "العنصر" },
          { id: "min", label: "الصغرى" },
          { id: "max", label: "الكبرى" },
          { id: "type", label: "الدلالة" },
        ],
        rows: [
          { id: "hole", label: "ثقب", cells: { item: "40H7", min: 40, max: 40.025, type: "ثقب" } },
          { id: "shaft", label: "عمود", cells: { item: "40g6", min: 39.975, max: 39.991, type: "عمود" } },
          { id: "clearance-min", label: "Jmin", cells: { item: "خلوص أدنى", min: null, max: null, type: null } },
          { id: "clearance-max", label: "Jmax", cells: { item: "خلوص أكبر", min: null, max: null, type: null } },
        ],
      },
      measurements: [
        { id: "min-clearance", label: "الخلوص الأدنى Jmin", unitHint: "mm" },
        { id: "max-clearance", label: "الخلوص الأكبر Jmax", unitHint: "mm" },
      ],
      expectedCells: [
        { rowId: "clearance-min", columnId: "min", expectedValue: 0.009, tolerance: 0.002, acceptedText: ["0.009 mm"] },
        { rowId: "clearance-min", columnId: "type", expectedValue: "خلوص", acceptedText: ["jeu"] },
        { rowId: "clearance-max", columnId: "max", expectedValue: 0.05, tolerance: 0.002, acceptedText: ["0.050 mm"] },
        { rowId: "clearance-max", columnId: "type", expectedValue: "خلوص", acceptedText: ["jeu"] },
      ],
      expectedMeasurements: [
        {
          id: "min-clearance",
          expected: { value: 0.009, unit: "mm" },
          tolerance: 0.002,
        },
        {
          id: "max-clearance",
          expected: { value: 0.05, unit: "mm" },
          tolerance: 0.002,
        },
      ],
      observationItems: [
        {
          id: "jmin-small-hole-big-shaft",
          label: "Jmin يحسب من أصغر ثقب وأكبر عمود.",
          detail: "40.000-39.991=0.009 mm.",
          kind: "tolerance",
        },
        {
          id: "jmax-big-hole-small-shaft",
          label: "Jmax يحسب من أكبر ثقب وأصغر عمود.",
          detail: "40.025-39.975=0.050 mm.",
          kind: "tolerance",
        },
        {
          id: "positive-clearance-fit",
          label: "بما أن الخلوصين موجبان فالملاءمة بخلوص.",
          detail: "لا يوجد تداخل في الحدود المعطاة.",
          kind: "fit",
        },
        {
          id: "negative-clearance",
          label: "النتائج تدل على ملاءمة بتداخل.",
          detail: "اختيار مضلل: القيم موجبة.",
          kind: "distractor",
        },
      ],
      prompt: {
        title: "تحقق من ملاءمة H7/g6.",
        task: "احسب Jmin وJmax، أكمل نوع الملاءمة، ثم اكتب خلاصة قصيرة.",
        requiredObservationIds: [
          "jmin-small-hole-big-shaft",
          "jmax-big-hole-small-shaft",
          "positive-clearance-fit",
        ],
        requiredConclusionKeywords: ["Jmin", "Jmax", "خلوص"],
        scaffoldPhrases: [
          "Jmin=40.000-39.991=0.009 mm.",
          "Jmax=40.025-39.975=0.050 mm.",
          "القيم موجبة إذن الملاءمة بخلوص.",
        ],
      },
    },
  ];

export function getMechanicalManufacturingTolerancesWorkbenchPreset(
  value: unknown,
) {
  return getStructuredLabWorkbenchPreset(
    value,
    mechanicalManufacturingTolerancesWorkbenchPresets[0],
  );
}
