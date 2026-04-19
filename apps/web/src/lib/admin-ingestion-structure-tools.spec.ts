import { describe, expect, it } from "vitest";
import {
  resolveActiveToolPanel,
  resolveActiveToolPanelBusy,
  resolveAssetToolPreviewState,
  resolveFallbackSnippetSourceState,
  resolveInitialSnippetSourceState,
  resolveSelectedAssetPreviewState,
  resolveSnippetToolState,
  shouldCloseActiveToolPanel,
  updateKeyedRecoveryState,
  type AdminIngestionStructureSourcePage,
} from "./admin-ingestion-structure-tools";

const sourcePages: AdminIngestionStructureSourcePage[] = [
  {
    id: "page-1",
    documentId: "doc-1",
    documentKind: "exam",
    page_number: 1,
    width: 1000,
    height: 1400,
    image_url: "https://example.com/page-1.jpg",
  },
  {
    id: "page-2",
    documentId: "doc-2",
    documentKind: "correction",
    page_number: 2,
    width: 800,
    height: 1200,
    image_url: "https://example.com/page-2.jpg",
  },
];

const sourcePageById = new Map(sourcePages.map((page) => [page.id, page]));

describe("admin ingestion structure tool helpers", () => {
  it("computes active tool panel busy state", () => {
    expect(
      resolveActiveToolPanelBusy({
        activeToolPanel: "snippet",
        snippetRecoveryMode: "text",
        recoveryMode: null,
      }),
    ).toBe(true);
    expect(
      resolveActiveToolPanelBusy({
        activeToolPanel: "native",
        snippetRecoveryMode: null,
        recoveryMode: "graph",
      }),
    ).toBe(true);
    expect(
      resolveActiveToolPanelBusy({
        activeToolPanel: "asset",
        snippetRecoveryMode: "text",
        recoveryMode: "graph",
      }),
    ).toBe(false);
  });

  it("resolves initial and fallback snippet source state", () => {
    expect(
      resolveInitialSnippetSourceState({
        selectedAssetSourcePageId: "page-2",
        sourcePages,
        sourcePageById,
      }),
    ).toEqual({
      sourcePageId: "page-2",
      cropBox: {
        x: 0,
        y: 0,
        width: 656,
        height: 216,
      },
    });
    expect(
      resolveInitialSnippetSourceState({
        selectedAssetSourcePageId: null,
        sourcePages: [],
        sourcePageById: new Map(),
      }),
    ).toEqual({
      sourcePageId: null,
      cropBox: null,
    });
    expect(
      resolveFallbackSnippetSourceState({
        snippetSourcePageId: "missing",
        sourcePages,
        sourcePageById,
      }),
    ).toEqual({
      sourcePageId: "page-1",
      cropBox: {
        x: 0,
        y: 0,
        width: 820,
        height: 252,
      },
    });
    expect(
      resolveFallbackSnippetSourceState({
        snippetSourcePageId: "page-1",
        sourcePages,
        sourcePageById,
      }),
    ).toBeNull();
  });

  it("closes active tool panels only when their required context disappears", () => {
    expect(
      shouldCloseActiveToolPanel({
        activeToolPanel: "snippet",
        hasSelectedBlock: false,
        hasSelectedAsset: false,
        hasAssetToolDraft: false,
      }),
    ).toBe(true);
    expect(
      shouldCloseActiveToolPanel({
        activeToolPanel: "native",
        hasSelectedBlock: true,
        hasSelectedAsset: false,
        hasAssetToolDraft: false,
      }),
    ).toBe(true);
    expect(
      shouldCloseActiveToolPanel({
        activeToolPanel: "asset",
        hasSelectedBlock: true,
        hasSelectedAsset: true,
        hasAssetToolDraft: true,
      }),
    ).toBe(false);
    expect(
      resolveActiveToolPanel({
        activeToolPanelState: "asset",
        hasSelectedBlock: true,
        hasSelectedAsset: true,
        hasAssetToolDraft: false,
      }),
    ).toBeNull();
  });

  it("resolves snippet, selected-asset, and asset-tool preview state", () => {
    expect(
      resolveSnippetToolState({
        selectedAssetSourcePageId: "page-2",
        snippetSourceState: {
          key: "other",
          sourcePageId: "page-1",
          cropBox: {
            x: 10,
            y: 10,
            width: 10,
            height: 10,
          },
        },
        snippetSourceKey: "snippet-1",
        liveSnippetCropPreviewState: {
          key: "page-2",
          cropBox: {
            x: 5,
            y: 5,
            width: 200,
            height: 100,
          },
        },
        sourcePages,
        sourcePageById,
      }),
    ).toEqual({
      snippetSourcePageId: "page-2",
      snippetSourcePage: sourcePages[1],
      snippetCropBox: {
        x: 0,
        y: 0,
        width: 656,
        height: 216,
      },
      previewSnippetCropBox: {
        x: 5,
        y: 5,
        width: 200,
        height: 100,
      },
    });

    expect(
      resolveSelectedAssetPreviewState({
        selectedAsset: {
          id: "asset-1",
          sourcePageId: "page-1",
          documentKind: "EXAM",
          pageNumber: 1,
          variantCode: "SUJET_1",
          role: "PROMPT",
          classification: "image",
          cropBox: {
            x: 0,
            y: 0,
            width: 100,
            height: 80,
          },
          label: null,
          notes: null,
          nativeSuggestion: null,
        },
        selectedAssetCropPreviewState: {
          key: "asset-1:page-1",
          cropBox: {
            x: 1,
            y: 2,
            width: 3,
            height: 4,
          },
        },
        sourcePageById,
      }),
    ).toEqual({
      selectedAssetKey: "asset-1:page-1",
      selectedAssetPage: sourcePages[0],
      previewCropBox: {
        x: 1,
        y: 2,
        width: 3,
        height: 4,
      },
    });

    expect(
      resolveAssetToolPreviewState({
        assetToolDraft: {
          mode: "edit",
          targetBlockId: "block-1",
          assetId: "asset-2",
          sourcePageId: "page-2",
          classification: "graph",
          role: "PROMPT",
          variantCode: "SUJET_1",
          cropBox: {
            x: 10,
            y: 20,
            width: 30,
            height: 40,
          },
        },
        assetToolCropPreviewState: {
          key: "asset-2:page-2",
          cropBox: {
            x: 11,
            y: 22,
            width: 33,
            height: 44,
          },
        },
        sourcePageById,
      }),
    ).toEqual({
      assetToolKey: "asset-2:page-2",
      assetToolPage: sourcePages[1],
      assetToolPreviewCropBox: {
        x: 11,
        y: 22,
        width: 33,
        height: 44,
      },
    });
  });

  it("updates keyed recovery state while preserving same-key context only", () => {
    expect(
      updateKeyedRecoveryState({
        current: {
          key: "block-1",
          mode: "graph",
          error: "old error",
          notice: "old notice",
          notes: ["old note"],
        },
        key: "block-1",
        patch: {
          error: "new error",
        },
      }),
    ).toEqual({
      key: "block-1",
      mode: "graph",
      error: "new error",
      notice: "old notice",
      notes: ["old note"],
    });

    expect(
      updateKeyedRecoveryState({
        current: {
          key: "block-1",
          mode: "graph",
          error: "old error",
          notice: "old notice",
          notes: ["old note"],
        },
        key: "block-2",
        patch: {
          notice: "fresh notice",
        },
      }),
    ).toEqual({
      key: "block-2",
      mode: null,
      error: null,
      notice: "fresh notice",
      notes: [],
    });
  });
});
