import type { StudySessionResponse } from '@bac-bank/contracts/study';
import {
  StudySessionFamily,
  StudySessionResumeMode,
  StudySessionStatus,
} from '@prisma/client';
import { resolveStudySupportStyle } from './study-pedagogy';
import {
  buildStudySessionProgress,
  flattenStudySessionQuestionRows,
  resolveEffectiveStudySessionStatus,
  type StudySessionQuestionContainer,
} from './study-session-state';

export type StudySessionResponseSessionRow = {
  id: string;
  title: string | null;
  family: StudySessionFamily;
  kind: StudySessionResponse['kind'];
  status: StudySessionStatus;
  sourceExamId: string | null;
  requestedExerciseCount: number;
  durationMinutes: number | null;
  timingEnabled: boolean;
  resumeMode: StudySessionResumeMode;
  startedAt: Date | null;
  deadlineAt: Date | null;
  submittedAt: Date | null;
  completedAt: Date | null;
  lastInteractedAt: Date | null;
  activeExerciseNodeId: string | null;
  activeQuestionNodeId: string | null;
  createdAt: Date;
  updatedAt: Date;
  exercises: StudySessionQuestionContainer[];
};

export function resolveStudySessionPedagogyContext(input: {
  storedFilters: StudySessionResponse['filters'];
  responseExercises: StudySessionResponse['exercises'];
}) {
  const subjectCode =
    input.responseExercises[0]?.exam.subject.code ??
    input.storedFilters?.subjectCode ??
    null;
  const supportStyle = resolveStudySupportStyle(subjectCode);

  return {
    subjectCode,
    supportStyle,
  };
}

export function buildStudySessionResponse(input: {
  session: StudySessionResponseSessionRow;
  storedFilters: StudySessionResponse['filters'];
  responseExercises: StudySessionResponse['exercises'];
  supportStyle: StudySessionResponse['pedagogy']['supportStyle'];
  weakPointIntro: StudySessionResponse['pedagogy']['weakPointIntro'];
}): StudySessionResponse {
  const status = resolveEffectiveStudySessionStatus(input.session);

  return {
    timingEnabled: input.session.timingEnabled,
    id: input.session.id,
    title: input.session.title,
    family: input.session.family,
    kind: input.session.kind,
    status,
    sourceExamId: input.session.sourceExamId,
    requestedExerciseCount: input.session.requestedExerciseCount,
    exerciseCount: input.session.exercises.length,
    durationMinutes: input.session.durationMinutes,
    filters: input.storedFilters,
    progress: buildStudySessionProgress({
      resumeMode:
        input.session.family === StudySessionFamily.SIMULATION &&
        status === StudySessionStatus.EXPIRED
          ? StudySessionResumeMode.REVIEW
          : input.session.resumeMode,
      activeExerciseId: input.session.activeExerciseNodeId,
      activeQuestionId: input.session.activeQuestionNodeId,
      sessionQuestions: flattenStudySessionQuestionRows(
        input.session.exercises,
      ),
      updatedAt: input.session.updatedAt,
    }),
    pedagogy: {
      supportStyle: input.supportStyle,
      weakPointIntro: input.weakPointIntro,
    },
    startedAt: input.session.startedAt?.toISOString() ?? null,
    deadlineAt: input.session.deadlineAt?.toISOString() ?? null,
    submittedAt: input.session.submittedAt?.toISOString() ?? null,
    completedAt: input.session.completedAt?.toISOString() ?? null,
    lastInteractedAt: input.session.lastInteractedAt?.toISOString() ?? null,
    createdAt: input.session.createdAt.toISOString(),
    updatedAt: input.session.updatedAt.toISOString(),
    exercises: input.responseExercises,
  };
}
