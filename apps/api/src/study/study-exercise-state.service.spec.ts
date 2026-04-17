import {
  ExamNodeType,
  ExamVariantCode,
  SessionType,
} from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { StudyExerciseStateService } from './study-exercise-state.service';

describe('StudyExerciseStateService', () => {
  let prisma: {
    user: { findUnique: jest.Mock };
    examNode: { findUnique: jest.Mock };
    studentExerciseState: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let studyReadModelService: {
    refreshUserReadModels: jest.Mock;
  };
  let service: StudyExerciseStateService;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn() },
      examNode: { findUnique: jest.fn() },
      studentExerciseState: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn((callback: (tx: typeof prisma) => unknown) =>
        Promise.resolve(callback(prisma)),
      ),
    };
    studyReadModelService = {
      refreshUserReadModels: jest.fn().mockResolvedValue(undefined),
    };
    service = new StudyExerciseStateService(
      prisma as never,
      studyReadModelService as never,
    );
  });

  it('prefers the student stream when building recent saved items', async () => {
    prisma.user.findUnique.mockResolvedValue({
      stream: {
        code: 'SE',
      },
    });
    prisma.studentExerciseState.findMany.mockResolvedValue([
      {
        exerciseNodeId: 'exercise-1',
        bookmarkedAt: new Date('2026-04-09T09:00:00.000Z'),
        flaggedAt: new Date('2026-04-09T10:00:00.000Z'),
        updatedAt: new Date('2026-04-09T10:00:00.000Z'),
        exerciseNode: {
          id: 'exercise-1',
          orderIndex: 2,
          label: 'Fonctions',
          variant: {
            code: ExamVariantCode.SUJET_2,
            paper: {
              offerings: [
                {
                  id: 'exam-tm',
                  year: 2025,
                  sessionType: SessionType.NORMAL,
                  stream: {
                    code: 'TM',
                    name: 'Techniques mathematiques',
                  },
                  subject: {
                    code: 'MATH',
                    name: 'Mathematics',
                  },
                },
                {
                  id: 'exam-se',
                  year: 2025,
                  sessionType: SessionType.NORMAL,
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
        },
      },
    ]);

    const result = await service.listRecentExerciseStates('user-1', 6);

    expect(result.data).toEqual([
      expect.objectContaining({
        exerciseNodeId: 'exercise-1',
        exercise: expect.objectContaining({
          id: 'exercise-1',
          orderIndex: 2,
          title: 'Fonctions',
        }),
        exam: expect.objectContaining({
          id: 'exam-se',
          sujetNumber: 2,
          sujetLabel: 'الموضوع 2',
          stream: {
            code: 'SE',
            name: 'Sciences experimentales',
          },
        }),
      }),
    ]);
  });

  it('creates a saved exercise state when a bookmark or flag is added', async () => {
    prisma.examNode.findUnique.mockResolvedValue({
      id: 'exercise-1',
      nodeType: ExamNodeType.EXERCISE,
    });
    prisma.studentExerciseState.findUnique.mockResolvedValue(null);
    prisma.studentExerciseState.create.mockResolvedValue({
      exerciseNodeId: 'exercise-1',
      bookmarkedAt: null,
      flaggedAt: new Date('2026-04-09T10:15:00.000Z'),
      updatedAt: new Date('2026-04-09T10:15:00.000Z'),
    });

    const result = await service.upsertExerciseState('user-1', 'exercise-1', {
      flagged: true,
    });

    expect(prisma.studentExerciseState.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          exerciseNodeId: 'exercise-1',
          bookmarkedAt: null,
          flaggedAt: expect.any(Date),
        }),
      }),
    );
    expect(studyReadModelService.refreshUserReadModels).toHaveBeenCalledWith(
      'user-1',
      prisma,
    );
    expect(result).toEqual({
      exerciseNodeId: 'exercise-1',
      bookmarkedAt: null,
      flaggedAt: '2026-04-09T10:15:00.000Z',
      updatedAt: '2026-04-09T10:15:00.000Z',
    });
  });

  it('deletes the persisted row when both bookmark and flag are cleared', async () => {
    prisma.examNode.findUnique.mockResolvedValue({
      id: 'exercise-1',
      nodeType: ExamNodeType.EXERCISE,
    });
    prisma.studentExerciseState.findUnique.mockResolvedValue({
      bookmarkedAt: new Date('2026-04-09T09:00:00.000Z'),
      flaggedAt: null,
    });
    prisma.studentExerciseState.delete.mockResolvedValue(undefined);

    const result = await service.upsertExerciseState('user-1', 'exercise-1', {
      bookmarked: false,
    });

    expect(prisma.studentExerciseState.delete).toHaveBeenCalledWith({
      where: {
        userId_exerciseNodeId: {
          userId: 'user-1',
          exerciseNodeId: 'exercise-1',
        },
      },
    });
    expect(result).toEqual(
      expect.objectContaining({
        exerciseNodeId: 'exercise-1',
        bookmarkedAt: null,
        flaggedAt: null,
      }),
    );
  });

  it('rejects empty updates before touching storage', async () => {
    await expect(
      service.upsertExerciseState('user-1', 'exercise-1', {}),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.examNode.findUnique).not.toHaveBeenCalled();
  });
});
