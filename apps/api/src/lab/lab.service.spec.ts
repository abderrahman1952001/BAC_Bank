import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { LabService } from './lab.service';

describe('LabService', () => {
  let prisma: {
    labTool: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
    labMission: {
      findFirst: jest.Mock;
    };
    studentLabMissionAttempt: {
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    studentLearningEvent: {
      create: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let service: LabService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-13T08:00:00.000Z'));
    prisma = {
      labTool: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      labMission: {
        findFirst: jest.fn(),
      },
      studentLabMissionAttempt: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      studentLearningEvent: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };
    service = new LabService(prisma as never);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('lists Lab tools with user progress counts', async () => {
    prisma.labTool.findMany.mockResolvedValue([
      {
        ...makeToolRecord(),
        missions: [
          {
            id: 'mission-1',
            attempts: [{ status: 'COMPLETED' }],
          },
          {
            id: 'mission-2',
            attempts: [{ status: 'IN_PROGRESS' }],
          },
        ],
      },
    ]);

    await expect(service.listTools('user-1')).resolves.toEqual({
      data: [
        expect.objectContaining({
          id: '11111111-1111-1111-1111-111111111111',
          slug: 'function-explorer',
          missionCount: 2,
          completedMissionCount: 1,
          inProgressMissionCount: 1,
        }),
      ],
    });
    expect(prisma.labTool.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: {
            in: ['READY', 'DRAFT'],
          },
        },
      }),
    );
  });

  it('lists tool missions with latest attempt and completed count', async () => {
    prisma.labTool.findFirst.mockResolvedValue({
      ...makeToolRecord(),
      missions: [
        {
          ...makeMissionRecord(),
          attempts: [
            makeAttemptRecord({
              status: 'IN_PROGRESS',
              startedAt: new Date('2026-05-13T08:00:00.000Z'),
            }),
            makeAttemptRecord({
              id: '33333333-3333-3333-3333-333333333333',
              status: 'COMPLETED',
              startedAt: new Date('2026-05-12T08:00:00.000Z'),
              completedAt: new Date('2026-05-12T08:10:00.000Z'),
            }),
          ],
        },
      ],
    });

    const result = await service.listToolMissions(
      'user-1',
      'function-explorer',
    );

    expect(result.tool.missionCount).toBe(1);
    expect(result.tool.inProgressMissionCount).toBe(1);
    expect(result.missions[0].latestAttempt?.status).toBe('IN_PROGRESS');
    expect(result.missions[0].completedAttemptCount).toBe(1);
  });

  it('starts a mission attempt and records a learning event', async () => {
    prisma.labMission.findFirst.mockResolvedValue({
      id: '22222222-2222-2222-2222-222222222222',
      curriculumNodeId: '44444444-4444-4444-4444-444444444444',
      learningTargetId: '55555555-5555-5555-5555-555555555555',
      courseLessonId: null,
    });
    prisma.studentLabMissionAttempt.create.mockResolvedValue(
      makeAttemptRecord(),
    );
    prisma.studentLearningEvent.create.mockResolvedValue({});

    const result = await service.startMissionAttempt(
      'user-1',
      '22222222-2222-2222-2222-222222222222',
    );

    expect(result.attempt.status).toBe('IN_PROGRESS');
    expect(prisma.studentLabMissionAttempt.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        missionId: '22222222-2222-2222-2222-222222222222',
        status: 'IN_PROGRESS',
        resultJson: Prisma.JsonNull,
      },
      select: expect.any(Object),
    });
    expect(prisma.studentLearningEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        eventType: 'LAB_MISSION_STARTED',
        sourceType: 'LAB_MISSION',
        sourceId: '22222222-2222-2222-2222-222222222222',
      }),
    });
  });

  it('completes a user mission attempt', async () => {
    prisma.studentLabMissionAttempt.findFirst.mockResolvedValue({
      id: '22222222-2222-2222-2222-222222222222',
      mission: {
        id: '33333333-3333-3333-3333-333333333333',
        exitCheck: {
          kind: 'ROOTS_NEAR',
          expectedRoots: [1, 3],
          tolerance: 0.25,
        },
        curriculumNodeId: null,
        learningTargetId: null,
        courseLessonId: null,
      },
    });
    prisma.studentLabMissionAttempt.update.mockResolvedValue(
      makeAttemptRecord({
        status: 'COMPLETED',
        completedAt: new Date('2026-05-13T08:00:00.000Z'),
      }),
    );
    prisma.studentLearningEvent.create.mockResolvedValue({});

    const result = await service.completeMissionAttempt(
      'user-1',
      '22222222-2222-2222-2222-222222222222',
      {
        status: 'COMPLETED',
        resultJson: { roots: [1, 3] },
      },
    );

    expect(result.attempt.status).toBe('COMPLETED');
    expect(prisma.studentLabMissionAttempt.update).toHaveBeenCalledWith({
      where: {
        id: '22222222-2222-2222-2222-222222222222',
      },
      data: expect.objectContaining({
        status: 'COMPLETED',
      }),
      select: expect.any(Object),
    });
    expect(prisma.studentLearningEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: 'LAB_MISSION_COMPLETED',
        value: expect.objectContaining({
          exitCheck: expect.objectContaining({
            passed: true,
            kind: 'ROOTS_NEAR',
          }),
        }),
      }),
    });
  });

  it('rejects completed mission attempts when the exit check fails', async () => {
    prisma.studentLabMissionAttempt.findFirst.mockResolvedValue({
      id: '22222222-2222-2222-2222-222222222222',
      mission: {
        id: '33333333-3333-3333-3333-333333333333',
        exitCheck: {
          kind: 'ROOTS_NEAR',
          expectedRoots: [1, 3],
          tolerance: 0.25,
        },
        curriculumNodeId: null,
        learningTargetId: null,
        courseLessonId: null,
      },
    });

    await expect(
      service.completeMissionAttempt(
        'user-1',
        '22222222-2222-2222-2222-222222222222',
        {
          status: 'COMPLETED',
          resultJson: { roots: [1, 2, 3] },
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.studentLabMissionAttempt.update).not.toHaveBeenCalled();
    expect(prisma.studentLearningEvent.create).not.toHaveBeenCalled();
  });

  it('throws when a mission is missing', async () => {
    prisma.labMission.findFirst.mockResolvedValue(null);

    await expect(
      service.startMissionAttempt(
        'user-1',
        '22222222-2222-2222-2222-222222222222',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

function makeToolRecord() {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    slug: 'function-explorer',
    title: 'مستكشف الدوال',
    description: 'Tool description',
    status: 'READY',
    metadata: {
      subjectSlug: 'math',
    },
    subject: {
      code: 'MATHEMATICS',
      name: 'الرياضيات',
    },
    createdAt: new Date('2026-05-13T08:00:00.000Z'),
    updatedAt: new Date('2026-05-13T08:00:00.000Z'),
  };
}

function makeMissionRecord() {
  return {
    id: '22222222-2222-2222-2222-222222222222',
    toolId: '11111111-1111-1111-1111-111111111111',
    title: 'اقرأ جذور المنحنى',
    goal: 'Find roots.',
    preset: {
      seedCode: 'FUNCTION_ROOTS_FROM_GRAPH',
    },
    exitCheck: null,
    orderIndex: 1,
    curriculumNode: {
      id: '44444444-4444-4444-4444-444444444444',
      code: 'FUNCTIONS',
      name: 'الدوال',
      slug: 'functions',
    },
    learningTarget: {
      id: '55555555-5555-5555-5555-555555555555',
      code: 'FUNCTION_ANALYSIS',
      name: 'تحليل الدوال',
      slug: 'function-analysis',
    },
    courseLesson: null,
    createdAt: new Date('2026-05-13T08:00:00.000Z'),
    updatedAt: new Date('2026-05-13T08:00:00.000Z'),
  };
}

function makeAttemptRecord(
  overrides: Partial<{
    id: string;
    status: string;
    startedAt: Date;
    completedAt: Date | null;
  }> = {},
) {
  return {
    id: overrides.id ?? '66666666-6666-6666-6666-666666666666',
    missionId: '22222222-2222-2222-2222-222222222222',
    status: overrides.status ?? 'IN_PROGRESS',
    resultJson: null,
    startedAt: overrides.startedAt ?? new Date('2026-05-13T08:00:00.000Z'),
    completedAt: overrides.completedAt ?? null,
  };
}
