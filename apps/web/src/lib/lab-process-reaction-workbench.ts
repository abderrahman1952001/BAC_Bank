import type { StructuredLabWorkbenchPreset } from "@bac-bank/contracts/lab";
import { getStructuredLabWorkbenchPreset } from "@/lib/lab-structured-workbench";

export const processReactionWorkbenchPresets: StructuredLabWorkbenchPreset[] = [
  {
    id: "esterification-reaction-scheme",
    title: "قراءة مخطط أسترة",
    subtitle: "تحديد المتفاعلات، النواتج، الوسيط، ونوع التفاعل.",
    bacContext:
      "في هندسة الطرائق يقرأ الطالب مخططات تفاعلات عضوية ويستنتج الوظائف الكيميائية، الشروط، والنواتج.",
    sourceHint:
      "مستند إلى أنماط BAC: أسترة حمض كربوكسيلي بكحول وحساب مردود لاحق.",
    instrument: {
      subjectLabel: "Process Tech Lab",
      title: "ورشة مخططات التفاعل",
      iconKind: "technical",
    },
    sourceDocuments: [
      {
        id: "esterification-note",
        title: "مخطط تفاعل عضوي",
        bullets: [
          "حمض كربوكسيلي + كحول يعطيان إستر + ماء.",
          "التفاعل عكوس ويستعمل وسيطا حمضيا مثل H2SO4.",
          "التسخين الراجع يسرع التفاعل ويحد من ضياع المواد.",
        ],
      },
    ],
    table: {
      title: "جدول قراءة المخطط",
      columns: [
        { id: "slot", label: "الموضع" },
        { id: "compound", label: "المركب/الدور" },
        { id: "family", label: "العائلة/الدلالة" },
      ],
      rows: [
        { id: "a", label: "A", cells: { slot: "A", compound: null, family: null } },
        { id: "b", label: "B", cells: { slot: "B", compound: null, family: null } },
        { id: "c", label: "C", cells: { slot: "C", compound: null, family: null } },
        { id: "condition", label: "شرط", cells: { slot: "شرط", compound: null, family: null } },
      ],
    },
    diagram: {
      title: "سلسلة أسترة",
      description: "سمّ العقد الأساسية في المخطط.",
      targets: [
        { id: "acid", label: "A", x: 18, y: 48, expectedLabel: "حمض كربوكسيلي", acceptedLabels: ["acide"] },
        { id: "alcohol", label: "B", x: 35, y: 48, expectedLabel: "كحول", acceptedLabels: ["alcool"] },
        { id: "ester", label: "C", x: 64, y: 48, expectedLabel: "إستر", acceptedLabels: ["ester"] },
        { id: "water", label: "D", x: 80, y: 48, expectedLabel: "ماء", acceptedLabels: ["H2O"] },
        { id: "catalyst", label: "E", x: 50, y: 30, expectedLabel: "H2SO4", acceptedLabels: ["وسيط حمضي"] },
      ],
    },
    expectedCells: [
      { rowId: "a", columnId: "compound", expectedValue: "حمض", acceptedText: ["acide"] },
      { rowId: "a", columnId: "family", expectedValue: "حمض كربوكسيلي" },
      { rowId: "b", columnId: "compound", expectedValue: "كحول", acceptedText: ["alcool"] },
      { rowId: "c", columnId: "compound", expectedValue: "إستر", acceptedText: ["ester"] },
      { rowId: "condition", columnId: "compound", expectedValue: "H2SO4", acceptedText: ["حمض كبريتيك"] },
      { rowId: "condition", columnId: "family", expectedValue: "وسيط", acceptedText: ["catalyseur"] },
    ],
    observationItems: [
      {
        id: "acid-alcohol-form-ester",
        label: "حمض كربوكسيلي مع كحول يعطي إستر وماء.",
        detail: "هذه قراءة عائلة المتفاعلات والنواتج.",
        kind: "scheme",
      },
      {
        id: "esterification-reversible",
        label: "الأسترة تفاعل عكوس ومحدود.",
        detail: "لهذا تظهر أسئلة المردود والتوازن.",
        kind: "reaction",
      },
      {
        id: "acid-catalyst",
        label: "H2SO4 يعمل كوسيط حمضي في الأسترة.",
        detail: "يسرع التفاعل ولا يستهلك كمتفاعل أساسي.",
        kind: "condition",
      },
      {
        id: "water-reactant",
        label: "الماء متفاعل أساسي في جهة البداية.",
        detail: "اختيار مضلل: الماء ناتج في الأسترة.",
        kind: "distractor",
      },
    ],
    prompt: {
      title: "حلل مخطط الأسترة.",
      task: "سمّ عائلات المتفاعلات والنواتج، أكمل شرط التفاعل، ثم اكتب خلاصة.",
      requiredObservationIds: [
        "acid-alcohol-form-ester",
        "esterification-reversible",
        "acid-catalyst",
      ],
      requiredConclusionKeywords: ["حمض", "كحول", "إستر", "H2SO4"],
      scaffoldPhrases: [
        "نحدد عائلة الحمض والكحول من الوظائف.",
        "الناتج العضوي هو الإستر ويظهر الماء كناتج ثانوي.",
        "H2SO4 وسيط حمضي للتفاعل.",
      ],
    },
  },
  {
    id: "polyester-condensation-scheme",
    title: "مخطط بلمرة بولي إستر",
    subtitle: "تعرف نوع البلمرة والوحدة المتكررة والناتج الثانوي.",
    bacContext:
      "تظهر في مواضيع هندسة الطرائق مخططات بوليمرات، خصوصا البولي إستر، مع سؤال نوع البلمرة والوحدة المتكررة.",
    sourceHint:
      "مستند إلى أسئلة polyester في أوراق هندسة الطرائق 2012 و2017 و2019.",
    instrument: {
      subjectLabel: "Process Tech Lab",
      title: "ورشة مخططات التفاعل",
      iconKind: "technical",
    },
    sourceDocuments: [
      {
        id: "polymer-note",
        title: "مقتطف مخطط بوليمر",
        bullets: [
          "ثنائي حمض + ثنائي كحول يعطيان بولي إستر.",
          "تتكرر رابطة -COO- داخل السلسلة.",
          "ينطلق الماء في بلمرة التكاثف.",
        ],
      },
    ],
    table: {
      title: "جدول قراءة البلمرة",
      columns: [
        { id: "item", label: "العنصر" },
        { id: "answer", label: "الإجابة" },
        { id: "meaning", label: "الدلالة" },
      ],
      rows: [
        { id: "monomer-a", label: "مونومير 1", cells: { item: "A", answer: null, meaning: null } },
        { id: "monomer-b", label: "مونومير 2", cells: { item: "B", answer: null, meaning: null } },
        { id: "polymer", label: "البوليمر", cells: { item: "P", answer: null, meaning: null } },
        { id: "byproduct", label: "ناتج ثانوي", cells: { item: "ثانوي", answer: null, meaning: null } },
      ],
    },
    diagram: {
      title: "مخطط تكاثف",
      description: "سمّ عائلات المونوميرات والبوليمر.",
      targets: [
        { id: "diacid", label: "1", x: 18, y: 50, expectedLabel: "ثنائي حمض", acceptedLabels: ["diacide"] },
        { id: "diol", label: "2", x: 35, y: 50, expectedLabel: "ثنائي كحول", acceptedLabels: ["diol"] },
        { id: "polyester", label: "3", x: 64, y: 50, expectedLabel: "بولي إستر", acceptedLabels: ["polyester"] },
        { id: "water-loss", label: "4", x: 78, y: 36, expectedLabel: "H2O", acceptedLabels: ["ماء"] },
      ],
    },
    expectedCells: [
      { rowId: "monomer-a", columnId: "answer", expectedValue: "ثنائي حمض", acceptedText: ["diacide"] },
      { rowId: "monomer-b", columnId: "answer", expectedValue: "ثنائي كحول", acceptedText: ["diol"] },
      { rowId: "polymer", columnId: "answer", expectedValue: "بولي إستر", acceptedText: ["polyester"] },
      { rowId: "polymer", columnId: "meaning", expectedValue: "رابطة إستر", acceptedText: ["-COO-"] },
      { rowId: "byproduct", columnId: "answer", expectedValue: "ماء", acceptedText: ["H2O"] },
    ],
    observationItems: [
      {
        id: "condensation-polymerization",
        label: "البولي إستر ينتج غالبا ببلمرة تكاثف.",
        detail: "يتكون جزيء صغير مثل الماء.",
        kind: "polymer",
      },
      {
        id: "ester-link-repeats",
        label: "الوحدة المتكررة تحتوي رابطة إستر -COO-.",
        detail: "هذه علامة عائلة البولي إستر.",
        kind: "structure",
      },
      {
        id: "diacid-diol-needed",
        label: "ثنائي حمض وثنائي كحول يسمحان ببناء سلسلة طويلة.",
        detail: "وظيفتان في كل طرف ضرورية للتكرار.",
        kind: "monomer",
      },
      {
        id: "addition-polymerization",
        label: "هذا المثال بلمرة إضافة بدون ناتج ثانوي.",
        detail: "اختيار مضلل هنا: وجود الماء يدل على التكاثف.",
        kind: "distractor",
      },
    ],
    prompt: {
      title: "اقرأ مخطط بلمرة بولي إستر.",
      task: "حدد المونوميرات، نوع البلمرة، والناتج الثانوي، ثم اكتب خلاصة.",
      requiredObservationIds: [
        "condensation-polymerization",
        "ester-link-repeats",
        "diacid-diol-needed",
      ],
      requiredConclusionKeywords: ["بولي إستر", "تكاثف", "ماء"],
      scaffoldPhrases: [
        "المونوميران ثنائي حمض وثنائي كحول.",
        "تتكرر رابطة الإستر داخل السلسلة.",
        "انطلاق الماء يدل على بلمرة بالتكاثف.",
      ],
    },
  },
];

export function getProcessReactionWorkbenchPreset(value: unknown) {
  return getStructuredLabWorkbenchPreset(value, processReactionWorkbenchPresets[0]);
}
