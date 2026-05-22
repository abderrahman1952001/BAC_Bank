import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CompleteLabMissionAttemptRequest,
  CompleteLabMissionAttemptResponse,
  LabMission,
  LabMissionAttempt,
  LabMissionAttemptStatus,
  LabMissionItem,
  LabToolMissionsResponse,
  LabToolsResponse,
  LabToolSummary,
  StartLabMissionAttemptResponse,
} from '@bac-bank/contracts/lab';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { evaluateLabMissionExitCheck } from './lab-mission-exit-check';

const labToolSelect = Prisma.validator<Prisma.LabToolSelect>()({
  id: true,
  slug: true,
  title: true,
  description: true,
  status: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  subject: {
    select: {
      code: true,
      name: true,
    },
  },
});

const labMissionSelect = Prisma.validator<Prisma.LabMissionSelect>()({
  id: true,
  toolId: true,
  title: true,
  goal: true,
  preset: true,
  exitCheck: true,
  orderIndex: true,
  createdAt: true,
  updatedAt: true,
  curriculumNode: {
    select: {
      id: true,
      code: true,
      name: true,
      slug: true,
    },
  },
  learningTarget: {
    select: {
      id: true,
      code: true,
      name: true,
      slug: true,
    },
  },
  courseLesson: {
    select: {
      id: true,
      title: true,
      slug: true,
    },
  },
});

const labMissionAttemptSelect =
  Prisma.validator<Prisma.StudentLabMissionAttemptSelect>()({
    id: true,
    missionId: true,
    status: true,
    resultJson: true,
    startedAt: true,
    completedAt: true,
  });

type LabToolRecord = Prisma.LabToolGetPayload<{
  select: typeof labToolSelect;
}>;

type LabMissionRecord = Prisma.LabMissionGetPayload<{
  select: typeof labMissionSelect;
}>;

type LabMissionAttemptRecord = Prisma.StudentLabMissionAttemptGetPayload<{
  select: typeof labMissionAttemptSelect;
}>;

@Injectable()
export class LabService {
  constructor(private readonly prisma: PrismaService) {}

  async listTools(userId: string): Promise<LabToolsResponse> {
    const tools = await this.prisma.labTool.findMany({
      where: {
        status: {
          in: ['READY', 'DRAFT'],
        },
      },
      orderBy: [{ slug: 'asc' }, { createdAt: 'asc' }],
      select: {
        ...labToolSelect,
        missions: {
          select: {
            id: true,
            attempts: {
              where: {
                userId,
              },
              select: {
                status: true,
              },
            },
          },
        },
      },
    });

    return {
      data: tools.map((tool) =>
        this.toToolSummary(tool, {
          missionCount: tool.missions.length,
          completedMissionCount: tool.missions.filter((mission) =>
            mission.attempts.some((attempt) => attempt.status === 'COMPLETED'),
          ).length,
          inProgressMissionCount: tool.missions.filter((mission) =>
            mission.attempts.some(
              (attempt) => attempt.status === 'IN_PROGRESS',
            ),
          ).length,
        }),
      ),
    };
  }

  async listToolMissions(
    userId: string,
    toolSlug: string,
  ): Promise<LabToolMissionsResponse> {
    const tool = await this.prisma.labTool.findFirst({
      where: {
        slug: toolSlug,
        status: 'READY',
      },
      select: {
        ...labToolSelect,
        missions: {
          orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
          select: {
            ...labMissionSelect,
            attempts: {
              where: {
                userId,
              },
              orderBy: {
                startedAt: 'desc',
              },
              select: labMissionAttemptSelect,
            },
          },
        },
      },
    });

    if (!tool) {
      throw new NotFoundException(`Lab tool ${toolSlug} was not found.`);
    }

    const missionItems = tool.missions.map((mission) =>
      this.toMissionItem(mission),
    );

    return {
      tool: this.toToolSummary(tool, {
        missionCount: missionItems.length,
        completedMissionCount: missionItems.filter(
          (item) => item.completedAttemptCount > 0,
        ).length,
        inProgressMissionCount: missionItems.filter(
          (item) => item.latestAttempt?.status === 'IN_PROGRESS',
        ).length,
      }),
      missions: missionItems,
    };
  }

  async startMissionAttempt(
    userId: string,
    missionId: string,
  ): Promise<StartLabMissionAttemptResponse> {
    return this.prisma.$transaction(async (tx) => {
      const mission = await tx.labMission.findFirst({
        where: {
          id: missionId,
          tool: {
            status: 'READY',
          },
        },
        select: {
          id: true,
          curriculumNodeId: true,
          learningTargetId: true,
          courseLessonId: true,
        },
      });

      if (!mission) {
        throw new NotFoundException(`Lab mission ${missionId} was not found.`);
      }

      const attempt = await tx.studentLabMissionAttempt.create({
        data: {
          userId,
          missionId,
          status: 'IN_PROGRESS',
          resultJson: Prisma.JsonNull,
        },
        select: labMissionAttemptSelect,
      });

      await tx.studentLearningEvent.create({
        data: {
          userId,
          eventType: 'LAB_MISSION_STARTED',
          sourceType: 'LAB_MISSION',
          sourceId: mission.id,
          curriculumNodeId: mission.curriculumNodeId,
          learningTargetId: mission.learningTargetId,
          courseLessonId: mission.courseLessonId,
        },
      });

      return {
        attempt: this.toAttempt(attempt),
      };
    });
  }

  async completeMissionAttempt(
    userId: string,
    attemptId: string,
    payload: CompleteLabMissionAttemptRequest,
  ): Promise<CompleteLabMissionAttemptResponse> {
    return this.prisma.$transaction(async (tx) => {
      const existingAttempt = await tx.studentLabMissionAttempt.findFirst({
        where: {
          id: attemptId,
          userId,
        },
        select: {
          id: true,
          mission: {
            select: {
              id: true,
              exitCheck: true,
              curriculumNodeId: true,
              learningTargetId: true,
              courseLessonId: true,
            },
          },
        },
      });

      if (!existingAttempt) {
        throw new NotFoundException(
          `Lab mission attempt ${attemptId} was not found.`,
        );
      }

      const exitCheckEvaluation =
        payload.status === 'COMPLETED'
          ? evaluateLabMissionExitCheck(
              this.toJsonRecord(existingAttempt.mission.exitCheck),
              payload.resultJson ?? null,
            )
          : null;

      if (exitCheckEvaluation && !exitCheckEvaluation.passed) {
        throw new BadRequestException(exitCheckEvaluation.message);
      }

      const attempt = await tx.studentLabMissionAttempt.update({
        where: {
          id: existingAttempt.id,
        },
        data: {
          status: payload.status,
          resultJson:
            payload.resultJson === undefined || payload.resultJson === null
              ? Prisma.JsonNull
              : this.toJsonValue(payload.resultJson),
          completedAt: new Date(),
        },
        select: labMissionAttemptSelect,
      });

      await tx.studentLearningEvent.create({
        data: {
          userId,
          eventType:
            payload.status === 'COMPLETED'
              ? 'LAB_MISSION_COMPLETED'
              : 'LAB_MISSION_FAILED',
          sourceType: 'LAB_MISSION',
          sourceId: existingAttempt.mission.id,
          curriculumNodeId: existingAttempt.mission.curriculumNodeId,
          learningTargetId: existingAttempt.mission.learningTargetId,
          courseLessonId: existingAttempt.mission.courseLessonId,
          value: this.toJsonValue({
            attemptId: attempt.id,
            resultJson: payload.resultJson ?? null,
            exitCheck: exitCheckEvaluation,
          }),
        },
      });

      return {
        attempt: this.toAttempt(attempt),
      };
    });
  }

  private toToolSummary(
    tool: LabToolRecord,
    counts?: {
      missionCount?: number;
      completedMissionCount?: number;
      inProgressMissionCount?: number;
    },
  ): LabToolSummary {
    return {
      id: tool.id,
      slug: tool.slug,
      title: tool.title,
      description: tool.description,
      status: tool.status,
      metadata: this.toJsonRecord(tool.metadata),
      subject: tool.subject,
      missionCount: counts?.missionCount ?? 0,
      completedMissionCount: counts?.completedMissionCount ?? 0,
      inProgressMissionCount: counts?.inProgressMissionCount ?? 0,
      createdAt: tool.createdAt.toISOString(),
      updatedAt: tool.updatedAt.toISOString(),
    };
  }

  private toMissionItem(
    mission: LabMissionRecord & {
      attempts: LabMissionAttemptRecord[];
    },
  ): LabMissionItem {
    return {
      mission: this.toMission(mission),
      latestAttempt: mission.attempts[0]
        ? this.toAttempt(mission.attempts[0])
        : null,
      completedAttemptCount: mission.attempts.filter(
        (attempt) => attempt.status === 'COMPLETED',
      ).length,
    };
  }

  private toMission(mission: LabMissionRecord): LabMission {
    return {
      id: mission.id,
      toolId: mission.toolId,
      title: mission.title,
      goal: mission.goal,
      preset: this.toJsonRecord(mission.preset),
      exitCheck: this.toJsonRecord(mission.exitCheck),
      orderIndex: mission.orderIndex,
      curriculumNode: mission.curriculumNode,
      learningTarget: mission.learningTarget,
      courseLesson: mission.courseLesson,
      createdAt: mission.createdAt.toISOString(),
      updatedAt: mission.updatedAt.toISOString(),
    };
  }

  private toAttempt(attempt: LabMissionAttemptRecord): LabMissionAttempt {
    return {
      id: attempt.id,
      missionId: attempt.missionId,
      status: this.toAttemptStatus(attempt.status),
      resultJson: this.toJsonRecord(attempt.resultJson),
      startedAt: attempt.startedAt.toISOString(),
      completedAt: attempt.completedAt?.toISOString() ?? null,
    };
  }

  private toAttemptStatus(status: string): LabMissionAttemptStatus {
    if (status === 'COMPLETED' || status === 'FAILED') {
      return status;
    }

    return 'IN_PROGRESS';
  }

  private toJsonRecord(
    value: Prisma.JsonValue,
  ): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
