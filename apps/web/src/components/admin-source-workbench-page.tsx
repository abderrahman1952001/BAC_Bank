"use client";

/* eslint-disable @next/next/no-img-element */

import katex from "katex";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  CheckCircle2,
  Crop,
  FileText,
  ImageIcon,
  Loader2,
  Save,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { SelectionCard } from "@/components/ui/selection-card";
import { Textarea } from "@/components/ui/textarea";
import {
  buildSourceWorkbenchAssetUrl,
  type AdminSourceCropBox,
  type AdminSourceCropStatus,
  type AdminSourceWorkbenchCrop,
  type AdminSourceWorkbenchSourceDetail,
  type AdminSourceWorkbenchSourceSummary,
  updateAdminSourceWorkbenchCrop,
  fetchAdminSourceWorkbenchSource,
} from "@/lib/admin";
import { cn } from "@/lib/utils";

type AdminSourceWorkbenchPageProps = {
  initialSources: AdminSourceWorkbenchSourceSummary[];
  initialDetail: AdminSourceWorkbenchSourceDetail | null;
  initialSelectedSourceId: string | null;
};

type MarkdownBlock =
  | { type: "heading"; level: number; text: string; key: string }
  | { type: "image"; alt: string; path: string; key: string }
  | { type: "math"; value: string; key: string }
  | { type: "paragraph"; text: string; key: string }
  | { type: "table"; rows: string[][]; key: string }
  | { type: "rule"; key: string };

type DragMode =
  | "draw"
  | "move"
  | "north"
  | "south"
  | "east"
  | "west"
  | "north-east"
  | "north-west"
  | "south-east"
  | "south-west";

type DragState = {
  mode: DragMode;
  startX: number;
  startY: number;
  startBox: AdminSourceCropBox;
  stageWidth: number;
  stageHeight: number;
  sourceWidth: number;
  sourceHeight: number;
};

type SourceNavigationGroup = {
  key: string;
  label: string;
  streams: Array<{
    key: string;
    label: string;
    sources: AdminSourceWorkbenchSourceSummary[];
  }>;
};

const cropStatuses: Array<{
  value: AdminSourceCropStatus;
  label: string;
}> = [
  { value: "needs-review", label: "Needs review" },
  { value: "reviewed", label: "Reviewed" },
  { value: "approved", label: "Approved" },
];

const inlineMathRegex = /\$\$([\s\S]+?)\$\$|\$([^\n$]+?)\$|`([^`\n]+?)`/g;

export function AdminSourceWorkbenchPage({
  initialSources,
  initialDetail,
}: AdminSourceWorkbenchPageProps) {
  const [detail, setDetail] =
    useState<AdminSourceWorkbenchSourceDetail | null>(initialDetail);
  const [query, setQuery] = useState("");
  const [selectedCropId, setSelectedCropId] = useState<string | null>(null);
  const [localBox, setLocalBox] = useState<AdminSourceCropBox | null>(null);
  const [localStatus, setLocalStatus] =
    useState<AdminSourceCropStatus>("needs-review");
  const [localNotes, setLocalNotes] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [sourceLoadState, setSourceLoadState] = useState<"idle" | "loading">(
    "idle",
  );
  const [loadingSourceId, setLoadingSourceId] = useState<string | null>(null);
  const [sourceLoadError, setSourceLoadError] = useState<string | null>(null);
  const [isCropDrawerOpen, setIsCropDrawerOpen] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);

  const filteredSources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return initialSources;
    }

    return initialSources.filter((source) =>
      [
        source.title,
        source.relativePath,
        source.subject,
        source.subjectCode,
        source.unit,
        source.topicCode,
        source.source,
        source.sourceSection,
        source.streams.join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [initialSources, query]);

  const groupedSources = useMemo(
    () => buildSourceNavigationGroups(filteredSources),
    [filteredSources],
  );

  const selectedCrop = useMemo<AdminSourceWorkbenchCrop | null>(
    () =>
      detail?.crops.find(
        (crop: AdminSourceWorkbenchCrop) => crop.id === selectedCropId,
      ) ?? null,
    [detail?.crops, selectedCropId],
  );

  const cropByAssetPath = useMemo(() => {
    const map = new Map<string, AdminSourceWorkbenchCrop>();

    for (const crop of detail?.crops ?? []) {
      map.set(crop.asset, crop);
    }

    return map;
  }, [detail?.crops]);

  const markdownBlocks = useMemo(
    () => buildMarkdownBlocks(detail?.markdown ?? ""),
    [detail?.markdown],
  );

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const dragState = dragStateRef.current;

      if (!dragState) {
        return;
      }

      const dx =
        ((event.clientX - dragState.startX) / dragState.stageWidth) *
        dragState.sourceWidth;
      const dy =
        ((event.clientY - dragState.startY) / dragState.stageHeight) *
        dragState.sourceHeight;
      setLocalBox(
        constrainBox(
          resizeBox(dragState.startBox, dragState.mode, dx, dy),
          dragState.sourceWidth,
          dragState.sourceHeight,
        ),
      );
    }

    function handlePointerUp() {
      dragStateRef.current = null;
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  useEffect(() => {
    if (!isCropDrawerOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsCropDrawerOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCropDrawerOpen]);

  function startDrag(mode: DragMode, event: React.PointerEvent) {
    if (!selectedCrop?.sourceDimensions || !localBox || !stageRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const rect = stageRef.current.getBoundingClientRect();
    dragStateRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      startBox: localBox,
      stageWidth: rect.width,
      stageHeight: rect.height,
      sourceWidth: selectedCrop.sourceDimensions.width,
      sourceHeight: selectedCrop.sourceDimensions.height,
    };
  }

  function startDraw(event: React.PointerEvent) {
    if (!selectedCrop?.sourceDimensions || !stageRef.current) {
      return;
    }

    event.preventDefault();
    const rect = stageRef.current.getBoundingClientRect();
    const sourceX =
      ((event.clientX - rect.left) / rect.width) *
      selectedCrop.sourceDimensions.width;
    const sourceY =
      ((event.clientY - rect.top) / rect.height) *
      selectedCrop.sourceDimensions.height;
    const startBox = constrainBox(
      {
        x: sourceX,
        y: sourceY,
        width: 1,
        height: 1,
      },
      selectedCrop.sourceDimensions.width,
      selectedCrop.sourceDimensions.height,
    );

    setLocalBox(startBox);
    dragStateRef.current = {
      mode: "draw",
      startX: event.clientX,
      startY: event.clientY,
      startBox,
      stageWidth: rect.width,
      stageHeight: rect.height,
      sourceWidth: selectedCrop.sourceDimensions.width,
      sourceHeight: selectedCrop.sourceDimensions.height,
    };
  }

  function selectCrop(cropId: string) {
    const crop = detail?.crops.find((candidate) => candidate.id === cropId);

    setSelectedCropId(cropId);
    setLocalBox(crop?.box ?? null);
    setLocalStatus(crop?.status ?? "needs-review");
    setLocalNotes(crop?.notes ?? "");
    setSaveState("idle");
    setSaveError(null);
  }

  function openCropEditor(cropId: string) {
    selectCrop(cropId);
    setIsCropDrawerOpen(true);
  }

  async function openSource(sourceId: string) {
    if (sourceId === detail?.source.id && sourceLoadState === "idle") {
      return;
    }

    setSourceLoadState("loading");
    setLoadingSourceId(sourceId);
    setSourceLoadError(null);
    setSaveState("idle");
    setSaveError(null);
    setIsCropDrawerOpen(false);

    try {
      const response = await fetchAdminSourceWorkbenchSource(sourceId);
      const nextDetail = response.data;
      setDetail(nextDetail);
      setSelectedCropId(null);
      setLocalBox(null);
      setLocalStatus("needs-review");
      setLocalNotes("");

      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set("source", sourceId);
      window.history.pushState(null, "", `${nextUrl.pathname}${nextUrl.search}`);
    } catch (error) {
      setSourceLoadError(
        error instanceof Error ? error.message : "Source could not be opened.",
      );
    } finally {
      setSourceLoadState("idle");
      setLoadingSourceId(null);
    }
  }

  function updateBoxField(field: keyof AdminSourceCropBox, value: string) {
    if (!selectedCrop?.sourceDimensions || !localBox) {
      return;
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      return;
    }

    setLocalBox(
      constrainBox(
        {
          ...localBox,
          [field]: parsed,
        },
        selectedCrop.sourceDimensions.width,
        selectedCrop.sourceDimensions.height,
      ),
    );
  }

  async function saveCrop() {
    if (!detail || !selectedCrop || !localBox) {
      return;
    }

    setSaveState("saving");
    setSaveError(null);

    try {
      const response = await updateAdminSourceWorkbenchCrop(
        detail.source.id,
        selectedCrop.id,
        {
          box: localBox,
          status: localStatus,
          notes: localNotes.trim() ? localNotes.trim() : null,
        },
      );
      setDetail(response.source);
      setSelectedCropId(response.crop.id);
      setLocalBox(response.crop.box);
      setLocalStatus(response.crop.status);
      setLocalNotes(response.crop.notes ?? "");
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1500);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Crop update failed.",
      );
      setSaveState("idle");
    }
  }

  return (
    <section className="panel source-workbench">
      <div className="admin-page-head">
        <div className="admin-page-intro">
          <h1>Source Workbench</h1>
          <div className="admin-page-meta-row">
            <span className="admin-page-meta-pill">
              {initialSources.length} sources
            </span>
            <span className="admin-page-meta-pill">
              {detail?.source.cropCount ?? 0} crops
            </span>
            <span className="admin-page-meta-pill">
              {detail?.source.unit ?? "No source selected"}
            </span>
          </div>
        </div>
        <div className="table-actions">
          <Button asChild variant="outline" className="h-10 rounded-full px-5">
            <Link href="/admin/drafts">Drafts</Link>
          </Button>
          <Button asChild variant="outline" className="h-10 rounded-full px-5">
            <Link href="/admin/intake">Intake</Link>
          </Button>
        </div>
      </div>

      <div className="source-workbench-grid">
        <aside className="source-list-panel" aria-label="Content sources">
          <div className="source-search">
            <Search size={16} aria-hidden="true" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search sources"
              aria-label="Search sources"
            />
          </div>

          <div className="source-list">
            {groupedSources.map((subjectGroup) => (
              <section key={subjectGroup.key} className="source-nav-group">
                <h3>{subjectGroup.label}</h3>
                {subjectGroup.streams.map((streamGroup) => (
                  <div key={streamGroup.key} className="source-stream-group">
                    <div className="source-stream-heading">
                      <span>{streamGroup.label}</span>
                      <span>{streamGroup.sources.length}</span>
                    </div>

                    <div className="source-stream-items">
                      {streamGroup.sources.map((source) => {
                        const active = source.id === detail?.source.id;
                        const loading =
                          sourceLoadState === "loading" &&
                          source.id === loadingSourceId;

                        return (
                          <SelectionCard
                            key={source.id}
                            type="button"
                            active={active}
                            className="min-h-0 gap-1 rounded-[14px] p-3"
                            onClick={() => void openSource(source.id)}
                            disabled={loading}
                          >
                            <span className="text-sm font-semibold text-foreground">
                              {source.unit ?? source.title}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {source.sourceSection ??
                                source.source ??
                                source.relativePath}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              {source.cropCount} crops ·{" "}
                              {source.reviewCounts["needs-review"]} pending
                              {loading ? (
                                <Loader2
                                  size={13}
                                  className="source-spin"
                                  aria-hidden="true"
                                />
                              ) : null}
                            </span>
                          </SelectionCard>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </section>
            ))}
          </div>

          {sourceLoadError ? (
            <p className="error-text source-load-error">{sourceLoadError}</p>
          ) : null}
        </aside>

        <main className="source-reading-panel" aria-label="Markdown preview">
          {detail ? (
            <>
              <div className="source-section-head">
                <div>
                  <span className="admin-stat-label">Markdown preview</span>
                  <h2>{detail.source.unit ?? detail.source.title}</h2>
                </div>
                <div className="source-section-head-actions">
                  <FileText size={18} aria-hidden="true" />
                  <span>{detail.source.relativePath}</span>
                </div>
              </div>

              <div className="source-markdown-preview" dir="rtl">
                {markdownBlocks.map((block) =>
                  renderMarkdownBlock({
                    block,
                    detail,
                    cropByAssetPath,
                    selectedCropId,
                    onSelectCrop: openCropEditor,
                  }),
                )}
              </div>
            </>
          ) : (
            <div className="source-empty-state">
              <FileText size={28} aria-hidden="true" />
              <h2>No source selected</h2>
              <p>Select a source folder with `extracted.md` and `crops.json`.</p>
            </div>
          )}
        </main>
      </div>

      {detail && selectedCrop && localBox && isCropDrawerOpen ? (
        <div
          className="source-crop-drawer-backdrop"
          role="presentation"
          onPointerDown={() => setIsCropDrawerOpen(false)}
        >
          <aside
            className="source-crop-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Crop editor"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="source-crop-drawer-head">
              <div>
                <span className="admin-stat-label">Crop editor</span>
                <h2>{selectedCrop.caption ?? selectedCrop.id}</h2>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="rounded-full"
                onClick={() => setIsCropDrawerOpen(false)}
                aria-label="Close crop editor"
              >
                <X data-icon="solo" aria-hidden="true" />
              </Button>
            </div>

            <div className="source-crop-editor">
              <div className="source-crop-strip" aria-label="Available crops">
                {detail.crops.map((crop) => (
                  <FilterChip
                    key={crop.id}
                    type="button"
                    active={crop.id === selectedCrop.id}
                    className="max-w-[180px] justify-start overflow-hidden"
                    onClick={() => selectCrop(crop.id)}
                  >
                    <ImageIcon size={13} aria-hidden="true" />
                    <span className="truncate">{crop.caption ?? crop.id}</span>
                  </FilterChip>
                ))}
              </div>

              <div
                ref={stageRef}
                className="source-crop-stage"
                aria-label="Source image crop editor"
                onPointerDown={startDraw}
              >
                <img
                  src={buildSourceWorkbenchAssetUrl({
                    sourceId: detail.source.id,
                    path: selectedCrop.source,
                  })}
                  alt="Source scan"
                  draggable={false}
                />
                {selectedCrop.sourceDimensions ? (
                  <div
                    className="source-crop-box"
                    style={toCropBoxStyle(
                      localBox,
                      selectedCrop.sourceDimensions.width,
                      selectedCrop.sourceDimensions.height,
                    )}
                    onPointerDown={(event) => startDrag("move", event)}
                  >
                    {(
                      [
                        "north-west",
                        "north",
                        "north-east",
                        "west",
                        "east",
                        "south-west",
                        "south",
                        "south-east",
                      ] as DragMode[]
                    ).map((mode) => (
                      <span
                        key={mode}
                        className={`source-crop-handle ${mode}`}
                        onPointerDown={(event) => startDrag(mode, event)}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="source-crop-drawer-footer">
                <div className="source-crop-preview-card">
                  <span className="admin-stat-label">Saved crop</span>
                  <img
                    src={buildSourceWorkbenchAssetUrl({
                      sourceId: detail.source.id,
                      path: selectedCrop.asset,
                      version: selectedCrop.assetUpdatedAt,
                    })}
                    alt={selectedCrop.caption ?? selectedCrop.id}
                  />
                </div>

                <div className="source-crop-controls">
                  <div className="source-crop-fields">
                    {(["x", "y", "width", "height"] as const).map((field) => (
                      <label key={field} className="field">
                        <span>{field}</span>
                        <Input
                          type="number"
                          min={field === "width" || field === "height" ? 1 : 0}
                          step={1}
                          value={localBox[field]}
                          onChange={(event) =>
                            updateBoxField(field, event.target.value)
                          }
                        />
                      </label>
                    ))}

                    <label className="field">
                      <span>Status</span>
                      <NativeSelect
                        value={localStatus}
                        onChange={(event) =>
                          setLocalStatus(
                            event.target.value as AdminSourceCropStatus,
                          )
                        }
                      >
                        {cropStatuses.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </NativeSelect>
                    </label>

                    <label className="field source-crop-notes">
                      <span>Notes</span>
                      <Textarea
                        value={localNotes}
                        onChange={(event) => setLocalNotes(event.target.value)}
                        placeholder="Review notes for this crop"
                        rows={3}
                      />
                    </label>
                  </div>

                  {saveError ? (
                    <p className="error-text">{saveError}</p>
                  ) : null}

                  <Button
                    type="button"
                    className="h-10 rounded-full px-5 source-save-button"
                    onClick={() => void saveCrop()}
                    disabled={saveState === "saving"}
                  >
                    {saveState === "saving" ? (
                      <Loader2
                        data-icon="inline-start"
                        className="source-spin"
                        aria-hidden="true"
                      />
                    ) : saveState === "saved" ? (
                      <CheckCircle2 data-icon="inline-start" aria-hidden="true" />
                    ) : (
                      <Save data-icon="inline-start" aria-hidden="true" />
                    )}
                    {saveState === "saved" ? "Saved" : "Save crop"}
                  </Button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}

function renderMarkdownBlock(input: {
  block: MarkdownBlock;
  detail: AdminSourceWorkbenchSourceDetail;
  cropByAssetPath: Map<string, AdminSourceWorkbenchCrop>;
  selectedCropId: string | null;
  onSelectCrop: (cropId: string) => void;
}) {
  const { block, detail, cropByAssetPath, selectedCropId, onSelectCrop } = input;

  if (block.type === "heading") {
    const Heading = `h${Math.min(Math.max(block.level + 1, 2), 4)}` as
      | "h2"
      | "h3"
      | "h4";

    return (
      <Heading key={block.key} className="source-markdown-heading">
        {renderInlineMarkdownText(block.text, block.key)}
      </Heading>
    );
  }

  if (block.type === "image") {
    const crop = cropByAssetPath.get(block.path);
    const image = (
      <img
        src={buildSourceWorkbenchAssetUrl({
          sourceId: detail.source.id,
          path: block.path,
          version: crop?.assetUpdatedAt,
        })}
        alt={block.alt}
      />
    );

    if (!crop) {
      return (
        <figure key={block.key} className="source-markdown-image">
          {image}
          <figcaption>{block.alt}</figcaption>
        </figure>
      );
    }

    return (
      <Button
        key={block.key}
        type="button"
        variant="outline"
        className={cn(
          "h-auto w-full flex-col items-stretch justify-start overflow-hidden rounded-2xl bg-card p-0 text-start whitespace-normal shadow-xs hover:-translate-y-0.5 hover:bg-accent/20 [&_img]:w-full [&_img]:rounded-t-2xl [&_span]:inline-flex [&_span]:items-center [&_span]:gap-1.5 [&_span]:px-3 [&_span]:py-2 [&_span]:text-sm [&_span]:text-muted-foreground",
          crop.id === selectedCropId && "border-primary/40 bg-secondary",
        )}
        onClick={() => onSelectCrop(crop.id)}
      >
        {image}
        <span>
          <Crop size={14} aria-hidden="true" />
          Edit crop · {crop.caption ?? crop.id}
        </span>
      </Button>
    );
  }

  if (block.type === "math") {
    return (
      <div
        key={block.key}
        className="source-markdown-math math-display"
        dir="ltr"
        dangerouslySetInnerHTML={{
          __html: renderKatexToHtml(block.value.trim(), true),
        }}
      />
    );
  }

  if (block.type === "table") {
    return (
      <div key={block.key} className="source-markdown-table-wrap">
        <table className="source-markdown-table">
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={`${block.key}-row-${rowIndex}`}>
                {row.map((cell, cellIndex) => {
                  const Cell = rowIndex === 0 ? "th" : "td";

                  return (
                    <Cell key={`${block.key}-cell-${rowIndex}-${cellIndex}`}>
                      {renderInlineMarkdownText(
                        cell,
                        `${block.key}-${rowIndex}-${cellIndex}`,
                      )}
                    </Cell>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (block.type === "rule") {
    return <hr key={block.key} className="source-markdown-rule" />;
  }

  return (
    <p key={block.key} className="source-markdown-paragraph">
      {renderInlineMarkdownText(block.text, block.key)}
    </p>
  );
}

function renderKatexToHtml(latex: string, displayMode: boolean) {
  return katex.renderToString(latex || " ", {
    displayMode,
    throwOnError: false,
    strict: "ignore",
  });
}

function normalizeMathDelimiters(text: string) {
  return text
    .replace(/\\\[((?:.|\n)*?)\\\]/g, (_, value: string) => `$$${value}$$`)
    .replace(/\\\(((?:.|\n)*?)\\\)/g, (_, value: string) => `$${value}$`);
}

function renderInlineMarkdownText(text: string, keyPrefix: string): ReactNode {
  const normalized = normalizeMathDelimiters(text);
  const parts: ReactNode[] = [];
  let cursor = 0;
  let matchIndex = 0;

  for (const match of normalized.matchAll(inlineMathRegex)) {
    const token = match[0];
    const start = match.index ?? -1;

    if (start < 0) {
      continue;
    }

    if (start > cursor) {
      parts.push(
        <span key={`${keyPrefix}-text-${matchIndex}`}>
          {normalized.slice(cursor, start)}
        </span>,
      );
    }

    const displayLatex = token.startsWith("$$") ? (match[1] ?? "") : null;
    const inlineLatex =
      token.startsWith("$") && !token.startsWith("$$") ? (match[2] ?? "") : null;
    const backtickLatex = token.startsWith("`") ? (match[3] ?? "") : null;

    parts.push(
      <span
        key={`${keyPrefix}-math-${matchIndex}`}
        className={displayLatex !== null ? "math-display" : "math-inline"}
        dangerouslySetInnerHTML={{
          __html: renderKatexToHtml(
            (displayLatex ?? inlineLatex ?? backtickLatex ?? "").trim(),
            displayLatex !== null,
          ),
        }}
      />,
    );

    cursor = start + token.length;
    matchIndex += 1;
  }

  if (cursor < normalized.length) {
    parts.push(
      <span key={`${keyPrefix}-tail`}>{normalized.slice(cursor)}</span>,
    );
  }

  return parts.length > 0 ? parts : text;
}

function isMarkdownTableStart(lines: string[], index: number) {
  return (
    isMarkdownTableLine(lines[index] ?? "") &&
    isMarkdownTableSeparator(lines[index + 1] ?? "")
  );
}

function isMarkdownTableLine(line: string) {
  const trimmed = line.trim();
  return trimmed.startsWith("|") && trimmed.endsWith("|");
}

function isMarkdownTableSeparator(line: string) {
  if (!isMarkdownTableLine(line)) {
    return false;
  }

  return parseMarkdownTableRow(line).every((cell) =>
    /^:?-{3,}:?$/.test(cell.trim()),
  );
}

function parseMarkdownTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function buildSourceNavigationGroups(
  sources: AdminSourceWorkbenchSourceSummary[],
): SourceNavigationGroup[] {
  const subjectMap = new Map<string, SourceNavigationGroup>();

  for (const source of sources) {
    const parts = source.relativePath.split("/");
    const subjectLabel = source.subject ?? source.subjectCode ?? parts[0] ?? "Sources";
    const subjectKey = source.subjectCode ?? parts[0] ?? subjectLabel;
    const streamLabel = source.streams.length
      ? source.streams.join(" / ")
      : (parts[1] ?? "Unsorted");
    const streamKey = `${subjectKey}:${streamLabel}`;
    let subjectGroup = subjectMap.get(subjectKey);

    if (!subjectGroup) {
      subjectGroup = {
        key: subjectKey,
        label: subjectLabel,
        streams: [],
      };
      subjectMap.set(subjectKey, subjectGroup);
    }

    let streamGroup = subjectGroup.streams.find(
      (candidate) => candidate.key === streamKey,
    );

    if (!streamGroup) {
      streamGroup = {
        key: streamKey,
        label: streamLabel,
        sources: [],
      };
      subjectGroup.streams.push(streamGroup);
    }

    streamGroup.sources.push(source);
  }

  return [...subjectMap.values()].map((subjectGroup) => ({
    ...subjectGroup,
    streams: subjectGroup.streams.map((streamGroup) => ({
      ...streamGroup,
      sources: streamGroup.sources.sort((a, b) =>
        a.relativePath.localeCompare(b.relativePath, "en"),
      ),
    })),
  }));
}

function buildMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = markdown.split(/\r?\n/);
  let inFrontmatter = lines[0]?.trim() === "---";
  let inMath = false;
  let mathLines: string[] = [];
  let paragraphLines: string[] = [];

  function flushParagraph(index: number) {
    if (paragraphLines.length === 0) {
      return;
    }

    blocks.push({
      type: "paragraph",
      text: paragraphLines.join(" "),
      key: `p-${index}-${blocks.length}`,
    });
    paragraphLines = [];
  }

  function flushMath(index: number) {
    blocks.push({
      type: "math",
      value: mathLines.join("\n"),
      key: `m-${index}-${blocks.length}`,
    });
    mathLines = [];
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    const trimmed = line.trim();

    if (inFrontmatter) {
      if (index > 0 && trimmed === "---") {
        inFrontmatter = false;
      }

      continue;
    }

    if (trimmed === "$$") {
      flushParagraph(index);

      if (inMath) {
        flushMath(index);
        inMath = false;
      } else {
        inMath = true;
      }

      continue;
    }

    if (inMath) {
      mathLines.push(line);
      continue;
    }

    if (!trimmed) {
      flushParagraph(index);
      continue;
    }

    if (trimmed === "---") {
      flushParagraph(index);
      blocks.push({ type: "rule", key: `r-${index}` });
      continue;
    }

    if (isMarkdownTableStart(lines, index)) {
      flushParagraph(index);
      const tableRows: string[][] = [];
      let tableIndex = index;

      while (tableIndex < lines.length && isMarkdownTableLine(lines[tableIndex]!)) {
        if (tableIndex !== index + 1) {
          tableRows.push(parseMarkdownTableRow(lines[tableIndex]!));
        }

        tableIndex += 1;
      }

      blocks.push({
        type: "table",
        rows: tableRows.filter((row) => row.length > 0),
        key: `t-${index}-${blocks.length}`,
      });
      index = tableIndex - 1;
      continue;
    }

    const imageMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);

    if (imageMatch) {
      flushParagraph(index);
      blocks.push({
        type: "image",
        alt: imageMatch[1] ?? "",
        path: imageMatch[2] ?? "",
        key: `i-${index}-${blocks.length}`,
      });
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);

    if (headingMatch) {
      flushParagraph(index);
      blocks.push({
        type: "heading",
        level: headingMatch[1]!.length,
        text: headingMatch[2]!,
        key: `h-${index}-${blocks.length}`,
      });
      continue;
    }

    paragraphLines.push(trimmed);
  }

  flushParagraph(lines.length);

  if (mathLines.length > 0) {
    flushMath(lines.length);
  }

  return blocks;
}

function toCropBoxStyle(
  box: AdminSourceCropBox,
  sourceWidth: number,
  sourceHeight: number,
) {
  return {
    left: `${(box.x / sourceWidth) * 100}%`,
    top: `${(box.y / sourceHeight) * 100}%`,
    width: `${(box.width / sourceWidth) * 100}%`,
    height: `${(box.height / sourceHeight) * 100}%`,
  };
}

function resizeBox(
  startBox: AdminSourceCropBox,
  mode: DragMode,
  dx: number,
  dy: number,
): AdminSourceCropBox {
  if (mode === "draw") {
    return {
      x: dx < 0 ? startBox.x + dx : startBox.x,
      y: dy < 0 ? startBox.y + dy : startBox.y,
      width: Math.max(1, Math.abs(dx)),
      height: Math.max(1, Math.abs(dy)),
    };
  }

  if (mode === "move") {
    return {
      ...startBox,
      x: startBox.x + dx,
      y: startBox.y + dy,
    };
  }

  const next = { ...startBox };

  if (mode.includes("west")) {
    next.x = startBox.x + dx;
    next.width = startBox.width - dx;
  }

  if (mode.includes("east")) {
    next.width = startBox.width + dx;
  }

  if (mode.includes("north")) {
    next.y = startBox.y + dy;
    next.height = startBox.height - dy;
  }

  if (mode.includes("south")) {
    next.height = startBox.height + dy;
  }

  return next;
}

function constrainBox(
  box: AdminSourceCropBox,
  sourceWidth: number,
  sourceHeight: number,
) {
  const width = Math.max(1, Math.round(box.width));
  const height = Math.max(1, Math.round(box.height));
  const x = Math.min(Math.max(0, Math.round(box.x)), sourceWidth - 1);
  const y = Math.min(Math.max(0, Math.round(box.y)), sourceHeight - 1);

  return {
    x,
    y,
    width: Math.min(width, sourceWidth - x),
    height: Math.min(height, sourceHeight - y),
  };
}
