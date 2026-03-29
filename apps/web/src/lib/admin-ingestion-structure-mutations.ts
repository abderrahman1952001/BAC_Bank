import type {
  AdminIngestionDraft,
  DraftAssetClassification,
  DraftVariantCode,
} from "@/lib/admin";
import {
  addDraftBlockCommand,
  addDraftNodeCommand,
  applyDraftBlockPresetCommand,
  moveDraftBlockCommand,
  moveDraftNodeCommand,
  removeDraftBlockCommand,
  removeDraftNodeCommand,
  reparentDraftNodeCommand,
  updateDraftBlockCommand,
  updateDraftBlockDataCommand,
} from "@/lib/admin-ingestion-structure-commands";
import {
  patchDraftNode,
  updateDraftAsset,
  updateDraftVariant,
  updateDraftVariantNodes,
  type DraftAsset,
  type DraftBlock,
  type DraftNode,
} from "@/lib/admin-ingestion-structure";

export function useAdminIngestionStructureMutations(options: {
  draft: AdminIngestionDraft;
  activeVariant: AdminIngestionDraft["variants"][number] | null;
  selectedNode: DraftNode | null;
  onChange: (nextDraft: AdminIngestionDraft) => void;
  onSelectNodeId: (nodeId: string | null) => void;
  onSelectBlockId: (blockId: string | null) => void;
  makeClientId: (prefix: string) => string;
  confirmDeleteNode: () => boolean;
}) {
  const {
    draft,
    activeVariant,
    selectedNode,
    onChange,
    onSelectNodeId,
    onSelectBlockId,
    makeClientId,
    confirmDeleteNode,
  } = options;

  function updateVariant(
    variantCode: DraftVariantCode,
    mutator: (
      variant: AdminIngestionDraft["variants"][number],
    ) => AdminIngestionDraft["variants"][number],
  ) {
    onChange(updateDraftVariant(draft, variantCode, mutator));
  }

  function updateSelectedNodeFields(patch: Partial<DraftNode>) {
    if (!activeVariant || !selectedNode) {
      return;
    }

    onChange(
      updateDraftVariantNodes(draft, activeVariant.code, (nodes) =>
        patchDraftNode(nodes, selectedNode.id, patch),
      ),
    );
  }

  function addNode(parentId: string | null) {
    if (!activeVariant) {
      return;
    }

    const result = addDraftNodeCommand({
      draft,
      variantCode: activeVariant.code,
      nodes: activeVariant.nodes,
      parentId,
      makeNodeId: () => makeClientId("node"),
    });

    onChange(result.draft);
    onSelectNodeId(result.nextSelectedNodeId);
    onSelectBlockId(result.nextSelectedBlockId);
  }

  function removeSelectedNode() {
    if (!activeVariant || !selectedNode || !confirmDeleteNode()) {
      return;
    }

    const result = removeDraftNodeCommand({
      draft,
      variantCode: activeVariant.code,
      nodes: activeVariant.nodes,
      selectedNode,
    });

    onChange(result.draft);
    onSelectNodeId(result.nextSelectedNodeId);
  }

  function moveSelectedNode(direction: -1 | 1) {
    if (!activeVariant || !selectedNode) {
      return;
    }

    onChange(
      moveDraftNodeCommand({
        draft,
        variantCode: activeVariant.code,
        nodeId: selectedNode.id,
        direction,
      }),
    );
  }

  function reparentSelectedNode(nextParentId: string | null) {
    if (!activeVariant || !selectedNode) {
      return;
    }

    onChange(
      reparentDraftNodeCommand({
        draft,
        variantCode: activeVariant.code,
        nodeId: selectedNode.id,
        nextParentId,
      }),
    );
  }

  function addBlock() {
    if (!activeVariant || !selectedNode) {
      return;
    }

    const result = addDraftBlockCommand({
      draft,
      variantCode: activeVariant.code,
      nodeId: selectedNode.id,
      makeBlockId: () => makeClientId("block"),
    });

    onChange(result.draft);
    onSelectBlockId(result.nextSelectedBlockId);
  }

  function moveBlock(blockId: string, direction: -1 | 1) {
    if (!activeVariant || !selectedNode) {
      return;
    }

    onChange(
      moveDraftBlockCommand({
        draft,
        variantCode: activeVariant.code,
        nodeId: selectedNode.id,
        blockId,
        direction,
      }),
    );
  }

  function removeBlock(blockId: string) {
    if (!activeVariant || !selectedNode) {
      return;
    }

    onChange(
      removeDraftBlockCommand({
        draft,
        variantCode: activeVariant.code,
        nodeId: selectedNode.id,
        blockId,
      }),
    );
  }

  function updateBlock(blockId: string, patch: Partial<DraftBlock>) {
    if (!activeVariant || !selectedNode) {
      return;
    }

    onChange(
      updateDraftBlockCommand({
        draft,
        variantCode: activeVariant.code,
        nodeId: selectedNode.id,
        blockId,
        patch,
      }),
    );
  }

  function applyBlockPreset(
    blockId: string,
    preset: "table" | "formula_graph" | "probability_tree",
  ) {
    if (!activeVariant || !selectedNode) {
      return;
    }

    onChange(
      applyDraftBlockPresetCommand({
        draft,
        variantCode: activeVariant.code,
        nodeId: selectedNode.id,
        blockId,
        preset,
      }),
    );
  }

  function updateBlockData(
    blockId: string,
    nextData: Record<string, unknown> | null,
  ) {
    if (!activeVariant || !selectedNode) {
      return;
    }

    onChange(
      updateDraftBlockDataCommand({
        draft,
        variantCode: activeVariant.code,
        nodeId: selectedNode.id,
        blockId,
        nextData,
      }),
    );
  }

  function updateAsset(assetId: string, patch: Partial<DraftAsset>) {
    onChange(updateDraftAsset(draft, assetId, patch));
  }

  function updateSelectedAssetClassification(
    assetId: string,
    classification: DraftAssetClassification,
  ) {
    updateAsset(assetId, {
      classification,
    });
  }

  return {
    updateVariant,
    updateSelectedNodeFields,
    addNode,
    removeSelectedNode,
    moveSelectedNode,
    reparentSelectedNode,
    addBlock,
    moveBlock,
    removeBlock,
    updateBlock,
    applyBlockPreset,
    updateBlockData,
    updateAsset,
    updateSelectedAssetClassification,
  };
}
