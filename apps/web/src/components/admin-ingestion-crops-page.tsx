"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Save,
  Search,
} from "lucide-react";
import {
  IngestionCropEditor,
  IngestionCropPreview,
  type CropBox,
} from "@/components/ingestion-crop-editor";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { SelectionCard } from "@/components/ui/selection-card";
import { Textarea } from "@/components/ui/textarea";
import type {
  AdminIngestionCropQueueItem,
  AdminIngestionCropQueueResponse,
} from "@/lib/admin";
import {
  fetchAdminIngestionCropQueue,
  updateAdminIngestionAssetCrop,
} from "@/lib/admin";
import {
  buildCropSubjectOptions,
  buildCropQueueStats,
  filterCropQueueItems,
  formatCropDocumentKind,
  formatCropVariant,
  type CropClassificationFilter,
  type CropDocumentKindFilter,
  type CropSubjectFilter,
} from "@/lib/admin-ingestion-crops";

type AdminIngestionCropsPageProps = {
  initialQueue?: AdminIngestionCropQueueResponse;
};

const classificationOptions: Array<{
  value: CropClassificationFilter;
  label: string;
}> = [
  { value: "all", label: "All assets" },
  { value: "image", label: "Images" },
  { value: "graph", label: "Graphs" },
  { value: "table", label: "Tables" },
  { value: "tree", label: "Trees" },
];

const documentOptions: Array<{
  value: CropDocumentKindFilter;
  label: string;
}> = [
  { value: "all", label: "All documents" },
  { value: "EXAM", label: "Exam" },
  { value: "CORRECTION", label: "Correction" },
];

export function AdminIngestionCropsPage({
  initialQueue,
}: AdminIngestionCropsPageProps) {
  const [items, setItems] = useState<AdminIngestionCropQueueItem[]>(
    initialQueue?.data ?? [],
  );
  const [query, setQuery] = useState("");
  const [subjectCode, setSubjectCode] = useState<CropSubjectFilter>("all");
  const [documentKind, setDocumentKind] =
    useState<CropDocumentKindFilter>("all");
  const [classification, setClassification] =
    useState<CropClassificationFilter>("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(
    initialQueue?.data[0] ? cropItemKey(initialQueue.data[0]) : null,
  );
  const [localCrop, setLocalCrop] = useState<CropBox | null>(
    initialQueue?.data[0]?.crop_box ?? null,
  );
  const [needsCleanup, setNeedsCleanup] = useState(
    initialQueue?.data[0]?.needs_cleanup ?? false,
  );
  const [notes, setNotes] = useState(initialQueue?.data[0]?.notes ?? "");
  const [loading, setLoading] = useState(!initialQueue);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialQueue) {
      return;
    }

    void refreshQueue();
    // Initial server payload is the route-level source of truth.
  }, [initialQueue]);

  const filteredItems = useMemo(
    () =>
      filterCropQueueItems({
        items,
        query,
        subjectCode,
        documentKind,
        classification,
      }),
    [classification, documentKind, items, query, subjectCode],
  );
  const selectedItem = useMemo(() => {
    if (!selectedKey) {
      return filteredItems[0] ?? null;
    }

    return (
      filteredItems.find((item) => cropItemKey(item) === selectedKey) ??
      filteredItems[0] ??
      null
    );
  }, [filteredItems, selectedKey]);
  const stats = useMemo(() => buildCropQueueStats(items), [items]);
  const subjectOptions = useMemo(() => buildCropSubjectOptions(items), [items]);
  const selectedIndex = selectedItem
    ? filteredItems.findIndex(
        (item) => cropItemKey(item) === cropItemKey(selectedItem),
      )
    : -1;
  const selectedPosition =
    selectedIndex >= 0
      ? `${selectedIndex + 1} / ${filteredItems.length}`
      : "0 / 0";

  useEffect(() => {
    if (!selectedItem) {
      setLocalCrop(null);
      setNeedsCleanup(false);
      setNotes("");
      setSelectedKey(null);
      return;
    }

    setSelectedKey(cropItemKey(selectedItem));
    setLocalCrop(selectedItem.crop_box);
    setNeedsCleanup(selectedItem.needs_cleanup);
    setNotes(selectedItem.notes ?? "");
  }, [selectedItem]);

  async function refreshQueue() {
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const payload = await fetchAdminIngestionCropQueue();
      setItems(payload.data);
      setSelectedKey(payload.data[0] ? cropItemKey(payload.data[0]) : null);
      setLocalCrop(payload.data[0]?.crop_box ?? null);
      setNeedsCleanup(payload.data[0]?.needs_cleanup ?? false);
      setNotes(payload.data[0]?.notes ?? "");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load crop queue.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveCurrentCrop() {
    if (!selectedItem || !localCrop) {
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    const nextSelection = resolveNextSelection(filteredItems, selectedItem);

    try {
      const response = await updateAdminIngestionAssetCrop(
        selectedItem.job_id,
        selectedItem.asset_id,
        {
          crop_box: localCrop,
          needs_cleanup: needsCleanup,
          notes,
        },
      );

      setItems((current) => {
        if (!response.item.placeholder) {
          return current.filter(
            (item) => cropItemKey(item) !== cropItemKey(selectedItem),
          );
        }

        return current.map((item) =>
          cropItemKey(item) === cropItemKey(selectedItem)
            ? response.item
            : item,
        );
      });
      setSelectedKey(nextSelection ? cropItemKey(nextSelection) : null);
      setNotice(
        response.item.placeholder
          ? "Crop saved. This asset is still full-page."
          : "Crop saved and removed from the placeholder queue.",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save crop.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel admin-crops-page">
      <div className="admin-page-head">
        <div className="admin-page-intro">
          <h1>Crop Queue</h1>
          <div className="admin-page-meta-row">
            <span className="admin-page-meta-pill">
              <strong>{stats.placeholders}</strong> placeholders
            </span>
            <span className="admin-page-meta-pill">
              <strong>{stats.jobs}</strong> jobs
            </span>
            <span className="admin-page-meta-pill">
              <strong>{stats.exam}</strong> exam
            </span>
            <span className="admin-page-meta-pill">
              <strong>{stats.correction}</strong> correction
            </span>
            <span className="admin-page-meta-pill">
              <strong>{stats.needsCleanup}</strong> cleanup
            </span>
          </div>
        </div>
        <div className="table-actions ingestion-action-bar">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-full px-5"
            onClick={() => void refreshQueue()}
            disabled={loading || saving}
          >
            <RefreshCw data-icon aria-hidden="true" />
            Refresh
          </Button>
        </div>
      </div>

      {notice ? <p className="success-text">{notice}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <section className="admin-crops-layout">
        <aside className="admin-editor-panel admin-crops-queue-panel">
          <div className="admin-page-head ingestion-side-head">
            <div>
              <h2>Placeholders</h2>
              <p className="muted-text">{selectedPosition}</p>
            </div>
          </div>

          <label className="field">
            <span>Find crop</span>
            <div className="admin-crops-search">
              <Search aria-hidden="true" size={17} />
              <Input
                type="search"
                placeholder="Search job, page, asset, node…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </label>

          <div className="admin-crops-filter-grid">
            <label className="field admin-crops-subject-filter">
              <span>Subject</span>
              <NativeSelect
                value={subjectCode}
                onChange={(event) => setSubjectCode(event.target.value)}
              >
                {subjectOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} ({option.count})
                  </option>
                ))}
              </NativeSelect>
            </label>
            <label className="field">
              <span>Document</span>
              <NativeSelect
                value={documentKind}
                onChange={(event) =>
                  setDocumentKind(event.target.value as CropDocumentKindFilter)
                }
              >
                {documentOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <label className="field">
              <span>Type</span>
              <NativeSelect
                value={classification}
                onChange={(event) =>
                  setClassification(
                    event.target.value as CropClassificationFilter,
                  )
                }
              >
                {classificationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect>
            </label>
          </div>

          <div className="admin-crops-list">
            {loading ? <p className="muted-text">Loading crop queue…</p> : null}
            {!loading && filteredItems.length === 0 ? (
              <p className="muted-text">
                No full-page placeholder crops match.
              </p>
            ) : null}
            {filteredItems.map((item) => (
              <SelectionCard
                key={cropItemKey(item)}
                type="button"
                id={`crop-queue-${cropItemKey(item)}`}
                active={
                  selectedItem
                    ? cropItemKey(item) === cropItemKey(selectedItem)
                    : false
                }
                className="admin-crop-queue-card min-h-0 rounded-2xl p-3"
                onClick={() => {
                  setSelectedKey(cropItemKey(item));
                  setLocalCrop(item.crop_box);
                  setNeedsCleanup(item.needs_cleanup);
                  setNotes(item.notes ?? "");
                }}
              >
                <strong>{item.asset_label ?? item.asset_id}</strong>
                <span>{item.job_label}</span>
                <span>
                  {formatCropDocumentKind(item.source_document_kind)} page{" "}
                  {item.source_page_number} · {item.classification}
                </span>
                <span>
                  {item.linked_node_path.join(" / ") || "No linked node"}
                </span>
                {item.needs_cleanup ? (
                  <span className="admin-crop-cleanup-flag">Needs cleanup</span>
                ) : null}
              </SelectionCard>
            ))}
          </div>
        </aside>

        <main className="admin-editor-panel admin-crops-stage-panel">
          {!selectedItem || !localCrop ? (
            <div className="admin-crops-empty">
              <CheckCircle2 aria-hidden="true" />
              <h2>Crop queue is clear</h2>
              <p className="muted-text">
                Full-page placeholders will appear here after reviewed-extract
                imports.
              </p>
            </div>
          ) : (
            <>
              <div className="admin-page-head ingestion-side-head">
                <div>
                  <h2>{selectedItem.asset_label ?? selectedItem.asset_id}</h2>
                  <div className="admin-page-meta-row">
                    <span className={`status-chip ${selectedItem.job_status}`}>
                      {selectedItem.job_status}
                    </span>
                    <span className="admin-page-meta-pill">
                      {selectedItem.year} ·{" "}
                      {selectedItem.subject_code ?? "Subject"}
                    </span>
                    <span className="admin-page-meta-pill">
                      {selectedItem.stream_codes.join(" · ") || "No streams"}
                    </span>
                    <span className="admin-page-meta-pill">
                      {formatCropVariant(selectedItem.variant_code)}
                    </span>
                  </div>
                  {selectedItem.needs_cleanup ||
                  selectedItem.cleanup_mask_count > 0 ? (
                    <div className="admin-page-meta-row">
                      {selectedItem.needs_cleanup ? (
                        <span className="admin-page-meta-pill">
                          Needs cleanup
                        </span>
                      ) : null}
                      {selectedItem.cleanup_mask_count > 0 ? (
                        <span className="admin-page-meta-pill">
                          {selectedItem.cleanup_mask_count} masks
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <div className="table-actions">
                  <Button
                    asChild
                    variant="outline"
                    className="h-9 rounded-full px-4"
                  >
                    <Link href={`/admin/drafts/${selectedItem.job_id}`}>
                      <ExternalLink data-icon aria-hidden="true" />
                      Open Draft
                    </Link>
                  </Button>
                </div>
              </div>

              <IngestionCropEditor
                imageUrl={selectedItem.page_image_url}
                alt={selectedItem.asset_label ?? selectedItem.asset_id}
                naturalWidth={selectedItem.source_page_width}
                naturalHeight={selectedItem.source_page_height}
                cropBox={localCrop}
                onPreviewChange={(nextCrop) => {
                  if (nextCrop) {
                    setLocalCrop(nextCrop);
                  }
                }}
                onChange={setLocalCrop}
              />
            </>
          )}
        </main>

        <aside className="admin-editor-panel admin-crops-inspector-panel">
          {!selectedItem || !localCrop ? (
            <p className="muted-text">
              Select a placeholder crop to inspect it.
            </p>
          ) : (
            <>
              <div className="admin-page-head ingestion-side-head">
                <div>
                  <h2>Inspector</h2>
                  <p className="muted-text">
                    {formatCropDocumentKind(selectedItem.source_document_kind)}{" "}
                    page {selectedItem.source_page_number}
                  </p>
                </div>
              </div>

              <div className="admin-crops-inspector-grid">
                <label className="field">
                  <span>x</span>
                  <Input
                    type="number"
                    value={localCrop.x}
                    onChange={(event) =>
                      setLocalCropField(
                        setLocalCrop,
                        localCrop,
                        "x",
                        event.target.value,
                      )
                    }
                  />
                </label>
                <label className="field">
                  <span>y</span>
                  <Input
                    type="number"
                    value={localCrop.y}
                    onChange={(event) =>
                      setLocalCropField(
                        setLocalCrop,
                        localCrop,
                        "y",
                        event.target.value,
                      )
                    }
                  />
                </label>
                <label className="field">
                  <span>width</span>
                  <Input
                    type="number"
                    value={localCrop.width}
                    onChange={(event) =>
                      setLocalCropField(
                        setLocalCrop,
                        localCrop,
                        "width",
                        event.target.value,
                      )
                    }
                  />
                </label>
                <label className="field">
                  <span>height</span>
                  <Input
                    type="number"
                    value={localCrop.height}
                    onChange={(event) =>
                      setLocalCropField(
                        setLocalCrop,
                        localCrop,
                        "height",
                        event.target.value,
                      )
                    }
                  />
                </label>
              </div>

              <label className="field">
                <span>Notes</span>
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Optional reviewer note"
                />
              </label>

              <label className="admin-crops-checkbox-row">
                <Checkbox
                  checked={needsCleanup}
                  onCheckedChange={(checked) =>
                    setNeedsCleanup(checked === true)
                  }
                />
                <span>
                  Needs cleanup after crop
                  <small>
                    Mark unavoidable adjacent text or scan noise for Codex to
                    mask after the crop pass.
                  </small>
                </span>
              </label>

              <figure className="ingestion-preview-card">
                <IngestionCropPreview
                  imageUrl={selectedItem.page_image_url}
                  alt={selectedItem.asset_label ?? selectedItem.asset_id}
                  naturalWidth={selectedItem.source_page_width}
                  naturalHeight={selectedItem.source_page_height}
                  cropBox={localCrop}
                />
                <figcaption>Current crop preview</figcaption>
              </figure>

              <div className="admin-crops-node-path">
                <span className="admin-stat-label">Linked node</span>
                <strong>
                  {selectedItem.linked_node_path.join(" / ") ||
                    "No linked node"}
                </strong>
              </div>
            </>
          )}
        </aside>
      </section>

      <div className="admin-crops-bottom-actions">
        <div className="admin-crops-bottom-context">
          <span className="admin-stat-label">Current crop</span>
          <strong>
            {selectedItem
              ? (selectedItem.asset_label ?? selectedItem.asset_id)
              : "No crop selected"}
          </strong>
          <span className="muted-text">{selectedPosition}</span>
        </div>
        <Button
          type="button"
          className="h-10 rounded-full px-5"
          onClick={() => void saveCurrentCrop()}
          disabled={!selectedItem || !localCrop || saving}
        >
          {saving ? (
            <RefreshCw data-icon aria-hidden="true" />
          ) : (
            <Save data-icon aria-hidden="true" />
          )}
          {saving ? "Saving" : "Save and Next"}
        </Button>
      </div>
    </section>
  );
}

function cropItemKey(
  item: Pick<AdminIngestionCropQueueItem, "job_id" | "asset_id">,
) {
  return `${item.job_id}:${item.asset_id}`;
}

function resolveNextSelection(
  items: AdminIngestionCropQueueItem[],
  selectedItem: AdminIngestionCropQueueItem,
) {
  const selectedIndex = items.findIndex(
    (item) => cropItemKey(item) === cropItemKey(selectedItem),
  );

  if (selectedIndex < 0) {
    return items[0] ?? null;
  }

  return items[selectedIndex + 1] ?? items[selectedIndex - 1] ?? null;
}

function setLocalCropField(
  setLocalCrop: (nextCrop: CropBox) => void,
  cropBox: CropBox,
  field: keyof CropBox,
  value: string,
) {
  const nextValue = Number.parseInt(value, 10);

  if (!Number.isFinite(nextValue)) {
    return;
  }

  setLocalCrop({
    ...cropBox,
    [field]: Math.max(0, nextValue),
  });
}
