"use client";

import {
  ExamHierarchyBlock,
  ExamHierarchyNode,
  ExamResponse,
  PracticeSessionResponse,
} from "@/lib/qbank";

export type StudyTopicTag = {
  code: string;
  name: string;
};

type HierarchyQuestionItem = {
  id: string;
  orderIndex: number;
  label: string;
  points: number;
  depth: number;
  topics: StudyTopicTag[];
  promptBlocks: ExamHierarchyBlock[];
  solutionBlocks: ExamHierarchyBlock[];
  hintBlocks: ExamHierarchyBlock[];
  rubricBlocks: ExamHierarchyBlock[];
};

export type StudyQuestionModel = {
  id: string;
  orderIndex: number;
  label: string;
  points: number;
  depth: number;
  topics: StudyTopicTag[];
  promptBlocks: ExamHierarchyBlock[];
  solutionBlocks: ExamHierarchyBlock[];
  hintBlocks: ExamHierarchyBlock[];
  rubricBlocks: ExamHierarchyBlock[];
};

export type StudyExerciseModel = {
  id: string;
  orderIndex: number;
  displayOrder: number;
  title: string | null;
  totalPoints: number;
  contextBlocks: ExamHierarchyBlock[];
  sourceExam: {
    year: number;
    sessionType: PracticeSessionResponse["exercises"][number]["exam"]["sessionType"];
    subject: {
      code: string;
      name: string;
    };
    stream: {
      code: string;
      name: string;
    };
  } | null;
  questions: StudyQuestionModel[];
};

function blocksByRoles(
  blocks: ExamHierarchyBlock[],
  roles: Array<"STEM" | "PROMPT" | "SOLUTION" | "HINT" | "RUBRIC" | "META">,
) {
  return blocks
    .filter((block) => roles.includes(block.role))
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

function collectHierarchyQuestionItems(
  nodes: ExamHierarchyNode[],
  depth = 0,
  inheritedTopics: StudyTopicTag[] = [],
): HierarchyQuestionItem[] {
  const ordered = [...nodes].sort((a, b) => a.orderIndex - b.orderIndex);
  const items: HierarchyQuestionItem[] = [];

  for (const node of ordered) {
    const nodeTopics = Array.from(
      new Map(
        [...inheritedTopics, ...node.topics].map((topic) => [
          topic.code,
          topic,
        ]),
      ).values(),
    ).sort((left, right) => left.name.localeCompare(right.name));
    const isQuestionNode =
      node.nodeType === "QUESTION" || node.nodeType === "SUBQUESTION";

    if (isQuestionNode) {
      items.push({
        id: node.id,
        orderIndex: node.orderIndex,
        label: node.label || `السؤال ${node.orderIndex}`,
        points: node.maxPoints ?? 0,
        depth,
        topics: nodeTopics,
        promptBlocks: blocksByRoles(node.blocks, ["PROMPT", "STEM"]),
        solutionBlocks: blocksByRoles(node.blocks, ["SOLUTION"]),
        hintBlocks: blocksByRoles(node.blocks, ["HINT"]),
        rubricBlocks: blocksByRoles(node.blocks, ["RUBRIC"]),
      });
    }

    if (node.children.length) {
      items.push(
        ...collectHierarchyQuestionItems(
          node.children,
          isQuestionNode ? depth + 1 : depth,
          nodeTopics,
        ),
      );
    }
  }

  return items;
}

function getExerciseContextBlocks(exercise: ExamHierarchyNode) {
  const ownContext = blocksByRoles(exercise.blocks, ["STEM", "PROMPT"]);
  const nestedContext = [...exercise.children]
    .filter((child) => child.nodeType === "CONTEXT")
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .flatMap((child) => blocksByRoles(child.blocks, ["STEM", "PROMPT"]));

  return [...ownContext, ...nestedContext];
}

export function buildStudyExercisesFromExam(
  exam: ExamResponse | null,
): StudyExerciseModel[] {
  if (!exam?.hierarchy) {
    return [];
  }

  const sourceExam = {
    year: exam.year,
    sessionType: exam.sessionType,
    subject: exam.subject,
    stream: exam.stream,
  };

  return exam.hierarchy.exercises.map((exercise, index) => {
    const questions = collectHierarchyQuestionItems(
      exercise.children,
      0,
      exercise.topics,
    );
    const totalPoints =
      exercise.maxPoints ??
      questions.reduce((sum, question) => sum + question.points, 0);

    return {
      id: exercise.id,
      orderIndex: exercise.orderIndex || index + 1,
      displayOrder: exercise.orderIndex || index + 1,
      title: exercise.label || null,
      totalPoints,
      contextBlocks: getExerciseContextBlocks(exercise),
      sourceExam,
      questions,
    };
  });
}

export function buildStudyExercisesFromSessionExercises(
  exercises: PracticeSessionResponse["exercises"],
): StudyExerciseModel[] {
  return exercises.map((exercise) => ({
    id: exercise.id,
    orderIndex: exercise.orderIndex,
    displayOrder: exercise.sessionOrder,
    title: exercise.hierarchy.exerciseLabel ?? exercise.title,
    totalPoints: exercise.totalPoints,
    contextBlocks: exercise.hierarchy.contextBlocks,
    sourceExam: exercise.exam,
    questions: exercise.hierarchy.questions.map((question) => ({
      id: question.id,
      orderIndex: question.orderIndex,
      label: question.label,
      points: question.points,
      depth: question.depth,
      topics: question.topics,
      promptBlocks: question.promptBlocks,
      solutionBlocks: question.solutionBlocks,
      hintBlocks: question.hintBlocks,
      rubricBlocks: question.rubricBlocks,
    })),
  }));
}

export function getStudyQuestionTopics(question: StudyQuestionModel) {
  return question.topics;
}

export function canRevealStudyQuestionSolution(
  question: StudyQuestionModel | null | undefined,
) {
  if (!question) {
    return false;
  }

  return Boolean(
    question.solutionBlocks.length ||
    question.hintBlocks.length ||
    question.rubricBlocks.length,
  );
}
