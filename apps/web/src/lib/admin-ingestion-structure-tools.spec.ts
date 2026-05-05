import { describe, expect, it } from "vitest";
import {
  resolveActiveToolPanel,
  resolveActiveToolPanelBusy,
  resolveAssetToolPreviewState,
  resolveSelectedAssetPreviewState,
  shouldCloseActiveToolPanel,
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
  it("keeps tool panels non-busy after model recovery removal", () => {
    expect(resolveActiveToolPanelBusy()).toBe(false);
  });

  it("closes active tool panels only when their required context disappears", () => {
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

  it("resolves selected-asset and asset-tool preview state", () => {
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
});
