import { readdir, readFile } from "node:fs/promises";
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
  fieldCode?: string;
  topicCode: string;
  topicSlug: string;
  requiredUnitCodes: string[];
  concepts: CanonicalCourseConcept[];
};

type TopicPresentation = {
  topicCode: string;
  title: string;
  shortTitle: string;
  description: string | null;
  parentUnitTitle: string | null;
};

const subjectNames: Record<string, string> = {
  MATHEMATICS: "الرياضيات",
  NATURAL_SCIENCES: "علوم الطبيعة والحياة",
};

const topicPresentation: Record<string, Partial<TopicPresentation>> = {
  "MATHEMATICS:sequences": {
    topicCode: "SEQUENCES",
    title: "المتتاليات",
    shortTitle: "المتتاليات",
    description:
      "رحلة رياضية لشعب SE وM وMT تجعل المتتاليات آلات توقع: قراءة، اتجاه، حصر، نهاية، تحويل، ومسألة BAC شاملة.",
    parentUnitTitle: "التحليل",
  },
  "NATURAL_SCIENCES:proteins": {
    topicCode: "PROTEINS",
    title: "التخصص الوظيفي للبروتينات",
    shortTitle: "التخصص الوظيفي للبروتينات",
    description:
      "مسار المجال الأول لشعبة علوم تجريبية: من تركيب البروتين إلى البنية والوظيفة، الإنزيمات، المناعة، والاتصال العصبي.",
    parentUnitTitle: "المجال الأول",
  },
};

const unitTitles: Record<string, string> = {
  SEQUENCES: "المتتاليات",
  PROTEIN_SYNTHESIS: "تركيب البروتين",
  STRUCTURE_FUNCTION: "العلاقة بين بنية ووظيفة البروتين",
  ENZYMES: "الإنزيمات",
  IMMUNITY: "المناعة",
  NERVOUS_COMMUNICATION: "الاتصال العصبي",
};

let canonicalBlueprintsPromise: Promise<CanonicalCourseBlueprint[]> | null =
  null;

async function findCourseBlueprintFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await findCourseBlueprintFiles(absolutePath)));
      continue;
    }

    if (entry.isFile() && entry.name === "course.json") {
      files.push(absolutePath);
    }
  }

  return files.sort();
}

async function loadCanonicalBlueprints() {
  canonicalBlueprintsPromise ??= (async () => {
    const canonicalRoot = resolveCanonicalCourseRoot();

    if (!canonicalRoot) {
      return [];
    }

    const files = await findCourseBlueprintFiles(canonicalRoot);
    const blueprints: CanonicalCourseBlueprint[] = [];

    for (const filePath of files) {
      const rawBlueprint = JSON.parse(
        await readFile(filePath, "utf8"),
      ) as CanonicalCourseBlueprint;

      if (
        rawBlueprint.subjectCode &&
        rawBlueprint.topicSlug &&
        Array.isArray(rawBlueprint.concepts)
      ) {
        blueprints.push(rawBlueprint);
      }
    }

    return blueprints;
  })();

  return canonicalBlueprintsPromise;
}

function getSubjectName(subjectCode: string) {
  return subjectNames[subjectCode] ?? subjectCode;
}

function getTopicPresentation(blueprint: CanonicalCourseBlueprint) {
  const configured =
    topicPresentation[`${blueprint.subjectCode}:${blueprint.topicSlug}`];
  const title = configured?.title ?? blueprint.title;

  return {
    topicCode: configured?.topicCode ?? blueprint.topicCode,
    title,
    shortTitle: configured?.shortTitle ?? title,
    description: configured?.description ?? blueprint.description ?? null,
    parentUnitTitle: configured?.parentUnitTitle ?? null,
  };
}

function buildTopicSummary(blueprint: CanonicalCourseBlueprint) {
  const presentation = getTopicPresentation(blueprint);

  return {
    topicCode: presentation.topicCode,
    slug: blueprint.topicSlug,
    title: presentation.title,
    shortTitle: presentation.shortTitle,
    description: presentation.description,
    status: "READY" as const,
    progressPercent: 0,
    conceptCount: blueprint.concepts.length,
  };
}

function getSubjectDescription(blueprints: CanonicalCourseBlueprint[]) {
  if (blueprints.length === 1) {
    return getTopicPresentation(blueprints[0]).description;
  }

  return blueprints.length > 1
    ? `${blueprints.length} مسارات مفاهيمية جاهزة داخل المادة.`
    : null;
}

function buildSubjectTitle(subjectCode: string) {
  return `${getSubjectName(subjectCode)} - canonical preview`;
}

function getTopicUnitCodes(blueprint: CanonicalCourseBlueprint) {
  return blueprint.requiredUnitCodes.length
    ? blueprint.requiredUnitCodes
    : [blueprint.fieldCode ?? blueprint.topicCode];
}

function findBlueprint(
  blueprints: CanonicalCourseBlueprint[],
  subjectCode: string,
  topicSlug: string,
) {
  return (
    blueprints.find(
      (blueprint) =>
        blueprint.subjectCode === subjectCode &&
        blueprint.topicSlug === topicSlug,
    ) ?? null
  );
}

export async function buildPlaywrightCanonicalCourseSubjectCards(): Promise<
  CourseSubjectCard[]
> {
  const blueprints = await loadCanonicalBlueprints();
  const blueprintsBySubject = new Map<string, CanonicalCourseBlueprint[]>();

  for (const blueprint of blueprints) {
    const existing = blueprintsBySubject.get(blueprint.subjectCode) ?? [];
    existing.push(blueprint);
    blueprintsBySubject.set(blueprint.subjectCode, existing);
  }

  return [...blueprintsBySubject.entries()].map(([subjectCode, topics]) => ({
    subject: {
      code: subjectCode,
      name: getSubjectName(subjectCode),
    },
    title: buildSubjectTitle(subjectCode),
    description: getSubjectDescription(topics),
    progressPercent: 0,
    unitCount: new Set(topics.flatMap(getTopicUnitCodes)).size,
    topicCount: topics.length,
    completedTopicCount: 0,
    continueTopicCode: topics[0]?.topicCode ?? null,
  }));
}

export async function buildPlaywrightCanonicalCourseSubjectResponse(
  subjectCode: string,
): Promise<CourseSubjectResponse | null> {
  const blueprints = (await loadCanonicalBlueprints()).filter(
    (blueprint) => blueprint.subjectCode === subjectCode,
  );

  if (!blueprints.length) {
    return null;
  }

  return parseCourseSubjectResponse({
    subject: {
      code: subjectCode,
      name: getSubjectName(subjectCode),
    },
    title: buildSubjectTitle(subjectCode),
    description: getSubjectDescription(blueprints),
    progressPercent: 0,
    topicCount: blueprints.length,
    completedTopicCount: 0,
    continueTopicCode: blueprints[0].topicCode,
    units: blueprints.flatMap((blueprint) => {
      const unitCodes = getTopicUnitCodes(blueprint);

      return unitCodes.map((unitCode, index) => ({
        id: `${blueprint.topicSlug}:${unitCode.toLowerCase().replaceAll("_", "-")}`,
        code: unitCode,
        title: unitTitles[unitCode] ?? unitCode,
        description: null,
        progressPercent: 0,
        topics: index === 0 ? [buildTopicSummary(blueprint)] : [],
      }));
    }),
  });
}

export async function buildPlaywrightCanonicalCourseTopicResponse(
  subjectCode: string,
  topicSlug: string,
): Promise<CourseTopicResponse | null> {
  const blueprint = findBlueprint(
    await loadCanonicalBlueprints(),
    subjectCode,
    topicSlug,
  );

  if (!blueprint) {
    return null;
  }

  const presentation = getTopicPresentation(blueprint);

  return parseCourseTopicResponse({
    subject: {
      code: subjectCode,
      name: getSubjectName(subjectCode),
    },
    topic: {
      code: presentation.topicCode,
      slug: blueprint.topicSlug,
      title: presentation.title,
      shortTitle: presentation.shortTitle,
    },
    parentUnitTitle: presentation.parentUnitTitle,
    description: presentation.description,
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

export async function buildPlaywrightCanonicalCourseConceptResponse(
  subjectCode: string,
  topicSlug: string,
  conceptSlug: string,
): Promise<CourseConceptResponse | null> {
  const blueprint = findBlueprint(
    await loadCanonicalBlueprints(),
    subjectCode,
    topicSlug,
  );

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
  const presentation = getTopicPresentation(blueprint);

  return parseCourseConceptResponse({
    subject: {
      code: subjectCode,
      name: getSubjectName(subjectCode),
    },
    topic: {
      code: presentation.topicCode,
      slug: blueprint.topicSlug,
      title: presentation.title,
      shortTitle: presentation.shortTitle,
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

export async function buildPlaywrightSvtCourseSubjectCard(): Promise<CourseSubjectCard | null> {
  const cards = await buildPlaywrightCanonicalCourseSubjectCards();

  return cards.find((card) => card.subject.code === "NATURAL_SCIENCES") ?? null;
}

export async function buildPlaywrightSvtCourseSubjectResponse(
  subjectCode: string,
): Promise<CourseSubjectResponse | null> {
  if (subjectCode !== "NATURAL_SCIENCES") {
    return null;
  }

  return buildPlaywrightCanonicalCourseSubjectResponse(subjectCode);
}

export async function buildPlaywrightSvtCourseTopicResponse(
  subjectCode: string,
  topicSlug: string,
): Promise<CourseTopicResponse | null> {
  if (subjectCode !== "NATURAL_SCIENCES" || topicSlug !== "proteins") {
    return null;
  }

  return buildPlaywrightCanonicalCourseTopicResponse(subjectCode, topicSlug);
}

export async function buildPlaywrightSvtCourseConceptResponse(
  subjectCode: string,
  topicSlug: string,
  conceptSlug: string,
): Promise<CourseConceptResponse | null> {
  if (subjectCode !== "NATURAL_SCIENCES" || topicSlug !== "proteins") {
    return null;
  }

  return buildPlaywrightCanonicalCourseConceptResponse(
    subjectCode,
    topicSlug,
    conceptSlug,
  );
}
