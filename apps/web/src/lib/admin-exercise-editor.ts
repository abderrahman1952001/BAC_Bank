import type {
  AdminExam,
  AdminFiltersResponse,
  ContentBlock,
  QuestionNode,
} from '@/lib/admin';

export type ExerciseMetadataDraft = {
  year: number;
  session: 'normal' | 'rattrapage';
  subject: string;
  branch: string;
  points: number;
  topic_codes: string[];
  context_blocks: ContentBlock[];
};

export type QuestionDraft = {
  title: string;
  parent_id: string | null;
  points: number;
  topic_codes: string[];
  content_blocks: ContentBlock[];
  solution_blocks: ContentBlock[];
  hint_blocks: ContentBlock[] | null;
};

export function buildHierarchyErrors(questions: QuestionNode[]) {
  const errors: string[] = [];
  const idSet = new Set(questions.map((question) => question.id));

  for (const question of questions) {
    if (question.parent_id && !idSet.has(question.parent_id)) {
      errors.push(
        `Question ${question.title} references missing parent ${question.parent_id}.`,
      );
    }

    if (question.parent_id && question.parent_id === question.id) {
      errors.push(`Question ${question.title} cannot reference itself as parent.`);
    }

    if (!Number.isInteger(question.order_index) || question.order_index < 1) {
      errors.push(`Question ${question.title} has invalid order_index.`);
    }
  }

  const sortedIndexes = questions
    .map((question) => question.order_index)
    .sort((a, b) => a - b);

  if (new Set(sortedIndexes).size !== sortedIndexes.length) {
    errors.push('Duplicate order_index values were detected.');
  }

  for (let index = 0; index < sortedIndexes.length; index += 1) {
    if (sortedIndexes[index] !== index + 1) {
      errors.push('order_index values must be sequential starting at 1.');
      break;
    }
  }

  const nodeById = new Map(questions.map((question) => [question.id, question]));
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function walk(nodeId: string) {
    if (visited.has(nodeId)) {
      return;
    }

    if (visiting.has(nodeId)) {
      errors.push(`Circular hierarchy detected at node ${nodeId}.`);
      return;
    }

    visiting.add(nodeId);
    const node = nodeById.get(nodeId);

    if (node?.parent_id) {
      walk(node.parent_id);
    }

    visiting.delete(nodeId);
    visited.add(nodeId);
  }

  for (const question of questions) {
    walk(question.id);
  }

  return Array.from(new Set(errors));
}

export function mapQuestionToDraft(question: QuestionNode): QuestionDraft {
  return {
    title: question.title,
    parent_id: question.parent_id,
    points: question.points ?? 0,
    topic_codes: question.topics.map((topic) => topic.code),
    content_blocks: question.content_blocks,
    solution_blocks: question.solution_blocks,
    hint_blocks: question.hint_blocks,
  };
}

export function reorderQuestions(
  questions: QuestionNode[],
  draggedId: string,
  targetId: string,
): QuestionNode[] {
  const sorted = [...questions].sort((a, b) => a.order_index - b.order_index);
  const sourceIndex = sorted.findIndex((question) => question.id === draggedId);
  const targetIndex = sorted.findIndex((question) => question.id === targetId);

  if (sourceIndex < 0 || targetIndex < 0) {
    return questions;
  }

  const target = sorted[targetIndex];
  const [dragged] = sorted.splice(sourceIndex, 1);

  sorted.splice(targetIndex, 0, {
    ...dragged,
    parent_id: target.parent_id,
  });

  return sorted.map((question, index) => ({
    ...question,
    order_index: index + 1,
  }));
}

export function buildQuestionChildrenByParentId(questions: QuestionNode[]) {
  const map = new Map<string, QuestionNode[]>();

  for (const question of questions) {
    const parentId = question.parent_id ?? 'ROOT';
    const bucket = map.get(parentId) ?? [];
    bucket.push(question);
    map.set(parentId, bucket);
  }

  for (const [key, bucket] of map) {
    map.set(
      key,
      bucket.sort((left, right) => left.order_index - right.order_index),
    );
  }

  return map;
}

export function buildSelectableQuestionParents(options: {
  questions: QuestionNode[];
  selectedQuestion: QuestionNode | null;
}) {
  const { questions, selectedQuestion } = options;

  if (!selectedQuestion) {
    return questions;
  }

  const blocked = new Set<string>([selectedQuestion.id]);

  function collectChildren(parentId: string) {
    const children = questions.filter((question) => question.parent_id === parentId);

    for (const child of children) {
      blocked.add(child.id);
      collectChildren(child.id);
    }
  }

  collectChildren(selectedQuestion.id);

  return questions.filter((question) => !blocked.has(question.id));
}

export function filterAvailableQuestionTopics(options: {
  filters: AdminFiltersResponse | null;
  exam: AdminExam | null;
}) {
  const { filters, exam } = options;

  if (!filters || !exam) {
    return [];
  }

  return filters.topics.filter((topic) => topic.subject.code === exam.subject);
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Failed to read image file.'));
    };

    reader.onerror = () => {
      reject(new Error('Failed to read image file.'));
    };

    reader.readAsDataURL(file);
  });
}
