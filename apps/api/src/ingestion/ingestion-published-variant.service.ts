import { BadRequestException, Injectable } from '@nestjs/common';
import {
  BlockRole,
  BlockType as PrismaBlockType,
  ExamNodeLearningTargetSource,
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
import { CatalogCurriculumService } from '../catalog/catalog-curriculum.service';
import { groupDraftNodesByParent } from './ingestion-draft-graph';

@Injectable()
export class IngestionPublishedVariantService {
  constructor(
    private readonly catalogCurriculumService: CatalogCurriculumService,
  ) {}

  async buildSubjectTopicIdMap(
    tx: Prisma.TransactionClient,
    subjectId: string,
    topicCodes: string[],
    subjectCode: string | null,
    streamCodes: string[] = [],
    years: number[] = [],
  ) {
    if (!topicCodes.length) {
      return new Map<string, string>();
    }

    const subjectScope =
      subjectCode === null
        ? null
        : await this.catalogCurriculumService.resolveCurriculumScope(
            {
              subjectCode,
              streamCodes,
              years,
            },
            tx,
          );

    const topics = await tx.curriculumNode.findMany({
      where: {
        subjectId,
        ...(subjectScope?.curriculumIds.length
          ? {
              curriculumId: {
                in: subjectScope.curriculumIds,
              },
            }
          : {}),
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
    const learningTargetMappingsByTopicId =
      await this.listLearningTargetMappingsByTopicId(
        input.tx,
        Array.from(input.topicIdsByCode.values()),
      );

    for (const variant of input.draft.variants.filter(
      (draftVariant) => draftVariant.nodes.length > 0,
    )) {
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
        learningTargetMappingsByTopicId,
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
    learningTargetMappingsByTopicId: Map<
      string,
      Array<{
        learningTargetId: string;
        weight: Prisma.Decimal;
        isPrimary: boolean;
      }>
    >;
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
      const topicIds = await this.createNodeTopics(
        input.tx,
        nodeId,
        node.topicCodes,
        input.topicIdsByCode,
      );
      await this.createNodeLearningTargets(
        input.tx,
        nodeId,
        topicIds,
        input.learningTargetMappingsByTopicId,
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
      return [] as string[];
    }

    const topicIds = topicCodes.map((code) => {
      const topicId = topicIdsByCode.get(code);

      if (!topicId) {
        throw new BadRequestException(`Unknown topic code ${code}.`);
      }

      return topicId;
    });

    await tx.examNodeCurriculumNode.createMany({
      data: topicIds.map((topicId) => ({
        nodeId,
        curriculumNodeId: topicId,
      })),
      skipDuplicates: true,
    });

    return topicIds;
  }

  private async createNodeLearningTargets(
    tx: Prisma.TransactionClient,
    nodeId: string,
    topicIds: string[],
    learningTargetMappingsByTopicId: Map<
      string,
      Array<{
        learningTargetId: string;
        weight: Prisma.Decimal;
        isPrimary: boolean;
      }>
    >,
  ) {
    if (!topicIds.length) {
      return;
    }

    const aggregatedLearningTargets = new Map<
      string,
      {
        learningTargetId: string;
        weight: number;
        isPrimary: boolean;
      }
    >();

    for (const topicId of topicIds) {
      for (const mapping of learningTargetMappingsByTopicId.get(topicId) ??
        []) {
        const existing = aggregatedLearningTargets.get(
          mapping.learningTargetId,
        );

        if (existing) {
          existing.weight += Number(mapping.weight);
          existing.isPrimary ||= mapping.isPrimary;
          continue;
        }

        aggregatedLearningTargets.set(mapping.learningTargetId, {
          learningTargetId: mapping.learningTargetId,
          weight: Number(mapping.weight),
          isPrimary: mapping.isPrimary,
        });
      }
    }

    if (!aggregatedLearningTargets.size) {
      return;
    }

    await tx.examNodeLearningTarget.createMany({
      data: Array.from(aggregatedLearningTargets.values()).map((mapping) => ({
        nodeId,
        learningTargetId: mapping.learningTargetId,
        weight: mapping.weight,
        isPrimary: mapping.isPrimary,
        source: ExamNodeLearningTargetSource.TOPIC_DERIVED,
        confidence: 1,
      })),
      skipDuplicates: true,
    });
  }

  private async listLearningTargetMappingsByTopicId(
    tx: Prisma.TransactionClient,
    topicIds: string[],
  ) {
    if (!topicIds.length) {
      return new Map<
        string,
        Array<{
          learningTargetId: string;
          weight: Prisma.Decimal;
          isPrimary: boolean;
        }>
      >();
    }

    const topics = await tx.curriculumNode.findMany({
      where: {
        id: {
          in: topicIds,
        },
      },
      select: {
        id: true,
        learningTargetMappings: {
          select: {
            learningTargetId: true,
            weight: true,
            isPrimary: true,
          },
        },
      },
    });

    return new Map(
      topics.map((topic) => [topic.id, topic.learningTargetMappings]),
    );
  }

  private async createNodeBlocks(
    tx: Prisma.TransactionClient,
    nodeId: string,
    blocks: DraftBlock[],
    assetMediaIds: Map<string, string>,
  ) {
    if (blocks.length === 0) {
      return;
    }

    await tx.examNodeBlock.createMany({
      data: blocks.map((block, index) => {
        const mediaId =
          block.assetId !== undefined && block.assetId !== null
            ? (assetMediaIds.get(block.assetId) ?? null)
            : null;

        return {
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
        };
      }),
    });
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

    if (value === 'RUBRIC') {
      return BlockRole.RUBRIC;
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

    if (this.hasCivilDiagramData(value)) {
      return PrismaBlockType.PARAGRAPH;
    }

    if (this.hasTechnicalDiagramData(value)) {
      return PrismaBlockType.PARAGRAPH;
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

    if (this.hasChemistryStructureData(block)) {
      return 'chemistry_structure';
    }

    if (this.hasCivilDiagramData(block)) {
      return 'civil_diagram';
    }

    if (this.hasTechnicalDiagramData(block)) {
      return this.inferTechnicalDiagramKind(block) ?? 'technical_diagram';
    }

    return this.readJsonString(block.data ?? null, 'kind');
  }

  private hasStructuredRenderData(block: DraftBlock) {
    return (
      this.hasStructuredTableData(block) ||
      this.hasFormulaGraphData(block) ||
      this.hasProbabilityTreeData(block) ||
      this.hasChemistryStructureData(block) ||
      this.hasCivilDiagramData(block) ||
      this.hasTechnicalDiagramData(block)
    );
  }

  private hasChemistryStructureData(block: DraftBlock) {
    const data = this.readChemistryStructureData(block);

    return Boolean(data);
  }

  private readChemistryStructureData(block: DraftBlock) {
    const data = this.asDraftBlockData(block);

    if (!data) {
      return null;
    }

    const candidates: unknown[] = [
      data,
      data.chemistryStructure,
      data.molecule,
      data.payload,
    ];

    for (const candidate of candidates) {
      if (
        !candidate ||
        typeof candidate !== 'object' ||
        Array.isArray(candidate)
      ) {
        continue;
      }

      const record = candidate as Record<string, unknown>;
      const source =
        this.readJsonString(record, 'source') ??
        this.readJsonString(record, 'smiles') ??
        this.readJsonString(record, 'molblock');
      const hasMoleculeItems =
        Array.isArray(record.items) &&
        record.items.some((item) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) {
            return false;
          }

          const molecule = item as Record<string, unknown>;

          return Boolean(
            this.readJsonString(molecule, 'source')?.trim() ||
            this.readJsonString(molecule, 'smiles')?.trim() ||
            this.readJsonString(molecule, 'molblock')?.trim(),
          );
        });
      const explicitChemistryKind =
        this.readJsonString(record, 'kind') === 'chemistry_structure' ||
        this.readJsonString(data, 'kind') === 'chemistry_structure';
      const hasMoleculeSourceField = Boolean(
        this.readJsonString(record, 'smiles') ??
        this.readJsonString(record, 'molblock'),
      );

      if (
        (source?.trim() || hasMoleculeItems) &&
        (explicitChemistryKind || hasMoleculeSourceField || hasMoleculeItems)
      ) {
        return record;
      }
    }

    return null;
  }

  private hasCivilDiagramData(block: DraftBlock) {
    const data = this.readCivilDiagramData(block);

    return Boolean(data);
  }

  private hasTechnicalDiagramData(block: DraftBlock) {
    const data = this.readTechnicalDiagramData(block);

    return Boolean(data);
  }

  private inferTechnicalDiagramKind(block: DraftBlock) {
    const data = this.readTechnicalDiagramData(block);

    if (!data) {
      return null;
    }

    const kind = this.readJsonString(data, 'kind');

    if (
      kind === 'technical_flow' ||
      kind === 'technical_grid' ||
      kind === 'technical_waveform'
    ) {
      return kind;
    }

    return this.readJsonString(block.data ?? null, 'kind');
  }

  private readTechnicalDiagramData(block: DraftBlock) {
    const data = this.asDraftBlockData(block);

    if (!data) {
      return null;
    }

    const candidates: unknown[] = [
      data,
      data.technicalDiagram,
      data.technicalFlow,
      data.technicalGrid,
      data.technicalWaveform,
      data.payload,
    ];

    for (const candidate of candidates) {
      if (
        !candidate ||
        typeof candidate !== 'object' ||
        Array.isArray(candidate)
      ) {
        continue;
      }

      const record = candidate as Record<string, unknown>;
      const kind =
        this.readJsonString(record, 'kind') ??
        this.readJsonString(data, 'kind');
      const family =
        this.readJsonString(record, 'family') ??
        this.readJsonString(record, 'type') ??
        this.readJsonString(data, 'family') ??
        this.readJsonString(data, 'type');
      const hasFlow = Array.isArray(record.nodes) && record.nodes.length > 0;
      const hasGrid =
        (Array.isArray(record.rows) && record.rows.length > 0) ||
        (Array.isArray(record.cells) && record.cells.length > 0);
      const hasWaveform =
        Array.isArray(record.signals) && record.signals.length > 0;

      if (
        (kind === 'technical_flow' && hasFlow) ||
        (kind === 'technical_grid' && hasGrid) ||
        (kind === 'technical_waveform' && hasWaveform) ||
        (kind === 'technical_diagram' &&
          ((family === 'flow' && hasFlow) ||
            (family === 'grafcet' && hasFlow) ||
            (family === 'fast' && hasFlow) ||
            (family === 'grid' && hasGrid) ||
            (family === 'karnaugh' && hasGrid) ||
            (family === 'form' && hasGrid) ||
            (family === 'waveform' && hasWaveform) ||
            (family === 'timing' && hasWaveform)))
      ) {
        return record;
      }
    }

    return null;
  }

  private readCivilDiagramData(block: DraftBlock) {
    const data = this.asDraftBlockData(block);

    if (!data) {
      return null;
    }

    const candidates: unknown[] = [
      data,
      data.civilDiagram,
      data.diagram,
      data.payload,
    ];

    for (const candidate of candidates) {
      if (
        !candidate ||
        typeof candidate !== 'object' ||
        Array.isArray(candidate)
      ) {
        continue;
      }

      const record = candidate as Record<string, unknown>;
      const explicitCivilKind =
        this.readJsonString(record, 'kind') === 'civil_diagram' ||
        this.readJsonString(data, 'kind') === 'civil_diagram';
      const hasElements =
        Array.isArray(record.elements) && record.elements.length > 0;

      if (explicitCivilKind && hasElements) {
        return record;
      }
    }

    return null;
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
