import { useEffect, useMemo, useState } from "react";
import type {
  AdminFiltersResponse,
  AdminIngestionDraft,
  DraftAssetClassification,
  DraftVariantCode,
} from "@/lib/admin";
import { fetchAdminJson, parseAdminFiltersResponse } from "@/lib/admin";
import {
  buildAssetToolDraft,
  makeDefaultAssetCropBox,
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
  resolveActiveToolPanel,
  resolveActiveToolPanelBusy,
  resolveAssetToolPreviewState,
  resolveSelectedAssetPreviewState,
  type AdminIngestionStructureSourcePage,
  type KeyedCropState,
} from "@/lib/admin-ingestion-structure-tools-state";
import type { CropBox } from "@/components/ingestion-crop-editor";

export {
  resolveActiveToolPanel,
  resolveActiveToolPanelBusy,
  resolveAssetToolPreviewState,
  resolveSelectedAssetPreviewState,
  shouldCloseActiveToolPanel,
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
  const [assetToolDraft, setAssetToolDraft] = useState<AssetToolDraft | null>(
    null,
  );
  const [assetToolCropPreviewState, setAssetToolCropPreviewState] =
    useState<KeyedCropState>(createEmptyKeyedCropState());
  const [activeToolPanelState, setActiveToolPanel] = useState<
    "native" | "asset" | null
  >(null);

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
  const activeToolPanelBusy = useMemo(() => resolveActiveToolPanelBusy(), []);
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

  function handleSelectedAssetCropChange(nextCropBox: CropBox) {
    if (!selectedAsset) {
      return;
    }

    setSelectedAssetCropPreviewState(createEmptyKeyedCropState());
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

    setSelectedAssetCropPreviewState(createEmptyKeyedCropState());
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
  };
}
