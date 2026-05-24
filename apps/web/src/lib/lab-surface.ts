import { buildStudentLabToolRoute } from "@/lib/student-routes";

export type LabToolStatus = "READY" | "DRAFT" | "HIDDEN";

export type LabSubjectSlug =
  | "math"
  | "svt"
  | "physics"
  | "technology-civil"
  | "technology-electrical"
  | "technology-mechanical"
  | "technology-process";

export type LabEngineKind =
  | "graph"
  | "table"
  | "diagram-labeling"
  | "document-reasoning"
  | "formula-unit"
  | "sequence-pipeline"
  | "technical-workbench";

export type LabCourseReference = {
  subjectCode: string;
  topicSlug: string;
  conceptSlug?: string;
};

export type LabMissionSupport = {
  supportsMissions: boolean;
  resultKinds: string[];
};

export type LabTool = {
  id: string;
  subjectSlug: LabSubjectSlug;
  subjectTitle: string;
  title: string;
  shortTitle: string;
  description: string;
  bacUseCase: string;
  href: string;
  status: LabToolStatus;
  engineKinds: LabEngineKind[];
  missionSupport: LabMissionSupport;
  relatedCourseRefs: LabCourseReference[];
};

export type LabSubjectGroup = {
  subjectSlug: LabSubjectSlug;
  title: string;
  description: string;
  tools: LabTool[];
  readyToolCount: number;
  draftToolCount: number;
};

export type LabSubjectDefinition = {
  subjectSlug: LabSubjectSlug;
  title: string;
  description: string;
  subjectCodes: string[];
};

type LabToolListOptions = {
  statuses?: readonly LabToolStatus[];
};

const visibleToolStatuses = ["READY", "DRAFT"] as const;
const readyToolStatuses = ["READY"] as const;

export const labSubjects: LabSubjectDefinition[] = [
  {
    subjectSlug: "math",
    title: "Math Lab",
    description: "دوال، جداول، احتمالات، وتمثيلات.",
    subjectCodes: ["MATHEMATICS", "MATH"],
  },
  {
    subjectSlug: "svt",
    title: "SVT Lab",
    description: "آليات حيوية، وثائق، ورسوم تجريبية.",
    subjectCodes: ["NATURAL_SCIENCES", "SVT"],
  },
  {
    subjectSlug: "physics",
    title: "Physics Lab",
    description: "تجارب، منحنيات، دوائر، ووحدات.",
    subjectCodes: ["PHYSICS"],
  },
  {
    subjectSlug: "technology-civil",
    title: "Civil Tech Lab",
    description: "جوائز، تراكيب، مخططات، وجداول إنجاز.",
    subjectCodes: ["TECHNOLOGY_CIVIL"],
  },
  {
    subjectSlug: "technology-electrical",
    title: "Electrical Tech Lab",
    description: "تحكم، GRAFCET، دارات، ومنطق.",
    subjectCodes: ["TECHNOLOGY_ELECTRICAL"],
  },
  {
    subjectSlug: "technology-mechanical",
    title: "Mechanical Tech Lab",
    description: "رسومات، آليات، تسامحات، وتحضير تصنيع.",
    subjectCodes: ["TECHNOLOGY_MECHANICAL"],
  },
  {
    subjectSlug: "technology-process",
    title: "Process Tech Lab",
    description: "تفاعلات، جزيئات، جداول تقدم، ومنحنيات.",
    subjectCodes: ["TECHNOLOGY_PROCESS"],
  },
];

const labSubjectBySlug = new Map(
  labSubjects.map((subject) => [subject.subjectSlug, subject]),
);

const labSubjectByCode = new Map(
  labSubjects.flatMap((subject) =>
    subject.subjectCodes.map((code) => [code, subject] as const),
  ),
);

function getSubjectTitle(subjectSlug: LabSubjectSlug) {
  return labSubjectBySlug.get(subjectSlug)?.title ?? subjectSlug;
}

function makeMissionSupport(
  resultKinds: string[] = [],
): LabMissionSupport {
  return {
    supportsMissions: resultKinds.length > 0,
    resultKinds,
  };
}

export const labTools: LabTool[] = [
  {
    id: "function-explorer",
    subjectSlug: "math",
    subjectTitle: getSubjectTitle("math"),
    title: "مختبر الدوال",
    shortTitle: "Functions Lab",
    description: "جذور، إشارة، تغيرات، ومماس.",
    bacUseCase: "دوال، جذور، إشارة، تغيرات.",
    href: buildStudentLabToolRoute("math", "function-explorer"),
    status: "READY",
    engineKinds: ["graph", "table", "formula-unit"],
    missionSupport: makeMissionSupport([
      "ROOTS_NEAR",
      "SIGN_INTERVALS",
      "VERTEX_NEAR",
    ]),
    relatedCourseRefs: [
      {
        subjectCode: "MATHEMATICS",
        topicSlug: "functions",
      },
    ],
  },
  {
    id: "math-probability-workbench",
    subjectSlug: "math",
    subjectTitle: getSubjectTitle("math"),
    title: "ورشة الاحتمالات",
    shortTitle: "Probability",
    description: "شجرات، جداول قانون احتمال، واحتمال شرطي.",
    bacUseCase: "إكمال شجرة الاحتمالات، قانون X، وحساب E(X).",
    href: buildStudentLabToolRoute("math", "probability-workbench"),
    status: "READY",
    engineKinds: ["table", "document-reasoning"],
    missionSupport: makeMissionSupport(["TABLE_CELLS"]),
    relatedCourseRefs: [
      {
        subjectCode: "MATHEMATICS",
        topicSlug: "probability",
        conceptSlug: "probability-modeling",
      },
      {
        subjectCode: "MATH",
        topicSlug: "probability",
        conceptSlug: "probability-modeling",
      },
    ],
  },
  {
    id: "math-sequences-workbench",
    subjectSlug: "math",
    subjectTitle: getSubjectTitle("math"),
    title: "ورشة المتتاليات",
    shortTitle: "Sequences",
    description: "حدود، علاقة تراجعية، رتابة، وتحويل هندسي.",
    bacUseCase: "حساب u₁ و u₂، دراسة الرتابة، وقراءة النهاية.",
    href: buildStudentLabToolRoute("math", "sequences-workbench"),
    status: "READY",
    engineKinds: ["table", "graph", "document-reasoning"],
    missionSupport: makeMissionSupport(["TABLE_CELLS"]),
    relatedCourseRefs: [
      {
        subjectCode: "MATHEMATICS",
        topicSlug: "sequences",
        conceptSlug: "sequence-proof",
      },
      {
        subjectCode: "MATH",
        topicSlug: "sequences",
        conceptSlug: "sequence-proof",
      },
    ],
  },
  {
    id: "math-geometry-complex-plane",
    subjectSlug: "math",
    subjectTitle: getSubjectTitle("math"),
    title: "ورشة الهندسة والمستوى المركب",
    shortTitle: "Geometry & Complex",
    description: "نقاط، لواحق، متجهات، مسافات، وتحويلات.",
    bacUseCase: "الشكل المثلثي، الدوائر، الاستقامية، والترجمات.",
    href: buildStudentLabToolRoute("math", "geometry-complex-plane"),
    status: "READY",
    engineKinds: ["diagram-labeling", "table", "formula-unit"],
    missionSupport: makeMissionSupport(["TABLE_CELLS"]),
    relatedCourseRefs: [
      {
        subjectCode: "MATHEMATICS",
        topicSlug: "complex-numbers",
        conceptSlug: "complex-number-manipulation",
      },
      {
        subjectCode: "MATHEMATICS",
        topicSlug: "space-geometry",
        conceptSlug: "space-reasoning",
      },
      {
        subjectCode: "MATH",
        topicSlug: "complex-numbers",
        conceptSlug: "complex-number-manipulation",
      },
    ],
  },
  {
    id: "dna-to-protein",
    subjectSlug: "svt",
    subjectTitle: getSubjectTitle("svt"),
    title: "من DNA إلى بروتين",
    shortTitle: "DNA to Protein",
    description: "نسخ، ترجمة، طفرة.",
    bacUseCase: "تركيب البروتين وأثر الطفرة.",
    href: buildStudentLabToolRoute("svt", "dna-to-protein"),
    status: "READY",
    engineKinds: ["sequence-pipeline", "table"],
    missionSupport: makeMissionSupport(["MRNA_AND_CODONS", "MUTATION_EFFECT"]),
    relatedCourseRefs: [
      {
        subjectCode: "NATURAL_SCIENCES",
        topicSlug: "proteins",
        conceptSlug: "dna-instruction",
      },
      {
        subjectCode: "NATURAL_SCIENCES",
        topicSlug: "proteins",
        conceptSlug: "transcription-working-copy",
      },
      {
        subjectCode: "NATURAL_SCIENCES",
        topicSlug: "proteins",
        conceptSlug: "genetic-code",
      },
      {
        subjectCode: "NATURAL_SCIENCES",
        topicSlug: "proteins",
        conceptSlug: "translation-chain",
      },
    ],
  },
  {
    id: "svt-document-workbench",
    subjectSlug: "svt",
    subjectTitle: getSubjectTitle("svt"),
    title: "ورشة الوثائق والمنحنيات",
    shortTitle: "SVT Documents",
    description: "قراءة وثائق، اختيار أدلة، وبناء استنتاج.",
    bacUseCase: "أسئلة الوثائق، الجداول، والمنحنيات الحيوية.",
    href: buildStudentLabToolRoute("svt", "document-workbench"),
    status: "READY",
    engineKinds: ["document-reasoning", "graph", "table", "diagram-labeling"],
    missionSupport: makeMissionSupport([
      "DOCUMENT_EVIDENCE",
      "GRAPH_POINT",
      "TABLE_CELLS",
    ]),
    relatedCourseRefs: [
      {
        subjectCode: "NATURAL_SCIENCES",
        topicSlug: "proteins",
        conceptSlug: "mutation-to-function",
      },
      {
        subjectCode: "NATURAL_SCIENCES",
        topicSlug: "proteins",
        conceptSlug: "synthesis-to-structure-bridge",
      },
    ],
  },
  {
    id: "svt-experimental-graph-table",
    subjectSlug: "svt",
    subjectTitle: getSubjectTitle("svt"),
    title: "ورشة المنحنيات والجداول التجريبية",
    shortTitle: "Experimental Graphs",
    description: "تجارب، جداول، منحنيات، واستنتاج علمي.",
    bacUseCase: "النشاط الإنزيمي، قراءة القيم، مقارنة الشواهد، وتفسير المنحنيات.",
    href: buildStudentLabToolRoute("svt", "experimental-graph-table"),
    status: "READY",
    engineKinds: ["graph", "table", "document-reasoning"],
    missionSupport: makeMissionSupport(["SVT_EXPERIMENTAL_GRAPH_TABLE"]),
    relatedCourseRefs: [
      {
        subjectCode: "NATURAL_SCIENCES",
        topicSlug: "proteins",
        conceptSlug: "enzyme-conditions",
      },
      {
        subjectCode: "NATURAL_SCIENCES",
        topicSlug: "proteins",
        conceptSlug: "enzyme-activity-graphs",
      },
    ],
  },
  {
    id: "svt-diagram-labeling-workbench",
    subjectSlug: "svt",
    subjectTitle: getSubjectTitle("svt"),
    title: "ورشة تسمية الرسوم الحيوية",
    shortTitle: "Diagram Labeling",
    description: "مواقع فعالة، عضيات، وبنيات حيوية.",
    bacUseCase: "تسمية رسم SVT وربط البنية بالوظيفة.",
    href: buildStudentLabToolRoute("svt", "diagram-labeling-workbench"),
    status: "READY",
    engineKinds: ["diagram-labeling", "document-reasoning"],
    missionSupport: makeMissionSupport(["DIAGRAM_LABELS"]),
    relatedCourseRefs: [
      {
        subjectCode: "NATURAL_SCIENCES",
        topicSlug: "proteins",
        conceptSlug: "biological-diagram-labeling",
      },
      {
        subjectCode: "NATURAL_SCIENCES",
        topicSlug: "photosynthesis",
        conceptSlug: "biological-diagram-labeling",
      },
    ],
  },
  {
    id: "svt-energy-metabolism-workbench",
    subjectSlug: "svt",
    subjectTitle: getSubjectTitle("svt"),
    title: "ورشة الطاقة الخلوية",
    shortTitle: "Energy Metabolism",
    description: "تركيب ضوئي، تنفس، تخمر، وATP.",
    bacUseCase: "تحليل تبادل الغازات ومقارنة مردود المسارات الطاقوية.",
    href: buildStudentLabToolRoute("svt", "energy-metabolism-workbench"),
    status: "READY",
    engineKinds: ["graph", "table", "document-reasoning", "formula-unit"],
    missionSupport: makeMissionSupport(["TABLE_CELLS", "FORMULA_VALUE"]),
    relatedCourseRefs: [
      {
        subjectCode: "NATURAL_SCIENCES",
        topicSlug: "photosynthesis",
        conceptSlug: "energy-metabolism",
      },
      {
        subjectCode: "NATURAL_SCIENCES",
        topicSlug: "respiration-fermentation",
        conceptSlug: "energy-metabolism",
      },
    ],
  },
  {
    id: "svt-nervous-immune-response-workbench",
    subjectSlug: "svt",
    subjectTitle: getSubjectTitle("svt"),
    title: "ورشة الاستجابة العصبية والمناعية",
    shortTitle: "Responses",
    description: "منعكسات، مشابك، خلايا مناعية، وأجسام مضادة.",
    bacUseCase: "تسمية سلاسل الاستجابة وربط العناصر بالوظيفة.",
    href: buildStudentLabToolRoute(
      "svt",
      "nervous-immune-response-workbench",
    ),
    status: "READY",
    engineKinds: ["diagram-labeling", "document-reasoning"],
    missionSupport: makeMissionSupport(["DIAGRAM_LABELS"]),
    relatedCourseRefs: [
      {
        subjectCode: "NATURAL_SCIENCES",
        topicSlug: "nervous-system",
        conceptSlug: "response-chain",
      },
      {
        subjectCode: "NATURAL_SCIENCES",
        topicSlug: "immunity",
        conceptSlug: "response-chain",
      },
    ],
  },
  {
    id: "svt-tectonics-workbench",
    subjectSlug: "svt",
    subjectTitle: getSubjectTitle("svt"),
    title: "ورشة التكتونية",
    shortTitle: "Tectonics",
    description: "خرائط، مقاطع، زلازل، وحركة صفائح.",
    bacUseCase: "تفسير الاندساس وحساب سرعة الاتساع من وثائق جيولوجية.",
    href: buildStudentLabToolRoute("svt", "tectonics-workbench"),
    status: "READY",
    engineKinds: ["diagram-labeling", "table", "formula-unit"],
    missionSupport: makeMissionSupport(["DIAGRAM_LABELS", "FORMULA_VALUE"]),
    relatedCourseRefs: [
      {
        subjectCode: "NATURAL_SCIENCES",
        topicSlug: "plate-tectonics",
        conceptSlug: "geological-interpretation",
      },
      {
        subjectCode: "NATURAL_SCIENCES",
        topicSlug: "plate-activity",
        conceptSlug: "geological-interpretation",
      },
    ],
  },
  {
    id: "physics-experiment-graphs",
    subjectSlug: "physics",
    subjectTitle: getSubjectTitle("physics"),
    title: "منحنيات التجربة",
    shortTitle: "Experiment Graphs",
    description: "ميل، ثابت زمني، وحدات، واستنتاج تجريبي.",
    bacUseCase: "دوائر، حركية، معايرة، وقراءة منحنيات فيزياء.",
    href: buildStudentLabToolRoute("physics", "experiment-graphs"),
    status: "READY",
    engineKinds: ["graph", "table", "formula-unit", "document-reasoning"],
    missionSupport: makeMissionSupport([
      "TABLE_CELLS",
    ]),
    relatedCourseRefs: [
      {
        subjectCode: "PHYSICS",
        topicSlug: "electricity",
        conceptSlug: "circuit-transient-analysis",
      },
      {
        subjectCode: "PHYSICS",
        topicSlug: "mechanics",
        conceptSlug: "mechanics-reasoning",
      },
    ],
  },
  {
    id: "physics-circuits-workbench",
    subjectSlug: "physics",
    subjectTitle: getSubjectTitle("physics"),
    title: "ورشة الدارات الكهربائية",
    shortTitle: "Circuits",
    description: "RC/RL، مخططات، ثابت الزمن، ووحدات.",
    bacUseCase: "تسمية الدارة، قراءة τ، وحساب C أو L بوحدة صحيحة.",
    href: buildStudentLabToolRoute("physics", "circuits-workbench"),
    status: "READY",
    engineKinds: ["diagram-labeling", "table", "formula-unit"],
    missionSupport: makeMissionSupport([
      "DIAGRAM_LABELS",
      "TABLE_CELLS",
      "FORMULA_VALUE",
    ]),
    relatedCourseRefs: [
      {
        subjectCode: "PHYSICS",
        topicSlug: "electricity",
        conceptSlug: "circuit-transient-analysis",
      },
    ],
  },
  {
    id: "physics-mechanics-workbench",
    subjectSlug: "physics",
    subjectTitle: getSubjectTitle("physics"),
    title: "ورشة الميكانيك",
    shortTitle: "Mechanics",
    description: "قوى، حركة، ميل منحنى، واهتزازات.",
    bacUseCase: "تمثيل القوى، استخراج التسارع، وتطبيق علاقات الميكانيك.",
    href: buildStudentLabToolRoute("physics", "mechanics-workbench"),
    status: "READY",
    engineKinds: ["diagram-labeling", "graph", "table", "formula-unit"],
    missionSupport: makeMissionSupport([
      "DIAGRAM_LABELS",
      "TABLE_CELLS",
      "FORMULA_VALUE",
    ]),
    relatedCourseRefs: [
      {
        subjectCode: "PHYSICS",
        topicSlug: "mechanics",
        conceptSlug: "mechanics-reasoning",
      },
    ],
  },
  {
    id: "physics-chemistry-reaction-workbench",
    subjectSlug: "physics",
    subjectTitle: getSubjectTitle("physics"),
    title: "ورشة الكيمياء والتفاعلات",
    shortTitle: "Chemistry",
    description: "معايرة، جداول تقدم، منحنيات، وتركيز.",
    bacUseCase: "قراءة منحنى معايرة، حساب تركيز، وإكمال جدول تقدم.",
    href: buildStudentLabToolRoute("physics", "chemistry-reaction-workbench"),
    status: "READY",
    engineKinds: ["diagram-labeling", "graph", "table", "formula-unit"],
    missionSupport: makeMissionSupport([
      "DIAGRAM_LABELS",
      "TABLE_CELLS",
      "FORMULA_VALUE",
    ]),
    relatedCourseRefs: [
      {
        subjectCode: "PHYSICS",
        topicSlug: "chemistry",
        conceptSlug: "reaction-advancement",
      },
      {
        subjectCode: "PHYSICS",
        topicSlug: "chemistry",
        conceptSlug: "titration-analysis",
      },
    ],
  },
  {
    id: "technology-civil-beam-statics",
    subjectSlug: "technology-civil",
    subjectTitle: getSubjectTitle("technology-civil"),
    title: "تحليل الجوائز",
    shortTitle: "Beam Statics",
    description: "ردود أفعال، مخططات قوى، وجداول مقاطع.",
    bacUseCase: "الميكانيك المطبقة، الانحناء، والجداول المدنية.",
    href: buildStudentLabToolRoute("technology-civil", "beam-statics"),
    status: "READY",
    engineKinds: ["diagram-labeling", "graph", "table", "formula-unit"],
    missionSupport: makeMissionSupport([
      "DIAGRAM_LABELS",
      "GRAPH_POINT",
      "FORMULA_VALUE",
    ]),
    relatedCourseRefs: [
      {
        subjectCode: "TECHNOLOGY_CIVIL",
        topicSlug: "beam-statics",
        conceptSlug: "reactions-and-bending",
      },
    ],
  },
  {
    id: "technology-civil-structures-materials",
    subjectSlug: "technology-civil",
    subjectTitle: getSubjectTitle("technology-civil"),
    title: "ورشة المنشآت والمواد",
    shortTitle: "Structures",
    description: "مقاطع، خرسانة مسلحة، فولاذ، وإجهادات.",
    bacUseCase: "قراءة مقطع وجداول مواد ثم حساب مساحة أو إجهاد.",
    href: buildStudentLabToolRoute(
      "technology-civil",
      "structures-materials",
    ),
    status: "READY",
    engineKinds: ["diagram-labeling", "table", "formula-unit"],
    missionSupport: makeMissionSupport([
      "DIAGRAM_LABELS",
      "TABLE_CELLS",
      "FORMULA_VALUE",
    ]),
    relatedCourseRefs: [
      {
        subjectCode: "TECHNOLOGY_CIVIL",
        topicSlug: "reinforced-concrete",
        conceptSlug: "section-material-check",
      },
      {
        subjectCode: "TECHNOLOGY_CIVIL",
        topicSlug: "applied-mechanics-tests",
        conceptSlug: "section-material-check",
      },
    ],
  },
  {
    id: "technology-civil-technical-sheet",
    subjectSlug: "technology-civil",
    subjectTitle: getSubjectTitle("technology-civil"),
    title: "ورشة البطاقة التقنية المدنية",
    shortTitle: "Technical Sheet",
    description: "مخططات، كميات، مراحل إنجاز، وملف إجابة.",
    bacUseCase: "استخراج كميات وترتيب خطوات إنجاز من بطاقة تقنية.",
    href: buildStudentLabToolRoute("technology-civil", "technical-sheet"),
    status: "READY",
    engineKinds: ["diagram-labeling", "table", "formula-unit", "technical-workbench"],
    missionSupport: makeMissionSupport([
      "DIAGRAM_LABELS",
      "TABLE_CELLS",
      "FORMULA_VALUE",
    ]),
    relatedCourseRefs: [
      {
        subjectCode: "TECHNOLOGY_CIVIL",
        topicSlug: "building-structure",
        conceptSlug: "technical-sheet-workflow",
      },
      {
        subjectCode: "TECHNOLOGY_CIVIL",
        topicSlug: "cad-drawing",
        conceptSlug: "technical-sheet-workflow",
      },
    ],
  },
  {
    id: "technology-electrical-control-logic",
    subjectSlug: "technology-electrical",
    subjectTitle: getSubjectTitle("technology-electrical"),
    title: "التحكم والمنطق",
    shortTitle: "Control Logic",
    description: "GRAFCET، جداول صدق، خرائط Karnaugh، وكرونوغرام.",
    bacUseCase: "ملفات تقنية، منطق تسلسلي، ودارات تحكم.",
    href: buildStudentLabToolRoute("technology-electrical", "control-logic"),
    status: "READY",
    engineKinds: ["table", "diagram-labeling", "technical-workbench"],
    missionSupport: makeMissionSupport(["TABLE_CELLS", "DIAGRAM_LABELS"]),
    relatedCourseRefs: [
      {
        subjectCode: "TECHNOLOGY_ELECTRICAL",
        topicSlug: "automation-grafcet-gemma",
        conceptSlug: "logic-grafcet-workflow",
      },
      {
        subjectCode: "TECHNOLOGY_ELECTRICAL",
        topicSlug: "sequential-logic",
        conceptSlug: "logic-grafcet-workflow",
      },
    ],
  },
  {
    id: "technology-electrical-circuits-chronograms",
    subjectSlug: "technology-electrical",
    subjectTitle: getSubjectTitle("technology-electrical"),
    title: "ورشة الدارات والكرونوغرامات",
    shortTitle: "Circuits & Timing",
    description: "مرحلات، تلامسات، مؤقتات، وإشارات زمنية.",
    bacUseCase: "قراءة مخطط كهربائي وإكمال كرونوغرام خرج.",
    href: buildStudentLabToolRoute(
      "technology-electrical",
      "circuits-chronograms",
    ),
    status: "READY",
    engineKinds: ["diagram-labeling", "table", "graph", "technical-workbench"],
    missionSupport: makeMissionSupport(["DIAGRAM_LABELS", "TABLE_CELLS"]),
    relatedCourseRefs: [
      {
        subjectCode: "TECHNOLOGY_ELECTRICAL",
        topicSlug: "electrical-machines-actuators",
        conceptSlug: "circuits-chronograms",
      },
      {
        subjectCode: "TECHNOLOGY_ELECTRICAL",
        topicSlug: "automation-grafcet-gemma",
        conceptSlug: "circuits-chronograms",
      },
    ],
  },
  {
    id: "technology-electrical-technical-file",
    subjectSlug: "technology-electrical",
    subjectTitle: getSubjectTitle("technology-electrical"),
    title: "ورشة الملف التقني الكهربائي",
    shortTitle: "Technical File",
    description: "مكونات، بطاقات محرك، حماية، وملف إجابة.",
    bacUseCase: "تعريف مكونات ملف كهربائي وحساب تيار/حماية من بطاقة تقنية.",
    href: buildStudentLabToolRoute("technology-electrical", "technical-file"),
    status: "READY",
    engineKinds: [
      "diagram-labeling",
      "table",
      "formula-unit",
      "technical-workbench",
    ],
    missionSupport: makeMissionSupport([
      "DIAGRAM_LABELS",
      "TABLE_CELLS",
      "FORMULA_VALUE",
    ]),
    relatedCourseRefs: [
      {
        subjectCode: "TECHNOLOGY_ELECTRICAL",
        topicSlug: "electrical-machines-actuators",
        conceptSlug: "technical-file-workflow",
      },
      {
        subjectCode: "TECHNOLOGY_ELECTRICAL",
        topicSlug: "project",
        conceptSlug: "technical-file-workflow",
      },
    ],
  },
  {
    id: "technology-mechanical-drawing-workbench",
    subjectSlug: "technology-mechanical",
    subjectTitle: getSubjectTitle("technology-mechanical"),
    title: "ورشة الرسم الميكانيكي",
    shortTitle: "Drawing Workbench",
    description: "رسم تجميعي، مدونة قطع، مقاطع، سماحات، وخشونة.",
    bacUseCase: "قراءة رسوم التجميع والتعريف وإكمال مدونة أو مقطع.",
    href: buildStudentLabToolRoute(
      "technology-mechanical",
      "drawing-workbench",
    ),
    status: "READY",
    engineKinds: ["diagram-labeling", "table", "document-reasoning"],
    missionSupport: makeMissionSupport([
      "DIAGRAM_LABELS",
      "TABLE_CELLS",
      "DOCUMENT_EVIDENCE",
    ]),
    relatedCourseRefs: [
      {
        subjectCode: "TECHNOLOGY_MECHANICAL",
        topicSlug: "functional-analysis",
        conceptSlug: "assembly-nomenclature",
      },
      {
        subjectCode: "TECHNOLOGY_MECHANICAL",
        topicSlug: "manufacturing-preparation",
        conceptSlug: "definition-drawing",
      },
    ],
  },
  {
    id: "technology-mechanical-mechanism-kinematics",
    subjectSlug: "technology-mechanical",
    subjectTitle: getSubjectTitle("technology-mechanical"),
    title: "ورشة الآليات والحركيات",
    shortTitle: "Mechanisms",
    description: "نسب نقل، تروس، تحويل حركة، وسرعات/إزاحات.",
    bacUseCase: "تحليل آلية وحساب سرعة خرج أو إزاحة من معطيات تقنية.",
    href: buildStudentLabToolRoute(
      "technology-mechanical",
      "mechanism-kinematics",
    ),
    status: "READY",
    engineKinds: [
      "diagram-labeling",
      "table",
      "formula-unit",
      "technical-workbench",
    ],
    missionSupport: makeMissionSupport([
      "DIAGRAM_LABELS",
      "TABLE_CELLS",
      "FORMULA_VALUE",
    ]),
    relatedCourseRefs: [
      {
        subjectCode: "TECHNOLOGY_MECHANICAL",
        topicSlug: "motion-transmission-conversion",
        conceptSlug: "speed-ratio",
      },
      {
        subjectCode: "TECHNOLOGY_MECHANICAL",
        topicSlug: "motion-transmission-conversion",
        conceptSlug: "motion-conversion",
      },
    ],
  },
  {
    id: "technology-mechanical-manufacturing-tolerances",
    subjectSlug: "technology-mechanical",
    subjectTitle: getSubjectTitle("technology-mechanical"),
    title: "ورشة التصنيع والتسامحات",
    shortTitle: "Manufacturing",
    description: "تحضير تصنيع، عمليات، أدوات مراقبة، وتساميحات/تلاؤم.",
    bacUseCase: "إكمال جدول وسائل الصنع وحساب خلوص ملاءمة من حدود الرسم.",
    href: buildStudentLabToolRoute(
      "technology-mechanical",
      "manufacturing-tolerances",
    ),
    status: "READY",
    engineKinds: ["table", "formula-unit", "document-reasoning"],
    missionSupport: makeMissionSupport([
      "TABLE_CELLS",
      "FORMULA_VALUE",
      "DOCUMENT_EVIDENCE",
    ]),
    relatedCourseRefs: [
      {
        subjectCode: "TECHNOLOGY_MECHANICAL",
        topicSlug: "manufacturing-preparation",
        conceptSlug: "process-sheet",
      },
      {
        subjectCode: "TECHNOLOGY_MECHANICAL",
        topicSlug: "manufacturing-preparation",
        conceptSlug: "fits-and-tolerances",
      },
    ],
  },
  {
    id: "technology-process-reaction-workbench",
    subjectSlug: "technology-process",
    subjectTitle: getSubjectTitle("technology-process"),
    title: "ورشة مخططات التفاعل",
    shortTitle: "Reaction Workbench",
    description: "أسترة، بلمرة، عائلات عضوية، شروط، ونواتج.",
    bacUseCase: "قراءة مخطط تفاعلات وتحديد المتفاعلات والنواتج والوسيط.",
    href: buildStudentLabToolRoute(
      "technology-process",
      "reaction-workbench",
    ),
    status: "READY",
    engineKinds: ["diagram-labeling", "table", "document-reasoning"],
    missionSupport: makeMissionSupport([
      "TABLE_CELLS",
      "DIAGRAM_LABELS",
      "DOCUMENT_EVIDENCE",
    ]),
    relatedCourseRefs: [
      {
        subjectCode: "TECHNOLOGY_PROCESS",
        topicSlug: "oxygenated-functions",
        conceptSlug: "esterification-scheme",
      },
      {
        subjectCode: "TECHNOLOGY_PROCESS",
        topicSlug: "polymers",
        conceptSlug: "polymerization-scheme",
      },
    ],
  },
  {
    id: "technology-process-material-balance-advancement",
    subjectSlug: "technology-process",
    subjectTitle: getSubjectTitle("technology-process"),
    title: "ورشة الموازنة والتقدم",
    shortTitle: "Balance",
    description: "مردود، كتل، جداول تقدم، ومتفاعل محد.",
    bacUseCase: "حساب كمية/كتلة إنتاج وإكمال جدول تقدم تفاعل.",
    href: buildStudentLabToolRoute(
      "technology-process",
      "material-balance-advancement",
    ),
    status: "READY",
    engineKinds: ["table", "formula-unit", "document-reasoning"],
    missionSupport: makeMissionSupport([
      "TABLE_CELLS",
      "FORMULA_VALUE",
      "DOCUMENT_EVIDENCE",
    ]),
    relatedCourseRefs: [
      {
        subjectCode: "TECHNOLOGY_PROCESS",
        topicSlug: "oxygenated-functions",
        conceptSlug: "yield-balance",
      },
      {
        subjectCode: "TECHNOLOGY_PROCESS",
        topicSlug: "chemical-kinetics",
        conceptSlug: "advancement-table",
      },
    ],
  },
  {
    id: "technology-process-flow-instrumentation",
    subjectSlug: "technology-process",
    subjectTitle: getSubjectTitle("technology-process"),
    title: "ورشة الجريان والقياس",
    shortTitle: "Flow & Instruments",
    description: "PFD، تجهيزات، تيارات، رموز قياس، وتحكم.",
    bacUseCase: "قراءة مخطط جهاز/وحدة وربط الرموز بالوظائف التشغيلية.",
    href: buildStudentLabToolRoute(
      "technology-process",
      "flow-instrumentation",
    ),
    status: "READY",
    engineKinds: ["diagram-labeling", "table", "document-reasoning"],
    missionSupport: makeMissionSupport([
      "DIAGRAM_LABELS",
      "TABLE_CELLS",
      "DOCUMENT_EVIDENCE",
    ]),
    relatedCourseRefs: [
      {
        subjectCode: "TECHNOLOGY_PROCESS",
        topicSlug: "thermodynamics",
        conceptSlug: "process-flow-diagram",
      },
      {
        subjectCode: "TECHNOLOGY_PROCESS",
        topicSlug: "chemical-kinetics",
        conceptSlug: "instrumentation-control",
      },
    ],
  },
  {
    id: "lab-engine-sandbox",
    subjectSlug: "math",
    subjectTitle: getSubjectTitle("math"),
    title: "مختبر داخلي",
    shortTitle: "Sandbox",
    description: "أداة داخلية لتجريب محركات المختبر.",
    bacUseCase: "غير منشور للطلاب.",
    href: buildStudentLabToolRoute("math", "lab-engine-sandbox"),
    status: "HIDDEN",
    engineKinds: ["graph", "table"],
    missionSupport: makeMissionSupport(),
    relatedCourseRefs: [],
  },
];

export function subjectCodeToLabSlug(
  subjectCode: string | null | undefined,
): LabSubjectSlug | null {
  const normalizedSubjectCode = subjectCode?.trim().toUpperCase();

  return normalizedSubjectCode
    ? labSubjectByCode.get(normalizedSubjectCode)?.subjectSlug ?? null
    : null;
}

function hasRequestedStatus(tool: LabTool, statuses: readonly LabToolStatus[]) {
  return statuses.includes(tool.status);
}

export function listLabTools(options: LabToolListOptions = {}) {
  const statuses = options.statuses ?? visibleToolStatuses;

  return labTools.filter((tool) => hasRequestedStatus(tool, statuses));
}

export function listReadyLabTools() {
  return listLabTools({ statuses: readyToolStatuses });
}

export function listLabToolsForSubjectSlug(
  subjectSlug: LabSubjectSlug,
  options: LabToolListOptions = {},
) {
  const statuses = options.statuses ?? readyToolStatuses;

  return labTools.filter(
    (tool) =>
      tool.subjectSlug === subjectSlug && hasRequestedStatus(tool, statuses),
  );
}

export function listLabToolsForSubjectCode(
  subjectCode: string | null | undefined,
  options: LabToolListOptions = {},
) {
  const subjectSlug = subjectCodeToLabSlug(subjectCode);

  return subjectSlug
    ? listLabToolsForSubjectSlug(subjectSlug, options)
    : [];
}

export function getLabToolById(toolId: string): LabTool | null {
  return labTools.find((tool) => tool.id === toolId) ?? null;
}

export function getLabToolBySlug(toolSlug: string): LabTool | null {
  return (
    labTools.find((tool) => {
      const hrefSlug = tool.href.split("/").filter(Boolean).at(-1);

      return tool.id === toolSlug || hrefSlug === toolSlug;
    }) ?? null
  );
}

export function listLabSubjectGroups(input?: {
  subjectSlug?: LabSubjectSlug | null;
  statuses?: readonly LabToolStatus[];
}): LabSubjectGroup[] {
  const statuses = input?.statuses ?? visibleToolStatuses;
  const subjects = input?.subjectSlug
    ? labSubjects.filter((subject) => subject.subjectSlug === input.subjectSlug)
    : labSubjects;

  return subjects.map((subject) => {
    const tools = listLabToolsForSubjectSlug(subject.subjectSlug, {
      statuses,
    });
    const readyToolCount = listLabToolsForSubjectSlug(subject.subjectSlug, {
      statuses: readyToolStatuses,
    }).length;
    const draftToolCount = listLabToolsForSubjectSlug(subject.subjectSlug, {
      statuses: ["DRAFT"],
    }).length;

    return {
      subjectSlug: subject.subjectSlug,
      title: subject.title,
      description: subject.description,
      tools,
      readyToolCount,
      draftToolCount,
    };
  });
}

export function getLabToolsForCourseConcept(input: {
  subjectCode: string;
  topicSlug: string;
  conceptSlug?: string | null;
}): LabTool[] {
  const normalizedSubjectCode = input.subjectCode.trim().toUpperCase();
  const normalizedTopicSlug = input.topicSlug.trim();
  const normalizedConceptSlug = input.conceptSlug?.trim() || null;

  return listReadyLabTools().filter((tool) =>
    tool.relatedCourseRefs.some((reference) => {
      if (
        reference.subjectCode !== normalizedSubjectCode ||
        reference.topicSlug !== normalizedTopicSlug
      ) {
        return false;
      }

      return (
        !reference.conceptSlug ||
        reference.conceptSlug === normalizedConceptSlug
      );
    }),
  );
}
