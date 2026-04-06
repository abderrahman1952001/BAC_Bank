import { Injectable } from '@nestjs/common';
import type {
  AdminDashboardResponse,
  AdminFiltersResponse,
} from '@bac-bank/contracts/admin';
import { ExamNodeType, PublicationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminReferenceService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(): Promise<AdminDashboardResponse> {
    const [
      totalExams,
      totalExercises,
      totalQuestions,
      examDraft,
      examPublished,
      exerciseDraft,
      exercisePublished,
      questionDraft,
      questionPublished,
    ] = await Promise.all([
      this.prisma.exam.count(),
      this.prisma.examNode.count({
        where: {
          nodeType: ExamNodeType.EXERCISE,
          parentId: null,
        },
      }),
      this.prisma.examNode.count({
        where: {
          nodeType: {
            in: [ExamNodeType.QUESTION, ExamNodeType.SUBQUESTION],
          },
        },
      }),
      this.prisma.exam.count({ where: { isPublished: false } }),
      this.prisma.exam.count({ where: { isPublished: true } }),
      this.prisma.examNode.count({
        where: {
          nodeType: ExamNodeType.EXERCISE,
          parentId: null,
          status: PublicationStatus.DRAFT,
        },
      }),
      this.prisma.examNode.count({
        where: {
          nodeType: ExamNodeType.EXERCISE,
          parentId: null,
          status: PublicationStatus.PUBLISHED,
        },
      }),
      this.prisma.examNode.count({
        where: {
          nodeType: {
            in: [ExamNodeType.QUESTION, ExamNodeType.SUBQUESTION],
          },
          status: PublicationStatus.DRAFT,
        },
      }),
      this.prisma.examNode.count({
        where: {
          nodeType: {
            in: [ExamNodeType.QUESTION, ExamNodeType.SUBQUESTION],
          },
          status: PublicationStatus.PUBLISHED,
        },
      }),
    ]);

    return {
      totals: {
        exams: totalExams,
        exercises: totalExercises,
        questions: totalQuestions,
      },
      workflow: {
        exams: {
          draft: examDraft,
          published: examPublished,
        },
        exercises: {
          draft: exerciseDraft,
          published: exercisePublished,
        },
        questions: {
          draft: questionDraft,
          published: questionPublished,
        },
      },
    };
  }

  async getFilters(): Promise<AdminFiltersResponse> {
    const [subjects, streams, years, topics] = await Promise.all([
      this.prisma.subject.findMany({
        select: {
          code: true,
          name: true,
          isDefault: true,
          family: {
            select: {
              code: true,
              name: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      }),
      this.prisma.stream.findMany({
        select: {
          code: true,
          name: true,
          isDefault: true,
          family: {
            select: {
              code: true,
              name: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      }),
      this.prisma.exam.findMany({
        select: {
          year: true,
        },
        distinct: ['year'],
        orderBy: {
          year: 'desc',
        },
      }),
      this.prisma.topic.findMany({
        select: {
          code: true,
          name: true,
          displayOrder: true,
          isSelectable: true,
          studentLabel: true,
          parent: {
            select: {
              code: true,
            },
          },
          subject: {
            select: {
              code: true,
              name: true,
              streamMappings: {
                select: {
                  stream: {
                    select: {
                      code: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: [{ subject: { name: 'asc' } }, { name: 'asc' }],
      }),
    ]);

    return {
      subjects,
      streams,
      subjectFamilies: Array.from(
        new Map(
          subjects.map((subject) => [
            subject.family.code,
            {
              code: subject.family.code,
              name: subject.family.name,
            },
          ]),
        ).values(),
      ).sort((a, b) => a.name.localeCompare(b.name)),
      streamFamilies: Array.from(
        new Map(
          streams.map((stream) => [
            stream.family.code,
            {
              code: stream.family.code,
              name: stream.family.name,
            },
          ]),
        ).values(),
      ).sort((a, b) => a.name.localeCompare(b.name)),
      years: years.map((entry) => entry.year),
      topics: topics.map((topic) => ({
        code: topic.code,
        name: topic.studentLabel ?? topic.name,
        parentCode: topic.parent?.code ?? null,
        displayOrder: topic.displayOrder,
        isSelectable: topic.isSelectable,
        subject: {
          code: topic.subject.code,
          name: topic.subject.name,
        },
        streamCodes: Array.from(
          new Set(
            topic.subject.streamMappings.map((mapping) => mapping.stream.code),
          ),
        ).sort((a, b) => a.localeCompare(b)),
      })),
    };
  }
}
