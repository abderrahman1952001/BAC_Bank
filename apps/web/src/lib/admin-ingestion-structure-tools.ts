import { useEffect, useMemo, useState } from "react";
import type {
  AdminFiltersResponse,
  AdminIngestionDraft,
  AdminIngestionRecoveryMode,
  DraftAssetClassification,
  DraftVariantCode,
} from "@/lib/admin";
import { fetchAdminJson } from "@/lib/admin";
import {
  buildAssetToolDraft,
  makeDefaultAssetCropBox,
  makeDefaultSnippetCropBox,
  saveAssetToolDraftChanges,
  type AssetToolDraft,
  type DraftAsset,
  type DraftBlock,
  type DraftNode,
} from "@/lib/admin-ingestion-structure";
import type { CropBox } from "@/components/ingestion-crop-editor";

export type AdminIngestionStructureSourcePage = {
  id: string;
  documentId: string;
  documentKind: "exam" | "correction";
  page_number: number;
  width: number;
  height: number;
  image_url: string;
};

type KeyedCropState = {
  key: string | null;
  cropBox: CropBox | null;
};

type KeyedSnippetSourceState = {
  key: string | null;
  sourcePageId: string | null;
  cropBox: CropBox | null;
};

type KeyedRecoveryState = {
  key: string | null;
  mode: AdminIngestionRecoveryMode | null;
  error: string | null;
  notice: string | null;
  notes: string[];
};

export function resolveActiveToolPanelBusy(options: {
  activeToolPanel: "snippet" | "native" | "asset" | null;
  snippetRecoveryMode: AdminIngestionRecoveryMode | null;
  recoveryMode: AdminIngestionRecoveryMode | null;
}) {
  const { activeToolPanel, snippetRecoveryMode, recoveryMode } = options;

  return activeToolPanel === "snippet"
    ? snippetRecoveryMode !== null
    : activeToolPanel === "native"
      ? recoveryMode !== null
      : false;
}

export function resolveInitialSnippetSourceState(options: {
  selectedAssetSourcePageId: string | null;
  sourcePages: AdminIngestionStructureSourcePage[];
  sourcePageById: Map<string, AdminIngestionStructureSourcePage>;
}) {
  const { selectedAssetSourcePageId, sourcePages, sourcePageById } = options;
  const sourcePageId = selectedAssetSourcePageId ?? sourcePages[0]?.id ?? null;

  if (!sourcePageId) {
    return {
      sourcePageId: null,
      cropBox: null,
    };
  }

  const page = sourcePageById.get(sourcePageId) ?? null;

  return {
    sourcePageId,
    cropBox: page ? makeDefaultSnippetCropBox(page) : null,
  };
}

export function resolveFallbackSnippetSourceState(options: {
  snippetSourcePageId: string | null;
  sourcePages: AdminIngestionStructureSourcePage[];
  sourcePageById: Map<string, AdminIngestionStructureSourcePage>;
}) {
  const { snippetSourcePageId, sourcePages, sourcePageById } = options;

  if (!snippetSourcePageId || sourcePageById.has(snippetSourcePageId)) {
    return null;
  }

  const fallbackPageId = sourcePages[0]?.id ?? null;

  if (!fallbackPageId) {
    return {
      sourcePageId: null,
      cropBox: null,
    };
  }

  const page = sourcePageById.get(fallbackPageId) ?? null;

  return {
    sourcePageId: fallbackPageId,
    cropBox: page ? makeDefaultSnippetCropBox(page) : null,
  };
}

export function shouldCloseActiveToolPanel(options: {
  activeToolPanel: "snippet" | "native" | "asset" | null;
  hasSelectedBlock: boolean;
  hasSelectedAsset: boolean;
  hasAssetToolDraft: boolean;
}) {
  const {
    activeToolPanel,
    hasSelectedBlock,
    hasSelectedAsset,
    hasAssetToolDraft,
  } = options;

  if (activeToolPanel === "snippet") {
    return !hasSelectedBlock;
  }

  if (activeToolPanel === "native") {
    return !hasSelectedBlock || !hasSelectedAsset;
  }

  if (activeToolPanel === "asset") {
    return !hasAssetToolDraft;
  }

  return false;
}

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
    useState<KeyedCropState>({
      key: null,
      cropBox: null,
    });
  const [recoveryState, setRecoveryState] = useState<KeyedRecoveryState>({
    key: null,
    mode: null,
    error: null,
    notice: null,
    notes: [],
  });
  const [snippetSourceState, setSnippetSourceState] =
    useState<KeyedSnippetSourceState>({
      key: null,
      sourcePageId: null,
      cropBox: null,
    });
  const [liveSnippetCropPreviewState, setLiveSnippetCropPreviewState] =
    useState<KeyedCropState>({
      key: null,
      cropBox: null,
    });
  const [snippetAction, setSnippetAction] = useState<
    "replace" | "append" | "insert_below"
  >("replace");
  const [snippetRecoveryState, setSnippetRecoveryState] =
    useState<KeyedRecoveryState>({
      key: null,
      mode: null,
      error: null,
      notice: null,
      notes: [],
    });
  const [assetToolDraft, setAssetToolDraft] = useState<AssetToolDraft | null>(
    null,
  );
  const [assetToolCropPreviewState, setAssetToolCropPreviewState] =
    useState<KeyedCropState>({
      key: null,
      cropBox: null,
    });
  const [activeToolPanelState, setActiveToolPanel] = useState<
    "snippet" | "native" | "asset" | null
  >(null);
  const selectedAssetKey = `${selectedAsset?.id ?? ""}:${selectedAsset?.sourcePageId ?? ""}`;
  const recoveryKey = `${selectedBlock?.id ?? ""}:${selectedAsset?.id ?? ""}`;
  const snippetKey = selectedBlock?.id ?? "";
  const snippetSourceKey = `${selectedBlock?.id ?? ""}:${selectedAsset?.sourcePageId ?? sourcePages[0]?.id ?? ""}`;

  useEffect(() => {
    const controller = new AbortController();

    void fetchAdminJson<AdminFiltersResponse>("/filters", {
      signal: controller.signal,
    })
      .then((payload) => {
        setFilters(payload);
      })
      .catch(() => undefined);

    return () => {
      controller.abort();
    };
  }, []);
  const activeToolPanel = shouldCloseActiveToolPanel({
    activeToolPanel: activeToolPanelState,
    hasSelectedBlock: Boolean(selectedBlock),
    hasSelectedAsset: Boolean(selectedAsset),
    hasAssetToolDraft: Boolean(assetToolDraft),
  })
    ? null
    : activeToolPanelState;
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
  const defaultSnippetSourceState = useMemo(
    () =>
      resolveInitialSnippetSourceState({
        selectedAssetSourcePageId: selectedAsset?.sourcePageId ?? null,
        sourcePages,
        sourcePageById,
      }),
    [selectedAsset?.sourcePageId, sourcePageById, sourcePages],
  );
  const resolvedSnippetSourceState =
    snippetSourceState.key === snippetSourceKey
      ? {
          sourcePageId: snippetSourceState.sourcePageId,
          cropBox: snippetSourceState.cropBox,
        }
      : defaultSnippetSourceState;
  const fallbackSnippetSourceState = resolveFallbackSnippetSourceState({
    snippetSourcePageId: resolvedSnippetSourceState.sourcePageId,
    sourcePages,
    sourcePageById,
  });
  const snippetSourcePageId =
    fallbackSnippetSourceState?.sourcePageId ??
    resolvedSnippetSourceState.sourcePageId;
  const snippetCropBox =
    fallbackSnippetSourceState?.cropBox ?? resolvedSnippetSourceState.cropBox;
  const snippetSourcePage = snippetSourcePageId
    ? (sourcePageById.get(snippetSourcePageId) ?? null)
    : null;
  const liveSnippetCropBox =
    liveSnippetCropPreviewState.key === snippetSourcePageId
      ? liveSnippetCropPreviewState.cropBox
      : null;
  const previewSnippetCropBox = liveSnippetCropBox ?? snippetCropBox ?? null;
  const selectedAssetPage = selectedAsset
    ? (sourcePageById.get(selectedAsset.sourcePageId) ?? null)
    : null;
  const liveSelectedAssetCropBox =
    selectedAssetCropPreviewState.key === selectedAssetKey
      ? selectedAssetCropPreviewState.cropBox
      : null;
  const previewCropBox =
    selectedAsset && liveSelectedAssetCropBox
      ? liveSelectedAssetCropBox
      : (selectedAsset?.cropBox ?? null);
  const assetToolPage = assetToolDraft
    ? (sourcePageById.get(assetToolDraft.sourcePageId) ?? null)
    : null;
  const assetToolKey = `${assetToolDraft?.assetId ?? ""}:${assetToolDraft?.sourcePageId ?? ""}`;
  const liveAssetToolCropBox =
    assetToolCropPreviewState.key === assetToolKey
      ? assetToolCropPreviewState.cropBox
      : null;
  const assetToolPreviewCropBox =
    liveAssetToolCropBox ?? assetToolDraft?.cropBox ?? null;

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
    setAssetToolCropPreviewState({
      key: null,
      cropBox: null,
    });
    setActiveToolPanel("asset");
  }

  function closeAssetToolPanel() {
    setAssetToolDraft(null);
    setAssetToolCropPreviewState({
      key: null,
      cropBox: null,
    });
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
    setAssetToolCropPreviewState({
      key: null,
      cropBox: null,
    });
    setActiveToolPanel("snippet");
  }

  function focusNativeTools(nodeId: string, blockId: string, assetId: string) {
    onSelectNodeId(nodeId);
    onSelectBlockId(blockId);
    onSelectAssetId(assetId);
    onPendingInspectorScrollBlockIdChange(blockId);
    setAssetToolDraft(null);
    setAssetToolCropPreviewState({
      key: null,
      cropBox: null,
    });
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
    setAssetToolCropPreviewState({
      key: null,
      cropBox: null,
    });
    setActiveToolPanel(null);
  }

  function handleSnippetSourcePageChange(sourcePageId: string) {
    const nextPage = sourcePageById.get(sourcePageId) ?? null;

    setSnippetSourceState({
      key: snippetSourceKey,
      sourcePageId: sourcePageId || null,
      cropBox: nextPage ? makeDefaultSnippetCropBox(nextPage) : null,
    });
    setLiveSnippetCropPreviewState({
      key: null,
      cropBox: null,
    });
  }

  function handleSelectedAssetCropChange(nextCropBox: CropBox) {
    if (!selectedAsset) {
      return;
    }

    setSelectedAssetCropPreviewState({
      key: null,
      cropBox: null,
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
      key: null,
      cropBox: null,
    });
    updateAsset(selectedAsset.id, {
      sourcePageId,
      documentKind:
        nextPage?.documentKind === "correction" ? "CORRECTION" : "EXAM",
      pageNumber: nextPage?.page_number ?? selectedAsset.pageNumber,
    });
  }

  function handleAssetToolCropChange(nextCropBox: CropBox) {
    setAssetToolCropPreviewState({
      key: null,
      cropBox: null,
    });
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

    setAssetToolCropPreviewState({
      key: null,
      cropBox: null,
    });
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
      key: recoveryKey,
      mode,
      error: current.key === recoveryKey ? current.error : null,
      notice: current.key === recoveryKey ? current.notice : null,
      notes: current.key === recoveryKey ? current.notes : [],
    }));
  }

  function setRecoveryError(error: string | null) {
    setRecoveryState((current) => ({
      key: recoveryKey,
      mode: current.key === recoveryKey ? current.mode : null,
      error,
      notice: current.key === recoveryKey ? current.notice : null,
      notes: current.key === recoveryKey ? current.notes : [],
    }));
  }

  function setRecoveryNotice(notice: string | null) {
    setRecoveryState((current) => ({
      key: recoveryKey,
      mode: current.key === recoveryKey ? current.mode : null,
      error: current.key === recoveryKey ? current.error : null,
      notice,
      notes: current.key === recoveryKey ? current.notes : [],
    }));
  }

  function setRecoveryNotes(notes: string[]) {
    setRecoveryState((current) => ({
      key: recoveryKey,
      mode: current.key === recoveryKey ? current.mode : null,
      error: current.key === recoveryKey ? current.error : null,
      notice: current.key === recoveryKey ? current.notice : null,
      notes,
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
      key: snippetKey,
      mode,
      error: current.key === snippetKey ? current.error : null,
      notice: current.key === snippetKey ? current.notice : null,
      notes: current.key === snippetKey ? current.notes : [],
    }));
  }

  function setSnippetRecoveryError(error: string | null) {
    setSnippetRecoveryState((current) => ({
      key: snippetKey,
      mode: current.key === snippetKey ? current.mode : null,
      error,
      notice: current.key === snippetKey ? current.notice : null,
      notes: current.key === snippetKey ? current.notes : [],
    }));
  }

  function setSnippetRecoveryNotice(notice: string | null) {
    setSnippetRecoveryState((current) => ({
      key: snippetKey,
      mode: current.key === snippetKey ? current.mode : null,
      error: current.key === snippetKey ? current.error : null,
      notice,
      notes: current.key === snippetKey ? current.notes : [],
    }));
  }

  function setSnippetRecoveryNotes(notes: string[]) {
    setSnippetRecoveryState((current) => ({
      key: snippetKey,
      mode: current.key === snippetKey ? current.mode : null,
      error: current.key === snippetKey ? current.error : null,
      notice: current.key === snippetKey ? current.notice : null,
      notes,
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
