import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BlockRole, ExamNodeType } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdminDomainSupport,
  AdminExerciseEditorQuestion,
  QuestionNode,
} from './admin-domain-support';

@Injectable()
export class AdminExerciseEditorService extends AdminDomainSupport {
  constructor(prisma: PrismaService) {
    super(prisma);
  }
  async getExerciseEditor(exerciseId: string) {
    const context = await this.loadExerciseContext(exerciseId);

    const exerciseMetadata = this.parseExerciseMetadata(
      context.exercise.metadata,
    );
    const orderedQuestions = this.orderQuestionsForAdmin(
      context.exercise.id,
      context.variantNodes,
    );

    const questionIdSet = new Set(orderedQuestions.map((entry) => entry.id));

    const questions: AdminExerciseEditorQuestion[] = orderedQuestions.map(
      (question, index) => {
        const parsedMetadata = this.parseQuestionMetadata(
          question.metadata,
          question,
        );

        return {
          id: question.id,
          title: parsedMetadata.title ?? `Question ${index + 1}`,
          parent_id:
            question.parentId && questionIdSet.has(question.parentId)
              ? question.parentId
              : null,
          order_index: index + 1,
          status: this.fromPublicationStatus(question.status),
          points:
            question.maxPoints !== null ? Number(question.maxPoints) : null,
          topics: this.mapAdminTopicTags(question.topicMappings),
          content_blocks:
            parsedMetadata.contentBlocks && parsedMetadata.contentBlocks.length
              ? parsedMetadata.contentBlocks
              : this.mapNodeBlocksToContentBlocks(
                  question.blocks.filter(
                    (block) =>
                      block.role === BlockRole.PROMPT ||
                      block.role === BlockRole.STEM,
                  ),
                ),
          solution_blocks:
            parsedMetadata.solutionBlocks &&
            parsedMetadata.solutionBlocks.length
              ? parsedMetadata.solutionBlocks
              : this.mapNodeBlocksToContentBlocks(
                  question.blocks.filter(
                    (block) => block.role === BlockRole.SOLUTION,
                  ),
                ),
          hint_blocks:
            parsedMetadata.hintBlocks !== undefined
              ? parsedMetadata.hintBlocks
              : this.mapNodeBlocksToContentBlocks(
                  question.blocks.filter(
                    (block) =>
                      block.role === BlockRole.HINT ||
                      block.role === BlockRole.RUBRIC,
                  ),
                ),
          created_at: question.createdAt,
          updated_at: question.updatedAt,
        };
      },
    );

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
                block.role === BlockRole.STEM ||
                block.role === BlockRole.PROMPT,
            ),
          );

    return {
      exercise: {
        id: context.exercise.id,
        title: context.exercise.label,
        order_index: context.exercise.orderIndex,
        status: this.fromPublicationStatus(context.exercise.status),
        theme: exerciseMetadata.theme ?? null,
        difficulty: exerciseMetadata.difficulty ?? null,
        tags: exerciseMetadata.tags ?? [],
        topics: this.mapAdminTopicTags(context.exercise.topicMappings),
        metadata: {
          year: exerciseMetadata.hierarchyMeta?.year ?? context.exam.year,
          session:
            exerciseMetadata.hierarchyMeta?.session ??
            this.fromSessionType(context.exam.sessionType),
          subject:
            exerciseMetadata.hierarchyMeta?.subject ??
            context.exam.subject.code,
          branch:
            exerciseMetadata.hierarchyMeta?.branch ?? context.exam.stream.code,
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

  async updateExerciseMetadata(
    exerciseId: string,
    payload: Record<string, unknown>,
  ) {
    const exercise = await this.prisma.examNode.findUnique({
      where: {
        id: exerciseId,
      },
      select: {
        id: true,
        metadata: true,
        variant: {
          select: {
            paper: {
              select: {
                offerings: {
                  orderBy: {
                    createdAt: 'asc',
                  },
                  select: {
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

    if (!exercise) {
      throw new NotFoundException(`Exercise ${exerciseId} not found.`);
    }

    const existingMetadata = this.parseExerciseMetadata(exercise.metadata);
    const topicCodes = this.readOptionalTopicCodes(payload);
    const subjectCode = exercise.variant.paper.offerings[0]?.subject.code;

    if (!subjectCode) {
      throw new NotFoundException(
        `Exercise ${exerciseId} is not linked to a subject offering.`,
      );
    }

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

      if (topicCodes !== undefined) {
        await this.replaceNodeTopicMappings(
          tx,
          exerciseId,
          subjectCode,
          topicCodes,
        );
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
      const parentExists = orderedQuestions.some(
        (question) => question.id === parentId,
      );
      if (!parentExists) {
        throw new BadRequestException(
          'parent_id must reference a question in this exercise.',
        );
      }
    }

    const existingNodes = orderedQuestions.map((question, index) => ({
      id: question.id,
      orderIndex: index + 1,
      parentId:
        question.parentId &&
        orderedQuestions.some((entry) => entry.id === question.parentId)
          ? question.parentId
          : null,
    }));

    const syntheticNode: QuestionNode = {
      id: randomUUID(),
      orderIndex: existingNodes.length + 1,
      parentId,
    };

    const validationErrors = this.validateHierarchy([
      ...existingNodes,
      syntheticNode,
    ]);
    this.throwIfValidationFails(validationErrors);

    const title =
      this.readOptionalString(payload.title) ??
      `Question ${existingNodes.length + 1}`;
    const points =
      payload.points !== undefined
        ? this.readDecimal(payload.points, 'points')
        : 0;
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
    const topicCodes = this.readOptionalTopicCodes(payload) ?? [];

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
          label: title,
          maxPoints: points,
          status,
          metadata: this.toJsonValue(
            this.toQuestionMetadata({
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

      await this.replaceNodeTopicMappings(
        tx,
        created.id,
        context.exam.subject.code,
        topicCodes,
      );
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
      label: question.label,
      metadata: question.metadata,
    });

    const nextParentId =
      payload.parent_id !== undefined
        ? this.readOptionalString(payload.parent_id)
        : orderedQuestions.some((entry) => entry.id === question.parentId)
          ? question.parentId
          : null;

    if (nextParentId) {
      const parentExists = orderedQuestions.some(
        (entry) => entry.id === nextParentId,
      );

      if (!parentExists) {
        throw new BadRequestException(
          'parent_id must reference a question in the same exercise.',
        );
      }
    }

    const nodes = orderedQuestions.map((entry, index) => {
      const parentId =
        entry.id === question.id
          ? nextParentId
          : entry.parentId &&
              orderedQuestions.some((value) => value.id === entry.parentId)
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
        ? (this.readOptionalString(payload.title) ??
          `Question ${question.orderIndex}`)
        : (existingMetadata.title ??
          question.label ??
          `Question ${question.orderIndex}`);

    const contentBlocks =
      payload.content_blocks !== undefined
        ? this.normalizeBlocks(payload.content_blocks)
        : (existingMetadata.contentBlocks ??
          this.mapNodeBlocksToContentBlocks(
            this.mapLoadedBlocks(question.blocks).filter(
              (block) =>
                block.role === BlockRole.PROMPT ||
                block.role === BlockRole.STEM,
            ),
          ));

    const solutionBlocks =
      payload.solution_blocks !== undefined
        ? this.normalizeBlocks(payload.solution_blocks)
        : (existingMetadata.solutionBlocks ??
          this.mapNodeBlocksToContentBlocks(
            this.mapLoadedBlocks(question.blocks).filter(
              (block) => block.role === BlockRole.SOLUTION,
            ),
          ));

    const hintBlocks =
      payload.hint_blocks !== undefined
        ? this.normalizeNullableBlocks(payload.hint_blocks)
        : (existingMetadata.hintBlocks ??
          this.mapNodeBlocksToContentBlocks(
            this.mapLoadedBlocks(question.blocks).filter(
              (block) =>
                block.role === BlockRole.HINT ||
                block.role === BlockRole.RUBRIC,
            ),
          ));

    const currentOrder =
      existingMetadata.adminOrder ??
      orderedQuestions.findIndex((entry) => entry.id === question.id) + 1;
    const existingMetadataWithoutTitle = { ...existingMetadata };
    delete existingMetadataWithoutTitle.title;
    const topicCodes = this.readOptionalTopicCodes(payload);

    const nextParentNodeId = nextParentId ?? context.exercise.id;
    const parentChanged = nextParentNodeId !== question.parentId;
    const nextOrderIndex = parentChanged
      ? this.nextSiblingOrder(
          context.variantNodes,
          nextParentNodeId,
          questionId,
        )
      : question.orderIndex;

    await this.prisma.$transaction(async (tx) => {
      await tx.examNode.update({
        where: {
          id: questionId,
        },
        data: {
          parentId: nextParentNodeId,
          nodeType: nextParentId
            ? ExamNodeType.SUBQUESTION
            : ExamNodeType.QUESTION,
          label: title,
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
          metadata: this.toJsonValue(
            this.toQuestionMetadata({
              ...existingMetadataWithoutTitle,
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

      if (topicCodes !== undefined) {
        await this.replaceNodeTopicMappings(
          tx,
          questionId,
          context.exam.subject.code,
          topicCodes,
        );
      }

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
            nodeType: item.parentId
              ? ExamNodeType.SUBQUESTION
              : ExamNodeType.QUESTION,
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
}
