import type { StructuredLabWorkbenchPreset } from "@bac-bank/contracts/lab";
import { getStructuredLabWorkbenchPreset } from "@/lib/lab-structured-workbench";

export const svtNervousImmuneResponseWorkbenchPresets: StructuredLabWorkbenchPreset[] = [
  {
    id: "reflex-arc-synapse-flow",
    title: "قوس انعكاسية ومشبك عصبي",
    subtitle: "تسمية عناصر المسار العصبي وترتيب انتقال السيالة.",
    bacContext:
      "في BAC تظهر وثائق قوس انعكاسية أو مشبك عصبي، ويطلب تحديد المستقبل والعصبونات والمركز العصبي ثم تفسير اتجاه السيالة.",
    sourceHint:
      "مستند إلى أنماط المنعكس العضلي والاتصال العصبي في وثائق SVT.",
    instrument: {
      subjectLabel: "SVT Lab",
      title: "ورشة الاستجابة العصبية والمناعية",
    },
    sourceDocuments: [
      {
        id: "reflex-doc",
        title: "مفتاح قراءة القوس الانعكاسية",
        bullets: [
          "ينشأ التنبيه في مستقبل حسي.",
          "تنتقل السيالة عبر عصبون حسي نحو النخاع الشوكي.",
          "يغادر الأمر الحركي عبر عصبون حركي نحو العضلة المنفذة.",
        ],
      },
    ],
    diagram: {
      title: "قوس انعكاسية مبسطة",
      description: "سمّ عناصر المسار حسب اتجاه السيالة العصبية.",
      targets: [
        { id: "receptor", label: "1", x: 18, y: 54, expectedLabel: "مستقبل حسي", acceptedLabels: ["مستقبل"] },
        { id: "sensory-neuron", label: "2", x: 38, y: 38, expectedLabel: "عصبون حسي", acceptedLabels: ["وارد"] },
        { id: "spinal-cord", label: "3", x: 56, y: 48, expectedLabel: "نخاع شوكي", acceptedLabels: ["مركز عصبي"] },
        { id: "motor-neuron", label: "4", x: 70, y: 62, expectedLabel: "عصبون حركي", acceptedLabels: ["صادر"] },
        { id: "muscle", label: "5", x: 86, y: 52, expectedLabel: "عضلة", acceptedLabels: ["مستجيب"] },
      ],
    },
    observationItems: [
      {
        id: "sensory-before-center",
        label: "السيالة الحسية تنتقل من المستقبل إلى المركز العصبي.",
        detail: "العصبون الحسي وارد نحو النخاع الشوكي.",
        kind: "flow",
      },
      {
        id: "motor-after-center",
        label: "العصبون الحركي ينقل الأمر من المركز إلى العضلة.",
        detail: "هذه المرحلة مسؤولة عن الاستجابة.",
        kind: "flow",
      },
      {
        id: "synapse-one-way",
        label: "الاتصال المشبكي يفرض انتقالا في اتجاه واحد.",
        detail: "يساعد ذلك على ترتيب مراحل الاستجابة.",
        kind: "mechanism",
      },
      {
        id: "muscle-is-receptor",
        label: "العضلة هي المستقبل الحسي الأول في المسار.",
        detail: "اختيار مضلل: العضلة مستجيب حركي.",
        kind: "distractor",
      },
    ],
    prompt: {
      title: "سمّ القوس الانعكاسية وفسر اتجاه السيالة.",
      task: "أدخل التسميات، اختر الملاحظات الصحيحة، ثم اكتب خلاصة قصيرة عن انتقال السيالة.",
      requiredObservationIds: [
        "sensory-before-center",
        "motor-after-center",
        "synapse-one-way",
      ],
      requiredConclusionKeywords: ["مستقبل", "عصبون حسي", "نخاع", "عصبون حركي", "عضلة"],
      scaffoldPhrases: [
        "تنطلق السيالة من مستقبل حسي ثم تمر عبر عصبون حسي.",
        "يعالج المركز العصبي الرسالة ثم يرسل أمرا عبر عصبون حركي.",
        "تصل الرسالة إلى العضلة فتحدث الاستجابة.",
      ],
    },
  },
  {
    id: "immune-response-cell-chain",
    title: "سلسلة الاستجابة المناعية النوعية",
    subtitle: "تسمية الخلايا والجزيئات وربطها بإنتاج الأجسام المضادة.",
    bacContext:
      "في المناعة النوعية يطلب BAC غالبا قراءة مخطط تفاعل مولد الضد مع الخلايا اللمفاوية ثم تفسير إنتاج الأجسام المضادة.",
    sourceHint:
      "مبني على وثائق الاستجابة المناعية الخلطية: مولد ضد، خلية عارضة، LT4، LB، بلازموسيت، جسم مضاد.",
    instrument: {
      subjectLabel: "SVT Lab",
      title: "ورشة الاستجابة العصبية والمناعية",
    },
    sourceDocuments: [
      {
        id: "immune-doc",
        title: "مفتاح قراءة السلسلة المناعية",
        bullets: [
          "تعرض الخلية العارضة محددات مولد الضد على سطحها.",
          "ينشط LT4 خلايا LB النوعية.",
          "تتمايز LB إلى خلايا بلازمية تفرز أجساما مضادة نوعية.",
        ],
      },
    ],
    diagram: {
      title: "استجابة مناعية خلطية",
      description: "سمّ العناصر حسب ترتيب تنشيط الاستجابة.",
      targets: [
        { id: "antigen", label: "1", x: 18, y: 40, expectedLabel: "مولد ضد", acceptedLabels: ["antigene", "antigen"] },
        { id: "apc", label: "2", x: 34, y: 58, expectedLabel: "خلية عارضة", acceptedLabels: ["CPA"] },
        { id: "t-helper", label: "3", x: 52, y: 35, expectedLabel: "LT4", acceptedLabels: ["لمفاوية T4"] },
        { id: "b-cell", label: "4", x: 68, y: 58, expectedLabel: "LB", acceptedLabels: ["لمفاوية B"] },
        { id: "antibody", label: "5", x: 86, y: 40, expectedLabel: "جسم مضاد", acceptedLabels: ["anticorps"] },
      ],
    },
    observationItems: [
      {
        id: "antigen-specificity",
        label: "مولد الضد يحمل محددات نوعية تتعرف عليها اللمفاويات.",
        detail: "النوعية هي أساس الاستجابة المناعية.",
        kind: "specificity",
      },
      {
        id: "lt4-activates-lb",
        label: "LT4 ينشط LB النوعية بعد العرض.",
        detail: "هذه حلقة تنظيمية في الاستجابة الخلطية.",
        kind: "interaction",
      },
      {
        id: "plasma-secretes-antibodies",
        label: "تتمايز LB إلى خلايا بلازمية تفرز أجساما مضادة.",
        detail: "الأجسام المضادة ترتبط بمولد الضد نوعيا.",
        kind: "process",
      },
      {
        id: "antibodies-activate-lt4-first",
        label: "الأجسام المضادة هي التي تنشط LT4 في البداية.",
        detail: "اختيار مضلل: التنشيط يبدأ بالعرض والتعرف الخلوي.",
        kind: "distractor",
      },
    ],
    prompt: {
      title: "رتب سلسلة الاستجابة المناعية الخلطية.",
      task: "سمّ الخلايا والجزيئات، اختر الملاحظات الصحيحة، ثم اكتب خلاصة عن إنتاج الأجسام المضادة.",
      requiredObservationIds: [
        "antigen-specificity",
        "lt4-activates-lb",
        "plasma-secretes-antibodies",
      ],
      requiredConclusionKeywords: ["مولد ضد", "LT4", "LB", "أجسام مضادة", "نوعية"],
      scaffoldPhrases: [
        "تعرض الخلية العارضة مولد الضد وتنشط LT4.",
        "ينشط LT4 الخلايا LB النوعية.",
        "تتمايز LB إلى خلايا بلازمية مفرزة للأجسام المضادة.",
      ],
    },
  },
];

export function getSvtNervousImmuneResponseWorkbenchPreset(value: unknown) {
  return getStructuredLabWorkbenchPreset(
    value,
    svtNervousImmuneResponseWorkbenchPresets[0],
  );
}
