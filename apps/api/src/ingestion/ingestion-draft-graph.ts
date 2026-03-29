import { DraftNode, IngestionDraft } from './ingestion.contract';

export function collectReferencedAssetIds(draft: IngestionDraft) {
  const assetIds = new Set<string>();

  for (const variant of draft.variants) {
    for (const node of variant.nodes) {
      for (const block of node.blocks) {
        if (block.assetId) {
          assetIds.add(block.assetId);
        }
      }
    }
  }

  return assetIds;
}

export function collectDraftTopicCodes(draft: IngestionDraft) {
  return Array.from(
    new Set(
      draft.variants.flatMap((variant) =>
        variant.nodes.flatMap((node) => node.topicCodes),
      ),
    ),
  );
}

export function groupDraftNodesByParent(nodes: DraftNode[]) {
  const map = new Map<string | null, DraftNode[]>();

  for (const node of nodes) {
    const bucket = map.get(node.parentId) ?? [];
    bucket.push(node);
    map.set(node.parentId, bucket);
  }

  for (const bucket of map.values()) {
    bucket.sort((left, right) => left.orderIndex - right.orderIndex);
  }

  return map;
}
