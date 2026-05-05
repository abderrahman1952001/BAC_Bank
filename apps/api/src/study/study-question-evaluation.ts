import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  StudyQuestionAnswerState,
  StudyQuestionEvaluationMode,
  StudyQuestionReflection,
  StudyQuestionResultStatus,
  StudySessionFamily,
  StudySessionStatus,
  type Prisma,
} from '@prisma/client';
import type { SubmitStudyQuestionEvaluationRequest } from '@bac-bank/contracts/study';
import type { StoredStudySessionQuestionRow } from './study-session-state';

type StoredAnswerPayload = {
  evaluation?: {
    source: 'TYPELESS_SELF_CHECK' | 'AUTO_RULE_FINALIZATION';
    submittedAt: string;
    resultStatus: StudyQuestionResultStatus;
    reflection: StudyQuestionReflection | null;
    diagnosis: StoredStudySessionQuestionRow['diagnosis'];
  };
};

export function buildStudyQuestionEvaluation(input: {
  current: StoredStudySessionQuestionRow;
  payload: SubmitStudyQuestionEvaluationRequest;
  sessionFamily: StudySessionFamily;
  effectiveStatus: StudySessionStatus;
  now: Date;
}): StoredStudySessionQuestionRow {
  if (
    input.sessionFamily === StudySessionFamily.SIMULATION &&
    input.effectiveStatus !== StudySessionStatus.COMPLETED &&
    input.effectiveStatus !== StudySessionStatus.EXPIRED
  ) {
    throw new ForbiddenException(
      'Question evaluation is available only after the simulation ends.',
    );
  }

  if (input.payload.resultStatus === StudyQuestionResultStatus.UNKNOWN) {
    throw new BadRequestException(
      'Question evaluation requires a concrete result status.',
    );
  }

  if (input.payload.diagnosis === 'TIME_PRESSURE') {
    throw new BadRequestException(
      'Time pressure is not part of the active question diagnosis flow yet.',
    );
  }

  if (input.payload.resultStatus === StudyQuestionResultStatus.CORRECT) {
    if (
      !input.payload.reflection ||
      input.payload.reflection === StudyQuestionReflection.MISSED
    ) {
      throw new BadRequestException(
        'A non-missed reflection is required after a correct answer.',
      );
    }
  } else if (!input.payload.diagnosis) {
    throw new BadRequestException(
      'A diagnosis is required after a partial or incorrect answer.',
    );
  }

  const reflection =
    input.payload.resultStatus === StudyQuestionResultStatus.CORRECT
      ? (input.payload.reflection ?? input.current.reflection)
      : input.payload.resultStatus === StudyQuestionResultStatus.PARTIAL
        ? StudyQuestionReflection.HARD
        : StudyQuestionReflection.MISSED;
  const diagnosis =
    input.payload.resultStatus === StudyQuestionResultStatus.CORRECT
      ? null
      : (input.payload.diagnosis ?? null);
  const preserveAutoEvaluation =
    input.current.evaluationMode === StudyQuestionEvaluationMode.AUTO &&
    input.current.resultStatus !== StudyQuestionResultStatus.UNKNOWN &&
    input.current.resultStatus === input.payload.resultStatus;

  return {
    ...input.current,
    answerState: StudyQuestionAnswerState.ANSWERED,
    resultStatus: preserveAutoEvaluation
      ? input.current.resultStatus
      : input.payload.resultStatus,
    evaluationMode: preserveAutoEvaluation
      ? StudyQuestionEvaluationMode.AUTO
      : StudyQuestionEvaluationMode.SELF_ASSESSED,
    reflection,
    diagnosis,
    firstOpenedAt: input.current.firstOpenedAt ?? input.now,
    lastInteractedAt: input.now,
    completedAt: input.current.completedAt ?? input.now,
    skippedAt: null,
    answerPayloadJson: buildAnswerPayload({
      current: input.current.answerPayloadJson,
      resultStatus: input.payload.resultStatus,
      reflection,
      diagnosis,
      submittedAt: input.now,
      source: preserveAutoEvaluation
        ? 'AUTO_RULE_FINALIZATION'
        : 'TYPELESS_SELF_CHECK',
    }),
  };
}

function buildAnswerPayload(input: {
  current: Prisma.JsonValue | null;
  resultStatus: StudyQuestionResultStatus;
  reflection: StudyQuestionReflection | null;
  diagnosis: StoredStudySessionQuestionRow['diagnosis'];
  submittedAt: Date;
  source: NonNullable<StoredAnswerPayload['evaluation']>['source'];
}): Prisma.JsonValue {
  const current = readAnswerPayload(input.current);

  return {
    ...current,
    evaluation: {
      source: input.source,
      submittedAt: input.submittedAt.toISOString(),
      resultStatus: input.resultStatus,
      reflection: input.reflection,
      diagnosis: input.diagnosis,
    },
  } satisfies StoredAnswerPayload;
}

function readAnswerPayload(
  value: Prisma.JsonValue | null,
): StoredAnswerPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as StoredAnswerPayload;
}
