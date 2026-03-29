import { BadRequestException, Injectable } from '@nestjs/common';
import {
  BlockRole,
  BlockType as PrismaBlockType,
  ExamNodeType,
  ExamVariantCode,
  Prisma,
  PublicationStatus,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import {
  DraftBlock,
  DraftBlockRole,
  DraftNode,
  DraftVariantCode,
  IngestionDraft,
} from './ingestion.contract';
import { groupDraftNodesByParent } from './ingestion-draft-graph';

@Injectable()
export class IngestionPublishedVariantService {
  async buildSubjectTopicIdMap(
    tx: Prisma.TransactionClient,
    subjectId: string,
    topicCodes: string[],
    subjectCode: string | null,
  ) {
    if (!topicCodes.length) {
      return new Map<string, string>();
    }

    const topics = await tx.topic.findMany({
      where: {
        subjectId,
        code: {
          in: topicCodes,
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
    const invalidCodes = topicCodes.filter((code) => !topicIdsByCode.has(code));

    if (invalidCodes.length) {
      throw new BadRequestException(
        `Invalid topic codes for ${subjectCode ?? 'this subject'}: ${invalidCodes.join(', ')}.`,
      );
    }

    return topicIdsByCode;
  }

  async createPublishedVariants(input: {
    tx: Prisma.TransactionClient;
    jobId: string;
    paperId: string;
    draft: IngestionDraft;
    topicIdsByCode: Map<string, string>;
    assetMediaIds: Map<string, string>;
    createId?: () => string;
  }) {
    const createId = input.createId ?? randomUUID;

    for (const variant of input.draft.variants) {
      const variantId = createId();

      await input.tx.examVariant.create({
        data: {
          id: variantId,
          paperId: input.paperId,
          code: this.toPrismaVariantCode(variant.code),
          title: variant.title,
          status: PublicationStatus.PUBLISHED,
          metadata: toJsonValue({
            importedFromJobId: input.jobId,
          }),
        },
      });

      const nodesByParent = groupDraftNodesByParent(variant.nodes);
      await this.createVariantNodes({
        tx: input.tx,
        variantId,
        parentDraftNodeId: null,
        nodesByParent,
        assetMediaIds: input.assetMediaIds,
        topicIdsByCode: input.topicIdsByCode,
        createId,
      });
    }
  }

  private async createVariantNodes(input: {
    tx: Prisma.TransactionClient;
    variantId: string;
    parentDraftNodeId: string | null;
    nodesByParent: Map<string | null, DraftNode[]>;
    assetMediaIds: Map<string, string>;
    topicIdsByCode: Map<string, string>;
    parentId?: string | null;
    createId: () => string;
  }) {
    const nodes = input.nodesByParent.get(input.parentDraftNodeId) ?? [];

    for (const node of nodes) {
      const nodeId = input.createId();

      await input.tx.examNode.create({
        data: {
          id: nodeId,
          variantId: input.variantId,
          parentId: input.parentId ?? null,
          nodeType: this.toPrismaNodeType(node.nodeType),
          orderIndex: node.orderIndex,
          label: node.label,
          maxPoints: node.maxPoints,
          status: PublicationStatus.PUBLISHED,
          metadata: toJsonValue({
            importedFromDraftNodeId: node.id,
          }),
        },
      });

      await this.createNodeBlocks(
        input.tx,
        nodeId,
        node.blocks,
        input.assetMediaIds,
      );
      await this.createNodeTopics(
        input.tx,
        nodeId,
        node.topicCodes,
        input.topicIdsByCode,
      );
      await this.createVariantNodes({
        ...input,
        parentDraftNodeId: node.id,
        parentId: nodeId,
      });
    }
  }

  private async createNodeTopics(
    tx: Prisma.TransactionClient,
    nodeId: string,
    topicCodes: string[],
    topicIdsByCode: Map<string, string>,
  ) {
    if (!topicCodes.length) {
      return;
    }

    await tx.examNodeTopic.createMany({
      data: topicCodes.map((code) => {
        const topicId = topicIdsByCode.get(code);

        if (!topicId) {
          throw new BadRequestException(`Unknown topic code ${code}.`);
        }

        return {
          nodeId,
          topicId,
        };
      }),
      skipDuplicates: true,
    });
  }

  private async createNodeBlocks(
    tx: Prisma.TransactionClient,
    nodeId: string,
    blocks: DraftBlock[],
    assetMediaIds: Map<string, string>,
  ) {
    for (let index = 0; index < blocks.length; index += 1) {
      const block = blocks[index];
      const mediaId =
        block.assetId !== undefined && block.assetId !== null
          ? (assetMediaIds.get(block.assetId) ?? null)
          : null;

      await tx.examNodeBlock.create({
        data: {
          nodeId,
          role: this.toPrismaBlockRole(block.role),
          orderIndex: index + 1,
          blockType: this.toPrismaBlockType(block),
          textValue:
            mediaId &&
            block.type !== 'table' &&
            block.type !== 'list' &&
            !this.hasStructuredRenderData(block)
              ? null
              : block.value,
          mediaId,
          data: toJsonValue({
            ...(this.asDraftBlockData(block) ?? {}),
            ...(this.inferStructuredKind(block) &&
            this.readJsonString(block.data ?? null, 'kind') === null
              ? {
                  kind: this.inferStructuredKind(block),
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
            ...(block.assetId
              ? {
                  assetId: block.assetId,
                }
              : {}),
            ...(mediaId
              ? {
                  kind: this.inferStructuredKind(block) ?? 'reviewed_asset',
                }
              : {}),
          }),
        },
      });
    }
  }

  private toPrismaVariantCode(value: DraftVariantCode) {
    return value === 'SUJET_2'
      ? ExamVariantCode.SUJET_2
      : ExamVariantCode.SUJET_1;
  }

  private toPrismaNodeType(value: DraftNode['nodeType']) {
    if (value === 'PART') {
      return ExamNodeType.PART;
    }

    if (value === 'QUESTION') {
      return ExamNodeType.QUESTION;
    }

    if (value === 'SUBQUESTION') {
      return ExamNodeType.SUBQUESTION;
    }

    if (value === 'CONTEXT') {
      return ExamNodeType.CONTEXT;
    }

    return ExamNodeType.EXERCISE;
  }

  private toPrismaBlockRole(value: DraftBlockRole) {
    if (value === 'SOLUTION') {
      return BlockRole.SOLUTION;
    }

    if (value === 'HINT') {
      return BlockRole.HINT;
    }

    if (value === 'META') {
      return BlockRole.META;
    }

    return BlockRole.PROMPT;
  }

  private toPrismaBlockType(value: DraftBlock) {
    if (value.type === 'heading') {
      return PrismaBlockType.HEADING;
    }

    if (value.type === 'latex') {
      return PrismaBlockType.LATEX;
    }

    if (value.type === 'code') {
      return PrismaBlockType.CODE;
    }

    if (value.type === 'list') {
      return PrismaBlockType.LIST;
    }

    if (this.isFormulaGraphBlock(value)) {
      if (!this.hasFormulaGraphData(value) && value.assetId) {
        return PrismaBlockType.IMAGE;
      }

      return this.hasFormulaGraphData(value)
        ? PrismaBlockType.GRAPH
        : PrismaBlockType.PARAGRAPH;
    }

    if (this.isProbabilityTreeBlock(value)) {
      if (!this.hasProbabilityTreeData(value) && value.assetId) {
        return PrismaBlockType.IMAGE;
      }

      return this.hasProbabilityTreeData(value)
        ? PrismaBlockType.TREE
        : PrismaBlockType.PARAGRAPH;
    }

    if (value.type === 'table') {
      if (value.assetId && !this.hasStructuredTableData(value)) {
        return PrismaBlockType.IMAGE;
      }

      return PrismaBlockType.TABLE;
    }

    if (value.type === 'image' || value.assetId) {
      return PrismaBlockType.IMAGE;
    }

    return PrismaBlockType.PARAGRAPH;
  }

  private asDraftBlockData(block: DraftBlock) {
    if (
      !block.data ||
      typeof block.data !== 'object' ||
      Array.isArray(block.data)
    ) {
      return null;
    }

    return block.data;
  }

  private hasStructuredTableData(block: DraftBlock) {
    const data = this.asDraftBlockData(block);

    if (!data) {
      return false;
    }

    return Array.isArray(data.rows);
  }

  private hasFormulaGraphData(block: DraftBlock) {
    const data = this.asDraftBlockData(block);

    if (!data) {
      return false;
    }

    const kind = this.readJsonString(data, 'kind');

    return (
      kind === 'formula_graph' ||
      isRecordWithKey(data, 'formulaGraph') ||
      isRecordWithKey(data, 'graph')
    );
  }

  private hasProbabilityTreeData(block: DraftBlock) {
    const data = this.asDraftBlockData(block);

    if (!data) {
      return false;
    }

    const kind = this.readJsonString(data, 'kind');

    return (
      kind === 'probability_tree' ||
      isRecordWithKey(data, 'probabilityTree') ||
      isRecordWithKey(data, 'tree')
    );
  }

  private isFormulaGraphBlock(block: DraftBlock) {
    return block.type === 'graph' || this.hasFormulaGraphData(block);
  }

  private isProbabilityTreeBlock(block: DraftBlock) {
    return block.type === 'tree' || this.hasProbabilityTreeData(block);
  }

  private inferStructuredKind(block: DraftBlock) {
    if (this.isFormulaGraphBlock(block)) {
      return 'formula_graph';
    }

    if (this.isProbabilityTreeBlock(block)) {
      return 'probability_tree';
    }

    return this.readJsonString(block.data ?? null, 'kind');
  }

  private hasStructuredRenderData(block: DraftBlock) {
    return (
      this.hasStructuredTableData(block) ||
      this.hasFormulaGraphData(block) ||
      this.hasProbabilityTreeData(block)
    );
  }

  private readJsonString(value: unknown, field: string) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const record = value as Record<string, unknown>;
    return typeof record[field] === 'string' ? record[field] : null;
  }
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function isRecordWithKey(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}
