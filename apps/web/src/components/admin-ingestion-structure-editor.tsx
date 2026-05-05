"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AdminIngestionNativeToolPanel,
  AdminIngestionAssetToolPanel,
  AdminIngestionToolPanelShell,
} from "@/components/admin-ingestion-tool-panels";
import { AdminIngestionInspector } from "@/components/admin-ingestion-inspector";
import {
  AdminIngestionHierarchyTree,
  AdminIngestionRenderedPreview,
} from "@/components/admin-ingestion-structure-views";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type AdminIngestionDraft,
  type AdminIngestionValidationIssue,
  type DraftAssetClassification,
} from "@/lib/admin";
import {
  buildAssetReferenceById,
  buildBlockReferenceById,
  buildIssueCountById,
  buildNodeReferenceById,
  buildSelectedNodePath,
  filterAvailableTopics,
  type IngestionEditorFocusRequest,
} from "@/lib/admin-ingestion-editor-state";
import {
  applyNativeSuggestionToDraftBlock,
  buildChildrenMap,
  collectDescendants,
  readDraftSelectedStreamCodes,
  sanitizeLegacyReviewDraft,
  sortNodes,
  type DraftBlock,
} from "@/lib/admin-ingestion-structure";
import { useAdminIngestionStructureMutations } from "@/lib/admin-ingestion-structure-mutations";
import {
  useAdminIngestionStructureTools,
  type AdminIngestionStructureSourcePage,
} from "@/lib/admin-ingestion-structure-tools";
import { useAdminIngestionStructureSelection } from "@/lib/admin-ingestion-structure-selection";

type SourcePageEntry = AdminIngestionStructureSourcePage;

const ASSET_CLASSIFICATIONS: DraftAssetClassification[] = [
  "image",
  "table",
  "tree",
  "graph",
];

function makeClientId(prefix: string) {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function AdminIngestionStructureEditor({
  draft,
  sourcePages,
  assetPreviewBaseUrl,
  issues,
  focusRequest,
  onChange,
}: {
  draft: AdminIngestionDraft;
  sourcePages: SourcePageEntry[];
  assetPreviewBaseUrl: string;
  issues: AdminIngestionValidationIssue[];
  focusRequest: IngestionEditorFocusRequest | null;
  onChange: (nextDraft: AdminIngestionDraft) => void;
}) {
  const [pendingInspectorFocusBlockId, setPendingInspectorFocusBlockId] =
    useState<string | null>(null);

  useEffect(() => {
    const sanitizedDraft = sanitizeLegacyReviewDraft(draft);

    if (sanitizedDraft !== draft) {
      onChange(sanitizedDraft);
    }
  }, [draft, onChange]);

  const assetById = useMemo(
    () => new Map(draft.assets.map((asset) => [asset.id, asset])),
    [draft.assets],
  );
  const sourcePageById = useMemo(
    () => new Map(sourcePages.map((page) => [page.id, page])),
    [sourcePages],
  );
  const blockReferenceById = useMemo(
    () => buildBlockReferenceById(draft),
    [draft],
  );
  const nodeReferenceById = useMemo(
    () => buildNodeReferenceById(draft),
    [draft],
  );
  const assetReferenceById = useMemo(
    () =>
      buildAssetReferenceById({
        draft,
        assetById,
        blockReferenceById,
      }),
    [assetById, blockReferenceById, draft],
  );
  const nodeIssueCountById = useMemo(
    () => buildIssueCountById(issues, "nodeId"),
    [issues],
  );
  const blockIssueCountById = useMemo(
    () => buildIssueCountById(issues, "blockId"),
    [issues],
  );
  const assetIssueCountById = useMemo(
    () => buildIssueCountById(issues, "assetId"),
    [issues],
  );
  const {
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
  } = useAdminIngestionStructureSelection({
    draft,
    focusRequest,
    blockReferenceById,
    nodeReferenceById,
    assetReferenceById,
  });
  const sortedNodes = useMemo(
    () => (activeVariant ? sortNodes(activeVariant.nodes) : []),
    [activeVariant],
  );
  const childrenByParent = useMemo(
    () => buildChildrenMap(sortedNodes),
    [sortedNodes],
  );
  const nodeById = useMemo(
    () => new Map(sortedNodes.map((node) => [node.id, node])),
    [sortedNodes],
  );
  const selectedAsset =
    (selectedAssetId ? (assetById.get(selectedAssetId) ?? null) : null) ??
    (selectedBlock?.assetId
      ? (assetById.get(selectedBlock.assetId) ?? null)
      : null);
  const selectedDescendants = useMemo(
    () =>
      selectedNode
        ? collectDescendants(childrenByParent, selectedNode.id)
        : new Set<string>(),
    [childrenByParent, selectedNode],
  );
  const parentOptions = useMemo(
    () => sortedNodes.filter((node) => !selectedDescendants.has(node.id)),
    [selectedDescendants, sortedNodes],
  );
  const selectedNodePath = useMemo(
    () => buildSelectedNodePath(nodeById, selectedNode),
    [nodeById, selectedNode],
  );
  const selectedStreamCodes = useMemo(
    () => readDraftSelectedStreamCodes(draft.exam),
    [draft.exam],
  );
  const {
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
  } = useAdminIngestionStructureMutations({
    draft,
    activeVariant,
    selectedNode,
    onChange,
    onSelectNodeId: setSelectedNodeId,
    onSelectBlockId: setSelectedBlockId,
    makeClientId,
    confirmDeleteNode: () =>
      window.confirm("Delete this node and all of its descendants?"),
  });

  const {
    filters,
    activeToolPanel,
    activeToolPanelBusy,
    assetToolDraft,
    assetToolPage,
    assetToolPreviewCropBox,
    selectedAssetPage,
    previewCropBox,
    setLiveSelectedAssetCropBox,
    setLiveAssetToolCropBox,
    openAssetToolPanel,
    saveAssetToolDraft,
    focusNativeTools,
    closeAssetToolPanel,
    closeActiveToolPanel,
    handleSelectedAssetCropChange,
    handleSelectedAssetClassificationChange,
    handleSelectedAssetSourcePageChange,
    handleAssetToolCropChange,
    handleAssetToolClassificationChange,
    handleAssetToolSourcePageChange,
  } = useAdminIngestionStructureTools({
    draft,
    selectedVariantCode,
    selectedNode,
    selectedBlock,
    selectedAsset,
    assetById,
    sourcePages,
    sourcePageById,
    onChange,
    updateAsset,
    onSelectNodeId: setSelectedNodeId,
    onSelectBlockId: setSelectedBlockId,
    onSelectAssetId: setSelectedAssetId,
    onPendingInspectorScrollBlockIdChange: setPendingInspectorScrollBlockId,
    makeClientId,
  });
  const availableTopics = useMemo(
    () =>
      filterAvailableTopics({
        filters,
        subjectCode: draft.exam.subjectCode,
        selectedStreamCodes,
      }),
    [draft.exam.subjectCode, filters, selectedStreamCodes],
  );

  function applyNativeSuggestionToSelectedBlock() {
    if (
      !selectedNode ||
      !selectedBlock ||
      !selectedAsset?.nativeSuggestion ||
      selectedAsset.nativeSuggestion.status === "stale"
    ) {
      return;
    }

    onChange(
      applyNativeSuggestionToDraftBlock({
        draft,
        variantCode: selectedVariantCode,
        nodeId: selectedNode.id,
        blockId: selectedBlock.id,
        asset: selectedAsset,
      }),
    );
  }

  function handlePreviewAssetToolPanel(
    nodeId: string,
    blockId: string,
    block: DraftBlock,
    mode: "create" | "edit",
  ) {
    setSelectedNodeId(nodeId);
    setSelectedBlockId(blockId);
    setPendingInspectorScrollBlockId(blockId);
    openAssetToolPanel(block, mode);
  }

  function handlePreviewBlockInsert(nodeId: string, insertIndex: number) {
    const nextBlockId = addBlock({
      nodeId,
      insertIndex,
    });

    if (!nextBlockId) {
      return;
    }

    setPendingInspectorScrollBlockId(nextBlockId);
    setPendingInspectorFocusBlockId(nextBlockId);
  }

  if (!activeVariant) {
    return null;
  }

  return (
    <section className="admin-ingestion-editor" id="ingestion-structure-editor">
      <div className="admin-page-head ingestion-section-head">
        <div className="admin-page-intro">
          <h2>Structure Editor</h2>
          <div className="admin-page-meta-row">
            <span className="admin-page-meta-pill">
              <strong>{activeVariant.nodes.length}</strong> nodes
            </span>
            <span className="admin-page-meta-pill">{activeVariant.code}</span>
          </div>
        </div>
        <div className="block-item-actions">
          {draft.variants.map((variant) => (
            <Button
              key={variant.code}
              type="button"
              variant={variant.code === activeVariant.code ? "default" : "outline"}
              className="h-9 rounded-full px-4"
              onClick={() => {
                setSelectedVariantCode(variant.code);
              }}
            >
              {variant.code.replace("_", " ")}
            </Button>
          ))}
        </div>
      </div>

      <section className="admin-ingestion-editor-grid">
        <aside className="admin-tree-panel">
          <div className="admin-page-head ingestion-side-head">
            <h3>Hierarchy</h3>
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-full px-3"
              onClick={() => addNode(null)}
            >
              Add Root
            </Button>
          </div>

          <div className="admin-form-grid">
            <label className="field admin-form-wide">
              <span>Variant title</span>
              <Input
                value={activeVariant.title}
                onChange={(event) => {
                  updateVariant(activeVariant.code, (variant) => ({
                    ...variant,
                    title: event.target.value,
                  }));
                }}
              />
            </label>
          </div>

          <div className="block-item-actions">
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-full px-3"
              disabled={!selectedNode}
              onClick={() => addNode(selectedNode?.id ?? null)}
            >
              Add Child
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-full px-3"
              disabled={!selectedNode}
              onClick={() => addNode(selectedNode?.parentId ?? null)}
            >
              Add Sibling
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-full px-3"
              disabled={!selectedNode}
              onClick={() => moveSelectedNode(-1)}
            >
              Move Up
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-full px-3"
              disabled={!selectedNode}
              onClick={() => moveSelectedNode(1)}
            >
              Move Down
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-full px-3"
              disabled={!selectedNode}
              onClick={removeSelectedNode}
            >
              Delete
            </Button>
          </div>

          <div className="tree-root">
            {activeVariant.nodes.length ? (
              <AdminIngestionHierarchyTree
                rootNodes={childrenByParent.get(null) ?? []}
                childrenByParent={childrenByParent}
                selectedNodeId={selectedNodeId}
                collapsedNodeIds={collapsedNodeIds}
                nodeIssueCountById={nodeIssueCountById}
                onFocusNode={focusPreviewNode}
                onToggleCollapse={toggleCollapsedNode}
              />
            ) : (
              <p className="muted-text">
                This variant has no nodes yet. Add a root exercise to begin.
              </p>
            )}
          </div>
        </aside>

        <article className="admin-editor-panel ingestion-preview-panel">
          <div className="admin-page-head ingestion-side-head">
            <h3>Rendered Preview</h3>
          </div>

          <div className="ingestion-preview-surface">
            {childrenByParent.get(null)?.length ? (
              <AdminIngestionRenderedPreview
                rootNodes={childrenByParent.get(null) ?? []}
                childrenByParent={childrenByParent}
                assetById={assetById}
                assetPreviewBaseUrl={assetPreviewBaseUrl}
                selectedNodeId={selectedNodeId}
                selectedBlockId={selectedBlockId}
                blockIssueCountById={blockIssueCountById}
                assetIssueCountById={assetIssueCountById}
                onSelectNode={setSelectedNodeId}
                onSelectBlock={handlePreviewBlockSelect}
                onInsertBlock={handlePreviewBlockInsert}
                onFocusNativeTools={focusNativeTools}
                onOpenAssetToolPanel={handlePreviewAssetToolPanel}
              />
            ) : (
              <p className="muted-text">
                No root nodes to preview in this variant yet.
              </p>
            )}
          </div>
        </article>

        <article className="admin-editor-panel ingestion-inspector-panel">
          <AdminIngestionInspector
            selectedNode={selectedNode}
            selectedNodePath={selectedNodePath}
            selectedBlockId={selectedBlockId}
            pendingFocusBlockId={pendingInspectorFocusBlockId}
            parentOptions={parentOptions}
            availableTopics={availableTopics}
            subjectCode={draft.exam.subjectCode}
            selectedStreamCodes={selectedStreamCodes}
            assets={draft.assets}
            blockIssueCountById={blockIssueCountById}
            onPendingFocusBlockIdChange={setPendingInspectorFocusBlockId}
            onUpdateSelectedNodeFields={updateSelectedNodeFields}
            onReparentSelectedNode={reparentSelectedNode}
            onSelectBlock={setSelectedBlockId}
            onUpdateBlock={updateBlock}
            onMoveBlock={moveBlock}
            onRemoveBlock={removeBlock}
            onFocusNativeTools={focusNativeTools}
            onApplyBlockPreset={applyBlockPreset}
            onUpdateBlockData={updateBlockData}
            onOpenAssetToolPanel={openAssetToolPanel}
          />
        </article>
      </section>

      {activeToolPanel === "native" ? (
        <AdminIngestionToolPanelShell
          mode="native"
          title="Render Asset Natively"
          disabled={activeToolPanelBusy}
          onClose={closeActiveToolPanel}
        >
          <AdminIngestionNativeToolPanel
            selectedAssetPage={selectedAssetPage}
            selectedAsset={selectedAsset}
            selectedBlock={selectedBlock}
            previewCropBox={previewCropBox}
            assetPreviewBaseUrl={assetPreviewBaseUrl}
            assetClassifications={ASSET_CLASSIFICATIONS}
            sourcePages={sourcePages}
            onSelectedAssetCropPreviewChange={setLiveSelectedAssetCropBox}
            onSelectedAssetCropChange={handleSelectedAssetCropChange}
            onSelectedAssetClassificationChange={
              handleSelectedAssetClassificationChange
            }
            onSelectedAssetSourcePageChange={
              handleSelectedAssetSourcePageChange
            }
            onApplyNativeSuggestion={applyNativeSuggestionToSelectedBlock}
          />
        </AdminIngestionToolPanelShell>
      ) : null}

      {activeToolPanel === "asset" ? (
        <AdminIngestionToolPanelShell
          mode="asset"
          title={
            assetToolDraft?.mode === "edit"
              ? "Edit Linked Asset"
              : "Create Linked Asset"
          }
          disabled={activeToolPanelBusy}
          onClose={closeActiveToolPanel}
        >
          <AdminIngestionAssetToolPanel
            assetToolDraft={assetToolDraft}
            assetToolPage={assetToolPage}
            assetToolPreviewCropBox={assetToolPreviewCropBox}
            selectedBlock={selectedBlock}
            sourcePages={sourcePages}
            assetClassifications={ASSET_CLASSIFICATIONS}
            onAssetToolCropPreviewChange={setLiveAssetToolCropBox}
            onAssetToolCropChange={handleAssetToolCropChange}
            onAssetToolClassificationChange={
              handleAssetToolClassificationChange
            }
            onAssetToolSourcePageChange={handleAssetToolSourcePageChange}
            onSaveAssetToolDraft={saveAssetToolDraft}
            onCancel={closeAssetToolPanel}
          />
        </AdminIngestionToolPanelShell>
      ) : null}
    </section>
  );
}
