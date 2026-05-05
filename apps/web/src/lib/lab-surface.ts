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
    title: "مستكشف الدوال",
    shortTitle: "Function Explorer",
    description:
      "ارسم الدالة، اقرأ الجذور والقيم، واربط شكل المنحنى بلغة تمارين BAC.",
    bacUseCase:
      "مفيد عند دراسة التمثيل البياني، حلول f(x)=0، وجدول القيم قبل الانتقال إلى التدريب.",
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
    description:
      "حوّل سلسلة DNA إلى mRNA ثم إلى أحماض أمينية، وقارن أثر الطفرات خطوة بخطوة.",
    bacUseCase:
      "مفيد لفهم كيف تتحول طفرة في المورثة إلى تغير في السلسلة البروتينية والوظيفة.",
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
  math: "أدوات بصرية لفهم الدوال والتمثيلات قبل حل التمارين.",
  svt: "محاكاة قصيرة للآليات الحيوية التي تظهر كثيراً في الوثائق.",
};

export function getLabToolById(toolId: LabTool["id"]): LabTool | null {
  return labTools.find((tool) => tool.id === toolId) ?? null;
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

      return !reference.conceptSlug || reference.conceptSlug === normalizedConceptSlug;
    }),
  );
}
