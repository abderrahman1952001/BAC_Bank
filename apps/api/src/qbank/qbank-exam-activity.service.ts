import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  RecentExamActivitiesResponse,
  UpsertExamActivityResponse,
} from '@bac-bank/contracts/qbank';
import { ExamVariantCode, PublicationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertExamActivityDto } from './dto/upsert-exam-activity.dto';
import { getSujetLabel } from './qbank-session-helpers';

@Injectable()
export class QbankExamActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async listRecentExamActivities(
    userId: string,
    limit = 8,
  ): Promise<RecentExamActivitiesResponse> {
    const cappedLimit = Math.min(Math.max(limit, 1), 20);
    const activities = await this.prisma.examActivity.findMany({
      where: {
        userId,
        exam: {
          isPublished: true,
        },
      },
      take: cappedLimit,
      orderBy: {
        lastOpenedAt: 'desc',
      },
      select: {
        id: true,
        examId: true,
        sujetNumber: true,
        totalQuestionCount: true,
        completedQuestionCount: true,
        openedQuestionCount: true,
        solutionViewedCount: true,
        createdAt: true,
        lastOpenedAt: true,
        exam: {
          select: {
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
            paper: {
              select: {
                variants: {
                  where: {
                    status: PublicationStatus.PUBLISHED,
                  },
                  select: {
                    code: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return {
      data: activities.map((activity) => ({
        id: activity.id,
        examId: activity.examId,
        year: activity.exam.year,
        sessionType: activity.exam.sessionType,
        stream: activity.exam.stream,
        subject: activity.exam.subject,
        sujetNumber: activity.sujetNumber as 1 | 2,
        sujetLabel: this.resolveSujetLabel(
          activity.exam.paper.variants,
          activity.sujetNumber,
        ),
        totalQuestionCount: activity.totalQuestionCount,
        completedQuestionCount: activity.completedQuestionCount,
        openedQuestionCount: activity.openedQuestionCount,
        solutionViewedCount: activity.solutionViewedCount,
        createdAt: activity.createdAt.toISOString(),
        lastOpenedAt: activity.lastOpenedAt.toISOString(),
      })),
    };
  }

  async upsertExamActivity(
    userId: string,
    examId: string,
    payload: UpsertExamActivityDto,
  ): Promise<UpsertExamActivityResponse> {
    const exam = await this.prisma.exam.findFirst({
      where: {
        id: examId,
        isPublished: true,
      },
      select: {
        id: true,
      },
    });

    if (!exam) {
      throw new NotFoundException(`Exam ${examId} not found`);
    }

    const normalizedCounts = this.normalizeCounts(payload);
    const lastOpenedAt = new Date();
    const activity = await this.prisma.examActivity.upsert({
      where: {
        userId_examId_sujetNumber: {
          userId,
          examId,
          sujetNumber: payload.sujetNumber,
        },
      },
      create: {
        userId,
        examId,
        sujetNumber: payload.sujetNumber,
        ...normalizedCounts,
        lastOpenedAt,
      },
      update: {
        ...normalizedCounts,
        lastOpenedAt,
      },
      select: {
        id: true,
        lastOpenedAt: true,
      },
    });

    return {
      id: activity.id,
      lastOpenedAt: activity.lastOpenedAt.toISOString(),
    };
  }

  private normalizeCounts(payload: UpsertExamActivityDto) {
    const totalQuestionCount = Math.max(
      payload.totalQuestionCount ?? 0,
      payload.completedQuestionCount ?? 0,
      payload.openedQuestionCount ?? 0,
      payload.solutionViewedCount ?? 0,
    );
    const completedQuestionCount = Math.min(
      Math.max(payload.completedQuestionCount ?? 0, 0),
      totalQuestionCount,
    );
    const openedQuestionCount = Math.min(
      Math.max(payload.openedQuestionCount ?? 0, completedQuestionCount),
      totalQuestionCount,
    );
    const solutionViewedCount = Math.min(
      Math.max(payload.solutionViewedCount ?? 0, 0),
      totalQuestionCount,
    );

    return {
      totalQuestionCount,
      completedQuestionCount,
      openedQuestionCount,
      solutionViewedCount,
    };
  }

  private resolveSujetLabel(
    variants: Array<{
      code: ExamVariantCode;
      title: string | null;
    }>,
    sujetNumber: number,
  ) {
    const variantCode =
      sujetNumber === 2 ? ExamVariantCode.SUJET_2 : ExamVariantCode.SUJET_1;
    const selectedVariant = variants.find((variant) => variant.code === variantCode);

    return selectedVariant?.title || getSujetLabel(sujetNumber as 1 | 2);
  }
}
