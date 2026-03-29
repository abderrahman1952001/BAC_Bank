import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ExamNodeType,
  ExamVariantCode,
  Prisma,
  PublicationStatus,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AdminDomainSupport } from './admin-domain-support';

const DEFAULT_EXAM_DURATION_MINUTES = 210;
const DEFAULT_EXAM_TOTAL_POINTS = 40;

@Injectable()
export class AdminExamCatalogService extends AdminDomainSupport {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async listExams(subject?: string, year?: number) {
    const normalizedSubject = subject?.trim().toUpperCase();

    const exams = await this.prisma.exam.findMany({
      where: {
        ...(normalizedSubject
          ? {
              subject: {
                code: normalizedSubject,
              },
            }
          : {}),
        ...(typeof year === 'number' && Number.isFinite(year)
          ? {
              year,
            }
          : {}),
      },
      include: {
        stream: {
          select: {
            code: true,
          },
        },
        subject: {
          select: {
            code: true,
          },
        },
        paper: {
          select: {
            officialSourceReference: true,
            variants: {
              select: {
                id: true,
                code: true,
                status: true,
                nodes: {
                  select: {
                    id: true,
                    parentId: true,
                    nodeType: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [
        {
          year: 'desc',
        },
        {
          subject: {
            code: 'asc',
          },
        },
        {
          stream: {
            code: 'asc',
          },
        },
        {
          updatedAt: 'desc',
        },
      ],
    });

    return {
      data: exams.map((exam) =>
        this.mapExam({
          ...exam,
          officialSourceReference: exam.paper.officialSourceReference,
          variants: exam.paper.variants,
        }),
      ),
    };
  }

  async bootstrapExamsFromQbank() {
    const totalExams = await this.prisma.exam.count();

    return {
      imported_exams: 0,
      imported_exercises: 0,
      imported_questions: 0,
      skipped_existing_exams: totalExams,
      total_qbank_exams: totalExams,
    };
  }

  async createExam(payload: Record<string, unknown>) {
    const year = this.readInteger(payload.year, 'year');
    const streamCode = await this.resolveStreamCode(payload.stream);
    const subjectCode = await this.resolveSubjectCode(payload.subject);
    const sessionType = this.toSessionType(payload.session);
    const status = this.toPublicationStatus(payload.status);
    const paperFamilyCode =
      this.readOptionalString(payload.paper_family_code) ??
      this.readOptionalString(payload.paperFamilyCode) ??
      this.derivePaperFamilyCode(streamCode, subjectCode);
    const officialSourceReference = this.readOptionalString(
      payload.original_pdf_url,
    );

    const [stream, subject] = await Promise.all([
      this.prisma.stream.findUnique({
        where: {
          code: streamCode,
        },
        select: {
          id: true,
        },
      }),
      this.prisma.subject.findUnique({
        where: {
          code: subjectCode,
        },
        select: {
          id: true,
        },
      }),
    ]);

    if (!stream || !subject) {
      throw new BadRequestException('Invalid stream/subject selection.');
    }

    const existing = await this.prisma.exam.findFirst({
      where: {
        year,
        streamId: stream.id,
        subjectId: subject.id,
        sessionType,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'An exam already exists for this year/stream/subject/session.',
      );
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const existingPaper = await tx.paper.findFirst({
        where: {
          year,
          subjectId: subject.id,
          sessionType,
          familyCode: paperFamilyCode,
        },
        select: {
          id: true,
        },
      });

      const paperId = existingPaper?.id ?? randomUUID();

      if (!existingPaper) {
        await tx.paper.create({
          data: {
            id: paperId,
            year,
            subjectId: subject.id,
            sessionType,
            familyCode: paperFamilyCode,
            durationMinutes: DEFAULT_EXAM_DURATION_MINUTES,
            totalPoints: DEFAULT_EXAM_TOTAL_POINTS,
            officialSourceReference,
          },
        });
      }

      const exam = await tx.exam.create({
        data: {
          year,
          streamId: stream.id,
          subjectId: subject.id,
          sessionType,
          paperId,
          isPublished: status === PublicationStatus.PUBLISHED,
        },
        include: {
          stream: {
            select: {
              code: true,
            },
          },
          subject: {
            select: {
              code: true,
            },
          },
        },
      });

      if (!existingPaper) {
        await tx.examVariant.createMany({
          data: [
            {
              paperId,
              code: ExamVariantCode.SUJET_1,
              title: 'الموضوع الأول',
              status,
            },
            {
              paperId,
              code: ExamVariantCode.SUJET_2,
              title: 'الموضوع الثاني',
              status,
            },
          ],
        });
      }

      return exam.id;
    });

    const exam = await this.getExamByIdForAdmin(created);
    return this.mapExam(exam);
  }

  async updateExam(examId: string, payload: Record<string, unknown>) {
    const exam = await this.prisma.exam.findUnique({
      where: {
        id: examId,
      },
      include: {
        paper: {
          select: {
            id: true,
            year: true,
            subjectId: true,
            sessionType: true,
            familyCode: true,
            officialSourceReference: true,
            offerings: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException(`Exam ${examId} not found.`);
    }

    const nextYear =
      payload.year !== undefined
        ? this.readInteger(payload.year, 'year')
        : exam.year;
    const nextSessionType =
      payload.session !== undefined
        ? this.toSessionType(payload.session)
        : exam.sessionType;
    const nextStatus =
      payload.status !== undefined
        ? this.toPublicationStatus(payload.status)
        : exam.isPublished
          ? PublicationStatus.PUBLISHED
          : PublicationStatus.DRAFT;
    const nextOfficialSourceReference =
      payload.original_pdf_url !== undefined
        ? this.readOptionalString(payload.original_pdf_url)
        : exam.paper.officialSourceReference;
    const nextPaperFamilyCode =
      this.readOptionalString(payload.paper_family_code) ??
      this.readOptionalString(payload.paperFamilyCode) ??
      exam.paper.familyCode;

    let nextStreamId = exam.streamId;
    if (payload.stream !== undefined) {
      const streamCode = await this.resolveStreamCode(payload.stream);
      const stream = await this.prisma.stream.findUnique({
        where: {
          code: streamCode,
        },
        select: {
          id: true,
        },
      });

      if (!stream) {
        throw new BadRequestException('stream must map to an existing stream.');
      }

      nextStreamId = stream.id;
    }

    let nextSubjectId = exam.subjectId;
    if (payload.subject !== undefined) {
      const subjectCode = await this.resolveSubjectCode(payload.subject);
      const subject = await this.prisma.subject.findUnique({
        where: {
          code: subjectCode,
        },
        select: {
          id: true,
        },
      });

      if (!subject) {
        throw new BadRequestException(
          'subject must map to an existing subject.',
        );
      }

      nextSubjectId = subject.id;
    }

    const paperShapeChanged =
      nextYear !== exam.paper.year ||
      nextSubjectId !== exam.paper.subjectId ||
      nextSessionType !== exam.paper.sessionType ||
      nextPaperFamilyCode !== exam.paper.familyCode ||
      nextOfficialSourceReference !== exam.paper.officialSourceReference;

    if (paperShapeChanged && exam.paper.offerings.length > 1) {
      throw new BadRequestException(
        'This exam shares a canonical paper with other offerings. Update the paper through ingestion or edit a non-shared offering.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      if (paperShapeChanged) {
        const conflictingPaper = await tx.paper.findFirst({
          where: {
            year: nextYear,
            subjectId: nextSubjectId,
            sessionType: nextSessionType,
            familyCode: nextPaperFamilyCode,
            NOT: {
              id: exam.paperId,
            },
          },
          select: {
            id: true,
          },
        });

        if (conflictingPaper) {
          throw new BadRequestException(
            'Another canonical paper already exists for this year/subject/session/family.',
          );
        }

        await tx.paper.update({
          where: {
            id: exam.paperId,
          },
          data: {
            year: nextYear,
            subjectId: nextSubjectId,
            sessionType: nextSessionType,
            familyCode: nextPaperFamilyCode,
            officialSourceReference: nextOfficialSourceReference,
          },
        });
      }

      await tx.exam.update({
        where: {
          id: examId,
        },
        data: {
          year: nextYear,
          streamId: nextStreamId,
          subjectId: nextSubjectId,
          sessionType: nextSessionType,
          isPublished: nextStatus === PublicationStatus.PUBLISHED,
        },
      });
    });

    const updated = await this.getExamByIdForAdmin(examId);
    return this.mapExam(updated);
  }

  async deleteExam(examId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: {
        id: examId,
      },
      select: {
        id: true,
        paperId: true,
      },
    });

    if (!exam) {
      throw new NotFoundException(`Exam ${examId} not found.`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.exam.delete({
        where: {
          id: examId,
        },
      });

      const remainingOfferings = await tx.exam.count({
        where: {
          paperId: exam.paperId,
        },
      });

      if (remainingOfferings === 0) {
        await tx.paper.delete({
          where: {
            id: exam.paperId,
          },
        });
      }
    });

    return {
      success: true,
    };
  }

  async getExamExercises(examId: string) {
    const exam = await this.getExamByIdForAdmin(examId);

    const allNodes = exam.variants.flatMap((variant) =>
      variant.nodes.map((node) => ({
        ...node,
        variantCode: variant.code,
      })),
    );

    const childrenByParent = this.buildChildrenByParent(allNodes);

    const exerciseNodes = allNodes.filter(
      (node) =>
        node.nodeType === ExamNodeType.EXERCISE && node.parentId === null,
    );

    const orderedExercises = this.sortExercisesForAdmin(exerciseNodes);

    return {
      exam: this.mapExam(exam),
      exercises: orderedExercises.map((exercise, index) => {
        const descendantIds = this.collectDescendantIds(
          exercise.id,
          childrenByParent,
        );
        let questionCount = 0;

        for (const nodeId of descendantIds) {
          const node = allNodes.find((entry) => entry.id === nodeId);

          if (!node) {
            continue;
          }

          if (
            node.nodeType === ExamNodeType.QUESTION ||
            node.nodeType === ExamNodeType.SUBQUESTION
          ) {
            questionCount += 1;
          }
        }

        return this.mapExerciseNode(exercise, questionCount, index + 1);
      }),
    };
  }

  async createExercise(examId: string, payload: Record<string, unknown>) {
    const exam = await this.getExamByIdForAdmin(examId);

    const variantCode = this.readOptionalExamVariantCode(payload.variant_code);
    const targetVariant = await this.resolveOrCreateTargetVariant(
      exam.paperId,
      exam.variants,
      variantCode,
      this.toPublicationStatus(payload.status),
    );

    const existingExerciseNodes = exam.variants.flatMap((variant) =>
      variant.nodes.filter(
        (node) =>
          node.nodeType === ExamNodeType.EXERCISE && node.parentId === null,
      ),
    );

    const sameVariantExercises = existingExerciseNodes.filter(
      (node) => node.variantId === targetVariant.id,
    );

    const maxVariantOrder = sameVariantExercises.reduce(
      (max, node) => Math.max(max, node.orderIndex),
      0,
    );

    const maxAdminOrder = existingExerciseNodes.reduce((max, node) => {
      const metadata = this.parseExerciseMetadata(node.metadata);
      return Math.max(max, metadata.adminOrder ?? 0);
    }, 0);

    const title = this.readOptionalString(payload.title);
    const status = this.toPublicationStatus(payload.status);
    const topicCodes = this.readOptionalTopicCodes(payload);

    const metadata = this.toExerciseMetadata({
      theme: this.readOptionalString(payload.theme) ?? undefined,
      difficulty: this.readOptionalString(payload.difficulty) ?? undefined,
      tags: this.readOptionalStringArray(payload.tags),
      adminOrder: maxAdminOrder + 1,
    });

    const created = await this.prisma.$transaction(async (tx) => {
      const nextExercise = await tx.examNode.create({
        data: {
          variantId: targetVariant.id,
          parentId: null,
          nodeType: ExamNodeType.EXERCISE,
          orderIndex: maxVariantOrder + 1,
          label: title ?? `Exercise ${maxVariantOrder + 1}`,
          maxPoints: null,
          status,
          metadata: this.toJsonValue(metadata),
        },
        select: {
          id: true,
        },
      });

      if (topicCodes !== undefined) {
        await this.replaceNodeTopicMappings(
          tx,
          nextExercise.id,
          exam.subject.code,
          topicCodes,
        );
      }

      return nextExercise;
    });

    const refreshed = await this.getExamExercises(examId);
    const mapped = refreshed.exercises.find(
      (exercise) => exercise.id === created.id,
    );

    if (!mapped) {
      throw new NotFoundException(
        `Exercise ${created.id} not found after creation.`,
      );
    }

    return mapped;
  }

  async updateExercise(exerciseId: string, payload: Record<string, unknown>) {
    const exercise = await this.prisma.examNode.findUnique({
      where: {
        id: exerciseId,
      },
      include: {
        variant: {
          select: {
            paper: {
              select: {
                offerings: {
                  orderBy: {
                    createdAt: 'asc',
                  },
                  select: {
                    id: true,
                    subject: {
                      select: {
                        code: true,
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

    if (!exercise || exercise.nodeType !== ExamNodeType.EXERCISE) {
      throw new NotFoundException(`Exercise ${exerciseId} not found.`);
    }

    const data: Prisma.ExamNodeUpdateInput = {};
    const existingMetadata = this.parseExerciseMetadata(exercise.metadata);
    const topicCodes = this.readOptionalTopicCodes(payload);
    const subjectCode = exercise.variant.paper.offerings[0]?.subject.code;

    if (!subjectCode) {
      throw new NotFoundException(
        `Exercise ${exerciseId} is not linked to a subject offering.`,
      );
    }

    if (payload.title !== undefined) {
      data.label = this.readOptionalString(payload.title);
    }

    if (payload.status !== undefined) {
      data.status = this.toPublicationStatus(payload.status);
    }

    if (payload.points !== undefined) {
      data.maxPoints = this.readDecimal(payload.points, 'points');
    }

    if (
      payload.theme !== undefined ||
      payload.difficulty !== undefined ||
      payload.tags !== undefined
    ) {
      const nextMetadata = this.toExerciseMetadata({
        ...existingMetadata,
        ...(payload.theme !== undefined
          ? {
              theme: this.readOptionalString(payload.theme) ?? undefined,
            }
          : {}),
        ...(payload.difficulty !== undefined
          ? {
              difficulty:
                this.readOptionalString(payload.difficulty) ?? undefined,
            }
          : {}),
        ...(payload.tags !== undefined
          ? {
              tags: this.readOptionalStringArray(payload.tags),
            }
          : {}),
      });

      data.metadata = this.toJsonValue(nextMetadata);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.examNode.update({
        where: {
          id: exerciseId,
        },
        data,
      });

      if (topicCodes !== undefined) {
        await this.replaceNodeTopicMappings(
          tx,
          exerciseId,
          subjectCode,
          topicCodes,
        );
      }
    });

    const refreshed = await this.getExamExercises(
      this.pickRepresentativeExamId(exercise.variant.paper.offerings),
    );
    const mapped = refreshed.exercises.find((entry) => entry.id === exerciseId);

    if (!mapped) {
      throw new NotFoundException(
        `Exercise ${exerciseId} not found after update.`,
      );
    }

    return mapped;
  }

  async deleteExercise(exerciseId: string) {
    const exercise = await this.prisma.examNode.findUnique({
      where: {
        id: exerciseId,
      },
      include: {
        variant: {
          select: {
            id: true,
            paper: {
              select: {
                offerings: {
                  orderBy: {
                    createdAt: 'asc',
                  },
                  select: {
                    id: true,
                    subject: {
                      select: {
                        code: true,
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

    if (!exercise || exercise.nodeType !== ExamNodeType.EXERCISE) {
      throw new NotFoundException(`Exercise ${exerciseId} not found.`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.examNode.delete({
        where: {
          id: exerciseId,
        },
      });

      const remaining = await tx.examNode.findMany({
        where: {
          variantId: exercise.variant.id,
          nodeType: ExamNodeType.EXERCISE,
          parentId: null,
        },
        orderBy: {
          orderIndex: 'asc',
        },
        select: {
          id: true,
        },
      });

      for (let index = 0; index < remaining.length; index += 1) {
        await tx.examNode.update({
          where: {
            id: remaining[index].id,
          },
          data: {
            orderIndex: index + 1,
          },
        });
      }
    });

    await this.rebalanceExerciseAdminOrder(
      this.pickRepresentativeExamId(exercise.variant.paper.offerings),
    );

    return {
      success: true,
    };
  }

  async reorderExercises(examId: string, payload: Record<string, unknown>) {
    const orderedIds = this.readRequiredStringArray(
      payload.ordered_ids,
      'ordered_ids',
    );

    const exam = await this.getExamByIdForAdmin(examId);

    const exerciseNodes = exam.variants.flatMap((variant) =>
      variant.nodes
        .filter(
          (node) =>
            node.nodeType === ExamNodeType.EXERCISE && node.parentId === null,
        )
        .map((node) => ({
          ...node,
          variantCode: variant.code,
        })),
    );

    this.validateExactIdSet(
      exerciseNodes.map((exercise) => exercise.id),
      orderedIds,
      'exercise',
    );

    const byId = new Map(exerciseNodes.map((node) => [node.id, node]));

    await this.prisma.$transaction(async (tx) => {
      // Phase 1: move all exercise orders away from the constrained range to avoid
      // unique collisions while swapping positions.
      for (let index = 0; index < orderedIds.length; index += 1) {
        await tx.examNode.update({
          where: {
            id: orderedIds[index],
          },
          data: {
            orderIndex: 1000 + index + 1,
          },
        });
      }

      const groupedByVariant = new Map<string, string[]>();

      for (const id of orderedIds) {
        const node = byId.get(id);

        if (!node) {
          throw new BadRequestException(`Exercise ${id} not found.`);
        }

        const bucket = groupedByVariant.get(node.variantId) ?? [];
        bucket.push(id);
        groupedByVariant.set(node.variantId, bucket);
      }

      for (const ids of groupedByVariant.values()) {
        for (let index = 0; index < ids.length; index += 1) {
          await tx.examNode.update({
            where: {
              id: ids[index],
            },
            data: {
              orderIndex: index + 1,
            },
          });
        }
      }

      for (let index = 0; index < orderedIds.length; index += 1) {
        const id = orderedIds[index];
        const current = byId.get(id);

        if (!current) {
          continue;
        }

        const metadata = this.parseExerciseMetadata(current.metadata);

        await tx.examNode.update({
          where: {
            id,
          },
          data: {
            metadata: this.toJsonValue(
              this.toExerciseMetadata({
                ...metadata,
                adminOrder: index + 1,
              }),
            ),
          },
        });
      }
    });

    return this.getExamExercises(examId);
  }
}
