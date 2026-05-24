import type { StructuredLabWorkbenchPreset } from "@bac-bank/contracts/lab";
import { getStructuredLabWorkbenchPreset } from "@/lib/lab-structured-workbench";

export const mechanicalMechanismKinematicsWorkbenchPresets: StructuredLabWorkbenchPreset[] =
  [
    {
      id: "gear-reducer-speed-ratio",
      title: "ناقل حركة بالتروس",
      subtitle: "قراءة زوج تروس وحساب سرعة الخرج ونسبة التخفيض.",
      bacContext:
        "تتكرر في BAC أسئلة قراءة آلية نقل الحركة: تحديد العضو القائد والمقاد، اتجاه الدوران، وحساب السرعة أو النسبة.",
      sourceHint:
        "مستند إلى ملفات المحرك-المخفض وأسئلة transmission de mouvement.",
      instrument: {
        subjectLabel: "Mechanical Tech Lab",
        title: "ورشة الآليات والحركيات",
        iconKind: "technical",
      },
      sourceDocuments: [
        {
          id: "gear-data",
          title: "معطيات زوج تروس",
          bullets: [
            "الترس القائد Z1=20 سن ويدور بسرعة n1=1200 tr/min.",
            "الترس المقاد Z2=60 سن.",
            "في تعشيق خارجي يكون اتجاه دوران الخرج معاكس لاتجاه القائد.",
          ],
        },
      ],
      table: {
        title: "جدول قراءة النقل",
        columns: [
          { id: "item", label: "العنصر" },
          { id: "value", label: "القيمة" },
          { id: "unit", label: "الوحدة/الدلالة" },
        ],
        rows: [
          { id: "z1", label: "Z1", cells: { item: "القائد", value: 20, unit: "سن" } },
          { id: "z2", label: "Z2", cells: { item: "المقاد", value: 60, unit: "سن" } },
          { id: "ratio", label: "r", cells: { item: "النسبة", value: null, unit: null } },
          { id: "n2", label: "n2", cells: { item: "سرعة الخرج", value: null, unit: "tr/min" } },
          { id: "direction", label: "اتجاه", cells: { item: "اتجاه الخرج", value: null, unit: null } },
        ],
      },
      diagram: {
        title: "زوج تروس خارجي",
        description: "سمّ القائد والمقاد وحدد اتجاه الخرج.",
        targets: [
          { id: "driver", label: "1", x: 34, y: 48, expectedLabel: "ترس قائد", acceptedLabels: ["Z1", "قائد"] },
          { id: "driven", label: "2", x: 62, y: 48, expectedLabel: "ترس مقاد", acceptedLabels: ["Z2", "مقاد"] },
          { id: "input-speed", label: "3", x: 25, y: 28, expectedLabel: "n1", acceptedLabels: ["1200"] },
          { id: "opposite-direction", label: "4", x: 74, y: 28, expectedLabel: "اتجاه معاكس", acceptedLabels: ["معاكس"] },
        ],
      },
      measurements: [
        { id: "output-speed", label: "سرعة الخرج n2", unitHint: "tr/min" },
      ],
      expectedCells: [
        { rowId: "ratio", columnId: "value", expectedValue: 0.33, tolerance: 0.02, acceptedText: ["1/3"] },
        { rowId: "ratio", columnId: "unit", expectedValue: "تخفيض", acceptedText: ["reduction"] },
        { rowId: "n2", columnId: "value", expectedValue: 400, tolerance: 5, acceptedText: ["400 tr/min"] },
        { rowId: "direction", columnId: "value", expectedValue: "معاكس", acceptedText: ["opposé"] },
      ],
      expectedMeasurements: [
        {
          id: "output-speed",
          expected: { value: 400, unit: "tr/min" },
          tolerance: 5,
          acceptedUnits: ["rpm"],
        },
      ],
      observationItems: [
        {
          id: "ratio-z1-over-z2",
          label: "في زوج تروس خارجي n2=n1×Z1/Z2.",
          detail: "السرعة تتناسب عكسيا مع عدد الأسنان.",
          kind: "formula",
        },
        {
          id: "speed-reduced",
          label: "لأن Z2 أكبر من Z1 فالسرعة تنخفض.",
          detail: "20/60=1/3.",
          kind: "trend",
        },
        {
          id: "external-gears-opposite",
          label: "التعشيق الخارجي يعكس اتجاه الدوران.",
          detail: "كل زوج خارجي يغير الاتجاه مرة واحدة.",
          kind: "direction",
        },
        {
          id: "bigger-gear-faster",
          label: "الترس الأكبر يدور أسرع من الأصغر.",
          detail: "اختيار مضلل: في التعشيق تكون سرعته أقل.",
          kind: "distractor",
        },
      ],
      prompt: {
        title: "احسب سرعة الخرج في مخفض تروس.",
        task: "سمّ القائد والمقاد، أكمل النسبة والاتجاه، ثم احسب n2.",
        requiredObservationIds: [
          "ratio-z1-over-z2",
          "speed-reduced",
          "external-gears-opposite",
        ],
        requiredConclusionKeywords: ["Z1", "Z2", "400", "معاكس"],
        scaffoldPhrases: [
          "نطبق n2=n1×Z1/Z2.",
          "n2=1200×20/60=400 tr/min.",
          "اتجاه الخرج معاكس بسبب التعشيق الخارجي.",
        ],
      },
    },
    {
      id: "rack-pinion-motion-conversion",
      title: "تحويل حركة بترس وجريدة مسننة",
      subtitle: "تحويل الدوران إلى انتقال وحساب الإزاحة.",
      bacContext:
        "أسئلة الآليات تطلب تمييز نوع الحركة ثم حساب إزاحة أو سرعة خطية من حركة دورانية.",
      sourceHint:
        "مستند إلى آليات pignon-crémaillère وتحويل الحركة في الهندسة الميكانيكية.",
      instrument: {
        subjectLabel: "Mechanical Tech Lab",
        title: "ورشة الآليات والحركيات",
        iconKind: "technical",
      },
      sourceDocuments: [
        {
          id: "rack-data",
          title: "معطيات آلية جريدة مسننة",
          bullets: [
            "قطر دائرة الخطوة للترس d=40 mm.",
            "يدور الترس دورتين كاملتين.",
            "إزاحة الجريدة تساوي محيط دائرة الخطوة مضروبا في عدد الدورات.",
          ],
        },
      ],
      table: {
        title: "جدول تحويل الحركة",
        columns: [
          { id: "item", label: "العنصر" },
          { id: "answer", label: "الإجابة" },
          { id: "unit", label: "الوحدة/الدلالة" },
        ],
        rows: [
          { id: "input", label: "الدخل", cells: { item: "حركة الدخل", answer: null, unit: null } },
          { id: "output", label: "الخرج", cells: { item: "حركة الخرج", answer: null, unit: null } },
          { id: "law", label: "العلاقة", cells: { item: "الإزاحة", answer: null, unit: null } },
          { id: "displacement", label: "L", cells: { item: "قيمة الإزاحة", answer: null, unit: "mm" } },
        ],
      },
      diagram: {
        title: "ترس وجريدة مسننة",
        description: "سمّ العضوين واتجاه الحركة الناتجة.",
        targets: [
          { id: "pinion", label: "1", x: 42, y: 44, expectedLabel: "ترس", acceptedLabels: ["pignon"] },
          { id: "rack", label: "2", x: 60, y: 64, expectedLabel: "جريدة", acceptedLabels: ["crémaillère", "cremaillere"] },
          { id: "rotation", label: "3", x: 33, y: 28, expectedLabel: "دوران", acceptedLabels: ["rotation"] },
          { id: "translation", label: "4", x: 72, y: 64, expectedLabel: "انتقال", acceptedLabels: ["translation"] },
        ],
      },
      measurements: [
        { id: "rack-displacement", label: "إزاحة الجريدة L", unitHint: "mm" },
      ],
      expectedCells: [
        { rowId: "input", columnId: "answer", expectedValue: "دوران", acceptedText: ["rotation"] },
        { rowId: "output", columnId: "answer", expectedValue: "انتقال", acceptedText: ["translation"] },
        { rowId: "law", columnId: "answer", expectedValue: "L=πdn", acceptedText: ["pi*d*n", "محيط"] },
        { rowId: "displacement", columnId: "answer", expectedValue: 251, tolerance: 4, acceptedText: ["251 mm"] },
      ],
      expectedMeasurements: [
        {
          id: "rack-displacement",
          expected: { value: 251, unit: "mm" },
          tolerance: 4,
          acceptedUnits: ["millimeter", "millimetre"],
        },
      ],
      observationItems: [
        {
          id: "rotation-to-translation",
          label: "الترس والجريدة يحولان الدوران إلى انتقال.",
          detail: "الترس يدور والجريدة تتحرك خطيا.",
          kind: "motion",
        },
        {
          id: "displacement-per-turn",
          label: "كل دورة تعطي إزاحة تساوي محيط دائرة الخطوة πd.",
          detail: "d=40 mm، إذن دورة واحدة تقريبا 126 mm.",
          kind: "formula",
        },
        {
          id: "two-turns-double",
          label: "دورتان تضاعفان الإزاحة إلى حوالي 251 mm.",
          detail: "L=π×40×2.",
          kind: "calculation",
        },
        {
          id: "rack-rotates",
          label: "الجريدة تدور حول محورها مثل الترس.",
          detail: "اختيار مضلل: الجريدة تتحرك انتقاليا.",
          kind: "distractor",
        },
      ],
      prompt: {
        title: "حلل تحويل الحركة بترس وجريدة.",
        task: "حدد نوع حركة الدخل والخرج، أكمل العلاقة، ثم احسب إزاحة الجريدة.",
        requiredObservationIds: [
          "rotation-to-translation",
          "displacement-per-turn",
          "two-turns-double",
        ],
        requiredConclusionKeywords: ["دوران", "انتقال", "251", "mm"],
        scaffoldPhrases: [
          "الدخل هو دوران الترس.",
          "الخرج انتقال الجريدة.",
          "L=π×40×2≈251 mm.",
        ],
      },
    },
  ];

export function getMechanicalMechanismKinematicsWorkbenchPreset(value: unknown) {
  return getStructuredLabWorkbenchPreset(
    value,
    mechanicalMechanismKinematicsWorkbenchPresets[0],
  );
}
