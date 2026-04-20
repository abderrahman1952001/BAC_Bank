import type { StudySessionProgress } from '@bac-bank/contracts/study';
import {
  StudyQuestionAnswerState,
  StudyQuestionDiagnosis,
  StudyQuestionEvaluationMode,
  StudyQuestionReflection,
  StudyQuestionResultStatus,
  StudySessionFamily,
  StudySessionResumeMode,
  StudySessionStatus,
  type Prisma,
} from '@prisma/client';

export type StudySessionProgressSnapshot = StudySessionProgress;

export type StoredStudySessionQuestionRow = {
  questionId: string;
  sequenceIndex: number;
  answerState: StudyQuestionAnswerState;
  resultStatus: StudyQuestionResultStatus;
  evaluationMode: StudyQuestionEvaluationMode;
  reflection: StudyQuestionReflection | null;
  diagnosis: StudyQuestionDiagnosis | null;
  firstOpenedAt: Date | null;
  lastInteractedAt: Date | null;
  completedAt: Date | null;
  skippedAt: Date | null;
  solutionViewedAt: Date | null;
  timeSpentSeconds: number;
  revealCount: number;
  answerPayloadJson: Prisma.JsonValue | null;
};

export type RequestedStudySessionQuestionState = {
  questionId: string;
  opened?: boolean;
  completed?: boolean;
  skipped?: boolean;
  solutionViewed?: boolean;
  timeSpentSeconds?: number;
  reflection?: StudyQuestionReflection;
  diagnosis?: StudyQuestionDiagnosis;
};

export type StoredStudySessionExerciseRow = {
  id: string;
  exerciseNodeId: string;
  orderIndex: number;
  firstOpenedAt: Date | null;
  lastInteractedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  sessionQuestions: StoredStudySessionQuestionRow[];
};

export type StudySessionQuestionRowInput = {
  questionNodeId: string;
  sequenceIndex: number;
  answerState: StoredStudySessionQuestionRow['answerState'];
  resultStatus: StoredStudySessionQuestionRow['resultStatus'];
  evaluationMode: StoredStudySessionQuestionRow['evaluationMode'];
  reflection: StoredStudySessionQuestionRow['reflection'];
  diagnosis: StoredStudySessionQuestionRow['diagnosis'];
  firstOpenedAt: Date | null;
  lastInteractedAt: Date | null;
  completedAt: Date | null;
  skippedAt: Date | null;
  solutionViewedAt: Date | null;
  timeSpentSeconds: number;
  revealCount: number;
  answerPayloadJson: Prisma.JsonValue | null;
};

export type StudySessionQuestionContainer = {
  sessionQuestions?: StudySessionQuestionRowInput[] | null;
};

export function buildStudySessionProgress(input: {
  resumeMode: StudySessionResumeMode;
  activeExerciseId: string | null;
  activeQuestionId: string | null;
  sessionQuestions: StoredStudySessionQuestionRow[];
  updatedAt: Date;
}): StudySessionProgress {
  const questionStates = [...input.sessionQuestions]
    .sort((a, b) => {
      if (a.sequenceIndex !== b.sequenceIndex) {
        return a.sequenceIndex - b.sequenceIndex;
      }

      return a.questionId.localeCompare(b.questionId);
    })
    .map((question) => toStudySessionProgressQuestionState(question));
  const completedQuestionCount = questionStates.filter(
    (question) => question.completed,
  ).length;
  const skippedQuestionCount = questionStates.filter(
    (question) => question.skipped,
  ).length;
  const solutionViewedCount = questionStates.filter(
    (question) => question.solutionViewed,
  ).length;
  const trackedTimeSeconds = questionStates.reduce(
    (total, question) => total + question.timeSpentSeconds,
    0,
  );

  return {
    activeExerciseId: input.activeExerciseId,
    activeQuestionId: input.activeQuestionId,
    mode:
      input.resumeMode === StudySessionResumeMode.REVIEW ? 'REVIEW' : 'SOLVE',
    questionStates,
    summary: {
      totalQuestionCount: questionStates.length,
      completedQuestionCount,
      skippedQuestionCount,
      unansweredQuestionCount: Math.max(
        questionStates.length - completedQuestionCount - skippedQuestionCount,
        0,
      ),
      solutionViewedCount,
      trackedTimeSeconds,
    },
    updatedAt: input.updatedAt.toISOString(),
  };
}

export function flattenStudySessionQuestionRows(
  exercises: StudySessionQuestionContainer[],
): StoredStudySessionQuestionRow[] {
  return exercises.flatMap((exercise) =>
    (exercise.sessionQuestions ?? []).map((question) => ({
      questionId: question.questionNodeId,
      sequenceIndex: question.sequenceIndex,
      answerState: question.answerState,
      resultStatus: question.resultStatus,
      evaluationMode: question.evaluationMode,
      reflection: question.reflection,
      diagnosis: question.diagnosis,
      firstOpenedAt: question.firstOpenedAt,
      lastInteractedAt: question.lastInteractedAt,
      completedAt: question.completedAt,
      skippedAt: question.skippedAt,
      solutionViewedAt: question.solutionViewedAt,
      timeSpentSeconds: question.timeSpentSeconds,
      revealCount: question.revealCount,
      answerPayloadJson: question.answerPayloadJson,
    })),
  );
}

export function resolveNextStudySessionQuestionState(input: {
  current: StoredStudySessionQuestionRow;
  requested: RequestedStudySessionQuestionState | undefined;
  now: Date;
  becameActive: boolean;
  allowSolutionReveal: boolean;
  allowReflection: boolean;
  allowDiagnosis: boolean;
  timingEnabled: boolean;
}): StoredStudySessionQuestionRow {
  if (!input.requested && !input.becameActive) {
    return input.current;
  }

  const currentProgress = toStudySessionProgressQuestionState(input.current);
  const desiredCompleted = Boolean(input.requested?.completed);
  const desiredSkipped = Boolean(input.requested?.skipped) && !desiredCompleted;
  const desiredSolutionViewed =
    (input.allowSolutionReveal && Boolean(input.requested?.solutionViewed)) ||
    currentProgress.solutionViewed;
  const desiredReflection = !input.allowReflection
    ? input.current.reflection
    : input.requested?.reflection === undefined
      ? input.current.reflection
      : input.requested.reflection;
  const requestedDiagnosis = input.requested?.diagnosis;
  const diagnosisAllowed =
    input.allowDiagnosis &&
    desiredReflection === StudyQuestionReflection.MISSED;
  const desiredDiagnosis = diagnosisAllowed
    ? requestedDiagnosis === undefined
      ? input.current.diagnosis
      : requestedDiagnosis
    : null;
  const desiredTimeSpentSeconds = input.timingEnabled
    ? Math.max(
        input.current.timeSpentSeconds,
        input.requested?.timeSpentSeconds ?? input.current.timeSpentSeconds,
      )
    : input.current.timeSpentSeconds;
  const desiredOpened =
    currentProgress.opened ||
    Boolean(input.requested?.opened) ||
    desiredCompleted ||
    desiredSkipped ||
    desiredSolutionViewed ||
    input.becameActive;
  const stateChanged =
    currentProgress.opened !== desiredOpened ||
    currentProgress.completed !== desiredCompleted ||
    currentProgress.skipped !== desiredSkipped ||
    currentProgress.solutionViewed !== desiredSolutionViewed ||
    currentProgress.timeSpentSeconds !== desiredTimeSpentSeconds ||
    currentProgress.reflection !== desiredReflection ||
    currentProgress.diagnosis !== desiredDiagnosis;
  const touchedAt =
    stateChanged || input.becameActive
      ? input.now
      : input.current.lastInteractedAt;

  return {
    ...input.current,
    answerState: desiredSkipped
      ? StudyQuestionAnswerState.SKIPPED
      : desiredCompleted
        ? StudyQuestionAnswerState.ANSWERED
        : desiredSolutionViewed
          ? StudyQuestionAnswerState.REVEALED
          : desiredOpened
            ? StudyQuestionAnswerState.OPENED
            : StudyQuestionAnswerState.UNSEEN,
    resultStatus: input.current.resultStatus,
    evaluationMode: input.current.evaluationMode,
    reflection: desiredReflection,
    diagnosis: desiredDiagnosis,
    firstOpenedAt: desiredOpened
      ? (input.current.firstOpenedAt ?? input.now)
      : null,
    lastInteractedAt: touchedAt,
    completedAt: desiredCompleted
      ? (input.current.completedAt ?? input.now)
      : null,
    skippedAt: desiredSkipped ? (input.current.skippedAt ?? input.now) : null,
    solutionViewedAt: desiredSolutionViewed
      ? (input.current.solutionViewedAt ?? input.now)
      : null,
    timeSpentSeconds: desiredTimeSpentSeconds,
    revealCount: desiredSolutionViewed
      ? Math.max(input.current.revealCount, 1)
      : 0,
    answerPayloadJson: input.current.answerPayloadJson,
  };
}

export function hasStudySessionQuestionStateChanged(
  current: StoredStudySessionQuestionRow,
  next: StoredStudySessionQuestionRow,
) {
  return (
    current.answerState !== next.answerState ||
    current.resultStatus !== next.resultStatus ||
    current.evaluationMode !== next.evaluationMode ||
    current.reflection !== next.reflection ||
    current.diagnosis !== next.diagnosis ||
    current.timeSpentSeconds !== next.timeSpentSeconds ||
    dateOrNullToIso(current.firstOpenedAt) !==
      dateOrNullToIso(next.firstOpenedAt) ||
    dateOrNullToIso(current.lastInteractedAt) !==
      dateOrNullToIso(next.lastInteractedAt) ||
    dateOrNullToIso(current.completedAt) !==
      dateOrNullToIso(next.completedAt) ||
    dateOrNullToIso(current.skippedAt) !== dateOrNullToIso(next.skippedAt) ||
    dateOrNullToIso(current.solutionViewedAt) !==
      dateOrNullToIso(next.solutionViewedAt) ||
    current.revealCount !== next.revealCount ||
    JSON.stringify(current.answerPayloadJson) !==
      JSON.stringify(next.answerPayloadJson)
  );
}

export function buildStudySessionExerciseState(
  exercise: StoredStudySessionExerciseRow,
) {
  const firstOpenedAt = exercise.sessionQuestions.reduce<Date | null>(
    (current, question) => {
      if (!question.firstOpenedAt) {
        return current;
      }

      if (!current || question.firstOpenedAt.getTime() < current.getTime()) {
        return question.firstOpenedAt;
      }

      return current;
    },
    null,
  );
  const lastInteractedAt = exercise.sessionQuestions.reduce<Date | null>(
    (current, question) => {
      if (!question.lastInteractedAt) {
        return current;
      }

      if (!current || question.lastInteractedAt.getTime() > current.getTime()) {
        return question.lastInteractedAt;
      }

      return current;
    },
    null,
  );
  const resolvedQuestions = exercise.sessionQuestions.filter(
    (question) => question.completedAt || question.skippedAt,
  );
  const completedAt =
    exercise.sessionQuestions.length > 0 &&
    resolvedQuestions.length === exercise.sessionQuestions.length
      ? resolvedQuestions.reduce<Date | null>((current, question) => {
          const resolvedAt = question.completedAt ?? question.skippedAt;

          if (!resolvedAt) {
            return current;
          }

          if (!current || resolvedAt.getTime() > current.getTime()) {
            return resolvedAt;
          }

          return current;
        }, null)
      : null;

  return {
    firstOpenedAt,
    lastInteractedAt,
    completedAt,
  };
}

export function dateOrNullToIso(value: Date | null) {
  return value?.toISOString() ?? null;
}

export function deriveStudySessionStatusFromProgress(
  progress: StudySessionProgressSnapshot,
  family: StudySessionFamily,
  deadlineAt: Date | null,
  now = new Date(),
  hasStarted = false,
): StudySessionStatus {
  if (
    family === StudySessionFamily.SIMULATION &&
    deadlineAt &&
    deadlineAt.getTime() <= now.getTime()
  ) {
    return StudySessionStatus.EXPIRED;
  }

  const hasActivity =
    Boolean(progress.activeExerciseId) ||
    Boolean(progress.activeQuestionId) ||
    String(progress.mode) === 'REVIEW' ||
    progress.questionStates.some(
      (state) =>
        state.opened ||
        state.completed ||
        state.skipped ||
        state.solutionViewed,
    ) ||
    progress.summary.completedQuestionCount > 0 ||
    progress.summary.skippedQuestionCount > 0 ||
    progress.summary.solutionViewedCount > 0;

  if (
    progress.summary.totalQuestionCount > 0 &&
    progress.summary.unansweredQuestionCount === 0
  ) {
    return StudySessionStatus.COMPLETED;
  }

  if (hasActivity) {
    return StudySessionStatus.IN_PROGRESS;
  }

  if (hasStarted) {
    return StudySessionStatus.IN_PROGRESS;
  }

  return StudySessionStatus.CREATED;
}

export function resolveEffectiveStudySessionStatus(
  session: {
    family: StudySessionFamily;
    status: StudySessionStatus;
    deadlineAt: Date | null;
  },
  now = new Date(),
) {
  if (
    session.status === StudySessionStatus.COMPLETED ||
    session.status === StudySessionStatus.EXPIRED
  ) {
    return session.status;
  }

  if (
    session.family === StudySessionFamily.SIMULATION &&
    session.deadlineAt &&
    session.deadlineAt.getTime() <= now.getTime()
  ) {
    return StudySessionStatus.EXPIRED;
  }

  return session.status;
}

function toStudySessionProgressQuestionState(
  question: StoredStudySessionQuestionRow,
): StudySessionProgressSnapshot['questionStates'][number] {
  return {
    questionId: question.questionId,
    opened: isStudySessionQuestionOpened(question),
    completed: question.completedAt !== null,
    skipped: question.skippedAt !== null,
    solutionViewed:
      question.solutionViewedAt !== null || question.revealCount > 0,
    timeSpentSeconds: question.timeSpentSeconds,
    resultStatus: question.resultStatus,
    evaluationMode: question.evaluationMode,
    reflection: question.reflection,
    diagnosis: question.diagnosis,
  };
}

function isStudySessionQuestionOpened(question: StoredStudySessionQuestionRow) {
  return (
    question.firstOpenedAt !== null ||
    question.answerState !== StudyQuestionAnswerState.UNSEEN
  );
}
