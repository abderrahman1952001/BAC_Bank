import type { StructuredLabWorkbenchPreset } from "@bac-bank/contracts/lab";
import { getStructuredLabWorkbenchPreset } from "@/lib/lab-structured-workbench";

export const processFlowInstrumentationWorkbenchPresets: StructuredLabWorkbenchPreset[] =
  [
    {
      id: "distillation-flow-diagram-reading",
      title: "قراءة مخطط تقطير",
      subtitle: "تسمية التجهيزات والتيارات الأساسية في وحدة فصل.",
      bacContext:
        "تتضمن أوراق هندسة الطرائق مخططات أجهزة وفصل ومواد/أدوات، حيث يجب قراءة اتجاه الجريان ووظيفة كل جهاز.",
      sourceHint:
        "مهمة V1 مستوحاة من مخططات التجهيزات والفصل التي تبقى غالبا image-backed في الأوراق.",
      instrument: {
        subjectLabel: "Process Tech Lab",
        title: "ورشة الجريان والقياس",
        iconKind: "technical",
      },
      sourceDocuments: [
        {
          id: "distillation-note",
          title: "مبدأ وحدة تقطير",
          bullets: [
            "يدخل المزيج إلى العمود كتيار تغذية.",
            "المكثف يحول البخار العلوي إلى سائل مقطر.",
            "الغلاية/المسخن السفلي يعطي الحرارة ويخرج الراسب الثقيل.",
          ],
        },
      ],
      table: {
        title: "جدول تجهيزات وتيارات",
        columns: [
          { id: "tag", label: "الرمز" },
          { id: "name", label: "التسمية" },
          { id: "function", label: "الوظيفة" },
        ],
        rows: [
          { id: "c1", label: "C1", cells: { tag: "C1", name: null, function: null } },
          { id: "e1", label: "E1", cells: { tag: "E1", name: null, function: null } },
          { id: "b1", label: "B1", cells: { tag: "B1", name: null, function: null } },
          { id: "f", label: "F", cells: { tag: "F", name: null, function: null } },
        ],
      },
      diagram: {
        title: "PFD تقطير مبسط",
        description: "سمّ العمود، المكثف، المسخن، وتيار التغذية.",
        targets: [
          { id: "column", label: "1", x: 45, y: 48, expectedLabel: "عمود تقطير", acceptedLabels: ["colonne"] },
          { id: "condenser", label: "2", x: 70, y: 24, expectedLabel: "مكثف", acceptedLabels: ["condenseur"] },
          { id: "reboiler", label: "3", x: 66, y: 74, expectedLabel: "غلاية", acceptedLabels: ["rebouilleur", "مسخن"] },
          { id: "feed", label: "4", x: 24, y: 52, expectedLabel: "تغذية", acceptedLabels: ["feed", "alimentation"] },
        ],
      },
      expectedCells: [
        { rowId: "c1", columnId: "name", expectedValue: "عمود تقطير", acceptedText: ["colonne"] },
        { rowId: "c1", columnId: "function", expectedValue: "فصل", acceptedText: ["séparation", "separation"] },
        { rowId: "e1", columnId: "name", expectedValue: "مكثف", acceptedText: ["condenseur"] },
        { rowId: "b1", columnId: "name", expectedValue: "غلاية", acceptedText: ["rebouilleur", "مسخن"] },
        { rowId: "f", columnId: "name", expectedValue: "تغذية", acceptedText: ["alimentation"] },
      ],
      observationItems: [
        {
          id: "feed-enters-column",
          label: "تيار التغذية يدخل إلى العمود قبل الفصل.",
          detail: "هذا يحدد اتجاه قراءة المخطط.",
          kind: "flow",
        },
        {
          id: "top-vapor-condensed",
          label: "المكثف يحول بخار القمة إلى سائل.",
          detail: "وظيفته تبادل حراري في أعلى الوحدة.",
          kind: "equipment",
        },
        {
          id: "bottom-reboiler-heats",
          label: "الغلاية السفلية تزود العمود بالحرارة.",
          detail: "تساعد على إعادة تبخير جزء من السائل.",
          kind: "energy",
        },
        {
          id: "condenser-heats-bottom",
          label: "المكثف يوجد أسفل العمود لتسخين الراسب.",
          detail: "اختيار مضلل: هذا دور الغلاية.",
          kind: "distractor",
        },
      ],
      prompt: {
        title: "اقرأ مخطط جريان تقطير.",
        task: "سمّ التجهيزات والتيارات، أكمل جدول الوظائف، ثم اكتب خلاصة الجريان.",
        requiredObservationIds: [
          "feed-enters-column",
          "top-vapor-condensed",
          "bottom-reboiler-heats",
        ],
        requiredConclusionKeywords: ["تغذية", "عمود", "مكثف", "غلاية"],
        scaffoldPhrases: [
          "التغذية تدخل العمود.",
          "البخار العلوي يتكثف في المكثف.",
          "الغلاية السفلية تزود الحرارة.",
        ],
      },
    },
    {
      id: "reactor-instrumentation-control-loop",
      title: "حلقة قياس وتحكم في مفاعل",
      subtitle: "قراءة رموز TT/TIC/TV وربط المتغير بالمشغل.",
      bacContext:
        "ملفات الطرائق قد تعرض مخطط أجهزة وتحكم؛ المطلوب قراءة المتغير المقاس والعضو المنفذ ومسار الإشارة.",
      sourceHint:
        "مهمة V1 مبسطة لحلقة تحكم في درجة حرارة مفاعل مبرد.",
      instrument: {
        subjectLabel: "Process Tech Lab",
        title: "ورشة الجريان والقياس",
        iconKind: "technical",
      },
      sourceDocuments: [
        {
          id: "control-loop-note",
          title: "مخطط تحكم",
          bullets: [
            "TT يقيس درجة حرارة المفاعل.",
            "TIC يقارن القياس بالقيمة المرجعية ويرسل أمرا.",
            "TV صمام يغير تدفق ماء التبريد.",
          ],
        },
      ],
      table: {
        title: "جدول رموز القياس والتحكم",
        columns: [
          { id: "tag", label: "الرمز" },
          { id: "role", label: "الدور" },
          { id: "variable", label: "المتغير" },
        ],
        rows: [
          { id: "tt", label: "TT", cells: { tag: "TT", role: null, variable: null } },
          { id: "tic", label: "TIC", cells: { tag: "TIC", role: null, variable: null } },
          { id: "tv", label: "TV", cells: { tag: "TV", role: null, variable: null } },
          { id: "cooling", label: "تبريد", cells: { tag: "ماء تبريد", role: null, variable: null } },
        ],
      },
      diagram: {
        title: "حلقة تحكم في مفاعل",
        description: "سمّ القياس، المتحكم، والصمام.",
        targets: [
          { id: "reactor", label: "1", x: 42, y: 52, expectedLabel: "مفاعل", acceptedLabels: ["reacteur", "reactor"] },
          { id: "temperature-transmitter", label: "2", x: 34, y: 34, expectedLabel: "TT", acceptedLabels: ["حساس حرارة"] },
          { id: "controller", label: "3", x: 62, y: 30, expectedLabel: "TIC", acceptedLabels: ["متحكم"] },
          { id: "control-valve", label: "4", x: 72, y: 66, expectedLabel: "TV", acceptedLabels: ["صمام"] },
        ],
      },
      expectedCells: [
        { rowId: "tt", columnId: "role", expectedValue: "قياس", acceptedText: ["transmetteur"] },
        { rowId: "tt", columnId: "variable", expectedValue: "درجة الحرارة", acceptedText: ["temperature"] },
        { rowId: "tic", columnId: "role", expectedValue: "تحكم", acceptedText: ["controller", "régulateur"] },
        { rowId: "tv", columnId: "role", expectedValue: "صمام", acceptedText: ["valve"] },
        { rowId: "cooling", columnId: "variable", expectedValue: "تدفق", acceptedText: ["debit", "débit"] },
      ],
      observationItems: [
        {
          id: "tt-measures-temperature",
          label: "TT هو مرسل/حساس درجة الحرارة.",
          detail: "الحرف T يدل على temperature.",
          kind: "instrument",
        },
        {
          id: "tic-controls-valve",
          label: "TIC يرسل أمر التحكم إلى TV.",
          detail: "المتحكم يقرر فتح أو غلق صمام التبريد.",
          kind: "control",
        },
        {
          id: "cooling-flow-removes-heat",
          label: "زيادة تدفق ماء التبريد تخفض حرارة المفاعل.",
          detail: "هذه علاقة تشغيلية بين المتغير والمشغل.",
          kind: "operation",
        },
        {
          id: "tv-measures-temperature",
          label: "TV يقيس درجة الحرارة مباشرة.",
          detail: "اختيار مضلل: TV صمام تحكم.",
          kind: "distractor",
        },
      ],
      prompt: {
        title: "حلل حلقة تحكم في مفاعل.",
        task: "سمّ الرموز، أكمل وظائفها، ثم اشرح كيف يصحح النظام ارتفاع الحرارة.",
        requiredObservationIds: [
          "tt-measures-temperature",
          "tic-controls-valve",
          "cooling-flow-removes-heat",
        ],
        requiredConclusionKeywords: ["TT", "TIC", "TV", "تبريد"],
        scaffoldPhrases: [
          "TT يقيس درجة الحرارة.",
          "TIC يرسل الأمر إلى TV.",
          "فتح صمام التبريد يزيد إزالة الحرارة.",
        ],
      },
    },
  ];

export function getProcessFlowInstrumentationWorkbenchPreset(value: unknown) {
  return getStructuredLabWorkbenchPreset(
    value,
    processFlowInstrumentationWorkbenchPresets[0],
  );
}
