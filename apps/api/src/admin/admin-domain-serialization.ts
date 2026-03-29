import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  BlockType as PrismaBlockType,
  ExamNodeType,
  ExamVariantCode,
  Prisma,
  PublicationStatus,
  SessionType,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import type {
  AdminExamRecord,
  AdminExamSummary,
  AdminSessionType,
  AdminStatus,
  BlockType,
  ContentBlock,
  ExamNodeBlockRow,
  ExamNodeRow,
  ExerciseMetadata,
  QuestionMetadata,
  TopicMappingRow,
} from './admin-domain-types';

export function normalizeAdminExamRecord<
  T extends {
    id: string;
    year: number;
    sessionType: SessionType;
    isPublished: boolean;
    createdAt: Date;
    updatedAt: Date;
    stream: {
      code: string;
    };
    subject: {
      code: string;
    };
    paper: {
      id: string;
      familyCode: string;
      officialSourceReference: string | null;
      offerings: Array<{
        id: string;
      }>;
      variants: Array<{
        id: string;
        code: ExamVariantCode;
        title: string | null;
        status: PublicationStatus;
        nodes: Array<{
          id: string;
          variantId: string;
          parentId: string | null;
          nodeType: ExamNodeType;
          orderIndex: number;
          label: string | null;
          maxPoints: Prisma.Decimal | null;
          status: PublicationStatus;
          metadata: Prisma.JsonValue | null;
          createdAt: Date;
          updatedAt: Date;
          topicMappings: TopicMappingRow[];
        }>;
      }>;
    };
  },
>(exam: T): AdminExamRecord {
  return {
    ...exam,
    paperId: exam.paper.id,
    paperFamilyCode: exam.paper.familyCode,
    offeringCount: exam.paper.offerings.length,
    officialSourceReference: exam.paper.officialSourceReference,
    variants: exam.paper.variants,
  };
}

export function pickRepresentativeExamOffering<
  T extends {
    id: string;
    year: number;
    sessionType: SessionType;
    isPublished: boolean;
    createdAt: Date;
    updatedAt: Date;
    stream: {
      code: string;
    };
    subject: {
      code: string;
    };
    paper: {
      officialSourceReference: string | null;
      variants: unknown[];
      id?: string;
      familyCode?: string;
    };
  },
>(offerings: T[]) {
  const offering = offerings[0] ?? null;

  if (!offering) {
    throw new NotFoundException('No exam offering is linked to this paper.');
  }

  return offering;
}

export function pickRepresentativeExamId(offerings: Array<{ id: string }>) {
  const offering = offerings[0] ?? null;

  if (!offering) {
    throw new NotFoundException('No exam offering is linked to this paper.');
  }

  return offering.id;
}

export function derivePaperFamilyCode(streamCode: string, subjectCode: string) {
  return `${streamCode.trim().toUpperCase()}__${subjectCode
    .trim()
    .toUpperCase()}`;
}

export function mapExam(exam: AdminExamSummary) {
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
    session: fromSessionType(exam.sessionType),
    original_pdf_url: exam.officialSourceReference,
    status: exam.isPublished ? 'published' : 'draft',
    exercise_count: exerciseCount,
    question_count: questionCount,
    created_at: exam.createdAt,
    updated_at: exam.updatedAt,
  };
}

export function mapExerciseNode(
  node: {
    id: string;
    label: string | null;
    status: PublicationStatus;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
    topicMappings: TopicMappingRow[];
  },
  questionCount: number,
  orderIndex: number,
) {
  const metadata = parseExerciseMetadata(node.metadata);

  return {
    id: node.id,
    title: node.label,
    order_index: orderIndex,
    theme: metadata.theme ?? null,
    difficulty: metadata.difficulty ?? null,
    tags: metadata.tags ?? [],
    topics: mapAdminTopicTags(node.topicMappings),
    status: fromPublicationStatus(node.status),
    question_count: questionCount,
    created_at: node.createdAt,
    updated_at: node.updatedAt,
  };
}

export function mapNodeWithBlocks(node: {
  id: string;
  variantId: string;
  parentId: string | null;
  nodeType: ExamNodeType;
  orderIndex: number;
  label: string | null;
  maxPoints: Prisma.Decimal | null;
  status: PublicationStatus;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
  topicMappings: TopicMappingRow[];
  blocks: Array<{
    id: string;
    role: ExamNodeBlockRow['role'];
    orderIndex: number;
    blockType: PrismaBlockType;
    textValue: string | null;
    data: Prisma.JsonValue | null;
    media: {
      url: string;
      metadata: Prisma.JsonValue | null;
    } | null;
  }>;
}): ExamNodeRow {
  return {
    id: node.id,
    variantId: node.variantId,
    parentId: node.parentId,
    nodeType: node.nodeType,
    orderIndex: node.orderIndex,
    label: node.label,
    maxPoints: node.maxPoints,
    status: node.status,
    metadata: node.metadata,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    topicMappings: node.topicMappings,
    blocks: mapLoadedBlocks(node.blocks),
  };
}

export function mapLoadedBlocks(
  blocks: Array<{
    id: string;
    role: ExamNodeBlockRow['role'];
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

export function mapAdminTopicTags(
  mappings: TopicMappingRow[],
): Array<{ code: string; name: string }> {
  return [...mappings]
    .map((mapping) => ({
      code: mapping.topic.code,
      name: mapping.topic.studentLabel ?? mapping.topic.name,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function parseExerciseMetadata(
  raw: Prisma.JsonValue | null,
): ExerciseMetadata {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }

  const value = raw as Record<string, unknown>;
  const hierarchyRaw = value.hierarchyMeta;
  const hierarchy =
    hierarchyRaw &&
    typeof hierarchyRaw === 'object' &&
    !Array.isArray(hierarchyRaw)
      ? (hierarchyRaw as Record<string, unknown>)
      : undefined;

  return toExerciseMetadata({
    theme: readOptionalString(value.theme) ?? undefined,
    difficulty: readOptionalString(value.difficulty) ?? undefined,
    tags: readOptionalStringArray(value.tags),
    adminOrder:
      typeof value.adminOrder === 'number' && Number.isInteger(value.adminOrder)
        ? value.adminOrder
        : undefined,
    hierarchyMeta: hierarchy
      ? {
          year:
            typeof hierarchy.year === 'number' &&
            Number.isInteger(hierarchy.year)
              ? hierarchy.year
              : undefined,
          session: readOptionalString(hierarchy.session) ?? undefined,
          subject: readOptionalString(hierarchy.subject) ?? undefined,
          branch: readOptionalString(hierarchy.branch) ?? undefined,
          points:
            typeof hierarchy.points === 'number' &&
            Number.isFinite(hierarchy.points)
              ? hierarchy.points
              : undefined,
          contextBlocks: normalizeBlocks(hierarchy.contextBlocks),
        }
      : undefined,
  });
}

export function parseQuestionMetadata(
  raw: Prisma.JsonValue | null,
  question: Pick<ExamNodeRow, 'orderIndex' | 'label' | 'metadata'>,
): QuestionMetadata {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      title: question.label ?? `Question ${question.orderIndex}`,
    };
  }

  const value = raw as Record<string, unknown>;

  return toQuestionMetadata({
    title:
      readOptionalString(value.title) ??
      question.label ??
      `Question ${question.orderIndex}`,
    adminOrder:
      typeof value.adminOrder === 'number' && Number.isInteger(value.adminOrder)
        ? value.adminOrder
        : undefined,
    ...(Object.prototype.hasOwnProperty.call(value, 'contentBlocks')
      ? {
          contentBlocks: normalizeBlocks(value.contentBlocks),
        }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(value, 'solutionBlocks')
      ? {
          solutionBlocks: normalizeBlocks(value.solutionBlocks),
        }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(value, 'hintBlocks')
      ? {
          hintBlocks: normalizeNullableBlocks(value.hintBlocks),
        }
      : {}),
  });
}

export function toExerciseMetadata(input: ExerciseMetadata): ExerciseMetadata {
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
    ...(typeof input.adminOrder === 'number' &&
    Number.isInteger(input.adminOrder)
      ? {
          adminOrder: input.adminOrder,
        }
      : {}),
    ...(input.hierarchyMeta
      ? {
          hierarchyMeta: {
            ...input.hierarchyMeta,
            contextBlocks: normalizeBlocks(input.hierarchyMeta.contextBlocks),
          },
        }
      : {}),
  };
}

export function toQuestionMetadata(input: QuestionMetadata): QuestionMetadata {
  return {
    ...(input.title
      ? {
          title: input.title,
        }
      : {}),
    ...(typeof input.adminOrder === 'number' &&
    Number.isInteger(input.adminOrder)
      ? {
          adminOrder: input.adminOrder,
        }
      : {}),
    ...(input.contentBlocks !== undefined
      ? {
          contentBlocks: normalizeBlocks(input.contentBlocks),
        }
      : {}),
    ...(input.solutionBlocks !== undefined
      ? {
          solutionBlocks: normalizeBlocks(input.solutionBlocks),
        }
      : {}),
    ...(input.hintBlocks !== undefined
      ? {
          hintBlocks: normalizeNullableBlocks(input.hintBlocks),
        }
      : {}),
  };
}

export function mapNodeBlocksToContentBlocks(
  blocks: ExamNodeBlockRow[],
): ContentBlock[] {
  return [...blocks]
    .sort((left, right) => {
      if (left.role !== right.role) {
        return left.role.localeCompare(right.role);
      }

      return left.orderIndex - right.orderIndex;
    })
    .reduce<ContentBlock[]>((result, block, index) => {
      const type = fromPrismaBlockType(block.blockType);

      if (!type) {
        return result;
      }

      const level = readNumberField(block.data, 'level');
      const caption =
        readStringField(block.data, 'caption') ??
        readStringField(block.media?.metadata ?? null, 'caption');
      const language = readStringField(block.data, 'language');

      const value =
        type === 'image'
          ? (block.media?.url ??
            readStringField(block.data, 'url') ??
            block.textValue ??
            '')
          : (block.textValue ?? '');

      result.push({
        id: block.id || `block-${index + 1}`,
        type,
        value,
        data:
          block.data &&
          typeof block.data === 'object' &&
          !Array.isArray(block.data)
            ? (block.data as Record<string, unknown>)
            : null,
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
      });

      return result;
    }, []);
}

export function normalizeBlocks(value: unknown): ContentBlock[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<ContentBlock[]>((result, entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return result;
    }

    const raw = entry as Record<string, unknown>;
    const blockType = normalizeBlockType(raw.type);
    const blockValue = typeof raw.value === 'string' ? raw.value : '';

    if (!blockType) {
      return result;
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

    result.push({
      id: typeof raw.id === 'string' && raw.id ? raw.id : `block-${index + 1}`,
      type: blockType,
      value: blockValue,
      ...(raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)
        ? {
            data: raw.data as Record<string, unknown>,
          }
        : {}),
      ...(meta && Object.keys(meta).length
        ? {
            meta,
          }
        : {}),
    });

    return result;
  }, []);
}

export function normalizeNullableBlocks(
  value: unknown,
): ContentBlock[] | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return normalizeBlocks(value);
}

export function defaultBlocks(title: string): ContentBlock[] {
  return [
    {
      id: randomUUID(),
      type: 'heading',
      value: title,
    },
  ];
}

export function normalizeBlockType(value: unknown): BlockType | null {
  if (
    value !== 'paragraph' &&
    value !== 'latex' &&
    value !== 'image' &&
    value !== 'code' &&
    value !== 'heading' &&
    value !== 'table' &&
    value !== 'list' &&
    value !== 'graph' &&
    value !== 'tree'
  ) {
    return null;
  }

  return value;
}

export function toPrismaBlockType(value: BlockType): PrismaBlockType | null {
  if (value === 'paragraph') {
    return PrismaBlockType.PARAGRAPH;
  }

  if (value === 'latex') {
    return PrismaBlockType.LATEX;
  }

  if (value === 'image') {
    return PrismaBlockType.IMAGE;
  }

  if (value === 'table') {
    return PrismaBlockType.TABLE;
  }

  if (value === 'list') {
    return PrismaBlockType.LIST;
  }

  if (value === 'graph') {
    return PrismaBlockType.GRAPH;
  }

  if (value === 'tree') {
    return PrismaBlockType.TREE;
  }

  if (value === 'code') {
    return PrismaBlockType.CODE;
  }

  if (value === 'heading') {
    return PrismaBlockType.HEADING;
  }

  return null;
}

export function fromPrismaBlockType(value: PrismaBlockType): BlockType | null {
  if (value === PrismaBlockType.PARAGRAPH) {
    return 'paragraph';
  }

  if (value === PrismaBlockType.LATEX) {
    return 'latex';
  }

  if (value === PrismaBlockType.IMAGE) {
    return 'image';
  }

  if (value === PrismaBlockType.TABLE) {
    return 'table';
  }

  if (value === PrismaBlockType.LIST) {
    return 'list';
  }

  if (value === PrismaBlockType.GRAPH) {
    return 'graph';
  }

  if (value === PrismaBlockType.TREE) {
    return 'tree';
  }

  if (value === PrismaBlockType.CODE) {
    return 'code';
  }

  if (value === PrismaBlockType.HEADING) {
    return 'heading';
  }

  return 'paragraph';
}

export function toPublicationStatus(value: unknown): PublicationStatus {
  if (value === undefined || value === null || value === 'draft') {
    return PublicationStatus.DRAFT;
  }

  if (value === 'published') {
    return PublicationStatus.PUBLISHED;
  }

  throw new BadRequestException('status must be either draft or published.');
}

export function fromPublicationStatus(status: PublicationStatus): AdminStatus {
  return status === PublicationStatus.PUBLISHED ? 'published' : 'draft';
}

export function toSessionType(value: unknown): SessionType {
  if (value === 'normal') {
    return SessionType.NORMAL;
  }

  if (value === 'rattrapage') {
    return SessionType.MAKEUP;
  }

  throw new BadRequestException('session must be normal or rattrapage.');
}

export function fromSessionType(value: SessionType): AdminSessionType {
  return value === SessionType.MAKEUP ? 'rattrapage' : 'normal';
}

export function readOptionalExamVariantCode(
  value: unknown,
): ExamVariantCode | null {
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

export function defaultVariantTitle(code: ExamVariantCode): string {
  if (code === ExamVariantCode.SUJET_2) {
    return 'الموضوع الثاني';
  }

  return 'الموضوع الأول';
}

export function examVariantRank(code?: ExamVariantCode) {
  if (code === ExamVariantCode.SUJET_1) {
    return 1;
  }

  if (code === ExamVariantCode.SUJET_2) {
    return 2;
  }

  return 99;
}

export function validateExactIdSet(
  expected: string[],
  provided: string[],
  label: 'exercise' | 'question',
) {
  const expectedSet = new Set(expected);
  const providedSet = new Set(provided);

  if (
    expectedSet.size !== providedSet.size ||
    expectedSet.size !== expected.length
  ) {
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

export function readString(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new BadRequestException(`${fieldName} must be a non-empty string.`);
  }

  return value.trim();
}

export function readOptionalString(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException('Expected a string value.');
  }

  const trimmed = value.trim();
  return trimmed || null;
}

export function readInteger(value: unknown, fieldName: string) {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    !Number.isInteger(value)
  ) {
    throw new BadRequestException(`${fieldName} must be an integer.`);
  }

  return value;
}

export function readDecimal(value: unknown, fieldName: string) {
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

  if (
    !Number.isInteger(Math.round(scaled)) ||
    Math.abs(scaled - Math.round(scaled)) > 1e-9
  ) {
    throw new BadRequestException(
      `${fieldName} must be a non-negative number with up to 2 decimal places.`,
    );
  }

  return value;
}

export function readOptionalStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function readOptionalTopicCodes(payload: Record<string, unknown>) {
  const rawValue = Object.prototype.hasOwnProperty.call(payload, 'topic_codes')
    ? payload.topic_codes
    : Object.prototype.hasOwnProperty.call(payload, 'topicCodes')
      ? payload.topicCodes
      : undefined;

  if (rawValue === undefined) {
    return undefined;
  }

  return Array.from(
    new Set(
      readOptionalStringArray(rawValue).map((entry) => entry.toUpperCase()),
    ),
  );
}

export function readRequiredStringArray(value: unknown, fieldName: string) {
  if (!Array.isArray(value) || !value.length) {
    throw new BadRequestException(
      `${fieldName} must be a non-empty string array.`,
    );
  }

  return value.map((entry) => {
    if (typeof entry !== 'string' || !entry.trim()) {
      throw new BadRequestException(
        `${fieldName} must contain only non-empty strings.`,
      );
    }

    return entry.trim();
  });
}

export function readStringField(value: Prisma.JsonValue | null, field: string) {
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

export function readNumberField(value: Prisma.JsonValue | null, field: string) {
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

export function toJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
