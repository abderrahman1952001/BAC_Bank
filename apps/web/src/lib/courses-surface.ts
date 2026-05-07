import type {
  CourseConceptRole,
  CourseConceptResponse,
  CourseSubjectCardsResponse,
  CourseSubjectResponse,
  CourseTopicResponse,
  CourseTopicStatus,
} from "@bac-bank/contracts/courses";
import {
  buildStudentCourseConceptRoute,
  buildStudentCourseSubjectRoute,
  buildStudentCourseTopicRoute,
  buildStudentTrainingDrillRoute,
} from "@/lib/student-routes";
type CourseSubjectCardRecord = CourseSubjectCardsResponse["data"][number];
type CourseSubjectUnitRecord = CourseSubjectResponse["units"][number];
type CourseSubjectTopicRecord = CourseSubjectUnitRecord["topics"][number];
type CourseConceptRecord = CourseTopicResponse["concepts"][number];
type CourseConceptStepRecord = CourseConceptResponse["steps"][number];
type CourseConceptQuizRecord = CourseConceptResponse["quiz"];
type CourseDepthPortalRecord = CourseConceptResponse["depthPortals"][number];

export type CourseSubjectCard = {
  subjectCode: string;
  subjectName: string;
  title: string;
  description: string | null;
  progressPercent: number;
  unitCount: number;
  conceptCount: number;
  completedTopicCount: number;
  href: string;
  continueHref: string;
};

export type CourseUnitCard = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  progressPercent: number;
  topics: CourseTopicCard[];
};

export type CourseTopicCard = {
  topicCode: string;
  slug: string;
  title: string;
  shortTitle: string;
  description: string | null;
  status: "READY" | "IN_PROGRESS" | "NEEDS_REVIEW" | "COMPLETED";
  statusLabel: string;
  progressPercent: number;
  conceptCount: number;
  href: string;
  continueHref: string;
};

export type CourseSubjectPageModel = {
  subject: {
    code: string;
    name: string;
  };
  title: string;
  description: string | null;
  progressPercent: number;
  completedTopicCount: number;
  topicCount: number;
  continueHref: string;
  units: CourseUnitCard[];
};

export type CourseConceptCard = {
  conceptCode: string;
  slug: string;
  unitCode: string | null;
  role: CourseConceptRole;
  roleLabel: string;
  title: string;
  description: string | null;
  href: string;
};

export type CourseConceptGroup = {
  unitCode: string | null;
  title: string;
  concepts: CourseConceptCard[];
};

export type CourseTopicPageModel = {
  subject: {
    code: string;
    name: string;
  };
  topic: {
    code: string;
    slug: string;
    title: string;
    shortTitle: string;
  };
  parentUnitTitle: string | null;
  description: string | null;
  progressPercent: number;
  statusLabel: string;
  continueHref: string;
  conceptCount: number;
  concepts: CourseConceptCard[];
  conceptGroups: CourseConceptGroup[];
};

export type CourseConceptPageModel = {
  subject: {
    code: string;
    name: string;
  };
  topic: {
    code: string;
    slug: string;
    title: string;
    shortTitle: string;
  };
  concept: {
    conceptCode: string;
    slug: string;
    title: string;
    summary: string;
    estimatedMinutes: number;
    steps: CourseConceptStepRecord[];
    depthPortals: CourseDepthPortalRecord[];
    quiz: CourseConceptQuizRecord;
  };
  backHref: string;
  nextHref: string | null;
};

function mapNodeStatus(
  status: CourseTopicStatus,
): Pick<CourseTopicCard, "status" | "statusLabel"> {
  switch (status) {
    case "COMPLETED":
      return { status: "COMPLETED", statusLabel: "مكتمل" };
    case "IN_PROGRESS":
      return { status: "IN_PROGRESS", statusLabel: "قيد التقدم" };
    case "NEEDS_REVIEW":
      return { status: "NEEDS_REVIEW", statusLabel: "يحتاج مراجعة" };
    default:
      return { status: "READY", statusLabel: "جاهز" };
  }
}

const conceptRoleLabels: Record<CourseConceptRole, string> = {
  FIELD_INTRO: "مدخل المجال",
  UNIT_INTRO: "مدخل الوحدة",
  LESSON: "مفهوم",
  FIELD_SYNTHESIS: "خلاصة المجال",
};

const courseUnitLabels: Record<string, string> = {
  SEQUENCES: "المتتاليات",
  PROTEIN_SYNTHESIS: "تركيب البروتين",
  STRUCTURE_FUNCTION: "البنية والوظيفة",
  ENZYMES: "الإنزيمات",
  IMMUNITY: "المناعة",
  NERVOUS_COMMUNICATION: "الاتصال العصبي",
};

function buildContinueHref(input: {
  subjectCode: string;
  continueTopicCode: string | null;
}) {
  return input.continueTopicCode
    ? buildStudentTrainingDrillRoute({
        subjectCode: input.subjectCode,
        topicCodes: [input.continueTopicCode],
      })
    : buildStudentCourseSubjectRoute(input.subjectCode);
}

export function buildCourseSubjectCards(
  cards: CourseSubjectCardRecord[],
): CourseSubjectCard[] {
  return cards.map((card) => {
    return {
      subjectCode: card.subject.code,
      subjectName: card.subject.name,
      title: card.title,
      description: card.description,
      progressPercent: card.progressPercent,
      unitCount: card.unitCount,
      conceptCount: card.topicCount,
      completedTopicCount: card.completedTopicCount,
      href: buildStudentCourseSubjectRoute(card.subject.code),
      continueHref: buildContinueHref({
        subjectCode: card.subject.code,
        continueTopicCode: card.continueTopicCode,
      }),
    };
  });
}

function buildCourseTopicCard(
  subjectCode: string,
  topic: CourseSubjectTopicRecord,
): CourseTopicCard {
  const status = mapNodeStatus(topic.status);
  const href = buildStudentCourseTopicRoute(subjectCode, topic.slug);

  return {
    topicCode: topic.topicCode,
    slug: topic.slug,
    title: topic.title,
    shortTitle: topic.shortTitle,
    description: topic.description,
    status: status.status,
    statusLabel: status.statusLabel,
    progressPercent: topic.progressPercent,
    conceptCount: topic.conceptCount,
    href,
    continueHref: href,
  };
}

export function buildCourseSubjectPageModel(
  course: CourseSubjectResponse,
): CourseSubjectPageModel {
  return {
    subject: course.subject,
    title: course.title,
    description: course.description,
    progressPercent: course.progressPercent,
    completedTopicCount: course.completedTopicCount,
    topicCount: course.topicCount,
    continueHref: buildContinueHref({
      subjectCode: course.subject.code,
      continueTopicCode: course.continueTopicCode,
    }),
    units: course.units.map((unit) => ({
      id: unit.id,
      code: unit.code,
      title: unit.title,
      description: unit.description,
      progressPercent: unit.progressPercent,
      topics: unit.topics.map((topic) =>
        buildCourseTopicCard(course.subject.code, topic),
      ),
    })),
  };
}

function buildFallbackConceptCards(
  subjectCode: string,
  topicSlug: string,
  concepts: CourseConceptRecord[],
): CourseConceptCard[] {
  return concepts.map((concept) => ({
    conceptCode: concept.conceptCode,
    slug: concept.slug,
    unitCode: concept.unitCode,
    role: concept.role,
    roleLabel: conceptRoleLabels[concept.role],
    title: concept.title,
    description: concept.description,
    href: buildStudentCourseConceptRoute(subjectCode, topicSlug, concept.slug),
  }));
}

function buildConceptGroups(
  concepts: CourseConceptCard[],
): CourseConceptGroup[] {
  const groups: CourseConceptGroup[] = [];
  const groupByUnitCode = new Map<string, CourseConceptGroup>();

  for (const concept of concepts) {
    const groupKey = concept.unitCode ?? "COURSE_PATH";
    const existingGroup = groupByUnitCode.get(groupKey);

    if (existingGroup) {
      existingGroup.concepts.push(concept);
      continue;
    }

    const group = {
      unitCode: concept.unitCode,
      title: concept.unitCode
        ? (courseUnitLabels[concept.unitCode] ?? concept.unitCode)
        : "المسار",
      concepts: [concept],
    };

    groups.push(group);
    groupByUnitCode.set(groupKey, group);
  }

  return groups;
}

export function buildCourseTopicPageModel(
  courseTopic: CourseTopicResponse,
): CourseTopicPageModel {
  const status = mapNodeStatus(courseTopic.status);
  const concepts = buildFallbackConceptCards(
    courseTopic.subject.code,
    courseTopic.topic.slug,
    courseTopic.concepts,
  );
  const conceptGroups = buildConceptGroups(concepts);

  return {
    subject: courseTopic.subject,
    topic: courseTopic.topic,
    parentUnitTitle: courseTopic.parentUnitTitle,
    description: courseTopic.description,
    progressPercent: courseTopic.progressPercent,
    statusLabel: status.statusLabel,
    continueHref:
      concepts[0]?.href ??
      buildStudentCourseTopicRoute(
        courseTopic.subject.code,
        courseTopic.topic.slug,
      ),
    conceptCount: concepts.length,
    concepts,
    conceptGroups,
  };
}

export function buildCourseConceptPageModel(
  courseConcept: CourseConceptResponse,
): CourseConceptPageModel {
  const backHref = buildStudentCourseTopicRoute(
    courseConcept.subject.code,
    courseConcept.topic.slug,
  );
  const nextHref = courseConcept.navigation.nextConceptSlug
    ? buildStudentCourseConceptRoute(
        courseConcept.subject.code,
        courseConcept.topic.slug,
        courseConcept.navigation.nextConceptSlug,
      )
    : null;

  return {
    subject: courseConcept.subject,
    topic: courseConcept.topic,
    concept: {
      ...courseConcept.concept,
      steps: courseConcept.steps,
      depthPortals: courseConcept.depthPortals,
      quiz: courseConcept.quiz,
    },
    backHref,
    nextHref,
  };
}
