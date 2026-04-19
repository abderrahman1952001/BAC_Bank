import {
  StudyQuestionAnswerState,
  StudySessionFamily,
  StudySessionKind,
  StudySessionStatus,
} from '@prisma/client';
import { buildRecentStudySessionsResponse } from './study-session-summary';

describe('study session summary helpers', () => {
  it('maps recent session rows into API payloads with progress summaries', () => {
    const response = buildRecentStudySessionsResponse([
      {
        id: 'session-1',
        title: 'Revision sprint',
        family: StudySessionFamily.DRILL,
        kind: StudySessionKind.TOPIC_DRILL,
        status: StudySessionStatus.IN_PROGRESS,
        sourceExamId: null,
        requestedExerciseCount: 6,
        durationMinutes: null,
        startedAt: new Date('2026-04-18T09:00:00.000Z'),
        deadlineAt: null,
        completedAt: null,
        lastInteractedAt: new Date('2026-04-18T09:25:00.000Z'),
        createdAt: new Date('2026-04-18T09:00:00.000Z'),
        updatedAt: new Date('2026-04-18T09:30:00.000Z'),
        exercises: [
          {
            sessionQuestions: [
              {
                questionNodeId: 'question-2',
                sequenceIndex: 2,
                answerState: StudyQuestionAnswerState.ANSWERED,
                reflection: null,
                diagnosis: null,
                firstOpenedAt: new Date('2026-04-18T09:05:00.000Z'),
                lastInteractedAt: new Date('2026-04-18T09:15:00.000Z'),
                completedAt: new Date('2026-04-18T09:15:00.000Z'),
                skippedAt: null,
                solutionViewedAt: null,
                timeSpentSeconds: 25,
                revealCount: 0,
              },
              {
                questionNodeId: 'question-1',
                sequenceIndex: 1,
                answerState: StudyQuestionAnswerState.REVEALED,
                reflection: null,
                diagnosis: null,
                firstOpenedAt: new Date('2026-04-18T09:02:00.000Z'),
                lastInteractedAt: new Date('2026-04-18T09:10:00.000Z'),
                completedAt: null,
                skippedAt: null,
                solutionViewedAt: new Date('2026-04-18T09:10:00.000Z'),
                timeSpentSeconds: 10,
                revealCount: 1,
              },
            ],
          },
        ],
        _count: {
          exercises: 1,
        },
      },
    ]);

    expect(response).toEqual({
      data: [
        expect.objectContaining({
          id: 'session-1',
          status: StudySessionStatus.IN_PROGRESS,
          exerciseCount: 1,
          progressSummary: {
            totalQuestionCount: 2,
            completedQuestionCount: 1,
            skippedQuestionCount: 0,
            unansweredQuestionCount: 1,
            solutionViewedCount: 1,
            trackedTimeSeconds: 35,
          },
        }),
      ],
    });
  });

  it('marks overdue simulations as expired when shaping recent session rows', () => {
    const response = buildRecentStudySessionsResponse([
      {
        id: 'session-2',
        title: 'Official simulation',
        family: StudySessionFamily.SIMULATION,
        kind: StudySessionKind.PAPER_SIMULATION,
        status: StudySessionStatus.IN_PROGRESS,
        sourceExamId: 'exam-1',
        requestedExerciseCount: 4,
        durationMinutes: 180,
        startedAt: new Date('2026-04-18T06:00:00.000Z'),
        deadlineAt: new Date('2026-04-18T07:00:00.000Z'),
        completedAt: null,
        lastInteractedAt: new Date('2026-04-18T06:30:00.000Z'),
        createdAt: new Date('2026-04-18T06:00:00.000Z'),
        updatedAt: new Date('2026-04-18T06:30:00.000Z'),
        exercises: [],
        _count: {
          exercises: 0,
        },
      },
    ]);

    expect(response.data[0]).toEqual(
      expect.objectContaining({
        status: StudySessionStatus.EXPIRED,
        durationMinutes: 180,
      }),
    );
  });
});
