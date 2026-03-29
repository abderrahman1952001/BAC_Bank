import { ExamNodeType, ExamVariantCode, Prisma } from '@prisma/client';
import {
  orderQuestionsForAdmin,
  sortExercisesForAdmin,
  validateHierarchy,
} from './admin-domain-hierarchy';
import type { ExamNodeRow } from './admin-domain-types';

describe('admin-domain-hierarchy', () => {
  function makeNode(
    overrides: Partial<ExamNodeRow> & { id: string },
  ): ExamNodeRow {
    return {
      id: overrides.id,
      variantId: overrides.variantId ?? 'variant-1',
      parentId: overrides.parentId ?? null,
      nodeType: overrides.nodeType ?? ExamNodeType.QUESTION,
      orderIndex: overrides.orderIndex ?? 1,
      label: overrides.label ?? null,
      maxPoints: overrides.maxPoints ?? null,
      status: overrides.status ?? 'DRAFT',
      metadata: overrides.metadata ?? null,
      createdAt: overrides.createdAt ?? new Date('2025-01-01T00:00:00Z'),
      updatedAt: overrides.updatedAt ?? new Date('2025-01-01T00:00:00Z'),
      topicMappings: overrides.topicMappings ?? [],
      blocks: overrides.blocks ?? [],
    };
  }

  it('orders questions by admin metadata and falls back to tree traversal', () => {
    const exercise = makeNode({
      id: 'exercise-1',
      nodeType: ExamNodeType.EXERCISE,
    });
    const questionA = makeNode({
      id: 'question-a',
      parentId: 'exercise-1',
      nodeType: ExamNodeType.QUESTION,
      orderIndex: 2,
      metadata: {
        adminOrder: 2,
      } as Prisma.JsonObject,
    });
    const questionB = makeNode({
      id: 'question-b',
      parentId: 'exercise-1',
      nodeType: ExamNodeType.QUESTION,
      orderIndex: 1,
      metadata: null,
    });
    const subquestion = makeNode({
      id: 'subquestion-b1',
      parentId: 'question-b',
      nodeType: ExamNodeType.SUBQUESTION,
      orderIndex: 1,
      metadata: null,
    });

    expect(
      orderQuestionsForAdmin('exercise-1', [
        exercise,
        questionA,
        questionB,
        subquestion,
      ]).map((node) => node.id),
    ).toEqual(['question-b', 'subquestion-b1', 'question-a']);
  });

  it('sorts exercises by admin order then variant rank', () => {
    expect(
      sortExercisesForAdmin([
        {
          id: 'exercise-2',
          metadata: { adminOrder: 2 } as Prisma.JsonObject,
          orderIndex: 1,
          variantCode: ExamVariantCode.SUJET_2,
        },
        {
          id: 'exercise-1',
          metadata: { adminOrder: 1 } as Prisma.JsonObject,
          orderIndex: 2,
          variantCode: ExamVariantCode.SUJET_2,
        },
        {
          id: 'exercise-3',
          metadata: { adminOrder: 1 } as Prisma.JsonObject,
          orderIndex: 1,
          variantCode: ExamVariantCode.SUJET_1,
        },
      ]).map((node) => node.id),
    ).toEqual(['exercise-3', 'exercise-1', 'exercise-2']);
  });

  it('detects invalid question hierarchies', () => {
    expect(
      validateHierarchy([
        {
          id: 'question-1',
          orderIndex: 1,
          parentId: 'missing-parent',
        },
        {
          id: 'question-2',
          orderIndex: 1,
          parentId: 'question-2',
        },
      ]),
    ).toEqual([
      'Question question-1 references missing parent missing-parent.',
      'Question question-2 cannot reference itself as parent.',
      'Duplicate order_index detected in questions list.',
      'order_index values must be sequential starting at 1.',
      'Circular hierarchy detected at question question-2.',
    ]);
  });
});
