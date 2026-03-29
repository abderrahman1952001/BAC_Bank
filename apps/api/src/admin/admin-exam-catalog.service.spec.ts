import {
  ExamNodeType,
  ExamVariantCode,
  Prisma,
  PublicationStatus,
  SessionType,
} from '@prisma/client';
import { AdminExamCatalogService } from './admin-exam-catalog.service';

describe('AdminExamCatalogService', () => {
  let prisma: {
    exam: {
      count: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    examNode: {
      create: jest.Mock;
      delete: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    examVariant: {
      create: jest.Mock;
      createMany: jest.Mock;
    };
    paper: {
      create: jest.Mock;
      delete: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    stream: {
      findUnique: jest.Mock;
    };
    subject: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
    };
    topic: {
      findMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let service: AdminExamCatalogService;

  beforeEach(() => {
    prisma = {
      exam: {
        count: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      examNode: {
        create: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      examVariant: {
        create: jest.fn(),
        createMany: jest.fn(),
      },
      paper: {
        create: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      stream: {
        findUnique: jest.fn(),
      },
      subject: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
      topic: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    service = new AdminExamCatalogService(prisma as never);
  });

  it('maps exam summaries with exercise and question counts', async () => {
    prisma.exam.findMany.mockResolvedValueOnce([
      {
        id: 'exam-1',
        year: 2025,
        sessionType: SessionType.NORMAL,
        isPublished: true,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-02T00:00:00Z'),
        stream: {
          code: 'SE',
        },
        subject: {
          code: 'MATH',
        },
        paper: {
          officialSourceReference: 'https://example.com/math.pdf',
          variants: [
            {
              id: 'variant-1',
              code: ExamVariantCode.SUJET_1,
              status: PublicationStatus.PUBLISHED,
              nodes: [
                {
                  id: 'exercise-1',
                  parentId: null,
                  nodeType: ExamNodeType.EXERCISE,
                },
                {
                  id: 'question-1',
                  parentId: 'exercise-1',
                  nodeType: ExamNodeType.QUESTION,
                },
              ],
            },
          ],
        },
      },
    ]);

    await expect(service.listExams('math', 2025)).resolves.toEqual({
      data: [
        {
          id: 'exam-1',
          year: 2025,
          subject: 'MATH',
          stream: 'SE',
          session: 'normal',
          original_pdf_url: 'https://example.com/math.pdf',
          status: 'published',
          exercise_count: 1,
          question_count: 1,
          created_at: new Date('2025-01-01T00:00:00Z'),
          updated_at: new Date('2025-01-02T00:00:00Z'),
        },
      ],
    });
  });

  it('creates a new exam with a canonical paper and default variants', async () => {
    prisma.stream.findUnique
      .mockResolvedValueOnce({
        code: 'SE',
      })
      .mockResolvedValueOnce({
        id: 'stream-1',
      });
    prisma.subject.findUnique
      .mockResolvedValueOnce({
        code: 'MATH',
      })
      .mockResolvedValueOnce({
        id: 'subject-1',
      });
    prisma.exam.findFirst.mockResolvedValueOnce(null);
    prisma.paper.findFirst.mockResolvedValueOnce(null);
    prisma.exam.create.mockResolvedValueOnce({
      id: 'exam-1',
    });
    prisma.$transaction.mockImplementationOnce(
      async (callback: (tx: typeof prisma) => Promise<string>) =>
        callback(prisma),
    );
    prisma.exam.findUnique.mockResolvedValueOnce({
      id: 'exam-1',
      year: 2025,
      sessionType: SessionType.NORMAL,
      isPublished: false,
      createdAt: new Date('2025-01-03T00:00:00Z'),
      updatedAt: new Date('2025-01-03T00:00:00Z'),
      stream: {
        code: 'SE',
      },
      subject: {
        code: 'MATH',
      },
      paper: {
        id: 'paper-1',
        familyCode: 'SE__MATH',
        officialSourceReference: 'https://example.com/original.pdf',
        offerings: [{ id: 'exam-1' }],
        variants: [
          {
            id: 'variant-1',
            code: ExamVariantCode.SUJET_1,
            title: 'الموضوع الأول',
            status: PublicationStatus.DRAFT,
            nodes: [],
          },
          {
            id: 'variant-2',
            code: ExamVariantCode.SUJET_2,
            title: 'الموضوع الثاني',
            status: PublicationStatus.DRAFT,
            nodes: [],
          },
        ],
      },
    });

    const result = await service.createExam({
      year: 2025,
      stream: 'SE',
      subject: 'MATH',
      session: 'normal',
      status: 'draft',
      original_pdf_url: 'https://example.com/original.pdf',
    });

    expect(prisma.paper.create).toHaveBeenCalledTimes(1);
    expect(prisma.examVariant.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          code: ExamVariantCode.SUJET_1,
          status: PublicationStatus.DRAFT,
        }),
        expect.objectContaining({
          code: ExamVariantCode.SUJET_2,
          status: PublicationStatus.DRAFT,
        }),
      ],
    });
    expect(result).toMatchObject({
      id: 'exam-1',
      subject: 'MATH',
      stream: 'SE',
      session: 'normal',
      status: 'draft',
      exercise_count: 0,
      question_count: 0,
    });
  });

  it('orders exercises by admin metadata and counts descendant questions', async () => {
    const now = new Date('2025-01-10T00:00:00Z');
    prisma.exam.findUnique.mockResolvedValueOnce({
      id: 'exam-1',
      year: 2025,
      sessionType: SessionType.NORMAL,
      isPublished: true,
      createdAt: now,
      updatedAt: now,
      stream: {
        code: 'SE',
      },
      subject: {
        code: 'MATH',
      },
      paper: {
        id: 'paper-1',
        familyCode: 'SE__MATH',
        officialSourceReference: null,
        offerings: [{ id: 'exam-1' }],
        variants: [
          {
            id: 'variant-1',
            code: ExamVariantCode.SUJET_1,
            title: 'Sujet 1',
            status: PublicationStatus.PUBLISHED,
            nodes: [
              {
                id: 'exercise-2',
                variantId: 'variant-1',
                parentId: null,
                nodeType: ExamNodeType.EXERCISE,
                orderIndex: 2,
                label: 'Exercise 2',
                maxPoints: null,
                status: PublicationStatus.PUBLISHED,
                metadata: { adminOrder: 2 } as Prisma.JsonObject,
                createdAt: now,
                updatedAt: now,
                topicMappings: [],
              },
              {
                id: 'question-2',
                variantId: 'variant-1',
                parentId: 'exercise-2',
                nodeType: ExamNodeType.QUESTION,
                orderIndex: 1,
                label: 'Question 2',
                maxPoints: null,
                status: PublicationStatus.PUBLISHED,
                metadata: null,
                createdAt: now,
                updatedAt: now,
                topicMappings: [],
              },
              {
                id: 'exercise-1',
                variantId: 'variant-1',
                parentId: null,
                nodeType: ExamNodeType.EXERCISE,
                orderIndex: 1,
                label: 'Exercise 1',
                maxPoints: null,
                status: PublicationStatus.PUBLISHED,
                metadata: { adminOrder: 1 } as Prisma.JsonObject,
                createdAt: now,
                updatedAt: now,
                topicMappings: [],
              },
              {
                id: 'question-1',
                variantId: 'variant-1',
                parentId: 'exercise-1',
                nodeType: ExamNodeType.QUESTION,
                orderIndex: 1,
                label: 'Question 1',
                maxPoints: null,
                status: PublicationStatus.PUBLISHED,
                metadata: null,
                createdAt: now,
                updatedAt: now,
                topicMappings: [],
              },
              {
                id: 'subquestion-1',
                variantId: 'variant-1',
                parentId: 'question-1',
                nodeType: ExamNodeType.SUBQUESTION,
                orderIndex: 1,
                label: 'Subquestion 1',
                maxPoints: null,
                status: PublicationStatus.PUBLISHED,
                metadata: null,
                createdAt: now,
                updatedAt: now,
                topicMappings: [],
              },
            ],
          },
        ],
      },
    });

    const result = await service.getExamExercises('exam-1');

    expect(result.exam).toMatchObject({
      id: 'exam-1',
      exercise_count: 2,
      question_count: 3,
    });
    expect(result.exercises).toEqual([
      expect.objectContaining({
        id: 'exercise-1',
        order_index: 1,
        question_count: 2,
      }),
      expect.objectContaining({
        id: 'exercise-2',
        order_index: 2,
        question_count: 1,
      }),
    ]);
  });
});
