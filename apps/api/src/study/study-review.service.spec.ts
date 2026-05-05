import { Prisma } from '@prisma/client';
import { StudyReviewService } from './study-review.service';

describe('StudyReviewService', () => {
  let prisma: {
    user: {
      findUnique: jest.Mock;
    };
    studentReviewQueueItem: {
      findMany: jest.Mock;
      updateMany: jest.Mock;
      update: jest.Mock;
    };
  };
  let studySessionService: {
    createStudySession: jest.Mock;
  };
  let service: StudyReviewService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          stream: {
            code: 'SE',
          },
        }),
      },
      studentReviewQueueItem: {
        findMany: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
        update: jest.fn().mockResolvedValue(undefined),
      },
    };
    studySessionService = {
      createStudySession: jest.fn(),
    };
    service = new StudyReviewService(
      prisma as never,
      studySessionService as never,
    );
  });

  it('merges flagged exercises with question-level review queue signals', async () => {
    prisma.studentReviewQueueItem.findMany.mockResolvedValue([
      {
        questionNodeId: null,
        reasonType: 'FLAGGED',
        priorityScore: new Prisma.Decimal(35),
        lastPromotedAt: new Date('2026-04-09T09:00:00.000Z'),
        dueAt: new Date('2026-04-09T09:00:00.000Z'),
        successStreak: 0,
        lastReviewedAt: null,
        lastReviewOutcome: null,
        questionNode: null,
        exerciseNode: makeExerciseNode('exercise-1', 2, 'Fonctions'),
      },
      {
        questionNodeId: 'question-1',
        reasonType: 'MISSED',
        priorityScore: new Prisma.Decimal(50),
        lastPromotedAt: new Date('2026-04-09T10:00:00.000Z'),
        dueAt: new Date('2026-04-09T10:00:00.000Z'),
        successStreak: 1,
        lastReviewedAt: new Date('2026-04-10T08:00:00.000Z'),
        lastReviewOutcome: 'CORRECT',
        questionNode: {
          label: 'Q1',
        },
        exerciseNode: makeExerciseNode('exercise-1', 2, 'Fonctions'),
      },
      {
        questionNodeId: 'question-1',
        reasonType: 'REVEALED',
        priorityScore: new Prisma.Decimal(15),
        lastPromotedAt: new Date('2026-04-09T10:00:00.000Z'),
        dueAt: new Date('2026-04-11T10:00:00.000Z'),
        successStreak: 2,
        lastReviewedAt: new Date('2026-04-10T09:00:00.000Z'),
        lastReviewOutcome: 'CORRECT',
        questionNode: {
          label: 'Q1',
        },
        exerciseNode: makeExerciseNode('exercise-1', 2, 'Fonctions'),
      },
    ]);

    const result = await service.listMyMistakes('user-1', { limit: 6 });

    expect(result.data).toEqual([
      expect.objectContaining({
        exerciseNodeId: 'exercise-1',
        focusQuestionId: 'question-1',
        focusQuestionLabel: 'Q1',
        flagged: true,
        questionSignalCount: 1,
        reasons: ['MISSED', 'FLAGGED', 'REVEALED'],
        dueAt: '2026-04-09T09:00:00.000Z',
        successStreak: 0,
        lastReviewedAt: '2026-04-10T09:00:00.000Z',
        lastReviewOutcome: 'CORRECT',
        isDue: true,
      }),
    ]);
  });

  it('sorts stronger corrective signals ahead of lighter revealed-only items', async () => {
    prisma.studentReviewQueueItem.findMany.mockResolvedValue([
      {
        questionNodeId: 'question-1',
        reasonType: 'HARD',
        priorityScore: new Prisma.Decimal(40),
        lastPromotedAt: new Date('2026-04-09T09:00:00.000Z'),
        dueAt: new Date('2026-04-09T09:00:00.000Z'),
        successStreak: 0,
        lastReviewedAt: null,
        lastReviewOutcome: null,
        questionNode: {
          label: 'Q1',
        },
        exerciseNode: makeExerciseNode('exercise-1', 1, 'Exercise 1'),
      },
      {
        questionNodeId: 'question-2',
        reasonType: 'REVEALED',
        priorityScore: new Prisma.Decimal(15),
        lastPromotedAt: new Date('2026-04-09T10:00:00.000Z'),
        dueAt: new Date('2026-04-12T10:00:00.000Z'),
        successStreak: 1,
        lastReviewedAt: new Date('2026-04-10T10:00:00.000Z'),
        lastReviewOutcome: 'CORRECT',
        questionNode: {
          label: 'Q2',
        },
        exerciseNode: makeExerciseNode('exercise-2', 2, 'Exercise 2'),
      },
    ]);

    const result = await service.listMyMistakes('user-1', { limit: 6 });

    expect(result.data.map((item) => item.exerciseNodeId)).toEqual([
      'exercise-1',
      'exercise-2',
    ]);
  });

  it('updates workflow status for all queue rows scoped to the exercise or question', async () => {
    const result = await service.updateReviewQueueStatus('user-1', {
      exerciseNodeId: 'exercise-1',
      questionNodeId: 'question-1',
      status: 'DONE',
    });

    expect(prisma.studentReviewQueueItem.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        exerciseNodeId: 'exercise-1',
        questionNodeId: 'question-1',
      },
      data: expect.objectContaining({
        status: 'DONE',
      }),
    });
    expect(result).toEqual(
      expect.objectContaining({
        exerciseNodeId: 'exercise-1',
        questionNodeId: 'question-1',
        status: 'DONE',
        matchedItemCount: 2,
      }),
    );
  });

  it('records a corrective success and clears the item on the third successful review day', async () => {
    prisma.studentReviewQueueItem.findMany.mockResolvedValue([
      {
        id: 'queue-1',
        successStreak: 2,
        lastReviewedAt: new Date('2026-04-09T09:00:00.000Z'),
        lastReviewOutcome: 'CORRECT',
      },
    ]);

    const result = await service.recordReviewQueueOutcome('user-1', {
      exerciseNodeId: 'exercise-1',
      questionNodeId: 'question-1',
      outcome: 'CORRECT',
    });

    expect(prisma.studentReviewQueueItem.update).toHaveBeenCalledWith({
      where: {
        id: 'queue-1',
      },
      data: expect.objectContaining({
        status: 'DONE',
        successStreak: 3,
        dueAt: null,
        lastReviewOutcome: 'CORRECT',
      }),
    });
    expect(result).toEqual(
      expect.objectContaining({
        exerciseNodeId: 'exercise-1',
        questionNodeId: 'question-1',
        outcome: 'CORRECT',
        matchedItemCount: 1,
      }),
    );
  });

  it('starts a clear-the-vault drill from the most urgent due subject', async () => {
    prisma.studentReviewQueueItem.findMany.mockResolvedValue([
      {
        exerciseNodeId: 'exercise-1',
        exerciseNode: {
          variant: {
            paper: {
              subject: {
                code: 'MATH',
                name: 'Mathematics',
              },
            },
          },
        },
      },
      {
        exerciseNodeId: 'exercise-2',
        exerciseNode: {
          variant: {
            paper: {
              subject: {
                code: 'MATH',
                name: 'Mathematics',
              },
            },
          },
        },
      },
    ]);
    studySessionService.createStudySession.mockResolvedValue({
      id: 'session-1',
      status: 'CREATED',
    });

    const result = await service.clearMistakeVault('user-1');

    expect(studySessionService.createStudySession).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        kind: 'MIXED_DRILL',
        subjectCode: 'MATH',
        exerciseNodeIds: ['exercise-1', 'exercise-2'],
        title: 'تنظيف الخزانة · Mathematics',
      }),
    );
    expect(result).toEqual({
      id: 'session-1',
      status: 'CREATED',
    });
  });
});

function makeExerciseNode(
  id: string,
  orderIndex: number,
  label: string | null,
) {
  return {
    id,
    orderIndex,
    label,
    variant: {
      code: 'SUJET_1',
      paper: {
        offerings: [
          {
            id: 'exam-1',
            year: 2025,
            sessionType: 'NORMAL',
            stream: {
              code: 'SE',
              name: 'Sciences experimentales',
            },
            subject: {
              code: 'MATH',
              name: 'Mathematics',
            },
          },
        ],
      },
    },
  };
}
