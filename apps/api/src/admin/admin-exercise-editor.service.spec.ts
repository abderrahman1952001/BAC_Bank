import { BadRequestException } from '@nestjs/common';
import {
  BlockRole,
  BlockType,
  ExamNodeType,
  Prisma,
  PublicationStatus,
  SessionType,
} from '@prisma/client';
import { AdminExerciseEditorService } from './admin-exercise-editor.service';

describe('AdminExerciseEditorService', () => {
  let prisma: {
    examNode: {
      create: jest.Mock;
      delete: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    examNodeBlock: {
      create: jest.Mock;
      deleteMany: jest.Mock;
    };
    examNodeTopic: {
      createMany: jest.Mock;
      deleteMany: jest.Mock;
    };
    topic: {
      findMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let service: AdminExerciseEditorService;

  beforeEach(() => {
    prisma = {
      examNode: {
        create: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      examNodeBlock: {
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      examNodeTopic: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      topic: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    service = new AdminExerciseEditorService(prisma as never);
  });

  it('builds exercise editor payloads from exercise context and stored blocks', async () => {
    const now = new Date('2025-01-20T00:00:00Z');
    const exercise = {
      id: 'exercise-1',
      variantId: 'variant-1',
      parentId: null,
      nodeType: ExamNodeType.EXERCISE,
      orderIndex: 1,
      label: 'Exercise 1',
      maxPoints: new Prisma.Decimal(6),
      status: PublicationStatus.DRAFT,
      metadata: null,
      createdAt: now,
      updatedAt: now,
      topicMappings: [
        {
          topic: {
            code: 'ALG',
            name: 'Algebra',
            studentLabel: 'الجبر',
          },
        },
      ],
      blocks: [
        {
          id: 'exercise-block-1',
          role: BlockRole.STEM,
          orderIndex: 1,
          blockType: BlockType.PARAGRAPH,
          textValue: 'Exercise context',
          data: null,
          media: null,
        },
      ],
    };
    const question = {
      id: 'question-1',
      variantId: 'variant-1',
      parentId: 'exercise-1',
      nodeType: ExamNodeType.QUESTION,
      orderIndex: 1,
      label: 'Question 1',
      maxPoints: new Prisma.Decimal(4),
      status: PublicationStatus.PUBLISHED,
      metadata: null,
      createdAt: now,
      updatedAt: now,
      topicMappings: [],
      blocks: [
        {
          id: 'question-block-1',
          role: BlockRole.PROMPT,
          orderIndex: 1,
          blockType: BlockType.PARAGRAPH,
          textValue: 'Prompt',
          data: null,
          media: null,
        },
        {
          id: 'question-block-2',
          role: BlockRole.SOLUTION,
          orderIndex: 1,
          blockType: BlockType.PARAGRAPH,
          textValue: 'Solution',
          data: null,
          media: null,
        },
        {
          id: 'question-block-3',
          role: BlockRole.HINT,
          orderIndex: 1,
          blockType: BlockType.PARAGRAPH,
          textValue: 'Hint',
          data: null,
          media: null,
        },
      ],
    };

    jest.spyOn(service as never, 'loadExerciseContext').mockResolvedValue({
      exercise,
      variantNodes: [exercise, question],
      questionNodes: [question],
      exam: {
        id: 'exam-1',
        year: 2025,
        sessionType: SessionType.NORMAL,
        isPublished: false,
        officialSourceReference: null,
        createdAt: now,
        updatedAt: now,
        stream: {
          code: 'SE',
        },
        subject: {
          code: 'MATH',
        },
        variants: [
          {
            nodes: [
              {
                nodeType: ExamNodeType.EXERCISE,
                parentId: null,
              },
              {
                nodeType: ExamNodeType.QUESTION,
                parentId: 'exercise-1',
              },
            ],
          },
        ],
      },
    } as never);

    const result = await service.getExerciseEditor('exercise-1');

    expect(result.exercise).toMatchObject({
      id: 'exercise-1',
      title: 'Exercise 1',
      order_index: 1,
      status: 'draft',
      theme: null,
      difficulty: null,
      tags: [],
      topics: [
        {
          code: 'ALG',
          name: 'الجبر',
        },
      ],
      metadata: {
        year: 2025,
        session: 'normal',
        subject: 'MATH',
        branch: 'SE',
        points: 6,
        context_blocks: [
          {
            id: 'exercise-block-1',
            type: 'paragraph',
            value: 'Exercise context',
            data: null,
          },
        ],
      },
    });
    expect(result.exercise.exam).toMatchObject({
      id: 'exam-1',
      exercise_count: 1,
      question_count: 1,
    });
    expect(result.questions).toEqual([
      {
        id: 'question-1',
        title: 'Question 1',
        parent_id: null,
        order_index: 1,
        status: 'published',
        points: 4,
        topics: [],
        content_blocks: [
          {
            id: 'question-block-1',
            type: 'paragraph',
            value: 'Prompt',
            data: null,
          },
        ],
        solution_blocks: [
          {
            id: 'question-block-2',
            type: 'paragraph',
            value: 'Solution',
            data: null,
          },
        ],
        hint_blocks: [
          {
            id: 'question-block-3',
            type: 'paragraph',
            value: 'Hint',
            data: null,
          },
        ],
        created_at: now,
        updated_at: now,
      },
    ]);
    expect(result.validation_errors).toEqual([]);
  });

  it('rejects question creation when parent_id is outside the exercise tree', async () => {
    const now = new Date('2025-01-20T00:00:00Z');

    jest.spyOn(service as never, 'loadExerciseContext').mockResolvedValue({
      exercise: {
        id: 'exercise-1',
        variantId: 'variant-1',
        parentId: null,
        nodeType: ExamNodeType.EXERCISE,
        orderIndex: 1,
        label: 'Exercise 1',
        maxPoints: null,
        status: PublicationStatus.DRAFT,
        metadata: null,
        createdAt: now,
        updatedAt: now,
        topicMappings: [],
        blocks: [],
      },
      variantNodes: [
        {
          id: 'exercise-1',
          variantId: 'variant-1',
          parentId: null,
          nodeType: ExamNodeType.EXERCISE,
          orderIndex: 1,
          label: 'Exercise 1',
          maxPoints: null,
          status: PublicationStatus.DRAFT,
          metadata: null,
          createdAt: now,
          updatedAt: now,
          topicMappings: [],
          blocks: [],
        },
        {
          id: 'question-1',
          variantId: 'variant-1',
          parentId: 'exercise-1',
          nodeType: ExamNodeType.QUESTION,
          orderIndex: 1,
          label: 'Question 1',
          maxPoints: null,
          status: PublicationStatus.DRAFT,
          metadata: null,
          createdAt: now,
          updatedAt: now,
          topicMappings: [],
          blocks: [],
        },
      ],
      questionNodes: [],
      exam: {
        id: 'exam-1',
        year: 2025,
        sessionType: SessionType.NORMAL,
        isPublished: false,
        officialSourceReference: null,
        createdAt: now,
        updatedAt: now,
        stream: {
          code: 'SE',
        },
        subject: {
          code: 'MATH',
        },
        variants: [
          {
            nodes: [],
          },
        ],
      },
    } as never);

    await expect(
      service.createQuestion('exercise-1', {
        parent_id: 'missing-question',
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'parent_id must reference a question in this exercise.',
      ),
    );
  });
});
