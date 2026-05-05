import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  CourseConceptResponse,
  CourseSubjectCard,
  CourseSubjectResponse,
  CourseTopicResponse,
} from "@bac-bank/contracts/courses";
import {
  parseCourseConceptResponse,
  parseCourseSubjectResponse,
  parseCourseTopicResponse,
} from "@bac-bank/contracts/courses";
import { resolveCanonicalCourseRoot } from "@/lib/course-assets";

type CanonicalCourseConcept = {
  conceptCode: string;
  unitCode: string | null;
  role: CourseConceptResponse["concept"]["role"];
  slug: string;
  roadmapTitle?: string;
  title: string;
  summary: string;
  estimatedMinutes: number;
  steps: CourseConceptResponse["steps"];
  depthPortals?: CourseConceptResponse["depthPortals"];
  quiz: CourseConceptResponse["quiz"];
};

type CanonicalCourseBlueprint = {
  title: string;
  description: string;
  subjectCode: string;
  stream: string;
  topicCode: string;
  topicSlug: string;
  requiredUnitCodes: string[];
  concepts: CanonicalCourseConcept[];
};

const svtSubject = {
  code: "NATURAL_SCIENCES",
  name: "علوم الطبيعة والحياة",
};

const svtProteinsTopic = {
  code: "PROTEINS",
  slug: "proteins",
  title: "التخصص الوظيفي للبروتينات",
  shortTitle: "التخصص الوظيفي للبروتينات",
};

const unitTitles: Record<string, string> = {
  PROTEIN_SYNTHESIS: "تركيب البروتين",
  STRUCTURE_FUNCTION: "العلاقة بين بنية ووظيفة البروتين",
  ENZYMES: "الإنزيمات",
  IMMUNITY: "المناعة",
  NERVOUS_COMMUNICATION: "الاتصال العصبي",
};

let svtProteinsBlueprintPromise: Promise<CanonicalCourseBlueprint | null> | null =
  null;

async function loadSvtProteinsBlueprint() {
  svtProteinsBlueprintPromise ??= (async () => {
    const canonicalRoot = resolveCanonicalCourseRoot();

    if (!canonicalRoot) {
      return null;
    }

    const filePath = join(canonicalRoot, "svt", "SE", "proteins", "course.json");
    const rawBlueprint = JSON.parse(
      await readFile(filePath, "utf8"),
    ) as CanonicalCourseBlueprint;

    if (
      rawBlueprint.subjectCode !== svtSubject.code ||
      rawBlueprint.stream !== "SE" ||
      rawBlueprint.topicSlug !== svtProteinsTopic.slug
    ) {
      return null;
    }

    return rawBlueprint;
  })();

  return svtProteinsBlueprintPromise;
}

function buildTopicDescription() {
  return "مسار المجال الأول لشعبة علوم تجريبية: من تركيب البروتين إلى البنية والوظيفة، الإنزيمات، المناعة، والاتصال العصبي.";
}

function buildTopicSummary(blueprint: CanonicalCourseBlueprint) {
  return {
    topicCode: blueprint.topicCode || svtProteinsTopic.code,
    slug: blueprint.topicSlug,
    title: svtProteinsTopic.title,
    shortTitle: svtProteinsTopic.shortTitle,
    description: buildTopicDescription(),
    status: "READY" as const,
    progressPercent: 0,
    conceptCount: blueprint.concepts.length,
  };
}

export async function buildPlaywrightSvtCourseSubjectCard(): Promise<CourseSubjectCard | null> {
  const blueprint = await loadSvtProteinsBlueprint();

  if (!blueprint) {
    return null;
  }

  return {
    subject: svtSubject,
    title: "SVT BAC SE",
    description: buildTopicDescription(),
    progressPercent: 0,
    unitCount: blueprint.requiredUnitCodes.length,
    topicCount: 1,
    completedTopicCount: 0,
    continueTopicCode: blueprint.topicCode,
  };
}

export async function buildPlaywrightSvtCourseSubjectResponse(
  subjectCode: string,
): Promise<CourseSubjectResponse | null> {
  if (subjectCode !== svtSubject.code) {
    return null;
  }

  const blueprint = await loadSvtProteinsBlueprint();

  if (!blueprint) {
    return null;
  }

  return parseCourseSubjectResponse({
    subject: svtSubject,
    title: "علوم الطبيعة والحياة - شعبة علوم تجريبية",
    description: buildTopicDescription(),
    progressPercent: 0,
    topicCount: 1,
    completedTopicCount: 0,
    continueTopicCode: blueprint.topicCode,
    units: blueprint.requiredUnitCodes.map((unitCode) => ({
      id: unitCode.toLowerCase().replaceAll("_", "-"),
      code: unitCode,
      title: unitTitles[unitCode] ?? unitCode,
      description: null,
      progressPercent: 0,
      topics:
        unitCode === "PROTEIN_SYNTHESIS" ? [buildTopicSummary(blueprint)] : [],
    })),
  });
}

export async function buildPlaywrightSvtCourseTopicResponse(
  subjectCode: string,
  topicSlug: string,
): Promise<CourseTopicResponse | null> {
  if (subjectCode !== svtSubject.code || topicSlug !== svtProteinsTopic.slug) {
    return null;
  }

  const blueprint = await loadSvtProteinsBlueprint();

  if (!blueprint) {
    return null;
  }

  return parseCourseTopicResponse({
    subject: svtSubject,
    topic: {
      code: blueprint.topicCode || svtProteinsTopic.code,
      slug: blueprint.topicSlug,
      title: svtProteinsTopic.title,
      shortTitle: svtProteinsTopic.shortTitle,
    },
    parentUnitTitle: "المجال الأول",
    description: buildTopicDescription(),
    progressPercent: 0,
    status: "READY",
    concepts: blueprint.concepts.map((concept) => ({
      conceptCode: concept.conceptCode,
      slug: concept.slug,
      unitCode: concept.unitCode,
      role: concept.role,
      title: concept.roadmapTitle ?? concept.title,
      description: concept.summary,
    })),
  });
}

export async function buildPlaywrightSvtCourseConceptResponse(
  subjectCode: string,
  topicSlug: string,
  conceptSlug: string,
): Promise<CourseConceptResponse | null> {
  if (subjectCode !== svtSubject.code || topicSlug !== svtProteinsTopic.slug) {
    return null;
  }

  const blueprint = await loadSvtProteinsBlueprint();

  if (!blueprint) {
    return null;
  }

  const conceptIndex = blueprint.concepts.findIndex(
    (concept) => concept.slug === conceptSlug,
  );

  if (conceptIndex < 0) {
    return null;
  }

  const concept = blueprint.concepts[conceptIndex];

  return parseCourseConceptResponse({
    subject: svtSubject,
    topic: {
      code: blueprint.topicCode || svtProteinsTopic.code,
      slug: blueprint.topicSlug,
      title: svtProteinsTopic.title,
      shortTitle: svtProteinsTopic.shortTitle,
    },
    concept: {
      conceptCode: concept.conceptCode,
      slug: concept.slug,
      unitCode: concept.unitCode,
      role: concept.role,
      title: concept.title,
      summary: concept.summary,
      estimatedMinutes: concept.estimatedMinutes,
    },
    navigation: {
      previousConceptSlug: blueprint.concepts[conceptIndex - 1]?.slug ?? null,
      nextConceptSlug: blueprint.concepts[conceptIndex + 1]?.slug ?? null,
    },
    steps: concept.steps,
    depthPortals: concept.depthPortals ?? [],
    quiz: concept.quiz,
  });
}
