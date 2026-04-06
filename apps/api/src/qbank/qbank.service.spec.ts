import {
  BlockRole,
  BlockType,
  ExamNodeType,
  ExamVariantCode,
  PublicationStatus,
  SessionType,
} from '@prisma/client';
import { QbankExamActivityService } from './qbank-exam-activity.service';
import { QbankPracticeSessionService } from './qbank-practice-session.service';
import { QbankService } from './qbank.service';

function makeSubjectSelection(streamCodes: string[]) {
  return {
    id: 'subject-1',
    streamMappings: streamCodes.map((code) => ({
      validFromYear: 0,
      validToYear: null,
      stream: {
        code,
      },
    })),
  };
}

function makeSharedExam(
  examId: string,
  streamCode: string,
  streamName: string,
) {
  return {
    id: examId,
    year: 2024,
    sessionType: SessionType.NORMAL,
    stream: {
      code: streamCode,
      name: streamName,
    },
    subject: {
      code: 'MATH',
      name: 'Mathematics',
    },
    paper: {
      variants: [
        {
          id: 'variant-1',
          code: ExamVariantCode.SUJET_1,
          title: 'Sujet 1',
          status: PublicationStatus.PUBLISHED,
          nodes: [
            {
              id: 'exercise-1',
              parentId: null,
              nodeType: ExamNodeType.EXERCISE,
              orderIndex: 1,
              label: 'Exercise 1',
              maxPoints: null,
              status: PublicationStatus.PUBLISHED,
              metadata: null,
              topicMappings: [],
              blocks: [],
            },
            {
              id: 'question-1',
              parentId: 'exercise-1',
              nodeType: ExamNodeType.QUESTION,
              orderIndex: 1,
              label: 'Q1',
              maxPoints: 5,
              status: PublicationStatus.PUBLISHED,
              metadata: null,
              topicMappings: [],
              blocks: [
                {
                  id: `prompt-${examId}`,
                  role: BlockRole.PROMPT,
                  orderIndex: 1,
                  blockType: BlockType.PARAGRAPH,
                  textValue: 'Solve the equation.',
                  data: null,
                  media: null,
                },
              ],
            },
          ],
        },
      ],
    },
  };
}

function makeExerciseTopicTaggedExam() {
  return {
    id: 'exam-se',
    year: 2024,
    sessionType: SessionType.NORMAL,
    stream: {
      code: 'SE',
      name: 'Sciences experimentales',
    },
    subject: {
      code: 'MATH',
      name: 'Mathematics',
    },
    paper: {
      variants: [
        {
          id: 'variant-1',
          code: ExamVariantCode.SUJET_1,
          title: 'Sujet 1',
          status: PublicationStatus.PUBLISHED,
          nodes: [
            {
              id: 'exercise-1',
              parentId: null,
              nodeType: ExamNodeType.EXERCISE,
              orderIndex: 1,
              label: 'Exercise 1',
              maxPoints: null,
              status: PublicationStatus.PUBLISHED,
              metadata: null,
              topicMappings: [
                {
                  topic: {
                    code: 'ALG',
                    name: 'Algebre',
                    studentLabel: null,
                    displayOrder: 1,
                  },
                },
              ],
              blocks: [],
            },
            {
              id: 'question-1',
              parentId: 'exercise-1',
              nodeType: ExamNodeType.QUESTION,
              orderIndex: 1,
              label: 'Q1',
              maxPoints: 5,
              status: PublicationStatus.PUBLISHED,
              metadata: null,
              topicMappings: [],
              blocks: [
                {
                  id: 'prompt-topic',
                  role: BlockRole.PROMPT,
                  orderIndex: 1,
                  blockType: BlockType.PARAGRAPH,
                  textValue: 'Solve the expression.',
                  data: null,
                  media: null,
                },
              ],
            },
          ],
        },
      ],
    },
  };
}

function makeVariantWithOfferings() {
  return {
    id: 'variant-1',
    code: ExamVariantCode.SUJET_1,
    title: 'Sujet 1',
    status: PublicationStatus.PUBLISHED,
    paper: {
      offerings: [
        {
          id: 'exam-tm',
          year: 2024,
          sessionType: SessionType.NORMAL,
          subject: {
            code: 'MATH',
            name: 'Mathematics',
          },
          stream: {
            code: 'TM',
            name: 'Alpha TM',
          },
        },
        {
          id: 'exam-se',
          year: 2024,
          sessionType: SessionType.NORMAL,
          subject: {
            code: 'MATH',
            name: 'Mathematics',
          },
          stream: {
            code: 'SE',
            name: 'Zulu SE',
          },
        },
      ],
    },
    nodes: [
      {
        id: 'exercise-1',
        parentId: null,
        nodeType: ExamNodeType.EXERCISE,
        orderIndex: 1,
        label: 'Exercise 1',
        maxPoints: null,
        status: PublicationStatus.PUBLISHED,
        metadata: null,
        topicMappings: [],
        blocks: [],
      },
      {
        id: 'question-1',
        parentId: 'exercise-1',
        nodeType: ExamNodeType.QUESTION,
        orderIndex: 1,
        label: 'Q1',
        maxPoints: 5,
        status: PublicationStatus.PUBLISHED,
        metadata: null,
        topicMappings: [],
        blocks: [
          {
            id: 'prompt-session',
            role: BlockRole.PROMPT,
            orderIndex: 1,
            blockType: BlockType.PARAGRAPH,
            textValue: 'Solve the equation.',
            data: null,
            media: null,
          },
        ],
      },
    ],
  };
}

function makeStructuredSearchExam() {
  return {
    id: 'exam-structured',
    year: 2024,
    sessionType: SessionType.NORMAL,
    stream: {
      code: 'SE',
      name: 'Sciences experimentales',
    },
    subject: {
      code: 'MATH',
      name: 'Mathematics',
    },
    paper: {
      variants: [
        {
          id: 'variant-structured',
          code: ExamVariantCode.SUJET_1,
          title: 'Sujet 1',
          status: PublicationStatus.PUBLISHED,
          nodes: [
            {
              id: 'exercise-structured',
              parentId: null,
              nodeType: ExamNodeType.EXERCISE,
              orderIndex: 1,
              label: 'Exercise with diagrams',
              maxPoints: null,
              status: PublicationStatus.PUBLISHED,
              metadata: null,
              topicMappings: [],
              blocks: [],
            },
            {
              id: 'question-structured',
              parentId: 'exercise-structured',
              nodeType: ExamNodeType.QUESTION,
              orderIndex: 1,
              label: 'Q1',
              maxPoints: 5,
              status: PublicationStatus.PUBLISHED,
              metadata: null,
              topicMappings: [],
              blocks: [
                {
                  id: 'graph-block',
                  role: BlockRole.PROMPT,
                  orderIndex: 1,
                  blockType: BlockType.GRAPH,
                  textValue: null,
                  data: {
                    kind: 'graph',
                    caption: 'Curve summary',
                    graph: {
                      title: 'Branch diagram',
                      curves: [
                        {
                          label: 'Gamma',
                          fn: 'x^2',
                        },
                      ],
                    },
                  },
                  media: null,
                },
                {
                  id: 'tree-block',
                  role: BlockRole.SOLUTION,
                  orderIndex: 2,
                  blockType: BlockType.TREE,
                  textValue: null,
                  data: {
                    kind: 'tree',
                    tree: {
                      label: 'Start',
                      edgeLabel: '1/2',
                      probability: '0.5',
                      children: [
                        {
                          label: 'Success leaf',
                          edgeLabel: 'p',
                          probability: 'p',
                        },
                      ],
                    },
                  },
                  media: null,
                },
              ],
            },
          ],
        },
      ],
    },
  };
}

function makeVariantWithContextAndInheritedTopics() {
  return {
    id: 'variant-context',
    code: ExamVariantCode.SUJET_1,
    title: 'Sujet 1',
    status: PublicationStatus.PUBLISHED,
    paper: {
      offerings: [
        {
          id: 'exam-se',
          year: 2024,
          sessionType: SessionType.NORMAL,
          subject: {
            code: 'MATH',
            name: 'Mathematics',
          },
          stream: {
            code: 'SE',
            name: 'Sciences experimentales',
          },
        },
      ],
    },
    nodes: [
      {
        id: 'exercise-1',
        parentId: null,
        nodeType: ExamNodeType.EXERCISE,
        orderIndex: 1,
        label: 'Exercise 1',
        maxPoints: null,
        status: PublicationStatus.PUBLISHED,
        metadata: null,
        topicMappings: [
          {
            topic: {
              code: 'ALG',
              name: 'Algebre',
              studentLabel: 'Algebra',
              displayOrder: 1,
            },
          },
        ],
        blocks: [
          {
            id: 'exercise-context',
            role: BlockRole.PROMPT,
            orderIndex: 1,
            blockType: BlockType.PARAGRAPH,
            textValue: 'Read the stem first.',
            data: null,
            media: null,
          },
        ],
      },
      {
        id: 'context-1',
        parentId: 'exercise-1',
        nodeType: ExamNodeType.CONTEXT,
        orderIndex: 1,
        label: 'Shared context',
        maxPoints: null,
        status: PublicationStatus.PUBLISHED,
        metadata: null,
        topicMappings: [],
        blocks: [
          {
            id: 'nested-context',
            role: BlockRole.PROMPT,
            orderIndex: 1,
            blockType: BlockType.PARAGRAPH,
            textValue: 'Use this graph for every question.',
            data: null,
            media: null,
          },
        ],
      },
      {
        id: 'question-1',
        parentId: 'context-1',
        nodeType: ExamNodeType.QUESTION,
        orderIndex: 1,
        label: 'Q1',
        maxPoints: 5,
        status: PublicationStatus.PUBLISHED,
        metadata: null,
        topicMappings: [],
        blocks: [
          {
            id: 'prompt-1',
            role: BlockRole.PROMPT,
            orderIndex: 1,
            blockType: BlockType.PARAGRAPH,
            textValue: 'Solve the equation.',
            data: null,
            media: null,
          },
        ],
      },
    ],
  };
}

describe('QbankService practice sessions', () => {
  let prisma: {
    subject: { findUnique: jest.Mock };
    topic: { findMany: jest.Mock };
    exam: { findMany: jest.Mock };
    practiceSession: { create: jest.Mock; findFirst: jest.Mock };
    practiceSessionExercise: { createMany: jest.Mock };
    examVariant: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: QbankService;

  beforeEach(() => {
    prisma = {
      subject: { findUnique: jest.fn() },
      topic: { findMany: jest.fn() },
      exam: { findMany: jest.fn() },
      practiceSession: { create: jest.fn(), findFirst: jest.fn() },
      practiceSessionExercise: { createMany: jest.fn() },
      examVariant: { findMany: jest.fn() },
      $transaction: jest.fn((callback: (tx: typeof prisma) => unknown) =>
        Promise.resolve(callback(prisma)),
      ),
    };
    service = new QbankService(
      prisma as never,
      new QbankPracticeSessionService(prisma as never),
      new QbankExamActivityService(prisma as never),
    );
  });

  it('counts shared paper offerings in preview without duplicating exercise candidates', async () => {
    prisma.subject.findUnique.mockResolvedValue(
      makeSubjectSelection(['SE', 'TM']),
    );
    prisma.exam.findMany.mockResolvedValue([
      makeSharedExam('exam-se', 'SE', 'Sciences experimentales'),
      makeSharedExam('exam-tm', 'TM', 'Techniques mathematiques'),
    ]);

    const result = await service.previewPracticeSession({
      subjectCode: 'MATH',
      years: [2024],
      streamCodes: ['SE', 'TM'],
    });

    expect(result.matchingExerciseCount).toBe(1);
    expect(result.matchingSujetCount).toBe(2);
    expect(result.streamCodes).toEqual(['SE', 'TM']);
    expect(result.streamCode).toBeNull();
    expect(result.matchingSujets.map((entry) => entry.examId).sort()).toEqual([
      'exam-se',
      'exam-tm',
    ]);
    const examCalls = prisma.exam.findMany.mock.calls as unknown[][];
    const examQuery = examCalls[0]?.[0] as {
      where?: {
        stream?: {
          code?: {
            in?: string[];
          };
        };
      };
    };
    expect(examQuery.where?.stream?.code?.in).toEqual(['SE', 'TM']);
    expect(result.streamsDistribution).toEqual([
      {
        stream: {
          code: 'SE',
          name: 'Sciences experimentales',
        },
        matchingExerciseCount: 1,
      },
      {
        stream: {
          code: 'TM',
          name: 'Techniques mathematiques',
        },
        matchingExerciseCount: 1,
      },
    ]);
    expect(result.sampleExercises).toEqual([
      expect.objectContaining({
        examId: 'exam-se',
        stream: {
          code: 'SE',
          name: 'Sciences experimentales',
        },
      }),
    ]);
  });

  it('stores the chosen exam offering when creating a practice session', async () => {
    prisma.subject.findUnique.mockResolvedValue(makeSubjectSelection(['SE']));
    prisma.exam.findMany.mockResolvedValue([
      makeSharedExam('exam-se', 'SE', 'Sciences experimentales'),
    ]);
    prisma.practiceSession.create.mockResolvedValue({ id: 'session-1' });
    prisma.practiceSessionExercise.createMany.mockResolvedValue({ count: 1 });
    const getPracticeSessionByIdSpy = jest
      .spyOn(QbankPracticeSessionService.prototype, 'getPracticeSessionById')
      .mockResolvedValueOnce({ id: 'session-1' } as never);

    await service.createPracticeSession('user-1', {
      subjectCode: 'MATH',
      years: [2024],
      exerciseCount: 1,
      streamCodes: ['SE'],
    });

    getPracticeSessionByIdSpy.mockRestore();

    const sessionCreateCalls = prisma.practiceSession.create.mock
      .calls as unknown[][];
    const sessionCreateArgs = sessionCreateCalls[0]?.[0] as {
      data?: {
        filtersJson?: {
          streamCode?: string | null;
          streamCodes?: string[];
        };
      };
      select?: {
        id?: boolean;
      };
    };
    expect(sessionCreateArgs.data?.filtersJson).toEqual(
      expect.objectContaining({
        streamCode: 'SE',
        streamCodes: ['SE'],
      }),
    );
    expect(sessionCreateArgs.select).toEqual({ id: true });
    expect(prisma.practiceSessionExercise.createMany).toHaveBeenCalledWith({
      data: [
        {
          sessionId: 'session-1',
          exerciseNodeId: 'exercise-1',
          examId: 'exam-se',
          orderIndex: 1,
        },
      ],
    });
  });

  it('keeps the stored exam context when loading a practice session', async () => {
    prisma.practiceSession.findFirst.mockResolvedValue({
      id: 'session-1',
      title: 'Session 1',
      status: 'CREATED',
      requestedExerciseCount: 1,
      filtersJson: null,
      progressJson: null,
      createdAt: new Date('2026-03-28T00:00:00.000Z'),
      updatedAt: new Date('2026-03-28T00:00:00.000Z'),
      exercises: [
        {
          orderIndex: 1,
          exam: {
            id: 'exam-se',
            year: 2024,
            sessionType: SessionType.NORMAL,
            subject: {
              code: 'MATH',
              name: 'Mathematics',
            },
            stream: {
              code: 'SE',
              name: 'Zulu SE',
            },
          },
          exerciseNode: {
            id: 'exercise-1',
            orderIndex: 1,
            maxPoints: null,
            variantId: 'variant-1',
          },
        },
      ],
    });
    prisma.examVariant.findMany.mockResolvedValue([makeVariantWithOfferings()]);

    const payload = (await service.getPracticeSessionById(
      'user-1',
      'session-1',
    )) as {
      exercises: Array<{
        exam: {
          id: string;
          stream: {
            code: string;
            name: string;
          };
        };
      }>;
    };

    expect(payload.exercises[0]).toEqual(
      expect.objectContaining({
        exam: {
          id: 'exam-se',
          year: 2024,
          sessionType: SessionType.NORMAL,
          subject: {
            code: 'MATH',
            name: 'Mathematics',
          },
          stream: {
            code: 'SE',
            name: 'Zulu SE',
          },
        },
      }),
    );
  });

  it('matches exercise-level topic tags when previewing a practice session', async () => {
    prisma.subject.findUnique.mockResolvedValue(makeSubjectSelection(['SE']));
    prisma.topic.findMany.mockResolvedValue([
      {
        code: 'ALG',
        parent: null,
      },
    ]);
    prisma.exam.findMany.mockResolvedValue([makeExerciseTopicTaggedExam()]);

    const result = await service.previewPracticeSession({
      subjectCode: 'MATH',
      years: [2024],
      streamCodes: ['SE'],
      topicCodes: ['ALG'],
    });

    expect(result.matchingExerciseCount).toBe(1);
    expect(result.sampleExercises).toEqual([
      expect.objectContaining({
        exerciseNodeId: 'exercise-1',
      }),
    ]);
  });

  it('matches search against structured block content in preview', async () => {
    prisma.subject.findUnique.mockResolvedValue(makeSubjectSelection(['SE']));
    prisma.exam.findMany.mockResolvedValue([makeStructuredSearchExam()]);

    const result = await service.previewPracticeSession({
      subjectCode: 'MATH',
      years: [2024],
      streamCodes: ['SE'],
      search: 'success leaf',
    });

    expect(result.matchingExerciseCount).toBe(1);
    expect(result.sampleExercises).toEqual([
      expect.objectContaining({
        exerciseNodeId: 'exercise-structured',
        examId: 'exam-structured',
      }),
    ]);
  });

  it('builds session hierarchy with inherited topics and nested context blocks', async () => {
    prisma.practiceSession.findFirst.mockResolvedValue({
      id: 'session-1',
      title: 'Session 1',
      status: 'CREATED',
      requestedExerciseCount: 1,
      filtersJson: null,
      progressJson: null,
      createdAt: new Date('2026-03-28T00:00:00.000Z'),
      updatedAt: new Date('2026-03-28T00:00:00.000Z'),
      exercises: [
        {
          orderIndex: 1,
          exam: {
            id: 'exam-se',
            year: 2024,
            sessionType: SessionType.NORMAL,
            subject: {
              code: 'MATH',
              name: 'Mathematics',
            },
            stream: {
              code: 'SE',
              name: 'Sciences experimentales',
            },
          },
          exerciseNode: {
            id: 'exercise-1',
            orderIndex: 1,
            maxPoints: null,
            variantId: 'variant-context',
          },
        },
      ],
    });
    prisma.examVariant.findMany.mockResolvedValue([
      makeVariantWithContextAndInheritedTopics(),
    ]);

    const payload = (await service.getPracticeSessionById(
      'user-1',
      'session-1',
    )) as {
      exercises: Array<{
        hierarchy: {
          contextBlocks: Array<{ id: string }>;
          questions: Array<{
            topics: Array<{ code: string; name: string }>;
          }>;
        };
      }>;
    };

    expect(payload.exercises[0]?.hierarchy.contextBlocks).toEqual([
      expect.objectContaining({ id: 'exercise-context' }),
      expect.objectContaining({ id: 'nested-context' }),
    ]);
    expect(payload.exercises[0]?.hierarchy.questions[0]?.topics).toEqual([
      {
        code: 'ALG',
        name: 'Algebra',
      },
    ]);
  });
});
