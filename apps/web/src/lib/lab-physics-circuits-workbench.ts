import type { StructuredLabWorkbenchPreset } from "@bac-bank/contracts/lab";
import { getStructuredLabWorkbenchPreset } from "@/lib/lab-structured-workbench";

export const physicsCircuitsWorkbenchPresets: StructuredLabWorkbenchPreset[] = [
  {
    id: "rc-circuit-capacitance-from-tau",
    title: "دارة RC وحساب سعة المكثفة",
    subtitle: "تسمية عناصر الدارة، قراءة τ، ثم حساب C من العلاقة τ=RC.",
    bacContext:
      "في دارات RC يطلب من الطالب قراءة المخطط، استخراج ثابت الزمن من منحنى الشحن، ثم استعمال الوحدات لحساب C أو R.",
    sourceHint:
      "مستند إلى محور دارات RC وRL في برنامج الفيزياء، حيث تربط الأسئلة بين الرسم، المنحنى، وقانون τ=RC.",
    instrument: {
      subjectLabel: "Physics Lab",
      title: "ورشة الدارات الكهربائية",
      iconKind: "circuit",
    },
    sourceDocuments: [
      {
        id: "rc-data",
        title: "معطيات الدارة",
        bullets: [
          "المولد مثالي: E=6 V.",
          "المقاومة R=100 Ω.",
          "من منحنى الشحن نقرأ τ=4 ms.",
          "العلاقة المستعملة في دارة RC هي τ=RC.",
        ],
      },
    ],
    table: {
      title: "ملف المعطيات",
      columns: [
        { id: "symbol", label: "الرمز" },
        { id: "value", label: "القيمة" },
        { id: "unit", label: "الوحدة" },
      ],
      rows: [
        { id: "r", label: "R", cells: { symbol: "R", value: 100, unit: "Ω" } },
        { id: "tau", label: "τ", cells: { symbol: "τ", value: 4, unit: "ms" } },
        { id: "c", label: "C", cells: { symbol: "C", value: null, unit: "F" } },
      ],
    },
    diagram: {
      title: "مخطط دارة RC",
      description:
        "ضع تسميات العناصر الأساسية قبل استعمال العلاقة. المواضع تقريبية وتمثل مخططا مدرسيا مبسطا.",
      targets: [
        { id: "generator", label: "1", x: 18, y: 52, expectedLabel: "مولد", acceptedLabels: ["E"] },
        { id: "resistor", label: "2", x: 45, y: 28, expectedLabel: "مقاومة", acceptedLabels: ["R"] },
        { id: "capacitor", label: "3", x: 72, y: 54, expectedLabel: "مكثفة", acceptedLabels: ["C"] },
        { id: "switch", label: "4", x: 45, y: 76, expectedLabel: "قاطعة", acceptedLabels: ["K"] },
      ],
    },
    measurements: [
      { id: "capacitance", label: "سعة المكثفة C", unitHint: "F" },
    ],
    expectedCells: [
      { rowId: "c", columnId: "value", expectedValue: 0.00004, tolerance: 0.000002, acceptedText: ["40 µF", "4e-5"] },
    ],
    expectedMeasurements: [
      {
        id: "capacitance",
        expected: { value: 0.00004, unit: "F" },
        tolerance: 0.000002,
        acceptedUnits: ["farad"],
      },
    ],
    observationItems: [
      {
        id: "tau-from-graph",
        label: "τ=4 ms تقرأ عند 63% من التوتر النهائي.",
        detail: "هذه قراءة ثابت الزمن من منحنى الشحن.",
        kind: "reading",
      },
      {
        id: "capacitance-formula",
        label: "من τ=RC نستنتج C=τ/R.",
        detail: "يجب تحويل ms إلى s قبل الحساب.",
        kind: "formula",
      },
      {
        id: "units-converted",
        label: "4 ms = 4×10⁻³ s، ومنه C=4×10⁻⁵ F.",
        detail: "التحويل هو بوابة صحة الوحدة.",
        kind: "unit",
      },
      {
        id: "tau-equals-r-over-c",
        label: "نستعمل τ=R/C مباشرة.",
        detail: "اختيار مضلل: في دارة RC العلاقة τ=RC.",
        kind: "distractor",
      },
    ],
    prompt: {
      title: "احسب سعة المكثفة من ثابت الزمن.",
      task: "سمّ عناصر الدارة، أكمل قيمة C، اكتب القياس بوحدته، ثم صغ استنتاجا قصيرا.",
      requiredObservationIds: [
        "tau-from-graph",
        "capacitance-formula",
        "units-converted",
      ],
      requiredConclusionKeywords: ["τ", "RC", "C", "F"],
      scaffoldPhrases: [
        "من المنحنى نقرأ τ=4 ms=4×10⁻³ s.",
        "بما أن τ=RC فإن C=τ/R.",
        "إذن C=4×10⁻³/100=4×10⁻⁵ F.",
      ],
    },
  },
  {
    id: "rl-circuit-inductance-from-tau",
    title: "دارة RL وحساب معامل التحريض",
    subtitle: "قراءة دارة RL، تحديد τ، ثم حساب L من العلاقة τ=L/R.",
    bacContext:
      "في دارات RL ينتقل الطالب بين مخطط الدارة ومنحنى شدة التيار، ثم يستعمل τ=L/R لاستخراج معامل التحريض.",
    sourceHint:
      "مبني على أسئلة دارات RL حيث يطلب تحديد الوشيعة وقراءة ثابت الزمن من i(t).",
    instrument: {
      subjectLabel: "Physics Lab",
      title: "ورشة الدارات الكهربائية",
      iconKind: "circuit",
    },
    sourceDocuments: [
      {
        id: "rl-data",
        title: "معطيات الدارة",
        bullets: [
          "المقاومة الكلية R=20 Ω.",
          "من منحنى i(t) نقرأ τ=2 ms.",
          "ثابت الزمن في دارة RL يحقق τ=L/R.",
        ],
      },
    ],
    table: {
      title: "ملف المعطيات",
      columns: [
        { id: "symbol", label: "الرمز" },
        { id: "value", label: "القيمة" },
        { id: "unit", label: "الوحدة" },
      ],
      rows: [
        { id: "r", label: "R", cells: { symbol: "R", value: 20, unit: "Ω" } },
        { id: "tau", label: "τ", cells: { symbol: "τ", value: 2, unit: "ms" } },
        { id: "l", label: "L", cells: { symbol: "L", value: null, unit: "H" } },
      ],
    },
    diagram: {
      title: "مخطط دارة RL",
      description: "حدد الوشيعة والمقاومة والمولد قبل استعمال العلاقة.",
      targets: [
        { id: "generator", label: "1", x: 18, y: 52, expectedLabel: "مولد", acceptedLabels: ["E"] },
        { id: "resistor", label: "2", x: 42, y: 30, expectedLabel: "مقاومة", acceptedLabels: ["R"] },
        { id: "inductor", label: "3", x: 72, y: 54, expectedLabel: "وشيعة", acceptedLabels: ["L"] },
      ],
    },
    measurements: [
      { id: "inductance", label: "معامل التحريض L", unitHint: "H" },
    ],
    expectedCells: [
      { rowId: "l", columnId: "value", expectedValue: 0.04, tolerance: 0.002, acceptedText: ["40 mH"] },
    ],
    expectedMeasurements: [
      {
        id: "inductance",
        expected: { value: 0.04, unit: "H" },
        tolerance: 0.002,
        acceptedUnits: ["henry"],
      },
    ],
    observationItems: [
      {
        id: "current-rises",
        label: "شدة التيار في RL ترتفع تدريجيا نحو قيمة حدية.",
        detail: "الوشيعة تعارض تغير التيار في البداية.",
        kind: "trend",
      },
      {
        id: "tau-l-over-r",
        label: "ثابت الزمن في دارة RL يساوي L/R.",
        detail: "لذلك L=τR بعد تحويل الزمن إلى الثانية.",
        kind: "formula",
      },
      {
        id: "l-unit-henry",
        label: "القيمة L=0.04 H تكافئ 40 mH.",
        detail: "التحويل يساعد على قراءة جواب BAC.",
        kind: "unit",
      },
      {
        id: "capacitor-stores-current",
        label: "المكثفة هي العنصر الذي يخزن التيار في هذه الدارة.",
        detail: "اختيار مضلل: العنصر المميز هنا هو الوشيعة.",
        kind: "distractor",
      },
    ],
    prompt: {
      title: "احسب معامل التحريض من τ.",
      task: "سمّ عناصر دارة RL، أكمل L في الجدول، اكتب قياسه بوحدته، ثم اربط ذلك بتغير التيار.",
      requiredObservationIds: ["current-rises", "tau-l-over-r", "l-unit-henry"],
      requiredConclusionKeywords: ["τ", "L/R", "وشيعة", "H"],
      scaffoldPhrases: [
        "نحوّل τ=2 ms إلى 2×10⁻³ s.",
        "بما أن τ=L/R فإن L=τR.",
        "إذن L=2×10⁻³×20=0.04 H.",
      ],
    },
  },
];

export function getPhysicsCircuitsWorkbenchPreset(value: unknown) {
  return getStructuredLabWorkbenchPreset(value, physicsCircuitsWorkbenchPresets[0]);
}
