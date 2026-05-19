import { buildStudentLabToolRoute } from "@/lib/student-routes";

export type LabToolStatus = "READY";

export type LabSubjectSlug = "math" | "svt";

export type LabCourseReference = {
  subjectCode: string;
  topicSlug: string;
  conceptSlug?: string;
};

export type LabTool = {
  id: "function-explorer" | "dna-to-protein";
  subjectSlug: LabSubjectSlug;
  subjectTitle: string;
  title: string;
  shortTitle: string;
  description: string;
  bacUseCase: string;
  href: string;
  status: LabToolStatus;
  relatedCourseRefs: LabCourseReference[];
};

export type LabSubjectGroup = {
  subjectSlug: LabSubjectSlug;
  title: string;
  description: string;
  tools: LabTool[];
};

export const labTools: LabTool[] = [
  {
    id: "function-explorer",
    subjectSlug: "math",
    subjectTitle: "Math Lab",
    title: "مختبر الدوال",
    shortTitle: "Functions Lab",
    description: "جذور، إشارة، تغيرات، ومماس.",
    bacUseCase: "دوال، جذور، إشارة، تغيرات.",
    href: buildStudentLabToolRoute("math", "function-explorer"),
    status: "READY",
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
    subjectTitle: "SVT Lab",
    title: "من DNA إلى بروتين",
    shortTitle: "DNA to Protein",
    description: "نسخ، ترجمة، طفرة.",
    bacUseCase: "تركيب البروتين وأثر الطفرة.",
    href: buildStudentLabToolRoute("svt", "dna-to-protein"),
    status: "READY",
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
];

const labSubjectDescriptions: Record<LabSubjectSlug, string> = {
  math: "دوال وتمثيلات.",
  svt: "آليات ووثائق.",
};

export function subjectCodeToLabSlug(
  subjectCode: string | null | undefined,
): LabSubjectSlug | null {
  switch (subjectCode?.trim().toUpperCase()) {
    case "MATHEMATICS":
    case "MATH":
      return "math";
    case "NATURAL_SCIENCES":
    case "SVT":
      return "svt";
    default:
      return null;
  }
}

export function listLabToolsForSubjectCode(
  subjectCode: string | null | undefined,
) {
  const subjectSlug = subjectCodeToLabSlug(subjectCode);

  return subjectSlug
    ? labTools.filter((tool) => tool.subjectSlug === subjectSlug)
    : [];
}

export function getLabToolById(toolId: LabTool["id"]): LabTool | null {
  return labTools.find((tool) => tool.id === toolId) ?? null;
}

export function getLabToolBySlug(toolSlug: string): LabTool | null {
  return labTools.find((tool) => tool.id === toolSlug) ?? null;
}

export function listLabSubjectGroups(): LabSubjectGroup[] {
  const groups = new Map<LabSubjectSlug, LabSubjectGroup>();

  for (const tool of labTools) {
    const existing = groups.get(tool.subjectSlug);

    if (existing) {
      existing.tools.push(tool);
      continue;
    }

    groups.set(tool.subjectSlug, {
      subjectSlug: tool.subjectSlug,
      title: tool.subjectTitle,
      description: labSubjectDescriptions[tool.subjectSlug],
      tools: [tool],
    });
  }

  return Array.from(groups.values());
}

export function getLabToolsForCourseConcept(input: {
  subjectCode: string;
  topicSlug: string;
  conceptSlug?: string | null;
}): LabTool[] {
  const normalizedSubjectCode = input.subjectCode.trim().toUpperCase();
  const normalizedTopicSlug = input.topicSlug.trim();
  const normalizedConceptSlug = input.conceptSlug?.trim() || null;

  return labTools.filter((tool) =>
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
