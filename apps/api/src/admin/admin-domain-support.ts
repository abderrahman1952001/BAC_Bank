import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  BlockRole,
  ExamNodeType,
  ExamVariantCode,
  Prisma,
  PublicationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildChildrenByParent,
  collectDescendantIds,
  nextSiblingOrder,
  orderQuestionsForAdmin,
  sortExercisesForAdmin,
  throwIfValidationFails,
  validateHierarchy,
} from './admin-domain-hierarchy';
import {
  defaultBlocks,
  defaultVariantTitle,
  derivePaperFamilyCode,
  examVariantRank,
  fromPrismaBlockType,
  fromPublicationStatus,
  fromSessionType,
  mapAdminTopicTags,
  mapExam,
  mapExerciseNode,
  mapLoadedBlocks,
  mapNodeBlocksToContentBlocks,
  mapNodeWithBlocks,
  normalizeAdminExamRecord,
  normalizeBlockType,
  normalizeBlocks,
  normalizeNullableBlocks,
  parseExerciseMetadata,
  parseQuestionMetadata,
  pickRepresentativeExamId,
  pickRepresentativeExamOffering,
  readDecimal,
  readInteger,
  readNumberField,
  readOptionalExamVariantCode,
  readOptionalString,
  readOptionalStringArray,
  readOptionalTopicCodes,
  readRequiredStringArray,
  readString,
  readStringField,
  toExerciseMetadata,
  toJsonValue,
  toPrismaBlockType,
  toPublicationStatus,
  toQuestionMetadata,
  toSessionType,
  validateExactIdSet,
} from './admin-domain-serialization';
import type {
  AdminExamRecord,
  ContentBlock,
  ExerciseContext,
} from './admin-domain-types';

export type {
  AdminExamRecord,
  AdminExamRecordNode,
  AdminExamSummary,
  AdminExerciseEditorQuestion,
  AdminSessionType,
  AdminStatus,
  BlockType,
  ContentBlock,
  ExamNodeBlockRow,
  ExamNodeRow,
  ExerciseContext,
  ExerciseMetadata,
  QuestionMetadata,
  QuestionNode,
  TopicMappingRow,
} from './admin-domain-types';

export abstract class AdminDomainSupport {
  protected constructor(protected readonly prisma: PrismaService) {}

  protected readonly normalizeAdminExamRecord = normalizeAdminExamRecord;
  protected readonly pickRepresentativeExamOffering =
    pickRepresentativeExamOffering;
  protected readonly pickRepresentativeExamId = pickRepresentativeExamId;
  protected readonly derivePaperFamilyCode = derivePaperFamilyCode;
  protected readonly mapExam = mapExam;
  protected readonly mapExerciseNode = mapExerciseNode;
  protected readonly orderQuestionsForAdmin = orderQuestionsForAdmin;
  protected readonly sortExercisesForAdmin = sortExercisesForAdmin;
  protected readonly buildChildrenByParent = buildChildrenByParent;
  protected readonly collectDescendantIds = collectDescendantIds;
  protected readonly mapNodeWithBlocks = mapNodeWithBlocks;
  protected readonly mapLoadedBlocks = mapLoadedBlocks;
  protected readonly mapAdminTopicTags = mapAdminTopicTags;
  protected readonly parseExerciseMetadata = parseExerciseMetadata;
  protected readonly parseQuestionMetadata = parseQuestionMetadata;
  protected readonly toExerciseMetadata = toExerciseMetadata;
  protected readonly toQuestionMetadata = toQuestionMetadata;
  protected readonly mapNodeBlocksToContentBlocks =
    mapNodeBlocksToContentBlocks;
  protected readonly nextSiblingOrder = nextSiblingOrder;
  protected readonly validateHierarchy = validateHierarchy;
  protected readonly throwIfValidationFails = throwIfValidationFails;
  protected readonly normalizeBlocks = normalizeBlocks;
  protected readonly normalizeNullableBlocks = normalizeNullableBlocks;
  protected readonly defaultBlocks = defaultBlocks;
  protected readonly normalizeBlockType = normalizeBlockType;
  protected readonly toPrismaBlockType = toPrismaBlockType;
  protected readonly fromPrismaBlockType = fromPrismaBlockType;
  protected readonly toPublicationStatus = toPublicationStatus;
  protected readonly fromPublicationStatus = fromPublicationStatus;
  protected readonly toSessionType = toSessionType;
  protected readonly fromSessionType = fromSessionType;
  protected readonly readOptionalExamVariantCode = readOptionalExamVariantCode;
  protected readonly defaultVariantTitle = defaultVariantTitle;
  protected readonly examVariantRank = examVariantRank;
  protected readonly validateExactIdSet = validateExactIdSet;
  protected readonly readString = readString;
  protected readonly readOptionalString = readOptionalString;
  protected readonly readInteger = readInteger;
  protected readonly readDecimal = readDecimal;
  protected readonly readOptionalStringArray = readOptionalStringArray;
  protected readonly readOptionalTopicCodes = readOptionalTopicCodes;
  protected readonly readRequiredStringArray = readRequiredStringArray;
  protected readonly readStringField = readStringField;
  protected readonly readNumberField = readNumberField;
  protected readonly toJsonValue = toJsonValue;

  protected async getExamByIdForAdmin(
    examId: string,
  ): Promise<AdminExamRecord> {
    const exam = await this.prisma.exam.findUnique({
      where: {
        id: examId,
      },
      include: {
        paper: {
          select: {
            id: true,
            familyCode: true,
            officialSourceReference: true,
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
                    maxPoints: true,
                    status: true,
                    metadata: true,
                    createdAt: true,
                    updatedAt: true,
                    topicMappings: {
                      select: {
                        topic: {
                          select: {
                            code: true,
                            name: true,
                            studentLabel: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            offerings: {
              select: {
                id: true,
              },
            },
          },
        },
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

    if (!exam) {
      throw new NotFoundException(`Exam ${examId} not found.`);
    }

    return this.normalizeAdminExamRecord(exam);
  }

  protected async loadExerciseContext(
    exerciseId: string,
  ): Promise<ExerciseContext> {
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
        maxPoints: true,
        status: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        topicMappings: {
          select: {
            topic: {
              select: {
                code: true,
                name: true,
                studentLabel: true,
              },
            },
          },
        },
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
            paper: {
              select: {
                offerings: {
                  orderBy: {
                    createdAt: 'asc',
                  },
                  select: {
                    id: true,
                    year: true,
                    sessionType: true,
                    isPublished: true,
                    createdAt: true,
                    updatedAt: true,
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
                          orderBy: {
                            code: 'asc',
                          },
                          select: {
                            nodes: {
                              select: {
                                nodeType: true,
                                parentId: true,
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
        maxPoints: true,
        status: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        topicMappings: {
          select: {
            topic: {
              select: {
                code: true,
                name: true,
                studentLabel: true,
              },
            },
          },
        },
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
    const descendantIds = this.collectDescendantIds(
      exerciseId,
      childrenByParent,
    );

    const questionNodes = variantNodes.filter(
      (node) =>
        descendantIds.has(node.id) &&
        (node.nodeType === ExamNodeType.QUESTION ||
          node.nodeType === ExamNodeType.SUBQUESTION),
    );

    const representativeExam = this.pickRepresentativeExamOffering(
      exercise.variant.paper.offerings,
    );

    return {
      exercise: this.mapNodeWithBlocks(exercise),
      variantNodes: variantNodes.map((node) => this.mapNodeWithBlocks(node)),
      questionNodes: questionNodes.map((node) => this.mapNodeWithBlocks(node)),
      exam: {
        ...representativeExam,
        officialSourceReference:
          representativeExam.paper.officialSourceReference,
        variants: representativeExam.paper.variants,
      },
    };
  }

  protected async loadExerciseContextByQuestionNode(
    questionId: string,
  ): Promise<ExerciseContext> {
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
        maxPoints: true,
        status: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        topicMappings: {
          select: {
            topic: {
              select: {
                code: true,
                name: true,
                studentLabel: true,
              },
            },
          },
        },
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
      current = current.parentId ? (byId.get(current.parentId) ?? null) : null;
    }

    if (!current || current.nodeType !== ExamNodeType.EXERCISE) {
      throw new BadRequestException(
        'Question does not belong to a valid exercise subtree.',
      );
    }

    return this.loadExerciseContext(current.id);
  }

  protected async replaceNodeBlocks(
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
          ...(block.data &&
          typeof block.data === 'object' &&
          !Array.isArray(block.data)
            ? (block.data as Prisma.InputJsonObject)
            : {}),
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

  protected async replaceNodeTopicMappings(
    tx: Prisma.TransactionClient,
    nodeId: string,
    subjectCode: string,
    topicCodes: string[],
  ) {
    const normalizedCodes = Array.from(
      new Set(
        topicCodes
          .map((code) => code.trim().toUpperCase())
          .filter((code) => code.length > 0),
      ),
    );

    await tx.examNodeTopic.deleteMany({
      where: {
        nodeId,
      },
    });

    if (!normalizedCodes.length) {
      return;
    }

    const topics = await tx.topic.findMany({
      where: {
        subject: {
          code: subjectCode.trim().toUpperCase(),
        },
        code: {
          in: normalizedCodes,
        },
      },
      select: {
        id: true,
        code: true,
      },
    });

    const topicIdsByCode = new Map(
      topics.map((topic) => [topic.code, topic.id]),
    );
    const invalidCodes = normalizedCodes.filter(
      (code) => !topicIdsByCode.has(code),
    );

    if (invalidCodes.length) {
      throw new BadRequestException(
        `Unknown topic codes for ${subjectCode}: ${invalidCodes.join(', ')}.`,
      );
    }

    await tx.examNodeTopic.createMany({
      data: normalizedCodes.map((code) => ({
        nodeId,
        topicId: topicIdsByCode.get(code)!,
      })),
      skipDuplicates: true,
    });
  }

  protected async resequenceChildren(
    tx: Prisma.TransactionClient,
    parentId: string,
  ) {
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

  protected async rebalanceQuestionAdminOrder(exerciseId: string) {
    const context = await this.loadExerciseContext(exerciseId);
    const orderedQuestions = this.orderQuestionsForAdmin(
      exerciseId,
      context.variantNodes,
    );

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

  protected async rebalanceExerciseAdminOrder(examId: string) {
    const exam = await this.getExamByIdForAdmin(examId);

    const exercises = this.sortExercisesForAdmin(
      exam.variants.flatMap((variant) =>
        variant.nodes
          .filter(
            (node) =>
              node.nodeType === ExamNodeType.EXERCISE && node.parentId === null,
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

  protected async resolveOrCreateTargetVariant(
    paperId: string,
    variants: Array<{
      id: string;
      code: ExamVariantCode;
      status: PublicationStatus;
    }>,
    requestedCode: ExamVariantCode | null,
    status: PublicationStatus,
  ) {
    if (requestedCode) {
      const existing = variants.find(
        (variant) => variant.code === requestedCode,
      );

      if (existing) {
        return existing;
      }

      return this.prisma.examVariant.create({
        data: {
          paperId,
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
      const sujetOne = variants.find(
        (variant) => variant.code === ExamVariantCode.SUJET_1,
      );
      return sujetOne ?? variants[0];
    }

    return this.prisma.examVariant.create({
      data: {
        paperId,
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

  protected async resolveSubjectCode(value: unknown) {
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

    throw new BadRequestException(
      'subject must map to an existing subject code/name.',
    );
  }

  protected async resolveStreamCode(value: unknown) {
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

    throw new BadRequestException(
      'stream must map to an existing stream code/name.',
    );
  }
}
