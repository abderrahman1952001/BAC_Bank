import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  RecentExerciseStatesResponse,
  StudentExerciseStateResponse,
  StudentExerciseStatesLookupResponse,
  UpsertExerciseStateResponse,
} from '@bac-bank/contracts/study';
import { ExamNodeType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertStudyExerciseStateDto } from './dto/upsert-study-exercise-state.dto';
import { StudyReadModelService } from './study-read-model.service';
import {
  getSujetLabel,
  pickRepresentativeExamOffering,
  toSujetNumberFromVariantCode,
} from './study-session-helpers';

@Injectable()
export class StudyExerciseStateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studyReadModelService: StudyReadModelService,
  ) {}

  async listRecentExerciseStates(
    userId: string,
    limit = 8,
  ): Promise<RecentExerciseStatesResponse> {
    const cappedLimit = Math.min(Math.max(limit, 1), 20);
    const preferredStreamCode = await this.getPreferredStreamCode(userId);
    const exerciseStates = await this.prisma.studentExerciseState.findMany({
      where: {
        userId,
        OR: [{ bookmarkedAt: { not: null } }, { flaggedAt: { not: null } }],
      },
      take: cappedLimit,
      orderBy: { updatedAt: 'desc' },
      select: {
        exerciseNodeId: true,
        bookmarkedAt: true,
        flaggedAt: true,
        updatedAt: true,
        exerciseNode: {
          select: {
            id: true,
            orderIndex: true,
            label: true,
            variant: {
              select: {
                code: true,
                paper: {
                  select: {
                    offerings: {
                      select: {
                        id: true,
                        year: true,
                        sessionType: true,
                        stream: {
                          select: {
                            code: true,
                            name: true,
                          },
                        },
                        subject: {
                          select: {
                            code: true,
                            name: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return {
      data: exerciseStates.flatMap((exerciseState) => {
        const sujetNumber = toSujetNumberFromVariantCode(
          exerciseState.exerciseNode.variant.code,
        );
        const representativeExam = this.pickExerciseStateExamOffering(
          exerciseState.exerciseNode.variant.paper.offerings,
          preferredStreamCode,
        );

        if (!sujetNumber || !representativeExam) {
          return [];
        }

        return [
          {
            ...this.toStudentExerciseStateResponse(exerciseState),
            exercise: {
              id: exerciseState.exerciseNode.id,
              orderIndex: exerciseState.exerciseNode.orderIndex,
              title: exerciseState.exerciseNode.label,
            },
            exam: {
              id: representativeExam.id,
              year: representativeExam.year,
              sessionType: representativeExam.sessionType,
              stream: representativeExam.stream,
              subject: representativeExam.subject,
              sujetNumber,
              sujetLabel: getSujetLabel(sujetNumber),
            },
          },
        ];
      }),
    };
  }

  async lookupExerciseStates(
    userId: string,
    exerciseNodeIds: string[],
  ): Promise<StudentExerciseStatesLookupResponse> {
    const uniqueExerciseNodeIds = Array.from(new Set(exerciseNodeIds));

    if (!uniqueExerciseNodeIds.length) {
      return { data: [] };
    }

    const exerciseStates = await this.prisma.studentExerciseState.findMany({
      where: {
        userId,
        exerciseNodeId: {
          in: uniqueExerciseNodeIds,
        },
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        exerciseNodeId: true,
        bookmarkedAt: true,
        flaggedAt: true,
        updatedAt: true,
      },
    });

    return {
      data: exerciseStates.map((exerciseState) =>
        this.toStudentExerciseStateResponse(exerciseState),
      ),
    };
  }

  async upsertExerciseState(
    userId: string,
    exerciseNodeId: string,
    payload: UpsertStudyExerciseStateDto,
  ): Promise<UpsertExerciseStateResponse> {
    if (payload.bookmarked === undefined && payload.flagged === undefined) {
      throw new BadRequestException(
        'At least one exercise-state field must be provided.',
      );
    }

    const exerciseNode = await this.prisma.examNode.findUnique({
      where: {
        id: exerciseNodeId,
      },
      select: {
        id: true,
        nodeType: true,
      },
    });

    if (!exerciseNode) {
      throw new NotFoundException(`Exercise ${exerciseNodeId} was not found.`);
    }

    if (exerciseNode.nodeType !== ExamNodeType.EXERCISE) {
      throw new BadRequestException(
        'Only exercise nodes can be bookmarked or flagged.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const currentExerciseState = await tx.studentExerciseState.findUnique({
        where: {
          userId_exerciseNodeId: {
            userId,
            exerciseNodeId,
          },
        },
        select: {
          bookmarkedAt: true,
          flaggedAt: true,
        },
      });

      const now = new Date();
      const nextBookmarkedAt =
        payload.bookmarked === undefined
          ? (currentExerciseState?.bookmarkedAt ?? null)
          : payload.bookmarked
            ? (currentExerciseState?.bookmarkedAt ?? now)
            : null;
      const nextFlaggedAt =
        payload.flagged === undefined
          ? (currentExerciseState?.flaggedAt ?? null)
          : payload.flagged
            ? (currentExerciseState?.flaggedAt ?? now)
            : null;

      if (!nextBookmarkedAt && !nextFlaggedAt) {
        if (currentExerciseState) {
          await tx.studentExerciseState.delete({
            where: {
              userId_exerciseNodeId: {
                userId,
                exerciseNodeId,
              },
            },
          });

          if (payload.flagged !== undefined) {
            await this.studyReadModelService.refreshUserReadModels(userId, tx);
          }
        }

        return {
          exerciseNodeId,
          bookmarkedAt: null,
          flaggedAt: null,
          updatedAt: now.toISOString(),
        };
      }

      const persistedExerciseState = currentExerciseState
        ? await tx.studentExerciseState.update({
            where: {
              userId_exerciseNodeId: {
                userId,
                exerciseNodeId,
              },
            },
            data: {
              bookmarkedAt: nextBookmarkedAt,
              flaggedAt: nextFlaggedAt,
            },
            select: {
              exerciseNodeId: true,
              bookmarkedAt: true,
              flaggedAt: true,
              updatedAt: true,
            },
          })
        : await tx.studentExerciseState.create({
            data: {
              userId,
              exerciseNodeId,
              bookmarkedAt: nextBookmarkedAt,
              flaggedAt: nextFlaggedAt,
            },
            select: {
              exerciseNodeId: true,
              bookmarkedAt: true,
              flaggedAt: true,
              updatedAt: true,
            },
          });

      if (payload.flagged !== undefined) {
        await this.studyReadModelService.refreshUserReadModels(userId, tx);
      }

      return this.toStudentExerciseStateResponse(persistedExerciseState);
    });
  }

  private async getPreferredStreamCode(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        stream: {
          select: {
            code: true,
          },
        },
      },
    });

    return user?.stream?.code ?? null;
  }

  private pickExerciseStateExamOffering(
    offerings: Array<{
      id: string;
      year: number;
      sessionType: 'NORMAL' | 'MAKEUP';
      stream: {
        code: string;
        name: string;
      };
      subject: {
        code: string;
        name: string;
      };
    }>,
    preferredStreamCode: string | null,
  ) {
    if (preferredStreamCode) {
      const preferredOfferings = offerings.filter(
        (offering) => offering.stream.code === preferredStreamCode,
      );
      const preferredExam = pickRepresentativeExamOffering(preferredOfferings);

      if (preferredExam) {
        return preferredExam;
      }
    }

    return pickRepresentativeExamOffering(offerings);
  }

  private toStudentExerciseStateResponse(state: {
    exerciseNodeId: string;
    bookmarkedAt: Date | null;
    flaggedAt: Date | null;
    updatedAt: Date;
  }): StudentExerciseStateResponse {
    return {
      exerciseNodeId: state.exerciseNodeId,
      bookmarkedAt: state.bookmarkedAt?.toISOString() ?? null,
      flaggedAt: state.flaggedAt?.toISOString() ?? null,
      updatedAt: state.updatedAt.toISOString(),
    };
  }
}
