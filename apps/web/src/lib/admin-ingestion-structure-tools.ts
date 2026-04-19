import { useEffect, useMemo, useState } from "react";
import type {
  AdminFiltersResponse,
  AdminIngestionDraft,
  AdminIngestionRecoveryMode,
  DraftAssetClassification,
  DraftVariantCode,
} from "@/lib/admin";
import { fetchAdminJson, parseAdminFiltersResponse } from "@/lib/admin";
import {
  buildAssetToolDraft,
  makeDefaultAssetCropBox,
  makeDefaultSnippetCropBox,
  saveAssetToolDraftChanges,
  type AssetToolDraft,
} from "@/lib/admin-ingestion-structure-assets";
import type {
  DraftAsset,
  DraftBlock,
  DraftNode,
} from "@/lib/admin-ingestion-structure-shared";
import {
  createEmptyKeyedCropState,
  createEmptyKeyedRecoveryState,
  createEmptySnippetSourceState,
  resolveActiveToolPanel,
  resolveActiveToolPanelBusy,
  resolveAssetToolPreviewState,
  resolveSelectedAssetPreviewState,
  resolveSnippetToolState,
  updateKeyedRecoveryState,
  type AdminIngestionStructureSourcePage,
  type KeyedCropState,
  type KeyedRecoveryState,
  type KeyedSnippetSourceState,
} from "@/lib/admin-ingestion-structure-tools-state";
import type { CropBox } from "@/components/ingestion-crop-editor";

export {
  resolveActiveToolPanel,
  resolveActiveToolPanelBusy,
  resolveAssetToolPreviewState,
  resolveFallbackSnippetSourceState,
  resolveInitialSnippetSourceState,
  resolveSelectedAssetPreviewState,
  resolveSnippetToolState,
  shouldCloseActiveToolPanel,
  updateKeyedRecoveryState,
} from "@/lib/admin-ingestion-structure-tools-state";
export type { AdminIngestionStructureSourcePage } from "@/lib/admin-ingestion-structure-tools-state";

export function useAdminIngestionStructureTools(options: {
  draft: AdminIngestionDraft;
  selectedVariantCode: DraftVariantCode;
  selectedNode: DraftNode | null;
  selectedBlock: DraftBlock | null;
  selectedAsset: DraftAsset | null;
  assetById: Map<string, DraftAsset>;
  sourcePages: AdminIngestionStructureSourcePage[];
  sourcePageById: Map<string, AdminIngestionStructureSourcePage>;
  onChange: (nextDraft: AdminIngestionDraft) => void;
  updateAsset: (assetId: string, patch: Partial<DraftAsset>) => void;
  onSelectNodeId: (nodeId: string | null) => void;
  onSelectBlockId: (blockId: string | null) => void;
  onSelectAssetId: (assetId: string | null) => void;
  onPendingInspectorScrollBlockIdChange: (blockId: string | null) => void;
  makeClientId: (prefix: string) => string;
}) {
  const {
    draft,
    selectedVariantCode,
    selectedBlock,
    selectedAsset,
    assetById,
    sourcePages,
    sourcePageById,
    onChange,
    updateAsset,
    onSelectNodeId,
    onSelectBlockId,
    onSelectAssetId,
    onPendingInspectorScrollBlockIdChange,
    makeClientId,
  } = options;
  const [filters, setFilters] = useState<AdminFiltersResponse | null>(null);
  const [selectedAssetCropPreviewState, setSelectedAssetCropPreviewState] =
    useState<KeyedCropState>(createEmptyKeyedCropState());
  const [recoveryState, setRecoveryState] = useState<KeyedRecoveryState>(
    createEmptyKeyedRecoveryState(),
  );
  const [snippetSourceState, setSnippetSourceState] =
    useState<KeyedSnippetSourceState>(createEmptySnippetSourceState());
  const [liveSnippetCropPreviewState, setLiveSnippetCropPreviewState] =
    useState<KeyedCropState>(createEmptyKeyedCropState());
  const [snippetAction, setSnippetAction] = useState<
    "replace" | "append" | "insert_below"
  >("replace");
  const [snippetRecoveryState, setSnippetRecoveryState] =
    useState<KeyedRecoveryState>(createEmptyKeyedRecoveryState());
  const [assetToolDraft, setAssetToolDraft] = useState<AssetToolDraft | null>(
    null,
  );
  const [assetToolCropPreviewState, setAssetToolCropPreviewState] =
    useState<KeyedCropState>(createEmptyKeyedCropState());
  const [activeToolPanelState, setActiveToolPanel] = useState<
    "snippet" | "native" | "asset" | null
  >(null);
  const recoveryKey = `${selectedBlock?.id ?? ""}:${selectedAsset?.id ?? ""}`;
  const snippetKey = selectedBlock?.id ?? "";
  const snippetSourceKey = `${selectedBlock?.id ?? ""}:${selectedAsset?.sourcePageId ?? sourcePages[0]?.id ?? ""}`;

  useEffect(() => {
    const controller = new AbortController();

    void fetchAdminJson<AdminFiltersResponse>(
      "/filters",
      {
        signal: controller.signal,
      },
      parseAdminFiltersResponse,
    )
      .then((payload) => {
        setFilters(payload);
      })
      .catch(() => undefined);

    return () => {
      controller.abort();
    };
  }, []);
  const activeToolPanel = resolveActiveToolPanel({
    activeToolPanelState,
    hasSelectedBlock: Boolean(selectedBlock),
    hasSelectedAsset: Boolean(selectedAsset),
    hasAssetToolDraft: Boolean(assetToolDraft),
  });
  const activeToolPanelBusy = useMemo(
    () =>
      resolveActiveToolPanelBusy({
        activeToolPanel,
        snippetRecoveryMode:
          snippetRecoveryState.key === snippetKey
            ? snippetRecoveryState.mode
            : null,
        recoveryMode: recoveryState.key === recoveryKey ? recoveryState.mode : null,
      }),
    [activeToolPanel, recoveryKey, recoveryState, snippetKey, snippetRecoveryState],
  );

  useEffect(() => {
    if (!activeToolPanel || typeof document === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !activeToolPanelBusy) {
        setActiveToolPanel(null);
        setAssetToolDraft(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeToolPanel, activeToolPanelBusy]);
  const {
    snippetSourcePageId,
    snippetSourcePage,
    snippetCropBox,
    previewSnippetCropBox,
  } = useMemo(
    () =>
      resolveSnippetToolState({
        selectedAssetSourcePageId: selectedAsset?.sourcePageId ?? null,
        snippetSourceState,
        snippetSourceKey,
        liveSnippetCropPreviewState,
        sourcePages,
        sourcePageById,
      }),
    [
      liveSnippetCropPreviewState,
      selectedAsset?.sourcePageId,
      snippetSourceKey,
      snippetSourceState,
      sourcePageById,
      sourcePages,
    ],
  );
  const { selectedAssetKey, selectedAssetPage, previewCropBox } = useMemo(
    () =>
      resolveSelectedAssetPreviewState({
        selectedAsset,
        selectedAssetCropPreviewState,
        sourcePageById,
      }),
    [selectedAsset, selectedAssetCropPreviewState, sourcePageById],
  );
  const { assetToolKey, assetToolPage, assetToolPreviewCropBox } = useMemo(
    () =>
      resolveAssetToolPreviewState({
        assetToolDraft,
        assetToolCropPreviewState,
        sourcePageById,
      }),
    [assetToolCropPreviewState, assetToolDraft, sourcePageById],
  );

  function openAssetToolPanel(block: DraftBlock, mode: "create" | "edit") {
    const nextAssetToolDraft = buildAssetToolDraft({
      block,
      mode,
      assetById,
      selectedVariantCode,
      sourcePages,
      sourcePageById,
    });

    if (!nextAssetToolDraft) {
      return;
    }

    onSelectBlockId(block.id);
    onSelectAssetId(nextAssetToolDraft.assetId);
    setAssetToolDraft(nextAssetToolDraft);
    setAssetToolCropPreviewState(createEmptyKeyedCropState());
    setActiveToolPanel("asset");
  }

  function closeAssetToolPanel() {
    setAssetToolDraft(null);
    setAssetToolCropPreviewState(createEmptyKeyedCropState());
    setActiveToolPanel(null);
  }

  function saveAssetToolDraft() {
    if (!assetToolDraft || !assetToolPage) {
      return;
    }

    const result = saveAssetToolDraftChanges({
      draft,
      assetToolDraft,
      assetToolPage,
      assetById,
      nextAssetId: makeClientId("asset"),
    });

    if (!result) {
      return;
    }

    onChange(result.draft);
    onSelectAssetId(result.assetId);
    closeAssetToolPanel();
  }

  function focusSnippetTools(nodeId: string, blockId: string, assetId: string | null) {
    onSelectNodeId(nodeId);
    onSelectBlockId(blockId);
    onSelectAssetId(assetId);
    onPendingInspectorScrollBlockIdChange(blockId);
    setAssetToolDraft(null);
    setAssetToolCropPreviewState(createEmptyKeyedCropState());
    setActiveToolPanel("snippet");
  }

  function focusNativeTools(nodeId: string, blockId: string, assetId: string) {
    onSelectNodeId(nodeId);
    onSelectBlockId(blockId);
    onSelectAssetId(assetId);
    onPendingInspectorScrollBlockIdChange(blockId);
    setAssetToolDraft(null);
    setAssetToolCropPreviewState(createEmptyKeyedCropState());
    setActiveToolPanel("native");
  }

  function closeActiveToolPanel() {
    if (activeToolPanelBusy) {
      return;
    }

    if (activeToolPanel === "asset") {
      closeAssetToolPanel();
      return;
    }

    setAssetToolDraft(null);
    setAssetToolCropPreviewState(createEmptyKeyedCropState());
    setActiveToolPanel(null);
  }

  function handleSnippetSourcePageChange(sourcePageId: string) {
    const nextPage = sourcePageById.get(sourcePageId) ?? null;

    setSnippetSourceState({
      key: snippetSourceKey,
      sourcePageId: sourcePageId || null,
      cropBox: nextPage ? makeDefaultSnippetCropBox(nextPage) : null,
    });
    setLiveSnippetCropPreviewState(createEmptyKeyedCropState());
  }

  function handleSelectedAssetCropChange(nextCropBox: CropBox) {
    if (!selectedAsset) {
      return;
    }

    setSelectedAssetCropPreviewState({
      ...createEmptyKeyedCropState(),
    });
    updateAsset(selectedAsset.id, {
      cropBox: nextCropBox,
    });
  }

  function handleSelectedAssetClassificationChange(
    classification: DraftAssetClassification,
  ) {
    if (!selectedAsset) {
      return;
    }

    updateAsset(selectedAsset.id, {
      classification,
    });
  }

  function handleSelectedAssetSourcePageChange(sourcePageId: string) {
    if (!selectedAsset) {
      return;
    }

    const nextPage = sourcePageById.get(sourcePageId) ?? null;

    setSelectedAssetCropPreviewState({
      ...createEmptyKeyedCropState(),
    });
    updateAsset(selectedAsset.id, {
      sourcePageId,
      documentKind:
        nextPage?.documentKind === "correction" ? "CORRECTION" : "EXAM",
      pageNumber: nextPage?.page_number ?? selectedAsset.pageNumber,
    });
  }

  function handleAssetToolCropChange(nextCropBox: CropBox) {
    setAssetToolCropPreviewState(createEmptyKeyedCropState());
    setAssetToolDraft((current) =>
      current
        ? {
            ...current,
            cropBox: nextCropBox,
          }
        : current,
    );
  }

  function handleAssetToolClassificationChange(
    classification: DraftAssetClassification,
  ) {
    setAssetToolDraft((current) =>
      current
        ? {
            ...current,
            classification,
          }
        : current,
    );
  }

  function handleAssetToolSourcePageChange(sourcePageId: string) {
    const nextPage = sourcePageById.get(sourcePageId) ?? null;

    if (!nextPage) {
      return;
    }

    setAssetToolCropPreviewState(createEmptyKeyedCropState());
    setAssetToolDraft((current) =>
      current
        ? {
            ...current,
            sourcePageId: nextPage.id,
            cropBox: makeDefaultAssetCropBox(nextPage),
          }
        : current,
    );
  }

  function setLiveSelectedAssetCropBox(cropBox: CropBox | null) {
    setSelectedAssetCropPreviewState({
      key: selectedAssetKey,
      cropBox,
    });
  }

  function setRecoveryMode(mode: AdminIngestionRecoveryMode | null) {
    setRecoveryState((current) => ({
      ...updateKeyedRecoveryState({
        current,
        key: recoveryKey,
        patch: {
          mode,
        },
      }),
    }));
  }

  function setRecoveryError(error: string | null) {
    setRecoveryState((current) => ({
      ...updateKeyedRecoveryState({
        current,
        key: recoveryKey,
        patch: {
          error,
        },
      }),
    }));
  }

  function setRecoveryNotice(notice: string | null) {
    setRecoveryState((current) => ({
      ...updateKeyedRecoveryState({
        current,
        key: recoveryKey,
        patch: {
          notice,
        },
      }),
    }));
  }

  function setRecoveryNotes(notes: string[]) {
    setRecoveryState((current) => ({
      ...updateKeyedRecoveryState({
        current,
        key: recoveryKey,
        patch: {
          notes,
        },
      }),
    }));
  }

  function setSnippetCropBox(cropBox: CropBox | null) {
    setSnippetSourceState({
      key: snippetSourceKey,
      sourcePageId: snippetSourcePageId,
      cropBox,
    });
  }

  function setLiveSnippetCropBox(cropBox: CropBox | null) {
    setLiveSnippetCropPreviewState({
      key: snippetSourcePageId,
      cropBox,
    });
  }

  function setSnippetRecoveryMode(mode: AdminIngestionRecoveryMode | null) {
    setSnippetRecoveryState((current) => ({
      ...updateKeyedRecoveryState({
        current,
        key: snippetKey,
        patch: {
          mode,
        },
      }),
    }));
  }

  function setSnippetRecoveryError(error: string | null) {
    setSnippetRecoveryState((current) => ({
      ...updateKeyedRecoveryState({
        current,
        key: snippetKey,
        patch: {
          error,
        },
      }),
    }));
  }

  function setSnippetRecoveryNotice(notice: string | null) {
    setSnippetRecoveryState((current) => ({
      ...updateKeyedRecoveryState({
        current,
        key: snippetKey,
        patch: {
          notice,
        },
      }),
    }));
  }

  function setSnippetRecoveryNotes(notes: string[]) {
    setSnippetRecoveryState((current) => ({
      ...updateKeyedRecoveryState({
        current,
        key: snippetKey,
        patch: {
          notes,
        },
      }),
    }));
  }

  function setLiveAssetToolCropBox(cropBox: CropBox | null) {
    setAssetToolCropPreviewState({
      key: assetToolKey,
      cropBox,
    });
  }

  return {
    filters,
    activeToolPanel,
    activeToolPanelBusy,
    recoveryMode: recoveryState.key === recoveryKey ? recoveryState.mode : null,
    recoveryError: recoveryState.key === recoveryKey ? recoveryState.error : null,
    recoveryNotice:
      recoveryState.key === recoveryKey ? recoveryState.notice : null,
    recoveryNotes: recoveryState.key === recoveryKey ? recoveryState.notes : [],
    snippetSourcePageId,
    snippetSourcePage,
    snippetCropBox,
    previewSnippetCropBox,
    snippetAction,
    snippetRecoveryMode:
      snippetRecoveryState.key === snippetKey ? snippetRecoveryState.mode : null,
    snippetRecoveryError:
      snippetRecoveryState.key === snippetKey ? snippetRecoveryState.error : null,
    snippetRecoveryNotice:
      snippetRecoveryState.key === snippetKey
        ? snippetRecoveryState.notice
        : null,
    snippetRecoveryNotes:
      snippetRecoveryState.key === snippetKey ? snippetRecoveryState.notes : [],
    assetToolDraft,
    assetToolPage,
    assetToolPreviewCropBox,
    selectedAssetPage,
    previewCropBox,
    setLiveSelectedAssetCropBox,
    setRecoveryMode,
    setRecoveryError,
    setRecoveryNotice,
    setRecoveryNotes,
    setSnippetCropBox,
    setLiveSnippetCropBox,
    setSnippetAction,
    setSnippetRecoveryMode,
    setSnippetRecoveryError,
    setSnippetRecoveryNotice,
    setSnippetRecoveryNotes,
    setLiveAssetToolCropBox,
    openAssetToolPanel,
    saveAssetToolDraft,
    focusSnippetTools,
    focusNativeTools,
    closeAssetToolPanel,
    closeActiveToolPanel,
    handleSnippetSourcePageChange,
    handleSelectedAssetCropChange,
    handleSelectedAssetClassificationChange,
    handleSelectedAssetSourcePageChange,
    handleAssetToolCropChange,
    handleAssetToolClassificationChange,
    handleAssetToolSourcePageChange,
  };
}
