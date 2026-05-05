import {
  BlockRole,
  BlockType,
  ExamNodeType,
  ExamVariantCode,
  StudySessionFamily,
  StudySessionKind,
  PublicationStatus,
  SessionType,
  SubscriptionStatus,
} from '@prisma/client';
import { StudyExamActivityService } from './study-exam-activity.service';
import { StudyQuestionAiExplanationService } from './study-question-ai-explanation.service';
import { StudySessionService } from './study-session.service';
import { StudyService } from './study.service';
import { StudyWeakPointService } from './study-weak-point.service';

function makeSubjectScope(streamCodes: string[]) {
  return {
    subjectId: 'subject-1',
    subjectCode: 'MATH',
    allowedStreamCodes: streamCodes,
    curriculumIds: ['curriculum-1'],
  };
}

function makeSharedExam(
  examId: string,
  streamCode: string,
  streamName: string,
) {
  return makeSharedExamWithExercise(
    examId,
    streamCode,
    streamName,
    'exercise-1',
    'question-1',
  );
}

function makeSharedExamWithExercise(
  examId: string,
  streamCode: string,
  streamName: string,
  exerciseId: string,
  questionId: string,
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
              id: exerciseId,
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
              id: questionId,
              parentId: exerciseId,
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

function makeOfficialSimulationExam() {
  return {
    id: 'exam-sim',
    year: 2024,
    sessionType: SessionType.NORMAL,
    isPublished: true,
    stream: {
      code: 'SE',
      name: 'Sciences experimentales',
    },
    subject: {
      code: 'MATH',
      name: 'Mathematics',
    },
    paper: {
      durationMinutes: 180,
      variants: [
        {
          id: 'variant-sim',
          code: ExamVariantCode.SUJET_1,
          title: 'Sujet 1',
          status: PublicationStatus.PUBLISHED,
          nodes: [
            {
              id: 'exercise-sim-1',
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
              id: 'question-sim-1',
              parentId: 'exercise-sim-1',
              nodeType: ExamNodeType.QUESTION,
              orderIndex: 1,
              label: 'Q1',
              maxPoints: 5,
              status: PublicationStatus.PUBLISHED,
              metadata: null,
              topicMappings: [],
              blocks: [
                {
                  id: 'prompt-sim-1',
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

describe('StudyService study sessions', () => {
  let prisma: {
    subject: { findUnique: jest.Mock };
    topic: { findMany: jest.Mock };
    studentTopicRollup: { findMany: jest.Mock };
    exam: { findMany: jest.Mock; findUnique: jest.Mock };
    user: { findUnique: jest.Mock };
    studySession: {
      create: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
    studySessionExercise: { createMany: jest.Mock; update: jest.Mock };
    studySessionQuestion: { createMany: jest.Mock; update: jest.Mock };
    examVariant: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let catalogCurriculumService: {
    listActiveFilterTopics: jest.Mock;
    resolveSubjectCurriculumScope: jest.Mock;
  };
  let service: StudyService;

  beforeEach(() => {
    prisma = {
      subject: { findUnique: jest.fn() },
      topic: { findMany: jest.fn() },
      studentTopicRollup: { findMany: jest.fn() },
      exam: { findMany: jest.fn(), findUnique: jest.fn() },
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ subscriptionStatus: SubscriptionStatus.FREE }),
      },
      studySession: {
        create: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn(),
      },
      studySessionExercise: { createMany: jest.fn(), update: jest.fn() },
      studySessionQuestion: { createMany: jest.fn(), update: jest.fn() },
      examVariant: { findMany: jest.fn() },
      $transaction: jest.fn((callback: (tx: typeof prisma) => unknown) =>
        Promise.resolve(callback(prisma)),
      ),
    };
    catalogCurriculumService = {
      listActiveFilterTopics: jest.fn().mockResolvedValue([]),
      resolveSubjectCurriculumScope: jest
        .fn()
        .mockResolvedValue(makeSubjectScope(['SE'])),
    };
    service = new StudyService(
      prisma as never,
      catalogCurriculumService as never,
      new StudySessionService(
        prisma as never,
        catalogCurriculumService as never,
        { refreshUserReadModels: jest.fn() } as never,
        new StudyWeakPointService(prisma as never),
      ),
      new StudyExamActivityService(prisma as never),
      {
        generate: jest.fn(),
      } as unknown as StudyQuestionAiExplanationService,
    );
  });

  it('counts shared paper offerings in preview without duplicating exercise candidates', async () => {
    catalogCurriculumService.resolveSubjectCurriculumScope.mockResolvedValue(
      makeSubjectScope(['SE', 'TM']),
    );
    prisma.exam.findMany.mockResolvedValue([
      makeSharedExam('exam-se', 'SE', 'Sciences experimentales'),
      makeSharedExam('exam-tm', 'TM', 'Techniques mathematiques'),
    ]);

    const result = await service.previewStudySession('user-1', {
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

  it('stores the chosen exam offering when creating a study session', async () => {
    catalogCurriculumService.resolveSubjectCurriculumScope.mockResolvedValue(
      makeSubjectScope(['SE']),
    );
    prisma.exam.findMany.mockResolvedValue([
      makeSharedExam('exam-se', 'SE', 'Sciences experimentales'),
    ]);
    prisma.studySession.create.mockResolvedValue({ id: 'session-1' });
    prisma.studySessionExercise.createMany.mockResolvedValue({ count: 1 });
    const getStudySessionByIdSpy = jest
      .spyOn(StudySessionService.prototype, 'getStudySessionById')
      .mockResolvedValueOnce({ id: 'session-1' } as never);

    try {
      await service.createStudySession('user-1', {
        subjectCode: 'MATH',
        years: [2024],
        exerciseCount: 1,
        streamCodes: ['SE'],
      });
    } finally {
      getStudySessionByIdSpy.mockRestore();
    }

    const sessionCreateCalls = prisma.studySession.create.mock
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
    expect(sessionCreateArgs.data).toEqual(
      expect.objectContaining({
        family: StudySessionFamily.DRILL,
        kind: StudySessionKind.MIXED_DRILL,
      }),
    );
    expect(sessionCreateArgs.select).toEqual({ id: true });
    expect(prisma.studySessionExercise.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          sessionId: 'session-1',
          exerciseNodeId: 'exercise-1',
          examId: 'exam-se',
          orderIndex: 1,
        }),
      ],
    });
    expect(prisma.studySessionQuestion.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          sessionExerciseId: expect.any(String),
          questionNodeId: 'question-1',
          sequenceIndex: 1,
        }),
      ],
    });
  });

  it('creates an exact drill when exercise node ids are provided', async () => {
    catalogCurriculumService.resolveSubjectCurriculumScope.mockResolvedValue(
      makeSubjectScope(['SE']),
    );
    prisma.exam.findMany.mockResolvedValue([
      makeSharedExamWithExercise(
        'exam-se-1',
        'SE',
        'Sciences experimentales',
        'exercise-1',
        'question-1',
      ),
      makeSharedExamWithExercise(
        'exam-se-2',
        'SE',
        'Sciences experimentales',
        'exercise-2',
        'question-2',
      ),
    ]);
    prisma.studySession.create.mockResolvedValue({ id: 'session-exact' });
    prisma.studySessionExercise.createMany.mockResolvedValue({ count: 1 });
    const getStudySessionByIdSpy = jest
      .spyOn(StudySessionService.prototype, 'getStudySessionById')
      .mockResolvedValueOnce({ id: 'session-exact' } as never);

    try {
      await service.createStudySession('user-1', {
        subjectCode: 'MATH',
        years: [2024],
        streamCodes: ['SE'],
        exerciseCount: 6,
        exerciseNodeIds: ['exercise-2'],
      });
    } finally {
      getStudySessionByIdSpy.mockRestore();
    }

    expect(prisma.studySession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          requestedExerciseCount: 1,
          filtersJson: expect.objectContaining({
            exerciseNodeIds: ['exercise-2'],
          }),
        }),
      }),
    );
    expect(prisma.studySessionExercise.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          sessionId: 'session-exact',
          exerciseNodeId: 'exercise-2',
          examId: 'exam-se-2',
          orderIndex: 1,
        }),
      ],
    });
  });

  it('tags topic-filtered drill sessions as topic drills', async () => {
    catalogCurriculumService.resolveSubjectCurriculumScope.mockResolvedValue(
      makeSubjectScope(['SE']),
    );
    prisma.topic.findMany.mockResolvedValue([
      {
        code: 'ALG',
        parent: null,
      },
    ]);
    prisma.exam.findMany.mockResolvedValue([makeExerciseTopicTaggedExam()]);
    prisma.studySession.create.mockResolvedValue({ id: 'session-topic' });
    prisma.studySessionExercise.createMany.mockResolvedValue({ count: 1 });
    const getStudySessionByIdSpy = jest
      .spyOn(StudySessionService.prototype, 'getStudySessionById')
      .mockResolvedValueOnce({ id: 'session-topic' } as never);

    try {
      await service.createStudySession('user-1', {
        subjectCode: 'MATH',
        years: [2024],
        exerciseCount: 1,
        streamCodes: ['SE'],
        topicCodes: ['ALG'],
      });
    } finally {
      getStudySessionByIdSpy.mockRestore();
    }

    expect(prisma.studySession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          family: StudySessionFamily.DRILL,
          kind: StudySessionKind.TOPIC_DRILL,
        }),
      }),
    );
  });

  it('rejects new free drill starts after the monthly quota is exhausted', async () => {
    catalogCurriculumService.resolveSubjectCurriculumScope.mockResolvedValue(
      makeSubjectScope(['SE']),
    );
    prisma.exam.findMany.mockResolvedValue([
      makeSharedExam('exam-se', 'SE', 'Sciences experimentales'),
    ]);
    prisma.studySession.count.mockResolvedValueOnce(5).mockResolvedValueOnce(0);

    await expect(
      service.createStudySession('user-1', {
        subjectCode: 'MATH',
        years: [2024],
        exerciseCount: 1,
        streamCodes: ['SE'],
      }),
    ).rejects.toThrow('quota is exhausted');

    expect(prisma.studySession.create).not.toHaveBeenCalled();
  });

  it('builds official paper simulation previews from a selected sujet', async () => {
    prisma.exam.findUnique.mockResolvedValue(makeOfficialSimulationExam());

    const result = await service.previewStudySession('user-1', {
      family: StudySessionFamily.SIMULATION,
      kind: StudySessionKind.PAPER_SIMULATION,
      sourceExamId: 'exam-sim',
      sourceSujetNumber: 1,
      subjectCode: 'MATH',
      years: [2024],
      streamCodes: ['SE'],
      sessionTypes: [SessionType.NORMAL],
    });

    expect(result).toEqual(
      expect.objectContaining({
        sessionFamily: 'SIMULATION',
        sessionKind: 'PAPER_SIMULATION',
        sourceExamId: 'exam-sim',
        durationMinutes: 180,
        matchingExerciseCount: 1,
        matchingSujetCount: 1,
      }),
    );
  });

  it('keeps the stored exam context when loading a study session', async () => {
    prisma.studySession.findFirst.mockResolvedValue({
      id: 'session-1',
      title: 'Session 1',
      family: StudySessionFamily.DRILL,
      kind: StudySessionKind.MIXED_DRILL,
      status: 'CREATED',
      sourceExamId: null,
      requestedExerciseCount: 1,
      durationMinutes: null,
      filtersJson: null,
      startedAt: null,
      deadlineAt: null,
      submittedAt: null,
      completedAt: null,
      lastInteractedAt: null,
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

    const payload = (await service.getStudySessionById(
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

  it('matches exercise-level topic tags when previewing a study session', async () => {
    catalogCurriculumService.resolveSubjectCurriculumScope.mockResolvedValue(
      makeSubjectScope(['SE']),
    );
    prisma.topic.findMany.mockResolvedValue([
      {
        code: 'ALG',
        parent: null,
      },
    ]);
    prisma.exam.findMany.mockResolvedValue([makeExerciseTopicTaggedExam()]);

    const result = await service.previewStudySession('user-1', {
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
    catalogCurriculumService.resolveSubjectCurriculumScope.mockResolvedValue(
      makeSubjectScope(['SE']),
    );
    prisma.exam.findMany.mockResolvedValue([makeStructuredSearchExam()]);

    const result = await service.previewStudySession('user-1', {
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
    prisma.studySession.findFirst.mockResolvedValue({
      id: 'session-1',
      title: 'Session 1',
      family: StudySessionFamily.DRILL,
      kind: StudySessionKind.MIXED_DRILL,
      status: 'CREATED',
      sourceExamId: null,
      requestedExerciseCount: 1,
      durationMinutes: null,
      filtersJson: null,
      startedAt: null,
      deadlineAt: null,
      submittedAt: null,
      completedAt: null,
      lastInteractedAt: null,
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

    const payload = (await service.getStudySessionById(
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

  it('builds a weak-point remediation intro for weak-point drill sessions', async () => {
    prisma.studySession.findFirst.mockResolvedValue({
      id: 'session-weak-1',
      title: 'Weak session',
      family: StudySessionFamily.DRILL,
      kind: StudySessionKind.WEAK_POINT_DRILL,
      status: 'CREATED',
      sourceExamId: null,
      requestedExerciseCount: 1,
      durationMinutes: null,
      filtersJson: {
        subjectCode: 'MATH',
        topicCodes: ['FUNC'],
      },
      startedAt: null,
      deadlineAt: null,
      submittedAt: null,
      completedAt: null,
      lastInteractedAt: null,
      createdAt: new Date('2026-03-28T00:00:00.000Z'),
      updatedAt: new Date('2026-03-28T00:00:00.000Z'),
      exercises: [
        {
          orderIndex: 1,
          sessionQuestions: [],
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
            variantId: 'variant-1',
          },
        },
      ],
    });
    prisma.examVariant.findMany.mockResolvedValue([makeVariantWithOfferings()]);
    prisma.topic.findMany.mockResolvedValue([
      {
        id: 'topic-1',
        code: 'FUNC',
        name: 'Fonctions',
        studentLabel: 'Functions',
        displayOrder: 1,
        parent: {
          code: 'ALG',
          name: 'Algebre',
          studentLabel: 'Algebra',
        },
        skillMappings: [
          {
            weight: 1,
            isPrimary: true,
            skill: {
              name: 'Exponential functions',
              description:
                'Identify the rule before expanding the calculation.',
              displayOrder: 1,
            },
          },
        ],
      },
    ]);
    prisma.studentTopicRollup.findMany.mockResolvedValue([
      {
        topicId: 'topic-1',
        missedCount: 4,
        hardCount: 1,
        skippedCount: 0,
        revealedCount: 2,
      },
    ]);

    const payload = (await service.getStudySessionById(
      'user-1',
      'session-weak-1',
    )) as {
      pedagogy: {
        supportStyle: string;
        weakPointIntro: {
          topics: Array<{ code: string; name: string }>;
          prerequisiteTopics: Array<{ code: string; name: string }>;
          keyRules: string[];
          dominantReason: string | null;
          starterExercise: {
            questionLabel: string | null;
            promptPreview: string | null;
          } | null;
        } | null;
      };
    };

    expect(payload.pedagogy.supportStyle).toBe('LOGIC_HEAVY');
    expect(payload.pedagogy.weakPointIntro).toEqual(
      expect.objectContaining({
        topics: [{ code: 'FUNC', name: 'Functions' }],
        prerequisiteTopics: [{ code: 'ALG', name: 'Algebra' }],
        dominantReason: 'MISSED',
        starterExercise: expect.objectContaining({
          questionLabel: 'Q1',
          promptPreview: 'Solve the equation.',
        }),
      }),
    );
    expect(payload.pedagogy.weakPointIntro?.keyRules[0]).toContain(
      'Identify the rule',
    );
  });
});
