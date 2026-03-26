import type {
  DraftAsset,
  DraftBlock,
  DraftNode,
  DraftSourcePage,
  DraftVariant,
  IngestionDraft,
} from './ingestion.contract';

export type IngestionValidationIssue = {
  id: string;
  severity: 'error' | 'warning';
  code: string;
  target: 'exam' | 'variant' | 'node' | 'block' | 'asset' | 'source_page';
  message: string;
  variantCode: DraftVariant['code'] | null;
  nodeId: string | null;
  blockId: string | null;
  assetId: string | null;
  sourcePageId: string | null;
  pageNumber: number | null;
  field: string | null;
};

export type IngestionDraftValidation = {
  errors: string[];
  warnings: string[];
  issues: IngestionValidationIssue[];
};

type IssueInput = Omit<
  IngestionValidationIssue,
  'id' | 'severity' | 'message'
> & {
  message: string;
};

type ValidationCollector = {
  errors: string[];
  warnings: string[];
  issues: IngestionValidationIssue[];
  error: (input: IssueInput) => void;
  warning: (input: IssueInput) => void;
};

export function validateIngestionDraft(
  draft: IngestionDraft,
): IngestionDraftValidation {
  const collector = createCollector();
  const sourcePageMap = new Map<string, DraftSourcePage>();
  const assetMap = new Map<string, DraftAsset>();
  const referencedAssetIds = new Set<string>();
  const revisionDraft = isPublishedRevisionDraft(draft);

  if (!draft.exam.streamCode) {
    collector.error({
      code: 'exam_stream_missing',
      target: 'exam',
      message: 'Exam streamCode is required before approval or publication.',
      variantCode: null,
      nodeId: null,
      blockId: null,
      assetId: null,
      sourcePageId: null,
      pageNumber: null,
      field: 'streamCode',
    });
  }

  if (!draft.exam.subjectCode) {
    collector.error({
      code: 'exam_subject_missing',
      target: 'exam',
      message: 'Exam subjectCode is required before approval or publication.',
      variantCode: null,
      nodeId: null,
      blockId: null,
      assetId: null,
      sourcePageId: null,
      pageNumber: null,
      field: 'subjectCode',
    });
  }

  if (!revisionDraft && !draft.exam.examDocumentId) {
    collector.error({
      code: 'exam_document_missing',
      target: 'exam',
      message: 'Exam PDF is missing from the ingestion draft.',
      variantCode: null,
      nodeId: null,
      blockId: null,
      assetId: null,
      sourcePageId: null,
      pageNumber: null,
      field: 'examDocumentId',
    });
  }

  if (!revisionDraft && !draft.exam.correctionDocumentId) {
    collector.error({
      code: 'correction_document_missing',
      target: 'exam',
      message:
        'Correction PDF is required before processing, approval, or publication.',
      variantCode: null,
      nodeId: null,
      blockId: null,
      assetId: null,
      sourcePageId: null,
      pageNumber: null,
      field: 'correctionDocumentId',
    });
  }

  if (!revisionDraft && !draft.sourcePages.length) {
    collector.error({
      code: 'source_pages_missing',
      target: 'exam',
      message: 'No source pages are available. Process the job before review.',
      variantCode: null,
      nodeId: null,
      blockId: null,
      assetId: null,
      sourcePageId: null,
      pageNumber: null,
      field: 'sourcePages',
    });
  }

  for (const page of draft.sourcePages) {
    if (sourcePageMap.has(page.id)) {
      collector.error({
        code: 'source_page_duplicate',
        target: 'source_page',
        message: `Duplicate source page id ${page.id}.`,
        variantCode: null,
        nodeId: null,
        blockId: null,
        assetId: null,
        sourcePageId: page.id,
        pageNumber: page.pageNumber,
        field: 'id',
      });
      continue;
    }

    if (page.width <= 0 || page.height <= 0) {
      collector.error({
        code: 'source_page_invalid_dimensions',
        target: 'source_page',
        message: `Source page ${page.id} has invalid dimensions ${page.width}x${page.height}.`,
        variantCode: null,
        nodeId: null,
        blockId: null,
        assetId: null,
        sourcePageId: page.id,
        pageNumber: page.pageNumber,
        field: 'dimensions',
      });
    }

    sourcePageMap.set(page.id, page);
  }

  for (const asset of draft.assets) {
    validateAsset(asset, assetMap, sourcePageMap, collector);
  }

  const variantsWithNodes = draft.variants.filter(
    (variant) => variant.nodes.length > 0,
  );

  if (!variantsWithNodes.length) {
    collector.error({
      code: 'draft_has_no_nodes',
      target: 'exam',
      message:
        'Draft has no hierarchy nodes yet. Run extraction or build the structure before approval.',
      variantCode: null,
      nodeId: null,
      blockId: null,
      assetId: null,
      sourcePageId: null,
      pageNumber: null,
      field: 'variants',
    });
  }

  const totalExerciseRoots = draft.variants.reduce(
    (sum, variant) =>
      sum +
      variant.nodes.filter(
        (node) => node.parentId === null && node.nodeType === 'EXERCISE',
      ).length,
    0,
  );

  if (variantsWithNodes.length > 0 && totalExerciseRoots === 0) {
    collector.error({
      code: 'draft_has_no_root_exercise',
      target: 'exam',
      message: 'Draft does not contain any root EXERCISE nodes.',
      variantCode: null,
      nodeId: null,
      blockId: null,
      assetId: null,
      sourcePageId: null,
      pageNumber: null,
      field: 'variants',
    });
  }

  for (const variant of draft.variants) {
    validateVariant(variant, assetMap, referencedAssetIds, collector);
  }

  for (const asset of draft.assets) {
    if (!referencedAssetIds.has(asset.id)) {
      collector.warning({
        code: 'asset_unreferenced',
        target: 'asset',
        message: `Asset ${asset.id} is not referenced by any node block and will not be published.`,
        variantCode: asset.variantCode,
        nodeId: null,
        blockId: null,
        assetId: asset.id,
        sourcePageId: asset.sourcePageId,
        pageNumber: asset.pageNumber,
        field: 'assetId',
      });
    }
  }

  return {
    errors: unique(collector.errors),
    warnings: unique(collector.warnings),
    issues: collector.issues,
  };
}

function validateAsset(
  asset: DraftAsset,
  assetMap: Map<string, DraftAsset>,
  sourcePageMap: Map<string, DraftSourcePage>,
  collector: ValidationCollector,
) {
  if (assetMap.has(asset.id)) {
    collector.error({
      code: 'asset_duplicate',
      target: 'asset',
      message: `Duplicate asset id ${asset.id}.`,
      variantCode: asset.variantCode,
      nodeId: null,
      blockId: null,
      assetId: asset.id,
      sourcePageId: asset.sourcePageId,
      pageNumber: asset.pageNumber,
      field: 'id',
    });
    return;
  }

  assetMap.set(asset.id, asset);
  const page = sourcePageMap.get(asset.sourcePageId);

  if (!page) {
    collector.error({
      code: 'asset_missing_source_page',
      target: 'asset',
      message: `Asset ${asset.id} references missing source page ${asset.sourcePageId}.`,
      variantCode: asset.variantCode,
      nodeId: null,
      blockId: null,
      assetId: asset.id,
      sourcePageId: asset.sourcePageId,
      pageNumber: asset.pageNumber,
      field: 'sourcePageId',
    });
    return;
  }

  if (asset.pageNumber !== page.pageNumber) {
    collector.warning({
      code: 'asset_page_number_mismatch',
      target: 'asset',
      message: `Asset ${asset.id} pageNumber ${asset.pageNumber} does not match source page ${page.pageNumber}.`,
      variantCode: asset.variantCode,
      nodeId: null,
      blockId: null,
      assetId: asset.id,
      sourcePageId: asset.sourcePageId,
      pageNumber: page.pageNumber,
      field: 'pageNumber',
    });
  }

  if (asset.documentKind !== page.documentKind) {
    collector.warning({
      code: 'asset_document_kind_mismatch',
      target: 'asset',
      message: `Asset ${asset.id} documentKind ${asset.documentKind} does not match source page ${page.documentKind}.`,
      variantCode: asset.variantCode,
      nodeId: null,
      blockId: null,
      assetId: asset.id,
      sourcePageId: asset.sourcePageId,
      pageNumber: page.pageNumber,
      field: 'documentKind',
    });
  }

  if (asset.cropBox.width <= 0 || asset.cropBox.height <= 0) {
    collector.error({
      code: 'asset_invalid_crop_dimensions',
      target: 'asset',
      message: `Asset ${asset.id} crop box must have positive width and height.`,
      variantCode: asset.variantCode,
      nodeId: null,
      blockId: null,
      assetId: asset.id,
      sourcePageId: asset.sourcePageId,
      pageNumber: page.pageNumber,
      field: 'cropBox',
    });
  }

  if (asset.cropBox.x < 0 || asset.cropBox.y < 0) {
    collector.error({
      code: 'asset_crop_outside_page',
      target: 'asset',
      message: `Asset ${asset.id} crop box cannot start outside the page.`,
      variantCode: asset.variantCode,
      nodeId: null,
      blockId: null,
      assetId: asset.id,
      sourcePageId: asset.sourcePageId,
      pageNumber: page.pageNumber,
      field: 'cropBox',
    });
  }

  if (asset.cropBox.x + asset.cropBox.width > page.width) {
    collector.warning({
      code: 'asset_crop_width_clamped',
      target: 'asset',
      message: `Asset ${asset.id} crop width extends beyond page bounds and will be clamped on publish.`,
      variantCode: asset.variantCode,
      nodeId: null,
      blockId: null,
      assetId: asset.id,
      sourcePageId: asset.sourcePageId,
      pageNumber: page.pageNumber,
      field: 'cropBox.width',
    });
  }

  if (asset.cropBox.y + asset.cropBox.height > page.height) {
    collector.warning({
      code: 'asset_crop_height_clamped',
      target: 'asset',
      message: `Asset ${asset.id} crop height extends beyond page bounds and will be clamped on publish.`,
      variantCode: asset.variantCode,
      nodeId: null,
      blockId: null,
      assetId: asset.id,
      sourcePageId: asset.sourcePageId,
      pageNumber: page.pageNumber,
      field: 'cropBox.height',
    });
  }

  if (asset.nativeSuggestion?.status === 'stale') {
    collector.warning({
      code: 'asset_native_suggestion_stale',
      target: 'asset',
      message: `Asset ${asset.id} has native structured data from an older crop or pass. Re-run recovery before publishing if the crop changed.`,
      variantCode: asset.variantCode,
      nodeId: null,
      blockId: null,
      assetId: asset.id,
      sourcePageId: asset.sourcePageId,
      pageNumber: page.pageNumber,
      field: 'nativeSuggestion.status',
    });
  }

  if (
    asset.nativeSuggestion &&
    asset.nativeSuggestion.type !== asset.classification &&
    !(
      asset.nativeSuggestion.type === 'graph' &&
      asset.classification === 'graph'
    )
  ) {
    collector.warning({
      code: 'asset_native_suggestion_type_mismatch',
      target: 'asset',
      message: `Asset ${asset.id} native suggestion type ${asset.nativeSuggestion.type} does not match classification ${asset.classification}.`,
      variantCode: asset.variantCode,
      nodeId: null,
      blockId: null,
      assetId: asset.id,
      sourcePageId: asset.sourcePageId,
      pageNumber: page.pageNumber,
      field: 'nativeSuggestion.type',
    });
  }
}

function isPublishedRevisionDraft(draft: IngestionDraft) {
  return (
    draft.exam.provider === 'published_revision' ||
    readMetadataString(draft.exam.metadata, 'editingMode') === 'published_revision'
  );
}

function readMetadataString(
  value: Record<string, unknown> | null | undefined,
  key: string,
) {
  const candidate = value?.[key];

  return typeof candidate === 'string' && candidate.trim().length
    ? candidate.trim()
    : null;
}

function validateVariant(
  variant: DraftVariant,
  assetMap: Map<string, DraftAsset>,
  referencedAssetIds: Set<string>,
  collector: ValidationCollector,
) {
  if (!variant.title.trim()) {
    collector.warning({
      code: 'variant_title_missing',
      target: 'variant',
      message: `Variant ${variant.code} is missing a title.`,
      variantCode: variant.code,
      nodeId: null,
      blockId: null,
      assetId: null,
      sourcePageId: null,
      pageNumber: null,
      field: 'title',
    });
  }

  if (variant.nodes.length === 0) {
    collector.warning({
      code: 'variant_empty',
      target: 'variant',
      message: `Variant ${variant.code} has no nodes.`,
      variantCode: variant.code,
      nodeId: null,
      blockId: null,
      assetId: null,
      sourcePageId: null,
      pageNumber: null,
      field: 'nodes',
    });
  }

  const nodeMap = new Map<string, DraftNode>();
  const childrenByParent = new Map<string | null, DraftNode[]>();

  for (const node of variant.nodes) {
    if (nodeMap.has(node.id)) {
      collector.error({
        code: 'variant_duplicate_node_id',
        target: 'node',
        message: `Variant ${variant.code} contains duplicate node id ${node.id}.`,
        variantCode: variant.code,
        nodeId: node.id,
        blockId: null,
        assetId: null,
        sourcePageId: null,
        pageNumber: null,
        field: 'id',
      });
      continue;
    }

    nodeMap.set(node.id, node);
    const siblings = childrenByParent.get(node.parentId) ?? [];
    siblings.push(node);
    childrenByParent.set(node.parentId, siblings);
  }

  for (const [parentId, siblings] of childrenByParent.entries()) {
    validateSiblingOrder(variant.code, parentId, siblings, collector);
  }

  for (const node of variant.nodes) {
    if (node.parentId === node.id) {
      collector.error({
        code: 'node_self_parent',
        target: 'node',
        message: `Node ${node.id} in ${variant.code} cannot parent itself.`,
        variantCode: variant.code,
        nodeId: node.id,
        blockId: null,
        assetId: null,
        sourcePageId: null,
        pageNumber: null,
        field: 'parentId',
      });
      continue;
    }

    const parent = node.parentId ? (nodeMap.get(node.parentId) ?? null) : null;

    if (node.parentId && !parent) {
      collector.error({
        code: 'node_missing_parent',
        target: 'node',
        message: `Node ${node.id} in ${variant.code} references missing parent ${node.parentId}.`,
        variantCode: variant.code,
        nodeId: node.id,
        blockId: null,
        assetId: null,
        sourcePageId: null,
        pageNumber: null,
        field: 'parentId',
      });
    }

    if (
      !node.parentId &&
      node.nodeType !== 'EXERCISE' &&
      node.nodeType !== 'CONTEXT'
    ) {
      collector.error({
        code: 'node_invalid_root_type',
        target: 'node',
        message: `Root node ${node.id} in ${variant.code} must be EXERCISE or CONTEXT, got ${node.nodeType}.`,
        variantCode: variant.code,
        nodeId: node.id,
        blockId: null,
        assetId: null,
        sourcePageId: null,
        pageNumber: null,
        field: 'nodeType',
      });
    }

    if (node.parentId && node.nodeType === 'EXERCISE') {
      collector.error({
        code: 'exercise_has_parent',
        target: 'node',
        message: `Exercise node ${node.id} in ${variant.code} cannot have a parent.`,
        variantCode: variant.code,
        nodeId: node.id,
        blockId: null,
        assetId: null,
        sourcePageId: null,
        pageNumber: null,
        field: 'nodeType',
      });
    }

    const children = childrenByParent.get(node.id) ?? [];
    validateNodeContent(
      variant.code,
      node,
      children.length,
      assetMap,
      referencedAssetIds,
      collector,
    );
  }

  for (const node of variant.nodes) {
    detectCycle(variant.code, node, nodeMap, collector);
  }
}

function validateSiblingOrder(
  variantCode: DraftVariant['code'],
  parentId: string | null,
  siblings: DraftNode[],
  collector: ValidationCollector,
) {
  const sorted = [...siblings].sort(
    (left, right) => left.orderIndex - right.orderIndex,
  );
  const seen = new Set<number>();

  for (const sibling of sorted) {
    if (seen.has(sibling.orderIndex)) {
      collector.error({
        code: 'sibling_duplicate_order',
        target: 'node',
        message: `Variant ${variantCode} has duplicate orderIndex ${sibling.orderIndex} under ${parentId ?? 'ROOT'}.`,
        variantCode,
        nodeId: sibling.id,
        blockId: null,
        assetId: null,
        sourcePageId: null,
        pageNumber: null,
        field: 'orderIndex',
      });
      continue;
    }

    seen.add(sibling.orderIndex);
  }

  for (let index = 0; index < sorted.length; index += 1) {
    const expected = index + 1;
    if (sorted[index].orderIndex !== expected) {
      collector.warning({
        code: 'sibling_non_contiguous_order',
        target: 'node',
        message: `Variant ${variantCode} has non-contiguous order under ${parentId ?? 'ROOT'}: expected ${expected}, found ${sorted[index].orderIndex}.`,
        variantCode,
        nodeId: sorted[index].id,
        blockId: null,
        assetId: null,
        sourcePageId: null,
        pageNumber: null,
        field: 'orderIndex',
      });
      break;
    }
  }
}

function validateNodeContent(
  variantCode: DraftVariant['code'],
  node: DraftNode,
  childCount: number,
  assetMap: Map<string, DraftAsset>,
  referencedAssetIds: Set<string>,
  collector: ValidationCollector,
) {
  const promptBlocks = node.blocks.filter((block) => block.role === 'PROMPT');
  const hasPromptContent = promptBlocks.some(hasBlockContent);
  const hasAnyContent = node.blocks.some(hasBlockContent);

  if (childCount === 0 && !hasAnyContent) {
    collector.warning({
      code: 'node_empty',
      target: 'node',
      message: `Node ${node.id} in ${variantCode} has no blocks and no children.`,
      variantCode,
      nodeId: node.id,
      blockId: null,
      assetId: null,
      sourcePageId: null,
      pageNumber: null,
      field: 'blocks',
    });
  }

  if (
    (node.nodeType === 'QUESTION' || node.nodeType === 'SUBQUESTION') &&
    !hasPromptContent
  ) {
    collector.warning({
      code: 'question_missing_prompt',
      target: 'node',
      message: `Node ${node.id} in ${variantCode} is ${node.nodeType} but has no prompt content.`,
      variantCode,
      nodeId: node.id,
      blockId: null,
      assetId: null,
      sourcePageId: null,
      pageNumber: null,
      field: 'blocks',
    });
  }

  for (const block of node.blocks) {
    validateBlock(
      variantCode,
      node,
      block,
      assetMap,
      referencedAssetIds,
      collector,
    );
  }
}

function validateBlock(
  variantCode: DraftVariant['code'],
  node: DraftNode,
  block: DraftBlock,
  assetMap: Map<string, DraftAsset>,
  referencedAssetIds: Set<string>,
  collector: ValidationCollector,
) {
  if (block.assetId) {
    referencedAssetIds.add(block.assetId);
    const asset = assetMap.get(block.assetId);

    if (!asset) {
      collector.error({
        code: 'block_missing_asset',
        target: 'block',
        message: `Node ${node.id} in ${variantCode} references missing asset ${block.assetId}.`,
        variantCode,
        nodeId: node.id,
        blockId: block.id,
        assetId: block.assetId,
        sourcePageId: null,
        pageNumber: null,
        field: 'assetId',
      });
      return;
    }

    if (
      block.type !== 'image' &&
      block.type !== 'table' &&
      block.type !== 'graph' &&
      block.type !== 'tree'
    ) {
      collector.warning({
        code: 'block_asset_type_mismatch',
        target: 'block',
        message: `Node ${node.id} in ${variantCode} uses asset ${asset.id} with block type ${block.type}.`,
        variantCode,
        nodeId: node.id,
        blockId: block.id,
        assetId: asset.id,
        sourcePageId: asset.sourcePageId,
        pageNumber: asset.pageNumber,
        field: 'type',
      });
    }

    if (block.type === 'table' && asset.classification !== 'table') {
      collector.warning({
        code: 'table_asset_classification_mismatch',
        target: 'block',
        message: `Node ${node.id} in ${variantCode} marks asset ${asset.id} as table but the asset classification is ${asset.classification}.`,
        variantCode,
        nodeId: node.id,
        blockId: block.id,
        assetId: asset.id,
        sourcePageId: asset.sourcePageId,
        pageNumber: asset.pageNumber,
        field: 'type',
      });
    }

    if (block.type === 'table' && !hasStructuredTableRows(block)) {
      collector.warning({
        code: 'table_will_publish_as_image',
        target: 'block',
        message: `Node ${node.id} in ${variantCode} uses table asset ${asset.id} without structured rows, so it will still publish as an image fallback.`,
        variantCode,
        nodeId: node.id,
        blockId: block.id,
        assetId: asset.id,
        sourcePageId: asset.sourcePageId,
        pageNumber: asset.pageNumber,
        field: 'data.rows',
      });
    }

    if (block.type === 'graph' && asset.classification !== 'graph') {
      collector.warning({
        code: 'graph_asset_classification_mismatch',
        target: 'block',
        message: `Node ${node.id} in ${variantCode} marks asset ${asset.id} as graph but the asset classification is ${asset.classification}.`,
        variantCode,
        nodeId: node.id,
        blockId: block.id,
        assetId: asset.id,
        sourcePageId: asset.sourcePageId,
        pageNumber: asset.pageNumber,
        field: 'type',
      });
    }

    if (block.type === 'tree' && asset.classification !== 'tree') {
      collector.warning({
        code: 'tree_asset_classification_mismatch',
        target: 'block',
        message: `Node ${node.id} in ${variantCode} marks asset ${asset.id} as tree but the asset classification is ${asset.classification}.`,
        variantCode,
        nodeId: node.id,
        blockId: block.id,
        assetId: asset.id,
        sourcePageId: asset.sourcePageId,
        pageNumber: asset.pageNumber,
        field: 'type',
      });
    }

    if (block.type === 'graph' && !hasFormulaGraphData(block)) {
      collector.warning({
        code: 'graph_block_missing_structured_data',
        target: 'block',
        message: `Node ${node.id} in ${variantCode} uses graph block ${block.id} without structured graph data, so it will still publish as an image fallback.`,
        variantCode,
        nodeId: node.id,
        blockId: block.id,
        assetId: asset.id,
        sourcePageId: asset.sourcePageId,
        pageNumber: asset.pageNumber,
        field: 'data',
      });
    }

    if (block.type === 'tree' && !hasProbabilityTreeData(block)) {
      collector.warning({
        code: 'tree_block_missing_structured_data',
        target: 'block',
        message: `Node ${node.id} in ${variantCode} uses tree block ${block.id} without structured tree data, so it will still publish as an image fallback.`,
        variantCode,
        nodeId: node.id,
        blockId: block.id,
        assetId: asset.id,
        sourcePageId: asset.sourcePageId,
        pageNumber: asset.pageNumber,
        field: 'data',
      });
    }

    if (
      asset.classification === 'graph' &&
      block.type !== 'graph' &&
      !hasFormulaGraphData(block)
    ) {
      collector.warning({
        code: 'graph_will_publish_as_image',
        target: 'block',
        message: `Node ${node.id} in ${variantCode} links graph asset ${asset.id} without structured graph data, so it will still publish as an image fallback.`,
        variantCode,
        nodeId: node.id,
        blockId: block.id,
        assetId: asset.id,
        sourcePageId: asset.sourcePageId,
        pageNumber: asset.pageNumber,
        field: 'data',
      });
    }

    if (
      asset.classification === 'tree' &&
      block.type !== 'tree' &&
      !hasProbabilityTreeData(block)
    ) {
      collector.warning({
        code: 'tree_will_publish_as_image',
        target: 'block',
        message: `Node ${node.id} in ${variantCode} links tree asset ${asset.id} without structured tree data, so it will still publish as an image fallback.`,
        variantCode,
        nodeId: node.id,
        blockId: block.id,
        assetId: asset.id,
        sourcePageId: asset.sourcePageId,
        pageNumber: asset.pageNumber,
        field: 'data',
      });
    }

    if (
      asset.nativeSuggestion?.status === 'stale' &&
      (block.type === asset.nativeSuggestion.type ||
        (asset.nativeSuggestion.type === 'graph' &&
          hasFormulaGraphData(block)) ||
        (asset.nativeSuggestion.type === 'tree' &&
          hasProbabilityTreeData(block)) ||
        (asset.nativeSuggestion.type === 'table' &&
          hasStructuredTableRows(block)))
    ) {
      collector.warning({
        code: 'block_native_suggestion_stale',
        target: 'block',
        message: `Node ${node.id} in ${variantCode} still relies on stale native data for asset ${asset.id}. Re-run recovery after adjusting the crop.`,
        variantCode,
        nodeId: node.id,
        blockId: block.id,
        assetId: asset.id,
        sourcePageId: asset.sourcePageId,
        pageNumber: asset.pageNumber,
        field: 'data',
      });
    }

    return;
  }

  if (
    (block.type === 'image' ||
      (block.type === 'table' && !hasStructuredTableRows(block)) ||
      (block.type === 'graph' && !hasFormulaGraphData(block)) ||
      (block.type === 'tree' && !hasProbabilityTreeData(block))) &&
    !block.value.trim()
  ) {
    collector.warning({
      code: 'block_missing_asset',
      target: 'block',
      message: `Node ${node.id} in ${variantCode} has a ${block.type} block without an assetId.`,
      variantCode,
      nodeId: node.id,
      blockId: block.id,
      assetId: null,
      sourcePageId: null,
      pageNumber: null,
      field: 'assetId',
    });
    return;
  }

  if (block.type === 'graph' && !hasFormulaGraphData(block)) {
    collector.warning({
      code: 'graph_block_missing_structured_data',
      target: 'block',
      message: `Node ${node.id} in ${variantCode} contains graph block ${block.id} without structured graph data.`,
      variantCode,
      nodeId: node.id,
      blockId: block.id,
      assetId: null,
      sourcePageId: null,
      pageNumber: null,
      field: 'data',
    });
  }

  if (block.type === 'tree' && !hasProbabilityTreeData(block)) {
    collector.warning({
      code: 'tree_block_missing_structured_data',
      target: 'block',
      message: `Node ${node.id} in ${variantCode} contains tree block ${block.id} without structured tree data.`,
      variantCode,
      nodeId: node.id,
      blockId: block.id,
      assetId: null,
      sourcePageId: null,
      pageNumber: null,
      field: 'data',
    });
  }

  if (!block.value.trim() && !hasStructuredBlockData(block)) {
    collector.warning({
      code: 'block_empty',
      target: 'block',
      message: `Node ${node.id} in ${variantCode} contains an empty ${block.type} block.`,
      variantCode,
      nodeId: node.id,
      blockId: block.id,
      assetId: null,
      sourcePageId: null,
      pageNumber: null,
      field: 'value',
    });
  }
}

function detectCycle(
  variantCode: DraftVariant['code'],
  startNode: DraftNode,
  nodeMap: Map<string, DraftNode>,
  collector: ValidationCollector,
) {
  const seen = new Set<string>();
  let cursor: DraftNode | null = startNode;

  while (cursor) {
    if (seen.has(cursor.id)) {
      collector.error({
        code: 'node_cycle',
        target: 'node',
        message: `Variant ${variantCode} contains a parent cycle at node ${cursor.id}.`,
        variantCode,
        nodeId: cursor.id,
        blockId: null,
        assetId: null,
        sourcePageId: null,
        pageNumber: null,
        field: 'parentId',
      });
      return;
    }

    seen.add(cursor.id);
    cursor = cursor.parentId ? (nodeMap.get(cursor.parentId) ?? null) : null;
  }
}

function hasBlockContent(block: DraftBlock) {
  return Boolean(
    block.assetId || block.value.trim() || hasStructuredBlockData(block),
  );
}

function hasStructuredBlockData(block: DraftBlock) {
  return Boolean(
    block.data &&
    typeof block.data === 'object' &&
    !Array.isArray(block.data) &&
    Object.keys(block.data).length > 0,
  );
}

function hasStructuredTableRows(block: DraftBlock) {
  if (
    !block.data ||
    typeof block.data !== 'object' ||
    Array.isArray(block.data)
  ) {
    return false;
  }

  return Array.isArray((block.data as { rows?: unknown[] }).rows);
}

function hasFormulaGraphData(block: DraftBlock) {
  if (
    !block.data ||
    typeof block.data !== 'object' ||
    Array.isArray(block.data)
  ) {
    return false;
  }

  const data = block.data;
  return (
    data.kind === 'formula_graph' ||
    isRecord(data.formulaGraph) ||
    isRecord(data.graph)
  );
}

function hasProbabilityTreeData(block: DraftBlock) {
  if (
    !block.data ||
    typeof block.data !== 'object' ||
    Array.isArray(block.data)
  ) {
    return false;
  }

  const data = block.data;
  return (
    data.kind === 'probability_tree' ||
    isRecord(data.probabilityTree) ||
    isRecord(data.tree)
  );
}

function createCollector(): ValidationCollector {
  const errors: string[] = [];
  const warnings: string[] = [];
  const issues: IngestionValidationIssue[] = [];

  function push(
    severity: IngestionValidationIssue['severity'],
    input: IssueInput,
  ) {
    const collection = severity === 'error' ? errors : warnings;
    collection.push(input.message);
    issues.push({
      id: `${severity}:${issues.length + 1}`,
      severity,
      ...input,
    });
  }

  return {
    errors,
    warnings,
    issues,
    error: (input) => push('error', input),
    warning: (input) => push('warning', input),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function unique(values: string[]) {
  return [...new Set(values)];
}
