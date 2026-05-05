import type { CropBox } from "@/components/ingestion-crop-editor";
import type {
  AdminIngestionDraft,
  DraftAssetClassification,
  DraftBlockType,
  DraftVariantCode,
} from "@/lib/admin";
import type {
  DraftAsset,
  DraftBlock,
} from "@/lib/admin-ingestion-structure-shared";

export type AssetToolPage = {
  id: string;
  documentKind: "exam" | "correction";
  page_number: number;
  width: number;
  height: number;
};

export type AssetToolDraft = {
  mode: "create" | "edit";
  targetBlockId: string;
  assetId: string | null;
  sourcePageId: string;
  classification: DraftAssetClassification;
  role: DraftBlock["role"];
  variantCode: AdminIngestionDraft["assets"][number]["variantCode"];
  cropBox: CropBox;
};

export function areCropBoxesEqual(left: CropBox, right: CropBox) {
  return (
    left.x === right.x &&
    left.y === right.y &&
    left.width === right.width &&
    left.height === right.height
  );
}

export function finalizeEditedAsset(
  previous: DraftAsset,
  next: DraftAsset,
): DraftAsset {
  if (next.nativeSuggestion !== previous.nativeSuggestion) {
    return next;
  }

  const nativeSuggestion = previous.nativeSuggestion ?? null;

  if (!nativeSuggestion) {
    return next;
  }

  if (next.classification !== nativeSuggestion.type) {
    return {
      ...next,
      nativeSuggestion: null,
    };
  }

  const changed =
    previous.sourcePageId !== next.sourcePageId ||
    previous.documentKind !== next.documentKind ||
    previous.pageNumber !== next.pageNumber ||
    !areCropBoxesEqual(previous.cropBox, next.cropBox);

  if (!changed || nativeSuggestion.status === "stale") {
    return next;
  }

  return {
    ...next,
    nativeSuggestion: {
      ...nativeSuggestion,
      status: "stale" as const,
    },
  };
}

export function updateDraftAsset(
  draft: AdminIngestionDraft,
  assetId: string,
  patch: Partial<DraftAsset>,
): AdminIngestionDraft {
  return {
    ...draft,
    assets: draft.assets.map((asset) =>
      asset.id === assetId
        ? finalizeEditedAsset(asset, {
            ...asset,
            ...patch,
          })
        : asset,
    ),
  };
}

export function makeDefaultAssetCropBox(page: {
  width: number;
  height: number;
}): CropBox {
  return {
    x: 0,
    y: 0,
    width: Math.max(1, Math.floor(page.width / 2)),
    height: Math.max(1, Math.floor(page.height / 2)),
  };
}

export function mapBlockTypeToAssetClassification(
  type: DraftBlockType,
): DraftAssetClassification {
  if (type === "table" || type === "tree" || type === "graph") {
    return type;
  }

  return "image";
}

export function buildAssetToolDraft(options: {
  block: DraftBlock;
  mode: "create" | "edit";
  assetById: Map<string, DraftAsset>;
  selectedVariantCode: AdminIngestionDraft["assets"][number]["variantCode"];
  sourcePages: AssetToolPage[];
  sourcePageById: Map<string, AssetToolPage>;
}): AssetToolDraft | null {
  const {
    block,
    mode,
    assetById,
    selectedVariantCode,
    sourcePages,
    sourcePageById,
  } = options;
  const linkedAsset =
    mode === "edit" && block.assetId
      ? (assetById.get(block.assetId) ?? null)
      : null;
  const fallbackPageId =
    linkedAsset?.sourcePageId ?? sourcePages[0]?.id ?? null;

  if (!fallbackPageId) {
    return null;
  }

  const fallbackPage = sourcePageById.get(fallbackPageId) ?? null;

  if (!fallbackPage) {
    return null;
  }

  return {
    mode: linkedAsset ? "edit" : "create",
    targetBlockId: block.id,
    assetId: linkedAsset?.id ?? null,
    sourcePageId: fallbackPage.id,
    classification:
      linkedAsset?.classification ??
      mapBlockTypeToAssetClassification(block.type),
    role: linkedAsset?.role ?? block.role,
    variantCode: linkedAsset?.variantCode ?? selectedVariantCode,
    cropBox: linkedAsset?.cropBox ?? makeDefaultAssetCropBox(fallbackPage),
  };
}

export function saveAssetToolDraftChanges(options: {
  draft: AdminIngestionDraft;
  assetToolDraft: AssetToolDraft;
  assetToolPage: AssetToolPage;
  assetById: Map<string, DraftAsset>;
  nextAssetId: string;
}): { draft: AdminIngestionDraft; assetId: string } | null {
  const { draft, assetToolDraft, assetToolPage, assetById, nextAssetId } =
    options;
  const existingAsset = assetToolDraft.assetId
    ? (assetById.get(assetToolDraft.assetId) ?? null)
    : null;

  if (assetToolDraft.assetId && !existingAsset) {
    return null;
  }

  const savedAssetId = assetToolDraft.assetId ?? nextAssetId;
  let nextAsset: DraftAsset;

  if (existingAsset) {
    nextAsset = finalizeEditedAsset(existingAsset, {
      ...existingAsset,
      sourcePageId: assetToolPage.id,
      documentKind:
        assetToolPage.documentKind === "correction" ? "CORRECTION" : "EXAM",
      pageNumber: assetToolPage.page_number,
      classification: assetToolDraft.classification,
      role: assetToolDraft.role,
      variantCode: assetToolDraft.variantCode,
      cropBox: assetToolDraft.cropBox,
    });
  } else {
    nextAsset = {
      id: savedAssetId,
      sourcePageId: assetToolPage.id,
      documentKind:
        assetToolPage.documentKind === "correction" ? "CORRECTION" : "EXAM",
      pageNumber: assetToolPage.page_number,
      variantCode: assetToolDraft.variantCode,
      role: assetToolDraft.role,
      classification: assetToolDraft.classification,
      cropBox: assetToolDraft.cropBox,
      label: null,
      notes: null,
      nativeSuggestion: null,
    };
  }

  return {
    assetId: savedAssetId,
    draft: {
      ...draft,
      assets: assetToolDraft.assetId
        ? draft.assets.map((asset) =>
            asset.id === assetToolDraft.assetId ? nextAsset : asset,
          )
        : [...draft.assets, nextAsset],
      variants: draft.variants.map((variant) => ({
        ...variant,
        nodes: variant.nodes.map((node) => ({
          ...node,
          blocks: node.blocks.map((block) =>
            block.id === assetToolDraft.targetBlockId
              ? {
                  ...block,
                  assetId: savedAssetId,
                }
              : block,
          ),
        })),
      })),
    },
  };
}

export function applyNativeSuggestionToDraftBlock(options: {
  draft: AdminIngestionDraft;
  variantCode: DraftVariantCode;
  nodeId: string;
  blockId: string;
  asset: DraftAsset;
}): AdminIngestionDraft {
  const { draft, variantCode, nodeId, blockId, asset } = options;

  if (!asset.nativeSuggestion) {
    return draft;
  }

  return {
    ...draft,
    variants: draft.variants.map((variant) => {
      if (variant.code !== variantCode) {
        return variant;
      }

      return {
        ...variant,
        nodes: variant.nodes.map((node) => {
          if (node.id !== nodeId) {
            return node;
          }

          return {
            ...node,
            blocks: node.blocks.map((block) =>
              block.id === blockId
                ? {
                    ...block,
                    type: asset.nativeSuggestion?.type ?? block.type,
                    value: asset.nativeSuggestion?.value ?? "",
                    data: asset.nativeSuggestion?.data ?? null,
                    assetId: asset.id,
                  }
                : block,
            ),
          };
        }),
      };
    }),
  };
}

export function formatNativeSuggestionSource(
  source: NonNullable<DraftAsset["nativeSuggestion"]>["source"],
) {
  if (source === "codex_app_extraction") {
    return "Codex Extraction";
  }

  if (source === "reviewed_extract") {
    return "Reviewed Extract";
  }

  if (source === "manual_review") {
    return "Manual Review";
  }

  return "Imported Model Pass";
}

export function formatNativeSuggestionStatus(
  status: NonNullable<DraftAsset["nativeSuggestion"]>["status"],
) {
  if (status === "stale") {
    return "Stale";
  }

  return "Suggested";
}
