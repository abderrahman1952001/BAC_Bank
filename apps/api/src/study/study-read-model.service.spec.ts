import {
  Prisma,
  StudentMasteryBucket,
  StudyQuestionAnswerState,
  StudyQuestionReflection,
  StudyQuestionResultStatus,
} from '@prisma/client';
import { StudyReadModelService } from './study-read-model.service';

describe('StudyReadModelService', () => {
  let prisma: {
    studySessionQuestion: {
      findMany: jest.Mock;
    };
    studentExerciseState: {
      findMany: jest.Mock;
    };
    studentTopicRollup: {
      deleteMany: jest.Mock;
      createMany: jest.Mock;
    };
    studentSkillRollup: {
      deleteMany: jest.Mock;
      createMany: jest.Mock;
    };
    studentReviewQueueItem: {
      findMany: jest.Mock;
      deleteMany: jest.Mock;
      createMany: jest.Mock;
      update: jest.Mock;
    };
  };
  let service: StudyReadModelService;

  beforeEach(() => {
    prisma = {
      studySessionQuestion: {
        findMany: jest.fn(),
      },
      studentExerciseState: {
        findMany: jest.fn(),
      },
      studentTopicRollup: {
        deleteMany: jest.fn().mockResolvedValue(undefined),
        createMany: jest.fn().mockResolvedValue(undefined),
      },
      studentSkillRollup: {
        deleteMany: jest.fn().mockResolvedValue(undefined),
        createMany: jest.fn().mockResolvedValue(undefined),
      },
      studentReviewQueueItem: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn().mockResolvedValue(undefined),
        createMany: jest.fn().mockResolvedValue(undefined),
        update: jest.fn().mockResolvedValue(undefined),
      },
    };
    service = new StudyReadModelService(prisma as never);
  });

  it('rebuilds topic, skill, and review-queue read models from canonical study signals', async () => {
    prisma.studySessionQuestion.findMany.mockResolvedValue([
      {
        questionNodeId: 'question-1',
        answerState: StudyQuestionAnswerState.OPENED,
        resultStatus: StudyQuestionResultStatus.CORRECT,
        reflection: StudyQuestionReflection.MISSED,
        firstOpenedAt: new Date('2026-04-09T09:00:00.000Z'),
        lastInteractedAt: new Date('2026-04-09T10:00:00.000Z'),
        completedAt: new Date('2026-04-09T10:05:00.000Z'),
        skippedAt: null,
        solutionViewedAt: new Date('2026-04-09T10:04:00.000Z'),
        updatedAt: new Date('2026-04-09T10:05:00.000Z'),
        questionNode: {
          skillMappings: [
            {
              weight: new Prisma.Decimal(1.5),
              isPrimary: true,
              skill: {
                id: 'skill-limits',
                code: 'LIMITS',
                name: 'النهايات',
                subject: {
                  code: 'MATHEMATICS',
                  name: 'الرياضيات',
                },
              },
            },
          ],
          topicMappings: [],
        },
        sessionExercise: {
          exerciseNodeId: 'exercise-1',
          exerciseNode: {
            skillMappings: [],
            topicMappings: [
              {
                topic: {
                  id: 'topic-functions',
                  code: 'FUNCTIONS',
                  name: 'الدوال',
                  studentLabel: 'الدوال',
                  subject: {
                    code: 'MATHEMATICS',
                    name: 'الرياضيات',
                  },
                  skillMappings: [
                    {
                      weight: new Prisma.Decimal(1),
                      isPrimary: true,
                      skill: {
                        id: 'skill-functions',
                        code: 'FUNCTION_ANALYSIS',
                        name: 'تحليل الدوال',
                        subject: {
                          code: 'MATHEMATICS',
                          name: 'الرياضيات',
                        },
                      },
                    },
                    {
                      weight: new Prisma.Decimal(1),
                      isPrimary: false,
                      skill: {
                        id: 'skill-limits',
                        code: 'LIMITS',
                        name: 'النهايات',
                        subject: {
                          code: 'MATHEMATICS',
                          name: 'الرياضيات',
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      },
      {
        questionNodeId: 'question-2',
        answerState: StudyQuestionAnswerState.SKIPPED,
        resultStatus: StudyQuestionResultStatus.UNKNOWN,
        reflection: StudyQuestionReflection.HARD,
        firstOpenedAt: new Date('2026-04-09T11:00:00.000Z'),
        lastInteractedAt: new Date('2026-04-09T11:10:00.000Z'),
        completedAt: null,
        skippedAt: new Date('2026-04-09T11:10:00.000Z'),
        solutionViewedAt: null,
        updatedAt: new Date('2026-04-09T11:10:00.000Z'),
        questionNode: {
          skillMappings: [],
          topicMappings: [
            {
              topic: {
                id: 'topic-geometry',
                code: 'GEOMETRY',
                name: 'الهندسة',
                studentLabel: 'الهندسة',
                subject: {
                  code: 'MATHEMATICS',
                  name: 'الرياضيات',
                },
                skillMappings: [
                  {
                    weight: new Prisma.Decimal(1),
                    isPrimary: true,
                    skill: {
                      id: 'skill-geometry',
                      code: 'SPATIAL_REASONING',
                      name: 'الاستدلال الهندسي',
                      subject: {
                        code: 'MATHEMATICS',
                        name: 'الرياضيات',
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
        sessionExercise: {
          exerciseNodeId: 'exercise-2',
          exerciseNode: {
            skillMappings: [],
            topicMappings: [],
          },
        },
      },
    ]);
    prisma.studentExerciseState.findMany.mockResolvedValue([
      {
        exerciseNodeId: 'exercise-1',
        flaggedAt: new Date('2026-04-09T11:30:00.000Z'),
        updatedAt: new Date('2026-04-09T11:30:00.000Z'),
      },
    ]);

    await service.refreshUserReadModels('user-1');

    expect(prisma.studentTopicRollup.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
      },
    });
    expect(prisma.studentSkillRollup.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
      },
    });
    expect(prisma.studentReviewQueueItem.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
      },
      select: {
        id: true,
        identityKey: true,
        questionNodeId: true,
        exerciseNodeId: true,
        reasonType: true,
        status: true,
        dueAt: true,
        successStreak: true,
        lastReviewedAt: true,
        lastReviewOutcome: true,
        priorityScore: true,
        lastPromotedAt: true,
      },
    });
    expect(prisma.studentReviewQueueItem.deleteMany).not.toHaveBeenCalled();
    expect(prisma.studentTopicRollup.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'user-1',
          topicId: 'topic-functions',
          attemptedQuestions: 1,
          correctCount: 1,
          incorrectCount: 0,
          revealedCount: 1,
          skippedCount: 0,
          hardCount: 0,
          missedCount: 1,
          lastSeenAt: new Date('2026-04-09T10:00:00.000Z'),
          weaknessScore: 7,
          masteryBucket: StudentMasteryBucket.WEAK,
        },
        {
          userId: 'user-1',
          topicId: 'topic-geometry',
          attemptedQuestions: 1,
          correctCount: 0,
          incorrectCount: 0,
          revealedCount: 0,
          skippedCount: 1,
          hardCount: 1,
          missedCount: 0,
          lastSeenAt: new Date('2026-04-09T11:10:00.000Z'),
          weaknessScore: 6,
          masteryBucket: StudentMasteryBucket.WEAK,
        },
      ],
    });
    expect(prisma.studentSkillRollup.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'user-1',
          skillId: 'skill-limits',
          attemptedQuestions: 1,
          correctCount: 1,
          incorrectCount: 0,
          revealedCount: 1,
          skippedCount: 0,
          hardCount: 0,
          missedCount: 1,
          lastSeenAt: new Date('2026-04-09T10:00:00.000Z'),
          weaknessScore: 10.5,
          masteryBucket: StudentMasteryBucket.WEAK,
        },
        {
          userId: 'user-1',
          skillId: 'skill-geometry',
          attemptedQuestions: 1,
          correctCount: 0,
          incorrectCount: 0,
          revealedCount: 0,
          skippedCount: 1,
          hardCount: 1,
          missedCount: 0,
          lastSeenAt: new Date('2026-04-09T11:10:00.000Z'),
          weaknessScore: 6,
          masteryBucket: StudentMasteryBucket.WEAK,
        },
      ],
    });
    expect(prisma.studentReviewQueueItem.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'user-1',
          identityKey: 'question:question-1:MISSED',
          questionNodeId: 'question-1',
          exerciseNodeId: 'exercise-1',
          reasonType: 'MISSED',
          status: 'OPEN',
          dueAt: new Date('2026-04-09T10:00:00.000Z'),
          successStreak: 0,
          lastReviewedAt: null,
          lastReviewOutcome: null,
          priorityScore: 50,
          lastPromotedAt: new Date('2026-04-09T10:00:00.000Z'),
          statusUpdatedAt: new Date('2026-04-09T10:00:00.000Z'),
        },
        {
          userId: 'user-1',
          identityKey: 'question:question-1:REVEALED',
          questionNodeId: 'question-1',
          exerciseNodeId: 'exercise-1',
          reasonType: 'REVEALED',
          status: 'OPEN',
          dueAt: new Date('2026-04-09T10:00:00.000Z'),
          successStreak: 0,
          lastReviewedAt: null,
          lastReviewOutcome: null,
          priorityScore: 15,
          lastPromotedAt: new Date('2026-04-09T10:00:00.000Z'),
          statusUpdatedAt: new Date('2026-04-09T10:00:00.000Z'),
        },
        {
          userId: 'user-1',
          identityKey: 'question:question-2:HARD',
          questionNodeId: 'question-2',
          exerciseNodeId: 'exercise-2',
          reasonType: 'HARD',
          status: 'OPEN',
          dueAt: new Date('2026-04-09T11:10:00.000Z'),
          successStreak: 0,
          lastReviewedAt: null,
          lastReviewOutcome: null,
          priorityScore: 40,
          lastPromotedAt: new Date('2026-04-09T11:10:00.000Z'),
          statusUpdatedAt: new Date('2026-04-09T11:10:00.000Z'),
        },
        {
          userId: 'user-1',
          identityKey: 'question:question-2:SKIPPED',
          questionNodeId: 'question-2',
          exerciseNodeId: 'exercise-2',
          reasonType: 'SKIPPED',
          status: 'OPEN',
          dueAt: new Date('2026-04-09T11:10:00.000Z'),
          successStreak: 0,
          lastReviewedAt: null,
          lastReviewOutcome: null,
          priorityScore: 25,
          lastPromotedAt: new Date('2026-04-09T11:10:00.000Z'),
          statusUpdatedAt: new Date('2026-04-09T11:10:00.000Z'),
        },
        {
          userId: 'user-1',
          identityKey: 'exercise:exercise-1:FLAGGED',
          questionNodeId: null,
          exerciseNodeId: 'exercise-1',
          reasonType: 'FLAGGED',
          status: 'OPEN',
          dueAt: new Date('2026-04-09T11:30:00.000Z'),
          successStreak: 0,
          lastReviewedAt: null,
          lastReviewOutcome: null,
          priorityScore: 35,
          lastPromotedAt: new Date('2026-04-09T11:30:00.000Z'),
          statusUpdatedAt: new Date('2026-04-09T11:30:00.000Z'),
        },
      ],
    });
  });

  it('preserves workflow state until a fresher signal reopens the queue row', async () => {
    prisma.studySessionQuestion.findMany.mockResolvedValue([
      {
        questionNodeId: 'question-1',
        answerState: StudyQuestionAnswerState.OPENED,
        resultStatus: StudyQuestionResultStatus.UNKNOWN,
        reflection: StudyQuestionReflection.HARD,
        firstOpenedAt: new Date('2026-04-09T09:00:00.000Z'),
        lastInteractedAt: new Date('2026-04-09T09:10:00.000Z'),
        completedAt: null,
        skippedAt: null,
        solutionViewedAt: null,
        updatedAt: new Date('2026-04-09T09:10:00.000Z'),
        questionNode: {
          skillMappings: [],
          topicMappings: [],
        },
        sessionExercise: {
          exerciseNodeId: 'exercise-1',
          exerciseNode: {
            skillMappings: [],
            topicMappings: [],
          },
        },
      },
    ]);
    prisma.studentExerciseState.findMany.mockResolvedValue([]);
    prisma.studentReviewQueueItem.findMany.mockResolvedValue([
      {
        id: 'queue-1',
        identityKey: 'question:question-1:HARD',
        questionNodeId: 'question-1',
        exerciseNodeId: 'exercise-1',
        reasonType: 'HARD',
        status: 'DONE',
        dueAt: null,
        successStreak: 2,
        lastReviewedAt: new Date('2026-04-08T09:00:00.000Z'),
        lastReviewOutcome: 'CORRECT',
        priorityScore: new Prisma.Decimal(40),
        lastPromotedAt: new Date('2026-04-09T09:00:00.000Z'),
      },
    ]);

    await service.refreshUserReadModels('user-1');

    expect(prisma.studentReviewQueueItem.createMany).not.toHaveBeenCalled();
    expect(prisma.studentReviewQueueItem.update).toHaveBeenCalledWith({
      where: {
        id: 'queue-1',
      },
      data: expect.objectContaining({
        lastPromotedAt: new Date('2026-04-09T09:10:00.000Z'),
        status: 'OPEN',
        dueAt: new Date('2026-04-09T09:10:00.000Z'),
        successStreak: 0,
        lastReviewedAt: null,
        lastReviewOutcome: null,
        statusUpdatedAt: new Date('2026-04-09T09:10:00.000Z'),
      }),
    });
  });
});
