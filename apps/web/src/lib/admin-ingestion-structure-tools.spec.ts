import { describe, expect, it } from "vitest";
import {
  resolveActiveToolPanelBusy,
  resolveFallbackSnippetSourceState,
  resolveInitialSnippetSourceState,
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
  });
});
