import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  StudyQuestionAnswerState,
  StudyQuestionEvaluationMode,
  StudyQuestionResultStatus,
  StudySessionFamily,
  StudySessionResumeMode,
  StudySessionStatus,
} from '@prisma/client';
import { buildStudySessionProgressUpdateDraft } from './study-session-progress-update';

function makeSession(
  overrides: Partial<
    Parameters<
      typeof buildStudySessionProgressUpdateDraft
    >[0]['existingSession']
  > = {},
): Parameters<
  typeof buildStudySessionProgressUpdateDraft
>[0]['existingSession'] {
  return {
    family: StudySessionFamily.DRILL,
    timingEnabled: true,
    resumeMode: StudySessionResumeMode.SOLVE,
    startedAt: new Date('2026-04-18T10:00:00.000Z'),
    deadlineAt: null,
    activeQuestionNodeId: null,
    exercises: [
      {
        id: 'session-exercise-1',
        exerciseNodeId: 'exercise-1',
        orderIndex: 1,
        firstOpenedAt: null,
        lastInteractedAt: null,
        completedAt: null,
        createdAt: new Date('2026-04-18T10:00:00.000Z'),
        sessionQuestions: [
          {
            questionNodeId: 'question-1',
            sequenceIndex: 1,
            answerState: StudyQuestionAnswerState.UNSEEN,
            resultStatus: StudyQuestionResultStatus.UNKNOWN,
            evaluationMode: StudyQuestionEvaluationMode.UNGRADED,
            reflection: null,
            diagnosis: null,
            firstOpenedAt: null,
            lastInteractedAt: null,
            completedAt: null,
            skippedAt: null,
            solutionViewedAt: null,
            timeSpentSeconds: 0,
            revealCount: 0,
            answerPayloadJson: null,
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe('study session progress update helpers', () => {
  it('rejects active questions that do not belong to the selected exercise', () => {
    expect(() =>
      buildStudySessionProgressUpdateDraft({
        existingSession: makeSession({
          exercises: [
            makeSession().exercises[0],
            {
              ...makeSession().exercises[0],
              id: 'session-exercise-2',
              exerciseNodeId: 'exercise-2',
              sessionQuestions: [
                {
                  ...makeSession().exercises[0].sessionQuestions[0],
                  questionNodeId: 'question-2',
                },
              ],
            },
          ],
        }),
        payload: {
          activeExerciseId: 'exercise-1',
          activeQuestionId: 'question-2',
        },
        effectiveStatus: StudySessionStatus.IN_PROGRESS,
        now: new Date('2026-04-18T10:05:00.000Z'),
      }),
    ).toThrow(
      new BadRequestException(
        'The active question does not belong to the selected exercise.',
      ),
    );
  });

  it('rejects simulation review before completion', () => {
    expect(() =>
      buildStudySessionProgressUpdateDraft({
        existingSession: makeSession({
          family: StudySessionFamily.SIMULATION,
          deadlineAt: new Date('2026-04-18T11:00:00.000Z'),
        }),
        payload: {
          mode: 'REVIEW',
        },
        effectiveStatus: StudySessionStatus.IN_PROGRESS,
        now: new Date('2026-04-18T10:05:00.000Z'),
      }),
    ).toThrow(
      new ForbiddenException(
        'Simulation review is available only after submission or expiry.',
      ),
    );
  });

  it('builds a completed simulation draft with review mode and persistence diffs', () => {
    const draft = buildStudySessionProgressUpdateDraft({
      existingSession: makeSession({
        family: StudySessionFamily.SIMULATION,
        deadlineAt: new Date('2026-04-18T11:00:00.000Z'),
      }),
      payload: {
        mode: 'REVIEW',
        activeExerciseId: 'exercise-1',
        activeQuestionId: 'question-1',
        questionStates: [
          {
            questionId: 'question-1',
            opened: true,
            completed: true,
            timeSpentSeconds: 42,
          },
        ],
      },
      effectiveStatus: StudySessionStatus.IN_PROGRESS,
      now: new Date('2026-04-18T10:05:00.000Z'),
    });

    expect(draft.requestedMode).toBe(StudySessionResumeMode.REVIEW);
    expect(draft.resolvedResumeMode).toBe(StudySessionResumeMode.REVIEW);
    expect(draft.status).toBe(StudySessionStatus.COMPLETED);
    expect(draft.progress.mode).toBe('REVIEW');
    expect(draft.changedQuestions).toHaveLength(1);
    expect(draft.changedExercises).toHaveLength(1);
    expect(draft.progress.summary.completedQuestionCount).toBe(1);
  });
});
