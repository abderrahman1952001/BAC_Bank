import type { StudySessionResponse } from '@bac-bank/contracts/study';
import {
  StudyQuestionAnswerState,
  StudySessionFamily,
  StudySessionKind,
  StudySessionResumeMode,
  StudySessionStatus,
} from '@prisma/client';
import {
  buildStudySessionResponse,
  resolveStudySessionPedagogyContext,
} from './study-session-response';

const responseExercises = [
  {
    sessionOrder: 1,
    id: 'exercise-1',
    orderIndex: 1,
    title: 'Exercise 1',
    totalPoints: 5,
    hierarchy: {
      exerciseNodeId: 'exercise-1',
      exerciseLabel: 'Exercise 1',
      contextBlocks: [],
      questions: [],
    },
    exam: {
      id: 'exam-se',
      year: 2024,
      sessionType: 'NORMAL',
      subject: {
        code: 'MATH',
        name: 'Mathematics',
      },
      stream: {
        code: 'SE',
        name: 'Sciences experimentales',
      },
    },
    questionCount: 1,
  },
] satisfies StudySessionResponse['exercises'];

describe('study session response helpers', () => {
  it('resolves pedagogy context from exercises first and falls back to stored filters', () => {
    expect(
      resolveStudySessionPedagogyContext({
        storedFilters: {
          subjectCode: 'PHILO',
        },
        responseExercises,
      }),
    ).toEqual({
      subjectCode: 'MATH',
      supportStyle: 'LOGIC_HEAVY',
    });

    expect(
      resolveStudySessionPedagogyContext({
        storedFilters: {
          subjectCode: 'PHILO',
        },
        responseExercises: [],
      }),
    ).toEqual({
      subjectCode: 'PHILO',
      supportStyle: 'ESSAY_HEAVY',
    });
  });

  it('builds a session response and switches expired simulations into review mode', () => {
    const response = buildStudySessionResponse({
      session: {
        id: 'session-1',
        title: 'Simulation',
        family: StudySessionFamily.SIMULATION,
        kind: StudySessionKind.PAPER_SIMULATION,
        status: StudySessionStatus.IN_PROGRESS,
        sourceExamId: 'exam-se',
        requestedExerciseCount: 1,
        durationMinutes: 180,
        timingEnabled: false,
        resumeMode: StudySessionResumeMode.SOLVE,
        startedAt: new Date('2026-04-18T06:00:00.000Z'),
        deadlineAt: new Date('2026-04-18T07:00:00.000Z'),
        submittedAt: null,
        completedAt: null,
        lastInteractedAt: new Date('2026-04-18T06:30:00.000Z'),
        activeExerciseNodeId: 'exercise-1',
        activeQuestionNodeId: 'question-1',
        createdAt: new Date('2026-04-18T06:00:00.000Z'),
        updatedAt: new Date('2026-04-18T06:30:00.000Z'),
        exercises: [
          {
            sessionQuestions: [
              {
                questionNodeId: 'question-1',
                sequenceIndex: 1,
                answerState: StudyQuestionAnswerState.OPENED,
                reflection: null,
                diagnosis: null,
                firstOpenedAt: new Date('2026-04-18T06:05:00.000Z'),
                lastInteractedAt: new Date('2026-04-18T06:25:00.000Z'),
                completedAt: null,
                skippedAt: null,
                solutionViewedAt: null,
                timeSpentSeconds: 90,
                revealCount: 0,
              },
            ],
          },
        ],
      },
      storedFilters: {
        subjectCode: 'MATH',
        topicCodes: ['FUNC'],
      },
      responseExercises,
      supportStyle: 'LOGIC_HEAVY',
      weakPointIntro: null,
    });

    expect(response.status).toBe(StudySessionStatus.EXPIRED);
    expect(response.filters).toEqual({
      subjectCode: 'MATH',
      topicCodes: ['FUNC'],
    });
    expect(response.pedagogy).toEqual({
      supportStyle: 'LOGIC_HEAVY',
      weakPointIntro: null,
    });
    expect(response.progress).toMatchObject({
      mode: 'REVIEW',
      activeExerciseId: 'exercise-1',
      activeQuestionId: 'question-1',
      summary: {
        totalQuestionCount: 1,
        trackedTimeSeconds: 90,
      },
    });
    expect(response.exercises).toEqual(responseExercises);
  });
});
