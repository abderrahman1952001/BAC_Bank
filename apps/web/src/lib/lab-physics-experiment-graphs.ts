import type { StructuredLabWorkbenchPreset } from "@bac-bank/contracts/lab";
import { getStructuredLabWorkbenchPreset } from "@/lib/lab-structured-workbench";

export const physicsExperimentGraphPresets: StructuredLabWorkbenchPreset[] = [
  {
    id: "rc-charging-time-constant",
    title: "شحن مكثفة وقراءة ثابت الزمن",
    subtitle: "قراءة منحنى uC(t)، تحديد τ، وربطه بثابت الدارة RC.",
    bacContext:
      "نمط شائع في الفيزياء: وثيقة دارة RC ومنحنى شحن/تفريغ، قراءة القيمة النهائية و63% منها، ثم استخراج ثابت الزمن.",
    sourceHint:
      "مستند إلى أنماط دارات RC وRL في برنامج الفيزياء، حيث تربط المهمة المنحنى بالثابت الزمني والوحدة.",
    instrument: {
      subjectLabel: "Physics Lab",
      title: "منحنيات التجربة",
      iconKind: "graph",
    },
    sourceDocuments: [
      {
        id: "protocol",
        title: "بروتوكول التجربة",
        bullets: [
          "نغلق القاطعة عند t=0 ونقيس التوتر uC بين مربطي المكثفة.",
          "المولد مثالي وتوتره E=6 V.",
          "يمثل ثابت الزمن τ اللحظة التي يبلغ فيها uC حوالي 0.63E.",
        ],
      },
    ],
    table: {
      title: "قراءات المنحنى",
      columns: [
        { id: "item", label: "العنصر" },
        { id: "value", label: "القيمة" },
      ],
      rows: [
        { id: "u-final", label: "E", cells: { item: "القيمة النهائية E", value: null } },
        { id: "u-tau", label: "0.63E", cells: { item: "uC عند τ", value: null } },
        { id: "tau", label: "τ", cells: { item: "ثابت الزمن", value: null } },
        { id: "initial-slope", label: "الميل البدئي", cells: { item: "duC/dt عند 0", value: null } },
      ],
    },
    graph: {
      title: "تطور توتر المكثفة أثناء الشحن",
      xAxis: { label: "t", unit: "ms", min: 0, max: 12 },
      yAxis: { label: "uC", unit: "V", min: 0, max: 6 },
      series: [
        {
          id: "uc",
          title: "uC(t)",
          kind: "line",
          points: [
            { x: 0, y: 0 },
            { x: 1, y: 1.33 },
            { x: 2, y: 2.36 },
            { x: 4, y: 3.79 },
            { x: 6, y: 4.66 },
            { x: 8, y: 5.19 },
            { x: 12, y: 5.7 },
          ],
        },
      ],
    },
    expectedCells: [
      { rowId: "u-final", columnId: "value", expectedValue: 6, tolerance: 0.2 },
      { rowId: "u-tau", columnId: "value", expectedValue: 3.8, tolerance: 0.25, acceptedText: ["0.63E"] },
      { rowId: "tau", columnId: "value", expectedValue: 4, tolerance: 0.5, acceptedText: ["4 ms"] },
      { rowId: "initial-slope", columnId: "value", expectedValue: 1.5, tolerance: 0.25, acceptedText: ["E/tau"] },
    ],
    observationItems: [
      {
        id: "uc-increases-asymptote",
        label: "uC يزداد ثم يقترب تدريجيا من E=6 V.",
        detail: "هذه قراءة الشحن الأسي وليست علاقة خطية كاملة.",
        kind: "trend",
      },
      {
        id: "tau-at-63",
        label: "عند τ يكون uC≈0.63E أي حوالي 3.8 V.",
        detail: "هذه هي طريقة القراءة البيانية لثابت الزمن.",
        kind: "reading",
      },
      {
        id: "tau-rc-link",
        label: "ثابت الزمن يساوي RC وتزداد مدة الشحن بزيادته.",
        detail: "الاستنتاج الفيزيائي يربط المنحنى بعناصر الدارة.",
        kind: "model",
      },
      {
        id: "linear-forever",
        label: "يستمر uC في الزيادة خطيا دون قيمة حدية.",
        detail: "اختيار مضلل: المنحنى يتسطح قرب E.",
        kind: "distractor",
      },
    ],
    prompt: {
      title: "استخرج τ من منحنى الشحن.",
      task: "املأ القراءات الأساسية من المنحنى، اختر الملاحظات الصحيحة، ثم اكتب استنتاجا يربط τ بدارة RC.",
      requiredObservationIds: ["uc-increases-asymptote", "tau-at-63", "tau-rc-link"],
      requiredConclusionKeywords: ["τ", "63", "RC", "شحن"],
      scaffoldPhrases: [
        "القيمة النهائية للتوتر هي E≈6 V.",
        "نقرأ τ عندما uC≈0.63E أي حوالي 3.8 V.",
        "أستنتج أن τ≈4 ms ويمثل ثابت الزمن RC للدارة.",
      ],
    },
  },
  {
    id: "velocity-time-slope-acceleration",
    title: "منحنى السرعة والزمن",
    subtitle: "قراءة ميل v(t)، السرعة الابتدائية، والتسارع من تجربة حركة.",
    bacContext:
      "في الميكانيك التجريبي يطلب من الطالب غالبا قراءة v(t)، حساب الميل، ثم تفسيره كتسارع وحكم طبيعة الحركة.",
    sourceHint:
      "مستوحى من أسئلة الحركة حيث يكون المنحنى v=f(t) خطيا ويستخرج منه التسارع والسرعة الابتدائية.",
    instrument: {
      subjectLabel: "Physics Lab",
      title: "منحنيات التجربة",
      iconKind: "graph",
    },
    sourceDocuments: [
      {
        id: "motion-protocol",
        title: "معطيات التجربة",
        body: "نقيس سرعة جسم يتحرك على مستقيم خلال فواصل زمنية متساوية، ثم نمثل v بدلالة t.",
      },
    ],
    table: {
      title: "قراءات v(t)",
      columns: [
        { id: "item", label: "العنصر" },
        { id: "value", label: "القيمة" },
      ],
      rows: [
        { id: "v0", label: "v0", cells: { item: "السرعة الابتدائية", value: null } },
        { id: "v3", label: "v(3s)", cells: { item: "v عند t=3s", value: null } },
        { id: "slope", label: "a", cells: { item: "ميل المنحنى", value: null } },
        { id: "motion-kind", label: "النوع", cells: { item: "طبيعة الحركة", value: null } },
      ],
    },
    graph: {
      title: "تطور السرعة بدلالة الزمن",
      xAxis: { label: "t", unit: "s", min: 0, max: 4 },
      yAxis: { label: "v", unit: "m/s", min: 0, max: 10 },
      series: [
        {
          id: "velocity",
          title: "v(t)",
          kind: "line",
          points: [
            { x: 0, y: 1 },
            { x: 1, y: 3 },
            { x: 2, y: 5 },
            { x: 3, y: 7 },
            { x: 4, y: 9 },
          ],
        },
      ],
    },
    expectedCells: [
      { rowId: "v0", columnId: "value", expectedValue: 1, tolerance: 0.1, acceptedText: ["1 m/s"] },
      { rowId: "v3", columnId: "value", expectedValue: 7, tolerance: 0.1, acceptedText: ["7 m/s"] },
      { rowId: "slope", columnId: "value", expectedValue: 2, tolerance: 0.1, acceptedText: ["2 m/s²", "2 m/s^2"] },
      { rowId: "motion-kind", columnId: "value", expectedValue: "حركة مستقيمة متسارعة بانتظام", acceptedText: ["متسارعة بانتظام", "MRUA"] },
    ],
    observationItems: [
      {
        id: "straight-line",
        label: "منحنى v(t) مستقيم، إذن التسارع ثابت.",
        detail: "خطية v بدلالة الزمن هي العلامة التجريبية الأساسية.",
        kind: "trend",
      },
      {
        id: "slope-is-acceleration",
        label: "ميل v(t) يساوي 2 m/s² ويمثل التسارع.",
        detail: "الميل هو Δv/Δt.",
        kind: "slope",
      },
      {
        id: "positive-acceleration",
        label: "التسارع موجب، لذلك السرعة تزداد.",
        detail: "هذا يحدد طبيعة الحركة.",
        kind: "model",
      },
      {
        id: "uniform-speed",
        label: "الحركة منتظمة لأن السرعة ثابتة.",
        detail: "اختيار مضلل: السرعة ترتفع من 1 إلى 9 m/s.",
        kind: "distractor",
      },
    ],
    prompt: {
      title: "استخرج التسارع من v(t).",
      task: "املأ القراءات، اختر الملاحظات المدعومة، ثم اكتب استنتاجا يربط الميل بالتسارع وطبيعة الحركة.",
      requiredObservationIds: ["straight-line", "slope-is-acceleration", "positive-acceleration"],
      requiredConclusionKeywords: ["ميل", "تسارع", "2", "متسارعة"],
      scaffoldPhrases: [
        "نقرأ v0=1 m/s و v(3s)=7 m/s.",
        "ميل المنحنى هو Δv/Δt=2 m/s².",
        "بما أن الميل ثابت وموجب فالحركة مستقيمة متسارعة بانتظام.",
      ],
    },
  },
];

export function getPhysicsExperimentGraphPreset(value: unknown) {
  return getStructuredLabWorkbenchPreset(value, physicsExperimentGraphPresets[0]);
}
