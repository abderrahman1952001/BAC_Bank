import { BadRequestException } from '@nestjs/common';
import { ExamNodeType, ExamVariantCode, Prisma } from '@prisma/client';
import {
  examVariantRank,
  parseExerciseMetadata,
  parseQuestionMetadata,
} from './admin-domain-serialization';
import type { ExamNodeRow, QuestionNode } from './admin-domain-types';

export function orderQuestionsForAdmin(
  exerciseId: string,
  nodes: ExamNodeRow[],
) {
  const childrenByParent = buildChildrenByParent(nodes);

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

  const descendantIds = collectDescendantIds(exerciseId, childrenByParent);

  const questionNodes = nodes.filter(
    (node) =>
      descendantIds.has(node.id) &&
      (node.nodeType === ExamNodeType.QUESTION ||
        node.nodeType === ExamNodeType.SUBQUESTION),
  );

  return questionNodes.sort((left, right) => {
    const leftMetadata = parseQuestionMetadata(left.metadata, left);
    const rightMetadata = parseQuestionMetadata(right.metadata, right);

    const leftOrder =
      leftMetadata.adminOrder ??
      fallbackOrder.get(left.id) ??
      Number.MAX_SAFE_INTEGER;
    const rightOrder =
      rightMetadata.adminOrder ??
      fallbackOrder.get(right.id) ??
      Number.MAX_SAFE_INTEGER;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    const leftFallback = fallbackOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER;
    const rightFallback =
      fallbackOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER;

    if (leftFallback !== rightFallback) {
      return leftFallback - rightFallback;
    }

    return left.id.localeCompare(right.id);
  });
}

export function sortExercisesForAdmin<
  T extends {
    id: string;
    metadata: Prisma.JsonValue | null;
    orderIndex: number;
    variantCode?: ExamVariantCode;
  },
>(nodes: T[]) {
  return [...nodes].sort((left, right) => {
    const leftMetadata = parseExerciseMetadata(left.metadata);
    const rightMetadata = parseExerciseMetadata(right.metadata);

    const leftOrder = leftMetadata.adminOrder ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = rightMetadata.adminOrder ?? Number.MAX_SAFE_INTEGER;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    const variantDelta =
      examVariantRank(left.variantCode) - examVariantRank(right.variantCode);

    if (variantDelta !== 0) {
      return variantDelta;
    }

    if (left.orderIndex !== right.orderIndex) {
      return left.orderIndex - right.orderIndex;
    }

    return left.id.localeCompare(right.id);
  });
}

export function buildChildrenByParent<
  T extends { id: string; parentId: string | null },
>(nodes: T[]) {
  const map = new Map<string, T[]>();

  for (const node of nodes) {
    const key = node.parentId ?? '__ROOT__';
    const bucket = map.get(key) ?? [];
    bucket.push(node);
    map.set(key, bucket);
  }

  return map;
}

export function collectDescendantIds<
  T extends { id: string; parentId: string | null },
>(rootId: string, childrenByParent: Map<string, T[]>) {
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

export function nextSiblingOrder(
  nodes: ExamNodeRow[],
  parentId: string,
  excludeNodeId: string | null,
) {
  const siblings = nodes.filter(
    (node) => node.parentId === parentId && node.id !== excludeNodeId,
  );

  return siblings.reduce((max, node) => Math.max(max, node.orderIndex), 0) + 1;
}

export function validateHierarchy(nodes: QuestionNode[]) {
  const errors: string[] = [];
  const idSet = new Set(nodes.map((node) => node.id));

  for (const node of nodes) {
    if (node.parentId && !idSet.has(node.parentId)) {
      errors.push(
        `Question ${node.id} references missing parent ${node.parentId}.`,
      );
    }

    if (node.parentId && node.parentId === node.id) {
      errors.push(`Question ${node.id} cannot reference itself as parent.`);
    }

    if (!Number.isInteger(node.orderIndex) || node.orderIndex < 1) {
      errors.push(`Question ${node.id} has invalid order_index.`);
    }
  }

  const orderIndexes = nodes
    .map((node) => node.orderIndex)
    .sort((a, b) => a - b);

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

export function throwIfValidationFails(errors: string[]) {
  if (!errors.length) {
    return;
  }

  throw new BadRequestException({
    message: errors,
  });
}
