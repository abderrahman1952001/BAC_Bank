import { ForbiddenException } from '@nestjs/common';
import {
  StudyQuestionAnswerState,
  StudyQuestionEvaluationMode,
  StudyQuestionResultStatus,
  StudySessionFamily,
  StudySessionStatus,
} from '@prisma/client';
import {
  buildStudyQuestionAutoRuleSubmission,
  resolveStudyQuestionAutoRuleConfig,
  resolveStudyQuestionResponseMode,
} from './study-question-auto-rule';
import type { StoredStudySessionQuestionRow } from './study-session-state';

function buildCurrentQuestionState(): StoredStudySessionQuestionRow {
  return {
    questionId: 'question-1',
    sequenceIndex: 1,
    answerState: StudyQuestionAnswerState.OPENED,
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
  };
}

describe('study question auto rule helpers', () => {
  it('resolves numeric rules and response mode from metadata', () => {
    const metadata = {
      interaction: {
        autoRule: {
          kind: 'numeric',
          acceptedValues: ['3.14'],
          tolerance: 0.01,
        },
      },
    };

    expect(resolveStudyQuestionAutoRuleConfig(metadata)).toEqual({
      kind: 'NUMERIC',
      responseMode: 'NUMERIC',
      acceptedValues: [3.14],
      tolerance: 0.01,
    });
    expect(resolveStudyQuestionResponseMode(metadata)).toBe('NUMERIC');
  });

  it('marks numeric submissions correct within tolerance', () => {
    const now = new Date('2026-04-20T12:00:00.000Z');

    const nextState = buildStudyQuestionAutoRuleSubmission({
      current: buildCurrentQuestionState(),
      payload: {
        value: '٣٫١٤',
      },
      autoRule: {
        kind: 'NUMERIC',
        responseMode: 'NUMERIC',
        acceptedValues: [3.14],
        tolerance: 0.02,
      },
      sessionFamily: StudySessionFamily.DRILL,
      effectiveStatus: StudySessionStatus.IN_PROGRESS,
      now,
    });

    expect(nextState.answerState).toBe(StudyQuestionAnswerState.ANSWERED);
    expect(nextState.resultStatus).toBe(StudyQuestionResultStatus.CORRECT);
    expect(nextState.evaluationMode).toBe(StudyQuestionEvaluationMode.AUTO);
    expect(nextState.firstOpenedAt).toEqual(now);
    expect(nextState.answerPayloadJson).toMatchObject({
      autoRule: {
        kind: 'NUMERIC',
        rawValue: '٣٫١٤',
        normalizedValue: '3.14',
        matchedValue: 3.14,
        resultStatus: 'CORRECT',
        attemptCount: 1,
      },
    });
  });

  it('marks short-text submissions partial when only some keywords match', () => {
    const nextState = buildStudyQuestionAutoRuleSubmission({
      current: buildCurrentQuestionState(),
      payload: {
        value: 'التزايد فقط',
      },
      autoRule: {
        kind: 'SHORT_TEXT',
        responseMode: 'SHORT_TEXT',
        acceptedAnswers: [],
        acceptedKeywords: ['التزايد', 'الاستمرار'],
      },
      sessionFamily: StudySessionFamily.DRILL,
      effectiveStatus: StudySessionStatus.IN_PROGRESS,
      now: new Date('2026-04-20T12:05:00.000Z'),
    });

    expect(nextState.resultStatus).toBe(StudyQuestionResultStatus.PARTIAL);
    expect(nextState.answerPayloadJson).toMatchObject({
      autoRule: {
        kind: 'SHORT_TEXT',
        normalizedValue: 'التزايد فقط',
        matchedValue: 'التزايد',
        resultStatus: 'PARTIAL',
      },
    });
  });

  it('blocks auto checking during active simulations', () => {
    expect(() =>
      buildStudyQuestionAutoRuleSubmission({
        current: buildCurrentQuestionState(),
        payload: {
          value: '12',
        },
        autoRule: {
          kind: 'NUMERIC',
          responseMode: 'NUMERIC',
          acceptedValues: [12],
          tolerance: 0,
        },
        sessionFamily: StudySessionFamily.SIMULATION,
        effectiveStatus: StudySessionStatus.IN_PROGRESS,
        now: new Date('2026-04-20T12:10:00.000Z'),
      }),
    ).toThrow(ForbiddenException);
  });
});
