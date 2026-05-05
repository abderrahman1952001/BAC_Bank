"use client";

import { useEffect } from "react";
import { TopicTagPicker } from "@/components/topic-tag-picker";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { DraftBlockRole, DraftBlockType } from "@/lib/admin";
import {
  formatRows,
  parseRows,
  withRowsData,
  type DraftAsset,
  type DraftBlock,
  type DraftNode,
} from "@/lib/admin-ingestion-structure";
import type { TopicOption } from "@/lib/topic-taxonomy";

const NODE_TYPE_OPTIONS: DraftNode["nodeType"][] = [
  "EXERCISE",
  "PART",
  "QUESTION",
  "SUBQUESTION",
  "CONTEXT",
];
const BLOCK_TYPE_OPTIONS: DraftBlockType[] = [
  "paragraph",
  "heading",
  "latex",
  "image",
  "code",
  "table",
  "list",
  "graph",
  "tree",
];
const BLOCK_ROLE_OPTIONS: DraftBlockRole[] = [
  "PROMPT",
  "SOLUTION",
  "HINT",
  "RUBRIC",
  "META",
];

export function AdminIngestionInspector({
  selectedNode,
  selectedNodePath,
  selectedBlockId,
  pendingFocusBlockId,
  parentOptions,
  availableTopics,
  subjectCode,
  selectedStreamCodes,
  assets,
  blockIssueCountById,
  onPendingFocusBlockIdChange,
  onUpdateSelectedNodeFields,
  onReparentSelectedNode,
  onSelectBlock,
  onUpdateBlock,
  onMoveBlock,
  onRemoveBlock,
  onFocusNativeTools,
  onApplyBlockPreset,
  onUpdateBlockData,
  onOpenAssetToolPanel,
}: {
  selectedNode: DraftNode | null;
  selectedNodePath: DraftNode[];
  selectedBlockId: string | null;
  pendingFocusBlockId: string | null;
  parentOptions: DraftNode[];
  availableTopics: TopicOption[];
  subjectCode: string | null;
  selectedStreamCodes: string[];
  assets: DraftAsset[];
  blockIssueCountById: Map<string, number>;
  onPendingFocusBlockIdChange: (blockId: string | null) => void;
  onUpdateSelectedNodeFields: (patch: Partial<DraftNode>) => void;
  onReparentSelectedNode: (parentId: string | null) => void;
  onSelectBlock: (blockId: string) => void;
  onUpdateBlock: (blockId: string, patch: Partial<DraftBlock>) => void;
  onMoveBlock: (blockId: string, direction: -1 | 1) => void;
  onRemoveBlock: (blockId: string) => void;
  onFocusNativeTools: (
    nodeId: string,
    blockId: string,
    assetId: string,
  ) => void;
  onApplyBlockPreset: (
    blockId: string,
    preset: "table" | "formula_graph" | "probability_tree",
  ) => void;
  onUpdateBlockData: (
    blockId: string,
    nextData: Record<string, unknown> | null,
  ) => void;
  onOpenAssetToolPanel: (block: DraftBlock, mode: "create" | "edit") => void;
}) {
  useEffect(() => {
    if (!pendingFocusBlockId) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const container = document.getElementById(
        `inspector-block-${pendingFocusBlockId}`,
      );
      const target = container?.querySelector<HTMLElement>(
        "[data-primary-block-input='true'], textarea, input, select",
      );

      if (!target) {
        return;
      }

      target.focus();

      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      ) {
        target.select();
      }

      onPendingFocusBlockIdChange(null);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [
    onPendingFocusBlockIdChange,
    pendingFocusBlockId,
    selectedBlockId,
    selectedNode,
  ]);

  return (
    <>
      <div className="admin-page-head ingestion-side-head">
        <h3>Inspector</h3>
      </div>

      {selectedNode ? (
        <>
          {selectedNodePath.length ? (
            <div className="ingestion-selection-path">
              {selectedNodePath.map((node, index) => (
                <span key={node.id}>
                  {index > 0 ? " / " : ""}
                  {node.label ?? node.nodeType}
                </span>
              ))}
            </div>
          ) : null}

          <div className="admin-form-grid">
            <label className="field">
              <span>Node type</span>
              <NativeSelect
                value={selectedNode.nodeType}
                onChange={(event) => {
                  onUpdateSelectedNodeFields({
                    nodeType: event.target.value as DraftNode["nodeType"],
                  });
                }}
              >
                {NODE_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </NativeSelect>
            </label>

            <label className="field">
              <span>Parent</span>
              <NativeSelect
                value={selectedNode.parentId ?? ""}
                onChange={(event) => {
                  onReparentSelectedNode(event.target.value || null);
                }}
              >
                <option value="">Root</option>
                {parentOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label ?? option.nodeType}
                  </option>
                ))}
              </NativeSelect>
            </label>

            <label className="field">
              <span>Label</span>
              <Input
                value={selectedNode.label ?? ""}
                onChange={(event) => {
                  onUpdateSelectedNodeFields({
                    label: event.target.value || null,
                  });
                }}
              />
            </label>

            <label className="field">
              <span>Points</span>
              <Input
                type="number"
                min="0"
                step="0.25"
                value={selectedNode.maxPoints ?? ""}
                onChange={(event) => {
                  const nextValue = Number.parseFloat(event.target.value);
                  onUpdateSelectedNodeFields({
                    maxPoints: Number.isFinite(nextValue) ? nextValue : null,
                  });
                }}
              />
            </label>
          </div>

          <div className="admin-form-fieldset">
            <h3>Topic Tags</h3>
            <TopicTagPicker
              topics={availableTopics}
              subjectCode={subjectCode}
              streamCodes={selectedStreamCodes}
              selectedCodes={selectedNode.topicCodes}
              onChange={(topicCodes) => {
                onUpdateSelectedNodeFields({
                  topicCodes,
                });
              }}
            />
          </div>

          <section className="ingestion-block-stack">
            {selectedNode.blocks.length ? (
              selectedNode.blocks.map((block, index) => (
                <article
                  key={block.id}
                  id={`inspector-block-${block.id}`}
                  className={
                    block.id === selectedBlockId
                      ? "block-item ingestion-block-card selected"
                      : "block-item ingestion-block-card"
                  }
                  onClick={() => {
                    onSelectBlock(block.id);
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
                      <NativeSelect
                        value={block.role}
                        onChange={(event) => {
                          onUpdateBlock(block.id, {
                            role: event.target.value as DraftBlockRole,
                          });
                        }}
                      >
                        {BLOCK_ROLE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </NativeSelect>
                      <NativeSelect
                        value={block.type}
                        onChange={(event) => {
                          onUpdateBlock(block.id, {
                            type: event.target.value as DraftBlockType,
                          });
                        }}
                      >
                        {BLOCK_TYPE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </NativeSelect>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 rounded-full px-3"
                        onClick={(event) => {
                          event.stopPropagation();
                          onMoveBlock(block.id, -1);
                        }}
                      >
                        ↑
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 rounded-full px-3"
                        onClick={(event) => {
                          event.stopPropagation();
                          onMoveBlock(block.id, 1);
                        }}
                      >
                        ↓
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 rounded-full px-3"
                        onClick={(event) => {
                          event.stopPropagation();
                          onRemoveBlock(block.id);
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>

                  <div className="chip-grid">
                    {block.assetId ? (
                      <FilterChip
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onFocusNativeTools(
                            selectedNode.id,
                            block.id,
                            block.assetId as string,
                          );
                        }}
                      >
                        Native Render
                      </FilterChip>
                    ) : null}
                    <FilterChip
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onApplyBlockPreset(block.id, "table");
                      }}
                    >
                      Table Preset
                    </FilterChip>
                    <FilterChip
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onApplyBlockPreset(block.id, "formula_graph");
                      }}
                    >
                      Graph Preset
                    </FilterChip>
                    <FilterChip
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onApplyBlockPreset(block.id, "probability_tree");
                      }}
                    >
                      Tree Preset
                    </FilterChip>
                  </div>

                  <div className="admin-form-grid">
                    <label className="field">
                      <span>Asset</span>
                      <NativeSelect
                        value={block.assetId ?? ""}
                        onChange={(event) => {
                          onUpdateBlock(block.id, {
                            assetId: event.target.value || null,
                          });
                        }}
                      >
                        <option value="">None</option>
                        {assets.map((asset) => (
                          <option key={asset.id} value={asset.id}>
                            {asset.label ?? asset.id} · {asset.classification}
                          </option>
                        ))}
                      </NativeSelect>
                    </label>

                    {block.type === "image" ||
                    block.type === "table" ||
                    block.type === "graph" ||
	                    block.type === "tree" ? (
	                      <div className="block-item-actions">
	                        <Button
	                          type="button"
	                          variant="outline"
	                          className="h-9 rounded-full px-3"
	                          onClick={(event) => {
	                            event.stopPropagation();
	                            onOpenAssetToolPanel(block, "create");
	                          }}
	                        >
	                          New Asset
	                        </Button>
	                        {block.assetId ? (
	                          <Button
	                            type="button"
	                            variant="outline"
	                            className="h-9 rounded-full px-3"
	                            onClick={(event) => {
	                              event.stopPropagation();
	                              onOpenAssetToolPanel(block, "edit");
	                            }}
	                          >
	                            Edit Asset
	                          </Button>
	                        ) : null}
	                      </div>
                    ) : null}

                    {block.type === "heading" ? (
                      <label className="field">
                        <span>Heading level</span>
                        <Input
                          data-primary-block-input="true"
                          type="number"
                          min="1"
                          max="6"
                          value={block.meta?.level ?? 2}
                          onChange={(event) => {
                            onUpdateBlock(block.id, {
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

                    {block.type === "code" ? (
                      <label className="field">
                        <span>Language</span>
                        <Input
                          data-primary-block-input="true"
                          value={block.meta?.language ?? ""}
                          onChange={(event) => {
                            onUpdateBlock(block.id, {
                              meta: {
                                ...(block.meta ?? {}),
                                language: event.target.value || undefined,
                              },
                            });
                          }}
                        />
                      </label>
                    ) : null}

                    {block.type === "table" ? (
                      <label className="field admin-form-wide">
                        <span>Rows</span>
                        <Textarea
                          data-primary-block-input="true"
                          key={`${block.id}:${formatRows(block.data)}`}
                          rows={5}
                          defaultValue={formatRows(block.data)}
                          placeholder="Cell A | Cell B&#10;Row 2 Col 1 | Row 2 Col 2"
                          onBlur={(event) => {
                            const rows = parseRows(event.target.value);
                            onUpdateBlockData(
                              block.id,
                              withRowsData(block.data ?? null, rows),
                            );
                          }}
                        />
                      </label>
                    ) : null}

                    {block.type !== "image" ? (
                      <label className="field admin-form-wide">
                        <span>
                          {block.type === "list"
                            ? "List Content"
                            : block.type === "table"
                              ? "Fallback Text"
                              : block.type === "graph" || block.type === "tree"
                                ? "Supporting Text"
                                : "Content"}
                        </span>
                        <Textarea
                          data-primary-block-input="true"
                          rows={block.type === "code" ? 7 : 4}
                          value={block.value}
                          onChange={(event) => {
                            onUpdateBlock(block.id, {
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
    </>
  );
}
