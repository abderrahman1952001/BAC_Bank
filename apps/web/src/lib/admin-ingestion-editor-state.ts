import type {
  AdminFiltersResponse,
  AdminIngestionDraft,
  AdminIngestionValidationIssue,
  DraftVariantCode,
} from "@/lib/admin";
import type { TopicOption } from "@/lib/topic-taxonomy";
import type { DraftAsset, DraftNode } from "./admin-ingestion-structure";

export type IngestionEditorFocusRequest = {
  issueId: string;
  variantCode: DraftVariantCode | null;
  nodeId: string | null;
  blockId: string | null;
  assetId: string | null;
  sourcePageId: string | null;
};

export function buildBlockReferenceById(draft: AdminIngestionDraft) {
  const map = new Map<
    string,
    {
      variantCode: DraftVariantCode;
      nodeId: string;
      blockId: string;
      assetId: string | null;
    }
  >();

  for (const variant of draft.variants) {
    for (const node of variant.nodes) {
      for (const block of node.blocks) {
        map.set(block.id, {
          variantCode: variant.code,
          nodeId: node.id,
          blockId: block.id,
          assetId: block.assetId ?? null,
        });
      }
    }
  }

  return map;
}

export function buildNodeReferenceById(draft: AdminIngestionDraft) {
  const map = new Map<string, { variantCode: DraftVariantCode; nodeId: string }>();

  for (const variant of draft.variants) {
    for (const node of variant.nodes) {
      map.set(node.id, {
        variantCode: variant.code,
        nodeId: node.id,
      });
    }
  }

  return map;
}

export function buildAssetReferenceById(options: {
  draft: AdminIngestionDraft;
  assetById: Map<string, DraftAsset>;
  blockReferenceById: ReturnType<typeof buildBlockReferenceById>;
}) {
  const { draft, assetById, blockReferenceById } = options;
  const map = new Map<
    string,
    {
      variantCode: DraftVariantCode | null;
      nodeId: string | null;
      blockId: string | null;
      assetId: string;
      sourcePageId: string;
    }
  >();

  for (const asset of draft.assets) {
    map.set(asset.id, {
      variantCode: asset.variantCode,
      nodeId: null,
      blockId: null,
      assetId: asset.id,
      sourcePageId: asset.sourcePageId,
    });
  }

  for (const reference of blockReferenceById.values()) {
    if (!reference.assetId || !map.has(reference.assetId)) {
      continue;
    }

    const asset = assetById.get(reference.assetId);

    if (!asset) {
      continue;
    }

    map.set(reference.assetId, {
      variantCode: reference.variantCode,
      nodeId: reference.nodeId,
      blockId: reference.blockId,
      assetId: reference.assetId,
      sourcePageId: asset.sourcePageId,
    });
  }

  return map;
}

export function buildIssueCountById(
  issues: AdminIngestionValidationIssue[],
  key: "nodeId" | "blockId" | "assetId",
) {
  const map = new Map<string, number>();

  for (const issue of issues) {
    const targetId = issue[key];

    if (!targetId) {
      continue;
    }

    map.set(targetId, (map.get(targetId) ?? 0) + 1);
  }

  return map;
}

export function buildSelectedNodePath(
  nodeById: Map<string, DraftNode>,
  selectedNode: DraftNode | null,
) {
  if (!selectedNode) {
    return [];
  }

  const path: DraftNode[] = [];
  let cursor: DraftNode | null = selectedNode;

  while (cursor) {
    path.unshift(cursor);
    cursor = cursor.parentId ? (nodeById.get(cursor.parentId) ?? null) : null;
  }

  return path;
}

export function filterAvailableTopics(options: {
  filters: AdminFiltersResponse | null;
  subjectCode: string | null;
  selectedStreamCodes: string[];
}) {
  const { filters, subjectCode, selectedStreamCodes } = options;

  if (!filters || !subjectCode) {
    return [] satisfies TopicOption[];
  }

  return filters.topics.filter((topic) => {
    if (topic.subject.code !== subjectCode) {
      return false;
    }

    if (!selectedStreamCodes.length) {
      return true;
    }

    return selectedStreamCodes.some((streamCode) =>
      topic.streamCodes.includes(streamCode),
    );
  });
}

export function resolveSelectedVariantCode(options: {
  variants: AdminIngestionDraft["variants"];
  selectedVariantCode: DraftVariantCode;
}) {
  const { variants, selectedVariantCode } = options;

  if (!variants.length) {
    return null;
  }

  return variants.some((variant) => variant.code === selectedVariantCode)
    ? selectedVariantCode
    : (variants[0]?.code ?? null);
}

export function resolveSelectedNodeId(options: {
  activeVariant: AdminIngestionDraft["variants"][number] | null;
  selectedNodeId: string | null;
}) {
  const { activeVariant, selectedNodeId } = options;

  if (!activeVariant) {
    return null;
  }

  if (
    selectedNodeId &&
    activeVariant.nodes.some((node) => node.id === selectedNodeId)
  ) {
    return selectedNodeId;
  }

  return activeVariant.nodes[0]?.id ?? null;
}

export function resolveSelectedBlockId(options: {
  selectedNode: DraftNode | null;
  selectedBlockId: string | null;
}) {
  const { selectedNode, selectedBlockId } = options;

  if (!selectedNode) {
    return null;
  }

  if (
    selectedBlockId &&
    selectedNode.blocks.some((block) => block.id === selectedBlockId)
  ) {
    return selectedBlockId;
  }

  return selectedNode.blocks[0]?.id ?? null;
}

export function resolveFocusRequestTargets(options: {
  focusRequest: IngestionEditorFocusRequest | null;
  blockReferenceById: ReturnType<typeof buildBlockReferenceById>;
  nodeReferenceById: ReturnType<typeof buildNodeReferenceById>;
  assetReferenceById: ReturnType<typeof buildAssetReferenceById>;
}) {
  const { focusRequest, blockReferenceById, nodeReferenceById, assetReferenceById } =
    options;

  if (!focusRequest) {
    return null;
  }

  const blockReference = focusRequest.blockId
    ? (blockReferenceById.get(focusRequest.blockId) ?? null)
    : null;
  const nodeReference = focusRequest.nodeId
    ? (nodeReferenceById.get(focusRequest.nodeId) ?? null)
    : null;
  const assetReference = focusRequest.assetId
    ? (assetReferenceById.get(focusRequest.assetId) ?? null)
    : null;

  return {
    nextVariantCode:
      focusRequest.variantCode ??
      blockReference?.variantCode ??
      nodeReference?.variantCode ??
      assetReference?.variantCode ??
      null,
    nextNodeId:
      focusRequest.nodeId ??
      blockReference?.nodeId ??
      assetReference?.nodeId ??
      null,
    nextBlockId: focusRequest.blockId ?? assetReference?.blockId ?? null,
    nextAssetId: focusRequest.assetId ?? blockReference?.assetId ?? null,
  };
}

export function resolveFocusScrollTargetId(options: {
  focusRequest: IngestionEditorFocusRequest;
  targets: NonNullable<ReturnType<typeof resolveFocusRequestTargets>>;
}) {
  const { focusRequest, targets } = options;

  if (focusRequest.assetId || focusRequest.sourcePageId) {
    return targets.nextBlockId
      ? `inspector-block-${targets.nextBlockId}`
      : "ingestion-structure-editor";
  }

  if (targets.nextBlockId) {
    return `preview-block-${targets.nextBlockId}`;
  }

  if (targets.nextNodeId) {
    return `tree-node-${targets.nextNodeId}`;
  }

  return null;
}

export function toggleCollapsedNodeIds(
  current: Set<string>,
  nodeId: string,
): Set<string> {
  const next = new Set(current);

  if (next.has(nodeId)) {
    next.delete(nodeId);
  } else {
    next.add(nodeId);
  }

  return next;
}
