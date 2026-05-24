import type { StructuredLabWorkbenchPreset } from "@bac-bank/contracts/lab";
import { getStructuredLabWorkbenchPreset } from "@/lib/lab-structured-workbench";

export const physicsMechanicsWorkbenchPresets: StructuredLabWorkbenchPreset[] = [
  {
    id: "inclined-plane-newton-law",
    title: "مستوى مائل وتطبيق القانون الثاني",
    subtitle: "تسمية القوى، قراءة التسارع من v(t)، ثم حساب محصلة القوى.",
    bacContext:
      "في مسائل الميكانيك يطلب BAC عادة تمثيل القوى، قراءة التسارع من منحنى السرعة، ثم استعمال ΣF=m.a.",
    sourceHint:
      "مستند إلى نمط حركة جسم على مستقيم مع مخطط قوى ومنحنى v=f(t).",
    instrument: {
      subjectLabel: "Physics Lab",
      title: "ورشة الميكانيك",
      iconKind: "mechanics",
    },
    sourceDocuments: [
      {
        id: "incline-data",
        title: "معطيات الحركة",
        bullets: [
          "كتلة الجسم m=0.50 kg.",
          "يتحرك الجسم على محور موازي للمستوى المائل.",
          "من منحنى v(t) يكون الميل ثابتا ويساوي التسارع.",
          "القانون المستعمل على محور الحركة هو ΣF=m.a.",
        ],
      },
    ],
    table: {
      title: "قراءات الحركة",
      columns: [
        { id: "item", label: "العنصر" },
        { id: "value", label: "القيمة" },
        { id: "unit", label: "الوحدة" },
      ],
      rows: [
        { id: "mass", label: "m", cells: { item: "الكتلة", value: 0.5, unit: "kg" } },
        { id: "acceleration", label: "a", cells: { item: "التسارع", value: null, unit: "m/s²" } },
        { id: "resultant", label: "ΣF", cells: { item: "محصلة القوى", value: null, unit: "N" } },
      ],
    },
    graph: {
      title: "تطور السرعة على محور الحركة",
      xAxis: { label: "t", unit: "s", min: 0, max: 4 },
      yAxis: { label: "v", unit: "m/s", min: 0, max: 8 },
      series: [
        {
          id: "velocity",
          title: "v(t)",
          kind: "line",
          points: [
            { x: 0, y: 0 },
            { x: 1, y: 2 },
            { x: 2, y: 4 },
            { x: 3, y: 6 },
            { x: 4, y: 8 },
          ],
        },
      ],
    },
    diagram: {
      title: "مخطط القوى",
      description: "حدد القوى المؤثرة على الجسم قبل الإسقاط على محور الحركة.",
      targets: [
        { id: "weight", label: "1", x: 48, y: 70, expectedLabel: "الثقل", acceptedLabels: ["P"] },
        { id: "normal", label: "2", x: 58, y: 32, expectedLabel: "رد الفعل", acceptedLabels: ["R", "N"] },
        { id: "friction", label: "3", x: 34, y: 50, expectedLabel: "احتكاك", acceptedLabels: ["f"] },
      ],
    },
    measurements: [
      { id: "resultant-force", label: "محصلة القوى ΣF", unitHint: "N" },
    ],
    expectedCells: [
      {
        rowId: "acceleration",
        columnId: "value",
        expectedValue: 2,
        tolerance: 0.1,
        acceptedText: ["2 m/s²", "2 m/s^2"],
      },
      {
        rowId: "resultant",
        columnId: "value",
        expectedValue: 1,
        tolerance: 0.05,
        acceptedText: ["1 N"],
      },
    ],
    expectedMeasurements: [
      {
        id: "resultant-force",
        expected: { value: 1, unit: "N" },
        tolerance: 0.05,
        acceptedUnits: ["newton"],
      },
    ],
    observationItems: [
      {
        id: "slope-constant",
        label: "منحنى v(t) مستقيم وميله ثابت.",
        detail: "هذا يعني أن التسارع ثابت.",
        kind: "graph",
      },
      {
        id: "acceleration-two",
        label: "الميل Δv/Δt يساوي 2 m/s².",
        detail: "قراءة التسارع من المنحنى مباشرة.",
        kind: "slope",
      },
      {
        id: "newton-resultant",
        label: "من ΣF=m.a نحصل على ΣF=0.5×2=1 N.",
        detail: "المحصلة على محور الحركة هي سبب التسارع.",
        kind: "formula",
      },
      {
        id: "zero-resultant",
        label: "محصلة القوى منعدمة لأن الجسم يتحرك.",
        detail: "اختيار مضلل: التسارع غير منعدم.",
        kind: "distractor",
      },
    ],
    prompt: {
      title: "استخرج محصلة القوى من الحركة.",
      task: "سمّ القوى، اقرأ التسارع من v(t)، أكمل الجدول، ثم اكتب خلاصة باستعمال القانون الثاني لنيوتن.",
      requiredObservationIds: [
        "slope-constant",
        "acceleration-two",
        "newton-resultant",
      ],
      requiredConclusionKeywords: ["ميل", "تسارع", "ΣF", "m.a", "N"],
      scaffoldPhrases: [
        "من ميل v(t) نجد a=2 m/s².",
        "بتطبيق القانون الثاني على محور الحركة: ΣF=m.a.",
        "إذن ΣF=0.50×2=1 N في جهة الحركة.",
      ],
    },
  },
  {
    id: "spring-oscillator-stiffness",
    title: "نواس مرن وحساب ثابت الصلابة",
    subtitle: "قراءة الدور من x(t)، ثم حساب k من علاقة النواس المرن.",
    bacContext:
      "في الاهتزازات الميكانيكية يربط الطالب بين منحنى x(t)، الدور T، والعلاقة T=2π√(m/k).",
    sourceHint:
      "مبني على أسئلة النواس المرن حيث تستخرج قيمة k من الدور والكتلة.",
    instrument: {
      subjectLabel: "Physics Lab",
      title: "ورشة الميكانيك",
      iconKind: "mechanics",
    },
    sourceDocuments: [
      {
        id: "oscillator-data",
        title: "معطيات النواس",
        bullets: [
          "كتلة الجسم m=0.10 kg.",
          "من المنحنى x(t) نقرأ دورا T=0.40 s.",
          "علاقة النواس المرن: T=2π√(m/k).",
          "نستعمل π²≈9.87.",
        ],
      },
    ],
    table: {
      title: "قراءات النواس المرن",
      columns: [
        { id: "item", label: "العنصر" },
        { id: "value", label: "القيمة" },
        { id: "unit", label: "الوحدة" },
      ],
      rows: [
        { id: "period", label: "T", cells: { item: "الدور", value: null, unit: "s" } },
        { id: "mass", label: "m", cells: { item: "الكتلة", value: 0.1, unit: "kg" } },
        { id: "stiffness", label: "k", cells: { item: "ثابت الصلابة", value: null, unit: "N/m" } },
      ],
    },
    graph: {
      title: "استطالة النواس المرن بدلالة الزمن",
      xAxis: { label: "t", unit: "s", min: 0, max: 0.8 },
      yAxis: { label: "x", unit: "cm", min: -4, max: 4 },
      series: [
        {
          id: "elongation",
          title: "x(t)",
          kind: "line",
          points: [
            { x: 0, y: 3 },
            { x: 0.1, y: 0 },
            { x: 0.2, y: -3 },
            { x: 0.3, y: 0 },
            { x: 0.4, y: 3 },
            { x: 0.5, y: 0 },
            { x: 0.6, y: -3 },
            { x: 0.7, y: 0 },
            { x: 0.8, y: 3 },
          ],
        },
      ],
    },
    diagram: {
      title: "نموذج النواس المرن",
      description: "سمّ عناصر النموذج قبل استعمال علاقة الدور.",
      targets: [
        { id: "spring", label: "1", x: 34, y: 38, expectedLabel: "نابض", acceptedLabels: ["spring"] },
        { id: "mass", label: "2", x: 62, y: 52, expectedLabel: "جسم", acceptedLabels: ["كتلة"] },
        { id: "equilibrium", label: "3", x: 78, y: 50, expectedLabel: "موضع التوازن", acceptedLabels: ["O"] },
      ],
    },
    measurements: [
      { id: "stiffness", label: "ثابت الصلابة k", unitHint: "N/m" },
    ],
    expectedCells: [
      { rowId: "period", columnId: "value", expectedValue: 0.4, tolerance: 0.03, acceptedText: ["0.40 s"] },
      { rowId: "stiffness", columnId: "value", expectedValue: 24.7, tolerance: 0.8, acceptedText: ["25 N/m"] },
    ],
    expectedMeasurements: [
      {
        id: "stiffness",
        expected: { value: 24.7, unit: "N/m" },
        tolerance: 0.8,
        acceptedUnits: ["N.m-1", "newton/m"],
      },
    ],
    observationItems: [
      {
        id: "period-reading",
        label: "الدور هو الزمن بين قمتين متتاليتين: T≈0.40 s.",
        detail: "قراءة دور الاهتزاز من المنحنى.",
        kind: "reading",
      },
      {
        id: "spring-period-law",
        label: "علاقة النواس المرن تعطي k=4π²m/T².",
        detail: "نربع علاقة الدور ثم نعزل k.",
        kind: "formula",
      },
      {
        id: "stiffness-value",
        label: "باستعمال m=0.10 kg وT=0.40 s نجد k≈24.7 N/m.",
        detail: "القيمة توافق وحدة صلابة النابض.",
        kind: "unit",
      },
      {
        id: "period-amplitude",
        label: "الدور هو أكبر استطالة على المنحنى.",
        detail: "اختيار مضلل: أكبر استطالة هي السعة.",
        kind: "distractor",
      },
    ],
    prompt: {
      title: "احسب ثابت صلابة النابض.",
      task: "اقرأ الدور، أكمل الجدول والقياس، ثم اكتب استنتاجا يربط المنحنى بعلاقة النواس المرن.",
      requiredObservationIds: [
        "period-reading",
        "spring-period-law",
        "stiffness-value",
      ],
      requiredConclusionKeywords: ["T", "k", "π", "N/m", "دور"],
      scaffoldPhrases: [
        "نقرأ من المنحنى T≈0.40 s بين قمتين.",
        "من T=2π√(m/k) نستنتج k=4π²m/T².",
        "إذن k≈24.7 N/m.",
      ],
    },
  },
];

export function getPhysicsMechanicsWorkbenchPreset(value: unknown) {
  return getStructuredLabWorkbenchPreset(value, physicsMechanicsWorkbenchPresets[0]);
}
