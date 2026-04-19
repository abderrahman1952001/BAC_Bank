import type {
  AdminIngestionRecoveryMode,
} from "@/lib/admin";
import {
  makeDefaultSnippetCropBox,
  type AssetToolDraft,
} from "@/lib/admin-ingestion-structure-assets";
import type { DraftAsset } from "@/lib/admin-ingestion-structure-shared";
import type { CropBox } from "@/components/ingestion-crop-editor";

export type AdminIngestionToolPanel = "snippet" | "native" | "asset" | null;

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

export type KeyedSnippetSourceState = {
  key: string | null;
  sourcePageId: string | null;
  cropBox: CropBox | null;
};

export type KeyedRecoveryState = {
  key: string | null;
  mode: AdminIngestionRecoveryMode | null;
  error: string | null;
  notice: string | null;
  notes: string[];
};

type RecoveryStatePatch = Partial<
  Pick<KeyedRecoveryState, "mode" | "error" | "notice" | "notes">
>;

export function createEmptyKeyedCropState(): KeyedCropState {
  return {
    key: null,
    cropBox: null,
  };
}

export function createEmptyKeyedRecoveryState(): KeyedRecoveryState {
  return {
    key: null,
    mode: null,
    error: null,
    notice: null,
    notes: [],
  };
}

export function createEmptySnippetSourceState(): KeyedSnippetSourceState {
  return {
    key: null,
    sourcePageId: null,
    cropBox: null,
  };
}

export function resolveActiveToolPanelBusy(options: {
  activeToolPanel: AdminIngestionToolPanel;
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

export function resolveSnippetToolState(options: {
  selectedAssetSourcePageId: string | null;
  snippetSourceState: KeyedSnippetSourceState;
  snippetSourceKey: string;
  liveSnippetCropPreviewState: KeyedCropState;
  sourcePages: AdminIngestionStructureSourcePage[];
  sourcePageById: Map<string, AdminIngestionStructureSourcePage>;
}) {
  const {
    selectedAssetSourcePageId,
    snippetSourceState,
    snippetSourceKey,
    liveSnippetCropPreviewState,
    sourcePages,
    sourcePageById,
  } = options;
  const defaultSnippetSourceState = resolveInitialSnippetSourceState({
    selectedAssetSourcePageId,
    sourcePages,
    sourcePageById,
  });
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

  return {
    snippetSourcePageId,
    snippetSourcePage,
    snippetCropBox,
    previewSnippetCropBox: liveSnippetCropBox ?? snippetCropBox ?? null,
  };
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
    assetToolPreviewCropBox: liveAssetToolCropBox ?? assetToolDraft?.cropBox ?? null,
  };
}

export function updateKeyedRecoveryState(options: {
  current: KeyedRecoveryState;
  key: string;
  patch: RecoveryStatePatch;
}) {
  const { current, key, patch } = options;
  const preservesCurrent = current.key === key;
  const hasField = (field: keyof RecoveryStatePatch) =>
    Object.prototype.hasOwnProperty.call(patch, field);

  return {
    key,
    mode: hasField("mode")
      ? (patch.mode ?? null)
      : preservesCurrent
        ? current.mode
        : null,
    error: hasField("error")
      ? (patch.error ?? null)
      : preservesCurrent
        ? current.error
        : null,
    notice: hasField("notice")
      ? (patch.notice ?? null)
      : preservesCurrent
        ? current.notice
        : null,
    notes: hasField("notes")
      ? (patch.notes ?? [])
      : preservesCurrent
        ? current.notes
        : [],
  };
}
