import type {
  CourseSubjectCardsResponse,
  CourseSubjectResponse,
  CourseTopicResponse,
  CourseTopicStatus,
} from '@bac-bank/contracts/courses';
import type { FiltersResponse, StudyRoadmapsResponse } from '@bac-bank/contracts/study';

type FilterTopic = FiltersResponse['topics'][number];
type StudyRoadmap = StudyRoadmapsResponse['data'][number];
type StudyRoadmapSection = StudyRoadmap['sections'][number];
type StudyRoadmapNode = StudyRoadmapSection['nodes'][number];
type TopicTreeNode = FilterTopic & {
  children: TopicTreeNode[];
};

function mapNodeStatus(
  status: StudyRoadmapNode['status'] | undefined,
): CourseTopicStatus {
  switch (status) {
    case 'SOLID':
      return 'COMPLETED';
    case 'IN_PROGRESS':
      return 'IN_PROGRESS';
    case 'NEEDS_REVIEW':
      return 'NEEDS_REVIEW';
    default:
      return 'READY';
  }
}

function sortTopics(topics: FilterTopic[]) {
  return [...topics].sort((left, right) => {
    if (left.displayOrder !== right.displayOrder) {
      return left.displayOrder - right.displayOrder;
    }

    return left.name.localeCompare(right.name);
  });
}

function buildTopicTree(topics: FilterTopic[]): TopicTreeNode[] {
  const topicByCode = new Map(
    topics.map((topic) => [
      topic.code,
      {
        ...topic,
        children: [] as TopicTreeNode[],
      },
    ]),
  );
  const roots: TopicTreeNode[] = [];

  for (const topic of sortTopics(topics)) {
    const node = topicByCode.get(topic.code);

    if (!node) {
      continue;
    }

    if (topic.parentCode) {
      const parent = topicByCode.get(topic.parentCode);

      if (parent) {
        parent.children.push(node);
        continue;
      }
    }

    roots.push(node);
  }

  function sortTree(nodes: TopicTreeNode[]) {
    nodes.sort((left, right) => {
      if (left.displayOrder !== right.displayOrder) {
        return left.displayOrder - right.displayOrder;
      }

      return left.name.localeCompare(right.name);
    });

    for (const node of nodes) {
      sortTree(node.children);
    }
  }

  sortTree(roots);
  return roots;
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
): TopicTreeNode[] {
  return buildTopicTree(filterSubjectTopics(filters, subjectCode));
}

function countConcepts(node: TopicTreeNode) {
  return node.children.length > 0 ? node.children.length : 1;
}

function buildTopicLookup(topicTree: TopicTreeNode[]): Map<string, TopicTreeNode> {
  const lookup = new Map<string, TopicTreeNode>();

  function walk(node: TopicTreeNode) {
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

function buildSlugLookup(topicTree: TopicTreeNode[]): Map<string, TopicTreeNode> {
  const lookup = new Map<string, TopicTreeNode>();

  function walk(node: TopicTreeNode) {
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
  roadmaps: StudyRoadmapsResponse['data'],
  subjectCode: string,
) {
  return roadmaps.find((roadmap) => roadmap.subject.code === subjectCode) ?? null;
}

function findSectionForTopic(
  sections: StudyRoadmapSection[],
  topicCode: string,
) {
  return (
    sections.find((section) =>
      section.nodes.some((node) => node.topicCode === topicCode),
    ) ?? null
  );
}

function resolveContinueTopicCode(roadmap: StudyRoadmap) {
  const topicCode = roadmap.nextAction?.topicCode;

  if (!topicCode) {
    return null;
  }

  const roadmapNodes = roadmap.sections.flatMap((section) => section.nodes);
  return roadmapNodes.some((node) => node.topicCode === topicCode)
    ? topicCode
    : null;
}

function buildFallbackTopicSummary(node: TopicTreeNode) {
  return {
    topicCode: node.code,
    slug: node.slug,
    title: node.name,
    shortTitle: node.name,
    description: null,
    status: 'READY' as const,
    progressPercent: 0,
    conceptCount: countConcepts(node),
  };
}

export function buildCourseSubjectCardsResponse(
  roadmaps: StudyRoadmapsResponse['data'],
): CourseSubjectCardsResponse {
  return {
    data: roadmaps.map((roadmap) => ({
      subject: roadmap.subject,
      title: roadmap.subject.name,
      description: roadmap.description,
      progressPercent: roadmap.progressPercent,
      unitCount: roadmap.sections.length,
      topicCount: roadmap.totalNodeCount,
      completedTopicCount: roadmap.solidNodeCount,
      continueTopicCode: resolveContinueTopicCode(roadmap),
    })),
  };
}

export function buildCourseSubjectResponse(input: {
  subjectCode: string;
  roadmaps: StudyRoadmapsResponse['data'];
  filters: FiltersResponse;
}): CourseSubjectResponse | null {
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

            return {
              topicCode: node.topicCode,
              slug: topic?.slug ?? node.topicCode.toLowerCase(),
              title: node.title,
              shortTitle: node.topicName,
              description: node.description,
              status: mapNodeStatus(node.status),
              progressPercent: node.progressPercent,
              conceptCount: topic ? countConcepts(topic) : 1,
            };
          }),
        }))
      : [
          {
            id: `fallback:${roadmap.id}`,
            code: 'COURSE_PATH',
            title: roadmap.title,
            description: roadmap.description,
            progressPercent: roadmap.progressPercent,
            topics: topicTree.map((node) => buildFallbackTopicSummary(node)),
          },
        ];

  return {
    subject: roadmap.subject,
    title: roadmap.title,
    description: roadmap.description,
    progressPercent: roadmap.progressPercent,
    topicCount: roadmap.totalNodeCount,
    completedTopicCount: roadmap.solidNodeCount,
    continueTopicCode: resolveContinueTopicCode(roadmap),
    units,
  };
}

export function buildCourseTopicResponse(input: {
  subjectCode: string;
  topicSlug: string;
  roadmaps: StudyRoadmapsResponse['data'];
  filters: FiltersResponse;
}): CourseTopicResponse | null {
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
  const section = findSectionForTopic(roadmap.sections, topic.code);

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
    status: mapNodeStatus(roadmapNode?.status),
    concepts: (topic.children.length > 0 ? topic.children : [topic]).map(
      (child) => ({
        conceptCode: child.code,
        slug: child.slug,
        title: child.name,
        description: child.children.length
          ? `${child.children.length} محاور فرعية`
          : null,
      }),
    ),
  };
}
