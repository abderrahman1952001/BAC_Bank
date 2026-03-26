'use client';

/* eslint-disable @next/next/no-img-element */

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  IngestionCropEditor,
  IngestionCropPreview,
  type CropBox,
} from '@/components/ingestion-crop-editor';
import { StudyHierarchyBlockView } from '@/components/study-content';
import {
  fetchAdminJson,
  type AdminIngestionDraft,
  type AdminIngestionRecoveryMode,
  type AdminIngestionRecoveryResponse,
  type AdminIngestionSnippetRecoveryResponse,
  type AdminIngestionValidationIssue,
  type DraftAssetClassification,
  type DraftBlockRole,
  type DraftBlockType,
  type DraftVariantCode,
} from '@/lib/admin';
import type { ExamHierarchyBlock } from '@/lib/qbank';

type SourcePageEntry = {
  id: string;
  documentId: string;
  documentKind: 'exam' | 'correction';
  page_number: number;
  width: number;
  height: number;
  image_url: string;
};

type FocusRequest = {
  issueId: string;
  variantCode: DraftVariantCode | null;
  nodeId: string | null;
  blockId: string | null;
  assetId: string | null;
  sourcePageId: string | null;
};

type DraftNode = AdminIngestionDraft['variants'][number]['nodes'][number];
type DraftBlock = DraftNode['blocks'][number];
type DraftAsset = AdminIngestionDraft['assets'][number];
type LegacyDraftBlock = DraftBlock & {
  meta?: DraftBlock['meta'] & {
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

const NODE_TYPE_OPTIONS: DraftNode['nodeType'][] = [
  'EXERCISE',
  'PART',
  'QUESTION',
  'SUBQUESTION',
  'CONTEXT',
];
const BLOCK_TYPE_OPTIONS: DraftBlockType[] = [
  'paragraph',
  'heading',
  'latex',
  'image',
  'code',
  'table',
  'list',
  'graph',
  'tree',
];
const BLOCK_ROLE_OPTIONS: DraftBlockRole[] = [
  'PROMPT',
  'SOLUTION',
  'HINT',
  'META',
];
const ASSET_CLASSIFICATIONS: DraftAssetClassification[] = [
  'image',
  'table',
  'tree',
  'graph',
];
type AssetToolDraft = {
  mode: 'create' | 'edit';
  targetBlockId: string;
  assetId: string | null;
  sourcePageId: string;
  classification: DraftAssetClassification;
  role: DraftBlockRole;
  variantCode: DraftVariantCode | null;
  cropBox: CropBox;
};

function makeClientId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function formatRows(data: Record<string, unknown> | null | undefined) {
  if (!Array.isArray(data?.rows)) {
    return '';
  }

  return data.rows
    .map((row) =>
      Array.isArray(row)
        ? row.map((cell) => String(cell ?? '')).join(' | ')
        : '',
    )
    .filter((row) => row.trim().length > 0)
    .join('\n');
}

function parseRows(value: string) {
  return value
    .split('\n')
    .map((line) =>
      line
        .split('|')
        .map((cell) => cell.trim())
        .filter((cell) => cell.length > 0),
    )
    .filter((row) => row.length > 0);
}

function withRowsData(
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
  meta: LegacyDraftBlock['meta'] | undefined,
): DraftBlock['meta'] | undefined {
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

function sanitizeLegacyReviewDraft(draft: AdminIngestionDraft): AdminIngestionDraft {
  let changed = false;

  const assets = draft.assets.map((asset) => {
    const legacyAsset = asset as LegacyDraftAsset;

    if (!Object.prototype.hasOwnProperty.call(legacyAsset, 'caption')) {
      return asset;
    }

    changed = true;

    const { caption: _caption, ...rest } = legacyAsset;
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

        const { meta: _meta, ...rest } = block;
        return rest;
      });

      if (
        label !== legacyNode.label ||
        Object.prototype.hasOwnProperty.call(legacyNode, 'title') ||
        nodeChanged
      ) {
        changed = true;
        variantChanged = true;

        const { title: _title, ...rest } = legacyNode;

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

function toPreviewBlockType(type: DraftBlockType): ExamHierarchyBlock['blockType'] {
  if (type === 'heading') {
    return 'HEADING';
  }

  if (type === 'latex') {
    return 'LATEX';
  }

  if (type === 'image') {
    return 'IMAGE';
  }

  if (type === 'code') {
    return 'CODE';
  }

  if (type === 'table') {
    return 'TABLE';
  }

  if (type === 'list') {
    return 'LIST';
  }

  if (type === 'graph') {
    return 'GRAPH';
  }

  if (type === 'tree') {
    return 'TREE';
  }

  return 'PARAGRAPH';
}

function defaultNodeType(parent: DraftNode | null): DraftNode['nodeType'] {
  if (!parent) {
    return 'EXERCISE';
  }

  if (parent.nodeType === 'QUESTION' || parent.nodeType === 'SUBQUESTION') {
    return 'SUBQUESTION';
  }

  return 'QUESTION';
}

function defaultNodeLabel(
  nodeType: DraftNode['nodeType'],
  siblingCount: number,
) {
  const index = siblingCount + 1;

  if (nodeType === 'EXERCISE') {
    return `Exercise ${index}`;
  }

  if (nodeType === 'PART') {
    return `Part ${index}`;
  }

  if (nodeType === 'CONTEXT') {
    return `Context ${index}`;
  }

  if (nodeType === 'SUBQUESTION') {
    return `Sub-question ${index}`;
  }

  return `Question ${index}`;
}

function sortNodes(nodes: DraftNode[]) {
  return [...nodes].sort((left, right) => {
    if (left.orderIndex !== right.orderIndex) {
      return left.orderIndex - right.orderIndex;
    }

    return left.id.localeCompare(right.id);
  });
}

function buildChildrenMap(nodes: DraftNode[]) {
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

function normalizeVariantNodes(nodes: DraftNode[]) {
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

function collectDescendants(
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

function scrollToElement(elementId: string) {
  if (typeof document === 'undefined') {
    return;
  }

  window.requestAnimationFrame(() => {
    document.getElementById(elementId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  });
}

function normalizeNodeAfterReparent(
  node: DraftNode,
  nextParentId: string | null,
  parent: DraftNode | null,
): DraftNode {
  if (nextParentId === null) {
    if (node.nodeType === 'QUESTION' || node.nodeType === 'SUBQUESTION') {
      return {
        ...node,
        parentId: null,
        nodeType: 'EXERCISE',
      };
    }

    return {
      ...node,
      parentId: null,
    };
  }

  if (node.nodeType === 'EXERCISE') {
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

function buildPreviewBlocks(
  blocks: DraftBlock[],
  assetById: Map<string, DraftAsset>,
  assetPreviewBaseUrl: string,
): ExamHierarchyBlock[] {
  return blocks.map((block, index) => {
    const asset = block.assetId ? (assetById.get(block.assetId) ?? null) : null;
    const inferredKind =
      block.type === 'graph'
        ? 'formula_graph'
        : block.type === 'tree'
          ? 'probability_tree'
          : null;
    const data: Record<string, unknown> = {
      ...(isRecord(block.data) ? block.data : {}),
      ...(inferredKind &&
      (!isRecord(block.data) || typeof block.data.kind !== 'string')
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
      ...(block.type === 'image' && !asset && block.value
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
            type: 'IMAGE',
            metadata: {
              label: asset.label,
              classification: asset.classification,
            },
          }
        : null,
    };
  });
}

function areCropBoxesEqual(left: CropBox, right: CropBox) {
  return (
    left.x === right.x &&
    left.y === right.y &&
    left.width === right.width &&
    left.height === right.height
  );
}

function finalizeEditedAsset(previous: DraftAsset, next: DraftAsset): DraftAsset {
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

  if (!changed || nativeSuggestion.status === 'stale') {
    return next;
  }

  return {
    ...next,
    nativeSuggestion: {
      ...nativeSuggestion,
      status: 'stale' as const,
    },
  };
}

function makeDefaultSnippetCropBox(page: {
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

function makeDefaultAssetCropBox(page: {
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

function mapBlockTypeToAssetClassification(
  type: DraftBlockType,
): DraftAssetClassification {
  if (type === 'table' || type === 'tree' || type === 'graph') {
    return type;
  }

  return 'image';
}

function formatNativeSuggestionSource(source: NonNullable<DraftAsset['nativeSuggestion']>['source']) {
  return source === 'crop_recovery' ? 'Recovered From Crop' : 'Gemini First Pass';
}

function formatNativeSuggestionStatus(status: NonNullable<DraftAsset['nativeSuggestion']>['status']) {
  if (status === 'recovered') {
    return 'Recovered';
  }

  if (status === 'stale') {
    return 'Stale';
  }

  return 'Suggested';
}

export function AdminIngestionStructureEditor({
  jobId,
  draft,
  sourcePages,
  assetPreviewBaseUrl,
  issues,
  focusRequest,
  onChange,
}: {
  jobId: string;
  draft: AdminIngestionDraft;
  sourcePages: SourcePageEntry[];
  assetPreviewBaseUrl: string;
  issues: AdminIngestionValidationIssue[];
  focusRequest: FocusRequest | null;
  onChange: (nextDraft: AdminIngestionDraft) => void;
}) {
  const [selectedVariantCode, setSelectedVariantCode] =
    useState<DraftVariantCode>('SUJET_1');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [liveSelectedAssetCropBox, setLiveSelectedAssetCropBox] =
    useState<CropBox | null>(null);
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(
    new Set(),
  );
  const [recoveryMode, setRecoveryMode] = useState<AdminIngestionRecoveryMode | null>(
    null,
  );
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);
  const [recoveryNotes, setRecoveryNotes] = useState<string[]>([]);
  const [pendingInspectorScrollBlockId, setPendingInspectorScrollBlockId] =
    useState<string | null>(null);
  const [snippetSourcePageId, setSnippetSourcePageId] = useState<string | null>(
    null,
  );
  const [snippetCropBox, setSnippetCropBox] = useState<CropBox | null>(null);
  const [liveSnippetCropBox, setLiveSnippetCropBox] = useState<CropBox | null>(null);
  const [snippetAction, setSnippetAction] = useState<
    'replace' | 'append' | 'insert_below'
  >('replace');
  const [snippetRecoveryMode, setSnippetRecoveryMode] =
    useState<AdminIngestionRecoveryMode | null>(null);
  const [snippetRecoveryError, setSnippetRecoveryError] = useState<string | null>(
    null,
  );
  const [snippetRecoveryNotice, setSnippetRecoveryNotice] = useState<string | null>(
    null,
  );
  const [snippetRecoveryNotes, setSnippetRecoveryNotes] = useState<string[]>([]);
  const [assetToolDraft, setAssetToolDraft] = useState<AssetToolDraft | null>(null);
  const [liveAssetToolCropBox, setLiveAssetToolCropBox] = useState<CropBox | null>(
    null,
  );
  const [activeToolPanel, setActiveToolPanel] = useState<
    'snippet' | 'native' | 'asset' | null
  >(null);

  useEffect(() => {
    const sanitizedDraft = sanitizeLegacyReviewDraft(draft);

    if (sanitizedDraft !== draft) {
      onChange(sanitizedDraft);
    }
  }, [draft, onChange]);

  const activeVariant =
    draft.variants.find((variant) => variant.code === selectedVariantCode) ??
    draft.variants[0] ??
    null;
  const sortedNodes = useMemo(
    () => (activeVariant ? sortNodes(activeVariant.nodes) : []),
    [activeVariant],
  );
  const childrenByParent = useMemo(
    () => buildChildrenMap(sortedNodes),
    [sortedNodes],
  );
  const nodeById = useMemo(
    () => new Map(sortedNodes.map((node) => [node.id, node])),
    [sortedNodes],
  );
  const assetById = useMemo(
    () => new Map(draft.assets.map((asset) => [asset.id, asset])),
    [draft.assets],
  );
  const sourcePageById = useMemo(
    () => new Map(sourcePages.map((page) => [page.id, page])),
    [sourcePages],
  );
  const blockReferenceById = useMemo(() => {
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
  }, [draft.variants]);
  const nodeReferenceById = useMemo(() => {
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
  }, [draft.variants]);
  const assetReferenceById = useMemo(() => {
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
  }, [assetById, blockReferenceById, draft.assets]);
  const nodeIssueCountById = useMemo(() => {
    const map = new Map<string, number>();

    for (const issue of issues) {
      if (!issue.nodeId) {
        continue;
      }

      map.set(issue.nodeId, (map.get(issue.nodeId) ?? 0) + 1);
    }

    return map;
  }, [issues]);
  const blockIssueCountById = useMemo(() => {
    const map = new Map<string, number>();

    for (const issue of issues) {
      if (!issue.blockId) {
        continue;
      }

      map.set(issue.blockId, (map.get(issue.blockId) ?? 0) + 1);
    }

    return map;
  }, [issues]);
  const assetIssueCountById = useMemo(() => {
    const map = new Map<string, number>();

    for (const issue of issues) {
      if (!issue.assetId) {
        continue;
      }

      map.set(issue.assetId, (map.get(issue.assetId) ?? 0) + 1);
    }

    return map;
  }, [issues]);
  const selectedNode =
    selectedNodeId && activeVariant
      ? (activeVariant.nodes.find((node) => node.id === selectedNodeId) ?? null)
      : null;
  const selectedBlock =
    selectedNode && selectedBlockId
      ? selectedNode.blocks.find((block) => block.id === selectedBlockId) ?? null
      : null;
  const selectedAsset =
    (selectedAssetId ? assetById.get(selectedAssetId) ?? null : null) ??
    (selectedBlock?.assetId ? assetById.get(selectedBlock.assetId) ?? null : null);
  const selectedAssetPage = selectedAsset
    ? sourcePageById.get(selectedAsset.sourcePageId) ?? null
    : null;
  const snippetSourcePage =
    snippetSourcePageId ? sourcePageById.get(snippetSourcePageId) ?? null : null;
  const previewSnippetCropBox =
    liveSnippetCropBox ?? snippetCropBox ?? null;
  const previewCropBox =
    selectedAsset && liveSelectedAssetCropBox
      ? liveSelectedAssetCropBox
      : selectedAsset?.cropBox ?? null;
  const assetToolPage = assetToolDraft
    ? sourcePageById.get(assetToolDraft.sourcePageId) ?? null
    : null;
  const assetToolPreviewCropBox = liveAssetToolCropBox ?? assetToolDraft?.cropBox ?? null;
  const activeToolPanelBusy =
    activeToolPanel === 'snippet'
      ? snippetRecoveryMode !== null
      : activeToolPanel === 'native'
        ? recoveryMode !== null
        : false;
  const selectedDescendants = useMemo(
    () =>
      selectedNode
        ? collectDescendants(childrenByParent, selectedNode.id)
        : new Set<string>(),
    [childrenByParent, selectedNode],
  );
  const parentOptions = useMemo(
    () =>
      sortedNodes.filter((node) => !selectedDescendants.has(node.id)),
    [selectedDescendants, sortedNodes],
  );
  const selectedNodePath = useMemo(() => {
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
  }, [nodeById, selectedNode]);
  useEffect(() => {
    if (!activeVariant && draft.variants.length > 0) {
      setSelectedVariantCode(draft.variants[0].code);
      return;
    }

    if (
      activeVariant &&
      !draft.variants.some((variant) => variant.code === selectedVariantCode)
    ) {
      setSelectedVariantCode(draft.variants[0]?.code ?? 'SUJET_1');
    }
  }, [activeVariant, draft.variants, selectedVariantCode]);

  useEffect(() => {
    if (!activeVariant) {
      setSelectedNodeId(null);
      return;
    }

    if (
      !selectedNodeId ||
      !activeVariant.nodes.some((node) => node.id === selectedNodeId)
    ) {
      setSelectedNodeId(activeVariant.nodes[0]?.id ?? null);
    }
  }, [activeVariant, selectedNodeId]);

  useEffect(() => {
    if (!selectedNode) {
      setSelectedBlockId(null);
      return;
    }

    if (
      !selectedBlockId ||
      !selectedNode.blocks.some((block) => block.id === selectedBlockId)
    ) {
      setSelectedBlockId(selectedNode.blocks[0]?.id ?? null);
    }
  }, [selectedBlockId, selectedNode]);

  useEffect(() => {
    if (!selectedBlock) {
      return;
    }

    setSelectedAssetId(selectedBlock.assetId ?? null);
  }, [selectedBlock]);

  useEffect(() => {
    setLiveSelectedAssetCropBox(null);
  }, [selectedAsset?.id, selectedAsset?.sourcePageId]);

  useEffect(() => {
    setRecoveryError(null);
    setRecoveryNotice(null);
    setRecoveryNotes([]);
  }, [selectedAsset?.id, selectedBlock?.id]);

  useEffect(() => {
    setSnippetRecoveryError(null);
    setSnippetRecoveryNotice(null);
    setSnippetRecoveryNotes([]);
  }, [selectedBlock?.id]);

  useEffect(() => {
    const initialPageId =
      selectedAsset?.sourcePageId ?? sourcePages[0]?.id ?? null;

    if (!initialPageId) {
      setSnippetSourcePageId(null);
      setSnippetCropBox(null);
      return;
    }

    const page = sourcePageById.get(initialPageId) ?? null;

    if (!page) {
      setSnippetCropBox(null);
      return;
    }

    setSnippetSourcePageId(initialPageId);
    setSnippetCropBox(makeDefaultSnippetCropBox(page));
  }, [selectedAsset?.sourcePageId, selectedBlock?.id, sourcePageById, sourcePages]);

  useEffect(() => {
    if (!snippetSourcePageId) {
      return;
    }

    if (sourcePageById.has(snippetSourcePageId)) {
      return;
    }

    const fallbackPageId = sourcePages[0]?.id ?? null;

    if (!fallbackPageId) {
      setSnippetSourcePageId(null);
      setSnippetCropBox(null);
      return;
    }

    const page = sourcePageById.get(fallbackPageId) ?? null;
    setSnippetSourcePageId(fallbackPageId);
    setSnippetCropBox(page ? makeDefaultSnippetCropBox(page) : null);
  }, [snippetSourcePageId, sourcePageById, sourcePages]);

  useEffect(() => {
    setLiveSnippetCropBox(null);
  }, [snippetSourcePageId]);

  useEffect(() => {
    setLiveAssetToolCropBox(null);
  }, [assetToolDraft?.assetId, assetToolDraft?.sourcePageId]);

  useEffect(() => {
    if (!activeToolPanel || typeof document === 'undefined') {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !activeToolPanelBusy) {
        setActiveToolPanel(null);
        setAssetToolDraft(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeToolPanel, activeToolPanelBusy]);

  useEffect(() => {
    if (activeToolPanel === 'snippet' && !selectedBlock) {
      setActiveToolPanel(null);
      return;
    }

    if (activeToolPanel === 'native' && (!selectedBlock || !selectedAsset)) {
      setActiveToolPanel(null);
      return;
    }

    if (activeToolPanel === 'asset' && !assetToolDraft) {
      setActiveToolPanel(null);
    }
  }, [activeToolPanel, assetToolDraft, selectedAsset, selectedBlock]);

  useEffect(() => {
    if (!pendingInspectorScrollBlockId) {
      return;
    }

    const elementId = `inspector-block-${pendingInspectorScrollBlockId}`;

    window.requestAnimationFrame(() => {
      const element = document.getElementById(elementId);

      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
        setPendingInspectorScrollBlockId(null);
      }
    });
  }, [pendingInspectorScrollBlockId, selectedBlockId, selectedNodeId]);

  useEffect(() => {
    if (!focusRequest) {
      return;
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
    const nextVariantCode =
      focusRequest.variantCode ??
      blockReference?.variantCode ??
      nodeReference?.variantCode ??
      assetReference?.variantCode ??
      null;
    const nextNodeId =
      focusRequest.nodeId ??
      blockReference?.nodeId ??
      assetReference?.nodeId ??
      null;
    const nextBlockId =
      focusRequest.blockId ??
      assetReference?.blockId ??
      null;
    const nextAssetId =
      focusRequest.assetId ??
      blockReference?.assetId ??
      null;

    if (nextVariantCode) {
      setSelectedVariantCode(nextVariantCode);
    }

    if (nextNodeId) {
      setSelectedNodeId(nextNodeId);
    }

    if (nextBlockId) {
      setSelectedBlockId(nextBlockId);
    }

    if (nextAssetId) {
      setSelectedAssetId(nextAssetId);
    }

    if (focusRequest.assetId || focusRequest.sourcePageId) {
      scrollToElement(
        nextBlockId ? `inspector-block-${nextBlockId}` : 'ingestion-structure-editor',
      );
      return;
    }

    if (nextBlockId) {
      scrollToElement(`preview-block-${nextBlockId}`);
      return;
    }

    if (nextNodeId) {
      scrollToElement(`tree-node-${nextNodeId}`);
    }
  }, [assetReferenceById, blockReferenceById, focusRequest, nodeReferenceById]);

  function updateVariant(
    variantCode: DraftVariantCode,
    mutator: (
      variant: AdminIngestionDraft['variants'][number],
    ) => AdminIngestionDraft['variants'][number],
  ) {
    onChange({
      ...draft,
      variants: draft.variants.map((variant) =>
        variant.code === variantCode ? mutator(variant) : variant,
      ),
    });
  }

  function updateVariantNodes(
    variantCode: DraftVariantCode,
    mutator: (nodes: DraftNode[]) => DraftNode[],
  ) {
    updateVariant(variantCode, (variant) => ({
      ...variant,
      nodes: normalizeVariantNodes(mutator(variant.nodes)),
    }));
  }

  function updateSelectedNodeFields(patch: Partial<DraftNode>) {
    if (!activeVariant || !selectedNode) {
      return;
    }

    updateVariantNodes(activeVariant.code, (nodes) =>
      nodes.map((node) =>
        node.id === selectedNode.id
          ? {
              ...node,
              ...patch,
            }
          : node,
      ),
    );
  }

  function updateSelectedNodeBlocks(
    mutator: (blocks: DraftBlock[]) => DraftBlock[],
  ) {
    if (!activeVariant || !selectedNode) {
      return;
    }

    updateVariantNodes(activeVariant.code, (nodes) =>
      nodes.map((node) =>
        node.id === selectedNode.id
          ? {
              ...node,
              blocks: mutator(node.blocks),
            }
          : node,
      ),
    );
  }

  function addNode(parentId: string | null) {
    if (!activeVariant) {
      return;
    }

    const parent = parentId ? (nodeById.get(parentId) ?? null) : null;
    const siblingCount = activeVariant.nodes.filter(
      (node) => node.parentId === parentId,
    ).length;
    const nodeType = defaultNodeType(parent);
    const nextNode: DraftNode = {
      id: makeClientId('node'),
      nodeType,
      parentId,
      orderIndex: siblingCount + 1,
      label: defaultNodeLabel(nodeType, siblingCount),
      maxPoints: null,
      blocks: [],
    };

    updateVariantNodes(activeVariant.code, (nodes) => [...nodes, nextNode]);
    setSelectedNodeId(nextNode.id);
    setSelectedBlockId(null);
  }

  function removeSelectedNode() {
    if (!activeVariant || !selectedNode) {
      return;
    }

    if (!window.confirm('Delete this node and all of its descendants?')) {
      return;
    }

    const blockedIds = collectDescendants(childrenByParent, selectedNode.id);
    const nextSelectedNode =
      selectedNode.parentId ??
      sortNodes(
        activeVariant.nodes.filter((node) => !blockedIds.has(node.id)),
      )[0]?.id ??
      null;

    updateVariantNodes(activeVariant.code, (nodes) =>
      nodes.filter((node) => !blockedIds.has(node.id)),
    );
    setSelectedNodeId(nextSelectedNode);
  }

  function moveSelectedNode(direction: -1 | 1) {
    if (!activeVariant || !selectedNode) {
      return;
    }

    const siblings = sortNodes(
      activeVariant.nodes.filter((node) => node.parentId === selectedNode.parentId),
    );
    const sourceIndex = siblings.findIndex((node) => node.id === selectedNode.id);
    const targetIndex = sourceIndex + direction;

    if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= siblings.length) {
      return;
    }

    const nextSiblings = [...siblings];
    [nextSiblings[sourceIndex], nextSiblings[targetIndex]] = [
      nextSiblings[targetIndex],
      nextSiblings[sourceIndex],
    ];

    const orderById = new Map(
      nextSiblings.map((node, index) => [node.id, index + 1]),
    );

    updateVariantNodes(activeVariant.code, (nodes) =>
      nodes.map((node) =>
        orderById.has(node.id)
          ? {
              ...node,
              orderIndex: orderById.get(node.id) ?? node.orderIndex,
            }
          : node,
      ),
    );
  }

  function reparentSelectedNode(nextParentId: string | null) {
    if (!activeVariant || !selectedNode) {
      return;
    }

    const parent = nextParentId ? (nodeById.get(nextParentId) ?? null) : null;
    const nextOrderIndex =
      activeVariant.nodes.filter((node) => node.parentId === nextParentId).length +
      1;

    updateVariantNodes(activeVariant.code, (nodes) =>
      nodes.map((node) =>
        node.id === selectedNode.id
          ? {
              ...normalizeNodeAfterReparent(node, nextParentId, parent),
              orderIndex: nextOrderIndex,
            }
          : node,
      ),
    );
  }

  function addBlock() {
    if (!selectedNode) {
      return;
    }

    const nextBlock: DraftBlock = {
      id: makeClientId('block'),
      role: 'PROMPT',
      type: 'paragraph',
      value: '',
      assetId: null,
      data: null,
    };

    updateSelectedNodeBlocks((blocks) => [...blocks, nextBlock]);
    setSelectedBlockId(nextBlock.id);
  }

  function moveBlock(blockId: string, direction: -1 | 1) {
    if (!selectedNode) {
      return;
    }

    updateSelectedNodeBlocks((blocks) => {
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
    });
  }

  function removeBlock(blockId: string) {
    updateSelectedNodeBlocks((blocks) => blocks.filter((block) => block.id !== blockId));
  }

  function updateBlock(blockId: string, patch: Partial<DraftBlock>) {
    updateSelectedNodeBlocks((blocks) =>
      blocks.map((block) =>
        block.id === blockId
          ? {
              ...block,
              ...patch,
            }
          : block,
      ),
    );
  }

  function applyBlockPreset(
    blockId: string,
    preset: 'table' | 'formula_graph' | 'probability_tree',
  ) {
    if (preset === 'table') {
      updateBlock(blockId, {
        type: 'table',
        data: {
          rows: [
            ['Header 1', 'Header 2'],
            ['Value 1', 'Value 2'],
          ],
        },
      });
      return;
    }

    if (preset === 'formula_graph') {
      updateBlock(blockId, {
        type: 'graph',
        value: '',
        data: {
          kind: 'formula_graph',
          formulaGraph: {
            title: 'Graph',
            xDomain: [-5, 5],
            yDomain: [-5, 5],
            curves: [
              {
                fn: 'x',
                label: 'f(x)',
              },
            ],
          },
        },
      });
      return;
    }

    updateBlock(blockId, {
      type: 'tree',
      value: '',
      data: {
        kind: 'probability_tree',
        probabilityTree: {
          direction: 'ltr',
          root: {
            label: 'Start',
            children: [
              {
                label: 'A',
                edgeLabel: 'A',
                probability: 'p',
              },
              {
                label: 'B',
                edgeLabel: 'B',
                probability: '1-p',
              },
            ],
          },
        },
      },
    });
  }

  function updateBlockData(
    blockId: string,
    nextData: Record<string, unknown> | null,
  ) {
    updateSelectedNodeBlocks((blocks) =>
      blocks.map((block) =>
        block.id === blockId
          ? {
              ...block,
              data: nextData && Object.keys(nextData).length ? nextData : null,
            }
          : block,
      ),
    );
  }

  function updateAsset(assetId: string, patch: Partial<DraftAsset>) {
    onChange({
      ...draft,
      assets: draft.assets.map((asset) =>
        asset.id === assetId
          ? finalizeEditedAsset(asset, {
              ...asset,
              ...patch,
            })
          : asset,
      ),
    });
  }

  function openAssetToolPanel(block: DraftBlock, mode: 'create' | 'edit') {
    const linkedAsset =
      mode === 'edit' && block.assetId
        ? (assetById.get(block.assetId) ?? null)
        : null;
    const fallbackPageId = linkedAsset?.sourcePageId ?? sourcePages[0]?.id ?? null;

    if (!fallbackPageId) {
      return;
    }

    const fallbackPage = sourcePageById.get(fallbackPageId) ?? null;

    if (!fallbackPage) {
      return;
    }

    setSelectedBlockId(block.id);
    setSelectedAssetId(linkedAsset?.id ?? null);
    setAssetToolDraft({
      mode: linkedAsset ? 'edit' : 'create',
      targetBlockId: block.id,
      assetId: linkedAsset?.id ?? null,
      sourcePageId: fallbackPage.id,
      classification:
        linkedAsset?.classification ?? mapBlockTypeToAssetClassification(block.type),
      role: linkedAsset?.role ?? block.role,
      variantCode: linkedAsset?.variantCode ?? selectedVariantCode,
      cropBox: linkedAsset?.cropBox ?? makeDefaultAssetCropBox(fallbackPage),
    });
    setLiveAssetToolCropBox(null);
    setActiveToolPanel('asset');
  }

  function closeAssetToolPanel() {
    setAssetToolDraft(null);
    setLiveAssetToolCropBox(null);
    setActiveToolPanel(null);
  }

  function saveAssetToolDraft() {
    if (!assetToolDraft || !assetToolPage) {
      return;
    }

    const existingAsset = assetToolDraft.assetId
      ? (assetById.get(assetToolDraft.assetId) ?? null)
      : null;

    if (assetToolDraft.assetId && !existingAsset) {
      return;
    }

    const nextAssetId = assetToolDraft.assetId ?? makeClientId('asset');
    let nextAsset: DraftAsset;

    if (existingAsset) {
      nextAsset = finalizeEditedAsset(existingAsset, {
        ...existingAsset,
        sourcePageId: assetToolPage.id,
        documentKind:
          assetToolPage.documentKind === 'correction' ? 'CORRECTION' : 'EXAM',
        pageNumber: assetToolPage.page_number,
        classification: assetToolDraft.classification,
        role: assetToolDraft.role,
        variantCode: assetToolDraft.variantCode,
        cropBox: assetToolDraft.cropBox,
      });
    } else {
      nextAsset = {
        id: nextAssetId,
        sourcePageId: assetToolPage.id,
        documentKind:
          assetToolPage.documentKind === 'correction' ? 'CORRECTION' : 'EXAM',
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

    onChange({
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
                  assetId: nextAssetId,
                }
              : block,
          ),
        })),
      })),
    });
    setSelectedAssetId(nextAssetId);
    closeAssetToolPanel();
  }

  function applyNativeSuggestionToSelectedBlock() {
    if (
      !selectedNode ||
      !selectedBlock ||
      !selectedAsset?.nativeSuggestion ||
      selectedAsset.nativeSuggestion.status === 'stale'
    ) {
      return;
    }

    onChange({
      ...draft,
      variants: draft.variants.map((variant) => {
        if (variant.code !== selectedVariantCode) {
          return variant;
        }

        return {
          ...variant,
          nodes: variant.nodes.map((node) => {
            if (node.id !== selectedNode.id) {
              return node;
            }

            return {
              ...node,
              blocks: node.blocks.map((block) =>
                block.id === selectedBlock.id
                  ? {
                      ...block,
                      type: selectedAsset.nativeSuggestion?.type ?? block.type,
                      value: selectedAsset.nativeSuggestion?.value ?? '',
                      data: selectedAsset.nativeSuggestion?.data ?? null,
                      assetId: selectedAsset.id,
                    }
                  : block,
              ),
            };
          }),
        };
      }),
    });
    setRecoveryNotice(
      'Applied the stored native draft suggestion to the selected block. Review it, then save the draft.',
    );
    setRecoveryError(null);
    setRecoveryNotes(selectedAsset.nativeSuggestion.notes);
  }

  async function recoverIntoSelectedBlock(mode: AdminIngestionRecoveryMode) {
    if (!selectedNode || !selectedBlock || !selectedAsset) {
      setRecoveryError('Select both a target block and a source crop before recovering content.');
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
          method: 'POST',
          body: JSON.stringify({
            mode,
          }),
        },
      );
      const keepsAsset =
        mode === 'table' || mode === 'tree' || mode === 'graph';
      const nextAssetClassification: DraftAssetClassification | null =
        mode === 'table' || mode === 'tree' || mode === 'graph'
          ? mode
          : null;

      onChange({
        ...draft,
        variants: draft.variants.map((variant) => {
          if (variant.code !== selectedVariantCode) {
            return variant;
          }

          return {
            ...variant,
            nodes: variant.nodes.map((node) => {
              if (node.id !== selectedNode.id) {
                return node;
              }

              return {
                ...node,
                blocks: node.blocks.map((block) => {
                  if (block.id !== selectedBlock.id) {
                    return block;
                  }

                  const nextBlock: DraftBlock = {
                    ...block,
                    type: payload.recovery.type,
                    value: payload.recovery.value,
                    data: payload.recovery.data,
                    assetId: keepsAsset ? selectedAsset.id : null,
                  };

                  return nextBlock;
                }),
              };
            }),
          };
        }),
        assets: nextAssetClassification
          ? draft.assets.map((asset) =>
              asset.id === selectedAsset.id
                ? {
                    ...asset,
                    classification: nextAssetClassification,
                    nativeSuggestion: keepsAsset
                      ? {
                          type: payload.recovery.type as
                            | 'table'
                            | 'tree'
                            | 'graph',
                          value: payload.recovery.value,
                          data: payload.recovery.data,
                          status: 'recovered',
                          source: 'crop_recovery',
                          notes: payload.recovery.notes,
                        }
                      : asset.nativeSuggestion,
                  }
                : asset,
            )
          : draft.assets,
      });
      setRecoveryNotes(payload.recovery.notes);
      setRecoveryNotice(
        keepsAsset
          ? 'Recovered a native structured block from the selected crop. Review it, then save the draft.'
          : 'Recovered inline content from the selected crop. Review it, then save the draft.',
      );
    } catch (error) {
      setRecoveryError(
        error instanceof Error
          ? error.message
          : 'Failed to recover content from the selected crop.',
      );
    } finally {
      setRecoveryMode(null);
    }
  }

  async function recoverSnippetIntoSelectedBlock(mode: 'text' | 'latex') {
    if (!selectedNode || !selectedBlock || !snippetSourcePage || !snippetCropBox) {
      setSnippetRecoveryError(
        'Select a target block, source page, and crop before recovering text.',
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
          method: 'POST',
          body: JSON.stringify({
            mode,
            source_page_id: snippetSourcePage.id,
            crop_box: snippetCropBox,
            label: selectedBlock.id,
          }),
        },
      );

      let nextSelectedBlockId = selectedBlock.id;
      let appendFallbackToInsert = false;

      onChange({
        ...draft,
        variants: draft.variants.map((variant) => {
          if (variant.code !== selectedVariantCode) {
            return variant;
          }

          return {
            ...variant,
            nodes: variant.nodes.map((node) => {
              if (node.id !== selectedNode.id) {
                return node;
              }

              const recoveredBlockBase: DraftBlock = {
                id: makeClientId('block'),
                role: selectedBlock.role,
                type: payload.recovery.type,
                value: payload.recovery.value,
                data: payload.recovery.data,
                assetId: null,
              };

              return {
                ...node,
                blocks: node.blocks.flatMap((block) => {
                  if (block.id !== selectedBlock.id) {
                    return [block];
                  }

                  if (snippetAction === 'replace') {
                    return [
                      {
                        ...block,
                        type: payload.recovery.type,
                        value: payload.recovery.value,
                        data: payload.recovery.data,
                        assetId: null,
                      },
                    ];
                  }

                  if (snippetAction === 'append') {
                    const canAppend =
                      block.type === payload.recovery.type ||
                      (payload.recovery.type === 'paragraph' &&
                        (block.type === 'paragraph' ||
                          block.type === 'list' ||
                          block.type === 'heading'));

                    if (canAppend) {
                      return [
                        {
                          ...block,
                          value: block.value.trim().length
                            ? `${block.value}${payload.recovery.type === 'latex' ? '\n' : '\n\n'}${payload.recovery.value}`
                            : payload.recovery.value,
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
      });

      setSelectedBlockId(nextSelectedBlockId);
      setPendingInspectorScrollBlockId(nextSelectedBlockId);
      setSnippetRecoveryNotes(payload.recovery.notes);
      setSnippetRecoveryNotice(
        snippetAction === 'replace'
          ? 'Re-read the selected snippet and replaced the block content. Review it, then save the draft.'
          : snippetAction === 'append' && !appendFallbackToInsert
            ? 'Recovered content was appended to the selected block. Review it, then save the draft.'
            : appendFallbackToInsert
              ? 'Recovered content used a different block type, so it was inserted below instead of appended.'
              : 'Recovered content was inserted below the selected block. Review it, then save the draft.',
      );
    } catch (error) {
      setSnippetRecoveryError(
        error instanceof Error
          ? error.message
          : 'Failed to recover content from the selected snippet.',
      );
    } finally {
      setSnippetRecoveryMode(null);
    }
  }

  function focusSnippetTools(nodeId: string, blockId: string) {
    setSelectedNodeId(nodeId);
    setSelectedBlockId(blockId);
    setSelectedAssetId(blockReferenceById.get(blockId)?.assetId ?? null);
    setPendingInspectorScrollBlockId(blockId);
    setAssetToolDraft(null);
    setLiveAssetToolCropBox(null);
    setActiveToolPanel('snippet');
  }

  function focusNativeTools(nodeId: string, blockId: string, assetId: string) {
    setSelectedNodeId(nodeId);
    setSelectedBlockId(blockId);
    setSelectedAssetId(assetId);
    setPendingInspectorScrollBlockId(blockId);
    setAssetToolDraft(null);
    setLiveAssetToolCropBox(null);
    setActiveToolPanel('native');
  }

  function closeActiveToolPanel() {
    if (activeToolPanelBusy) {
      return;
    }

    if (activeToolPanel === 'asset') {
      closeAssetToolPanel();
      return;
    }

    setAssetToolDraft(null);
    setLiveAssetToolCropBox(null);
    setActiveToolPanel(null);
  }

  function focusPreviewNode(nodeId: string) {
    setSelectedNodeId(nodeId);
    scrollToElement(`preview-node-${nodeId}`);
  }

  function renderToolPanelShell(
    mode: 'snippet' | 'native' | 'asset',
    title: string,
    description: string,
    children: ReactNode,
  ) {
    return (
      <div
        className="ingestion-tool-backdrop"
        onClick={() => {
          closeActiveToolPanel();
        }}
      >
        <aside
          className="ingestion-tool-sheet"
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <header className="ingestion-tool-head">
            <div>
              <p className="page-kicker">
                {mode === 'snippet'
                  ? 'Text Repair'
                  : mode === 'native'
                    ? 'Native Rendering'
                    : 'Asset Builder'}
              </p>
              <h2>{title}</h2>
              <p className="muted-text">{description}</p>
            </div>

            <div className="block-item-actions">
              <button
                type="button"
                className="btn-secondary"
                disabled={activeToolPanelBusy}
                onClick={closeActiveToolPanel}
              >
                Close
              </button>
            </div>
          </header>

          {children}
        </aside>
      </div>
    );
  }

  function renderSnippetToolPanelContent() {
    return (
      <div className="ingestion-tool-layout">
        <div className="ingestion-tool-preview-stack">
          {snippetSourcePage && snippetCropBox ? (
            <article className="ingestion-preview-card ingestion-crop-card">
              <IngestionCropEditor
                imageUrl={snippetSourcePage.image_url}
                alt={`Snippet source page ${snippetSourcePage.page_number}`}
                naturalWidth={snippetSourcePage.width}
                naturalHeight={snippetSourcePage.height}
                cropBox={snippetCropBox}
                onPreviewChange={setLiveSnippetCropBox}
                onChange={(nextCropBox) => {
                  setLiveSnippetCropBox(null);
                  setSnippetCropBox(nextCropBox);
                }}
              />
            </article>
          ) : (
            <section className="admin-context-card">
              <p className="muted-text">
                Select a source page to start cropping the missed sentence or
                formula.
              </p>
            </section>
          )}

          {snippetSourcePage && previewSnippetCropBox ? (
            <figure className="ingestion-preview-card">
              <IngestionCropPreview
                imageUrl={snippetSourcePage.image_url}
                alt="Snippet preview"
                naturalWidth={snippetSourcePage.width}
                naturalHeight={snippetSourcePage.height}
                cropBox={previewSnippetCropBox}
              />
              <figcaption>Snippet preview</figcaption>
            </figure>
          ) : null}
        </div>

        <div className="ingestion-tool-controls">
          <section className="admin-context-card">
            <div className="admin-page-head ingestion-side-head">
              <div>
                <h3>Fix Text From Source</h3>
                <p className="muted-text">
                  Crop the exact snippet, then replace the block, append to it,
                  or insert a new block underneath.
                </p>
              </div>
            </div>

            {!selectedBlock ? (
              <p className="muted-text">
                Select a block first, then reopen this panel.
              </p>
            ) : (
              <div className="admin-form-grid">
                <label className="field">
                  <span>Target block</span>
                  <input
                    value={`${selectedBlock.role} · ${selectedBlock.type}`}
                    readOnly
                  />
                </label>

                <label className="field">
                  <span>Apply action</span>
                  <select
                    value={snippetAction}
                    onChange={(event) => {
                      setSnippetAction(
                        event.target.value as
                          | 'replace'
                          | 'append'
                          | 'insert_below',
                      );
                    }}
                  >
                    <option value="replace">Replace block</option>
                    <option value="append">Append to block</option>
                    <option value="insert_below">Insert below</option>
                  </select>
                </label>

                <label className="field admin-form-wide">
                  <span>Source page</span>
                  <select
                    value={snippetSourcePageId ?? ''}
                    onChange={(event) => {
                      const nextPage =
                        sourcePageById.get(event.target.value) ?? null;
                      setSnippetSourcePageId(event.target.value || null);
                      setLiveSnippetCropBox(null);
                      setSnippetCropBox(
                        nextPage ? makeDefaultSnippetCropBox(nextPage) : null,
                      );
                    }}
                  >
                    {sourcePages.map((page) => (
                      <option key={page.id} value={page.id}>
                        {page.documentKind} page {page.page_number}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </section>

          <section className="admin-context-card">
            <h3>Run Recovery</h3>
            <div className="block-item-actions ingestion-recovery-actions">
              <button
                type="button"
                className="btn-secondary"
                disabled={
                  !selectedBlock ||
                  !snippetCropBox ||
                  snippetRecoveryMode !== null
                }
                onClick={() => {
                  void recoverSnippetIntoSelectedBlock('text');
                }}
              >
                {snippetRecoveryMode === 'text' ? 'Recovering…' : 'Recover Text'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={
                  !selectedBlock ||
                  !snippetCropBox ||
                  snippetRecoveryMode !== null
                }
                onClick={() => {
                  void recoverSnippetIntoSelectedBlock('latex');
                }}
              >
                {snippetRecoveryMode === 'latex' ? 'Recovering…' : 'Recover LaTeX'}
              </button>
            </div>
            <p className="muted-text">
              This is for OCR mistakes and missed lines only. The cropped snippet
              is temporary and does not create a permanent asset.
            </p>
            {snippetRecoveryError ? (
              <p className="error-text">{snippetRecoveryError}</p>
            ) : null}
            {snippetRecoveryNotice ? (
              <p className="success-text">{snippetRecoveryNotice}</p>
            ) : null}
            {snippetRecoveryNotes.length ? (
              <div className="ingestion-recovery-notes">
                {snippetRecoveryNotes.map((note) => (
                  <p key={note} className="muted-text">
                    Note: {note}
                  </p>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    );
  }

  function renderNativeToolPanelContent() {
    return (
      <div className="ingestion-tool-layout">
        <div className="ingestion-tool-preview-stack">
          {selectedAssetPage ? (
            <article className="ingestion-preview-card ingestion-crop-card">
              <IngestionCropEditor
                imageUrl={selectedAssetPage.image_url}
                alt={`Source page ${selectedAssetPage.page_number}`}
                naturalWidth={selectedAssetPage.width}
                naturalHeight={selectedAssetPage.height}
                cropBox={selectedAsset?.cropBox ?? {
                  x: 0,
                  y: 0,
                  width: 1,
                  height: 1,
                }}
                onPreviewChange={setLiveSelectedAssetCropBox}
                onChange={(nextCropBox) => {
                  if (!selectedAsset) {
                    return;
                  }

                  setLiveSelectedAssetCropBox(null);
                  updateAsset(selectedAsset.id, {
                    cropBox: nextCropBox,
                  });
                }}
              />
            </article>
          ) : (
            <section className="admin-context-card">
              <p className="muted-text">
                Select an asset-linked block to review its crop and promote it
                into a native table, tree, or graph.
              </p>
            </section>
          )}

          {selectedAssetPage && previewCropBox ? (
            <figure className="ingestion-preview-card">
              <IngestionCropPreview
                imageUrl={selectedAssetPage.image_url}
                alt={selectedAsset?.label ?? selectedAsset?.id ?? 'Asset preview'}
                naturalWidth={selectedAssetPage.width}
                naturalHeight={selectedAssetPage.height}
                cropBox={previewCropBox}
              />
              <figcaption>Live crop preview</figcaption>
            </figure>
          ) : selectedAsset ? (
            <figure className="ingestion-preview-card">
              <img
                src={`${assetPreviewBaseUrl}/${selectedAsset.id}/preview`}
                alt={selectedAsset.label ?? selectedAsset.id}
              />
              <figcaption>Saved crop preview</figcaption>
            </figure>
          ) : null}
        </div>

        <div className="ingestion-tool-controls">
          <section className="admin-context-card">
            <div className="admin-page-head ingestion-side-head">
              <div>
                <h3>Native Asset Workflow</h3>
                <p className="muted-text">
                  Tighten the crop if needed, then apply a suggested draft or
                  re-extract the asset as a native block.
                </p>
              </div>
            </div>

            {!selectedAsset ? (
              <p className="muted-text">
                Select an asset-linked block first, then reopen this panel.
              </p>
            ) : (
              <div className="admin-form-grid">
                <label className="field">
                  <span>Target block</span>
                  <input
                    value={
                      selectedBlock
                        ? `${selectedBlock.role} · ${selectedBlock.type}`
                        : 'No target block selected'
                    }
                    readOnly
                  />
                </label>

                <label className="field">
                  <span>Classification</span>
                  <select
                    value={selectedAsset.classification}
                    onChange={(event) => {
                      updateAsset(selectedAsset.id, {
                        classification:
                          event.target.value as DraftAssetClassification,
                      });
                    }}
                  >
                    {ASSET_CLASSIFICATIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field admin-form-wide">
                  <span>Source page</span>
                  <select
                    value={selectedAsset.sourcePageId}
                    onChange={(event) => {
                      const nextPage =
                        sourcePageById.get(event.target.value) ?? null;

                      updateAsset(selectedAsset.id, {
                        sourcePageId: event.target.value,
                        documentKind:
                          nextPage?.documentKind === 'correction'
                            ? 'CORRECTION'
                            : 'EXAM',
                        pageNumber: nextPage?.page_number ?? selectedAsset.pageNumber,
                      });
                    }}
                  >
                    {sourcePages.map((page) => (
                      <option key={page.id} value={page.id}>
                        {page.documentKind} page {page.page_number}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </section>

          {selectedAsset?.nativeSuggestion ? (
            <section className="admin-context-card ingestion-native-suggestion-card">
              <h3>Stored Native Suggestion</h3>
              <p className="muted-text">
                {formatNativeSuggestionSource(selectedAsset.nativeSuggestion.source)} ·{' '}
                {formatNativeSuggestionStatus(selectedAsset.nativeSuggestion.status)}
              </p>
              <p className="muted-text">
                A {selectedAsset.nativeSuggestion.type} draft is already available
                for this asset.
              </p>
              {selectedAsset.nativeSuggestion.status === 'stale' ? (
                <p className="error-text">
                  The crop changed after this suggestion was generated, so it
                  needs to be refreshed before use.
                </p>
              ) : null}
              {selectedAsset.nativeSuggestion.notes.length ? (
                <div className="ingestion-recovery-notes">
                  {selectedAsset.nativeSuggestion.notes.map((note) => (
                    <p key={note} className="muted-text">
                      Note: {note}
                    </p>
                  ))}
                </div>
              ) : null}
              <div className="block-item-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={
                    !selectedBlock ||
                    selectedAsset.nativeSuggestion.status === 'stale'
                  }
                  onClick={applyNativeSuggestionToSelectedBlock}
                >
                  Apply To Selected Block
                </button>
              </div>
            </section>
          ) : null}

          <section className="admin-context-card ingestion-recovery-card">
            <h3>Recover Native Structure</h3>
            <div className="block-item-actions ingestion-recovery-actions">
              <button
                type="button"
                className="btn-secondary"
                disabled={!selectedAsset || !selectedBlock || recoveryMode !== null}
                onClick={() => {
                  void recoverIntoSelectedBlock('table');
                }}
              >
                {recoveryMode === 'table' ? 'Recovering…' : 'Recover Table'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={!selectedAsset || !selectedBlock || recoveryMode !== null}
                onClick={() => {
                  void recoverIntoSelectedBlock('tree');
                }}
              >
                {recoveryMode === 'tree' ? 'Recovering…' : 'Recover Tree'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={!selectedAsset || !selectedBlock || recoveryMode !== null}
                onClick={() => {
                  void recoverIntoSelectedBlock('graph');
                }}
              >
                {recoveryMode === 'graph' ? 'Recovering…' : 'Recover Graph'}
              </button>
            </div>
            <p className="muted-text">
              The reviewed crop stays linked as provenance even after the block is
              promoted into a native render.
            </p>
            {recoveryError ? <p className="error-text">{recoveryError}</p> : null}
            {recoveryNotice ? (
              <p className="success-text">{recoveryNotice}</p>
            ) : null}
            {recoveryNotes.length ? (
              <div className="ingestion-recovery-notes">
                {recoveryNotes.map((note) => (
                  <p key={note} className="muted-text">
                    Note: {note}
                  </p>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    );
  }

  function renderAssetToolPanelContent() {
    return (
      <div className="ingestion-tool-layout">
        <div className="ingestion-tool-preview-stack">
          {assetToolPage && assetToolDraft ? (
            <article className="ingestion-preview-card ingestion-crop-card">
              <IngestionCropEditor
                imageUrl={assetToolPage.image_url}
                alt={`Source page ${assetToolPage.page_number}`}
                naturalWidth={assetToolPage.width}
                naturalHeight={assetToolPage.height}
                cropBox={assetToolDraft.cropBox}
                onPreviewChange={setLiveAssetToolCropBox}
                onChange={(nextCropBox) => {
                  setLiveAssetToolCropBox(null);
                  setAssetToolDraft((current) =>
                    current
                      ? {
                          ...current,
                          cropBox: nextCropBox,
                        }
                      : current,
                  );
                }}
              />
            </article>
          ) : (
            <section className="admin-context-card">
              <p className="muted-text">
                Select a block first, then choose the source page for the new
                asset crop.
              </p>
            </section>
          )}

          {assetToolPage && assetToolPreviewCropBox ? (
            <figure className="ingestion-preview-card">
              <IngestionCropPreview
                imageUrl={assetToolPage.image_url}
                alt={`Asset crop preview for page ${assetToolPage.page_number}`}
                naturalWidth={assetToolPage.width}
                naturalHeight={assetToolPage.height}
                cropBox={assetToolPreviewCropBox}
              />
              <figcaption>Live crop preview</figcaption>
            </figure>
          ) : null}
        </div>

        <div className="ingestion-tool-controls">
          <section className="admin-context-card">
            <div className="admin-page-head ingestion-side-head">
              <div>
                <h3>{assetToolDraft?.mode === 'edit' ? 'Edit Linked Asset' : 'Create Linked Asset'}</h3>
                <p className="muted-text">
                  Create the missing crop right here, link it to the current
                  block, and keep editing without leaving the inspector.
                </p>
              </div>
            </div>

            {!assetToolDraft ? (
              <p className="muted-text">
                Open this panel from a block card to create or edit its linked asset.
              </p>
            ) : (
              <div className="admin-form-grid">
                <label className="field">
                  <span>Target block</span>
                  <input
                    value={
                      selectedBlock
                        ? `${selectedBlock.role} · ${selectedBlock.type}`
                        : assetToolDraft.targetBlockId
                    }
                    readOnly
                  />
                </label>

                <label className="field">
                  <span>Classification</span>
                  <select
                    value={assetToolDraft.classification}
                    onChange={(event) => {
                      setAssetToolDraft((current) =>
                        current
                          ? {
                              ...current,
                              classification:
                                event.target.value as DraftAssetClassification,
                            }
                          : current,
                      );
                    }}
                  >
                    {ASSET_CLASSIFICATIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field admin-form-wide">
                  <span>Source page</span>
                  <select
                    value={assetToolDraft.sourcePageId}
                    onChange={(event) => {
                      const nextPage = sourcePageById.get(event.target.value) ?? null;

                      if (!nextPage) {
                        return;
                      }

                      setLiveAssetToolCropBox(null);
                      setAssetToolDraft((current) =>
                        current
                          ? {
                              ...current,
                              sourcePageId: nextPage.id,
                              cropBox: makeDefaultAssetCropBox(nextPage),
                            }
                          : current,
                      );
                    }}
                  >
                    {sourcePages.map((page) => (
                      <option key={page.id} value={page.id}>
                        {page.documentKind} page {page.page_number}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="block-item-actions admin-form-wide">
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={!assetToolPage}
                    onClick={saveAssetToolDraft}
                  >
                    {assetToolDraft.mode === 'edit' ? 'Save Asset' : 'Create Asset'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={closeAssetToolPanel}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  function renderTree(parentId: string | null, depth = 0): ReactNode {
    const entries = childrenByParent.get(parentId) ?? [];

    return entries.map((node) => {
      const children = childrenByParent.get(node.id) ?? [];
      const isSelected = node.id === selectedNodeId;
      const isCollapsed = collapsedNodeIds.has(node.id);

      return (
        <div
          key={node.id}
          id={`tree-node-${node.id}`}
          className="tree-node"
          style={{ paddingInlineStart: depth * 14 }}
        >
          <div
            className={`tree-row ${isSelected ? 'selected' : ''}`}
            onClick={() => {
              focusPreviewNode(node.id);
            }}
          >
            <button
              type="button"
              className="tree-collapse-btn"
              onClick={(event) => {
                event.stopPropagation();
                setCollapsedNodeIds((current) => {
                  const next = new Set(current);
                  if (next.has(node.id)) {
                    next.delete(node.id);
                  } else {
                    next.add(node.id);
                  }
                  return next;
                });
              }}
            >
              {children.length ? (isCollapsed ? '+' : '−') : '·'}
            </button>
            <span className="ingestion-tree-copy">
              <strong>{node.label ?? node.nodeType}</strong>
              <small>
                {node.nodeType} · #{node.orderIndex}
                {node.maxPoints !== null ? ` · ${node.maxPoints} pts` : ''}
              </small>
            </span>
            {nodeIssueCountById.get(node.id) ? (
              <span className="ingestion-issue-pill">
                {nodeIssueCountById.get(node.id)}
              </span>
            ) : null}
          </div>

          {!isCollapsed && children.length ? renderTree(node.id, depth + 1) : null}
        </div>
      );
    });
  }

  function renderPreviewNode(node: DraftNode): ReactNode {
    const children = childrenByParent.get(node.id) ?? [];
    const previewBlocks = buildPreviewBlocks(
      node.blocks,
      assetById,
      assetPreviewBaseUrl,
    );

    return (
      <article
        key={node.id}
        id={`preview-node-${node.id}`}
        className={
          node.id === selectedNodeId
            ? 'ingestion-preview-node selected'
            : 'ingestion-preview-node'
        }
        onClick={(event) => {
          event.stopPropagation();
          setSelectedNodeId(node.id);
        }}
      >
        <header className="ingestion-preview-node-head">
          <div>
            <p className="page-kicker">{node.nodeType}</p>
            <h3>{node.label ?? node.nodeType}</h3>
          </div>
          <div className="ingestion-preview-node-meta">
            <span>#{node.orderIndex}</span>
            {node.maxPoints !== null ? <span>{node.maxPoints} pts</span> : null}
          </div>
        </header>

        {node.blocks.length ? (
          <div className="ingestion-preview-block-list">
            {node.blocks.map((block, index) => {
              const previewBlock = previewBlocks[index];
              const asset = block.assetId
                ? (assetById.get(block.assetId) ?? null)
                : null;
              const canFixFromSource =
                block.type === 'paragraph' ||
                block.type === 'latex' ||
                block.type === 'heading' ||
                block.type === 'list';
              const canLinkAsset =
                block.type === 'image' ||
                block.type === 'table' ||
                block.type === 'graph' ||
                block.type === 'tree';
              const canOpenNativeTools = Boolean(asset);
              const issueCount =
                (blockIssueCountById.get(block.id) ?? 0) +
                (asset ? (assetIssueCountById.get(asset.id) ?? 0) : 0);

              return (
                <article
                  key={block.id}
                  id={`preview-block-${block.id}`}
                  className={
                    block.id === selectedBlockId
                      ? 'ingestion-preview-block-card selected'
                      : 'ingestion-preview-block-card'
                  }
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedNodeId(node.id);
                    setSelectedBlockId(block.id);
                    setPendingInspectorScrollBlockId(block.id);
                  }}
                >
                  <div className="ingestion-preview-block-head">
                    <div>
                      <strong>
                        Block {index + 1} · {block.role}
                      </strong>
                      <small>
                        {block.type}
                        {asset ? ` · ${asset.classification}` : ''}
                      </small>
                    </div>
                    <div className="block-item-actions">
                      {issueCount > 0 ? (
                        <span className="ingestion-issue-pill">{issueCount}</span>
                      ) : null}
                      {canFixFromSource ? (
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={(event) => {
                            event.stopPropagation();
                            focusSnippetTools(node.id, block.id);
                          }}
                        >
                          Fix Text
                        </button>
                      ) : null}
                      {asset && canOpenNativeTools ? (
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={(event) => {
                            event.stopPropagation();
                            focusNativeTools(node.id, block.id, asset.id);
                          }}
                        >
                          Native Render
                        </button>
                      ) : null}
                      {canLinkAsset ? (
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedNodeId(node.id);
                            setSelectedBlockId(block.id);
                            setPendingInspectorScrollBlockId(block.id);
                            openAssetToolPanel(block, asset ? 'edit' : 'create');
                          }}
                        >
                          {asset ? 'Edit Asset' : 'New Asset'}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {previewBlock ? (
                    <StudyHierarchyBlockView
                      block={previewBlock}
                      blockKey={`${node.id}-${block.id}-${index}`}
                      compact
                    />
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="muted-text">No blocks yet.</p>
        )}

        {children.length ? (
          <div className="ingestion-preview-children">
            {children.map((child) => renderPreviewNode(child))}
          </div>
        ) : null}
      </article>
    );
  }

  if (!activeVariant) {
    return null;
  }

  return (
    <section className="admin-ingestion-editor" id="ingestion-structure-editor">
      <div className="admin-page-head ingestion-section-head">
        <div>
          <h2>Structure Editor</h2>
          <p className="muted-text">
            Review hierarchy, preview the student render, and edit selected nodes
            without dropping into raw draft JSON. Drag the dividers to resize the
            hierarchy, preview, and inspector panes.
          </p>
        </div>
        <div className="block-item-actions">
          {draft.variants.map((variant) => (
            <button
              key={variant.code}
              type="button"
              className={
                variant.code === activeVariant.code ? 'btn-primary' : 'btn-secondary'
              }
              onClick={() => {
                setSelectedVariantCode(variant.code);
              }}
            >
              {variant.code.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <section className="admin-ingestion-editor-grid">
        <aside className="admin-tree-panel">
          <div className="admin-page-head ingestion-side-head">
            <div>
              <h3>Hierarchy</h3>
              <p className="muted-text">
                {activeVariant.nodes.length} nodes in {activeVariant.code}
              </p>
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => addNode(null)}
            >
              Add Root
            </button>
          </div>

          <div className="admin-form-grid">
            <label className="field admin-form-wide">
              <span>Variant title</span>
              <input
                value={activeVariant.title}
                onChange={(event) => {
                  updateVariant(activeVariant.code, (variant) => ({
                    ...variant,
                    title: event.target.value,
                  }));
                }}
              />
            </label>
          </div>

          <div className="block-item-actions">
            <button
              type="button"
              className="btn-secondary"
              disabled={!selectedNode}
              onClick={() => addNode(selectedNode?.id ?? null)}
            >
              Add Child
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={!selectedNode}
              onClick={() => addNode(selectedNode?.parentId ?? null)}
            >
              Add Sibling
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={!selectedNode}
              onClick={() => moveSelectedNode(-1)}
            >
              Move Up
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={!selectedNode}
              onClick={() => moveSelectedNode(1)}
            >
              Move Down
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={!selectedNode}
              onClick={removeSelectedNode}
            >
              Delete
            </button>
          </div>

          <div className="tree-root">
            {activeVariant.nodes.length ? (
              renderTree(null)
            ) : (
              <p className="muted-text">
                This variant has no nodes yet. Add a root exercise to begin.
              </p>
            )}
          </div>
        </aside>

        <article className="admin-editor-panel ingestion-preview-panel">
          <div className="admin-page-head ingestion-side-head">
            <div>
              <h3>Rendered Preview</h3>
              <p className="muted-text">
                This uses the same rendering layer as the student-facing sujet
                view.
              </p>
            </div>
          </div>

          <div className="ingestion-preview-surface">
            {childrenByParent.get(null)?.length ? (
              childrenByParent.get(null)?.map((node) => renderPreviewNode(node))
            ) : (
              <p className="muted-text">
                No root nodes to preview in this variant yet.
              </p>
            )}
          </div>
        </article>

        <article className="admin-editor-panel ingestion-inspector-panel">
          <div className="admin-page-head ingestion-side-head">
            <div>
              <h3>Inspector</h3>
              <p className="muted-text">
                Edit the selected node, then adjust blocks and source-linked
                assets.
              </p>
            </div>
            {selectedNode ? (
              <button
                type="button"
                className="btn-secondary"
                onClick={addBlock}
              >
                Add Block
              </button>
            ) : null}
          </div>

          {selectedNode ? (
            <>
              {selectedNodePath.length ? (
                <div className="ingestion-selection-path">
                  {selectedNodePath.map((node, index) => (
                    <span key={node.id}>
                      {index > 0 ? ' / ' : ''}
                      {node.label ?? node.nodeType}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="admin-form-grid">
                <label className="field">
                  <span>Node type</span>
                  <select
                    value={selectedNode.nodeType}
                    onChange={(event) => {
                      updateSelectedNodeFields({
                        nodeType: event.target.value as DraftNode['nodeType'],
                      });
                    }}
                  >
                    {NODE_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Parent</span>
                  <select
                    value={selectedNode.parentId ?? ''}
                    onChange={(event) => {
                      reparentSelectedNode(event.target.value || null);
                    }}
                  >
                    <option value="">Root</option>
                    {parentOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                        {option.label ?? option.nodeType}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Label</span>
                  <input
                    value={selectedNode.label ?? ''}
                    onChange={(event) => {
                      updateSelectedNodeFields({
                        label: event.target.value || null,
                      });
                    }}
                  />
                </label>

                <label className="field">
                  <span>Points</span>
                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    value={selectedNode.maxPoints ?? ''}
                    onChange={(event) => {
                      const nextValue = Number.parseFloat(event.target.value);
                      updateSelectedNodeFields({
                        maxPoints: Number.isFinite(nextValue) ? nextValue : null,
                      });
                    }}
                  />
                </label>
              </div>

              <section className="ingestion-block-stack">
                {selectedNode.blocks.length ? (
                  selectedNode.blocks.map((block, index) => (
                    <article
                      key={block.id}
                      id={`inspector-block-${block.id}`}
                      className={
                        block.id === selectedBlockId
                          ? 'block-item ingestion-block-card selected'
                          : 'block-item ingestion-block-card'
                      }
                      onClick={() => {
                        setSelectedBlockId(block.id);
                      }}
                    >
                      <div className="block-item-head">
                        <strong>
                          Block {index + 1} · {block.role}
                        </strong>
                        <div className="block-item-actions">
                          {blockIssueCountById.get(block.id) ? (
                            <span className="ingestion-issue-pill">
                              {blockIssueCountById.get(block.id)}
                            </span>
                          ) : null}
                          <select
                            value={block.role}
                            onChange={(event) => {
                              updateBlock(block.id, {
                                role: event.target.value as DraftBlockRole,
                              });
                            }}
                          >
                            {BLOCK_ROLE_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                          <select
                            value={block.type}
                            onChange={(event) => {
                              updateBlock(block.id, {
                                type: event.target.value as DraftBlockType,
                              });
                            }}
                          >
                            {BLOCK_TYPE_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={(event) => {
                              event.stopPropagation();
                              moveBlock(block.id, -1);
                            }}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={(event) => {
                              event.stopPropagation();
                              moveBlock(block.id, 1);
                            }}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={(event) => {
                              event.stopPropagation();
                              removeBlock(block.id);
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      <div className="chip-grid">
                        {(
                          block.type === 'paragraph' ||
                          block.type === 'latex' ||
                          block.type === 'heading' ||
                          block.type === 'list'
                        ) ? (
                          <button
                            type="button"
                            className="choice-chip"
                            onClick={(event) => {
                              event.stopPropagation();
                              focusSnippetTools(selectedNode.id, block.id);
                            }}
                          >
                            Fix From Source
                          </button>
                        ) : null}
                        {block.assetId ? (
                          <button
                            type="button"
                            className="choice-chip"
                            onClick={(event) => {
                              event.stopPropagation();
                              focusNativeTools(
                                selectedNode.id,
                                block.id,
                                block.assetId as string,
                              );
                            }}
                          >
                            Native Render
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="choice-chip"
                          onClick={(event) => {
                            event.stopPropagation();
                            applyBlockPreset(block.id, 'table');
                          }}
                        >
                          Table Preset
                        </button>
                        <button
                          type="button"
                          className="choice-chip"
                          onClick={(event) => {
                            event.stopPropagation();
                            applyBlockPreset(block.id, 'formula_graph');
                          }}
                        >
                          Graph Preset
                        </button>
                        <button
                          type="button"
                          className="choice-chip"
                          onClick={(event) => {
                            event.stopPropagation();
                            applyBlockPreset(block.id, 'probability_tree');
                          }}
                        >
                          Tree Preset
                        </button>
                      </div>

                      <div className="admin-form-grid">
                        <label className="field">
                          <span>Asset</span>
                          <select
                            value={block.assetId ?? ''}
                            onChange={(event) => {
                              updateBlock(block.id, {
                                assetId: event.target.value || null,
                              });
                            }}
                          >
                            <option value="">None</option>
                            {draft.assets.map((asset) => (
                              <option key={asset.id} value={asset.id}>
                                {asset.label ?? asset.id} · {asset.classification}
                              </option>
                            ))}
                          </select>
                        </label>

                        {block.type === 'image' ||
                        block.type === 'table' ||
                        block.type === 'graph' ||
                        block.type === 'tree' ? (
                          <div className="block-item-actions">
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={(event) => {
                                event.stopPropagation();
                                openAssetToolPanel(block, 'create');
                              }}
                            >
                              New Asset
                            </button>
                            {block.assetId ? (
                              <button
                                type="button"
                                className="btn-secondary"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openAssetToolPanel(block, 'edit');
                                }}
                              >
                                Edit Asset
                              </button>
                            ) : null}
                          </div>
                        ) : null}

                        {block.type === 'heading' ? (
                          <label className="field">
                            <span>Heading level</span>
                            <input
                              type="number"
                              min="1"
                              max="6"
                              value={block.meta?.level ?? 2}
                              onChange={(event) => {
                                updateBlock(block.id, {
                                  meta: {
                                    ...(block.meta ?? {}),
                                    level:
                                      Number.parseInt(event.target.value, 10) || 2,
                                  },
                                });
                              }}
                            />
                          </label>
                        ) : null}

                        {block.type === 'code' ? (
                          <label className="field">
                            <span>Language</span>
                            <input
                              value={block.meta?.language ?? ''}
                              onChange={(event) => {
                                updateBlock(block.id, {
                                  meta: {
                                    ...(block.meta ?? {}),
                                    language: event.target.value || undefined,
                                  },
                                });
                              }}
                            />
                          </label>
                        ) : null}

                        {block.type === 'table' ? (
                          <label className="field admin-form-wide">
                            <span>Rows</span>
                            <textarea
                              key={`${block.id}:${formatRows(block.data)}`}
                              rows={5}
                              defaultValue={formatRows(block.data)}
                              placeholder="Cell A | Cell B&#10;Row 2 Col 1 | Row 2 Col 2"
                              onBlur={(event) => {
                                const rows = parseRows(event.target.value);
                                updateBlockData(
                                  block.id,
                                  withRowsData(block.data ?? null, rows),
                                );
                              }}
                            />
                          </label>
                        ) : null}

                        {block.type !== 'image' ? (
                          <label className="field admin-form-wide">
                            <span>
                              {block.type === 'list'
                                ? 'List Content'
                                : block.type === 'table'
                                  ? 'Fallback Text'
                                  : block.type === 'graph' ||
                                      block.type === 'tree'
                                    ? 'Supporting Text'
                                    : 'Content'}
                            </span>
                            <textarea
                              rows={block.type === 'code' ? 7 : 4}
                              value={block.value}
                              onChange={(event) => {
                                updateBlock(block.id, {
                                  value: event.target.value,
                                });
                              }}
                            />
                          </label>
                        ) : null}
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="muted-text">No blocks yet for this node.</p>
                )}
              </section>
            </>
          ) : (
            <p className="muted-text">
              Select a node from the tree or rendered preview to inspect it.
            </p>
          )}
        </article>
      </section>

      {activeToolPanel === 'snippet'
        ? renderToolPanelShell(
            'snippet',
            'Fix Text From Source',
            'Recover a missed sentence, paragraph, or formula from the scanned page without manually retyping it.',
            renderSnippetToolPanelContent(),
          )
        : null}

      {activeToolPanel === 'native'
        ? renderToolPanelShell(
            'native',
            'Render Asset Natively',
            'Review the crop, then apply a stored draft or recover a native table, probability tree, or graph from the selected asset.',
            renderNativeToolPanelContent(),
          )
        : null}

      {activeToolPanel === 'asset'
        ? renderToolPanelShell(
            'asset',
            assetToolDraft?.mode === 'edit' ? 'Edit Linked Asset' : 'Create Linked Asset',
            'Create or adjust the reviewed asset crop without leaving the block you are editing.',
            renderAssetToolPanelContent(),
          )
        : null}
    </section>
  );
}
