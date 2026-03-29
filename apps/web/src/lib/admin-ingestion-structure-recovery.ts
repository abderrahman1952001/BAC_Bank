import type { CropBox } from "@/components/ingestion-crop-editor";
import {
  fetchAdminJson,
  type AdminIngestionDraft,
  type AdminIngestionRecoveryMode,
  type AdminIngestionRecoveryResponse,
  type AdminIngestionSnippetRecoveryResponse,
  type DraftVariantCode,
} from "@/lib/admin";
import {
  applyNativeSuggestionToDraftBlock,
  applyRecoveredAssetToDraft,
  applyRecoveredSnippetToDraft,
  type DraftAsset,
  type DraftBlock,
  type DraftNode,
  type SnippetRecoveryAction,
} from "@/lib/admin-ingestion-structure";

export function resolveRecoveredAssetNotice(keepsAsset: boolean) {
  return keepsAsset
    ? "Recovered a native structured block from the selected crop. Review it, then save the draft."
    : "Recovered inline content from the selected crop. Review it, then save the draft.";
}

export function resolveRecoveredSnippetNotice(options: {
  snippetAction: SnippetRecoveryAction;
  appendFallbackToInsert: boolean;
}) {
  const { snippetAction, appendFallbackToInsert } = options;

  if (snippetAction === "replace") {
    return "Re-read the selected snippet and replaced the block content. Review it, then save the draft.";
  }

  if (snippetAction === "append" && !appendFallbackToInsert) {
    return "Recovered content was appended to the selected block. Review it, then save the draft.";
  }

  if (appendFallbackToInsert) {
    return "Recovered content used a different block type, so it was inserted below instead of appended.";
  }

  return "Recovered content was inserted below the selected block. Review it, then save the draft.";
}

export function useAdminIngestionStructureRecovery(options: {
  jobId: string;
  draft: AdminIngestionDraft;
  selectedVariantCode: DraftVariantCode;
  selectedNode: DraftNode | null;
  selectedBlock: DraftBlock | null;
  selectedAsset: DraftAsset | null;
  snippetSourcePage: { id: string } | null;
  snippetCropBox: CropBox | null;
  snippetAction: SnippetRecoveryAction;
  onChange: (nextDraft: AdminIngestionDraft) => void;
  onSelectBlockId: (blockId: string | null) => void;
  onPendingInspectorScrollBlockIdChange: (blockId: string | null) => void;
  makeClientId: (prefix: string) => string;
  setRecoveryMode: (mode: AdminIngestionRecoveryMode | null) => void;
  setRecoveryError: (message: string | null) => void;
  setRecoveryNotice: (message: string | null) => void;
  setRecoveryNotes: (notes: string[]) => void;
  setSnippetRecoveryMode: (mode: AdminIngestionRecoveryMode | null) => void;
  setSnippetRecoveryError: (message: string | null) => void;
  setSnippetRecoveryNotice: (message: string | null) => void;
  setSnippetRecoveryNotes: (notes: string[]) => void;
}) {
  const {
    jobId,
    draft,
    selectedVariantCode,
    selectedNode,
    selectedBlock,
    selectedAsset,
    snippetSourcePage,
    snippetCropBox,
    snippetAction,
    onChange,
    onSelectBlockId,
    onPendingInspectorScrollBlockIdChange,
    makeClientId,
    setRecoveryMode,
    setRecoveryError,
    setRecoveryNotice,
    setRecoveryNotes,
    setSnippetRecoveryMode,
    setSnippetRecoveryError,
    setSnippetRecoveryNotice,
    setSnippetRecoveryNotes,
  } = options;

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
    setRecoveryNotice(
      "Applied the stored native draft suggestion to the selected block. Review it, then save the draft.",
    );
    setRecoveryError(null);
    setRecoveryNotes(selectedAsset.nativeSuggestion.notes);
  }

  async function recoverIntoSelectedBlock(mode: AdminIngestionRecoveryMode) {
    if (!selectedNode || !selectedBlock || !selectedAsset) {
      setRecoveryError(
        "Select both a target block and a source crop before recovering content.",
      );
      return;
    }

    setRecoveryMode(mode);
    setRecoveryError(null);
    setRecoveryNotice(null);
    setRecoveryNotes([]);

    try {
      const payload = await fetchAdminJson<AdminIngestionRecoveryResponse>(
        `/ingestion/jobs/${jobId}/assets/${selectedAsset.id}/recover`,
        {
          method: "POST",
          body: JSON.stringify({
            mode,
          }),
        },
      );
      const result = applyRecoveredAssetToDraft({
        draft,
        variantCode: selectedVariantCode,
        nodeId: selectedNode.id,
        blockId: selectedBlock.id,
        assetId: selectedAsset.id,
        mode,
        recovery: payload.recovery,
      });
      onChange(result.draft);
      setRecoveryNotes(payload.recovery.notes);
      setRecoveryNotice(resolveRecoveredAssetNotice(result.keepsAsset));
    } catch (error) {
      setRecoveryError(
        error instanceof Error
          ? error.message
          : "Failed to recover content from the selected crop.",
      );
    } finally {
      setRecoveryMode(null);
    }
  }

  async function recoverSnippetIntoSelectedBlock(mode: "text" | "latex") {
    if (
      !selectedNode ||
      !selectedBlock ||
      !snippetSourcePage ||
      !snippetCropBox
    ) {
      setSnippetRecoveryError(
        "Select a target block, source page, and crop before recovering text.",
      );
      return;
    }

    setSnippetRecoveryMode(mode);
    setSnippetRecoveryError(null);
    setSnippetRecoveryNotice(null);
    setSnippetRecoveryNotes([]);

    try {
      const payload = await fetchAdminJson<AdminIngestionSnippetRecoveryResponse>(
        `/ingestion/jobs/${jobId}/recover-snippet`,
        {
          method: "POST",
          body: JSON.stringify({
            mode,
            source_page_id: snippetSourcePage.id,
            crop_box: snippetCropBox,
            label: selectedBlock.id,
          }),
        },
      );
      const result = applyRecoveredSnippetToDraft({
        draft,
        variantCode: selectedVariantCode,
        nodeId: selectedNode.id,
        blockId: selectedBlock.id,
        snippetAction,
        recovery: payload.recovery,
        makeBlockId: () => makeClientId("block"),
      });
      onChange(result.draft);
      onSelectBlockId(result.nextSelectedBlockId);
      onPendingInspectorScrollBlockIdChange(result.nextSelectedBlockId);
      setSnippetRecoveryNotes(payload.recovery.notes);
      setSnippetRecoveryNotice(
        resolveRecoveredSnippetNotice({
          snippetAction,
          appendFallbackToInsert: result.appendFallbackToInsert,
        }),
      );
    } catch (error) {
      setSnippetRecoveryError(
        error instanceof Error
          ? error.message
          : "Failed to recover content from the selected snippet.",
      );
    } finally {
      setSnippetRecoveryMode(null);
    }
  }

  return {
    applyNativeSuggestionToSelectedBlock,
    recoverIntoSelectedBlock,
    recoverSnippetIntoSelectedBlock,
  };
}
