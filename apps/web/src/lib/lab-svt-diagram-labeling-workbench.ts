import type { StructuredLabWorkbenchPreset } from "@bac-bank/contracts/lab";
import { getStructuredLabWorkbenchPreset } from "@/lib/lab-structured-workbench";

export const svtDiagramLabelingWorkbenchPresets: StructuredLabWorkbenchPreset[] = [
  {
    id: "enzyme-active-site-labeling",
    title: "رسم إنزيم وموقع فعال",
    subtitle: "تسمية عناصر الرسم ثم ربط البنية بالتكامل مع الركيزة.",
    bacContext:
      "تتكرر في BAC رسومات بنية البروتين والإنزيم، حيث يطلب من الطالب تسمية عناصر الرسم واستنتاج علاقة البنية بالوظيفة.",
    sourceHint:
      "مستند إلى وثائق الإنزيمات والموقع الفعال في محور تركيب البروتين والبنية الوظيفية.",
    instrument: {
      subjectLabel: "SVT Lab",
      title: "ورشة تسمية الرسوم الحيوية",
    },
    sourceDocuments: [
      {
        id: "enzyme-doc",
        title: "مفتاح قراءة الرسم",
        bullets: [
          "يمثل الشكل إنزيما قبل وبعد ارتباط الركيزة.",
          "يحدث التفاعل عندما تكون الركيزة مكملة للموقع الفعال.",
          "تغير بنية الموقع الفعال يغير النشاط الإنزيمي.",
        ],
      },
    ],
    diagram: {
      title: "إنزيم وركيزة",
      description:
        "استعمل التسميات العلمية الدقيقة للأجزاء الأساسية في الرسم.",
      targets: [
        { id: "enzyme", label: "1", x: 34, y: 58, expectedLabel: "إنزيم", acceptedLabels: ["enzyme"] },
        { id: "active-site", label: "2", x: 48, y: 34, expectedLabel: "موقع فعال", acceptedLabels: ["الموقع الفعال"] },
        { id: "substrate", label: "3", x: 68, y: 30, expectedLabel: "ركيزة", acceptedLabels: ["substrat"] },
        { id: "products", label: "4", x: 76, y: 64, expectedLabel: "نواتج", acceptedLabels: ["produits"] },
      ],
    },
    observationItems: [
      {
        id: "specific-fit",
        label: "الركيزة ترتبط بالموقع الفعال بتكامل شكلي.",
        detail: "التكامل يفسر نوعية النشاط الإنزيمي.",
        kind: "structure",
      },
      {
        id: "active-site-function",
        label: "الموقع الفعال هو جزء من بنية الإنزيم المسؤول عن التفاعل.",
        detail: "هذه تسمية ووظيفة في الوقت نفسه.",
        kind: "label",
      },
      {
        id: "products-after-reaction",
        label: "بعد التفاعل تتحول الركيزة إلى نواتج.",
        detail: "قراءة تسلسل الرسم.",
        kind: "process",
      },
      {
        id: "substrate-is-enzyme",
        label: "الركيزة هي الإنزيم نفسه.",
        detail: "اختيار مضلل: الركيزة جزيء يتثبت على الإنزيم.",
        kind: "distractor",
      },
    ],
    prompt: {
      title: "سمّ الرسم واربط البنية بالوظيفة.",
      task: "أدخل تسميات العناصر، اختر الملاحظات الصحيحة، ثم اكتب خلاصة عن دور الموقع الفعال.",
      requiredObservationIds: [
        "specific-fit",
        "active-site-function",
        "products-after-reaction",
      ],
      requiredConclusionKeywords: ["موقع فعال", "ركيزة", "إنزيم", "تكامل"],
      scaffoldPhrases: [
        "يمتلك الإنزيم موقعا فعالا نوعيا.",
        "ترتبط الركيزة بالموقع الفعال بسبب التكامل الشكلي.",
        "ينتج عن ذلك تحول الركيزة إلى نواتج.",
      ],
    },
  },
  {
    id: "chloroplast-ultrastructure-labeling",
    title: "رسم بلاستيدة خضراء",
    subtitle: "تسمية البنية الداخلية وربطها بمرحلتَي التركيب الضوئي.",
    bacContext:
      "في أسئلة التركيب الضوئي تظهر رسوم البلاستيدة الخضراء مع طلب تسمية الغرانا، الستروما، والأغشية ثم ربطها بمكان حدوث التفاعلات.",
    sourceHint:
      "مستند إلى وثائق الطاقة الخلوية ومكان حدوث التفاعلات الضوئية واللاضوئية.",
    instrument: {
      subjectLabel: "SVT Lab",
      title: "ورشة تسمية الرسوم الحيوية",
    },
    sourceDocuments: [
      {
        id: "chloroplast-doc",
        title: "مفتاح قراءة البلاستيدة",
        bullets: [
          "توجد التفاعلات الضوئية على مستوى أغشية التيلاكويد.",
          "تتم تفاعلات تثبيت CO₂ في الستروما.",
          "الغرانا تراكمات من التيلاكويدات.",
        ],
      },
    ],
    diagram: {
      title: "بنية البلاستيدة الخضراء",
      description:
        "سمّ البنيات الداخلية التي تظهر في الرسم التخطيطي.",
      targets: [
        { id: "outer-membrane", label: "1", x: 24, y: 50, expectedLabel: "غشاء خارجي", acceptedLabels: ["غشاء"] },
        { id: "stroma", label: "2", x: 52, y: 50, expectedLabel: "ستروما", acceptedLabels: ["stroma"] },
        { id: "granum", label: "3", x: 66, y: 32, expectedLabel: "غرانوم", acceptedLabels: ["غرانا"] },
        { id: "thylakoid", label: "4", x: 70, y: 66, expectedLabel: "تيلاكويد", acceptedLabels: ["thylakoid"] },
      ],
    },
    observationItems: [
      {
        id: "light-reactions-thylakoid",
        label: "التفاعلات الضوئية ترتبط بأغشية التيلاكويد.",
        detail: "هذه البنية تحمل أصبغة اليخضور.",
        kind: "location",
      },
      {
        id: "co2-fixation-stroma",
        label: "تثبيت CO₂ يتم في الستروما.",
        detail: "الستروما وسط إنزيمي داخل البلاستيدة.",
        kind: "location",
      },
      {
        id: "grana-are-stacks",
        label: "الغرانا تراكمات من التيلاكويدات.",
        detail: "هذه علاقة بنيوية تساعد على التسمية.",
        kind: "structure",
      },
      {
        id: "mitochondria-site",
        label: "البلاستيدة هي مقر التخمر اللبني.",
        detail: "اختيار مضلل: التخمر لا يحدث في البلاستيدة.",
        kind: "distractor",
      },
    ],
    prompt: {
      title: "سمّ البلاستيدة واربط البنية بالتركيب الضوئي.",
      task: "أكمل التسميات، اختر الملاحظات المدعومة، ثم اكتب خلاصة عن مكان حدوث التفاعلات.",
      requiredObservationIds: [
        "light-reactions-thylakoid",
        "co2-fixation-stroma",
        "grana-are-stacks",
      ],
      requiredConclusionKeywords: ["تيلاكويد", "ستروما", "CO₂", "ضوئية"],
      scaffoldPhrases: [
        "تتم التفاعلات الضوئية على أغشية التيلاكويد.",
        "توجد تفاعلات تثبيت CO₂ في الستروما.",
        "الغرانا تراكمات من التيلاكويدات داخل البلاستيدة.",
      ],
    },
  },
];

export function getSvtDiagramLabelingWorkbenchPreset(value: unknown) {
  return getStructuredLabWorkbenchPreset(
    value,
    svtDiagramLabelingWorkbenchPresets[0],
  );
}
