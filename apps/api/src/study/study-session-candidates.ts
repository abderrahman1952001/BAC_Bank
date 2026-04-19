import { SessionType } from '@prisma/client';
import type { ResolvedStudySessionFilters } from './study-session-filters';
import {
  buildStudySessionSearchCorpus,
  collectHierarchyQuestionItemsForSession,
  getSessionTypeRank,
  getSujetLabel,
  mapVariantHierarchy,
  pushStudySessionExamOffering,
  sortStudySessionExamOfferings,
  toStudySessionExamOffering,
  toSujetNumberFromVariantCode,
  type ExamVariantWithNodes,
  type StudySessionExerciseCandidate,
} from './study-session-helpers';

export type StudySessionCandidateFilters = Pick<
  ResolvedStudySessionFilters,
  'exerciseNodeIds' | 'topicMatchCodes' | 'search'
>;

export type StudySessionCandidateExamRecord = {
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
  paper: {
    variants: ExamVariantWithNodes[];
  };
};

export function buildStudySessionExerciseCandidates(input: {
  exams: StudySessionCandidateExamRecord[];
  filters: StudySessionCandidateFilters;
}): StudySessionExerciseCandidate[] {
  const candidateMap = new Map<string, StudySessionExerciseCandidate>();
  const normalizedSearch = input.filters.search?.trim().toLowerCase() ?? null;

  for (const exam of input.exams) {
    const examOffering = toStudySessionExamOffering(exam);

    for (const variant of exam.paper.variants) {
      const sujetNumber = toSujetNumberFromVariantCode(variant.code);

      if (!sujetNumber) {
        continue;
      }

      const hierarchy = mapVariantHierarchy(variant);

      for (const exercise of hierarchy.exercises) {
        if (
          input.filters.exerciseNodeIds.length &&
          !input.filters.exerciseNodeIds.includes(exercise.id)
        ) {
          continue;
        }

        const existingCandidate = candidateMap.get(exercise.id);

        if (existingCandidate) {
          pushStudySessionExamOffering(
            existingCandidate.examOfferings,
            examOffering,
          );
          continue;
        }

        const questions = collectHierarchyQuestionItemsForSession(
          exercise.children,
          0,
          exercise.topics,
        );

        if (!questions.length) {
          continue;
        }

        if (
          input.filters.topicMatchCodes.length &&
          !questions.some((question) =>
            question.topics.some((topic) =>
              input.filters.topicMatchCodes.includes(topic.code),
            ),
          )
        ) {
          continue;
        }

        const searchableText = buildStudySessionSearchCorpus(
          exercise,
          questions,
        );

        if (normalizedSearch && !searchableText.includes(normalizedSearch)) {
          continue;
        }

        const totalPoints =
          exercise.maxPoints ??
          questions.reduce((sum, question) => sum + question.points, 0);

        candidateMap.set(exercise.id, {
          exerciseNodeId: exercise.id,
          orderIndex: exercise.orderIndex,
          title: exercise.label || null,
          totalPoints,
          questionCount: questions.length,
          questions: questions.map((question, questionIndex) => ({
            questionNodeId: question.id,
            sequenceIndex: questionIndex + 1,
          })),
          sujetNumber,
          sujetLabel: variant.title || getSujetLabel(sujetNumber),
          variantId: variant.id,
          variantCode: variant.code,
          variantTitle: variant.title,
          sourceExam: examOffering,
          examOfferings: [examOffering],
          searchableText,
        } satisfies StudySessionExerciseCandidate);
      }
    }
  }

  const candidates = Array.from(candidateMap.values()).map((candidate) => ({
    ...candidate,
    examOfferings: sortStudySessionExamOfferings(candidate.examOfferings),
  }));

  return sortStudySessionExerciseCandidates(
    candidates.map((candidate) => ({
      ...candidate,
      sourceExam: candidate.examOfferings[0] ?? candidate.sourceExam,
    })),
  );
}

export function sortStudySessionExerciseCandidates(
  candidates: StudySessionExerciseCandidate[],
): StudySessionExerciseCandidate[] {
  return [...candidates].sort((a, b) => {
    if (a.sourceExam.year !== b.sourceExam.year) {
      return b.sourceExam.year - a.sourceExam.year;
    }

    const streamOrder = a.sourceExam.stream.name.localeCompare(
      b.sourceExam.stream.name,
    );
    if (streamOrder !== 0) {
      return streamOrder;
    }

    if (a.sujetNumber !== b.sujetNumber) {
      return a.sujetNumber - b.sujetNumber;
    }

    const sessionRankDelta =
      getSessionTypeRank(a.sourceExam.sessionType) -
      getSessionTypeRank(b.sourceExam.sessionType);

    if (sessionRankDelta !== 0) {
      return sessionRankDelta;
    }

    return a.orderIndex - b.orderIndex;
  });
}
