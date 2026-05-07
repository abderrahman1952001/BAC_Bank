import type {
  CourseConceptResponse,
  CourseSubjectCardsResponse,
  CourseSubjectResponse,
  CourseTopicResponse,
  CourseTopicStatus,
} from '@bac-bank/contracts/courses';
import type {
  FiltersResponse,
  StudyRoadmapsResponse,
} from '@bac-bank/contracts/study';
import type { AuthoredCourseTopicContent } from './course-authored-content';

type FilterTopic = FiltersResponse['topics'][number];
type StudyRoadmap = StudyRoadmapsResponse['data'][number];
type StudyRoadmapSection = StudyRoadmap['sections'][number];
type StudyRoadmapNode = StudyRoadmapSection['nodes'][number];
type TopicTreeNode = FilterTopic & {
  children: TopicTreeNode[];
};
type AuthoredTopicPresentation = {
  topicCode: string;
  title: string;
  shortTitle: string;
  description: string | null;
  parentUnitTitle: string | null;
};

const subjectNames: Record<string, string> = {
  MATHEMATICS: 'الرياضيات',
  NATURAL_SCIENCES: 'علوم الطبيعة والحياة',
};

const authoredTopicPresentation: Record<
  string,
  Partial<AuthoredTopicPresentation>
> = {
  'MATHEMATICS:sequences': {
    topicCode: 'SEQUENCES',
    title: 'المتتاليات',
    shortTitle: 'المتتاليات',
    description:
      'رحلة رياضية لشعب SE وM وMT تجعل المتتاليات آلات توقع: قراءة، اتجاه، حصر، نهاية، تحويل، ومسألة BAC شاملة.',
    parentUnitTitle: 'التحليل',
  },
  'NATURAL_SCIENCES:proteins': {
    topicCode: 'PROTEINS',
    title: 'التخصص الوظيفي للبروتينات',
    shortTitle: 'التخصص الوظيفي للبروتينات',
    description:
      'مسار المجال الأول لشعبة علوم تجريبية: من تركيب البروتين إلى البنية والوظيفة، الإنزيمات، المناعة، والاتصال العصبي.',
    parentUnitTitle: 'المجال الأول',
  },
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

function buildAuthoredTopicKey(topic: AuthoredCourseTopicContent) {
  return `${topic.subjectCode}:${topic.topicSlug}`;
}

function normalizeAuthoredTopicCode(topic: AuthoredCourseTopicContent) {
  return (
    topic.topicCode ??
    topic.fieldCode ??
    topic.topicSlug.toUpperCase().replaceAll('-', '_')
  );
}

function resolveSubjectIdentity(filters: FiltersResponse, subjectCode: string) {
  const subject = filters.subjects.find((entry) => entry.code === subjectCode);

  return {
    code: subjectCode,
    name: subject?.name ?? subjectNames[subjectCode] ?? subjectCode,
  };
}

function resolveAuthoredTopicPresentation(
  topic: AuthoredCourseTopicContent,
): AuthoredTopicPresentation {
  const configured = authoredTopicPresentation[buildAuthoredTopicKey(topic)];
  const topicCode = configured?.topicCode ?? normalizeAuthoredTopicCode(topic);
  const title = configured?.title ?? topic.title ?? topic.topicSlug;

  return {
    topicCode,
    title,
    shortTitle: configured?.shortTitle ?? title,
    description: configured?.description ?? topic.description ?? null,
    parentUnitTitle: configured?.parentUnitTitle ?? null,
  };
}

function buildAuthoredTopicSummary(topic: AuthoredCourseTopicContent) {
  const presentation = resolveAuthoredTopicPresentation(topic);

  return {
    topicCode: presentation.topicCode,
    slug: topic.topicSlug,
    title: presentation.title,
    shortTitle: presentation.shortTitle,
    description: presentation.description,
    status: 'READY' as const,
    progressPercent: 0,
    conceptCount: topic.concepts.length,
  };
}

function groupAuthoredTopicsBySubject(
  topics: AuthoredCourseTopicContent[],
): Map<string, AuthoredCourseTopicContent[]> {
  const topicBySubject = new Map<string, AuthoredCourseTopicContent[]>();

  for (const topic of topics) {
    const existingTopics = topicBySubject.get(topic.subjectCode) ?? [];
    existingTopics.push(topic);
    topicBySubject.set(topic.subjectCode, existingTopics);
  }

  return topicBySubject;
}

function buildAuthoredSubjectDescription(topics: AuthoredCourseTopicContent[]) {
  if (topics.length === 1) {
    return resolveAuthoredTopicPresentation(topics[0]).description;
  }

  return topics.length > 1
    ? `${topics.length} مسارات مفاهيمية جاهزة داخل المادة.`
    : null;
}

function buildAuthoredCourseUnit(topic: AuthoredCourseTopicContent) {
  const presentation = resolveAuthoredTopicPresentation(topic);

  return {
    id: `authored:${topic.topicSlug}`,
    code: topic.fieldCode ?? presentation.topicCode,
    title: presentation.parentUnitTitle
      ? `${presentation.parentUnitTitle}: ${presentation.title}`
      : presentation.title,
    description: presentation.description,
    progressPercent: 0,
    topics: [buildAuthoredTopicSummary(topic)],
  };
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

function buildTopicLookup(
  topicTree: TopicTreeNode[],
): Map<string, TopicTreeNode> {
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

function buildSlugLookup(
  topicTree: TopicTreeNode[],
): Map<string, TopicTreeNode> {
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
  return (
    roadmaps.find((roadmap) => roadmap.subject.code === subjectCode) ?? null
  );
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
  authoredTopics: AuthoredCourseTopicContent[] = [],
): CourseSubjectCardsResponse {
  const roadmapSubjectCodes = new Set(
    roadmaps.map((roadmap) => roadmap.subject.code),
  );
  const authoredTopicBySubject = groupAuthoredTopicsBySubject(authoredTopics);
  const authoredCards = [...authoredTopicBySubject.entries()]
    .filter(([subjectCode]) => !roadmapSubjectCodes.has(subjectCode))
    .map(([subjectCode, topics]) => ({
      subject: {
        code: subjectCode,
        name: subjectNames[subjectCode] ?? subjectCode,
      },
      title: subjectNames[subjectCode] ?? subjectCode,
      description: buildAuthoredSubjectDescription(topics),
      progressPercent: 0,
      unitCount: topics.length,
      topicCount: topics.length,
      completedTopicCount: 0,
      continueTopicCode: null,
    }));

  return {
    data: [
      ...roadmaps.map((roadmap) => ({
        subject: roadmap.subject,
        title: roadmap.subject.name,
        description: roadmap.description,
        progressPercent: roadmap.progressPercent,
        unitCount: roadmap.sections.length,
        topicCount: roadmap.totalNodeCount,
        completedTopicCount: roadmap.solidNodeCount,
        continueTopicCode: resolveContinueTopicCode(roadmap),
      })),
      ...authoredCards,
    ],
  };
}

export function buildCourseSubjectResponse(input: {
  subjectCode: string;
  roadmaps: StudyRoadmapsResponse['data'];
  filters: FiltersResponse;
  authoredTopics?: AuthoredCourseTopicContent[];
}): CourseSubjectResponse | null {
  const roadmap = findRoadmap(input.roadmaps, input.subjectCode);
  const authoredTopics = input.authoredTopics ?? [];

  if (!roadmap && authoredTopics.length === 0) {
    return null;
  }

  const topicTree = buildSubjectTopicTree(input.filters, input.subjectCode);
  const topicByCode = buildTopicLookup(topicTree);
  const units = roadmap
    ? roadmap.sections.length > 0
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
        ]
    : [];
  const existingTopicSlugs = new Set(
    units.flatMap((unit) => unit.topics.map((topic) => topic.slug)),
  );
  const authoredUnits = authoredTopics
    .filter((topic) => !existingTopicSlugs.has(topic.topicSlug))
    .map((topic) => buildAuthoredCourseUnit(topic));
  const subject =
    roadmap?.subject ??
    resolveSubjectIdentity(input.filters, input.subjectCode);

  return {
    subject,
    title: roadmap?.title ?? subject.name,
    description:
      roadmap?.description ?? buildAuthoredSubjectDescription(authoredTopics),
    progressPercent: roadmap?.progressPercent ?? 0,
    topicCount: (roadmap?.totalNodeCount ?? 0) + authoredUnits.length,
    completedTopicCount: roadmap?.solidNodeCount ?? 0,
    continueTopicCode: roadmap ? resolveContinueTopicCode(roadmap) : null,
    units: [...units, ...authoredUnits],
  };
}

export function buildCourseTopicResponse(input: {
  subjectCode: string;
  topicSlug: string;
  roadmaps: StudyRoadmapsResponse['data'];
  filters: FiltersResponse;
  authoredTopic?: AuthoredCourseTopicContent | null;
}): CourseTopicResponse | null {
  const roadmap = findRoadmap(input.roadmaps, input.subjectCode);

  if (!roadmap && !input.authoredTopic) {
    return null;
  }

  const topicTree = buildSubjectTopicTree(input.filters, input.subjectCode);
  const topicBySlug = buildSlugLookup(topicTree);
  const topic = topicBySlug.get(input.topicSlug);

  if (!topic && !input.authoredTopic) {
    return null;
  }

  const authoredPresentation = input.authoredTopic
    ? resolveAuthoredTopicPresentation(input.authoredTopic)
    : null;
  const topicCode = topic?.code ?? authoredPresentation?.topicCode ?? '';
  const roadmapNode = roadmap?.sections
    .flatMap((section) => section.nodes)
    .find((node) => node.topicCode === topicCode);
  const section = roadmap
    ? findSectionForTopic(roadmap.sections, topicCode)
    : null;
  const fallbackConcepts = topic
    ? (topic.children.length > 0 ? topic.children : [topic]).map((child) => ({
        conceptCode: child.code,
        slug: child.slug,
        unitCode: null,
        role: 'LESSON' as const,
        title: child.name,
        description: child.children.length
          ? `${child.children.length} محاور فرعية`
          : null,
      }))
    : [];

  const concepts = input.authoredTopic?.concepts.length
    ? input.authoredTopic.concepts.map((concept) => ({
        conceptCode: concept.conceptCode,
        slug: concept.slug,
        unitCode: concept.unitCode ?? null,
        role: concept.role ?? 'LESSON',
        title: concept.roadmapTitle ?? concept.title,
        description: concept.summary,
      }))
    : fallbackConcepts;
  const subject =
    roadmap?.subject ??
    resolveSubjectIdentity(input.filters, input.subjectCode);

  return {
    subject,
    topic: {
      code: topic?.code ?? authoredPresentation?.topicCode ?? input.topicSlug,
      slug: topic?.slug ?? input.topicSlug,
      title: authoredPresentation?.title ?? topic?.name ?? input.topicSlug,
      shortTitle:
        authoredPresentation?.shortTitle ?? topic?.name ?? input.topicSlug,
    },
    parentUnitTitle:
      section?.title ?? authoredPresentation?.parentUnitTitle ?? null,
    description:
      roadmapNode?.description ?? authoredPresentation?.description ?? null,
    progressPercent: roadmapNode?.progressPercent ?? 0,
    status: mapNodeStatus(roadmapNode?.status),
    concepts,
  };
}

export function buildCourseConceptResponse(input: {
  subjectCode: string;
  topicSlug: string;
  conceptSlug: string;
  roadmaps: StudyRoadmapsResponse['data'];
  filters: FiltersResponse;
  authoredTopic: AuthoredCourseTopicContent | null;
}): CourseConceptResponse | null {
  if (!input.authoredTopic) {
    return null;
  }

  const topicResponse = buildCourseTopicResponse({
    subjectCode: input.subjectCode,
    topicSlug: input.topicSlug,
    roadmaps: input.roadmaps,
    filters: input.filters,
    authoredTopic: input.authoredTopic,
  });

  if (!topicResponse) {
    return null;
  }

  const conceptIndex = input.authoredTopic.concepts.findIndex(
    (concept) => concept.slug === input.conceptSlug,
  );

  if (conceptIndex < 0) {
    return null;
  }

  const concept = input.authoredTopic.concepts[conceptIndex];
  const previousConcept =
    input.authoredTopic.concepts[conceptIndex - 1] ?? null;
  const nextConcept = input.authoredTopic.concepts[conceptIndex + 1] ?? null;

  return {
    subject: topicResponse.subject,
    topic: topicResponse.topic,
    concept: {
      conceptCode: concept.conceptCode,
      slug: concept.slug,
      unitCode: concept.unitCode ?? null,
      role: concept.role ?? 'LESSON',
      title: concept.title,
      summary: concept.summary,
      estimatedMinutes: concept.estimatedMinutes,
    },
    navigation: {
      previousConceptSlug: previousConcept?.slug ?? null,
      nextConceptSlug: nextConcept?.slug ?? null,
    },
    steps: concept.steps,
    depthPortals: concept.depthPortals ?? [],
    quiz: concept.quiz,
  };
}
