import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BlockRole,
  BlockType as PrismaBlockType,
  ExamNodeType,
  ExamVariantCode,
  Prisma,
  PublicationStatus,
  SessionType,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { basename, extname, join } from 'path';
import { PrismaService } from '../prisma/prisma.service';

const ADMIN_IMAGE_UPLOAD_DIR = join(process.cwd(), 'uploads', 'admin-images');
const MAX_IMAGE_SIZE_BYTES = 6 * 1024 * 1024;
const DEFAULT_EXAM_DURATION_MINUTES = 210;
const DEFAULT_EXAM_TOTAL_POINTS = 40;

type AdminStatus = 'draft' | 'published';
type AdminSessionType = 'normal' | 'rattrapage';
type BlockType = 'paragraph' | 'latex' | 'image' | 'code' | 'heading';

type ContentBlock = {
  id: string;
  type: BlockType;
  value: string;
  meta?: {
    level?: number;
    caption?: string;
    language?: string;
  };
};

type ExerciseHierarchyMeta = {
  year?: number;
  session?: string;
  subject?: string;
  branch?: string;
  points?: number;
  contextBlocks?: ContentBlock[];
};

type ExerciseMetadata = {
  theme?: string;
  difficulty?: string;
  tags?: string[];
  adminOrder?: number;
  hierarchyMeta?: ExerciseHierarchyMeta;
};

type QuestionMetadata = {
  title?: string;
  adminOrder?: number;
  contentBlocks?: ContentBlock[];
  solutionBlocks?: ContentBlock[];
  hintBlocks?: ContentBlock[] | null;
};

type QuestionNode = {
  id: string;
  orderIndex: number;
  parentId: string | null;
};

type ExamNodeBlockRow = {
  id: string;
  role: BlockRole;
  orderIndex: number;
  blockType: PrismaBlockType;
  textValue: string | null;
  data: Prisma.JsonValue | null;
  media: {
    url: string;
    metadata: Prisma.JsonValue | null;
  } | null;
};

type ExamNodeRow = {
  id: string;
  variantId: string;
  parentId: string | null;
  nodeType: ExamNodeType;
  orderIndex: number;
  label: string | null;
  title: string | null;
  maxPoints: Prisma.Decimal | null;
  status: PublicationStatus;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
  blocks: ExamNodeBlockRow[];
};

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  getMe() {
    return {
      role: 'ADMIN',
    };
  }

  async getDashboard() {
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

  async getFilters() {
    const [subjects, streams, years] = await Promise.all([
      this.prisma.subject.findMany({
        select: {
          code: true,
          name: true,
        },
        orderBy: {
          name: 'asc',
        },
      }),
      this.prisma.stream.findMany({
        select: {
          code: true,
          name: true,
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
    ]);

    return {
      subjects,
      streams,
      years: years.map((entry) => entry.year),
    };
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
      data: exams.map((exam) => this.mapExam(exam)),
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
    const officialSourceReference = this.readOptionalString(payload.original_pdf_url);

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
      throw new BadRequestException('An exam already exists for this year/stream/subject/session.');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const exam = await tx.exam.create({
        data: {
          year,
          streamId: stream.id,
          subjectId: subject.id,
          sessionType,
          durationMinutes: DEFAULT_EXAM_DURATION_MINUTES,
          totalPoints: DEFAULT_EXAM_TOTAL_POINTS,
          officialSourceReference,
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

      await tx.examVariant.createMany({
        data: [
          {
            examId: exam.id,
            code: ExamVariantCode.SUJET_1,
            title: 'الموضوع الأول',
            status,
          },
          {
            examId: exam.id,
            code: ExamVariantCode.SUJET_2,
            title: 'الموضوع الثاني',
            status,
          },
        ],
      });

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
      select: {
        id: true,
      },
    });

    if (!exam) {
      throw new NotFoundException(`Exam ${examId} not found.`);
    }

    const data: Prisma.ExamUpdateInput = {};

    if (payload.year !== undefined) {
      data.year = this.readInteger(payload.year, 'year');
    }

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

      data.stream = {
        connect: {
          id: stream.id,
        },
      };
    }

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
        throw new BadRequestException('subject must map to an existing subject.');
      }

      data.subject = {
        connect: {
          id: subject.id,
        },
      };
    }

    if (payload.session !== undefined) {
      data.sessionType = this.toSessionType(payload.session);
    }

    if (payload.original_pdf_url !== undefined) {
      data.officialSourceReference = this.readOptionalString(payload.original_pdf_url);
    }

    let nextVariantStatus: PublicationStatus | null = null;

    if (payload.status !== undefined) {
      const status = this.toPublicationStatus(payload.status);
      nextVariantStatus = status;
      data.isPublished = status === PublicationStatus.PUBLISHED;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.exam.update({
        where: {
          id: examId,
        },
        data,
      });

      if (nextVariantStatus) {
        await tx.examVariant.updateMany({
          where: {
            examId,
          },
          data: {
            status: nextVariantStatus,
          },
        });
      }
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
      },
    });

    if (!exam) {
      throw new NotFoundException(`Exam ${examId} not found.`);
    }

    await this.prisma.exam.delete({
      where: {
        id: examId,
      },
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
      (node) => node.nodeType === ExamNodeType.EXERCISE && node.parentId === null,
    );

    const orderedExercises = this.sortExercisesForAdmin(exerciseNodes);

    return {
      exam: this.mapExam(exam),
      exercises: orderedExercises.map((exercise, index) => {
        const descendantIds = this.collectDescendantIds(exercise.id, childrenByParent);
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
      exam.id,
      exam.variants,
      variantCode,
      this.toPublicationStatus(payload.status),
    );

    const existingExerciseNodes = exam.variants.flatMap((variant) =>
      variant.nodes.filter(
        (node) => node.nodeType === ExamNodeType.EXERCISE && node.parentId === null,
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

    const metadata = this.toExerciseMetadata({
      theme: this.readOptionalString(payload.theme) ?? undefined,
      difficulty: this.readOptionalString(payload.difficulty) ?? undefined,
      tags: this.readOptionalStringArray(payload.tags),
      adminOrder: maxAdminOrder + 1,
    });

    const created = await this.prisma.examNode.create({
      data: {
        variantId: targetVariant.id,
        parentId: null,
        nodeType: ExamNodeType.EXERCISE,
        orderIndex: maxVariantOrder + 1,
        label: `Exercise ${maxVariantOrder + 1}`,
        title: title ?? `Exercise ${maxVariantOrder + 1}`,
        maxPoints: null,
        status,
        metadata: this.toJsonValue(metadata),
      },
      select: {
        id: true,
      },
    });

    const refreshed = await this.getExamExercises(examId);
    const mapped = refreshed.exercises.find((exercise) => exercise.id === created.id);

    if (!mapped) {
      throw new NotFoundException(`Exercise ${created.id} not found after creation.`);
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
            examId: true,
          },
        },
      },
    });

    if (!exercise || exercise.nodeType !== ExamNodeType.EXERCISE) {
      throw new NotFoundException(`Exercise ${exerciseId} not found.`);
    }

    const data: Prisma.ExamNodeUpdateInput = {};
    const existingMetadata = this.parseExerciseMetadata(exercise.metadata);

    if (payload.title !== undefined) {
      data.title = this.readOptionalString(payload.title);
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
              difficulty: this.readOptionalString(payload.difficulty) ?? undefined,
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

    await this.prisma.examNode.update({
      where: {
        id: exerciseId,
      },
      data,
    });

    const refreshed = await this.getExamExercises(exercise.variant.examId);
    const mapped = refreshed.exercises.find((entry) => entry.id === exerciseId);

    if (!mapped) {
      throw new NotFoundException(`Exercise ${exerciseId} not found after update.`);
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
            examId: true,
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

    await this.rebalanceExerciseAdminOrder(exercise.variant.examId);

    return {
      success: true,
    };
  }

  async reorderExercises(examId: string, payload: Record<string, unknown>) {
    const orderedIds = this.readRequiredStringArray(payload.ordered_ids, 'ordered_ids');

    const exam = await this.getExamByIdForAdmin(examId);

    const exerciseNodes = exam.variants.flatMap((variant) =>
      variant.nodes
        .filter((node) => node.nodeType === ExamNodeType.EXERCISE && node.parentId === null)
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

  async getExerciseEditor(exerciseId: string) {
    const context = await this.loadExerciseContext(exerciseId);

    const exerciseMetadata = this.parseExerciseMetadata(context.exercise.metadata);
    const orderedQuestions = this.orderQuestionsForAdmin(
      context.exercise.id,
      context.variantNodes,
    );

    const questionIdSet = new Set(orderedQuestions.map((entry) => entry.id));

    const questions = orderedQuestions.map((question, index) => {
      const parsedMetadata = this.parseQuestionMetadata(question.metadata, question);

      return {
        id: question.id,
        title:
          parsedMetadata.title ??
          question.title ??
          question.label ??
          `Question ${index + 1}`,
        parent_id: question.parentId && questionIdSet.has(question.parentId)
          ? question.parentId
          : null,
        order_index: index + 1,
        status: this.fromPublicationStatus(question.status),
        points: question.maxPoints !== null ? Number(question.maxPoints) : null,
        content_blocks:
          parsedMetadata.contentBlocks && parsedMetadata.contentBlocks.length
            ? parsedMetadata.contentBlocks
            : this.mapNodeBlocksToContentBlocks(
                question.blocks.filter((block) =>
                  block.role === BlockRole.PROMPT || block.role === BlockRole.STEM,
                ),
              ),
        solution_blocks:
          parsedMetadata.solutionBlocks && parsedMetadata.solutionBlocks.length
            ? parsedMetadata.solutionBlocks
            : this.mapNodeBlocksToContentBlocks(
                question.blocks.filter((block) => block.role === BlockRole.SOLUTION),
              ),
        hint_blocks:
          parsedMetadata.hintBlocks !== undefined
            ? parsedMetadata.hintBlocks
            : this.mapNodeBlocksToContentBlocks(
                question.blocks.filter((block) =>
                  block.role === BlockRole.HINT || block.role === BlockRole.RUBRIC,
                ),
              ),
        created_at: question.createdAt,
        updated_at: question.updatedAt,
      };
    });

    const validationErrors = this.validateHierarchy(
      questions.map((question) => ({
        id: question.id,
        orderIndex: question.order_index,
        parentId: question.parent_id,
      })),
    );

    const contextBlocks =
      exerciseMetadata.hierarchyMeta?.contextBlocks &&
      exerciseMetadata.hierarchyMeta.contextBlocks.length
        ? exerciseMetadata.hierarchyMeta.contextBlocks
        : this.mapNodeBlocksToContentBlocks(
            context.exercise.blocks.filter(
              (block) =>
                block.role === BlockRole.STEM || block.role === BlockRole.PROMPT,
            ),
          );

    return {
      exercise: {
        id: context.exercise.id,
        title: context.exercise.title,
        order_index: context.exercise.orderIndex,
        status: this.fromPublicationStatus(context.exercise.status),
        theme: exerciseMetadata.theme ?? null,
        difficulty: exerciseMetadata.difficulty ?? null,
        tags: exerciseMetadata.tags ?? [],
        metadata: {
          year: exerciseMetadata.hierarchyMeta?.year ?? context.exam.year,
          session:
            (exerciseMetadata.hierarchyMeta?.session as AdminSessionType | undefined) ??
            this.fromSessionType(context.exam.sessionType),
          subject: exerciseMetadata.hierarchyMeta?.subject ?? context.exam.subject.code,
          branch: exerciseMetadata.hierarchyMeta?.branch ?? context.exam.stream.code,
          points:
            exerciseMetadata.hierarchyMeta?.points ??
            (context.exercise.maxPoints !== null
              ? Number(context.exercise.maxPoints)
              : null),
          context_blocks: contextBlocks,
        },
        exam: this.mapExam(context.exam),
      },
      questions,
      validation_errors: validationErrors,
    };
  }

  async updateExerciseMetadata(exerciseId: string, payload: Record<string, unknown>) {
    const exercise = await this.prisma.examNode.findUnique({
      where: {
        id: exerciseId,
      },
      select: {
        id: true,
        metadata: true,
      },
    });

    if (!exercise) {
      throw new NotFoundException(`Exercise ${exerciseId} not found.`);
    }

    const existingMetadata = this.parseExerciseMetadata(exercise.metadata);

    const hierarchyMeta = {
      ...(existingMetadata.hierarchyMeta ?? {}),
      ...(payload.year !== undefined
        ? {
            year: this.readInteger(payload.year, 'year'),
          }
        : {}),
      ...(payload.session !== undefined
        ? {
            session: this.readString(payload.session, 'session').toLowerCase(),
          }
        : {}),
      ...(payload.subject !== undefined
        ? {
            subject: this.readString(payload.subject, 'subject'),
          }
        : {}),
      ...(payload.branch !== undefined
        ? {
            branch: this.readString(payload.branch, 'branch'),
          }
        : {}),
      ...(payload.points !== undefined
        ? {
            points: this.readDecimal(payload.points, 'points'),
          }
        : {}),
      ...(payload.context_blocks !== undefined
        ? {
            contextBlocks: this.normalizeBlocks(payload.context_blocks),
          }
        : {}),
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.examNode.update({
        where: {
          id: exerciseId,
        },
        data: {
          ...(payload.points !== undefined
            ? {
                maxPoints: this.readDecimal(payload.points, 'points'),
              }
            : {}),
          metadata: this.toJsonValue(
            this.toExerciseMetadata({
              ...existingMetadata,
              hierarchyMeta,
            }),
          ),
        },
      });

      if (payload.context_blocks !== undefined) {
        const contextBlocks = this.normalizeBlocks(payload.context_blocks);

        await this.replaceNodeBlocks(tx, exerciseId, {
          contentBlocks: contextBlocks,
          solutionBlocks: [],
          hintBlocks: null,
          contentRole: BlockRole.STEM,
        });
      }
    });

    return {
      success: true,
      metadata: this.toExerciseMetadata({
        ...existingMetadata,
        hierarchyMeta,
      }),
    };
  }

  async createQuestion(exerciseId: string, payload: Record<string, unknown>) {
    const context = await this.loadExerciseContext(exerciseId);

    const orderedQuestions = this.orderQuestionsForAdmin(
      context.exercise.id,
      context.variantNodes,
    );

    const parentId = this.readOptionalString(payload.parent_id);

    if (parentId) {
      const parentExists = orderedQuestions.some((question) => question.id === parentId);
      if (!parentExists) {
        throw new BadRequestException('parent_id must reference a question in this exercise.');
      }
    }

    const existingNodes = orderedQuestions.map((question, index) => ({
      id: question.id,
      orderIndex: index + 1,
      parentId:
        question.parentId && orderedQuestions.some((entry) => entry.id === question.parentId)
          ? question.parentId
          : null,
    }));

    const syntheticNode: QuestionNode = {
      id: randomUUID(),
      orderIndex: existingNodes.length + 1,
      parentId,
    };

    const validationErrors = this.validateHierarchy([...existingNodes, syntheticNode]);
    this.throwIfValidationFails(validationErrors);

    const title = this.readOptionalString(payload.title) ?? `Question ${existingNodes.length + 1}`;
    const points =
      payload.points !== undefined ? this.readDecimal(payload.points, 'points') : 0;
    const contentBlocks =
      payload.content_blocks !== undefined
        ? this.normalizeBlocks(payload.content_blocks)
        : this.defaultBlocks(title);
    const solutionBlocks =
      payload.solution_blocks !== undefined
        ? this.normalizeBlocks(payload.solution_blocks)
        : [];
    const hintBlocks =
      payload.hint_blocks !== undefined
        ? this.normalizeNullableBlocks(payload.hint_blocks)
        : null;

    const status = this.toPublicationStatus(payload.status);

    const parentNodeId = parentId ?? context.exercise.id;

    const siblingOrder = this.nextSiblingOrder(
      context.variantNodes,
      parentNodeId,
      null,
    );

    await this.prisma.$transaction(async (tx) => {
      const created = await tx.examNode.create({
        data: {
          variantId: context.exercise.variantId,
          parentId: parentNodeId,
          nodeType: parentId ? ExamNodeType.SUBQUESTION : ExamNodeType.QUESTION,
          orderIndex: siblingOrder,
          label: null,
          title,
          maxPoints: points,
          status,
          metadata: this.toJsonValue(
            this.toQuestionMetadata({
              title,
              adminOrder: existingNodes.length + 1,
              contentBlocks,
              solutionBlocks,
              hintBlocks,
            }),
          ),
        },
        select: {
          id: true,
        },
      });

      await this.replaceNodeBlocks(tx, created.id, {
        contentBlocks,
        solutionBlocks,
        hintBlocks: hintBlocks ?? null,
      });
    });

    return this.getExerciseEditor(exerciseId);
  }

  async updateQuestion(questionId: string, payload: Record<string, unknown>) {
    const question = await this.prisma.examNode.findUnique({
      where: {
        id: questionId,
      },
      include: {
        blocks: {
          include: {
            media: {
              select: {
                url: true,
                metadata: true,
              },
            },
          },
          orderBy: [
            {
              role: 'asc',
            },
            {
              orderIndex: 'asc',
            },
          ],
        },
      },
    });

    if (
      !question ||
      (question.nodeType !== ExamNodeType.QUESTION &&
        question.nodeType !== ExamNodeType.SUBQUESTION)
    ) {
      throw new NotFoundException(`Question ${questionId} not found.`);
    }

    const context = await this.loadExerciseContextByQuestionNode(question.id);
    const orderedQuestions = this.orderQuestionsForAdmin(
      context.exercise.id,
      context.variantNodes,
    );

    const existingMetadata = this.parseQuestionMetadata(question.metadata, {
      orderIndex: question.orderIndex,
      title: question.title,
      metadata: question.metadata,
    });

    const nextParentId =
      payload.parent_id !== undefined
        ? this.readOptionalString(payload.parent_id)
        : orderedQuestions.some((entry) => entry.id === question.parentId)
          ? question.parentId
          : null;

    if (nextParentId) {
      const parentExists = orderedQuestions.some((entry) => entry.id === nextParentId);

      if (!parentExists) {
        throw new BadRequestException('parent_id must reference a question in the same exercise.');
      }
    }

    const nodes = orderedQuestions.map((entry, index) => {
      const parentId =
        entry.id === question.id
          ? nextParentId
          : entry.parentId && orderedQuestions.some((value) => value.id === entry.parentId)
            ? entry.parentId
            : null;

      return {
        id: entry.id,
        orderIndex: index + 1,
        parentId,
      };
    });

    const validationErrors = this.validateHierarchy(nodes);
    this.throwIfValidationFails(validationErrors);

    const title =
      payload.title !== undefined
        ? this.readOptionalString(payload.title) ?? `Question ${question.orderIndex}`
        : existingMetadata.title ?? question.title ?? `Question ${question.orderIndex}`;

    const contentBlocks =
      payload.content_blocks !== undefined
        ? this.normalizeBlocks(payload.content_blocks)
        : existingMetadata.contentBlocks ??
          this.mapNodeBlocksToContentBlocks(
            this.mapLoadedBlocks(question.blocks).filter(
              (block) => block.role === BlockRole.PROMPT || block.role === BlockRole.STEM,
            ),
          );

    const solutionBlocks =
      payload.solution_blocks !== undefined
        ? this.normalizeBlocks(payload.solution_blocks)
        : existingMetadata.solutionBlocks ??
          this.mapNodeBlocksToContentBlocks(
            this.mapLoadedBlocks(question.blocks).filter(
              (block) => block.role === BlockRole.SOLUTION,
            ),
          );

    const hintBlocks =
      payload.hint_blocks !== undefined
        ? this.normalizeNullableBlocks(payload.hint_blocks)
        : existingMetadata.hintBlocks ??
          this.mapNodeBlocksToContentBlocks(
            this.mapLoadedBlocks(question.blocks).filter(
              (block) =>
                block.role === BlockRole.HINT || block.role === BlockRole.RUBRIC,
            ),
          );

    const currentOrder =
      existingMetadata.adminOrder ??
      (orderedQuestions.findIndex((entry) => entry.id === question.id) + 1);

    const nextParentNodeId = nextParentId ?? context.exercise.id;
    const parentChanged = nextParentNodeId !== question.parentId;
    const nextOrderIndex = parentChanged
      ? this.nextSiblingOrder(context.variantNodes, nextParentNodeId, questionId)
      : question.orderIndex;

    await this.prisma.$transaction(async (tx) => {
      await tx.examNode.update({
        where: {
          id: questionId,
        },
        data: {
          parentId: nextParentNodeId,
          nodeType: nextParentId ? ExamNodeType.SUBQUESTION : ExamNodeType.QUESTION,
          ...(payload.points !== undefined
            ? {
                maxPoints: this.readDecimal(payload.points, 'points'),
              }
            : {}),
          ...(payload.status !== undefined
            ? {
                status: this.toPublicationStatus(payload.status),
              }
            : {}),
          title,
          metadata: this.toJsonValue(
            this.toQuestionMetadata({
              ...existingMetadata,
              title,
              adminOrder: currentOrder,
              contentBlocks,
              solutionBlocks,
              hintBlocks,
            }),
          ),
          orderIndex: nextOrderIndex,
        },
      });

      await this.replaceNodeBlocks(tx, questionId, {
        contentBlocks,
        solutionBlocks,
        hintBlocks: hintBlocks ?? null,
      });

      if (parentChanged) {
        if (question.parentId) {
          await this.resequenceChildren(tx, question.parentId);
        }

        await this.resequenceChildren(tx, nextParentNodeId);
      }
    });

    return this.getExerciseEditor(context.exercise.id);
  }

  async deleteQuestion(questionId: string) {
    const question = await this.prisma.examNode.findUnique({
      where: {
        id: questionId,
      },
      select: {
        id: true,
        parentId: true,
        nodeType: true,
      },
    });

    if (
      !question ||
      (question.nodeType !== ExamNodeType.QUESTION &&
        question.nodeType !== ExamNodeType.SUBQUESTION)
    ) {
      throw new NotFoundException(`Question ${questionId} not found.`);
    }

    const context = await this.loadExerciseContextByQuestionNode(questionId);

    await this.prisma.$transaction(async (tx) => {
      await tx.examNode.delete({
        where: {
          id: questionId,
        },
      });

      if (question.parentId) {
        await this.resequenceChildren(tx, question.parentId);
      }
    });

    await this.rebalanceQuestionAdminOrder(context.exercise.id);

    return this.getExerciseEditor(context.exercise.id);
  }

  async reorderQuestions(exerciseId: string, payload: Record<string, unknown>) {
    const itemsRaw = payload.items;

    if (!Array.isArray(itemsRaw) || !itemsRaw.length) {
      throw new BadRequestException('items must be a non-empty array.');
    }

    const context = await this.loadExerciseContext(exerciseId);
    const orderedQuestions = this.orderQuestionsForAdmin(
      context.exercise.id,
      context.variantNodes,
    );

    const nextItems = itemsRaw.map((entry, index) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        throw new BadRequestException('Each items entry must be an object.');
      }

      const objectEntry = entry as Record<string, unknown>;
      const id = this.readString(objectEntry.id, 'items.id');
      const parentId = this.readOptionalString(objectEntry.parent_id);

      return {
        id,
        parentId,
        orderIndex: index + 1,
      };
    });

    this.validateExactIdSet(
      orderedQuestions.map((question) => question.id),
      nextItems.map((item) => item.id),
      'question',
    );

    const idSet = new Set(nextItems.map((item) => item.id));

    for (const item of nextItems) {
      if (item.parentId && !idSet.has(item.parentId)) {
        throw new BadRequestException(
          `Question ${item.id} references unknown parent ${item.parentId}.`,
        );
      }
    }

    const validationErrors = this.validateHierarchy(nextItems);
    this.throwIfValidationFails(validationErrors);

    const existingMetadataById = new Map(
      orderedQuestions.map((question) => [
        question.id,
        this.parseQuestionMetadata(question.metadata, question),
      ]),
    );

    await this.prisma.$transaction(async (tx) => {
      // Phase 1: detach to root and move order indexes out of range to avoid
      // unique collisions on (variant_id, parent_id, order_index).
      for (let index = 0; index < nextItems.length; index += 1) {
        await tx.examNode.update({
          where: {
            id: nextItems[index].id,
          },
          data: {
            parentId: exerciseId,
            nodeType: ExamNodeType.QUESTION,
            orderIndex: 1000 + index + 1,
          },
        });
      }

      const siblingCounter = new Map<string, number>();

      for (const item of nextItems) {
        const parentNodeId = item.parentId ?? exerciseId;
        const siblingIndex = (siblingCounter.get(parentNodeId) ?? 0) + 1;
        siblingCounter.set(parentNodeId, siblingIndex);

        const existingMetadata = existingMetadataById.get(item.id) ?? {};

        await tx.examNode.update({
          where: {
            id: item.id,
          },
          data: {
            parentId: parentNodeId,
            nodeType: item.parentId ? ExamNodeType.SUBQUESTION : ExamNodeType.QUESTION,
            orderIndex: siblingIndex,
            metadata: this.toJsonValue(
              this.toQuestionMetadata({
                ...existingMetadata,
                adminOrder: item.orderIndex,
              }),
            ),
          },
        });
      }
    });

    return this.getExerciseEditor(exerciseId);
  }

  uploadImage(payload: Record<string, unknown>) {
    const fileName = this.readString(payload.file_name, 'file_name');
    const contentBase64 = this.readString(payload.content_base64, 'content_base64');
    const { mimeType, data } = this.parseBase64Image(contentBase64);

    if (data.length > MAX_IMAGE_SIZE_BYTES) {
      throw new BadRequestException('Image size exceeds 6MB limit.');
    }

    const extension = this.resolveFileExtension(fileName, mimeType);
    const storedFileName = `${Date.now()}-${randomUUID()}${extension}`;

    mkdirSync(ADMIN_IMAGE_UPLOAD_DIR, {
      recursive: true,
    });

    writeFileSync(join(ADMIN_IMAGE_UPLOAD_DIR, storedFileName), data);

    const apiBase = this.getApiBaseUrl();

    return {
      file_name: storedFileName,
      url: `${apiBase}/api/v1/admin/uploads/images/${storedFileName}`,
    };
  }

  getImage(fileName: string) {
    const safeName = basename(fileName);
    const filePath = join(ADMIN_IMAGE_UPLOAD_DIR, safeName);

    if (!existsSync(filePath)) {
      throw new NotFoundException(`Image ${fileName} not found.`);
    }

    return {
      filePath,
      mimeType: this.mimeTypeFromExtension(extname(filePath).toLowerCase()),
      data: readFileSync(filePath),
    };
  }

  private async getExamByIdForAdmin(examId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: {
        id: examId,
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
        variants: {
          orderBy: {
            code: 'asc',
          },
          select: {
            id: true,
            code: true,
            title: true,
            status: true,
            nodes: {
              select: {
                id: true,
                variantId: true,
                parentId: true,
                nodeType: true,
                orderIndex: true,
                label: true,
                title: true,
                maxPoints: true,
                status: true,
                metadata: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException(`Exam ${examId} not found.`);
    }

    return exam;
  }

  private mapExam(
    exam:
      | Awaited<ReturnType<AdminService['getExamByIdForAdmin']>>
      | {
          id: string;
          year: number;
          sessionType: SessionType;
          isPublished: boolean;
          officialSourceReference: string | null;
          createdAt: Date;
          updatedAt: Date;
          stream: {
            code: string;
          };
          subject: {
            code: string;
          };
          variants: Array<{
            nodes: Array<{
              nodeType: ExamNodeType;
              parentId: string | null;
            }>;
          }>;
        },
  ) {
    const allNodes = exam.variants.flatMap((variant) => variant.nodes);

    const exerciseCount = allNodes.filter(
      (node) => node.nodeType === ExamNodeType.EXERCISE && node.parentId === null,
    ).length;

    const questionCount = allNodes.filter(
      (node) =>
        node.nodeType === ExamNodeType.QUESTION ||
        node.nodeType === ExamNodeType.SUBQUESTION,
    ).length;

    return {
      id: exam.id,
      year: exam.year,
      subject: exam.subject.code,
      stream: exam.stream.code,
      session: this.fromSessionType(exam.sessionType),
      original_pdf_url: exam.officialSourceReference,
      status: exam.isPublished ? 'published' : 'draft',
      exercise_count: exerciseCount,
      question_count: questionCount,
      created_at: exam.createdAt,
      updated_at: exam.updatedAt,
    };
  }

  private mapExerciseNode(
    node: {
      id: string;
      title: string | null;
      status: PublicationStatus;
      metadata: Prisma.JsonValue | null;
      createdAt: Date;
      updatedAt: Date;
    },
    questionCount: number,
    orderIndex: number,
  ) {
    const metadata = this.parseExerciseMetadata(node.metadata);

    return {
      id: node.id,
      title: node.title,
      order_index: orderIndex,
      theme: metadata.theme ?? null,
      difficulty: metadata.difficulty ?? null,
      tags: metadata.tags ?? [],
      status: this.fromPublicationStatus(node.status),
      question_count: questionCount,
      created_at: node.createdAt,
      updated_at: node.updatedAt,
    };
  }

  private async loadExerciseContext(exerciseId: string) {
    const exercise = await this.prisma.examNode.findUnique({
      where: {
        id: exerciseId,
      },
      select: {
        id: true,
        variantId: true,
        parentId: true,
        nodeType: true,
        orderIndex: true,
        label: true,
        title: true,
        maxPoints: true,
        status: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        blocks: {
          include: {
            media: {
              select: {
                url: true,
                metadata: true,
              },
            },
          },
          orderBy: [
            {
              role: 'asc',
            },
            {
              orderIndex: 'asc',
            },
          ],
        },
        variant: {
          select: {
            id: true,
            code: true,
            exam: {
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
                variants: {
                  orderBy: {
                    code: 'asc',
                  },
                  select: {
                    id: true,
                    code: true,
                    title: true,
                    status: true,
                    nodes: {
                      select: {
                        id: true,
                        variantId: true,
                        parentId: true,
                        nodeType: true,
                        orderIndex: true,
                        label: true,
                        title: true,
                        maxPoints: true,
                        status: true,
                        metadata: true,
                        createdAt: true,
                        updatedAt: true,
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

    const variantNodes = await this.prisma.examNode.findMany({
      where: {
        variantId: exercise.variantId,
      },
      select: {
        id: true,
        variantId: true,
        parentId: true,
        nodeType: true,
        orderIndex: true,
        label: true,
        title: true,
        maxPoints: true,
        status: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        blocks: {
          include: {
            media: {
              select: {
                url: true,
                metadata: true,
              },
            },
          },
          orderBy: [
            {
              role: 'asc',
            },
            {
              orderIndex: 'asc',
            },
          ],
        },
      },
    });

    const childrenByParent = this.buildChildrenByParent(variantNodes);
    const descendantIds = this.collectDescendantIds(exerciseId, childrenByParent);

    const questionNodes = variantNodes.filter(
      (node) =>
        descendantIds.has(node.id) &&
        (node.nodeType === ExamNodeType.QUESTION ||
          node.nodeType === ExamNodeType.SUBQUESTION),
    );

    return {
      exercise: this.mapNodeWithBlocks(exercise),
      variantNodes: variantNodes.map((node) => this.mapNodeWithBlocks(node)),
      questionNodes: questionNodes.map((node) => this.mapNodeWithBlocks(node)),
      exam: exercise.variant.exam,
    };
  }

  private async loadExerciseContextByQuestionNode(questionId: string) {
    const baseNode = await this.prisma.examNode.findUnique({
      where: {
        id: questionId,
      },
      select: {
        id: true,
        variantId: true,
      },
    });

    if (!baseNode) {
      throw new NotFoundException(`Question ${questionId} not found.`);
    }

    const nodes = await this.prisma.examNode.findMany({
      where: {
        variantId: baseNode.variantId,
      },
      select: {
        id: true,
        variantId: true,
        parentId: true,
        nodeType: true,
        orderIndex: true,
        label: true,
        title: true,
        maxPoints: true,
        status: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        blocks: {
          include: {
            media: {
              select: {
                url: true,
                metadata: true,
              },
            },
          },
          orderBy: [
            {
              role: 'asc',
            },
            {
              orderIndex: 'asc',
            },
          ],
        },
      },
    });

    const byId = new Map(nodes.map((node) => [node.id, node]));

    let current = byId.get(questionId) ?? null;

    while (current && current.nodeType !== ExamNodeType.EXERCISE) {
      current = current.parentId ? byId.get(current.parentId) ?? null : null;
    }

    if (!current || current.nodeType !== ExamNodeType.EXERCISE) {
      throw new BadRequestException('Question does not belong to a valid exercise subtree.');
    }

    return this.loadExerciseContext(current.id);
  }

  private orderQuestionsForAdmin(exerciseId: string, nodes: ExamNodeRow[]) {
    const childrenByParent = this.buildChildrenByParent(nodes);

    const fallbackOrder = new Map<string, number>();
    let sequence = 1;

    const walk = (parentId: string) => {
      const children = (childrenByParent.get(parentId) ?? []).sort(
        (left, right) => left.orderIndex - right.orderIndex,
      );

      for (const child of children) {
        if (
          child.nodeType === ExamNodeType.QUESTION ||
          child.nodeType === ExamNodeType.SUBQUESTION
        ) {
          fallbackOrder.set(child.id, sequence);
          sequence += 1;
        }

        walk(child.id);
      }
    };

    walk(exerciseId);

    const descendantIds = this.collectDescendantIds(exerciseId, childrenByParent);

    const questionNodes = nodes.filter(
      (node) =>
        descendantIds.has(node.id) &&
        (node.nodeType === ExamNodeType.QUESTION ||
          node.nodeType === ExamNodeType.SUBQUESTION),
    );

    return questionNodes.sort((left, right) => {
      const leftMetadata = this.parseQuestionMetadata(left.metadata, left);
      const rightMetadata = this.parseQuestionMetadata(right.metadata, right);

      const leftOrder = leftMetadata.adminOrder ?? fallbackOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = rightMetadata.adminOrder ?? fallbackOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      const leftFallback = fallbackOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER;
      const rightFallback = fallbackOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER;

      if (leftFallback !== rightFallback) {
        return leftFallback - rightFallback;
      }

      return left.id.localeCompare(right.id);
    });
  }

  private sortExercisesForAdmin<
    T extends {
      id: string;
      metadata: Prisma.JsonValue | null;
      orderIndex: number;
      variantCode?: ExamVariantCode;
    },
  >(nodes: T[]) {
    return [...nodes].sort((left, right) => {
      const leftMetadata = this.parseExerciseMetadata(left.metadata);
      const rightMetadata = this.parseExerciseMetadata(right.metadata);

      const leftOrder = leftMetadata.adminOrder ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = rightMetadata.adminOrder ?? Number.MAX_SAFE_INTEGER;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      const variantDelta =
        this.examVariantRank(left.variantCode) - this.examVariantRank(right.variantCode);

      if (variantDelta !== 0) {
        return variantDelta;
      }

      if (left.orderIndex !== right.orderIndex) {
        return left.orderIndex - right.orderIndex;
      }

      return left.id.localeCompare(right.id);
    });
  }

  private buildChildrenByParent<T extends { id: string; parentId: string | null }>(
    nodes: T[],
  ) {
    const map = new Map<string, T[]>();

    for (const node of nodes) {
      const key = node.parentId ?? '__ROOT__';
      const bucket = map.get(key) ?? [];
      bucket.push(node);
      map.set(key, bucket);
    }

    return map;
  }

  private collectDescendantIds<T extends { id: string; parentId: string | null }>(
    rootId: string,
    childrenByParent: Map<string, T[]>,
  ) {
    const visited = new Set<string>();
    const stack = [rootId];

    while (stack.length) {
      const parentId = stack.pop();

      if (!parentId) {
        continue;
      }

      const children = childrenByParent.get(parentId) ?? [];

      for (const child of children) {
        if (visited.has(child.id)) {
          continue;
        }

        visited.add(child.id);
        stack.push(child.id);
      }
    }

    return visited;
  }

  private mapNodeWithBlocks(
    node: {
      id: string;
      variantId: string;
      parentId: string | null;
      nodeType: ExamNodeType;
      orderIndex: number;
      label: string | null;
      title: string | null;
      maxPoints: Prisma.Decimal | null;
      status: PublicationStatus;
      metadata: Prisma.JsonValue | null;
      createdAt: Date;
      updatedAt: Date;
      blocks: Array<{
        id: string;
        role: BlockRole;
        orderIndex: number;
        blockType: PrismaBlockType;
        textValue: string | null;
        data: Prisma.JsonValue | null;
        media: {
          url: string;
          metadata: Prisma.JsonValue | null;
        } | null;
      }>;
    },
  ): ExamNodeRow {
    return {
      id: node.id,
      variantId: node.variantId,
      parentId: node.parentId,
      nodeType: node.nodeType,
      orderIndex: node.orderIndex,
      label: node.label,
      title: node.title,
      maxPoints: node.maxPoints,
      status: node.status,
      metadata: node.metadata,
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
      blocks: this.mapLoadedBlocks(node.blocks),
    };
  }

  private mapLoadedBlocks(
    blocks: Array<{
      id: string;
      role: BlockRole;
      orderIndex: number;
      blockType: PrismaBlockType;
      textValue: string | null;
      data: Prisma.JsonValue | null;
      media: {
        url: string;
        metadata: Prisma.JsonValue | null;
      } | null;
    }>,
  ): ExamNodeBlockRow[] {
    return blocks.map((block) => ({
      id: block.id,
      role: block.role,
      orderIndex: block.orderIndex,
      blockType: block.blockType,
      textValue: block.textValue,
      data: block.data,
      media: block.media,
    }));
  }

  private parseExerciseMetadata(raw: Prisma.JsonValue | null): ExerciseMetadata {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return {};
    }

    const value = raw as Record<string, unknown>;
    const hierarchyRaw = value.hierarchyMeta;
    const hierarchy =
      hierarchyRaw && typeof hierarchyRaw === 'object' && !Array.isArray(hierarchyRaw)
        ? (hierarchyRaw as Record<string, unknown>)
        : undefined;

    return this.toExerciseMetadata({
      theme: this.readOptionalString(value.theme) ?? undefined,
      difficulty: this.readOptionalString(value.difficulty) ?? undefined,
      tags: this.readOptionalStringArray(value.tags),
      adminOrder:
        typeof value.adminOrder === 'number' && Number.isInteger(value.adminOrder)
          ? value.adminOrder
          : undefined,
      hierarchyMeta: hierarchy
        ? {
            year:
              typeof hierarchy.year === 'number' && Number.isInteger(hierarchy.year)
                ? hierarchy.year
                : undefined,
            session: this.readOptionalString(hierarchy.session) ?? undefined,
            subject: this.readOptionalString(hierarchy.subject) ?? undefined,
            branch: this.readOptionalString(hierarchy.branch) ?? undefined,
            points:
              typeof hierarchy.points === 'number' && Number.isFinite(hierarchy.points)
                ? hierarchy.points
                : undefined,
            contextBlocks: this.normalizeBlocks(hierarchy.contextBlocks),
          }
        : undefined,
    });
  }

  private parseQuestionMetadata(
    raw: Prisma.JsonValue | null,
    question: Pick<ExamNodeRow, 'orderIndex' | 'title' | 'metadata'>,
  ): QuestionMetadata {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return {
        title: question.title ?? `Question ${question.orderIndex}`,
      };
    }

    const value = raw as Record<string, unknown>;

    return this.toQuestionMetadata({
      title:
        this.readOptionalString(value.title) ?? question.title ?? `Question ${question.orderIndex}`,
      adminOrder:
        typeof value.adminOrder === 'number' && Number.isInteger(value.adminOrder)
          ? value.adminOrder
          : undefined,
      ...(Object.prototype.hasOwnProperty.call(value, 'contentBlocks')
        ? {
            contentBlocks: this.normalizeBlocks(value.contentBlocks),
          }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(value, 'solutionBlocks')
        ? {
            solutionBlocks: this.normalizeBlocks(value.solutionBlocks),
          }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(value, 'hintBlocks')
        ? {
            hintBlocks: this.normalizeNullableBlocks(value.hintBlocks),
          }
        : {}),
    });
  }

  private toExerciseMetadata(input: ExerciseMetadata): ExerciseMetadata {
    return {
      ...(input.theme
        ? {
            theme: input.theme,
          }
        : {}),
      ...(input.difficulty
        ? {
            difficulty: input.difficulty,
          }
        : {}),
      ...(input.tags && input.tags.length
        ? {
            tags: input.tags,
          }
        : {}),
      ...(typeof input.adminOrder === 'number' && Number.isInteger(input.adminOrder)
        ? {
            adminOrder: input.adminOrder,
          }
        : {}),
      ...(input.hierarchyMeta
        ? {
            hierarchyMeta: {
              ...input.hierarchyMeta,
              contextBlocks: this.normalizeBlocks(input.hierarchyMeta.contextBlocks),
            },
          }
        : {}),
    };
  }

  private toQuestionMetadata(input: QuestionMetadata): QuestionMetadata {
    return {
      ...(input.title
        ? {
            title: input.title,
          }
        : {}),
      ...(typeof input.adminOrder === 'number' && Number.isInteger(input.adminOrder)
        ? {
            adminOrder: input.adminOrder,
          }
        : {}),
      ...(input.contentBlocks !== undefined
        ? {
            contentBlocks: this.normalizeBlocks(input.contentBlocks),
          }
        : {}),
      ...(input.solutionBlocks !== undefined
        ? {
            solutionBlocks: this.normalizeBlocks(input.solutionBlocks),
          }
        : {}),
      ...(input.hintBlocks !== undefined
        ? {
            hintBlocks: this.normalizeNullableBlocks(input.hintBlocks),
          }
        : {}),
    };
  }

  private mapNodeBlocksToContentBlocks(blocks: ExamNodeBlockRow[]): ContentBlock[] {
    return [...blocks]
      .sort((left, right) => {
        if (left.role !== right.role) {
          return left.role.localeCompare(right.role);
        }

        return left.orderIndex - right.orderIndex;
      })
      .map((block, index) => {
        const type = this.fromPrismaBlockType(block.blockType);

        if (!type) {
          return null;
        }

        const level = this.readNumberField(block.data, 'level');
        const caption =
          this.readStringField(block.data, 'caption') ??
          this.readStringField(block.media?.metadata ?? null, 'caption');
        const language = this.readStringField(block.data, 'language');

        const value =
          type === 'image'
            ? block.media?.url ?? this.readStringField(block.data, 'url') ?? block.textValue ?? ''
            : block.textValue ?? '';

        return {
          id: block.id || `block-${index + 1}`,
          type,
          value,
          ...(level !== null || caption || language
            ? {
                meta: {
                  ...(level !== null
                    ? {
                        level,
                      }
                    : {}),
                  ...(caption
                    ? {
                        caption,
                      }
                    : {}),
                  ...(language
                    ? {
                        language,
                      }
                    : {}),
                },
              }
            : {}),
        };
      })
      .filter((entry): entry is ContentBlock => Boolean(entry));
  }

  private async replaceNodeBlocks(
    tx: Prisma.TransactionClient,
    nodeId: string,
    input: {
      contentBlocks: ContentBlock[];
      solutionBlocks: ContentBlock[];
      hintBlocks: ContentBlock[] | null;
      contentRole?: BlockRole;
    },
  ) {
    await tx.examNodeBlock.deleteMany({
      where: {
        nodeId,
      },
    });

    const contentRole = input.contentRole ?? BlockRole.PROMPT;

    const createBlocks = async (role: BlockRole, blocks: ContentBlock[]) => {
      for (let index = 0; index < blocks.length; index += 1) {
        const block = blocks[index];
        const blockType = this.toPrismaBlockType(block.type);

        if (!blockType) {
          continue;
        }

        const data: Prisma.InputJsonObject = {
          ...(block.meta?.caption
            ? {
                caption: block.meta.caption,
              }
            : {}),
          ...(block.meta?.level !== undefined
            ? {
                level: block.meta.level,
              }
            : {}),
          ...(block.meta?.language
            ? {
                language: block.meta.language,
              }
            : {}),
          ...(block.type === 'image'
            ? {
                url: block.value,
              }
            : {}),
        };

        await tx.examNodeBlock.create({
          data: {
            nodeId,
            role,
            orderIndex: index + 1,
            blockType,
            textValue: block.type === 'image' ? null : block.value,
            data: Object.keys(data).length ? data : undefined,
          },
        });
      }
    };

    await createBlocks(contentRole, input.contentBlocks);
    await createBlocks(BlockRole.SOLUTION, input.solutionBlocks);

    if (input.hintBlocks && input.hintBlocks.length) {
      await createBlocks(BlockRole.HINT, input.hintBlocks);
    }
  }

  private nextSiblingOrder(
    nodes: ExamNodeRow[],
    parentId: string,
    excludeNodeId: string | null,
  ) {
    const siblings = nodes.filter(
      (node) => node.parentId === parentId && node.id !== excludeNodeId,
    );

    return siblings.reduce((max, node) => Math.max(max, node.orderIndex), 0) + 1;
  }

  private async resequenceChildren(tx: Prisma.TransactionClient, parentId: string) {
    const siblings = await tx.examNode.findMany({
      where: {
        parentId,
      },
      orderBy: {
        orderIndex: 'asc',
      },
      select: {
        id: true,
      },
    });

    for (let index = 0; index < siblings.length; index += 1) {
      await tx.examNode.update({
        where: {
          id: siblings[index].id,
        },
        data: {
          orderIndex: index + 1,
        },
      });
    }
  }

  private async rebalanceQuestionAdminOrder(exerciseId: string) {
    const context = await this.loadExerciseContext(exerciseId);
    const orderedQuestions = this.orderQuestionsForAdmin(exerciseId, context.variantNodes);

    await this.prisma.$transaction(async (tx) => {
      for (let index = 0; index < orderedQuestions.length; index += 1) {
        const node = orderedQuestions[index];
        const metadata = this.parseQuestionMetadata(node.metadata, node);

        await tx.examNode.update({
          where: {
            id: node.id,
          },
          data: {
            metadata: this.toJsonValue(
              this.toQuestionMetadata({
                ...metadata,
                adminOrder: index + 1,
              }),
            ),
          },
        });
      }
    });
  }

  private async rebalanceExerciseAdminOrder(examId: string) {
    const exam = await this.getExamByIdForAdmin(examId);

    const exercises = this.sortExercisesForAdmin(
      exam.variants.flatMap((variant) =>
        variant.nodes
          .filter(
            (node) => node.nodeType === ExamNodeType.EXERCISE && node.parentId === null,
          )
          .map((node) => ({
            ...node,
            variantCode: variant.code,
          })),
      ),
    );

    await this.prisma.$transaction(async (tx) => {
      for (let index = 0; index < exercises.length; index += 1) {
        const exercise = exercises[index];
        const metadata = this.parseExerciseMetadata(exercise.metadata);

        await tx.examNode.update({
          where: {
            id: exercise.id,
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
  }

  private async resolveOrCreateTargetVariant(
    examId: string,
    variants: Array<{
      id: string;
      code: ExamVariantCode;
      status: PublicationStatus;
    }>,
    requestedCode: ExamVariantCode | null,
    status: PublicationStatus,
  ) {
    if (requestedCode) {
      const existing = variants.find((variant) => variant.code === requestedCode);

      if (existing) {
        return existing;
      }

      return this.prisma.examVariant.create({
        data: {
          examId,
          code: requestedCode,
          title: this.defaultVariantTitle(requestedCode),
          status,
        },
        select: {
          id: true,
          code: true,
          status: true,
        },
      });
    }

    if (variants.length) {
      const sujetOne = variants.find((variant) => variant.code === ExamVariantCode.SUJET_1);
      return sujetOne ?? variants[0];
    }

    return this.prisma.examVariant.create({
      data: {
        examId,
        code: ExamVariantCode.SUJET_1,
        title: this.defaultVariantTitle(ExamVariantCode.SUJET_1),
        status,
      },
      select: {
        id: true,
        code: true,
        status: true,
      },
    });
  }

  private validateHierarchy(nodes: QuestionNode[]) {
    const errors: string[] = [];
    const idSet = new Set(nodes.map((node) => node.id));

    for (const node of nodes) {
      if (node.parentId && !idSet.has(node.parentId)) {
        errors.push(`Question ${node.id} references missing parent ${node.parentId}.`);
      }

      if (node.parentId && node.parentId === node.id) {
        errors.push(`Question ${node.id} cannot reference itself as parent.`);
      }

      if (!Number.isInteger(node.orderIndex) || node.orderIndex < 1) {
        errors.push(`Question ${node.id} has invalid order_index.`);
      }
    }

    const orderIndexes = nodes.map((node) => node.orderIndex).sort((a, b) => a - b);

    if (new Set(orderIndexes).size !== orderIndexes.length) {
      errors.push('Duplicate order_index detected in questions list.');
    }

    for (let index = 0; index < orderIndexes.length; index += 1) {
      if (orderIndexes[index] !== index + 1) {
        errors.push('order_index values must be sequential starting at 1.');
        break;
      }
    }

    const nodesById = new Map(nodes.map((node) => [node.id, node]));
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const walk = (nodeId: string) => {
      if (visited.has(nodeId)) {
        return;
      }

      if (visiting.has(nodeId)) {
        errors.push(`Circular hierarchy detected at question ${nodeId}.`);
        return;
      }

      visiting.add(nodeId);
      const node = nodesById.get(nodeId);
      if (node?.parentId) {
        walk(node.parentId);
      }
      visiting.delete(nodeId);
      visited.add(nodeId);
    };

    for (const node of nodes) {
      walk(node.id);
    }

    return Array.from(new Set(errors));
  }

  private throwIfValidationFails(errors: string[]) {
    if (!errors.length) {
      return;
    }

    throw new BadRequestException({
      message: errors,
    });
  }

  private normalizeBlocks(value: unknown): ContentBlock[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((entry, index) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
          return null;
        }

        const raw = entry as Record<string, unknown>;
        const blockType = this.normalizeBlockType(raw.type);
        const blockValue = typeof raw.value === 'string' ? raw.value : '';

        if (!blockType) {
          return null;
        }

        const metaRaw =
          raw.meta && typeof raw.meta === 'object' && !Array.isArray(raw.meta)
            ? (raw.meta as Record<string, unknown>)
            : undefined;

        const meta = metaRaw
          ? {
              ...(typeof metaRaw.level === 'number'
                ? {
                    level: metaRaw.level,
                  }
                : {}),
              ...(typeof metaRaw.caption === 'string'
                ? {
                    caption: metaRaw.caption,
                  }
                : {}),
              ...(typeof metaRaw.language === 'string'
                ? {
                    language: metaRaw.language,
                  }
                : {}),
            }
          : undefined;

        return {
          id: typeof raw.id === 'string' && raw.id ? raw.id : `block-${index + 1}`,
          type: blockType,
          value: blockValue,
          ...(meta && Object.keys(meta).length
            ? {
                meta,
              }
            : {}),
        };
      })
      .filter((entry): entry is ContentBlock => Boolean(entry));
  }

  private normalizeNullableBlocks(
    value: unknown,
  ): ContentBlock[] | null | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    return this.normalizeBlocks(value);
  }

  private defaultBlocks(title: string): ContentBlock[] {
    return [
      {
        id: randomUUID(),
        type: 'heading',
        value: title,
      },
    ];
  }

  private normalizeBlockType(value: unknown): BlockType | null {
    if (
      value !== 'paragraph' &&
      value !== 'latex' &&
      value !== 'image' &&
      value !== 'code' &&
      value !== 'heading'
    ) {
      return null;
    }

    return value;
  }

  private toPrismaBlockType(value: BlockType): PrismaBlockType | null {
    if (value === 'paragraph') {
      return PrismaBlockType.PARAGRAPH;
    }

    if (value === 'latex') {
      return PrismaBlockType.LATEX;
    }

    if (value === 'image') {
      return PrismaBlockType.IMAGE;
    }

    if (value === 'code') {
      return PrismaBlockType.CODE;
    }

    if (value === 'heading') {
      return PrismaBlockType.HEADING;
    }

    return null;
  }

  private fromPrismaBlockType(value: PrismaBlockType): BlockType | null {
    if (value === PrismaBlockType.PARAGRAPH) {
      return 'paragraph';
    }

    if (value === PrismaBlockType.LATEX) {
      return 'latex';
    }

    if (value === PrismaBlockType.IMAGE) {
      return 'image';
    }

    if (value === PrismaBlockType.CODE) {
      return 'code';
    }

    if (value === PrismaBlockType.HEADING) {
      return 'heading';
    }

    return 'paragraph';
  }

  private toPublicationStatus(value: unknown): PublicationStatus {
    if (value === undefined || value === null || value === 'draft') {
      return PublicationStatus.DRAFT;
    }

    if (value === 'published') {
      return PublicationStatus.PUBLISHED;
    }

    throw new BadRequestException('status must be either draft or published.');
  }

  private fromPublicationStatus(status: PublicationStatus): AdminStatus {
    return status === PublicationStatus.PUBLISHED ? 'published' : 'draft';
  }

  private toSessionType(value: unknown): SessionType {
    if (value === 'normal') {
      return SessionType.NORMAL;
    }

    if (value === 'rattrapage') {
      return SessionType.MAKEUP;
    }

    throw new BadRequestException('session must be normal or rattrapage.');
  }

  private fromSessionType(value: SessionType): AdminSessionType {
    return value === SessionType.MAKEUP ? 'rattrapage' : 'normal';
  }

  private readOptionalExamVariantCode(value: unknown): ExamVariantCode | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('variant_code must be a string.');
    }

    const normalized = value.trim().toUpperCase();

    if (normalized === 'SUJET_1' || normalized === '1') {
      return ExamVariantCode.SUJET_1;
    }

    if (normalized === 'SUJET_2' || normalized === '2') {
      return ExamVariantCode.SUJET_2;
    }

    throw new BadRequestException('variant_code must be SUJET_1 or SUJET_2.');
  }

  private defaultVariantTitle(code: ExamVariantCode): string {
    if (code === ExamVariantCode.SUJET_2) {
      return 'الموضوع الثاني';
    }

    return 'الموضوع الأول';
  }

  private examVariantRank(code?: ExamVariantCode) {
    if (code === ExamVariantCode.SUJET_1) {
      return 1;
    }

    if (code === ExamVariantCode.SUJET_2) {
      return 2;
    }

    return 99;
  }

  private async resolveSubjectCode(value: unknown) {
    const raw = this.readString(value, 'subject');

    const byCode = await this.prisma.subject.findUnique({
      where: {
        code: raw.trim().toUpperCase(),
      },
      select: {
        code: true,
      },
    });

    if (byCode) {
      return byCode.code;
    }

    const byName = await this.prisma.subject.findFirst({
      where: {
        name: raw.trim(),
      },
      select: {
        code: true,
      },
    });

    if (byName) {
      return byName.code;
    }

    throw new BadRequestException('subject must map to an existing subject code/name.');
  }

  private async resolveStreamCode(value: unknown) {
    const raw = this.readString(value, 'stream');

    const byCode = await this.prisma.stream.findUnique({
      where: {
        code: raw.trim().toUpperCase(),
      },
      select: {
        code: true,
      },
    });

    if (byCode) {
      return byCode.code;
    }

    const byName = await this.prisma.stream.findFirst({
      where: {
        name: raw.trim(),
      },
      select: {
        code: true,
      },
    });

    if (byName) {
      return byName.code;
    }

    throw new BadRequestException('stream must map to an existing stream code/name.');
  }

  private validateExactIdSet(
    expected: string[],
    provided: string[],
    label: 'exercise' | 'question',
  ) {
    const expectedSet = new Set(expected);
    const providedSet = new Set(provided);

    if (expectedSet.size !== providedSet.size || expectedSet.size !== expected.length) {
      throw new BadRequestException(
        `Invalid ${label} set size. Duplicate IDs are not allowed.`,
      );
    }

    if (expectedSet.size !== provided.length) {
      throw new BadRequestException(
        `All ${label} IDs must be provided exactly once for reorder.`,
      );
    }

    for (const id of expectedSet) {
      if (!providedSet.has(id)) {
        throw new BadRequestException(
          `All ${label} IDs must be provided exactly once for reorder.`,
        );
      }
    }
  }

  private readString(value: unknown, fieldName: string) {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`${fieldName} must be a non-empty string.`);
    }

    return value.trim();
  }

  private readOptionalString(value: unknown) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('Expected a string value.');
    }

    const trimmed = value.trim();
    return trimmed || null;
  }

  private readInteger(value: unknown, fieldName: string) {
    if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
      throw new BadRequestException(`${fieldName} must be an integer.`);
    }

    return value;
  }

  private readDecimal(value: unknown, fieldName: string) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new BadRequestException(
        `${fieldName} must be a non-negative number with up to 2 decimal places.`,
      );
    }

    if (value < 0) {
      throw new BadRequestException(
        `${fieldName} must be a non-negative number with up to 2 decimal places.`,
      );
    }

    const scaled = value * 100;

    if (!Number.isInteger(Math.round(scaled)) || Math.abs(scaled - Math.round(scaled)) > 1e-9) {
      throw new BadRequestException(
        `${fieldName} must be a non-negative number with up to 2 decimal places.`,
      );
    }

    return value;
  }

  private readOptionalStringArray(value: unknown) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  private readRequiredStringArray(value: unknown, fieldName: string) {
    if (!Array.isArray(value) || !value.length) {
      throw new BadRequestException(`${fieldName} must be a non-empty string array.`);
    }

    const parsed = value.map((entry) => {
      if (typeof entry !== 'string' || !entry.trim()) {
        throw new BadRequestException(
          `${fieldName} must contain only non-empty strings.`,
        );
      }

      return entry.trim();
    });

    return parsed;
  }

  private readStringField(value: Prisma.JsonValue | null, field: string) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const objectValue = value as Record<string, unknown>;
    const fieldValue = objectValue[field];

    if (typeof fieldValue !== 'string') {
      return null;
    }

    const trimmed = fieldValue.trim();
    return trimmed.length ? trimmed : null;
  }

  private readNumberField(value: Prisma.JsonValue | null, field: string) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const objectValue = value as Record<string, unknown>;
    const fieldValue = objectValue[field];

    if (typeof fieldValue !== 'number' || !Number.isFinite(fieldValue)) {
      return null;
    }

    return fieldValue;
  }

  private parseBase64Image(value: string) {
    const directMatch = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

    if (!directMatch) {
      throw new BadRequestException(
        'content_base64 must be a data URL with an image mime type.',
      );
    }

    const mimeType = directMatch[1].toLowerCase();
    const base64Payload = directMatch[2];

    if (!mimeType.startsWith('image/')) {
      throw new BadRequestException('Only image uploads are supported.');
    }

    const data = Buffer.from(base64Payload, 'base64');

    if (!data.length) {
      throw new BadRequestException('Invalid base64 image content.');
    }

    return {
      mimeType,
      data,
    };
  }

  private resolveFileExtension(fileName: string, mimeType: string) {
    const explicitExtension = extname(fileName).toLowerCase();

    if (explicitExtension) {
      return explicitExtension;
    }

    if (mimeType === 'image/png') {
      return '.png';
    }

    if (mimeType === 'image/jpeg') {
      return '.jpg';
    }

    if (mimeType === 'image/webp') {
      return '.webp';
    }

    if (mimeType === 'image/gif') {
      return '.gif';
    }

    if (mimeType === 'image/svg+xml') {
      return '.svg';
    }

    return '.img';
  }

  private mimeTypeFromExtension(extension: string) {
    if (extension === '.png') {
      return 'image/png';
    }

    if (extension === '.jpg' || extension === '.jpeg') {
      return 'image/jpeg';
    }

    if (extension === '.webp') {
      return 'image/webp';
    }

    if (extension === '.gif') {
      return 'image/gif';
    }

    if (extension === '.svg') {
      return 'image/svg+xml';
    }

    return 'application/octet-stream';
  }

  private toJsonValue(value: unknown) {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private getApiBaseUrl() {
    const explicit = process.env.PUBLIC_API_BASE_URL;

    if (explicit) {
      return explicit.replace(/\/$/, '');
    }

    return `http://localhost:${process.env.PORT ?? 3001}`;
  }
}
