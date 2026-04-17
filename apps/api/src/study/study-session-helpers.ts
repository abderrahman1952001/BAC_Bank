import {
  BlockRole,
  BlockType,
  ExamNodeType,
  ExamVariantCode,
  MediaType,
  Prisma,
  PublicationStatus,
  SessionType,
} from '@prisma/client';

export type SujetNumber = 1 | 2;

export type HierarchyBlockPayload = {
  id: string;
  role: BlockRole;
  orderIndex: number;
  blockType: BlockType;
  textValue: string | null;
  data: Prisma.JsonValue | null;
  media: {
    id: string;
    url: string;
    type: MediaType;
    metadata: Prisma.JsonValue | null;
  } | null;
};

export type HierarchyTopicTagPayload = {
  code: string;
  name: string;
};

export type HierarchyNodePayload = {
  id: string;
  nodeType: ExamNodeType;
  orderIndex: number;
  label: string | null;
  maxPoints: number | null;
  status: PublicationStatus;
  metadata: Prisma.JsonValue | null;
  topics: HierarchyTopicTagPayload[];
  blocks: HierarchyBlockPayload[];
  children: HierarchyNodePayload[];
};

export type ExamVariantWithNodes = {
  id: string;
  code: ExamVariantCode;
  title: string | null;
  status: PublicationStatus;
  nodes: Array<{
    id: string;
    parentId: string | null;
    nodeType: ExamNodeType;
    orderIndex: number;
    label: string | null;
    maxPoints: Prisma.Decimal | null;
    status: PublicationStatus;
    metadata: Prisma.JsonValue | null;
    topicMappings: Array<{
      topic: {
        code: string;
        name: string;
        studentLabel: string | null;
        displayOrder: number;
      };
    }>;
    blocks: HierarchyBlockPayload[];
  }>;
};

export type StudySessionExamOffering = {
  id: string;
  year: number;
  sessionType: SessionType;
  subject: {
    code: string;
    name: string;
  };
  stream: {
    code: string;
    name: string;
  };
};

export type StudySessionExerciseCandidate = {
  exerciseNodeId: string;
  orderIndex: number;
  title: string | null;
  totalPoints: number;
  questionCount: number;
  questions: Array<{
    questionNodeId: string;
    sequenceIndex: number;
  }>;
  sujetNumber: SujetNumber;
  sujetLabel: string;
  variantId: string;
  variantCode: ExamVariantCode;
  variantTitle: string | null;
  sourceExam: StudySessionExamOffering;
  examOfferings: StudySessionExamOffering[];
  searchableText: string;
};

export type SessionHierarchyQuestionPayload = {
  id: string;
  orderIndex: number;
  label: string;
  points: number;
  depth: number;
  topics: HierarchyTopicTagPayload[];
  promptBlocks: HierarchyBlockPayload[];
  solutionBlocks: HierarchyBlockPayload[];
  hintBlocks: HierarchyBlockPayload[];
  rubricBlocks: HierarchyBlockPayload[];
};

export type SessionExerciseHierarchyPayload = {
  exerciseNodeId: string;
  exerciseLabel: string | null;
  contextBlocks: HierarchyBlockPayload[];
  questions: SessionHierarchyQuestionPayload[];
};

export function toSujetNumberFromVariantCode(
  code: ExamVariantCode,
): SujetNumber | null {
  if (code === ExamVariantCode.SUJET_1) {
    return 1;
  }

  if (code === ExamVariantCode.SUJET_2) {
    return 2;
  }

  return null;
}

export function mapVariantHierarchy(variant: ExamVariantWithNodes): {
  variantId: string;
  variantCode: ExamVariantCode;
  title: string;
  status: PublicationStatus;
  nodeCount: number;
  exercises: HierarchyNodePayload[];
} {
  const nodesByParent = new Map<string | null, ExamVariantWithNodes['nodes']>();

  for (const node of variant.nodes) {
    const parentKey = node.parentId ?? null;
    const siblings = nodesByParent.get(parentKey) ?? [];
    siblings.push(node);
    nodesByParent.set(parentKey, siblings);
  }

  for (const siblings of nodesByParent.values()) {
    siblings.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  const mapNode = (
    node: ExamVariantWithNodes['nodes'][number],
  ): HierarchyNodePayload => {
    const children = (nodesByParent.get(node.id) ?? []).map((child) =>
      mapNode(child),
    );

    return {
      id: node.id,
      nodeType: node.nodeType,
      orderIndex: node.orderIndex,
      label: node.label,
      maxPoints: node.maxPoints !== null ? Number(node.maxPoints) : null,
      status: node.status,
      metadata: node.metadata,
      topics: mapTopicTags(node.topicMappings),
      blocks: [...node.blocks]
        .sort((a, b) => {
          const roleDelta = getBlockRoleRank(a.role) - getBlockRoleRank(b.role);
          if (roleDelta !== 0) {
            return roleDelta;
          }

          return a.orderIndex - b.orderIndex;
        })
        .map((block) => ({
          id: block.id,
          role: block.role,
          orderIndex: block.orderIndex,
          blockType: block.blockType,
          textValue: block.textValue,
          data: block.data,
          media: block.media
            ? {
                id: block.media.id,
                url: block.media.url,
                type: block.media.type,
                metadata: block.media.metadata,
              }
            : null,
        })),
      children,
    };
  };

  const rootNodes = nodesByParent.get(null) ?? [];
  const mappedRoots = rootNodes.map((rootNode) => mapNode(rootNode));
  const mappedExercises = mappedRoots.filter(
    (node) => node.nodeType === ExamNodeType.EXERCISE,
  );

  return {
    variantId: variant.id,
    variantCode: variant.code,
    title: variant.title || 'الموضوع',
    status: variant.status,
    nodeCount: variant.nodes.length,
    exercises: mappedExercises.length ? mappedExercises : mappedRoots,
  };
}

export function collectHierarchyQuestionItemsForSession(
  nodes: HierarchyNodePayload[],
  depth = 0,
  inheritedTopics: HierarchyTopicTagPayload[] = [],
): SessionHierarchyQuestionPayload[] {
  const ordered = [...nodes].sort((a, b) => a.orderIndex - b.orderIndex);
  const items: SessionHierarchyQuestionPayload[] = [];

  for (const node of ordered) {
    const nodeTopics = mergeTopicTags(inheritedTopics, node.topics);
    const isQuestionNode =
      node.nodeType === ExamNodeType.QUESTION ||
      node.nodeType === ExamNodeType.SUBQUESTION;

    if (isQuestionNode) {
      items.push({
        id: node.id,
        orderIndex: node.orderIndex,
        label: node.label || `السؤال ${node.orderIndex}`,
        points: node.maxPoints ?? 0,
        depth,
        topics: nodeTopics,
        promptBlocks: blocksByRoles(node.blocks, [
          BlockRole.PROMPT,
          BlockRole.STEM,
        ]),
        solutionBlocks: blocksByRoles(node.blocks, [BlockRole.SOLUTION]),
        hintBlocks: blocksByRoles(node.blocks, [BlockRole.HINT]),
        rubricBlocks: blocksByRoles(node.blocks, [BlockRole.RUBRIC]),
      });
    }

    if (node.children.length) {
      items.push(
        ...collectHierarchyQuestionItemsForSession(
          node.children,
          isQuestionNode ? depth + 1 : depth,
          nodeTopics,
        ),
      );
    }
  }

  return items;
}

export function getExerciseContextBlocksFromHierarchy(
  exerciseNode: HierarchyNodePayload,
  contextNodes?: HierarchyNodePayload[],
): HierarchyBlockPayload[] {
  const ownContext = blocksByRoles(exerciseNode.blocks, [
    BlockRole.STEM,
    BlockRole.PROMPT,
  ]);
  const nestedContext = [...(contextNodes ?? exerciseNode.children)]
    .filter((child) => child.nodeType === ExamNodeType.CONTEXT)
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .flatMap((child) =>
      blocksByRoles(child.blocks, [BlockRole.STEM, BlockRole.PROMPT]),
    );

  return [...ownContext, ...nestedContext];
}

export function buildSessionExerciseHierarchyPayload(
  exerciseNode: HierarchyNodePayload,
  questions: SessionHierarchyQuestionPayload[],
  contextNodes?: HierarchyNodePayload[],
): SessionExerciseHierarchyPayload {
  return {
    exerciseNodeId: exerciseNode.id,
    exerciseLabel: exerciseNode.label || null,
    contextBlocks: getExerciseContextBlocksFromHierarchy(
      exerciseNode,
      contextNodes,
    ),
    questions,
  };
}

export function buildHierarchyExerciseSummaries(
  exercises: HierarchyNodePayload[],
) {
  return exercises.map((exercise) => {
    const questions = collectHierarchyQuestionItemsForSession(
      exercise.children,
      0,
      exercise.topics,
    );
    const totalPoints =
      exercise.maxPoints ??
      questions.reduce((sum, question) => sum + question.points, 0);

    return {
      id: exercise.id,
      orderIndex: exercise.orderIndex,
      title: exercise.label || null,
      totalPoints,
      questionCount: questions.length,
    };
  });
}

export function buildStudySessionSearchCorpus(
  exercise: HierarchyNodePayload,
  questions: SessionHierarchyQuestionPayload[],
): string {
  return [
    exercise.label,
    ...exercise.topics.map((topic) => topic.code),
    ...exercise.topics.map((topic) => topic.name),
    blocksToMarkdown(exercise.blocks),
    blocksToMarkdown(getExerciseContextBlocksFromHierarchy(exercise)),
    ...questions.flatMap((question) => [
      question.label,
      blocksToMarkdown(question.promptBlocks),
      blocksToMarkdown(question.solutionBlocks),
      blocksToMarkdown(question.hintBlocks),
      blocksToMarkdown(question.rubricBlocks),
      ...question.topics.map((topic) => topic.code),
      ...question.topics.map((topic) => topic.name),
    ]),
  ]
    .filter(
      (value): value is string => typeof value === 'string' && value.length > 0,
    )
    .join('\n')
    .toLowerCase();
}

export function getSujetLabel(sujetNumber: SujetNumber): string {
  return `الموضوع ${sujetNumber}`;
}

export function getSessionTypeRank(sessionType: SessionType): number {
  return sessionType === SessionType.NORMAL ? 1 : 2;
}

export function toStudySessionExamOffering<
  T extends {
    id: string;
    year: number;
    sessionType: SessionType;
    subject: {
      code: string;
      name: string;
    };
    stream: {
      code: string;
      name: string;
    };
  },
>(exam: T): StudySessionExamOffering {
  return {
    id: exam.id,
    year: exam.year,
    sessionType: exam.sessionType,
    subject: exam.subject,
    stream: exam.stream,
  };
}

export function pushStudySessionExamOffering(
  offerings: StudySessionExamOffering[],
  exam: StudySessionExamOffering,
) {
  if (offerings.some((existing) => existing.id === exam.id)) {
    return;
  }

  offerings.push(exam);
}

export function sortStudySessionExamOfferings<
  T extends StudySessionExamOffering,
>(offerings: T[]) {
  return [...offerings].sort((a, b) => {
    if (a.year !== b.year) {
      return b.year - a.year;
    }

    const streamOrder = a.stream.name.localeCompare(b.stream.name);
    if (streamOrder !== 0) {
      return streamOrder;
    }

    const subjectOrder = a.subject.name.localeCompare(b.subject.name);
    if (subjectOrder !== 0) {
      return subjectOrder;
    }

    const sessionRankDelta =
      getSessionTypeRank(a.sessionType) - getSessionTypeRank(b.sessionType);

    if (sessionRankDelta !== 0) {
      return sessionRankDelta;
    }

    return a.id.localeCompare(b.id);
  });
}

export function pickRepresentativeExamOffering<
  T extends {
    id: string;
    year: number;
    sessionType: SessionType;
    subject: {
      code: string;
      name: string;
    };
    stream: {
      code: string;
      name: string;
    };
  },
>(offerings: T[]) {
  return sortStudySessionExamOfferings(offerings)[0] ?? null;
}

function blocksByRoles(
  blocks: HierarchyBlockPayload[],
  roles: BlockRole[],
): HierarchyBlockPayload[] {
  return blocks
    .filter((block) => roles.includes(block.role))
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

function blocksToMarkdown(blocks: HierarchyBlockPayload[]): string {
  return blocks
    .map((block) => {
      const structuredText = structuredBlockText(block);

      if (structuredText) {
        return structuredText;
      }

      if (block.blockType === BlockType.IMAGE) {
        return '';
      }

      if (block.blockType === BlockType.HEADING) {
        return block.textValue ? `## ${block.textValue}` : '';
      }

      if (block.blockType === BlockType.LATEX) {
        return block.textValue ? `$$${block.textValue}$$` : '';
      }

      if (block.blockType === BlockType.CODE) {
        return block.textValue ? `\`\`\`\n${block.textValue}\n\`\`\`` : '';
      }

      return block.textValue ?? '';
    })
    .map((value) => value.trim())
    .filter((value) => Boolean(value))
    .join('\n\n');
}

function structuredBlockText(block: HierarchyBlockPayload): string | null {
  if (block.blockType === BlockType.TABLE) {
    const rows = readStructuredTableRows(block.data);

    if (rows.length > 0) {
      return rows.map((row) => row.join(' | ')).join('\n');
    }
  }

  if (
    !block.data ||
    typeof block.data !== 'object' ||
    Array.isArray(block.data)
  ) {
    return null;
  }

  const data = block.data as Record<string, unknown>;
  const values: string[] = [];

  if (typeof data.kind === 'string') {
    values.push(data.kind);
  }

  if (typeof data.caption === 'string') {
    values.push(data.caption);
  }

  const formulaGraph =
    readStructuredRecord(data.formulaGraph) ?? readStructuredRecord(data.graph);
  const probabilityTree =
    readStructuredRecord(data.probabilityTree) ??
    readStructuredRecord(data.tree);

  if (formulaGraph) {
    if (typeof formulaGraph.title === 'string') {
      values.push(formulaGraph.title);
    }

    const curves = Array.isArray(formulaGraph.curves)
      ? formulaGraph.curves
      : Array.isArray(formulaGraph.functions)
        ? formulaGraph.functions
        : [];

    for (const curve of curves) {
      if (curve && typeof curve === 'object' && !Array.isArray(curve)) {
        if (typeof (curve as Record<string, unknown>).label === 'string') {
          values.push((curve as Record<string, unknown>).label as string);
        }

        if (typeof (curve as Record<string, unknown>).fn === 'string') {
          values.push((curve as Record<string, unknown>).fn as string);
        }
      }
    }
  }

  if (probabilityTree) {
    collectProbabilityTreeText(probabilityTree, values);
  }

  return values
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .join('\n');
}

function readStructuredTableRows(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }

  const rows = (value as Record<string, unknown>).rows;

  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map((row) =>
      Array.isArray(row)
        ? row.map((cell) => String(cell ?? '').trim()).filter(Boolean)
        : [],
    )
    .filter((row) => row.length > 0);
}

function readStructuredRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function collectProbabilityTreeText(
  node: Record<string, unknown>,
  values: string[],
) {
  if (typeof node.label === 'string') {
    values.push(node.label);
  }

  if (typeof node.edgeLabel === 'string') {
    values.push(node.edgeLabel);
  }

  if (typeof node.probability === 'string') {
    values.push(node.probability);
  }

  if (!Array.isArray(node.children)) {
    return;
  }

  for (const child of node.children) {
    const childRecord = readStructuredRecord(child);

    if (childRecord) {
      collectProbabilityTreeText(childRecord, values);
    }
  }
}

function getBlockRoleRank(role: BlockRole): number {
  switch (role) {
    case BlockRole.STEM:
      return 1;
    case BlockRole.PROMPT:
      return 2;
    case BlockRole.HINT:
      return 3;
    case BlockRole.SOLUTION:
      return 4;
    case BlockRole.RUBRIC:
      return 5;
    case BlockRole.META:
      return 6;
    default:
      return 99;
  }
}

function mapTopicTags(
  mappings: Array<{
    topic: {
      code: string;
      name: string;
      studentLabel: string | null;
      displayOrder: number;
    };
  }>,
): HierarchyTopicTagPayload[] {
  return sortTopicTags(
    mappings.map((mapping) => ({
      code: mapping.topic.code,
      name: mapping.topic.studentLabel ?? mapping.topic.name,
    })),
  );
}

function sortTopicTags(
  topics: HierarchyTopicTagPayload[],
): HierarchyTopicTagPayload[] {
  return [...topics].sort((left, right) => left.name.localeCompare(right.name));
}

function mergeTopicTags(
  ...topicGroups: HierarchyTopicTagPayload[][]
): HierarchyTopicTagPayload[] {
  return sortTopicTags(
    Array.from(
      new Map(
        topicGroups
          .flatMap((group) => group)
          .map((topic) => [topic.code, topic]),
      ).values(),
    ),
  );
}
