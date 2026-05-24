import type { StructuredLabWorkbenchPreset } from "@bac-bank/contracts/lab";
import { getStructuredLabWorkbenchPreset } from "@/lib/lab-structured-workbench";

export const electricalCircuitsChronogramsWorkbenchPresets: StructuredLabWorkbenchPreset[] = [
  {
    id: "relay-control-circuit-reading",
    title: "قراءة دارة تحكم بمرحل",
    subtitle: "تسمية عناصر الدارة واستنتاج حالة المصباح من تلامس NO.",
    bacContext:
      "في ملفات التكنولوجيا الكهربائية يطلب BAC قراءة مخطط تحكم، التعرف على المرحل والتلامسات، ثم استنتاج حالة المشغل.",
    sourceHint:
      "مستند إلى دارات مرحل: ملف KA، تلامس مفتوح NO، مصباح H، وأمر تشغيل S.",
    instrument: {
      subjectLabel: "Electrical Tech Lab",
      title: "ورشة الدارات والكرونوغرامات",
      iconKind: "technical",
    },
    sourceDocuments: [
      {
        id: "relay-spec",
        title: "مبدأ العمل",
        bullets: [
          "عند ضغط S يتغذى ملف المرحل KA.",
          "يغلق التلامس KA المفتوح عادة NO.",
          "عند غلق التلامس يضيء المصباح H.",
        ],
      },
    ],
    table: {
      title: "حالات الدارة",
      columns: [
        { id: "s", label: "S" },
        { id: "ka", label: "KA" },
        { id: "h", label: "H" },
      ],
      rows: [
        { id: "open", label: "S=0", cells: { s: 0, ka: null, h: null } },
        { id: "closed", label: "S=1", cells: { s: 1, ka: null, h: null } },
      ],
    },
    diagram: {
      title: "دارة تحكم بمرحل",
      description: "سمّ عناصر المخطط قبل ملء جدول الحالات.",
      targets: [
        { id: "switch", label: "1", x: 22, y: 44, expectedLabel: "زر S", acceptedLabels: ["S"] },
        { id: "coil", label: "2", x: 46, y: 50, expectedLabel: "ملف KA", acceptedLabels: ["KA"] },
        { id: "contact", label: "3", x: 64, y: 38, expectedLabel: "تلامس NO", acceptedLabels: ["NO"] },
        { id: "lamp", label: "4", x: 82, y: 58, expectedLabel: "مصباح H", acceptedLabels: ["H"] },
      ],
    },
    expectedCells: [
      { rowId: "open", columnId: "ka", expectedValue: 0 },
      { rowId: "open", columnId: "h", expectedValue: 0 },
      { rowId: "closed", columnId: "ka", expectedValue: 1 },
      { rowId: "closed", columnId: "h", expectedValue: 1 },
    ],
    observationItems: [
      {
        id: "s-energizes-coil",
        label: "عند S=1 يتغذى ملف المرحل KA.",
        detail: "الملف يحول الأمر الكهربائي إلى تبديل تلامس.",
        kind: "circuit",
      },
      {
        id: "no-contact-closes",
        label: "التلامس NO يغلق عندما يتغذى KA.",
        detail: "NO يعني مفتوح في حالة الراحة.",
        kind: "contact",
      },
      {
        id: "lamp-on-when-contact-closed",
        label: "يضيء H عندما يغلق تلامس KA.",
        detail: "هذا يربط دارة التحكم بدارة الإشارة.",
        kind: "state",
      },
      {
        id: "no-closed-at-rest",
        label: "تلامس NO يكون مغلقا في حالة الراحة.",
        detail: "اختيار مضلل: NO مفتوح عادة.",
        kind: "distractor",
      },
    ],
    prompt: {
      title: "اقرأ دارة المرحل واستنتج الحالات.",
      task: "سمّ عناصر الدارة، أكمل KA وH في الجدول، ثم اكتب خلاصة عمل التلامس NO.",
      requiredObservationIds: [
        "s-energizes-coil",
        "no-contact-closes",
        "lamp-on-when-contact-closed",
      ],
      requiredConclusionKeywords: ["S", "KA", "NO", "H"],
      scaffoldPhrases: [
        "عند ضغط S يتغذى ملف المرحل KA.",
        "يغلق التلامس NO المرتبط بالمرحل.",
        "عندئذ يضيء المصباح H.",
      ],
    },
  },
  {
    id: "timer-chronogram-output",
    title: "كرونوغرام مؤقت تشغيل",
    subtitle: "إكمال خرج مؤقت TON من إشارة دخل متغيرة.",
    bacContext:
      "في الكرونوغرامات يقرأ الطالب إشارات زمنية للدخل والمخرج، خصوصا المؤقتات TON/TOF داخل التحكم الآلي.",
    sourceHint:
      "مستند إلى مؤقت TON بزمن ضبط 2 s: يتأخر الخرج بعد ثبات الدخل ثم ينطفئ عند سقوطه.",
    instrument: {
      subjectLabel: "Electrical Tech Lab",
      title: "ورشة الدارات والكرونوغرامات",
      iconKind: "technical",
    },
    sourceDocuments: [
      {
        id: "timer-spec",
        title: "مواصفة المؤقت TON",
        bullets: [
          "زمن الضبط T=2 s.",
          "إذا بقي الدخل I=1 لمدة 2 s يصبح الخرج Q=1.",
          "عند سقوط I يعود Q إلى 0 مباشرة.",
        ],
      },
    ],
    table: {
      title: "جدول الكرونوغرام",
      columns: [
        { id: "interval", label: "المجال الزمني" },
        { id: "i", label: "I" },
        { id: "q", label: "Q" },
      ],
      rows: [
        { id: "0-1", label: "0-1s", cells: { interval: "0-1", i: 0, q: null } },
        { id: "1-3", label: "1-3s", cells: { interval: "1-3", i: 1, q: null } },
        { id: "3-5", label: "3-5s", cells: { interval: "3-5", i: 1, q: null } },
        { id: "5-6", label: "5-6s", cells: { interval: "5-6", i: 0, q: null } },
      ],
    },
    graph: {
      title: "إشارة الدخل I",
      xAxis: { label: "t", unit: "s", min: 0, max: 6 },
      yAxis: { label: "I", min: 0, max: 1 },
      series: [
        {
          id: "input",
          title: "I(t)",
          kind: "line",
          points: [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
            { x: 5, y: 1 },
            { x: 6, y: 0 },
          ],
        },
      ],
    },
    expectedCells: [
      { rowId: "0-1", columnId: "q", expectedValue: 0 },
      { rowId: "1-3", columnId: "q", expectedValue: 0 },
      { rowId: "3-5", columnId: "q", expectedValue: 1 },
      { rowId: "5-6", columnId: "q", expectedValue: 0 },
    ],
    observationItems: [
      {
        id: "ton-delay",
        label: "TON لا يرفع Q إلا بعد مرور زمن الضبط.",
        detail: "الخروج يتأخر بعد ارتفاع الدخل.",
        kind: "timer",
      },
      {
        id: "q-on-after-3",
        label: "بما أن I ارتفع عند 1s وT=2s يصبح Q=1 عند 3s.",
        detail: "1+2=3s.",
        kind: "chronogram",
      },
      {
        id: "q-off-immediate",
        label: "عند سقوط I في 5s يعود Q إلى 0 مباشرة.",
        detail: "هذا سلوك TON عند فقدان الدخل.",
        kind: "state",
      },
      {
        id: "q-on-immediate",
        label: "Q يصبح 1 مباشرة عند t=1s.",
        detail: "اختيار مضلل: يوجد تأخر 2s.",
        kind: "distractor",
      },
    ],
    prompt: {
      title: "أكمل كرونوغرام خرج TON.",
      task: "املأ Q في المجالات الزمنية، اختر قواعد القراءة الصحيحة، ثم اكتب خلاصة عن التأخر.",
      requiredObservationIds: ["ton-delay", "q-on-after-3", "q-off-immediate"],
      requiredConclusionKeywords: ["TON", "2s", "3s", "Q"],
      scaffoldPhrases: [
        "الدخل I يرتفع عند 1s ويبقى 1.",
        "بعد تأخر 2s يصبح Q=1 عند 3s.",
        "عند سقوط I في 5s يعود Q إلى 0.",
      ],
    },
  },
];

export function getElectricalCircuitsChronogramsWorkbenchPreset(value: unknown) {
  return getStructuredLabWorkbenchPreset(
    value,
    electricalCircuitsChronogramsWorkbenchPresets[0],
  );
}
