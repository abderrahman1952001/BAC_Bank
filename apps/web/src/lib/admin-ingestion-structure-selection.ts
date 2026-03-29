import { useEffect, useMemo, useState } from "react";
import type { AdminIngestionDraft, DraftVariantCode } from "@/lib/admin";
import {
  buildAssetReferenceById,
  buildBlockReferenceById,
  buildNodeReferenceById,
  resolveFocusRequestTargets,
  resolveFocusScrollTargetId,
  resolveSelectedBlockId,
  resolveSelectedNodeId,
  resolveSelectedVariantCode,
  toggleCollapsedNodeIds,
  type IngestionEditorFocusRequest,
} from "@/lib/admin-ingestion-editor-state";

type KeyedSelectedAssetState = {
  key: string | null;
  assetId: string | null;
};

function scrollToElement(elementId: string) {
  if (typeof document === "undefined") {
    return;
  }

  window.requestAnimationFrame(() => {
    document.getElementById(elementId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
}

export function useAdminIngestionStructureSelection(options: {
  draft: AdminIngestionDraft;
  focusRequest: IngestionEditorFocusRequest | null;
  blockReferenceById: ReturnType<typeof buildBlockReferenceById>;
  nodeReferenceById: ReturnType<typeof buildNodeReferenceById>;
  assetReferenceById: ReturnType<typeof buildAssetReferenceById>;
}) {
  const {
    draft,
    focusRequest,
    blockReferenceById,
    nodeReferenceById,
    assetReferenceById,
  } = options;
  const [selectedVariantCodeState, setSelectedVariantCodeState] =
    useState<DraftVariantCode>("SUJET_1");
  const [selectedNodeIdState, setSelectedNodeIdState] = useState<string | null>(
    null,
  );
  const [selectedBlockIdState, setSelectedBlockIdState] = useState<
    string | null
  >(null);
  const [selectedAssetState, setSelectedAssetState] =
    useState<KeyedSelectedAssetState>({
      key: null,
      assetId: null,
    });
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(
    new Set(),
  );
  const [pendingInspectorScrollBlockId, setPendingInspectorScrollBlockId] =
    useState<string | null>(null);

  const resolvedVariantCode = useMemo(
    () =>
      resolveSelectedVariantCode({
        variants: draft.variants,
        selectedVariantCode: selectedVariantCodeState,
      }),
    [draft.variants, selectedVariantCodeState],
  );
  const selectedVariantCode =
    resolvedVariantCode ?? draft.variants[0]?.code ?? selectedVariantCodeState;
  const activeVariant =
    draft.variants.find((variant) => variant.code === selectedVariantCode) ??
    draft.variants[0] ??
    null;
  const resolvedNodeId = useMemo(
    () =>
      resolveSelectedNodeId({
        activeVariant,
        selectedNodeId: selectedNodeIdState,
      }),
    [activeVariant, selectedNodeIdState],
  );
  const selectedNodeId = resolvedNodeId;
  const selectedNode =
    selectedNodeId && activeVariant
      ? (activeVariant.nodes.find((node) => node.id === selectedNodeId) ?? null)
      : null;
  const resolvedBlockId = useMemo(
    () =>
      resolveSelectedBlockId({
        selectedNode,
        selectedBlockId: selectedBlockIdState,
      }),
    [selectedBlockIdState, selectedNode],
  );
  const selectedBlockId = resolvedBlockId;
  const selectedBlock =
    selectedNode && selectedBlockId
      ? (selectedNode.blocks.find((block) => block.id === selectedBlockId) ??
        null)
      : null;
  const selectedAssetKey = selectedBlock?.id ?? "";
  const selectedAssetId =
    selectedAssetState.key === selectedAssetKey
      ? selectedAssetState.assetId
      : (selectedBlock?.assetId ?? null);

  useEffect(() => {
    if (!pendingInspectorScrollBlockId) {
      return;
    }

    const elementId = `inspector-block-${pendingInspectorScrollBlockId}`;

    window.requestAnimationFrame(() => {
      const element = document.getElementById(elementId);

      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        setPendingInspectorScrollBlockId(null);
      }
    });
  }, [pendingInspectorScrollBlockId, selectedBlockId, selectedNodeId]);

  useEffect(() => {
    if (!focusRequest) {
      return;
    }

    const targets = resolveFocusRequestTargets({
      focusRequest,
      blockReferenceById,
      nodeReferenceById,
      assetReferenceById,
    });

    if (!targets) {
      return;
    }

    const scrollTargetId = resolveFocusScrollTargetId({
      focusRequest,
      targets,
    });
    const frame = window.requestAnimationFrame(() => {
      if (targets.nextVariantCode) {
        setSelectedVariantCodeState(targets.nextVariantCode);
      }

      setSelectedNodeIdState(targets.nextNodeId);
      setSelectedBlockIdState(targets.nextBlockId);
      setSelectedAssetState({
        key: targets.nextBlockId ?? "",
        assetId: targets.nextAssetId,
      });

      if (scrollTargetId) {
        scrollToElement(scrollTargetId);
      }
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [assetReferenceById, blockReferenceById, focusRequest, nodeReferenceById]);

  function focusPreviewNode(nodeId: string) {
    setSelectedNodeIdState(nodeId);
    scrollToElement(`preview-node-${nodeId}`);
  }

  function toggleCollapsedNode(nodeId: string) {
    setCollapsedNodeIds((current) => toggleCollapsedNodeIds(current, nodeId));
  }

  function handlePreviewBlockSelect(nodeId: string, blockId: string) {
    setSelectedNodeIdState(nodeId);
    setSelectedBlockIdState(blockId);
    setPendingInspectorScrollBlockId(blockId);
  }

  function setSelectedVariantCode(nextSelectedVariantCode: DraftVariantCode) {
    setSelectedVariantCodeState(nextSelectedVariantCode);
  }

  function setSelectedNodeId(nextSelectedNodeId: string | null) {
    setSelectedNodeIdState(nextSelectedNodeId);
  }

  function setSelectedBlockId(nextSelectedBlockId: string | null) {
    setSelectedBlockIdState(nextSelectedBlockId);
  }

  function setSelectedAssetId(nextSelectedAssetId: string | null) {
    setSelectedAssetState({
      key: selectedAssetKey,
      assetId: nextSelectedAssetId,
    });
  }

  return {
    activeVariant,
    selectedVariantCode,
    setSelectedVariantCode,
    selectedNodeId,
    setSelectedNodeId,
    selectedNode,
    selectedBlockId,
    setSelectedBlockId,
    selectedBlock,
    selectedAssetId,
    setSelectedAssetId,
    collapsedNodeIds,
    setPendingInspectorScrollBlockId,
    focusPreviewNode,
    toggleCollapsedNode,
    handlePreviewBlockSelect,
  };
}
