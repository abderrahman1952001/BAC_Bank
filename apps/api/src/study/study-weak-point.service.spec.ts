import { Prisma, SubscriptionStatus } from '@prisma/client';
import { StudyWeakPointService } from './study-weak-point.service';

describe('StudyWeakPointService', () => {
  let prisma: {
    user: {
      findUnique: jest.Mock;
    };
    studentCurriculumNodeRollup: {
      findMany: jest.Mock;
    };
    studentLearningTargetRollup: {
      findMany: jest.Mock;
    };
    studentReviewQueueItem: {
      findMany: jest.Mock;
    };
  };
  let service: StudyWeakPointService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
      studentCurriculumNodeRollup: {
        findMany: jest.fn(),
      },
      studentLearningTargetRollup: {
        findMany: jest.fn(),
      },
      studentReviewQueueItem: {
        findMany: jest.fn(),
      },
    };
    service = new StudyWeakPointService(prisma as never);
  });

  it('returns a disabled payload for free-tier students', async () => {
    prisma.user.findUnique.mockResolvedValue({
      subscriptionStatus: SubscriptionStatus.FREE,
    });

    const result = await service.listWeakPointInsights('user-1');

    expect(result).toEqual({
      enabled: false,
      data: [],
    });
    expect(prisma.studentCurriculumNodeRollup.findMany).not.toHaveBeenCalled();
    expect(prisma.studentLearningTargetRollup.findMany).not.toHaveBeenCalled();
    expect(prisma.studentReviewQueueItem.findMany).not.toHaveBeenCalled();
  });

  it('derives weak-point insight from rollups and persisted review-queue overlays', async () => {
    prisma.user.findUnique.mockResolvedValue({
      subscriptionStatus: SubscriptionStatus.ACTIVE,
    });
    prisma.studentCurriculumNodeRollup.findMany.mockResolvedValue([
      {
        weaknessScore: new Prisma.Decimal(7),
        revealedCount: 1,
        skippedCount: 0,
        hardCount: 0,
        missedCount: 1,
        lastSeenAt: new Date('2026-04-09T10:00:00.000Z'),
        curriculumNode: {
          code: 'FUNCTIONS',
          name: 'الدوال',
          studentLabel: null,
          subject: {
            code: 'MATHEMATICS',
            name: 'الرياضيات',
          },
          learningTargetMappings: [
            {
              weight: new Prisma.Decimal(1),
              isPrimary: true,
              learningTarget: {
                id: 'learning-target-1',
                code: 'FUNCTION_ANALYSIS',
                name: 'تحليل الدوال',
                subject: {
                  code: 'MATHEMATICS',
                  name: 'الرياضيات',
                },
              },
            },
          ],
        },
      },
    ]);
    prisma.studentLearningTargetRollup.findMany.mockResolvedValue([
      {
        weaknessScore: new Prisma.Decimal(7),
        lastSeenAt: new Date('2026-04-09T10:00:00.000Z'),
        learningTarget: {
          code: 'FUNCTION_ANALYSIS',
          name: 'تحليل الدوال',
          subject: {
            code: 'MATHEMATICS',
            name: 'الرياضيات',
          },
        },
      },
    ]);
    prisma.studentReviewQueueItem.findMany.mockResolvedValue([
      makeReviewQueueItem('MISSED', new Date('2026-04-09T10:00:00.000Z')),
      makeReviewQueueItem('REVEALED', new Date('2026-04-09T10:00:00.000Z')),
      makeReviewQueueItem('FLAGGED', new Date('2026-04-09T11:00:00.000Z')),
    ]);

    const result = await service.listWeakPointInsights('user-1', {
      subjectCode: 'MATHEMATICS',
    });

    expect(result).toEqual({
      enabled: true,
      data: [
        {
          subject: {
            code: 'MATHEMATICS',
            name: 'الرياضيات',
          },
          recommendedTopicCodes: ['FUNCTIONS'],
          totalWeaknessScore: 9,
          weakSignalCount: 3,
          flaggedExerciseCount: 1,
          lastSeenAt: '2026-04-09T11:00:00.000Z',
          topLearningTargets: [
            {
              code: 'FUNCTION_ANALYSIS',
              name: 'تحليل الدوال',
              weaknessScore: 9,
            },
          ],
          topTopics: [
            {
              code: 'FUNCTIONS',
              name: 'الدوال',
              weaknessScore: 9,
              weakSignalCount: 3,
              lastSeenAt: '2026-04-09T11:00:00.000Z',
              signalCounts: {
                missed: 1,
                hard: 0,
                skipped: 0,
                revealed: 1,
                flagged: 1,
              },
              topLearningTargets: [
                {
                  code: 'FUNCTION_ANALYSIS',
                  name: 'تحليل الدوال',
                  weaknessScore: 9,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it('prefers direct learning-target rollups over broader topic fallbacks when present', async () => {
    prisma.user.findUnique.mockResolvedValue({
      subscriptionStatus: SubscriptionStatus.ACTIVE,
    });
    prisma.studentCurriculumNodeRollup.findMany.mockResolvedValue([
      {
        weaknessScore: new Prisma.Decimal(7.5),
        revealedCount: 0,
        skippedCount: 0,
        hardCount: 0,
        missedCount: 1,
        lastSeenAt: new Date('2026-04-09T12:00:00.000Z'),
        curriculumNode: {
          code: 'FUNCTIONS',
          name: 'الدوال',
          studentLabel: 'الدوال',
          subject: {
            code: 'MATHEMATICS',
            name: 'الرياضيات',
          },
          learningTargetMappings: [
            {
              weight: new Prisma.Decimal(1),
              isPrimary: true,
              learningTarget: {
                id: 'learning-target-functions',
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
              learningTarget: {
                id: 'learning-target-limits',
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
    ]);
    prisma.studentLearningTargetRollup.findMany.mockResolvedValue([
      {
        weaknessScore: new Prisma.Decimal(7.5),
        lastSeenAt: new Date('2026-04-09T12:00:00.000Z'),
        learningTarget: {
          code: 'LIMITS',
          name: 'النهايات',
          subject: {
            code: 'MATHEMATICS',
            name: 'الرياضيات',
          },
        },
      },
    ]);
    prisma.studentReviewQueueItem.findMany.mockResolvedValue([
      {
        reasonType: 'MISSED',
        lastPromotedAt: new Date('2026-04-09T12:00:00.000Z'),
        questionNode: {
          learningTargetMappings: [
            {
              weight: new Prisma.Decimal(1.5),
              isPrimary: true,
              learningTarget: {
                id: 'learning-target-limits',
                code: 'LIMITS',
                name: 'النهايات',
                subject: {
                  code: 'MATHEMATICS',
                  name: 'الرياضيات',
                },
              },
            },
          ],
          curriculumNodeMappings: [],
        },
        exerciseNode: {
          learningTargetMappings: [],
          curriculumNodeMappings: [
            {
              curriculumNode: {
                id: 'topic-functions',
                code: 'FUNCTIONS',
                name: 'الدوال',
                studentLabel: 'الدوال',
                subject: {
                  code: 'MATHEMATICS',
                  name: 'الرياضيات',
                },
                learningTargetMappings: [
                  {
                    weight: new Prisma.Decimal(1),
                    isPrimary: true,
                    learningTarget: {
                      id: 'learning-target-functions',
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
                    learningTarget: {
                      id: 'learning-target-limits',
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
    ]);

    const result = await service.listWeakPointInsights('user-1', {
      subjectCode: 'MATHEMATICS',
    });

    expect(result).toEqual({
      enabled: true,
      data: [
        {
          subject: {
            code: 'MATHEMATICS',
            name: 'الرياضيات',
          },
          recommendedTopicCodes: ['FUNCTIONS'],
          totalWeaknessScore: 7.5,
          weakSignalCount: 1,
          flaggedExerciseCount: 0,
          lastSeenAt: '2026-04-09T12:00:00.000Z',
          topLearningTargets: [
            {
              code: 'LIMITS',
              name: 'النهايات',
              weaknessScore: 7.5,
            },
          ],
          topTopics: [
            {
              code: 'FUNCTIONS',
              name: 'الدوال',
              weaknessScore: 7.5,
              weakSignalCount: 1,
              lastSeenAt: '2026-04-09T12:00:00.000Z',
              signalCounts: {
                missed: 1,
                hard: 0,
                skipped: 0,
                revealed: 0,
                flagged: 0,
              },
              topLearningTargets: [
                {
                  code: 'LIMITS',
                  name: 'النهايات',
                  weaknessScore: 7.5,
                },
              ],
            },
          ],
        },
      ],
    });
  });
});

function makeReviewQueueItem(
  reasonType: 'MISSED' | 'REVEALED' | 'FLAGGED',
  lastPromotedAt: Date,
) {
  return {
    reasonType,
    lastPromotedAt,
    questionNode: null,
    exerciseNode: {
      learningTargetMappings: [],
      curriculumNodeMappings: [
        {
          curriculumNode: {
            id: 'topic-functions',
            code: 'FUNCTIONS',
            name: 'الدوال',
            studentLabel: 'الدوال',
            subject: {
              code: 'MATHEMATICS',
              name: 'الرياضيات',
            },
            learningTargetMappings: [
              {
                weight: new Prisma.Decimal(1),
                isPrimary: true,
                learningTarget: {
                  id: 'learning-target-1',
                  code: 'FUNCTION_ANALYSIS',
                  name: 'تحليل الدوال',
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
  };
}
