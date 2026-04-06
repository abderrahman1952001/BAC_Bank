import type { AdminIngestionDraft, DraftVariantCode } from "@/lib/admin";
import {
  buildDraftBlockPreset,
  createDraftBlock,
  createDraftNode,
  moveDraftBlock,
  moveDraftNode,
  patchDraftBlock,
  removeDraftNodeTree,
  reparentDraftNode,
  sortNodes,
  updateDraftBlockData,
  updateDraftNodeBlocks,
  updateDraftVariantNodes,
  type DraftBlock,
  type DraftBlockPreset,
  type DraftNode,
} from "@/lib/admin-ingestion-structure";

function clampBlockInsertIndex(
  blocks: DraftBlock[],
  insertIndex: number | undefined,
) {
  if (!Number.isFinite(insertIndex)) {
    return blocks.length;
  }

  return Math.min(Math.max(Math.trunc(insertIndex as number), 0), blocks.length);
}

export function addDraftNodeCommand(options: {
  draft: AdminIngestionDraft;
  variantCode: DraftVariantCode;
  nodes: DraftNode[];
  parentId: string | null;
  makeNodeId: () => string;
}) {
  const { draft, variantCode, nodes, parentId, makeNodeId } = options;
  const parent = parentId ? (nodes.find((node) => node.id === parentId) ?? null) : null;
  const siblingCount = nodes.filter((node) => node.parentId === parentId).length;
  const nextNode = createDraftNode(makeNodeId(), parent, siblingCount);

  return {
    draft: updateDraftVariantNodes(draft, variantCode, (currentNodes) => [
      ...currentNodes,
      nextNode,
    ]),
    nextSelectedNodeId: nextNode.id,
    nextSelectedBlockId: null,
  };
}

export function removeDraftNodeCommand(options: {
  draft: AdminIngestionDraft;
  variantCode: DraftVariantCode;
  nodes: DraftNode[];
  selectedNode: DraftNode;
}) {
  const { draft, variantCode, nodes, selectedNode } = options;
  const remainingNodes = removeDraftNodeTree(nodes, selectedNode.id);
  const nextSelectedNodeId =
    selectedNode.parentId ?? sortNodes(remainingNodes)[0]?.id ?? null;

  return {
    draft: updateDraftVariantNodes(draft, variantCode, (currentNodes) =>
      removeDraftNodeTree(currentNodes, selectedNode.id),
    ),
    nextSelectedNodeId,
  };
}

export function moveDraftNodeCommand(options: {
  draft: AdminIngestionDraft;
  variantCode: DraftVariantCode;
  nodeId: string;
  direction: -1 | 1;
}) {
  const { draft, variantCode, nodeId, direction } = options;

  return updateDraftVariantNodes(draft, variantCode, (nodes) =>
    moveDraftNode(nodes, nodeId, direction),
  );
}

export function reparentDraftNodeCommand(options: {
  draft: AdminIngestionDraft;
  variantCode: DraftVariantCode;
  nodeId: string;
  nextParentId: string | null;
}) {
  const { draft, variantCode, nodeId, nextParentId } = options;

  return updateDraftVariantNodes(draft, variantCode, (nodes) =>
    reparentDraftNode(nodes, nodeId, nextParentId),
  );
}

export function addDraftBlockCommand(options: {
  draft: AdminIngestionDraft;
  variantCode: DraftVariantCode;
  nodeId: string;
  insertIndex?: number;
  makeBlockId: () => string;
}) {
  const { draft, variantCode, nodeId, insertIndex, makeBlockId } = options;
  const nextBlock = createDraftBlock(makeBlockId());

  return {
    draft: updateDraftVariantNodes(draft, variantCode, (nodes) =>
      updateDraftNodeBlocks(nodes, nodeId, (blocks) => {
        const nextInsertIndex = clampBlockInsertIndex(blocks, insertIndex);

        return [
          ...blocks.slice(0, nextInsertIndex),
          nextBlock,
          ...blocks.slice(nextInsertIndex),
        ];
      }),
    ),
    nextSelectedBlockId: nextBlock.id,
  };
}

export function moveDraftBlockCommand(options: {
  draft: AdminIngestionDraft;
  variantCode: DraftVariantCode;
  nodeId: string;
  blockId: string;
  direction: -1 | 1;
}) {
  const { draft, variantCode, nodeId, blockId, direction } = options;

  return updateDraftVariantNodes(draft, variantCode, (nodes) =>
    updateDraftNodeBlocks(nodes, nodeId, (blocks) =>
      moveDraftBlock(blocks, blockId, direction),
    ),
  );
}

export function removeDraftBlockCommand(options: {
  draft: AdminIngestionDraft;
  variantCode: DraftVariantCode;
  nodeId: string;
  blockId: string;
}) {
  const { draft, variantCode, nodeId, blockId } = options;

  return updateDraftVariantNodes(draft, variantCode, (nodes) =>
    updateDraftNodeBlocks(nodes, nodeId, (blocks) =>
      blocks.filter((block) => block.id !== blockId),
    ),
  );
}

export function updateDraftBlockCommand(options: {
  draft: AdminIngestionDraft;
  variantCode: DraftVariantCode;
  nodeId: string;
  blockId: string;
  patch: Partial<DraftBlock>;
}) {
  const { draft, variantCode, nodeId, blockId, patch } = options;

  return updateDraftVariantNodes(draft, variantCode, (nodes) =>
    updateDraftNodeBlocks(nodes, nodeId, (blocks) =>
      patchDraftBlock(blocks, blockId, patch),
    ),
  );
}

export function applyDraftBlockPresetCommand(options: {
  draft: AdminIngestionDraft;
  variantCode: DraftVariantCode;
  nodeId: string;
  blockId: string;
  preset: DraftBlockPreset;
}) {
  const { draft, variantCode, nodeId, blockId, preset } = options;

  return updateDraftBlockCommand({
    draft,
    variantCode,
    nodeId,
    blockId,
    patch: buildDraftBlockPreset(preset),
  });
}

export function updateDraftBlockDataCommand(options: {
  draft: AdminIngestionDraft;
  variantCode: DraftVariantCode;
  nodeId: string;
  blockId: string;
  nextData: Record<string, unknown> | null;
}) {
  const { draft, variantCode, nodeId, blockId, nextData } = options;

  return updateDraftVariantNodes(draft, variantCode, (nodes) =>
    updateDraftNodeBlocks(nodes, nodeId, (blocks) =>
      updateDraftBlockData(blocks, blockId, nextData),
    ),
  );
}
