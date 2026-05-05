import type { CropBox } from "@/components/ingestion-crop-editor";
import type { AssetToolDraft } from "@/lib/admin-ingestion-structure-assets";
import type { DraftAsset } from "@/lib/admin-ingestion-structure-shared";

export type AdminIngestionToolPanel = "native" | "asset" | null;

export type AdminIngestionStructureSourcePage = {
  id: string;
  documentId: string;
  documentKind: "exam" | "correction";
  page_number: number;
  width: number;
  height: number;
  image_url: string;
};

export type KeyedCropState = {
  key: string | null;
  cropBox: CropBox | null;
};

export function createEmptyKeyedCropState(): KeyedCropState {
  return {
    key: null,
    cropBox: null,
  };
}

export function resolveActiveToolPanelBusy() {
  return false;
}

export function shouldCloseActiveToolPanel(options: {
  activeToolPanel: AdminIngestionToolPanel;
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

  if (activeToolPanel === "native") {
    return !hasSelectedBlock || !hasSelectedAsset;
  }

  if (activeToolPanel === "asset") {
    return !hasAssetToolDraft;
  }

  return false;
}

export function resolveActiveToolPanel(options: {
  activeToolPanelState: AdminIngestionToolPanel;
  hasSelectedBlock: boolean;
  hasSelectedAsset: boolean;
  hasAssetToolDraft: boolean;
}) {
  const {
    activeToolPanelState,
    hasSelectedBlock,
    hasSelectedAsset,
    hasAssetToolDraft,
  } = options;

  return shouldCloseActiveToolPanel({
    activeToolPanel: activeToolPanelState,
    hasSelectedBlock,
    hasSelectedAsset,
    hasAssetToolDraft,
  })
    ? null
    : activeToolPanelState;
}

export function resolveSelectedAssetPreviewState(options: {
  selectedAsset: DraftAsset | null;
  selectedAssetCropPreviewState: KeyedCropState;
  sourcePageById: Map<string, AdminIngestionStructureSourcePage>;
}) {
  const { selectedAsset, selectedAssetCropPreviewState, sourcePageById } =
    options;
  const selectedAssetKey = `${selectedAsset?.id ?? ""}:${selectedAsset?.sourcePageId ?? ""}`;
  const selectedAssetPage = selectedAsset
    ? (sourcePageById.get(selectedAsset.sourcePageId) ?? null)
    : null;
  const liveSelectedAssetCropBox =
    selectedAssetCropPreviewState.key === selectedAssetKey
      ? selectedAssetCropPreviewState.cropBox
      : null;

  return {
    selectedAssetKey,
    selectedAssetPage,
    previewCropBox:
      selectedAsset && liveSelectedAssetCropBox
        ? liveSelectedAssetCropBox
        : (selectedAsset?.cropBox ?? null),
  };
}

export function resolveAssetToolPreviewState(options: {
  assetToolDraft: AssetToolDraft | null;
  assetToolCropPreviewState: KeyedCropState;
  sourcePageById: Map<string, AdminIngestionStructureSourcePage>;
}) {
  const { assetToolDraft, assetToolCropPreviewState, sourcePageById } = options;
  const assetToolPage = assetToolDraft
    ? (sourcePageById.get(assetToolDraft.sourcePageId) ?? null)
    : null;
  const assetToolKey = `${assetToolDraft?.assetId ?? ""}:${assetToolDraft?.sourcePageId ?? ""}`;
  const liveAssetToolCropBox =
    assetToolCropPreviewState.key === assetToolKey
      ? assetToolCropPreviewState.cropBox
      : null;

  return {
    assetToolKey,
    assetToolPage,
    assetToolPreviewCropBox:
      liveAssetToolCropBox ?? assetToolDraft?.cropBox ?? null,
  };
}
