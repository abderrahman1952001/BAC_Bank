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
    id: "physics-experiment-graphs",
    subjectSlug: "physics",
    subjectTitle: getSubjectTitle("physics"),
    title: "منحنيات التجربة",
    shortTitle: "Experiment Graphs",
    description: "ميل، ثابت زمني، وحدات، واستنتاج تجريبي.",
    bacUseCase: "دوائر، حركية، معايرة، وقراءة منحنيات فيزياء.",
    href: buildStudentLabToolRoute("physics", "experiment-graphs"),
    status: "DRAFT",
    engineKinds: ["graph", "table", "formula-unit", "document-reasoning"],
    missionSupport: makeMissionSupport([
      "GRAPH_POINT",
      "TABLE_CELLS",
      "FORMULA_VALUE",
    ]),
    relatedCourseRefs: [],
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
    status: "DRAFT",
    engineKinds: ["diagram-labeling", "graph", "table", "formula-unit"],
    missionSupport: makeMissionSupport([
      "DIAGRAM_LABELS",
      "GRAPH_POINT",
      "FORMULA_VALUE",
    ]),
    relatedCourseRefs: [],
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
    status: "DRAFT",
    engineKinds: ["table", "diagram-labeling", "technical-workbench"],
    missionSupport: makeMissionSupport(["TABLE_CELLS", "DIAGRAM_LABELS"]),
    relatedCourseRefs: [],
  },
  {
    id: "technology-mechanical-drawing-workbench",
    subjectSlug: "technology-mechanical",
    subjectTitle: getSubjectTitle("technology-mechanical"),
    title: "ورشة الرسم والآليات",
    shortTitle: "Drawing Workbench",
    description: "تسمية أجزاء، قراءة مقاطع، وتسلسل تصنيع.",
    bacUseCase: "رسوم تجميع، nomenclature، تسامحات، وتحضير مشروع.",
    href: buildStudentLabToolRoute(
      "technology-mechanical",
      "drawing-workbench",
    ),
    status: "DRAFT",
    engineKinds: ["diagram-labeling", "table", "document-reasoning"],
    missionSupport: makeMissionSupport([
      "DIAGRAM_LABELS",
      "TABLE_CELLS",
      "DOCUMENT_EVIDENCE",
    ]),
    relatedCourseRefs: [],
  },
  {
    id: "technology-process-reaction-workbench",
    subjectSlug: "technology-process",
    subjectTitle: getSubjectTitle("technology-process"),
    title: "ورشة التفاعلات",
    shortTitle: "Reaction Workbench",
    description: "جزيئات، جداول تقدم، مردود، ومنحنيات.",
    bacUseCase: "هندسة الطرائق، العضوية، الحركية، والترموديناميك.",
    href: buildStudentLabToolRoute(
      "technology-process",
      "reaction-workbench",
    ),
    status: "DRAFT",
    engineKinds: ["formula-unit", "table", "graph", "document-reasoning"],
    missionSupport: makeMissionSupport([
      "FORMULA_VALUE",
      "TABLE_CELLS",
      "GRAPH_POINT",
    ]),
    relatedCourseRefs: [],
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
