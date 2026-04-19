import {
  StudyQuestionAnswerState,
  StudyQuestionReflection,
  StudySessionFamily,
  StudySessionResumeMode,
  StudySessionStatus,
} from '@prisma/client';
import {
  buildStudySessionExerciseState,
  buildStudySessionProgress,
  dateOrNullToIso,
  deriveStudySessionStatusFromProgress,
  hasStudySessionQuestionStateChanged,
  resolveEffectiveStudySessionStatus,
  resolveNextStudySessionQuestionState,
  type StoredStudySessionExerciseRow,
  type StoredStudySessionQuestionRow,
} from './study-session-state';

function makeQuestionRow(
  overrides: Partial<StoredStudySessionQuestionRow> = {},
): StoredStudySessionQuestionRow {
  return {
    questionId: 'question-1',
    sequenceIndex: 1,
    answerState: StudyQuestionAnswerState.UNSEEN,
    reflection: null,
    diagnosis: null,
    firstOpenedAt: null,
    lastInteractedAt: null,
    completedAt: null,
    skippedAt: null,
    solutionViewedAt: null,
    timeSpentSeconds: 0,
    revealCount: 0,
    ...overrides,
  };
}

function makeExerciseRow(
  overrides: Partial<StoredStudySessionExerciseRow> = {},
): StoredStudySessionExerciseRow {
  return {
    id: 'session-exercise-1',
    exerciseNodeId: 'exercise-1',
    orderIndex: 1,
    firstOpenedAt: null,
    lastInteractedAt: null,
    completedAt: null,
    createdAt: new Date('2026-04-18T09:00:00.000Z'),
    sessionQuestions: [],
    ...overrides,
  };
}

describe('study session state helpers', () => {
  it('builds sorted progress snapshots and aggregates summary counts', () => {
    const progress = buildStudySessionProgress({
      resumeMode: StudySessionResumeMode.REVIEW,
      activeExerciseId: 'exercise-1',
      activeQuestionId: 'question-b',
      sessionQuestions: [
        makeQuestionRow({
          questionId: 'question-b',
          sequenceIndex: 2,
          answerState: StudyQuestionAnswerState.ANSWERED,
          completedAt: new Date('2026-04-18T09:10:00.000Z'),
          timeSpentSeconds: 50,
        }),
        makeQuestionRow({
          questionId: 'question-a',
          sequenceIndex: 1,
          answerState: StudyQuestionAnswerState.REVEALED,
          solutionViewedAt: new Date('2026-04-18T09:05:00.000Z'),
          timeSpentSeconds: 20,
          revealCount: 1,
        }),
        makeQuestionRow({
          questionId: 'question-c',
          sequenceIndex: 3,
          answerState: StudyQuestionAnswerState.SKIPPED,
          skippedAt: new Date('2026-04-18T09:15:00.000Z'),
          timeSpentSeconds: 10,
        }),
      ],
      updatedAt: new Date('2026-04-18T09:20:00.000Z'),
    });

    expect(progress.mode).toBe('REVIEW');
    expect(progress.questionStates.map((state) => state.questionId)).toEqual([
      'question-a',
      'question-b',
      'question-c',
    ]);
    expect(progress.summary).toEqual({
      totalQuestionCount: 3,
      completedQuestionCount: 1,
      skippedQuestionCount: 1,
      unansweredQuestionCount: 1,
      solutionViewedCount: 1,
      trackedTimeSeconds: 80,
    });
    expect(progress.updatedAt).toBe('2026-04-18T09:20:00.000Z');
  });

  it('resolves the next question state with completion, reveal, and timing rules', () => {
    const now = new Date('2026-04-18T10:00:00.000Z');
    const nextState = resolveNextStudySessionQuestionState({
      current: makeQuestionRow({
        answerState: StudyQuestionAnswerState.OPENED,
        firstOpenedAt: new Date('2026-04-18T09:50:00.000Z'),
        lastInteractedAt: new Date('2026-04-18T09:55:00.000Z'),
        timeSpentSeconds: 12,
      }),
      requested: {
        questionId: 'question-1',
        completed: true,
        skipped: true,
        solutionViewed: true,
        reflection: StudyQuestionReflection.MISSED,
        timeSpentSeconds: 45,
      },
      now,
      becameActive: false,
      allowSolutionReveal: true,
      allowReflection: true,
      allowDiagnosis: true,
      timingEnabled: true,
    });

    expect(nextState.answerState).toBe(StudyQuestionAnswerState.ANSWERED);
    expect(nextState.firstOpenedAt?.toISOString()).toBe(
      '2026-04-18T09:50:00.000Z',
    );
    expect(nextState.completedAt?.toISOString()).toBe(
      '2026-04-18T10:00:00.000Z',
    );
    expect(nextState.skippedAt).toBeNull();
    expect(nextState.solutionViewedAt?.toISOString()).toBe(
      '2026-04-18T10:00:00.000Z',
    );
    expect(nextState.timeSpentSeconds).toBe(45);
    expect(nextState.revealCount).toBe(1);
    expect(nextState.reflection).toBe(StudyQuestionReflection.MISSED);
  });

  it('preserves restricted review fields and disabled timing updates', () => {
    const now = new Date('2026-04-18T10:00:00.000Z');
    const nextState = resolveNextStudySessionQuestionState({
      current: makeQuestionRow({
        answerState: StudyQuestionAnswerState.OPENED,
        firstOpenedAt: new Date('2026-04-18T09:50:00.000Z'),
        lastInteractedAt: new Date('2026-04-18T09:55:00.000Z'),
        reflection: StudyQuestionReflection.HARD,
        timeSpentSeconds: 18,
      }),
      requested: {
        questionId: 'question-1',
        opened: true,
        solutionViewed: true,
        reflection: StudyQuestionReflection.MISSED,
        timeSpentSeconds: 60,
      },
      now,
      becameActive: true,
      allowSolutionReveal: false,
      allowReflection: false,
      allowDiagnosis: false,
      timingEnabled: false,
    });

    expect(nextState.answerState).toBe(StudyQuestionAnswerState.OPENED);
    expect(nextState.solutionViewedAt).toBeNull();
    expect(nextState.revealCount).toBe(0);
    expect(nextState.reflection).toBe(StudyQuestionReflection.HARD);
    expect(nextState.timeSpentSeconds).toBe(18);
    expect(nextState.lastInteractedAt?.toISOString()).toBe(
      '2026-04-18T10:00:00.000Z',
    );
  });

  it('detects question changes and normalizes nullable dates', () => {
    const current = makeQuestionRow({
      firstOpenedAt: new Date('2026-04-18T09:00:00.000Z'),
      revealCount: 0,
    });
    const same = makeQuestionRow({
      firstOpenedAt: new Date('2026-04-18T09:00:00.000Z'),
      revealCount: 0,
    });
    const changed = makeQuestionRow({
      firstOpenedAt: new Date('2026-04-18T09:00:00.000Z'),
      revealCount: 1,
    });

    expect(hasStudySessionQuestionStateChanged(current, same)).toBe(false);
    expect(hasStudySessionQuestionStateChanged(current, changed)).toBe(true);
    expect(dateOrNullToIso(null)).toBeNull();
  });

  it('aggregates exercise timestamps only when every question is resolved', () => {
    const aggregated = buildStudySessionExerciseState(
      makeExerciseRow({
        sessionQuestions: [
          makeQuestionRow({
            questionId: 'question-1',
            firstOpenedAt: new Date('2026-04-18T09:05:00.000Z'),
            lastInteractedAt: new Date('2026-04-18T09:20:00.000Z'),
            completedAt: new Date('2026-04-18T09:20:00.000Z'),
          }),
          makeQuestionRow({
            questionId: 'question-2',
            firstOpenedAt: new Date('2026-04-18T09:00:00.000Z'),
            lastInteractedAt: new Date('2026-04-18T09:25:00.000Z'),
            skippedAt: new Date('2026-04-18T09:25:00.000Z'),
          }),
        ],
      }),
    );

    expect(aggregated.firstOpenedAt?.toISOString()).toBe(
      '2026-04-18T09:00:00.000Z',
    );
    expect(aggregated.lastInteractedAt?.toISOString()).toBe(
      '2026-04-18T09:25:00.000Z',
    );
    expect(aggregated.completedAt?.toISOString()).toBe(
      '2026-04-18T09:25:00.000Z',
    );
  });

  it('derives created, in-progress, completed, and expired statuses', () => {
    const createdProgress = buildStudySessionProgress({
      resumeMode: StudySessionResumeMode.SOLVE,
      activeExerciseId: null,
      activeQuestionId: null,
      sessionQuestions: [makeQuestionRow()],
      updatedAt: new Date('2026-04-18T10:30:00.000Z'),
    });
    const completedProgress = buildStudySessionProgress({
      resumeMode: StudySessionResumeMode.SOLVE,
      activeExerciseId: null,
      activeQuestionId: null,
      sessionQuestions: [
        makeQuestionRow({
          answerState: StudyQuestionAnswerState.ANSWERED,
          completedAt: new Date('2026-04-18T10:25:00.000Z'),
        }),
      ],
      updatedAt: new Date('2026-04-18T10:30:00.000Z'),
    });

    expect(
      deriveStudySessionStatusFromProgress(
        createdProgress,
        StudySessionFamily.DRILL,
        null,
        new Date('2026-04-18T10:30:00.000Z'),
      ),
    ).toBe(StudySessionStatus.CREATED);
    expect(
      deriveStudySessionStatusFromProgress(
        createdProgress,
        StudySessionFamily.DRILL,
        null,
        new Date('2026-04-18T10:30:00.000Z'),
        true,
      ),
    ).toBe(StudySessionStatus.IN_PROGRESS);
    expect(
      deriveStudySessionStatusFromProgress(
        completedProgress,
        StudySessionFamily.DRILL,
        null,
      ),
    ).toBe(StudySessionStatus.COMPLETED);
    expect(
      deriveStudySessionStatusFromProgress(
        createdProgress,
        StudySessionFamily.SIMULATION,
        new Date('2026-04-18T10:00:00.000Z'),
        new Date('2026-04-18T10:30:00.000Z'),
      ),
    ).toBe(StudySessionStatus.EXPIRED);
  });

  it('resolves effective status for active and expired simulations', () => {
    expect(
      resolveEffectiveStudySessionStatus({
        family: StudySessionFamily.DRILL,
        status: StudySessionStatus.COMPLETED,
        deadlineAt: null,
      }),
    ).toBe(StudySessionStatus.COMPLETED);
    expect(
      resolveEffectiveStudySessionStatus(
        {
          family: StudySessionFamily.SIMULATION,
          status: StudySessionStatus.IN_PROGRESS,
          deadlineAt: new Date('2026-04-18T10:00:00.000Z'),
        },
        new Date('2026-04-18T10:30:00.000Z'),
      ),
    ).toBe(StudySessionStatus.EXPIRED);
  });
});
