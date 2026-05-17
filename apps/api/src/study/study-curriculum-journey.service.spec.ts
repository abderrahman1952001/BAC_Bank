import { Prisma } from '@prisma/client';
import { StudyCurriculumJourneyService } from './study-curriculum-journey.service';

describe('StudyCurriculumJourneyService', () => {
  let prisma: {
    user: {
      findUnique: jest.Mock;
    };
    curriculum: {
      findMany: jest.Mock;
    };
    studentCurriculumNodeRollup: {
      findMany: jest.Mock;
    };
    studentReviewQueueItem: {
      findMany: jest.Mock;
    };
  };
  let service: StudyCurriculumJourneyService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
      curriculum: {
        findMany: jest.fn(),
      },
      studentCurriculumNodeRollup: {
        findMany: jest.fn(),
      },
      studentReviewQueueItem: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    service = new StudyCurriculumJourneyService(prisma as never);
  });

  function mockMathCurriculum() {
    prisma.curriculum.findMany.mockResolvedValue([
      {
        id: 'curriculum-math',
        code: 'GENERAL',
        title: 'الرياضيات',
        validFromYear: 2008,
        validToYear: null,
        subject: {
          code: 'MATH',
          name: 'الرياضيات',
        },
        subjectOfferings: [{ streamId: 'stream-se' }],
        curriculumNodes: [
          {
            id: 'topic-algebra',
            code: 'ALGEBRA',
            name: 'الجبر',
            studentLabel: null,
            displayOrder: 1,
            _count: {
              children: 2,
            },
          },
          {
            id: 'topic-geometry',
            code: 'GEOMETRY',
            name: 'الهندسة',
            studentLabel: 'الهندسة',
            displayOrder: 2,
            _count: {
              children: 1,
            },
          },
          {
            id: 'topic-analysis',
            code: 'FUNCTIONS',
            name: 'الدوال',
            studentLabel: null,
            displayOrder: 3,
            _count: {
              children: 1,
            },
          },
        ],
      },
    ]);
  }

  it('builds curriculum journey summaries and next actions from curriculum-node rollups', async () => {
    prisma.user.findUnique.mockResolvedValue({
      streamId: 'stream-se',
    });
    mockMathCurriculum();
    prisma.studentCurriculumNodeRollup.findMany.mockResolvedValue([
      {
        curriculumNodeId: 'topic-algebra',
        attemptedQuestions: 14,
        correctCount: 12,
        incorrectCount: 1,
        masteryBucket: 'SOLID',
        weaknessScore: new Prisma.Decimal(1),
        lastSeenAt: new Date('2026-04-09T09:00:00.000Z'),
      },
      {
        curriculumNodeId: 'topic-geometry',
        attemptedQuestions: 6,
        correctCount: 2,
        incorrectCount: 3,
        masteryBucket: 'WEAK',
        weaknessScore: new Prisma.Decimal(8),
        lastSeenAt: new Date('2026-04-09T10:00:00.000Z'),
      },
    ]);
    prisma.studentReviewQueueItem.findMany.mockResolvedValue([
      {
        exerciseNodeId: 'exercise-1',
        exerciseNode: {
          variant: {
            paper: {
              subject: {
                code: 'MATH',
              },
            },
          },
        },
      },
    ]);

    const result = await service.listCurriculumJourneys('user-1', {
      limit: 4,
    });

    expect(result.data[0]).toEqual(
      expect.objectContaining({
        id: 'curriculum-math',
        title: 'خارطة الرياضيات',
        subject: {
          code: 'MATH',
          name: 'الرياضيات',
        },
        curriculum: {
          code: 'GENERAL',
          title: 'الرياضيات',
        },
        totalNodeCount: 3,
        solidNodeCount: 1,
        needsReviewNodeCount: 1,
        notStartedNodeCount: 1,
        openReviewItemCount: 1,
        progressPercent: 42,
        updatedAt: '2026-04-09T10:00:00.000Z',
        nextAction: {
          type: 'TOPIC_DRILL',
          label: 'راجع الهندسة',
          curriculumNodeCode: 'GEOMETRY',
          curriculumNodeName: 'الهندسة',
          topicCode: 'GEOMETRY',
          topicName: 'الهندسة',
        },
      }),
    );
    expect(result.data[0]?.sections[0]).toEqual(
      expect.objectContaining({
        id: 'curriculum-math:CORE',
        code: 'CORE',
        title: 'المسار الأساسي',
      }),
    );
    expect(result.data[0]?.nodes).toEqual([
      expect.objectContaining({
        id: 'topic-algebra',
        curriculumNodeCode: 'ALGEBRA',
        topicCode: 'ALGEBRA',
        recommendedPreviousNodeId: null,
        status: 'SOLID',
        progressPercent: 100,
      }),
      expect.objectContaining({
        id: 'topic-geometry',
        curriculumNodeCode: 'GEOMETRY',
        topicCode: 'GEOMETRY',
        recommendedPreviousNodeId: 'topic-algebra',
        recommendedPreviousNodeTitle: 'الجبر',
        status: 'NEEDS_REVIEW',
        progressPercent: 25,
      }),
      expect.objectContaining({
        id: 'topic-analysis',
        curriculumNodeCode: 'FUNCTIONS',
        topicCode: 'FUNCTIONS',
        recommendedPreviousNodeId: 'topic-geometry',
        status: 'NOT_STARTED',
      }),
    ]);
  });

  it('surfaces review-mistakes as the next action when curriculum nodes are stable but open review items remain', async () => {
    prisma.user.findUnique.mockResolvedValue({
      streamId: 'stream-se',
    });
    mockMathCurriculum();
    prisma.studentCurriculumNodeRollup.findMany.mockResolvedValue([
      {
        curriculumNodeId: 'topic-algebra',
        attemptedQuestions: 12,
        correctCount: 10,
        incorrectCount: 1,
        masteryBucket: 'SOLID',
        weaknessScore: new Prisma.Decimal(1),
        lastSeenAt: new Date('2026-04-09T09:00:00.000Z'),
      },
      {
        curriculumNodeId: 'topic-geometry',
        attemptedQuestions: 12,
        correctCount: 10,
        incorrectCount: 1,
        masteryBucket: 'SOLID',
        weaknessScore: new Prisma.Decimal(1),
        lastSeenAt: new Date('2026-04-09T09:00:00.000Z'),
      },
      {
        curriculumNodeId: 'topic-analysis',
        attemptedQuestions: 12,
        correctCount: 10,
        incorrectCount: 1,
        masteryBucket: 'SOLID',
        weaknessScore: new Prisma.Decimal(1),
        lastSeenAt: new Date('2026-04-09T09:00:00.000Z'),
      },
    ]);
    prisma.studentReviewQueueItem.findMany.mockResolvedValue([
      {
        exerciseNodeId: 'exercise-1',
        exerciseNode: {
          variant: {
            paper: {
              subject: {
                code: 'MATH',
              },
            },
          },
        },
      },
    ]);

    const result = await service.listCurriculumJourneys('user-1', {
      limit: 4,
    });

    expect(result.data[0]?.nextAction).toEqual({
      type: 'REVIEW_MISTAKES',
      label: 'راجع أخطاءك المفتوحة',
      curriculumNodeCode: null,
      curriculumNodeName: null,
      topicCode: null,
      topicName: null,
    });
    expect(result.data[0]?.openReviewItemCount).toBe(1);
  });

  it('keeps curriculum journeys renderable while a curriculum has no top-level topics', async () => {
    prisma.user.findUnique.mockResolvedValue({
      streamId: 'stream-se',
    });
    prisma.curriculum.findMany.mockResolvedValue([
      {
        id: 'curriculum-empty',
        code: 'GENERAL',
        title: 'العلوم التجريبية',
        validFromYear: 2008,
        validToYear: null,
        subject: {
          code: 'SCIENCE',
          name: 'العلوم التجريبية',
        },
        subjectOfferings: [{ streamId: 'stream-se' }],
        curriculumNodes: [],
      },
    ]);
    prisma.studentCurriculumNodeRollup.findMany.mockResolvedValue([]);
    prisma.studentReviewQueueItem.findMany.mockResolvedValue([]);

    const result = await service.listCurriculumJourneys('user-1', {
      limit: 4,
    });

    expect(result.data[0]).toEqual(
      expect.objectContaining({
        id: 'curriculum-empty',
        title: 'خارطة العلوم التجريبية',
        totalNodeCount: 0,
        progressPercent: 0,
        nextAction: null,
        sections: [],
        nodes: [],
      }),
    );
  });
});
