import { NotFoundException } from '@nestjs/common';
import type { SessionPreviewResponse } from '@bac-bank/contracts/study';
import { Prisma, StudySessionFamily, StudySessionKind } from '@prisma/client';
import type { ResolvedStudySessionFilters } from './study-session-filters';
import {
  getSessionTypeRank,
  type StudySessionExerciseCandidate,
  type SujetNumber,
} from './study-session-helpers';

const DEFAULT_PREVIEW_SUJETS_LIMIT = 80;
const DEFAULT_PREVIEW_SAMPLE_LIMIT = 6;
const MAX_SELECTABLE_EXERCISES = 20;

export function buildStudySessionPreviewResponse(input: {
  sessionFamily: StudySessionFamily;
  sessionKind: StudySessionKind;
  filters: ResolvedStudySessionFilters;
  matchingExercises: StudySessionExerciseCandidate[];
}): SessionPreviewResponse {
  const matchingSujetsMap = new Map<
    string,
    {
      examId: string;
      year: number;
      stream: {
        code: string;
        name: string;
      };
      subject: {
        code: string;
        name: string;
      };
      sessionType: SessionPreviewResponse['matchingSujets'][number]['sessionType'];
      sujetNumber: SujetNumber;
      sujetLabel: string;
      matchingExerciseCount: number;
    }
  >();
  const yearsDistributionMap = new Map<number, number>();
  const streamsDistributionMap = new Map<
    string,
    {
      stream: {
        code: string;
        name: string;
      };
      matchingExerciseCount: number;
    }
  >();

  for (const exercise of input.matchingExercises) {
    for (const exam of exercise.examOfferings) {
      yearsDistributionMap.set(
        exam.year,
        (yearsDistributionMap.get(exam.year) ?? 0) + 1,
      );

      const streamEntry = streamsDistributionMap.get(exam.stream.code);
      if (streamEntry) {
        streamEntry.matchingExerciseCount += 1;
      } else {
        streamsDistributionMap.set(exam.stream.code, {
          stream: exam.stream,
          matchingExerciseCount: 1,
        });
      }

      const key = `${exam.id}:${exercise.sujetNumber}`;
      const current = matchingSujetsMap.get(key);

      if (current) {
        current.matchingExerciseCount += 1;
        continue;
      }

      matchingSujetsMap.set(key, {
        examId: exam.id,
        year: exam.year,
        stream: exam.stream,
        subject: exam.subject,
        sessionType: exam.sessionType,
        sujetNumber: exercise.sujetNumber,
        sujetLabel: exercise.sujetLabel,
        matchingExerciseCount: 1,
      });
    }
  }

  const matchingSujetEntries = Array.from(matchingSujetsMap.values()).sort(
    (a, b) => {
      if (a.year !== b.year) {
        return b.year - a.year;
      }

      const streamOrder = a.stream.name.localeCompare(b.stream.name);
      if (streamOrder !== 0) {
        return streamOrder;
      }

      if (a.sujetNumber !== b.sujetNumber) {
        return a.sujetNumber - b.sujetNumber;
      }

      return (
        getSessionTypeRank(a.sessionType) - getSessionTypeRank(b.sessionType)
      );
    },
  );
  const matchingSujets = matchingSujetEntries.slice(
    0,
    DEFAULT_PREVIEW_SUJETS_LIMIT,
  );
  const sampleExercises = input.matchingExercises
    .slice(0, DEFAULT_PREVIEW_SAMPLE_LIMIT)
    .map((exercise) => ({
      exerciseNodeId: exercise.exerciseNodeId,
      orderIndex: exercise.orderIndex,
      title: exercise.title,
      questionCount: exercise.questionCount,
      examId: exercise.sourceExam.id,
      year: exercise.sourceExam.year,
      stream: exercise.sourceExam.stream,
      subject: exercise.sourceExam.subject,
      sessionType: exercise.sourceExam.sessionType,
      sujetNumber: exercise.sujetNumber,
      sujetLabel: exercise.sujetLabel,
    }));

  return {
    sessionFamily: input.sessionFamily,
    sessionKind: input.sessionKind,
    subjectCode: input.filters.subjectCode,
    streamCode:
      input.filters.streamCodes.length === 1
        ? input.filters.streamCodes[0]
        : null,
    streamCodes: input.filters.streamCodes,
    years: input.filters.years,
    topicCodes: input.filters.topicCodes,
    sessionTypes: input.filters.sessionTypes,
    sourceExamId: null,
    durationMinutes: null,
    matchingExerciseCount: input.matchingExercises.length,
    matchingSujetCount: matchingSujetEntries.length,
    matchingSujets,
    sampleExercises,
    yearsDistribution: Array.from(yearsDistributionMap.entries())
      .map(([year, count]) => ({
        year,
        matchingExerciseCount: count,
      }))
      .sort((a, b) => b.year - a.year),
    streamsDistribution: Array.from(streamsDistributionMap.values()).sort(
      (a, b) => b.matchingExerciseCount - a.matchingExerciseCount,
    ),
    maxSelectableExercises: Math.min(
      MAX_SELECTABLE_EXERCISES,
      input.matchingExercises.length,
    ),
  };
}

export function selectStudySessionExercises(input: {
  filters: Pick<
    ResolvedStudySessionFilters,
    'exerciseCount' | 'exerciseNodeIds'
  >;
  candidates: StudySessionExerciseCandidate[];
  pickRandom: (
    items: StudySessionExerciseCandidate[],
    count: number,
  ) => StudySessionExerciseCandidate[];
}): StudySessionExerciseCandidate[] {
  if (!input.filters.exerciseNodeIds.length) {
    return input.pickRandom(
      input.candidates,
      Math.min(input.filters.exerciseCount, input.candidates.length),
    );
  }

  const selected = input.filters.exerciseNodeIds
    .map((exerciseNodeId) =>
      input.candidates.find(
        (candidate) => candidate.exerciseNodeId === exerciseNodeId,
      ),
    )
    .filter(
      (candidate): candidate is StudySessionExerciseCandidate =>
        candidate !== undefined,
    );

  if (selected.length !== input.filters.exerciseNodeIds.length) {
    throw new NotFoundException(
      'One or more selected exercises are no longer available.',
    );
  }

  return selected;
}

export function buildStudySessionFiltersSnapshot(
  filters: ResolvedStudySessionFilters,
): Prisma.InputJsonObject {
  return {
    years: filters.years,
    streamCode:
      filters.streamCodes.length === 1 ? filters.streamCodes[0] : null,
    streamCodes: filters.streamCodes,
    subjectCode: filters.subjectCode,
    topicCodes: filters.topicCodes,
    sessionTypes: filters.sessionTypes,
    search: filters.search ?? null,
    exerciseNodeIds: filters.exerciseNodeIds,
  };
}
