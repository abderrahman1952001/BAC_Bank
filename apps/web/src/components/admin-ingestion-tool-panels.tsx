"use client";

/* eslint-disable @next/next/no-img-element */

import { type ReactNode } from "react";
import {
  IngestionCropEditor,
  IngestionCropPreview,
  type CropBox,
} from "@/components/ingestion-crop-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { DraftAssetClassification } from "@/lib/admin";
import {
  formatNativeSuggestionSource,
  formatNativeSuggestionStatus,
  type AssetToolDraft,
  type AssetToolPage,
  type DraftAsset,
  type DraftBlock,
} from "@/lib/admin-ingestion-structure";

export type AdminIngestionToolSourcePage = AssetToolPage & {
  image_url: string;
};

export function AdminIngestionToolPanelShell({
  mode,
  title,
  description,
  disabled,
  onClose,
  children,
}: {
  mode: "native" | "asset";
  title: string;
  description?: string;
  disabled: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="ingestion-tool-backdrop"
      onClick={() => {
        onClose();
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
              {mode === "native" ? "Native Rendering" : "Asset Builder"}
            </p>
            <h2>{title}</h2>
            {description ? <p className="muted-text">{description}</p> : null}
          </div>

          <div className="block-item-actions">
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-full px-3"
              disabled={disabled}
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </header>

        {children}
      </aside>
    </div>
  );
}

export function AdminIngestionNativeToolPanel({
  selectedAssetPage,
  selectedAsset,
  selectedBlock,
  previewCropBox,
  assetPreviewBaseUrl,
  assetClassifications,
  sourcePages,
  onSelectedAssetCropPreviewChange,
  onSelectedAssetCropChange,
  onSelectedAssetClassificationChange,
  onSelectedAssetSourcePageChange,
  onApplyNativeSuggestion,
}: {
  selectedAssetPage: AdminIngestionToolSourcePage | null;
  selectedAsset: DraftAsset | null;
  selectedBlock: DraftBlock | null;
  previewCropBox: CropBox | null;
  assetPreviewBaseUrl: string;
  assetClassifications: DraftAssetClassification[];
  sourcePages: AdminIngestionToolSourcePage[];
  onSelectedAssetCropPreviewChange: (cropBox: CropBox | null) => void;
  onSelectedAssetCropChange: (cropBox: CropBox) => void;
  onSelectedAssetClassificationChange: (
    classification: DraftAssetClassification,
  ) => void;
  onSelectedAssetSourcePageChange: (sourcePageId: string) => void;
  onApplyNativeSuggestion: () => void;
}) {
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
              cropBox={
                selectedAsset?.cropBox ?? {
                  x: 0,
                  y: 0,
                  width: 1,
                  height: 1,
                }
              }
              onPreviewChange={onSelectedAssetCropPreviewChange}
              onChange={onSelectedAssetCropChange}
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
              alt={selectedAsset?.label ?? selectedAsset?.id ?? "Asset preview"}
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
                Tighten the crop, classify the asset, and apply a reviewed
                native suggestion when one is available.
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
                <Input
                  value={
                    selectedBlock
                      ? `${selectedBlock.role} · ${selectedBlock.type}`
                      : "No target block selected"
                  }
                  readOnly
                />
              </label>

              <label className="field">
                <span>Classification</span>
                <NativeSelect
                  value={selectedAsset.classification}
                  onChange={(event) => {
                    onSelectedAssetClassificationChange(
                      event.target.value as DraftAssetClassification,
                    );
                  }}
                >
                  {assetClassifications.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </NativeSelect>
              </label>

              <label className="field admin-form-wide">
                <span>Source page</span>
                <NativeSelect
                  value={selectedAsset.sourcePageId}
                  onChange={(event) => {
                    onSelectedAssetSourcePageChange(event.target.value);
                  }}
                >
                  {sourcePages.map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.documentKind} page {page.page_number}
                    </option>
                  ))}
                </NativeSelect>
              </label>
            </div>
          )}
        </section>

        {selectedAsset?.nativeSuggestion ? (
          <section className="admin-context-card ingestion-native-suggestion-card">
            <h3>Stored Native Suggestion</h3>
            <p className="muted-text">
              {formatNativeSuggestionSource(
                selectedAsset.nativeSuggestion.source,
              )}{" "}
              ·{" "}
              {formatNativeSuggestionStatus(
                selectedAsset.nativeSuggestion.status,
              )}
            </p>
            <p className="muted-text">
              A {selectedAsset.nativeSuggestion.type} draft is already available
              for this asset.
            </p>
            {selectedAsset.nativeSuggestion.status === "stale" ? (
              <p className="error-text">
                The crop changed after this suggestion was generated, so it
                needs to be refreshed before use.
              </p>
            ) : null}
            {selectedAsset.nativeSuggestion.notes.length ? (
              <div className="ingestion-native-notes">
                {selectedAsset.nativeSuggestion.notes.map((note) => (
                  <p key={note} className="muted-text">
                    Note: {note}
                  </p>
                ))}
              </div>
            ) : null}
            <div className="block-item-actions">
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-full px-3"
                disabled={
                  !selectedBlock ||
                  selectedAsset.nativeSuggestion.status === "stale"
                }
                onClick={onApplyNativeSuggestion}
              >
                Apply To Selected Block
              </Button>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

export function AdminIngestionAssetToolPanel({
  assetToolDraft,
  assetToolPage,
  assetToolPreviewCropBox,
  selectedBlock,
  sourcePages,
  assetClassifications,
  onAssetToolCropPreviewChange,
  onAssetToolCropChange,
  onAssetToolClassificationChange,
  onAssetToolSourcePageChange,
  onSaveAssetToolDraft,
  onCancel,
}: {
  assetToolDraft: AssetToolDraft | null;
  assetToolPage: AdminIngestionToolSourcePage | null;
  assetToolPreviewCropBox: CropBox | null;
  selectedBlock: DraftBlock | null;
  sourcePages: AdminIngestionToolSourcePage[];
  assetClassifications: DraftAssetClassification[];
  onAssetToolCropPreviewChange: (cropBox: CropBox | null) => void;
  onAssetToolCropChange: (cropBox: CropBox) => void;
  onAssetToolClassificationChange: (
    classification: DraftAssetClassification,
  ) => void;
  onAssetToolSourcePageChange: (sourcePageId: string) => void;
  onSaveAssetToolDraft: () => void;
  onCancel: () => void;
}) {
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
              onPreviewChange={onAssetToolCropPreviewChange}
              onChange={onAssetToolCropChange}
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
              <h3>
                {assetToolDraft?.mode === "edit"
                  ? "Edit Linked Asset"
                  : "Create Linked Asset"}
              </h3>
              <p className="muted-text">
                Create the missing crop right here, link it to the current
                block, and keep editing without leaving the inspector.
              </p>
            </div>
          </div>

          {!assetToolDraft ? (
            <p className="muted-text">
              Open this panel from a block card to create or edit its linked
              asset.
            </p>
          ) : (
            <div className="admin-form-grid">
              <label className="field">
                <span>Target block</span>
                <Input
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
                <NativeSelect
                  value={assetToolDraft.classification}
                  onChange={(event) => {
                    onAssetToolClassificationChange(
                      event.target.value as DraftAssetClassification,
                    );
                  }}
                >
                  {assetClassifications.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </NativeSelect>
              </label>

              <label className="field admin-form-wide">
                <span>Source page</span>
                <NativeSelect
                  value={assetToolDraft.sourcePageId}
                  onChange={(event) => {
                    onAssetToolSourcePageChange(event.target.value);
                  }}
                >
                  {sourcePages.map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.documentKind} page {page.page_number}
                    </option>
                  ))}
                </NativeSelect>
              </label>

              <div className="block-item-actions admin-form-wide">
                <Button
                  type="button"
                  className="h-10 rounded-full px-5"
                  disabled={!assetToolPage}
                  onClick={onSaveAssetToolDraft}
                >
                  {assetToolDraft.mode === "edit"
                    ? "Save Asset"
                    : "Create Asset"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-full px-5"
                  onClick={onCancel}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
