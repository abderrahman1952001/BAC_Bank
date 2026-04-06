"use client";

/* eslint-disable @next/next/no-img-element */

import { type ReactNode } from "react";
import {
  IngestionCropEditor,
  IngestionCropPreview,
  type CropBox,
} from "@/components/ingestion-crop-editor";
import type {
  AdminIngestionRecoveryMode,
  DraftAssetClassification,
} from "@/lib/admin";
import {
  formatNativeSuggestionSource,
  formatNativeSuggestionStatus,
  type AssetToolDraft,
  type AssetToolPage,
  type DraftAsset,
  type DraftBlock,
  type SnippetRecoveryAction,
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
  mode: "snippet" | "native" | "asset";
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
              {mode === "snippet"
                ? "Text Repair"
                : mode === "native"
                  ? "Native Rendering"
                  : "Asset Builder"}
            </p>
            <h2>{title}</h2>
            {description ? <p className="muted-text">{description}</p> : null}
          </div>

          <div className="block-item-actions">
            <button
              type="button"
              className="btn-secondary"
              disabled={disabled}
              onClick={onClose}
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

export function AdminIngestionSnippetToolPanel({
  selectedBlock,
  snippetSourcePage,
  previewSnippetCropBox,
  snippetCropBox,
  snippetAction,
  snippetSourcePageId,
  sourcePages,
  snippetRecoveryMode,
  snippetRecoveryError,
  snippetRecoveryNotice,
  snippetRecoveryNotes,
  onSnippetActionChange,
  onSnippetSourcePageChange,
  onSnippetCropPreviewChange,
  onSnippetCropChange,
  onRecoverSnippet,
}: {
  selectedBlock: DraftBlock | null;
  snippetSourcePage: AdminIngestionToolSourcePage | null;
  previewSnippetCropBox: CropBox | null;
  snippetCropBox: CropBox | null;
  snippetAction: SnippetRecoveryAction;
  snippetSourcePageId: string | null;
  sourcePages: AdminIngestionToolSourcePage[];
  snippetRecoveryMode: AdminIngestionRecoveryMode | null;
  snippetRecoveryError: string | null;
  snippetRecoveryNotice: string | null;
  snippetRecoveryNotes: string[];
  onSnippetActionChange: (action: SnippetRecoveryAction) => void;
  onSnippetSourcePageChange: (sourcePageId: string) => void;
  onSnippetCropPreviewChange: (cropBox: CropBox | null) => void;
  onSnippetCropChange: (cropBox: CropBox) => void;
  onRecoverSnippet: () => void;
}) {
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
              onPreviewChange={onSnippetCropPreviewChange}
              onChange={onSnippetCropChange}
            />
          </article>
        ) : (
          <section className="admin-context-card">
            <p className="muted-text">
              Select a source page to start cropping the missed text or
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
                    onSnippetActionChange(
                      event.target.value as SnippetRecoveryAction,
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
                  value={snippetSourcePageId ?? ""}
                  onChange={(event) => {
                    onSnippetSourcePageChange(event.target.value);
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
                !selectedBlock || !snippetCropBox || snippetRecoveryMode !== null
              }
              onClick={onRecoverSnippet}
            >
              {snippetRecoveryMode !== null ? "Recovering…" : "Recover Text"}
            </button>
          </div>
          <p className="muted-text">
            This is for OCR mistakes, missed lines, and formulas only. The
            cropped snippet is temporary and does not create a permanent asset.
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

export function AdminIngestionNativeToolPanel({
  selectedAssetPage,
  selectedAsset,
  selectedBlock,
  previewCropBox,
  assetPreviewBaseUrl,
  assetClassifications,
  sourcePages,
  recoveryMode,
  recoveryError,
  recoveryNotice,
  recoveryNotes,
  onSelectedAssetCropPreviewChange,
  onSelectedAssetCropChange,
  onSelectedAssetClassificationChange,
  onSelectedAssetSourcePageChange,
  onApplyNativeSuggestion,
  onRecoverIntoSelectedBlock,
}: {
  selectedAssetPage: AdminIngestionToolSourcePage | null;
  selectedAsset: DraftAsset | null;
  selectedBlock: DraftBlock | null;
  previewCropBox: CropBox | null;
  assetPreviewBaseUrl: string;
  assetClassifications: DraftAssetClassification[];
  sourcePages: AdminIngestionToolSourcePage[];
  recoveryMode: AdminIngestionRecoveryMode | null;
  recoveryError: string | null;
  recoveryNotice: string | null;
  recoveryNotes: string[];
  onSelectedAssetCropPreviewChange: (cropBox: CropBox | null) => void;
  onSelectedAssetCropChange: (cropBox: CropBox) => void;
  onSelectedAssetClassificationChange: (
    classification: DraftAssetClassification,
  ) => void;
  onSelectedAssetSourcePageChange: (sourcePageId: string) => void;
  onApplyNativeSuggestion: () => void;
  onRecoverIntoSelectedBlock: (mode: "table" | "tree" | "graph") => void;
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
                      : "No target block selected"
                  }
                  readOnly
                />
              </label>

              <label className="field">
                <span>Classification</span>
                <select
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
                </select>
              </label>

              <label className="field admin-form-wide">
                <span>Source page</span>
                <select
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
                </select>
              </label>
            </div>
          )}
        </section>

        {selectedAsset?.nativeSuggestion ? (
          <section className="admin-context-card ingestion-native-suggestion-card">
            <h3>Stored Native Suggestion</h3>
            <p className="muted-text">
              {formatNativeSuggestionSource(selectedAsset.nativeSuggestion.source)}{" "}
              ·{" "}
              {formatNativeSuggestionStatus(selectedAsset.nativeSuggestion.status)}
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
                  selectedAsset.nativeSuggestion.status === "stale"
                }
                onClick={onApplyNativeSuggestion}
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
                onRecoverIntoSelectedBlock("table");
              }}
            >
              {recoveryMode === "table" ? "Recovering…" : "Recover Table"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={!selectedAsset || !selectedBlock || recoveryMode !== null}
              onClick={() => {
                onRecoverIntoSelectedBlock("tree");
              }}
            >
              {recoveryMode === "tree" ? "Recovering…" : "Recover Tree"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={!selectedAsset || !selectedBlock || recoveryMode !== null}
              onClick={() => {
                onRecoverIntoSelectedBlock("graph");
              }}
            >
              {recoveryMode === "graph" ? "Recovering…" : "Recover Graph"}
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
                </select>
              </label>

              <label className="field admin-form-wide">
                <span>Source page</span>
                <select
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
                </select>
              </label>

              <div className="block-item-actions admin-form-wide">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!assetToolPage}
                  onClick={onSaveAssetToolDraft}
                >
                  {assetToolDraft.mode === "edit" ? "Save Asset" : "Create Asset"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onCancel}
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
