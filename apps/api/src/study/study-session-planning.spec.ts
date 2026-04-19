import { NotFoundException } from '@nestjs/common';
import {
  ExamVariantCode,
  SessionType,
  StudySessionFamily,
  StudySessionKind,
} from '@prisma/client';
import type { ResolvedStudySessionFilters } from './study-session-filters';
import {
  buildStudySessionFiltersSnapshot,
  buildStudySessionPreviewResponse,
  selectStudySessionExercises,
} from './study-session-planning';
import type { StudySessionExerciseCandidate } from './study-session-helpers';

function makeFilters(
  overrides: Partial<ResolvedStudySessionFilters> = {},
): ResolvedStudySessionFilters {
  return {
    years: [2024],
    streamCodes: ['SE'],
    subjectCode: 'MATH',
    topicCodes: [],
    topicMatchCodes: [],
    sessionTypes: [SessionType.NORMAL],
    search: undefined,
    exerciseCount: 6,
    exerciseNodeIds: [],
    ...overrides,
  };
}

function makeCandidate(input: {
  exerciseNodeId: string;
  orderIndex?: number;
  sujetNumber?: 1 | 2;
  sujetLabel?: string;
  examOfferings?: StudySessionExerciseCandidate['examOfferings'];
  sourceExam?: StudySessionExerciseCandidate['sourceExam'];
}): StudySessionExerciseCandidate {
  const defaultExam = {
    id: 'exam-se',
    year: 2024,
    sessionType: SessionType.NORMAL,
    subject: {
      code: 'MATH',
      name: 'Mathematics',
    },
    stream: {
      code: 'SE',
      name: 'Sciences experimentales',
    },
  };

  return {
    exerciseNodeId: input.exerciseNodeId,
    orderIndex: input.orderIndex ?? 1,
    title: `Exercise ${input.exerciseNodeId}`,
    totalPoints: 10,
    questionCount: 1,
    questions: [
      {
        questionNodeId: `${input.exerciseNodeId}-question-1`,
        sequenceIndex: 1,
      },
    ],
    sujetNumber: input.sujetNumber ?? 1,
    sujetLabel: input.sujetLabel ?? `Sujet ${input.sujetNumber ?? 1}`,
    variantId: `variant-${input.exerciseNodeId}`,
    variantCode:
      (input.sujetNumber ?? 1) === 2
        ? ExamVariantCode.SUJET_2
        : ExamVariantCode.SUJET_1,
    variantTitle: null,
    sourceExam: input.sourceExam ?? defaultExam,
    examOfferings: input.examOfferings ?? [defaultExam],
    searchableText: '',
  };
}

describe('study session planning helpers', () => {
  it('builds preview responses with sujet aggregation and stream distributions', () => {
    const examSe = {
      id: 'exam-se',
      year: 2024,
      sessionType: SessionType.NORMAL,
      subject: {
        code: 'MATH',
        name: 'Mathematics',
      },
      stream: {
        code: 'SE',
        name: 'Sciences experimentales',
      },
    };
    const examTm = {
      id: 'exam-tm',
      year: 2024,
      sessionType: SessionType.NORMAL,
      subject: {
        code: 'MATH',
        name: 'Mathematics',
      },
      stream: {
        code: 'TM',
        name: 'Techniques mathematiques',
      },
    };
    const result = buildStudySessionPreviewResponse({
      sessionFamily: StudySessionFamily.DRILL,
      sessionKind: StudySessionKind.MIXED_DRILL,
      filters: makeFilters({
        streamCodes: ['SE', 'TM'],
        sessionTypes: [],
      }),
      matchingExercises: [
        makeCandidate({
          exerciseNodeId: 'exercise-1',
          sujetNumber: 1,
          sujetLabel: 'Sujet 1',
          sourceExam: examSe,
          examOfferings: [examSe, examTm],
        }),
        makeCandidate({
          exerciseNodeId: 'exercise-2',
          orderIndex: 2,
          sujetNumber: 2,
          sujetLabel: 'Sujet 2',
          sourceExam: examSe,
          examOfferings: [examSe],
        }),
      ],
    });

    expect(result).toEqual(
      expect.objectContaining({
        sessionFamily: StudySessionFamily.DRILL,
        sessionKind: StudySessionKind.MIXED_DRILL,
        subjectCode: 'MATH',
        streamCode: null,
        streamCodes: ['SE', 'TM'],
        matchingExerciseCount: 2,
        matchingSujetCount: 3,
        maxSelectableExercises: 2,
      }),
    );
    expect(result.matchingSujets).toEqual([
      expect.objectContaining({
        examId: 'exam-se',
        sujetNumber: 1,
        matchingExerciseCount: 1,
      }),
      expect.objectContaining({
        examId: 'exam-se',
        sujetNumber: 2,
        matchingExerciseCount: 1,
      }),
      expect.objectContaining({
        examId: 'exam-tm',
        sujetNumber: 1,
        matchingExerciseCount: 1,
      }),
    ]);
    expect(result.yearsDistribution).toEqual([
      {
        year: 2024,
        matchingExerciseCount: 3,
      },
    ]);
    expect(result.streamsDistribution).toEqual([
      {
        stream: examSe.stream,
        matchingExerciseCount: 2,
      },
      {
        stream: examTm.stream,
        matchingExerciseCount: 1,
      },
    ]);
    expect(result.sampleExercises).toEqual([
      expect.objectContaining({
        exerciseNodeId: 'exercise-1',
        examId: 'exam-se',
      }),
      expect.objectContaining({
        exerciseNodeId: 'exercise-2',
        examId: 'exam-se',
      }),
    ]);
  });

  it('selects exact exercises in the requested order and rejects missing ones', () => {
    const first = makeCandidate({ exerciseNodeId: 'exercise-1' });
    const second = makeCandidate({ exerciseNodeId: 'exercise-2' });

    expect(
      selectStudySessionExercises({
        filters: makeFilters({
          exerciseNodeIds: ['exercise-2', 'exercise-1'],
        }),
        candidates: [first, second],
        pickRandom: jest.fn(),
      }),
    ).toEqual([second, first]);

    expect(() =>
      selectStudySessionExercises({
        filters: makeFilters({
          exerciseNodeIds: ['exercise-2', 'exercise-3'],
        }),
        candidates: [first, second],
        pickRandom: jest.fn(),
      }),
    ).toThrow(
      new NotFoundException(
        'One or more selected exercises are no longer available.',
      ),
    );
  });

  it('uses the picker for non-exact drills and snapshots filters for persistence', () => {
    const candidates = [
      makeCandidate({ exerciseNodeId: 'exercise-1' }),
      makeCandidate({ exerciseNodeId: 'exercise-2' }),
    ];
    const pickRandom = jest.fn().mockReturnValue([candidates[1]]);
    const filters = makeFilters({
      streamCodes: ['SE', 'TM'],
      search: undefined,
    });

    expect(
      selectStudySessionExercises({
        filters,
        candidates,
        pickRandom,
      }),
    ).toEqual([candidates[1]]);
    expect(pickRandom).toHaveBeenCalledWith(candidates, 2);
    expect(buildStudySessionFiltersSnapshot(filters)).toEqual({
      years: [2024],
      streamCode: null,
      streamCodes: ['SE', 'TM'],
      subjectCode: 'MATH',
      topicCodes: [],
      sessionTypes: [SessionType.NORMAL],
      search: null,
      exerciseNodeIds: [],
    });
  });
});
