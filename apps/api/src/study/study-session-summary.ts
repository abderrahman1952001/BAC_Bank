import type { RecentStudySessionsResponse } from '@bac-bank/contracts/study';
import { StudySessionResumeMode } from '@prisma/client';
import {
  buildStudySessionProgress,
  flattenStudySessionQuestionRows,
  resolveEffectiveStudySessionStatus,
} from './study-session-state';

export type RecentStudySessionSummaryRow = {
  id: string;
  title: string | null;
  family: RecentStudySessionsResponse['data'][number]['family'];
  kind: RecentStudySessionsResponse['data'][number]['kind'];
  status: RecentStudySessionsResponse['data'][number]['status'];
  sourceExamId: string | null;
  requestedExerciseCount: number;
  durationMinutes: number | null;
  startedAt: Date | null;
  deadlineAt: Date | null;
  completedAt: Date | null;
  lastInteractedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  exercises: Array<{
    sessionQuestions: Array<{
      questionNodeId: string;
      sequenceIndex: number;
      answerState: StoredStudySessionQuestionRow['answerState'];
      reflection: StoredStudySessionQuestionRow['reflection'];
      diagnosis: StoredStudySessionQuestionRow['diagnosis'];
      firstOpenedAt: Date | null;
      lastInteractedAt: Date | null;
      completedAt: Date | null;
      skippedAt: Date | null;
      solutionViewedAt: Date | null;
      timeSpentSeconds: number;
      revealCount: number;
    }>;
  }>;
  _count: {
    exercises: number;
  };
};

export function buildRecentStudySessionsResponse(
  sessions: RecentStudySessionSummaryRow[],
): RecentStudySessionsResponse {
  return {
    data: sessions.map((session) => ({
      id: session.id,
      title: session.title,
      family: session.family,
      kind: session.kind,
      status: resolveEffectiveStudySessionStatus(session),
      sourceExamId: session.sourceExamId,
      requestedExerciseCount: session.requestedExerciseCount,
      exerciseCount: session._count.exercises,
      durationMinutes: session.durationMinutes,
      startedAt: session.startedAt?.toISOString() ?? null,
      deadlineAt: session.deadlineAt?.toISOString() ?? null,
      completedAt: session.completedAt?.toISOString() ?? null,
      lastInteractedAt: session.lastInteractedAt?.toISOString() ?? null,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      progressSummary: buildStudySessionProgress({
        resumeMode: StudySessionResumeMode.SOLVE,
        activeExerciseId: null,
        activeQuestionId: null,
        sessionQuestions: flattenStudySessionQuestionRows(session.exercises),
        updatedAt: session.updatedAt,
      }).summary,
    })),
  };
}
