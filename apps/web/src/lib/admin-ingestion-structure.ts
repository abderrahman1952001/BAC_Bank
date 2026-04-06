import type { CropBox } from "@/components/ingestion-crop-editor";
import type {
  AdminIngestionDraft,
  AdminIngestionRecoveryMode,
  AdminIngestionRecoveryResponse,
  AdminIngestionSnippetRecoveryResponse,
  DraftAssetClassification,
  DraftBlockType,
  DraftVariantCode,
} from "@/lib/admin";
import type { ExamHierarchyBlock } from "@/lib/qbank";

export type DraftVariant = AdminIngestionDraft["variants"][number];
export type DraftNode = AdminIngestionDraft["variants"][number]["nodes"][number];
export type DraftBlock = DraftNode["blocks"][number];
export type DraftAsset = AdminIngestionDraft["assets"][number];
export type DraftBlockPreset =
  | "table"
  | "formula_graph"
  | "probability_tree";
export type SnippetRecoveryAction = "replace" | "append" | "insert_below";
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
type LegacyDraftBlock = DraftBlock & {
  meta?: DraftBlock["meta"] & {
    caption?: string;
  };
};
type LegacyDraftNode = DraftNode & {
  title?: string | null;
  blocks: LegacyDraftBlock[];
};
type LegacyDraftAsset = DraftAsset & {
  caption?: string | null;
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function readDraftSelectedStreamCodes(
  exam: AdminIngestionDraft["exam"] | null | undefined,
) {
  if (!exam) {
    return [];
  }

  const metadata = isRecord(exam.metadata) ? exam.metadata : {};
  const fromPaperStreamMetadata = Array.isArray(metadata.paperStreamCodes)
    ? metadata.paperStreamCodes
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim().toUpperCase())
        .filter((value) => value.length > 0)
    : [];

  if (fromPaperStreamMetadata.length > 0) {
    return Array.from(new Set(fromPaperStreamMetadata));
  }

  const fromSharedMetadata = Array.isArray(metadata.sharedStreamCodes)
    ? metadata.sharedStreamCodes
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim().toUpperCase())
        .filter((value) => value.length > 0)
    : [];

  return Array.from(
    new Set(
      [exam.streamCode, ...fromSharedMetadata]
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim().toUpperCase())
        .filter((value) => value.length > 0),
    ),
  );
}

export function formatRows(data: Record<string, unknown> | null | undefined) {
  if (!Array.isArray(data?.rows)) {
    return "";
  }

  return data.rows
    .map((row) =>
      Array.isArray(row)
        ? row.map((cell) => String(cell ?? "")).join(" | ")
        : "",
    )
    .filter((row) => row.trim().length > 0)
    .join("\n");
}

export function parseRows(value: string) {
  return value
    .split("\n")
    .map((line) =>
      line
        .split("|")
        .map((cell) => cell.trim())
        .filter((cell) => cell.length > 0),
    )
    .filter((row) => row.length > 0);
}

export function withRowsData(
  data: Record<string, unknown> | null | undefined,
  rows: string[][],
) {
  const nextData = isRecord(data) ? { ...data } : {};

  if (rows.length > 0) {
    nextData.rows = rows;
  } else {
    delete nextData.rows;
  }

  return Object.keys(nextData).length ? nextData : null;
}

function stripLegacyBlockMetaCaption(
  meta: LegacyDraftBlock["meta"] | undefined,
): DraftBlock["meta"] | undefined {
  if (!meta?.caption) {
    return meta;
  }

  const nextMeta = {
    ...meta,
  };

  delete nextMeta.caption;

  if (nextMeta.level === undefined && !nextMeta.language) {
    return undefined;
  }

  return nextMeta;
}

export function sanitizeLegacyReviewDraft(
  draft: AdminIngestionDraft,
): AdminIngestionDraft {
  let changed = false;

  const assets = draft.assets.map((asset) => {
    const legacyAsset = asset as LegacyDraftAsset;

    if (!Object.prototype.hasOwnProperty.call(legacyAsset, "caption")) {
      return asset;
    }

    changed = true;

    const rest = { ...legacyAsset };
    delete rest.caption;
    return rest;
  });

  const variants = draft.variants.map((variant) => {
    let variantChanged = false;

    const nodes = variant.nodes.map((node) => {
      const legacyNode = node as LegacyDraftNode;
      let nodeChanged = false;
      const label = legacyNode.label ?? legacyNode.title ?? null;

      const blocks = legacyNode.blocks.map((block) => {
        const meta = stripLegacyBlockMetaCaption(block.meta);

        if (meta === block.meta) {
          return block;
        }

        nodeChanged = true;

        if (meta) {
          return {
            ...block,
            meta,
          };
        }

        const rest = { ...block };
        delete rest.meta;
        return rest;
      });

      if (
        label !== legacyNode.label ||
        Object.prototype.hasOwnProperty.call(legacyNode, "title") ||
        nodeChanged
      ) {
        changed = true;
        variantChanged = true;

        const rest = { ...legacyNode };
        delete rest.title;

        return {
          ...rest,
          label,
          blocks,
        };
      }

      return node;
    });

    if (!variantChanged) {
      return variant;
    }

    return {
      ...variant,
      nodes,
    };
  });

  if (!changed) {
    return draft;
  }

  return {
    ...draft,
    assets,
    variants,
  };
}

export function toPreviewBlockType(
  type: DraftBlockType,
): ExamHierarchyBlock["blockType"] {
  if (type === "heading") {
    return "HEADING";
  }

  if (type === "latex") {
    return "LATEX";
  }

  if (type === "image") {
    return "IMAGE";
  }

  if (type === "code") {
    return "CODE";
  }

  if (type === "table") {
    return "TABLE";
  }

  if (type === "list") {
    return "LIST";
  }

  if (type === "graph") {
    return "GRAPH";
  }

  if (type === "tree") {
    return "TREE";
  }

  return "PARAGRAPH";
}

export function defaultNodeType(parent: DraftNode | null): DraftNode["nodeType"] {
  if (!parent) {
    return "EXERCISE";
  }

  if (parent.nodeType === "QUESTION" || parent.nodeType === "SUBQUESTION") {
    return "SUBQUESTION";
  }

  return "QUESTION";
}

export function defaultNodeLabel(
  nodeType: DraftNode["nodeType"],
  siblingCount: number,
) {
  const index = siblingCount + 1;

  if (nodeType === "EXERCISE") {
    return `Exercise ${index}`;
  }

  if (nodeType === "PART") {
    return `Part ${index}`;
  }

  if (nodeType === "CONTEXT") {
    return `Context ${index}`;
  }

  if (nodeType === "SUBQUESTION") {
    return `Sub-question ${index}`;
  }

  return `Question ${index}`;
}

export function sortNodes(nodes: DraftNode[]) {
  return [...nodes].sort((left, right) => {
    if (left.orderIndex !== right.orderIndex) {
      return left.orderIndex - right.orderIndex;
    }

    return left.id.localeCompare(right.id);
  });
}

export function buildChildrenMap(nodes: DraftNode[]) {
  const map = new Map<string | null, DraftNode[]>();

  for (const node of nodes) {
    const bucket = map.get(node.parentId) ?? [];
    bucket.push(node);
    map.set(node.parentId, bucket);
  }

  for (const [key, bucket] of map.entries()) {
    map.set(key, sortNodes(bucket));
  }

  return map;
}

export function normalizeVariantNodes(nodes: DraftNode[]) {
  const orders = new Map<string, number>();
  const childrenByParent = buildChildrenMap(nodes);

  for (const bucket of childrenByParent.values()) {
    bucket.forEach((node, index) => {
      orders.set(node.id, index + 1);
    });
  }

  return nodes.map((node) => ({
    ...node,
    orderIndex: orders.get(node.id) ?? node.orderIndex,
  }));
}

export function updateDraftVariant(
  draft: AdminIngestionDraft,
  variantCode: DraftVariantCode,
  mutator: (variant: DraftVariant) => DraftVariant,
): AdminIngestionDraft {
  return {
    ...draft,
    variants: draft.variants.map((variant) =>
      variant.code === variantCode ? mutator(variant) : variant,
    ),
  };
}

export function updateDraftVariantNodes(
  draft: AdminIngestionDraft,
  variantCode: DraftVariantCode,
  mutator: (nodes: DraftNode[]) => DraftNode[],
): AdminIngestionDraft {
  return updateDraftVariant(draft, variantCode, (variant) => ({
    ...variant,
    nodes: normalizeVariantNodes(mutator(variant.nodes)),
  }));
}

export function patchDraftNode(
  nodes: DraftNode[],
  nodeId: string,
  patch: Partial<DraftNode>,
) {
  return nodes.map((node) =>
    node.id === nodeId
      ? {
          ...node,
          ...patch,
        }
      : node,
  );
}

export function updateDraftNodeBlocks(
  nodes: DraftNode[],
  nodeId: string,
  mutator: (blocks: DraftBlock[]) => DraftBlock[],
) {
  return nodes.map((node) =>
    node.id === nodeId
      ? {
          ...node,
          blocks: mutator(node.blocks),
        }
      : node,
  );
}

export function createDraftNode(
  id: string,
  parent: DraftNode | null,
  siblingCount: number,
): DraftNode {
  const nodeType = defaultNodeType(parent);

  return {
    id,
    nodeType,
    parentId: parent?.id ?? null,
    orderIndex: siblingCount + 1,
    label: defaultNodeLabel(nodeType, siblingCount),
    maxPoints: null,
    topicCodes: [],
    blocks: [],
  };
}

export function removeDraftNodeTree(nodes: DraftNode[], nodeId: string) {
  const childrenByParent = buildChildrenMap(nodes);
  const blockedIds = collectDescendants(childrenByParent, nodeId);

  return nodes.filter((node) => !blockedIds.has(node.id));
}

export function moveDraftNode(
  nodes: DraftNode[],
  nodeId: string,
  direction: -1 | 1,
) {
  const targetNode = nodes.find((node) => node.id === nodeId) ?? null;

  if (!targetNode) {
    return nodes;
  }

  const siblings = sortNodes(
    nodes.filter((node) => node.parentId === targetNode.parentId),
  );
  const sourceIndex = siblings.findIndex((node) => node.id === nodeId);
  const targetIndex = sourceIndex + direction;

  if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= siblings.length) {
    return nodes;
  }

  const nextSiblings = [...siblings];
  [nextSiblings[sourceIndex], nextSiblings[targetIndex]] = [
    nextSiblings[targetIndex],
    nextSiblings[sourceIndex],
  ];

  const orderById = new Map(
    nextSiblings.map((node, index) => [node.id, index + 1]),
  );

  return nodes.map((node) =>
    orderById.has(node.id)
      ? {
          ...node,
          orderIndex: orderById.get(node.id) ?? node.orderIndex,
        }
      : node,
  );
}

export function reparentDraftNode(
  nodes: DraftNode[],
  nodeId: string,
  nextParentId: string | null,
) {
  const parent = nextParentId
    ? (nodes.find((node) => node.id === nextParentId) ?? null)
    : null;
  const nextOrderIndex =
    nodes.filter((node) => node.parentId === nextParentId).length + 1;

  return nodes.map((node) =>
    node.id === nodeId
      ? {
          ...normalizeNodeAfterReparent(node, nextParentId, parent),
          orderIndex: nextOrderIndex,
        }
      : node,
  );
}

export function createDraftBlock(id: string): DraftBlock {
  return {
    id,
    role: "PROMPT",
    type: "paragraph",
    value: "",
    assetId: null,
    data: null,
  };
}

export function moveDraftBlock(
  blocks: DraftBlock[],
  blockId: string,
  direction: -1 | 1,
) {
  const sourceIndex = blocks.findIndex((block) => block.id === blockId);
  const targetIndex = sourceIndex + direction;

  if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= blocks.length) {
    return blocks;
  }

  const nextBlocks = [...blocks];
  [nextBlocks[sourceIndex], nextBlocks[targetIndex]] = [
    nextBlocks[targetIndex],
    nextBlocks[sourceIndex],
  ];

  return nextBlocks;
}

export function patchDraftBlock(
  blocks: DraftBlock[],
  blockId: string,
  patch: Partial<DraftBlock>,
) {
  return blocks.map((block) =>
    block.id === blockId
      ? {
          ...block,
          ...patch,
        }
      : block,
  );
}

export function buildDraftBlockPreset(
  preset: DraftBlockPreset,
): Partial<DraftBlock> {
  if (preset === "table") {
    return {
      type: "table",
      data: {
        rows: [
          ["Header 1", "Header 2"],
          ["Value 1", "Value 2"],
        ],
      },
    };
  }

  if (preset === "formula_graph") {
    return {
      type: "graph",
      value: "",
      data: {
        kind: "formula_graph",
        formulaGraph: {
          title: "Graph",
          xDomain: [-5, 5],
          yDomain: [-5, 5],
          curves: [
            {
              fn: "x",
              label: "f(x)",
            },
          ],
        },
      },
    };
  }

  return {
    type: "tree",
    value: "",
    data: {
      kind: "probability_tree",
      probabilityTree: {
        direction: "ltr",
        root: {
          label: "Start",
          children: [
            {
              label: "A",
              edgeLabel: "A",
              probability: "p",
            },
            {
              label: "B",
              edgeLabel: "B",
              probability: "1-p",
            },
          ],
        },
      },
    },
  };
}

export function updateDraftBlockData(
  blocks: DraftBlock[],
  blockId: string,
  nextData: Record<string, unknown> | null,
) {
  return patchDraftBlock(blocks, blockId, {
    data: nextData && Object.keys(nextData).length ? nextData : null,
  });
}

export function collectDescendants(
  childrenByParent: Map<string | null, DraftNode[]>,
  rootId: string,
) {
  const visited = new Set<string>();
  const stack = [rootId];

  while (stack.length > 0) {
    const current = stack.pop();

    if (!current || visited.has(current)) {
      continue;
    }

    visited.add(current);
    const children = childrenByParent.get(current) ?? [];
    for (const child of children) {
      stack.push(child.id);
    }
  }

  return visited;
}

export function normalizeNodeAfterReparent(
  node: DraftNode,
  nextParentId: string | null,
  parent: DraftNode | null,
): DraftNode {
  if (nextParentId === null) {
    if (node.nodeType === "QUESTION" || node.nodeType === "SUBQUESTION") {
      return {
        ...node,
        parentId: null,
        nodeType: "EXERCISE",
      };
    }

    return {
      ...node,
      parentId: null,
    };
  }

  if (node.nodeType === "EXERCISE") {
    return {
      ...node,
      parentId: nextParentId,
      nodeType: defaultNodeType(parent),
    };
  }

  return {
    ...node,
    parentId: nextParentId,
  };
}

export function buildPreviewBlocks(
  blocks: DraftBlock[],
  assetById: Map<string, DraftAsset>,
  assetPreviewBaseUrl: string,
): ExamHierarchyBlock[] {
  return blocks.map((block, index) => {
    const asset = block.assetId ? (assetById.get(block.assetId) ?? null) : null;
    const inferredKind =
      block.type === "graph"
        ? "formula_graph"
        : block.type === "tree"
          ? "probability_tree"
          : null;
    const data: Record<string, unknown> = {
      ...(isRecord(block.data) ? block.data : {}),
      ...(inferredKind &&
      (!isRecord(block.data) || typeof block.data.kind !== "string")
        ? {
            kind: inferredKind,
          }
        : {}),
      ...(block.meta?.language
        ? {
            language: block.meta.language,
          }
        : {}),
      ...(block.meta?.level !== undefined
        ? {
            level: block.meta.level,
          }
        : {}),
      ...(block.type === "image" && !asset && block.value
        ? {
            url: block.value,
          }
        : {}),
    };

    return {
      id: block.id,
      role: block.role,
      orderIndex: index + 1,
      blockType: toPreviewBlockType(block.type),
      textValue: block.value.trim().length ? block.value : null,
      data: Object.keys(data).length ? data : null,
      media: asset
        ? {
            id: asset.id,
            url: `${assetPreviewBaseUrl}/${asset.id}/preview`,
            type: "IMAGE",
            metadata: {
              label: asset.label,
              classification: asset.classification,
            },
          }
        : null,
    };
  });
}

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

export function makeDefaultSnippetCropBox(page: {
  width: number;
  height: number;
}): CropBox {
  return {
    x: 0,
    y: 0,
    width: Math.max(1, Math.floor(page.width * 0.82)),
    height: Math.max(1, Math.floor(page.height * 0.18)),
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
  const { block, mode, assetById, selectedVariantCode, sourcePages, sourcePageById } =
    options;
  const linkedAsset =
    mode === "edit" && block.assetId
      ? (assetById.get(block.assetId) ?? null)
      : null;
  const fallbackPageId = linkedAsset?.sourcePageId ?? sourcePages[0]?.id ?? null;

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
  const { draft, assetToolDraft, assetToolPage, assetById, nextAssetId } = options;
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

export function applyRecoveredAssetToDraft(options: {
  draft: AdminIngestionDraft;
  variantCode: DraftVariantCode;
  nodeId: string;
  blockId: string;
  assetId: string;
  mode: AdminIngestionRecoveryMode;
  recovery: AdminIngestionRecoveryResponse["recovery"];
}): { draft: AdminIngestionDraft; keepsAsset: boolean } {
  const { draft, variantCode, nodeId, blockId, assetId, mode, recovery } =
    options;
  const keepsAsset = mode === "table" || mode === "tree" || mode === "graph";
  const nextAssetClassification: DraftAssetClassification | null = keepsAsset
    ? mode
    : null;

  return {
    keepsAsset,
    draft: {
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
                      type: recovery.type,
                      value: recovery.value,
                      data: recovery.data,
                      assetId: keepsAsset ? assetId : null,
                    }
                  : block,
              ),
            };
          }),
        };
      }),
      assets: nextAssetClassification
        ? draft.assets.map((asset) =>
            asset.id === assetId
              ? {
                  ...asset,
                  classification: nextAssetClassification,
                  nativeSuggestion: {
                    type: recovery.type as "table" | "tree" | "graph",
                    value: recovery.value,
                    data: recovery.data,
                    status: "recovered",
                    source: "crop_recovery",
                    notes: recovery.notes,
                  },
                }
              : asset,
          )
        : draft.assets,
    },
  };
}

export function applyRecoveredSnippetToDraft(options: {
  draft: AdminIngestionDraft;
  variantCode: DraftVariantCode;
  nodeId: string;
  blockId: string;
  snippetAction: SnippetRecoveryAction;
  recovery: AdminIngestionSnippetRecoveryResponse["recovery"];
  makeBlockId: () => string;
}): {
  draft: AdminIngestionDraft;
  nextSelectedBlockId: string;
  appendFallbackToInsert: boolean;
} {
  const { draft, variantCode, nodeId, blockId, snippetAction, recovery, makeBlockId } =
    options;
  let nextSelectedBlockId = blockId;
  let appendFallbackToInsert = false;

  return {
    get appendFallbackToInsert() {
      return appendFallbackToInsert;
    },
    get nextSelectedBlockId() {
      return nextSelectedBlockId;
    },
    draft: {
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
              blocks: node.blocks.flatMap((block) => {
                if (block.id !== blockId) {
                  return [block];
                }

                const recoveredBlockBase: DraftBlock = {
                  id: makeBlockId(),
                  role: block.role,
                  type: recovery.type,
                  value: recovery.value,
                  data: recovery.data,
                  assetId: null,
                };

                if (snippetAction === "replace") {
                  return [
                    {
                      ...block,
                      type: recovery.type,
                      value: recovery.value,
                      data: recovery.data,
                      assetId: null,
                    },
                  ];
                }

                if (snippetAction === "append") {
                  const canAppend =
                    block.type === recovery.type ||
                    (recovery.type === "paragraph" &&
                      (block.type === "paragraph" ||
                        block.type === "list" ||
                        block.type === "heading"));

                  if (canAppend) {
                    return [
                      {
                        ...block,
                        value: block.value.trim().length
                          ? `${block.value}${recovery.type === "latex" ? "\n" : "\n\n"}${recovery.value}`
                          : recovery.value,
                        assetId: null,
                      },
                    ];
                  }

                  appendFallbackToInsert = true;
                }

                nextSelectedBlockId = recoveredBlockBase.id;
                return [block, recoveredBlockBase];
              }),
            };
          }),
        };
      }),
    },
  };
}

export function formatNativeSuggestionSource(
  source: NonNullable<DraftAsset["nativeSuggestion"]>["source"],
) {
  return source === "crop_recovery"
    ? "Recovered From Crop"
    : "Gemini First Pass";
}

export function formatNativeSuggestionStatus(
  status: NonNullable<DraftAsset["nativeSuggestion"]>["status"],
) {
  if (status === "recovered") {
    return "Recovered";
  }

  if (status === "stale") {
    return "Stale";
  }

  return "Suggested";
}
