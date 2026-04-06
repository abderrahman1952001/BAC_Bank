'use client';

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from 'react';
import {
  IngestionCropEditor,
  IngestionCropPreview,
  type CropBox,
} from '@/components/ingestion-crop-editor';
import type { AdminIngestionDraft } from '@/lib/admin';

type SourcePageEntry = {
  id: string;
  documentId: string;
  documentKind: 'exam' | 'correction';
  page_number: number;
  width: number;
  height: number;
  image_url: string;
};

function makeAssetId() {
  return `asset-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function areCropBoxesEqual(left: CropBox, right: CropBox) {
  return (
    left.x === right.x &&
    left.y === right.y &&
    left.width === right.width &&
    left.height === right.height
  );
}

function finalizeEditedAsset(
  previous: AdminIngestionDraft['assets'][number],
  next: AdminIngestionDraft['assets'][number],
) {
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

export function AdminIngestionAssetWorkspace({
  draft,
  sourcePages,
  assetPreviewBaseUrl,
  focusedAssetId,
  focusedSourcePageId,
  onChange,
}: {
  draft: AdminIngestionDraft;
  sourcePages: SourcePageEntry[];
  assetPreviewBaseUrl: string;
  focusedAssetId: string | null;
  focusedSourcePageId: string | null;
  onChange: (nextDraft: AdminIngestionDraft) => void;
}) {
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [assetQuery, setAssetQuery] = useState('');
  const [liveCropBox, setLiveCropBox] = useState<CropBox | null>(null);
  const focusedSelectionId = useMemo(() => {
    if (
      focusedAssetId &&
      draft.assets.some((asset) => asset.id === focusedAssetId)
    ) {
      return focusedAssetId;
    }

    if (!focusedSourcePageId) {
      return null;
    }

    return (
      draft.assets.find((asset) => asset.sourcePageId === focusedSourcePageId)?.id ??
      null
    );
  }, [draft.assets, focusedAssetId, focusedSourcePageId]);

  const filteredAssets = useMemo(() => {
    const query = assetQuery.trim().toLowerCase();

    if (!query) {
      return draft.assets;
    }

    return draft.assets.filter((asset) => {
      const page =
        sourcePages.find((entry) => entry.id === asset.sourcePageId) ?? null;

      const searchText = [
        asset.label,
        asset.notes,
        asset.classification,
        asset.role,
        asset.variantCode,
        asset.pageNumber,
        page?.documentKind,
      ]
        .join(' ')
        .toLowerCase();

      return searchText.includes(query);
    });
  }, [assetQuery, draft.assets, sourcePages]);

  const effectiveSelectedAssetId =
    focusedSelectionId ??
    (selectedAssetId &&
    draft.assets.some((asset) => asset.id === selectedAssetId)
      ? selectedAssetId
      : null) ??
    draft.assets[0]?.id ??
    null;
  const selectedAsset =
    (effectiveSelectedAssetId
      ? draft.assets.find((asset) => asset.id === effectiveSelectedAssetId) ?? null
      : null) ?? draft.assets[0] ?? null;
  const selectedAssetPage = selectedAsset
    ? sourcePages.find((page) => page.id === selectedAsset.sourcePageId) ?? null
    : null;
  const previewCropBox = liveCropBox ?? selectedAsset?.cropBox ?? null;

  function updateAsset(
    assetId: string,
    mutator: (
      asset: AdminIngestionDraft['assets'][number],
    ) => AdminIngestionDraft['assets'][number],
  ) {
    onChange({
      ...draft,
      assets: draft.assets.map((asset) =>
        asset.id === assetId
          ? finalizeEditedAsset(asset, mutator(asset))
          : asset,
      ),
    });
  }

  function addAsset() {
    if (!sourcePages.length) {
      return;
    }

    const page = sourcePages[0];
    const nextAsset: AdminIngestionDraft['assets'][number] = {
      id: makeAssetId(),
      sourcePageId: page.id,
      documentKind: page.documentKind === 'correction' ? 'CORRECTION' : 'EXAM',
      pageNumber: page.page_number,
      variantCode: null,
      role: 'PROMPT',
      classification: 'image',
      cropBox: {
        x: 0,
        y: 0,
        width: Math.max(1, Math.floor(page.width / 2)),
        height: Math.max(1, Math.floor(page.height / 2)),
      },
      label: null,
      notes: null,
      nativeSuggestion: null,
    };

    onChange({
      ...draft,
      assets: [...draft.assets, nextAsset],
    });
    setSelectedAssetId(nextAsset.id);
    setLiveCropBox(null);
  }

  function removeSelectedAsset() {
    if (!selectedAsset) {
      return;
    }

    if (!window.confirm('Remove this reviewed asset?')) {
      return;
    }

    const nextAssets = draft.assets.filter((asset) => asset.id !== selectedAsset.id);

    onChange({
      ...draft,
      assets: nextAssets,
    });
    setSelectedAssetId(nextAssets[0]?.id ?? null);
    setLiveCropBox(null);
  }

  return (
    <section className="admin-context-card">
      <div className="admin-page-head ingestion-section-head">
        <div className="admin-page-intro">
          <h2>Asset Review</h2>
          <div className="admin-page-meta-row">
            <span className="admin-page-meta-pill">
              <strong>{draft.assets.length}</strong> assets
            </span>
          </div>
        </div>
        <div className="block-item-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={addAsset}
            disabled={!sourcePages.length}
          >
            Add Asset
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={removeSelectedAsset}
            disabled={!selectedAsset}
          >
            Remove Asset
          </button>
        </div>
      </div>

      <section className="ingestion-asset-workspace">
        <aside className="admin-editor-panel ingestion-asset-rail">
          <div className="admin-page-head ingestion-side-head">
            <div>
              <h3>Reviewed Assets</h3>
              <p className="muted-text">{draft.assets.length} total assets</p>
            </div>
          </div>

          <label className="field">
            <span>Find asset</span>
            <input
              type="search"
              placeholder="Search classification, role, page…"
              value={assetQuery}
              onChange={(event) => setAssetQuery(event.target.value)}
            />
          </label>

          <div className="ingestion-asset-rail-list">
            {filteredAssets.length ? (
              filteredAssets.map((asset, index) => {
                const page =
                  sourcePages.find((entry) => entry.id === asset.sourcePageId) ?? null;

                return (
                  <button
                    key={asset.id}
                    type="button"
                    id={`asset-library-${asset.id}`}
                    className={
                      selectedAsset?.id === asset.id
                        ? 'ingestion-asset-rail-card active'
                        : 'ingestion-asset-rail-card'
                    }
                    onClick={() => {
                      setSelectedAssetId(asset.id);
                      setLiveCropBox(null);
                    }}
                  >
                    <strong>{asset.label ?? `Asset ${index + 1}`}</strong>
                    <span>
                      {asset.classification} · {asset.role}
                    </span>
                    {asset.nativeSuggestion ? (
                      <span>
                        native {asset.nativeSuggestion.type} ·{' '}
                        {asset.nativeSuggestion.status}
                      </span>
                    ) : null}
                    <span>
                      {page ? `${page.documentKind} page ${page.page_number}` : 'Missing page'}
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="muted-text">No assets match the current search.</p>
            )}
          </div>
        </aside>

        <article className="admin-editor-panel ingestion-asset-stage-panel">
          <div className="admin-page-head ingestion-side-head">
            <div>
              <h3>Crop Stage</h3>
              <p className="muted-text">
                Draw directly on the source page. The live preview updates while
                dragging and the draft updates on release.
              </p>
            </div>
            {selectedAssetPage ? (
              <div className="block-item-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    if (!selectedAsset) {
                      return;
                    }

                    setLiveCropBox(null);
                    updateAsset(selectedAsset.id, (asset) => ({
                      ...asset,
                      cropBox: {
                        x: 0,
                        y: 0,
                        width: selectedAssetPage.width,
                        height: selectedAssetPage.height,
                      },
                    }));
                  }}
                >
                  Use Full Page
                </button>
              </div>
            ) : null}
          </div>

          {selectedAsset && selectedAssetPage ? (
            <IngestionCropEditor
              imageUrl={selectedAssetPage.image_url}
              alt={selectedAsset.label ?? selectedAsset.id}
              naturalWidth={selectedAssetPage.width}
              naturalHeight={selectedAssetPage.height}
              cropBox={selectedAsset.cropBox}
              onPreviewChange={setLiveCropBox}
              onChange={(nextCropBox) => {
                setLiveCropBox(null);
                updateAsset(selectedAsset.id, (asset) => ({
                  ...asset,
                  cropBox: nextCropBox,
                }));
              }}
            />
          ) : (
            <p className="muted-text">
              Select an asset to review its crop and source page.
            </p>
          )}
        </article>

        <article className="admin-editor-panel ingestion-asset-inspector-panel">
          <div className="admin-page-head ingestion-side-head">
            <div>
              <h3>Inspector</h3>
              <p className="muted-text">
                Adjust page assignment, metadata, and exact crop values.
              </p>
            </div>
          </div>

          {!selectedAsset ? (
            <p className="muted-text">Select an asset from the rail to inspect it.</p>
          ) : (
            <div className="admin-form-grid">
              <label className="field">
                <span>Source page</span>
                <select
                  value={selectedAsset.sourcePageId}
                  onChange={(event) => {
                    const nextPage =
                      sourcePages.find((page) => page.id === event.target.value) ?? null;

                    setLiveCropBox(null);
                    updateAsset(selectedAsset.id, (asset) => ({
                      ...asset,
                      sourcePageId: event.target.value,
                      documentKind:
                        nextPage?.documentKind === 'correction'
                          ? 'CORRECTION'
                          : 'EXAM',
                      pageNumber: nextPage?.page_number ?? asset.pageNumber,
                    }));
                  }}
                >
                  {sourcePages.map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.documentKind} page {page.page_number}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Variant</span>
                <select
                  value={selectedAsset.variantCode ?? ''}
                  onChange={(event) => {
                    updateAsset(selectedAsset.id, (asset) => ({
                      ...asset,
                      variantCode:
                        event.target.value === ''
                          ? null
                          : (event.target.value as 'SUJET_1' | 'SUJET_2'),
                    }));
                  }}
                >
                  <option value="">Unassigned</option>
                  <option value="SUJET_1">Sujet 1</option>
                  <option value="SUJET_2">Sujet 2</option>
                </select>
              </label>

              <label className="field">
                <span>Role</span>
                <select
                  value={selectedAsset.role}
                  onChange={(event) => {
                    updateAsset(selectedAsset.id, (asset) => ({
                      ...asset,
                      role: event.target.value as
                        | 'PROMPT'
                        | 'SOLUTION'
                        | 'HINT'
                        | 'META',
                    }));
                  }}
                >
                  <option value="PROMPT">Prompt</option>
                  <option value="SOLUTION">Solution</option>
                  <option value="HINT">Hint</option>
                  <option value="META">Meta</option>
                </select>
              </label>

              <label className="field">
                <span>Classification</span>
                <select
                  value={selectedAsset.classification}
                  onChange={(event) => {
                    updateAsset(selectedAsset.id, (asset) => ({
                      ...asset,
                      classification: event.target.value as
                        | 'image'
                        | 'table'
                        | 'tree'
                        | 'graph',
                    }));
                  }}
                >
                  <option value="image">Image</option>
                  <option value="table">Table</option>
                  <option value="tree">Tree</option>
                  <option value="graph">Graph</option>
                </select>
              </label>

              {(['x', 'y', 'width', 'height'] as const).map((field) => (
                <label key={field} className="field">
                  <span>{field}</span>
                  <input
                    type="number"
                    value={selectedAsset.cropBox[field]}
                    onChange={(event) => {
                      const nextValue = Number.parseInt(event.target.value, 10);

                      updateAsset(selectedAsset.id, (asset) => ({
                        ...asset,
                        cropBox: {
                          ...asset.cropBox,
                          [field]: Number.isFinite(nextValue)
                            ? Math.max(0, nextValue)
                            : asset.cropBox[field],
                        },
                      }));
                    }}
                  />
                </label>
              ))}

              {selectedAssetPage && previewCropBox ? (
                <figure className="ingestion-preview-card admin-form-wide">
                  <IngestionCropPreview
                    imageUrl={selectedAssetPage.image_url}
                    alt={selectedAsset.label ?? selectedAsset.id}
                    naturalWidth={selectedAssetPage.width}
                    naturalHeight={selectedAssetPage.height}
                    cropBox={previewCropBox}
                  />
                  <figcaption>Live crop preview</figcaption>
                </figure>
              ) : (
                <figure className="ingestion-preview-card admin-form-wide">
                  <img
                    src={`${assetPreviewBaseUrl}/${selectedAsset.id}/preview`}
                    alt={selectedAsset.label ?? selectedAsset.id}
                  />
                  <figcaption>Saved crop preview</figcaption>
                </figure>
              )}
            </div>
          )}
        </article>
      </section>
    </section>
  );
}
