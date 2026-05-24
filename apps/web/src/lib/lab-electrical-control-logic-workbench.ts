import type { StructuredLabWorkbenchPreset } from "@bac-bank/contracts/lab";
import { getStructuredLabWorkbenchPreset } from "@/lib/lab-structured-workbench";

export const electricalControlLogicWorkbenchPresets: StructuredLabWorkbenchPreset[] = [
  {
    id: "motor-safety-truth-table",
    title: "جدول صدق لدارة تشغيل محرك",
    subtitle: "إكمال خرج منطقي مع شرط تشغيل وحماية.",
    bacContext:
      "في التكنولوجيا الكهربائية يطلب BAC إكمال جدول صدق أو معادلة منطقية لنظام تحكم مع شروط أمن وتشغيل.",
    sourceHint:
      "مستند إلى منطق تشغيل محرك: زر تشغيل M، حساس أمان S، والخرج KM.",
    instrument: {
      subjectLabel: "Electrical Tech Lab",
      title: "ورشة التحكم والمنطق",
      iconKind: "technical",
    },
    sourceDocuments: [
      {
        id: "logic-spec",
        title: "مواصفة التحكم",
        bullets: [
          "يعمل المحرك إذا كان أمر التشغيل M=1.",
          "يجب أن يكون شرط الأمان S=1.",
          "خرج الكونتاكتور KM يحقق KM=M.S.",
        ],
      },
    ],
    table: {
      title: "جدول الصدق",
      columns: [
        { id: "m", label: "M" },
        { id: "s", label: "S" },
        { id: "km", label: "KM" },
      ],
      rows: [
        { id: "00", label: "0 0", cells: { m: 0, s: 0, km: null } },
        { id: "01", label: "0 1", cells: { m: 0, s: 1, km: null } },
        { id: "10", label: "1 0", cells: { m: 1, s: 0, km: null } },
        { id: "11", label: "1 1", cells: { m: 1, s: 1, km: null } },
      ],
    },
    diagram: {
      title: "سلسلة تحكم منطقية",
      description: "سمّ المداخل والخرج في منطق التشغيل.",
      targets: [
        { id: "start-input", label: "1", x: 24, y: 44, expectedLabel: "M", acceptedLabels: ["تشغيل"] },
        { id: "safety-input", label: "2", x: 24, y: 66, expectedLabel: "S", acceptedLabels: ["أمان"] },
        { id: "output", label: "3", x: 76, y: 54, expectedLabel: "KM", acceptedLabels: ["كونتاكتور"] },
      ],
    },
    expectedCells: [
      { rowId: "00", columnId: "km", expectedValue: 0 },
      { rowId: "01", columnId: "km", expectedValue: 0 },
      { rowId: "10", columnId: "km", expectedValue: 0 },
      { rowId: "11", columnId: "km", expectedValue: 1 },
    ],
    observationItems: [
      {
        id: "and-gate",
        label: "العلاقة KM=M.S هي علاقة AND.",
        detail: "يلزم تحقق الشرطين معا.",
        kind: "logic",
      },
      {
        id: "safety-blocks",
        label: "إذا كان S=0 يبقى KM=0 مهما كان M.",
        detail: "شرط الأمان يمنع التشغيل.",
        kind: "safety",
      },
      {
        id: "only-11-on",
        label: "الحالة الوحيدة التي تشغل KM هي M=1 وS=1.",
        detail: "هذه قراءة جدول الصدق.",
        kind: "table",
      },
      {
        id: "or-gate",
        label: "KM=1 إذا تحقق M أو S فقط.",
        detail: "اختيار مضلل: هذه علاقة OR وليست AND.",
        kind: "distractor",
      },
    ],
    prompt: {
      title: "أكمل جدول صدق تشغيل المحرك.",
      task: "سمّ المداخل والخرج، أكمل KM، ثم اكتب خلاصة المعادلة المنطقية.",
      requiredObservationIds: ["and-gate", "safety-blocks", "only-11-on"],
      requiredConclusionKeywords: ["KM", "M.S", "AND", "أمان"],
      scaffoldPhrases: [
        "خرج الكونتاكتور يحقق العلاقة KM=M.S.",
        "إذا غاب شرط الأمان S يكون الخرج 0.",
        "إذن لا يعمل المحرك إلا في الحالة M=1 وS=1.",
      ],
    },
  },
  {
    id: "grafcet-fill-transitions",
    title: "GRAFCET لنظام دفع أسطوانة",
    subtitle: "إكمال خطوات وانتقالات تسلسل أوتوماتيكي بسيط.",
    bacContext:
      "في GRAFCET يطلب BAC تحديد الخطوة الابتدائية، الأفعال، وشروط الانتقال بين المراحل.",
    sourceHint:
      "مستند إلى تسلسل أسطوانة: خروج عند أمر البدء، انتظار نهاية المشوار، ثم رجوع.",
    instrument: {
      subjectLabel: "Electrical Tech Lab",
      title: "ورشة التحكم والمنطق",
      iconKind: "technical",
    },
    sourceDocuments: [
      {
        id: "grafcet-spec",
        title: "مواصفة GRAFCET",
        bullets: [
          "الخطوة 0: انتظار أمر البدء dcy.",
          "الخطوة 1: خروج الأسطوانة A+ حتى الحساس a1.",
          "الخطوة 2: رجوع الأسطوانة A- حتى الحساس a0.",
        ],
      },
    ],
    table: {
      title: "ملف GRAFCET",
      columns: [
        { id: "step", label: "الخطوة" },
        { id: "action", label: "الفعل" },
        { id: "transition", label: "شرط الانتقال" },
      ],
      rows: [
        { id: "s0", label: "0", cells: { step: "0", action: null, transition: null } },
        { id: "s1", label: "1", cells: { step: "1", action: null, transition: null } },
        { id: "s2", label: "2", cells: { step: "2", action: null, transition: null } },
      ],
    },
    diagram: {
      title: "هيكل GRAFCET",
      description: "سمّ الخطوة الابتدائية والانتقالات الأساسية.",
      targets: [
        { id: "initial-step", label: "1", x: 48, y: 24, expectedLabel: "خطوة ابتدائية", acceptedLabels: ["0"] },
        { id: "transition-dcy", label: "2", x: 48, y: 40, expectedLabel: "dcy", acceptedLabels: ["بدء"] },
        { id: "action-a-plus", label: "3", x: 66, y: 56, expectedLabel: "A+", acceptedLabels: ["خروج"] },
        { id: "action-a-minus", label: "4", x: 66, y: 78, expectedLabel: "A-", acceptedLabels: ["رجوع"] },
      ],
    },
    expectedCells: [
      { rowId: "s0", columnId: "action", expectedValue: "انتظار", acceptedText: ["repos", "لا فعل"] },
      { rowId: "s0", columnId: "transition", expectedValue: "dcy", acceptedText: ["بدء"] },
      { rowId: "s1", columnId: "action", expectedValue: "A+", acceptedText: ["خروج"] },
      { rowId: "s1", columnId: "transition", expectedValue: "a1", acceptedText: ["نهاية الخروج"] },
      { rowId: "s2", columnId: "action", expectedValue: "A-", acceptedText: ["رجوع"] },
      { rowId: "s2", columnId: "transition", expectedValue: "a0", acceptedText: ["نهاية الرجوع"] },
    ],
    observationItems: [
      {
        id: "initial-waits",
        label: "الخطوة 0 تنتظر أمر البدء dcy.",
        detail: "هي حالة الراحة أو الاستعداد.",
        kind: "sequence",
      },
      {
        id: "a-plus-until-a1",
        label: "الفعل A+ يستمر حتى تحقق الحساس a1.",
        detail: "a1 شرط نهاية الخروج.",
        kind: "transition",
      },
      {
        id: "a-minus-until-a0",
        label: "الفعل A- يعيد الأسطوانة حتى a0.",
        detail: "a0 شرط نهاية الرجوع.",
        kind: "transition",
      },
      {
        id: "return-before-extend",
        label: "يجب تنفيذ A- قبل A+ مباشرة بعد dcy.",
        detail: "اختيار مضلل: التسلسل يبدأ بالخروج.",
        kind: "distractor",
      },
    ],
    prompt: {
      title: "أكمل GRAFCET أسطوانة بسيطة.",
      task: "أكمل أفعال الخطوات وشروط الانتقال، ثم اكتب خلاصة التسلسل.",
      requiredObservationIds: [
        "initial-waits",
        "a-plus-until-a1",
        "a-minus-until-a0",
      ],
      requiredConclusionKeywords: ["dcy", "A+", "a1", "A-", "a0"],
      scaffoldPhrases: [
        "من الخطوة 0 ننتظر dcy.",
        "ثم تنفذ الخطوة 1 الفعل A+ حتى a1.",
        "بعدها تنفذ الخطوة 2 الفعل A- حتى a0.",
      ],
    },
  },
];

export function getElectricalControlLogicWorkbenchPreset(value: unknown) {
  return getStructuredLabWorkbenchPreset(
    value,
    electricalControlLogicWorkbenchPresets[0],
  );
}
