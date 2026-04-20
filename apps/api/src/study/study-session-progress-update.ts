import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  StudySessionFamily,
  StudyQuestionEvaluationMode,
  StudyQuestionResultStatus,
  StudySessionResumeMode,
  StudySessionStatus,
} from '@prisma/client';
import {
  StudySessionMode,
  UpdateStudySessionProgressDto,
} from './dto/update-study-session-progress.dto';
import {
  buildStudySessionExerciseState,
  buildStudySessionProgress,
  dateOrNullToIso,
  deriveStudySessionStatusFromProgress,
  hasStudySessionQuestionStateChanged,
  resolveNextStudySessionQuestionState,
  type RequestedStudySessionQuestionState,
  type StoredStudySessionExerciseRow,
  type StoredStudySessionQuestionRow,
} from './study-session-state';

type StoredSessionQuestionInput = {
  questionNodeId: string;
  sequenceIndex: number;
  answerState: StoredStudySessionQuestionRow['answerState'];
  resultStatus: StudyQuestionResultStatus;
  evaluationMode: StudyQuestionEvaluationMode;
  reflection: StoredStudySessionQuestionRow['reflection'];
  diagnosis: StoredStudySessionQuestionRow['diagnosis'];
  firstOpenedAt: Date | null;
  lastInteractedAt: Date | null;
  completedAt: Date | null;
  skippedAt: Date | null;
  solutionViewedAt: Date | null;
  timeSpentSeconds: number;
  revealCount: number;
  answerPayloadJson: StoredStudySessionQuestionRow['answerPayloadJson'];
};

type StoredSessionExerciseInput = {
  id: string;
  exerciseNodeId: string;
  orderIndex: number;
  firstOpenedAt: Date | null;
  lastInteractedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  sessionQuestions: StoredSessionQuestionInput[];
};

export type StoredStudySessionProgressSession = {
  family: StudySessionFamily;
  timingEnabled: boolean;
  resumeMode: StudySessionResumeMode;
  startedAt: Date | null;
  deadlineAt: Date | null;
  activeQuestionNodeId: string | null;
  exercises: StoredSessionExerciseInput[];
};

type DraftExerciseRow = StoredStudySessionExerciseRow & {
  id: string;
};

export type StudySessionProgressUpdateDraft = {
  requestedMode: StudySessionResumeMode;
  resolvedResumeMode: StudySessionResumeMode;
  status: StudySessionStatus;
  progress: ReturnType<typeof buildStudySessionProgress>;
  changedQuestions: Array<{
    sessionExerciseId: string;
    question: StoredStudySessionQuestionRow;
  }>;
  changedExercises: Array<{
    exerciseId: string;
    firstOpenedAt: Date | null;
    lastInteractedAt: Date | null;
    completedAt: Date | null;
  }>;
};

export function buildStudySessionProgressUpdateDraft(input: {
  existingSession: StoredStudySessionProgressSession;
  payload: UpdateStudySessionProgressDto;
  effectiveStatus: StudySessionStatus;
  now: Date;
}): StudySessionProgressUpdateDraft {
  const exercises = input.existingSession.exercises.map((exercise) =>
    toStoredSessionExerciseRow(exercise),
  );
  const requestedMode = resolveRequestedStudySessionResumeMode(
    input.payload.mode,
    input.existingSession.resumeMode,
  );
  const exercisesByNodeId = new Map(
    exercises.map((exercise) => [exercise.exerciseNodeId, exercise]),
  );
  const questionsById = buildQuestionsById(exercises);

  assertValidStudySessionProgressPayload({
    payload: input.payload,
    exercisesByNodeId,
    questionsById,
  });

  const payloadQuestionStates = buildPayloadQuestionStatesMap(
    input.payload.questionStates,
    questionsById,
  );
  const allowReviewSignals =
    input.existingSession.family !== StudySessionFamily.SIMULATION ||
    input.effectiveStatus === StudySessionStatus.COMPLETED;
  const nextExercises: DraftExerciseRow[] = exercises.map((exercise) => ({
    ...exercise,
    sessionQuestions: exercise.sessionQuestions.map((question) =>
      resolveNextStudySessionQuestionState({
        current: question,
        requested: payloadQuestionStates.get(question.questionId),
        now: input.now,
        becameActive:
          input.payload.activeQuestionId === question.questionId &&
          input.existingSession.activeQuestionNodeId !== question.questionId,
        allowSolutionReveal: allowReviewSignals,
        allowReflection: allowReviewSignals,
        allowDiagnosis: allowReviewSignals,
        timingEnabled: input.existingSession.timingEnabled,
      }),
    ),
  }));

  let progress = buildStudySessionProgress({
    resumeMode: requestedMode,
    activeExerciseId: input.payload.activeExerciseId ?? null,
    activeQuestionId: input.payload.activeQuestionId ?? null,
    sessionQuestions: nextExercises.flatMap(
      (exercise) => exercise.sessionQuestions,
    ),
    updatedAt: input.now,
  });
  const status = deriveStudySessionStatusFromProgress(
    progress,
    input.existingSession.family,
    input.existingSession.deadlineAt,
    input.now,
    Boolean(input.existingSession.startedAt),
  );

  if (
    input.existingSession.family === StudySessionFamily.SIMULATION &&
    requestedMode === StudySessionResumeMode.REVIEW &&
    status !== StudySessionStatus.COMPLETED &&
    status !== StudySessionStatus.EXPIRED
  ) {
    throw new ForbiddenException(
      'Simulation review is available only after submission or expiry.',
    );
  }

  const resolvedResumeMode =
    input.existingSession.family === StudySessionFamily.SIMULATION &&
    (status === StudySessionStatus.COMPLETED ||
      status === StudySessionStatus.EXPIRED)
      ? StudySessionResumeMode.REVIEW
      : requestedMode;

  if (resolvedResumeMode !== requestedMode) {
    progress = buildStudySessionProgress({
      resumeMode: resolvedResumeMode,
      activeExerciseId: input.payload.activeExerciseId ?? null,
      activeQuestionId: input.payload.activeQuestionId ?? null,
      sessionQuestions: nextExercises.flatMap(
        (exercise) => exercise.sessionQuestions,
      ),
      updatedAt: input.now,
    });
  }

  const currentQuestionRowsById = new Map(
    exercises.flatMap((exercise) =>
      exercise.sessionQuestions.map((question) => [
        question.questionId,
        question,
      ]),
    ),
  );
  const changedQuestions = nextExercises.flatMap((exercise) =>
    exercise.sessionQuestions
      .filter((question) =>
        hasStudySessionQuestionStateChanged(
          currentQuestionRowsById.get(question.questionId) ?? question,
          question,
        ),
      )
      .map((question) => ({
        sessionExerciseId: exercise.id,
        question,
      })),
  );
  const nextExerciseStates = nextExercises.map((exercise) => ({
    exerciseId: exercise.id,
    ...buildStudySessionExerciseState(exercise),
  }));
  const changedExercises = nextExerciseStates.filter((exerciseState) => {
    const current = exercises.find(
      (exercise) => exercise.id === exerciseState.exerciseId,
    );

    if (!current) {
      return true;
    }

    return (
      dateOrNullToIso(current.firstOpenedAt) !==
        dateOrNullToIso(exerciseState.firstOpenedAt) ||
      dateOrNullToIso(current.lastInteractedAt) !==
        dateOrNullToIso(exerciseState.lastInteractedAt) ||
      dateOrNullToIso(current.completedAt) !==
        dateOrNullToIso(exerciseState.completedAt)
    );
  });

  return {
    requestedMode,
    resolvedResumeMode,
    status,
    progress,
    changedQuestions,
    changedExercises,
  };
}

function toStoredSessionExerciseRow(
  exercise: StoredSessionExerciseInput,
): DraftExerciseRow {
  return {
    id: exercise.id,
    exerciseNodeId: exercise.exerciseNodeId,
    orderIndex: exercise.orderIndex,
    firstOpenedAt: exercise.firstOpenedAt,
    lastInteractedAt: exercise.lastInteractedAt,
    completedAt: exercise.completedAt,
    createdAt: exercise.createdAt,
    sessionQuestions: exercise.sessionQuestions.map((question) => ({
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
  };
}

function resolveRequestedStudySessionResumeMode(
  mode: UpdateStudySessionProgressDto['mode'],
  currentResumeMode: StudySessionResumeMode,
) {
  if (mode === StudySessionMode.REVIEW) {
    return StudySessionResumeMode.REVIEW;
  }

  if (mode === StudySessionMode.SOLVE) {
    return StudySessionResumeMode.SOLVE;
  }

  return currentResumeMode;
}

function buildQuestionsById(exercises: DraftExerciseRow[]) {
  const questionsById = new Map<
    string,
    {
      exerciseNodeId: string;
      question: StoredStudySessionQuestionRow;
    }
  >();

  for (const exercise of exercises) {
    for (const question of exercise.sessionQuestions) {
      questionsById.set(question.questionId, {
        exerciseNodeId: exercise.exerciseNodeId,
        question,
      });
    }
  }

  return questionsById;
}

function assertValidStudySessionProgressPayload(input: {
  payload: UpdateStudySessionProgressDto;
  exercisesByNodeId: Map<string, DraftExerciseRow>;
  questionsById: Map<
    string,
    {
      exerciseNodeId: string;
      question: StoredStudySessionQuestionRow;
    }
  >;
}) {
  if (
    input.payload.activeExerciseId &&
    !input.exercisesByNodeId.has(input.payload.activeExerciseId)
  ) {
    throw new BadRequestException(
      'The active exercise does not belong to this study session.',
    );
  }

  if (
    input.payload.activeQuestionId &&
    !input.questionsById.has(input.payload.activeQuestionId)
  ) {
    throw new BadRequestException(
      'The active question does not belong to this study session.',
    );
  }

  if (input.payload.activeExerciseId && input.payload.activeQuestionId) {
    const questionOwner = input.questionsById.get(
      input.payload.activeQuestionId,
    );

    if (
      questionOwner &&
      questionOwner.exerciseNodeId !== input.payload.activeExerciseId
    ) {
      throw new BadRequestException(
        'The active question does not belong to the selected exercise.',
      );
    }
  }
}

function buildPayloadQuestionStatesMap(
  questionStates: UpdateStudySessionProgressDto['questionStates'],
  questionsById: Map<
    string,
    {
      exerciseNodeId: string;
      question: StoredStudySessionQuestionRow;
    }
  >,
) {
  return new Map(
    (questionStates ?? []).map((questionState) => {
      if (!questionsById.has(questionState.questionId)) {
        throw new BadRequestException(
          'One or more question states do not belong to this study session.',
        );
      }

      return [
        questionState.questionId,
        questionState as RequestedStudySessionQuestionState,
      ] as const;
    }),
  );
}
