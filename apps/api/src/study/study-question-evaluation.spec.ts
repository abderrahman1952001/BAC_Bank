import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  StudyQuestionAnswerState,
  StudyQuestionEvaluationMode,
  StudyQuestionReflection,
  StudyQuestionResultStatus,
  StudySessionFamily,
  StudySessionStatus,
} from '@prisma/client';
import { buildStudyQuestionEvaluation } from './study-question-evaluation';
import type { StoredStudySessionQuestionRow } from './study-session-state';

function makeQuestionState(
  overrides: Partial<StoredStudySessionQuestionRow> = {},
): StoredStudySessionQuestionRow {
  return {
    questionId: 'question-1',
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
    solutionViewedAt: new Date('2026-04-20T10:00:00.000Z'),
    timeSpentSeconds: 75,
    revealCount: 1,
    answerPayloadJson: null,
    ...overrides,
  };
}

describe('study question evaluation helpers', () => {
  it('stores a correct self-check with reflection and self-assessed mode', () => {
    const now = new Date('2026-04-20T10:10:00.000Z');
    const nextState = buildStudyQuestionEvaluation({
      current: makeQuestionState(),
      payload: {
        resultStatus: 'CORRECT',
        reflection: 'MEDIUM',
      },
      sessionFamily: StudySessionFamily.DRILL,
      effectiveStatus: StudySessionStatus.IN_PROGRESS,
      now,
    });

    expect(nextState).toMatchObject({
      answerState: StudyQuestionAnswerState.ANSWERED,
      resultStatus: StudyQuestionResultStatus.CORRECT,
      evaluationMode: StudyQuestionEvaluationMode.SELF_ASSESSED,
      reflection: StudyQuestionReflection.MEDIUM,
      diagnosis: null,
      completedAt: now,
      skippedAt: null,
    });
    expect(nextState.answerPayloadJson).toMatchObject({
      evaluation: {
        source: 'TYPELESS_SELF_CHECK',
        submittedAt: now.toISOString(),
        resultStatus: 'CORRECT',
        reflection: 'MEDIUM',
        diagnosis: null,
      },
    });
  });

  it('maps an incorrect self-check to missed reflection and requires diagnosis', () => {
    const now = new Date('2026-04-20T10:10:00.000Z');

    expect(() =>
      buildStudyQuestionEvaluation({
        current: makeQuestionState(),
        payload: {
          resultStatus: 'INCORRECT',
        },
        sessionFamily: StudySessionFamily.DRILL,
        effectiveStatus: StudySessionStatus.IN_PROGRESS,
        now,
      }),
    ).toThrow(BadRequestException);

    const nextState = buildStudyQuestionEvaluation({
      current: makeQuestionState(),
      payload: {
        resultStatus: 'INCORRECT',
        diagnosis: 'METHOD',
      },
      sessionFamily: StudySessionFamily.DRILL,
      effectiveStatus: StudySessionStatus.IN_PROGRESS,
      now,
    });

    expect(nextState).toMatchObject({
      resultStatus: StudyQuestionResultStatus.INCORRECT,
      evaluationMode: StudyQuestionEvaluationMode.SELF_ASSESSED,
      reflection: StudyQuestionReflection.MISSED,
      diagnosis: 'METHOD',
    });
  });

  it('blocks self-check during an active simulation', () => {
    expect(() =>
      buildStudyQuestionEvaluation({
        current: makeQuestionState(),
        payload: {
          resultStatus: 'PARTIAL',
          diagnosis: 'CALCULATION',
        },
        sessionFamily: StudySessionFamily.SIMULATION,
        effectiveStatus: StudySessionStatus.IN_PROGRESS,
        now: new Date('2026-04-20T10:10:00.000Z'),
      }),
    ).toThrow(ForbiddenException);
  });
});
