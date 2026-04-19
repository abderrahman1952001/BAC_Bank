import { NotFoundException } from '@nestjs/common';
import type { StudySessionResponse } from '@bac-bank/contracts/study';
import {
  buildSessionExerciseHierarchyPayload,
  collectHierarchyQuestionItemsForSession,
  type ExamVariantWithNodes,
  type HierarchyNodePayload,
  mapVariantHierarchy,
  pickRepresentativeExamOffering,
  type StudySessionExamOffering,
} from './study-session-helpers';

type ExerciseLookupEntry = {
  exercise: HierarchyNodePayload;
  fallbackExam: StudySessionExamOffering | null;
};

export type StudySessionDetailsVariantRow = ExamVariantWithNodes & {
  paper: {
    offerings: StudySessionExamOffering[];
  };
};

export type StudySessionDetailsExerciseRow = {
  orderIndex: number;
  exam: StudySessionResponse['exercises'][number]['exam'] | null;
  exerciseNode: {
    id: string;
  };
};

export function buildStudySessionResponseExercises(input: {
  sessionId: string;
  entries: StudySessionDetailsExerciseRow[];
  variants: StudySessionDetailsVariantRow[];
}): StudySessionResponse['exercises'] {
  const exerciseByNodeId = buildStudySessionExerciseLookup(input.variants);

  return input.entries.map((entry) => {
    const linkedExercise = exerciseByNodeId.get(entry.exerciseNode.id);

    if (!linkedExercise) {
      throw new NotFoundException(
        `Study session ${input.sessionId} references missing hierarchy exercise ${entry.exerciseNode.id}.`,
      );
    }

    const questions = collectHierarchyQuestionItemsForSession(
      linkedExercise.exercise.children,
      0,
      linkedExercise.exercise.topics,
    );
    const totalPoints =
      linkedExercise.exercise.maxPoints ??
      questions.reduce((sum, question) => sum + question.points, 0);
    const hierarchy = buildSessionExerciseHierarchyPayload(
      linkedExercise.exercise,
      questions,
    );
    const exam = entry.exam ?? linkedExercise.fallbackExam;

    if (!exam) {
      throw new NotFoundException(
        `Study session ${input.sessionId} references missing exam context for exercise ${entry.exerciseNode.id}.`,
      );
    }

    return {
      sessionOrder: entry.orderIndex,
      id: linkedExercise.exercise.id,
      orderIndex: linkedExercise.exercise.orderIndex,
      title: linkedExercise.exercise.label || null,
      totalPoints,
      hierarchy,
      exam,
      questionCount: questions.length,
    };
  });
}

function buildStudySessionExerciseLookup(
  variants: StudySessionDetailsVariantRow[],
) {
  const exerciseByNodeId = new Map<string, ExerciseLookupEntry>();

  for (const variant of variants) {
    const hierarchy = mapVariantHierarchy(variant);
    const representativeExam = pickRepresentativeExamOffering(
      variant.paper.offerings,
    );

    for (const exercise of hierarchy.exercises) {
      exerciseByNodeId.set(exercise.id, {
        exercise,
        fallbackExam: representativeExam,
      });
    }
  }

  return exerciseByNodeId;
}
