import type { FiltersResponse, StudyRoadmapsResponse } from "@/lib/study-api";
import { getPrototypeTopicContent } from "@/lib/course-prototype-content";
import { buildTopicTree, type TopicTreeNode } from "@/lib/topic-taxonomy";
import {
  buildStudentCourseConceptRoute,
  buildStudentCourseSubjectRoute,
  buildStudentCourseTopicRoute,
  buildStudentTrainingDrillRoute,
} from "@/lib/student-routes";

type FilterTopic = FiltersResponse["topics"][number];
type StudyRoadmap = StudyRoadmapsResponse["data"][number];
type StudyRoadmapNode = StudyRoadmap["nodes"][number];
type StudyRoadmapSection = StudyRoadmap["sections"][number];

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
  title: string;
  description: string | null;
  href: string;
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
};

function mapNodeStatus(
  status: StudyRoadmapNode["status"] | undefined,
): Pick<CourseTopicCard, "status" | "statusLabel"> {
  switch (status) {
    case "SOLID":
      return { status: "COMPLETED", statusLabel: "مكتمل" };
    case "IN_PROGRESS":
      return { status: "IN_PROGRESS", statusLabel: "قيد التقدم" };
    case "NEEDS_REVIEW":
      return { status: "NEEDS_REVIEW", statusLabel: "يحتاج مراجعة" };
    default:
      return { status: "READY", statusLabel: "جاهز" };
  }
}

function filterSubjectTopics(
  filters: FiltersResponse,
  subjectCode: string,
): FilterTopic[] {
  return filters.topics.filter((topic) => topic.subject.code === subjectCode);
}

function buildSubjectTopicTree(
  filters: FiltersResponse,
  subjectCode: string,
): TopicTreeNode<FilterTopic>[] {
  return buildTopicTree(filterSubjectTopics(filters, subjectCode));
}

function countConcepts(node: TopicTreeNode<FilterTopic>) {
  return node.children.length > 0 ? node.children.length : 1;
}

function buildTopicLookup(
  topicTree: TopicTreeNode<FilterTopic>[],
): Map<string, TopicTreeNode<FilterTopic>> {
  const lookup = new Map<string, TopicTreeNode<FilterTopic>>();

  function walk(node: TopicTreeNode<FilterTopic>) {
    lookup.set(node.code, node);

    for (const child of node.children) {
      walk(child);
    }
  }

  for (const node of topicTree) {
    walk(node);
  }

  return lookup;
}

function buildSlugLookup(
  topicTree: TopicTreeNode<FilterTopic>[],
): Map<string, TopicTreeNode<FilterTopic>> {
  const lookup = new Map<string, TopicTreeNode<FilterTopic>>();

  function walk(node: TopicTreeNode<FilterTopic>) {
    lookup.set(node.slug, node);

    for (const child of node.children) {
      walk(child);
    }
  }

  for (const node of topicTree) {
    walk(node);
  }

  return lookup;
}

function findRoadmap(
  roadmaps: StudyRoadmapsResponse["data"],
  subjectCode: string,
) {
  return roadmaps.find((roadmap) => roadmap.subject.code === subjectCode);
}

function findSectionForTopic(
  sections: StudyRoadmapSection[],
  topicCode: string,
) {
  return sections.find((section) =>
    section.nodes.some((node) => node.topicCode === topicCode),
  );
}

function buildFallbackTopicCard(
  subjectCode: string,
  node: TopicTreeNode<FilterTopic>,
): CourseTopicCard {
  return {
    topicCode: node.code,
    slug: node.slug,
    title: node.name,
    shortTitle: node.name,
    description: null,
    status: "READY",
    statusLabel: "جاهز",
    progressPercent: 0,
    conceptCount: countConcepts(node),
    href: buildStudentCourseTopicRoute(subjectCode, node.slug),
    continueHref: buildStudentCourseTopicRoute(subjectCode, node.slug),
  };
}

export function buildCourseSubjectCards(
  roadmaps: StudyRoadmapsResponse["data"],
): CourseSubjectCard[] {
  return roadmaps.map((roadmap) => {
    const continueHref =
      roadmap.nextAction?.topicCode &&
      roadmap.nodes.some((node) => node.topicCode === roadmap.nextAction?.topicCode)
        ? buildStudentTrainingDrillRoute({
            subjectCode: roadmap.subject.code,
            topicCodes: roadmap.nextAction.topicCode
              ? [roadmap.nextAction.topicCode]
              : [],
          })
        : buildStudentCourseSubjectRoute(roadmap.subject.code);

    return {
      subjectCode: roadmap.subject.code,
      subjectName: roadmap.subject.name,
      title: roadmap.subject.name,
      description: roadmap.description,
      progressPercent: roadmap.progressPercent,
      unitCount: roadmap.sections.length,
      conceptCount: roadmap.totalNodeCount,
      completedTopicCount: roadmap.solidNodeCount,
      href: buildStudentCourseSubjectRoute(roadmap.subject.code),
      continueHref,
    };
  });
}

export function buildCourseSubjectPageModel(input: {
  subjectCode: string;
  roadmaps: StudyRoadmapsResponse["data"];
  filters: FiltersResponse;
}): CourseSubjectPageModel | null {
  const roadmap = findRoadmap(input.roadmaps, input.subjectCode);

  if (!roadmap) {
    return null;
  }

  const topicTree = buildSubjectTopicTree(input.filters, input.subjectCode);
  const topicByCode = buildTopicLookup(topicTree);

  const units =
    roadmap.sections.length > 0
      ? roadmap.sections.map((section) => ({
          id: section.id,
          code: section.code,
          title: section.title,
          description: section.description,
          progressPercent:
            section.nodes.length > 0
              ? Math.round(
                  section.nodes.reduce(
                    (sum, node) => sum + node.progressPercent,
                    0,
                  ) / section.nodes.length,
                )
              : 0,
          topics: section.nodes.map((node) => {
            const topic = topicByCode.get(node.topicCode);
            const status = mapNodeStatus(node.status);

            return {
              topicCode: node.topicCode,
              slug: topic?.slug ?? node.topicCode.toLowerCase(),
              title: node.title,
              shortTitle: node.topicName,
              description: node.description,
              status: status.status,
              statusLabel: status.statusLabel,
              progressPercent: node.progressPercent,
              conceptCount: topic ? countConcepts(topic) : 1,
              href: buildStudentCourseTopicRoute(
                roadmap.subject.code,
                topic?.slug ?? node.topicCode.toLowerCase(),
              ),
              continueHref: buildStudentCourseTopicRoute(
                roadmap.subject.code,
                topic?.slug ?? node.topicCode.toLowerCase(),
              ),
            } satisfies CourseTopicCard;
          }),
        }))
      : [
          {
            id: `fallback:${roadmap.id}`,
            code: "COURSE_PATH",
            title: roadmap.title,
            description: roadmap.description,
            progressPercent: roadmap.progressPercent,
            topics: topicTree.map((node) =>
              buildFallbackTopicCard(roadmap.subject.code, node),
            ),
          },
        ];

  return {
    subject: roadmap.subject,
    title: roadmap.title,
    description: roadmap.description,
    progressPercent: roadmap.progressPercent,
    completedTopicCount: roadmap.solidNodeCount,
    topicCount: roadmap.totalNodeCount,
    continueHref:
      buildCourseSubjectCards([roadmap])[0]?.continueHref ??
      buildStudentCourseSubjectRoute(roadmap.subject.code),
    units,
  };
}

export function buildCourseTopicPageModel(input: {
  subjectCode: string;
  topicSlug: string;
  roadmaps: StudyRoadmapsResponse["data"];
  filters: FiltersResponse;
}): CourseTopicPageModel | null {
  const roadmap = findRoadmap(input.roadmaps, input.subjectCode);

  if (!roadmap) {
    return null;
  }

  const topicTree = buildSubjectTopicTree(input.filters, input.subjectCode);
  const topicBySlug = buildSlugLookup(topicTree);
  const topic = topicBySlug.get(input.topicSlug);

  if (!topic) {
    return null;
  }

  const roadmapNode = roadmap.sections
    .flatMap((section) => section.nodes)
    .find((node) => node.topicCode === topic.code);
  const status = mapNodeStatus(roadmapNode?.status);
  const section = findSectionForTopic(roadmap.sections, topic.code);
  const prototypeTopic = getPrototypeTopicContent(roadmap.subject.code, topic.slug);
  const concepts = prototypeTopic
    ? prototypeTopic.concepts.map((concept) => ({
        conceptCode: concept.slug.toUpperCase(),
        slug: concept.slug,
        title: concept.title,
        description: concept.summary,
        href: buildStudentCourseConceptRoute(
          roadmap.subject.code,
          topic.slug,
          concept.slug,
        ),
      }))
    : (topic.children.length > 0 ? topic.children : [topic]).map((child) => ({
        conceptCode: child.code,
        slug: child.slug,
        title: child.name,
        description: child.children.length
          ? `${child.children.length} محاور فرعية`
          : null,
        href: buildStudentCourseConceptRoute(
          roadmap.subject.code,
          topic.slug,
          child.slug,
        ),
      }));

  return {
    subject: roadmap.subject,
    topic: {
      code: topic.code,
      slug: topic.slug,
      title: topic.name,
      shortTitle: topic.name,
    },
    parentUnitTitle: section?.title ?? null,
    description: roadmapNode?.description ?? null,
    progressPercent: roadmapNode?.progressPercent ?? 0,
    statusLabel: status.statusLabel,
    continueHref: buildStudentCourseTopicRoute(roadmap.subject.code, topic.slug),
    conceptCount: concepts.length,
    concepts,
  };
}
