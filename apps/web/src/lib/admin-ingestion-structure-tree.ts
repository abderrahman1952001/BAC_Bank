import type {
  AdminIngestionDraft,
  DraftBlockType,
  DraftVariantCode,
} from "@/lib/admin";
import type { ExamHierarchyBlock } from "@/lib/study-api";
import {
  isRecord,
  type DraftAsset,
  type DraftBlock,
  type DraftBlockPreset,
  type DraftNode,
  type DraftVariant,
} from "@/lib/admin-ingestion-structure-shared";

export function toPreviewBlockType(
  type: DraftBlockType,
): ExamHierarchyBlock["blockType"] {
  if (type === "heading") {
    return "HEADING";
  }

  if (type === "latex") {
    return "LATEX";
  }

  if (type === "image") {
    return "IMAGE";
  }

  if (type === "code") {
    return "CODE";
  }

  if (type === "table") {
    return "TABLE";
  }

  if (type === "list") {
    return "LIST";
  }

  if (type === "graph") {
    return "GRAPH";
  }

  if (type === "tree") {
    return "TREE";
  }

  return "PARAGRAPH";
}

export function defaultNodeType(parent: DraftNode | null): DraftNode["nodeType"] {
  if (!parent) {
    return "EXERCISE";
  }

  if (parent.nodeType === "QUESTION" || parent.nodeType === "SUBQUESTION") {
    return "SUBQUESTION";
  }

  return "QUESTION";
}

export function defaultNodeLabel(
  nodeType: DraftNode["nodeType"],
  siblingCount: number,
) {
  const index = siblingCount + 1;

  if (nodeType === "EXERCISE") {
    return `Exercise ${index}`;
  }

  if (nodeType === "PART") {
    return `Part ${index}`;
  }

  if (nodeType === "CONTEXT") {
    return `Context ${index}`;
  }

  if (nodeType === "SUBQUESTION") {
    return `Sub-question ${index}`;
  }

  return `Question ${index}`;
}

export function sortNodes(nodes: DraftNode[]) {
  return [...nodes].sort((left, right) => {
    if (left.orderIndex !== right.orderIndex) {
      return left.orderIndex - right.orderIndex;
    }

    return left.id.localeCompare(right.id);
  });
}

export function buildChildrenMap(nodes: DraftNode[]) {
  const map = new Map<string | null, DraftNode[]>();

  for (const node of nodes) {
    const bucket = map.get(node.parentId) ?? [];
    bucket.push(node);
    map.set(node.parentId, bucket);
  }

  for (const [key, bucket] of map.entries()) {
    map.set(key, sortNodes(bucket));
  }

  return map;
}

export function normalizeVariantNodes(nodes: DraftNode[]) {
  const orders = new Map<string, number>();
  const childrenByParent = buildChildrenMap(nodes);

  for (const bucket of childrenByParent.values()) {
    bucket.forEach((node, index) => {
      orders.set(node.id, index + 1);
    });
  }

  return nodes.map((node) => ({
    ...node,
    orderIndex: orders.get(node.id) ?? node.orderIndex,
  }));
}

export function updateDraftVariant(
  draft: AdminIngestionDraft,
  variantCode: DraftVariantCode,
  mutator: (variant: DraftVariant) => DraftVariant,
): AdminIngestionDraft {
  return {
    ...draft,
    variants: draft.variants.map((variant) =>
      variant.code === variantCode ? mutator(variant) : variant,
    ),
  };
}

export function updateDraftVariantNodes(
  draft: AdminIngestionDraft,
  variantCode: DraftVariantCode,
  mutator: (nodes: DraftNode[]) => DraftNode[],
): AdminIngestionDraft {
  return updateDraftVariant(draft, variantCode, (variant) => ({
    ...variant,
    nodes: normalizeVariantNodes(mutator(variant.nodes)),
  }));
}

export function patchDraftNode(
  nodes: DraftNode[],
  nodeId: string,
  patch: Partial<DraftNode>,
) {
  return nodes.map((node) =>
    node.id === nodeId
      ? {
          ...node,
          ...patch,
        }
      : node,
  );
}

export function updateDraftNodeBlocks(
  nodes: DraftNode[],
  nodeId: string,
  mutator: (blocks: DraftBlock[]) => DraftBlock[],
) {
  return nodes.map((node) =>
    node.id === nodeId
      ? {
          ...node,
          blocks: mutator(node.blocks),
        }
      : node,
  );
}

export function createDraftNode(
  id: string,
  parent: DraftNode | null,
  siblingCount: number,
): DraftNode {
  const nodeType = defaultNodeType(parent);

  return {
    id,
    nodeType,
    parentId: parent?.id ?? null,
    orderIndex: siblingCount + 1,
    label: defaultNodeLabel(nodeType, siblingCount),
    maxPoints: null,
    topicCodes: [],
    blocks: [],
  };
}

export function removeDraftNodeTree(nodes: DraftNode[], nodeId: string) {
  const childrenByParent = buildChildrenMap(nodes);
  const blockedIds = collectDescendants(childrenByParent, nodeId);

  return nodes.filter((node) => !blockedIds.has(node.id));
}

export function moveDraftNode(
  nodes: DraftNode[],
  nodeId: string,
  direction: -1 | 1,
) {
  const targetNode = nodes.find((node) => node.id === nodeId) ?? null;

  if (!targetNode) {
    return nodes;
  }

  const siblings = sortNodes(
    nodes.filter((node) => node.parentId === targetNode.parentId),
  );
  const sourceIndex = siblings.findIndex((node) => node.id === nodeId);
  const targetIndex = sourceIndex + direction;

  if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= siblings.length) {
    return nodes;
  }

  const nextSiblings = [...siblings];
  [nextSiblings[sourceIndex], nextSiblings[targetIndex]] = [
    nextSiblings[targetIndex],
    nextSiblings[sourceIndex],
  ];

  const orderById = new Map(
    nextSiblings.map((node, index) => [node.id, index + 1]),
  );

  return nodes.map((node) =>
    orderById.has(node.id)
      ? {
          ...node,
          orderIndex: orderById.get(node.id) ?? node.orderIndex,
        }
      : node,
  );
}

export function reparentDraftNode(
  nodes: DraftNode[],
  nodeId: string,
  nextParentId: string | null,
) {
  const parent = nextParentId
    ? (nodes.find((node) => node.id === nextParentId) ?? null)
    : null;
  const nextOrderIndex =
    nodes.filter((node) => node.parentId === nextParentId).length + 1;

  return nodes.map((node) =>
    node.id === nodeId
      ? {
          ...normalizeNodeAfterReparent(node, nextParentId, parent),
          orderIndex: nextOrderIndex,
        }
      : node,
  );
}

export function createDraftBlock(id: string): DraftBlock {
  return {
    id,
    role: "PROMPT",
    type: "paragraph",
    value: "",
    assetId: null,
    data: null,
  };
}

export function moveDraftBlock(
  blocks: DraftBlock[],
  blockId: string,
  direction: -1 | 1,
) {
  const sourceIndex = blocks.findIndex((block) => block.id === blockId);
  const targetIndex = sourceIndex + direction;

  if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= blocks.length) {
    return blocks;
  }

  const nextBlocks = [...blocks];
  [nextBlocks[sourceIndex], nextBlocks[targetIndex]] = [
    nextBlocks[targetIndex],
    nextBlocks[sourceIndex],
  ];

  return nextBlocks;
}

export function patchDraftBlock(
  blocks: DraftBlock[],
  blockId: string,
  patch: Partial<DraftBlock>,
) {
  return blocks.map((block) =>
    block.id === blockId
      ? {
          ...block,
          ...patch,
        }
      : block,
  );
}

export function buildDraftBlockPreset(
  preset: DraftBlockPreset,
): Partial<DraftBlock> {
  if (preset === "table") {
    return {
      type: "table",
      data: {
        rows: [
          ["Header 1", "Header 2"],
          ["Value 1", "Value 2"],
        ],
      },
    };
  }

  if (preset === "formula_graph") {
    return {
      type: "graph",
      value: "",
      data: {
        kind: "formula_graph",
        formulaGraph: {
          title: "Graph",
          xDomain: [-5, 5],
          yDomain: [-5, 5],
          curves: [
            {
              fn: "x",
              label: "f(x)",
            },
          ],
        },
      },
    };
  }

  return {
    type: "tree",
    value: "",
    data: {
      kind: "probability_tree",
      probabilityTree: {
        direction: "ltr",
        root: {
          label: "Start",
          children: [
            {
              label: "A",
              edgeLabel: "A",
              probability: "p",
            },
            {
              label: "B",
              edgeLabel: "B",
              probability: "1-p",
            },
          ],
        },
      },
    },
  };
}

export function updateDraftBlockData(
  blocks: DraftBlock[],
  blockId: string,
  nextData: Record<string, unknown> | null,
) {
  return patchDraftBlock(blocks, blockId, {
    data: nextData && Object.keys(nextData).length ? nextData : null,
  });
}

export function collectDescendants(
  childrenByParent: Map<string | null, DraftNode[]>,
  rootId: string,
) {
  const visited = new Set<string>();
  const stack = [rootId];

  while (stack.length > 0) {
    const current = stack.pop();

    if (!current || visited.has(current)) {
      continue;
    }

    visited.add(current);
    const children = childrenByParent.get(current) ?? [];
    for (const child of children) {
      stack.push(child.id);
    }
  }

  return visited;
}

export function normalizeNodeAfterReparent(
  node: DraftNode,
  nextParentId: string | null,
  parent: DraftNode | null,
): DraftNode {
  if (nextParentId === null) {
    if (node.nodeType === "QUESTION" || node.nodeType === "SUBQUESTION") {
      return {
        ...node,
        parentId: null,
        nodeType: "EXERCISE",
      };
    }

    return {
      ...node,
      parentId: null,
    };
  }

  if (node.nodeType === "EXERCISE") {
    return {
      ...node,
      parentId: nextParentId,
      nodeType: defaultNodeType(parent),
    };
  }

  return {
    ...node,
    parentId: nextParentId,
  };
}

export function buildPreviewBlocks(
  blocks: DraftBlock[],
  assetById: Map<string, DraftAsset>,
  assetPreviewBaseUrl: string,
): ExamHierarchyBlock[] {
  return blocks.map((block, index) => {
    const asset = block.assetId ? (assetById.get(block.assetId) ?? null) : null;
    const inferredKind =
      block.type === "graph"
        ? "formula_graph"
        : block.type === "tree"
          ? "probability_tree"
          : null;
    const data: Record<string, unknown> = {
      ...(isRecord(block.data) ? block.data : {}),
      ...(inferredKind &&
      (!isRecord(block.data) || typeof block.data.kind !== "string")
        ? {
            kind: inferredKind,
          }
        : {}),
      ...(block.meta?.language
        ? {
            language: block.meta.language,
          }
        : {}),
      ...(block.meta?.level !== undefined
        ? {
            level: block.meta.level,
          }
        : {}),
      ...(block.type === "image" && !asset && block.value
        ? {
            url: block.value,
          }
        : {}),
    };

    return {
      id: block.id,
      role: block.role,
      orderIndex: index + 1,
      blockType: toPreviewBlockType(block.type),
      textValue: block.value.trim().length ? block.value : null,
      data: Object.keys(data).length ? data : null,
      media: asset
        ? {
            id: asset.id,
            url: `${assetPreviewBaseUrl}/${asset.id}/preview`,
            type: "IMAGE",
            metadata: {
              label: asset.label,
              classification: asset.classification,
            },
          }
        : null,
    };
  });
}
