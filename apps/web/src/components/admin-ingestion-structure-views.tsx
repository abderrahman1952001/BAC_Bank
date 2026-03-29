"use client";

import { StudyHierarchyBlockView } from "@/components/study-content";
import {
  buildPreviewBlocks,
  type DraftAsset,
  type DraftBlock,
  type DraftNode,
} from "@/lib/admin-ingestion-structure";

export function AdminIngestionHierarchyTree({
  rootNodes,
  childrenByParent,
  selectedNodeId,
  collapsedNodeIds,
  nodeIssueCountById,
  onFocusNode,
  onToggleCollapse,
}: {
  rootNodes: DraftNode[];
  childrenByParent: Map<string | null, DraftNode[]>;
  selectedNodeId: string | null;
  collapsedNodeIds: Set<string>;
  nodeIssueCountById: Map<string, number>;
  onFocusNode: (nodeId: string) => void;
  onToggleCollapse: (nodeId: string) => void;
}) {
  return rootNodes.map((node) => (
    <AdminIngestionHierarchyTreeNode
      key={node.id}
      node={node}
      depth={0}
      childrenByParent={childrenByParent}
      selectedNodeId={selectedNodeId}
      collapsedNodeIds={collapsedNodeIds}
      nodeIssueCountById={nodeIssueCountById}
      onFocusNode={onFocusNode}
      onToggleCollapse={onToggleCollapse}
    />
  ));
}

function AdminIngestionHierarchyTreeNode({
  node,
  depth,
  childrenByParent,
  selectedNodeId,
  collapsedNodeIds,
  nodeIssueCountById,
  onFocusNode,
  onToggleCollapse,
}: {
  node: DraftNode;
  depth: number;
  childrenByParent: Map<string | null, DraftNode[]>;
  selectedNodeId: string | null;
  collapsedNodeIds: Set<string>;
  nodeIssueCountById: Map<string, number>;
  onFocusNode: (nodeId: string) => void;
  onToggleCollapse: (nodeId: string) => void;
}) {
  const children = childrenByParent.get(node.id) ?? [];
  const isSelected = node.id === selectedNodeId;
  const isCollapsed = collapsedNodeIds.has(node.id);

  return (
    <div
      id={`tree-node-${node.id}`}
      className="tree-node"
      style={{ paddingInlineStart: depth * 14 }}
    >
      <div
        className={`tree-row ${isSelected ? "selected" : ""}`}
        onClick={() => {
          onFocusNode(node.id);
        }}
      >
        <button
          type="button"
          className="tree-collapse-btn"
          onClick={(event) => {
            event.stopPropagation();
            onToggleCollapse(node.id);
          }}
        >
          {children.length ? (isCollapsed ? "+" : "−") : "·"}
        </button>
        <span className="ingestion-tree-copy">
          <strong>{node.label ?? node.nodeType}</strong>
          <small>
            {node.nodeType} · #{node.orderIndex}
            {node.maxPoints !== null ? ` · ${node.maxPoints} pts` : ""}
          </small>
        </span>
        {nodeIssueCountById.get(node.id) ? (
          <span className="ingestion-issue-pill">
            {nodeIssueCountById.get(node.id)}
          </span>
        ) : null}
      </div>

      {!isCollapsed && children.length
        ? children.map((child) => (
            <AdminIngestionHierarchyTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              childrenByParent={childrenByParent}
              selectedNodeId={selectedNodeId}
              collapsedNodeIds={collapsedNodeIds}
              nodeIssueCountById={nodeIssueCountById}
              onFocusNode={onFocusNode}
              onToggleCollapse={onToggleCollapse}
            />
          ))
        : null}
    </div>
  );
}

export function AdminIngestionRenderedPreview({
  rootNodes,
  childrenByParent,
  assetById,
  assetPreviewBaseUrl,
  selectedNodeId,
  selectedBlockId,
  blockIssueCountById,
  assetIssueCountById,
  onSelectNode,
  onSelectBlock,
  onFocusSnippetTools,
  onFocusNativeTools,
  onOpenAssetToolPanel,
}: {
  rootNodes: DraftNode[];
  childrenByParent: Map<string | null, DraftNode[]>;
  assetById: Map<string, DraftAsset>;
  assetPreviewBaseUrl: string;
  selectedNodeId: string | null;
  selectedBlockId: string | null;
  blockIssueCountById: Map<string, number>;
  assetIssueCountById: Map<string, number>;
  onSelectNode: (nodeId: string) => void;
  onSelectBlock: (nodeId: string, blockId: string) => void;
  onFocusSnippetTools: (nodeId: string, blockId: string) => void;
  onFocusNativeTools: (nodeId: string, blockId: string, assetId: string) => void;
  onOpenAssetToolPanel: (
    nodeId: string,
    blockId: string,
    block: DraftBlock,
    mode: "create" | "edit",
  ) => void;
}) {
  return rootNodes.map((node) => (
    <AdminIngestionRenderedPreviewNode
      key={node.id}
      node={node}
      childrenByParent={childrenByParent}
      assetById={assetById}
      assetPreviewBaseUrl={assetPreviewBaseUrl}
      selectedNodeId={selectedNodeId}
      selectedBlockId={selectedBlockId}
      blockIssueCountById={blockIssueCountById}
      assetIssueCountById={assetIssueCountById}
      onSelectNode={onSelectNode}
      onSelectBlock={onSelectBlock}
      onFocusSnippetTools={onFocusSnippetTools}
      onFocusNativeTools={onFocusNativeTools}
      onOpenAssetToolPanel={onOpenAssetToolPanel}
    />
  ));
}

function AdminIngestionRenderedPreviewNode({
  node,
  childrenByParent,
  assetById,
  assetPreviewBaseUrl,
  selectedNodeId,
  selectedBlockId,
  blockIssueCountById,
  assetIssueCountById,
  onSelectNode,
  onSelectBlock,
  onFocusSnippetTools,
  onFocusNativeTools,
  onOpenAssetToolPanel,
}: {
  node: DraftNode;
  childrenByParent: Map<string | null, DraftNode[]>;
  assetById: Map<string, DraftAsset>;
  assetPreviewBaseUrl: string;
  selectedNodeId: string | null;
  selectedBlockId: string | null;
  blockIssueCountById: Map<string, number>;
  assetIssueCountById: Map<string, number>;
  onSelectNode: (nodeId: string) => void;
  onSelectBlock: (nodeId: string, blockId: string) => void;
  onFocusSnippetTools: (nodeId: string, blockId: string) => void;
  onFocusNativeTools: (nodeId: string, blockId: string, assetId: string) => void;
  onOpenAssetToolPanel: (
    nodeId: string,
    blockId: string,
    block: DraftBlock,
    mode: "create" | "edit",
  ) => void;
}) {
  const children = childrenByParent.get(node.id) ?? [];
  const previewBlocks = buildPreviewBlocks(
    node.blocks,
    assetById,
    assetPreviewBaseUrl,
  );

  return (
    <article
      id={`preview-node-${node.id}`}
      className={
        node.id === selectedNodeId
          ? "ingestion-preview-node selected"
          : "ingestion-preview-node"
      }
      onClick={(event) => {
        event.stopPropagation();
        onSelectNode(node.id);
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
            const asset = block.assetId ? (assetById.get(block.assetId) ?? null) : null;
            const canFixFromSource =
              block.type === "paragraph" ||
              block.type === "latex" ||
              block.type === "heading" ||
              block.type === "list";
            const canLinkAsset =
              block.type === "image" ||
              block.type === "table" ||
              block.type === "graph" ||
              block.type === "tree";
            const issueCount =
              (blockIssueCountById.get(block.id) ?? 0) +
              (asset ? (assetIssueCountById.get(asset.id) ?? 0) : 0);

            return (
              <article
                key={block.id}
                id={`preview-block-${block.id}`}
                className={
                  block.id === selectedBlockId
                    ? "ingestion-preview-block-card selected"
                    : "ingestion-preview-block-card"
                }
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectBlock(node.id, block.id);
                }}
              >
                <div className="ingestion-preview-block-head">
                  <div>
                    <strong>
                      Block {index + 1} · {block.role}
                    </strong>
                    <small>
                      {block.type}
                      {asset ? ` · ${asset.classification}` : ""}
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
                          onFocusSnippetTools(node.id, block.id);
                        }}
                      >
                        Fix Text
                      </button>
                    ) : null}
                    {asset ? (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={(event) => {
                          event.stopPropagation();
                          onFocusNativeTools(node.id, block.id, asset.id);
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
                          onOpenAssetToolPanel(
                            node.id,
                            block.id,
                            block,
                            asset ? "edit" : "create",
                          );
                        }}
                      >
                        {asset ? "Edit Asset" : "New Asset"}
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
          {children.map((child) => (
            <AdminIngestionRenderedPreviewNode
              key={child.id}
              node={child}
              childrenByParent={childrenByParent}
              assetById={assetById}
              assetPreviewBaseUrl={assetPreviewBaseUrl}
              selectedNodeId={selectedNodeId}
              selectedBlockId={selectedBlockId}
              blockIssueCountById={blockIssueCountById}
              assetIssueCountById={assetIssueCountById}
              onSelectNode={onSelectNode}
              onSelectBlock={onSelectBlock}
              onFocusSnippetTools={onFocusSnippetTools}
              onFocusNativeTools={onFocusNativeTools}
              onOpenAssetToolPanel={onOpenAssetToolPanel}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}
