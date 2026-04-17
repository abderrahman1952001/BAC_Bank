import { Prisma } from '@prisma/client';
import { StudyRoadmapService } from './study-roadmap.service';

describe('StudyRoadmapService', () => {
  let prisma: {
    user: {
      findUnique: jest.Mock;
    };
    subjectRoadmap: {
      findMany: jest.Mock;
    };
    studentTopicRollup: {
      findMany: jest.Mock;
    };
    studentReviewQueueItem: {
      findMany: jest.Mock;
    };
  };
  let service: StudyRoadmapService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
      subjectRoadmap: {
        findMany: jest.fn(),
      },
      studentTopicRollup: {
        findMany: jest.fn(),
      },
      studentReviewQueueItem: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    service = new StudyRoadmapService(prisma as never);
  });

  it('builds roadmap summaries and next actions from topic rollups', async () => {
    prisma.user.findUnique.mockResolvedValue({
      streamId: 'stream-se',
    });
    prisma.subjectRoadmap.findMany.mockResolvedValue([
      {
        id: 'roadmap-math',
        code: 'CORE_PATH',
        title: 'مسار الرياضيات',
        description: 'مسار هادئ لبناء الثبات في الرياضيات.',
        version: 1,
        curriculum: {
          id: 'curriculum-math',
          code: 'GENERAL',
          title: 'الرياضيات',
          validFromYear: 2008,
          validToYear: null,
          streamMappings: [],
          subject: {
            code: 'MATH',
            name: 'الرياضيات',
          },
        },
        sections: [
          {
            id: 'section-foundation',
            code: 'FOUNDATION',
            title: 'الانطلاقة',
            description: 'ابدأ بالمحاور الأساسية.',
            orderIndex: 1,
          },
          {
            id: 'section-build',
            code: 'BUILD',
            title: 'التثبيت',
            description: 'ثبت ما تبقى من المحاور.',
            orderIndex: 2,
          },
        ],
        nodes: [
          {
            id: 'node-algebra',
            title: 'الجبر',
            description: 'ثبّت الجبر.',
            orderIndex: 1,
            estimatedSessions: 3,
            isOptional: false,
            sectionId: 'section-foundation',
            recommendedPreviousRoadmapNodeId: null,
            topicId: 'topic-algebra',
            topic: {
              code: 'ALGEBRA',
              name: 'الجبر',
              studentLabel: null,
            },
          },
          {
            id: 'node-geometry',
            title: 'الهندسة',
            description: 'راجع الهندسة.',
            orderIndex: 2,
            estimatedSessions: 2,
            isOptional: false,
            sectionId: 'section-foundation',
            recommendedPreviousRoadmapNodeId: 'node-algebra',
            topicId: 'topic-geometry',
            topic: {
              code: 'GEOMETRY',
              name: 'الهندسة',
              studentLabel: 'الهندسة',
            },
          },
          {
            id: 'node-analysis',
            title: 'الدوال',
            description: 'ابدأ الدوال.',
            orderIndex: 3,
            estimatedSessions: 2,
            isOptional: false,
            sectionId: 'section-build',
            recommendedPreviousRoadmapNodeId: 'node-geometry',
            topicId: 'topic-analysis',
            topic: {
              code: 'FUNCTIONS',
              name: 'الدوال',
              studentLabel: null,
            },
          },
        ],
      },
    ]);
    prisma.studentTopicRollup.findMany.mockResolvedValue([
      {
        topicId: 'topic-algebra',
        attemptedQuestions: 14,
        correctCount: 12,
        incorrectCount: 1,
        masteryBucket: 'SOLID',
        weaknessScore: new Prisma.Decimal(1),
        lastSeenAt: new Date('2026-04-09T09:00:00.000Z'),
      },
      {
        topicId: 'topic-geometry',
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

    const result = await service.listStudyRoadmaps('user-1', {
      limit: 4,
    });

    expect(result).toEqual({
      data: [
        {
          id: 'roadmap-math',
          title: 'مسار الرياضيات',
          description: 'مسار هادئ لبناء الثبات في الرياضيات.',
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
          inProgressNodeCount: 0,
          notStartedNodeCount: 1,
          openReviewItemCount: 1,
          progressPercent: 42,
          updatedAt: '2026-04-09T10:00:00.000Z',
          nextAction: {
            type: 'TOPIC_DRILL',
            label: 'راجع الهندسة',
            topicCode: 'GEOMETRY',
            topicName: 'الهندسة',
          },
          sections: [
            {
              id: 'section-foundation',
              code: 'FOUNDATION',
              title: 'الانطلاقة',
              description: 'ابدأ بالمحاور الأساسية.',
              orderIndex: 1,
              nodes: [
                {
                  id: 'node-algebra',
                  title: 'الجبر',
                  description: 'ثبّت الجبر.',
                  topicCode: 'ALGEBRA',
                  topicName: 'الجبر',
                  orderIndex: 1,
                  estimatedSessions: 3,
                  isOptional: false,
                  sectionId: 'section-foundation',
                  recommendedPreviousNodeId: null,
                  recommendedPreviousNodeTitle: null,
                  status: 'SOLID',
                  progressPercent: 100,
                  weaknessScore: 1,
                  attemptedQuestions: 14,
                  correctCount: 12,
                  incorrectCount: 1,
                  lastSeenAt: '2026-04-09T09:00:00.000Z',
                },
                {
                  id: 'node-geometry',
                  title: 'الهندسة',
                  description: 'راجع الهندسة.',
                  topicCode: 'GEOMETRY',
                  topicName: 'الهندسة',
                  orderIndex: 2,
                  estimatedSessions: 2,
                  isOptional: false,
                  sectionId: 'section-foundation',
                  recommendedPreviousNodeId: 'node-algebra',
                  recommendedPreviousNodeTitle: 'الجبر',
                  status: 'NEEDS_REVIEW',
                  progressPercent: 25,
                  weaknessScore: 8,
                  attemptedQuestions: 6,
                  correctCount: 2,
                  incorrectCount: 3,
                  lastSeenAt: '2026-04-09T10:00:00.000Z',
                },
              ],
            },
            {
              id: 'section-build',
              code: 'BUILD',
              title: 'التثبيت',
              description: 'ثبت ما تبقى من المحاور.',
              orderIndex: 2,
              nodes: [
                {
                  id: 'node-analysis',
                  title: 'الدوال',
                  description: 'ابدأ الدوال.',
                  topicCode: 'FUNCTIONS',
                  topicName: 'الدوال',
                  orderIndex: 3,
                  estimatedSessions: 2,
                  isOptional: false,
                  sectionId: 'section-build',
                  recommendedPreviousNodeId: 'node-geometry',
                  recommendedPreviousNodeTitle: 'الهندسة',
                  status: 'NOT_STARTED',
                  progressPercent: 0,
                  weaknessScore: 0,
                  attemptedQuestions: 0,
                  correctCount: 0,
                  incorrectCount: 0,
                  lastSeenAt: null,
                },
              ],
            },
          ],
          nodes: [
            {
              id: 'node-algebra',
              title: 'الجبر',
              description: 'ثبّت الجبر.',
              topicCode: 'ALGEBRA',
              topicName: 'الجبر',
              orderIndex: 1,
              estimatedSessions: 3,
              isOptional: false,
              sectionId: 'section-foundation',
              recommendedPreviousNodeId: null,
              recommendedPreviousNodeTitle: null,
              status: 'SOLID',
              progressPercent: 100,
              weaknessScore: 1,
              attemptedQuestions: 14,
              correctCount: 12,
              incorrectCount: 1,
              lastSeenAt: '2026-04-09T09:00:00.000Z',
            },
            {
              id: 'node-geometry',
              title: 'الهندسة',
              description: 'راجع الهندسة.',
              topicCode: 'GEOMETRY',
              topicName: 'الهندسة',
              orderIndex: 2,
              estimatedSessions: 2,
              isOptional: false,
              sectionId: 'section-foundation',
              recommendedPreviousNodeId: 'node-algebra',
              recommendedPreviousNodeTitle: 'الجبر',
              status: 'NEEDS_REVIEW',
              progressPercent: 25,
              weaknessScore: 8,
              attemptedQuestions: 6,
              correctCount: 2,
              incorrectCount: 3,
              lastSeenAt: '2026-04-09T10:00:00.000Z',
            },
            {
              id: 'node-analysis',
              title: 'الدوال',
              description: 'ابدأ الدوال.',
              topicCode: 'FUNCTIONS',
              topicName: 'الدوال',
              orderIndex: 3,
              estimatedSessions: 2,
              isOptional: false,
              sectionId: 'section-build',
              recommendedPreviousNodeId: 'node-geometry',
              recommendedPreviousNodeTitle: 'الهندسة',
              status: 'NOT_STARTED',
              progressPercent: 0,
              weaknessScore: 0,
              attemptedQuestions: 0,
              correctCount: 0,
              incorrectCount: 0,
              lastSeenAt: null,
            },
          ],
        },
      ],
    });
  });

  it('surfaces review-mistakes as the next action when roadmap nodes are stable but open review items remain', async () => {
    prisma.user.findUnique.mockResolvedValue({
      streamId: 'stream-se',
    });
    prisma.subjectRoadmap.findMany.mockResolvedValue([
      {
        id: 'roadmap-math',
        code: 'CORE_PATH',
        title: 'مسار الرياضيات',
        description: 'مسار الرياضيات.',
        version: 1,
        curriculum: {
          id: 'curriculum-math',
          code: 'GENERAL',
          title: 'الرياضيات',
          validFromYear: 2008,
          validToYear: null,
          streamMappings: [],
          subject: {
            code: 'MATH',
            name: 'الرياضيات',
          },
        },
        sections: [
          {
            id: 'section-foundation',
            code: 'FOUNDATION',
            title: 'الانطلاقة',
            description: 'ابدأ بالمحاور الأساسية.',
            orderIndex: 1,
          },
        ],
        nodes: [
          {
            id: 'node-algebra',
            title: 'الجبر',
            description: 'ثبّت الجبر.',
            orderIndex: 1,
            estimatedSessions: 3,
            isOptional: false,
            sectionId: 'section-foundation',
            recommendedPreviousRoadmapNodeId: null,
            topicId: 'topic-algebra',
            topic: {
              code: 'ALGEBRA',
              name: 'الجبر',
              studentLabel: null,
            },
          },
        ],
      },
    ]);
    prisma.studentTopicRollup.findMany.mockResolvedValue([
      {
        topicId: 'topic-algebra',
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

    const result = await service.listStudyRoadmaps('user-1', {
      limit: 4,
    });

    expect(result.data[0]?.nextAction).toEqual({
      type: 'REVIEW_MISTAKES',
      label: 'راجع أخطاءك المفتوحة',
      topicCode: null,
      topicName: null,
    });
    expect(result.data[0]?.openReviewItemCount).toBe(1);
  });
});
