import { describe, expect, it } from "vitest";
import type { AdminIngestionDraft } from "@/lib/admin";
import {
  applyNativeSuggestionToDraftBlock,
  buildAssetToolDraft,
  buildDraftBlockPreset,
  buildPreviewBlocks,
  createDraftBlock,
  createDraftNode,
  finalizeEditedAsset,
  formatRows,
  moveDraftNode,
  normalizeVariantNodes,
  parseRows,
  patchDraftBlock,
  reparentDraftNode,
  readDraftSelectedStreamCodes,
  removeDraftNodeTree,
  saveAssetToolDraftChanges,
  sanitizeLegacyReviewDraft,
  updateDraftAsset,
  updateDraftBlockData,
  updateDraftVariantNodes,
  withRowsData,
} from "./admin-ingestion-structure";

function createDraft(): AdminIngestionDraft {
  return {
    schema: "bac_ingestion_draft/v1",
    exam: {
      year: 2025,
      streamCode: "SE",
      subjectCode: "MATH",
      sessionType: "NORMAL",
      provider: "manual",
      title: "Mathematics",
      minYear: 2020,
      sourceListingUrl: null,
      sourceExamPageUrl: null,
      sourceCorrectionPageUrl: null,
      examDocumentId: "doc-exam",
      correctionDocumentId: null,
      examDocumentStorageKey: "exam.pdf",
      correctionDocumentStorageKey: null,
      metadata: {},
    },
    sourcePages: [
      {
        id: "page-1",
        documentId: "doc-exam",
        documentKind: "EXAM",
        pageNumber: 1,
        width: 1200,
        height: 1800,
      },
    ],
    assets: [
      {
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
          width: 400,
          height: 300,
        },
        label: "Diagram",
        notes: null,
        nativeSuggestion: null,
      },
    ],
    variants: [
      {
        code: "SUJET_1",
        title: "Sujet 1",
        nodes: [
          {
            id: "exercise-1",
            nodeType: "EXERCISE",
            parentId: null,
            orderIndex: 2,
            label: "Exercise 1",
            maxPoints: 5,
            topicCodes: ["ALG"],
            blocks: [
              {
                id: "block-1",
                role: "PROMPT",
                type: "graph",
                value: "Plot the graph",
                data: null,
              },
            ],
          },
          {
            id: "exercise-0",
            nodeType: "EXERCISE",
            parentId: null,
            orderIndex: 1,
            label: "Exercise 0",
            maxPoints: 4,
            topicCodes: [],
            blocks: [],
          },
          {
            id: "question-1",
            nodeType: "QUESTION",
            parentId: "exercise-1",
            orderIndex: 7,
            label: "Q1",
            maxPoints: 2,
            topicCodes: [],
            blocks: [
              {
                id: "block-2",
                role: "PROMPT",
                type: "image",
                value: "",
                assetId: "asset-1",
                data: null,
              },
              {
                id: "block-3",
                role: "META",
                type: "table",
                value: "",
                data: {
                  rows: [
                    ["a", "b"],
                    ["1", "2"],
                  ],
                },
              },
            ],
          },
        ],
      },
    ],
  };
}

describe("admin ingestion structure helpers", () => {
  it("reads selected stream codes from the exam and metadata without duplicates", () => {
    const draft = createDraft();
    draft.exam.streamCode = " se ";
    draft.exam.metadata = {
      sharedStreamCodes: ["tm", "SE", " ", 99],
    };

    expect(readDraftSelectedStreamCodes(draft.exam)).toEqual(["SE", "TM"]);
  });

  it("formats, parses, and preserves row data through the textarea helpers", () => {
    const rows = parseRows(" a | b \n\n 1 | 2 ");

    expect(rows).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
    expect(formatRows({ rows })).toBe("a | b\n1 | 2");
    expect(withRowsData({ note: "keep" }, rows)).toEqual({
      note: "keep",
      rows,
    });
    expect(withRowsData({ rows, note: "keep" }, [])).toEqual({
      note: "keep",
    });
  });

  it("sanitizes legacy review drafts without disturbing modern fields", () => {
    const draft = createDraft();
    const legacyDraft = {
      ...draft,
      assets: draft.assets.map((asset) => ({
        ...asset,
        caption: "old asset caption",
      })),
      variants: draft.variants.map((variant) => ({
        ...variant,
        nodes: variant.nodes.map((node, index) => ({
          ...node,
          ...(index === 0
            ? {
                label: null,
                title: "Legacy exercise",
              }
            : {}),
          blocks: node.blocks.map((block) => ({
            ...block,
            meta: {
              ...(block.meta ?? {}),
              caption: "legacy caption",
            },
          })),
        })),
      })),
    } as unknown as AdminIngestionDraft;

    const sanitized = sanitizeLegacyReviewDraft(legacyDraft);

    expect("caption" in (sanitized.assets[0] as Record<string, unknown>)).toBe(
      false,
    );
    expect(
      "title" in
        (sanitized.variants[0]?.nodes[0] as unknown as Record<string, unknown>),
    ).toBe(false);
    expect(sanitized.variants[0]?.nodes[0]?.label).toBe("Legacy exercise");
    expect(sanitized.variants[0]?.nodes[0]?.blocks[0]?.meta).toBeUndefined();
  });

  it("normalizes node order indexes within each parent bucket", () => {
    const draft = createDraft();

    expect(normalizeVariantNodes(draft.variants[0]!.nodes)).toEqual([
      expect.objectContaining({ id: "exercise-1", orderIndex: 2 }),
      expect.objectContaining({ id: "exercise-0", orderIndex: 1 }),
      expect.objectContaining({ id: "question-1", orderIndex: 1 }),
    ]);
  });

  it("updates draft node structure through the extracted mutation helpers", () => {
    const draft = createDraft();
    const nextDraft = updateDraftVariantNodes(draft, "SUJET_1", (nodes) => {
      const withInsertedNode = [
        ...nodes,
        createDraftNode("question-2", nodes[0] ?? null, 1),
      ];

      return moveDraftNode(withInsertedNode, "exercise-1", -1);
    });

    expect(
      nextDraft.variants[0]?.nodes.find((node) => node.id === "question-2"),
    ).toEqual(
      expect.objectContaining({
        parentId: "exercise-1",
        nodeType: "QUESTION",
        orderIndex: 1,
        label: "Question 2",
      }),
    );
    expect(
      nextDraft.variants[0]?.nodes.find((node) => node.id === "exercise-1"),
    ).toEqual(expect.objectContaining({ orderIndex: 1 }));
    expect(
      nextDraft.variants[0]?.nodes.find((node) => node.id === "exercise-0"),
    ).toEqual(expect.objectContaining({ orderIndex: 2 }));
  });

  it("can reparent and remove node subtrees without leaking descendants", () => {
    const draft = createDraft();
    const reparsedNodes = reparentDraftNode(
      draft.variants[0]!.nodes,
      "question-1",
      null,
    );
    const reparented = normalizeVariantNodes(reparsedNodes);

    expect(reparented.find((node) => node.id === "question-1")).toEqual(
      expect.objectContaining({
        parentId: null,
        nodeType: "EXERCISE",
      }),
    );
    expect(
      removeDraftNodeTree(draft.variants[0]!.nodes, "exercise-1").map(
        (node) => node.id,
      ),
    ).toEqual(["exercise-0"]);
  });

  it("creates and updates blocks through the extracted block helpers", () => {
    const createdBlock = createDraftBlock("block-new");
    const presetBlock = patchDraftBlock(
      [createdBlock],
      createdBlock.id,
      buildDraftBlockPreset("formula_graph"),
    );
    const finalBlocks = updateDraftBlockData(presetBlock, createdBlock.id, {
      kind: "formula_graph",
      formulaGraph: {
        title: "Updated graph",
      },
    });

    expect(finalBlocks[0]).toEqual({
      id: "block-new",
      role: "PROMPT",
      type: "graph",
      value: "",
      assetId: null,
      data: {
        kind: "formula_graph",
        formulaGraph: {
          title: "Updated graph",
        },
      },
    });
  });

  it("builds and saves asset tool drafts through the extracted asset helpers", () => {
    const draft = createDraft();
    const sourcePages = [
      {
        id: "page-1",
        documentKind: "exam" as const,
        page_number: 1,
        width: 1200,
        height: 1800,
      },
    ];
    const sourcePageById = new Map(sourcePages.map((page) => [page.id, page]));
    const block = draft.variants[0]!.nodes[0]!.blocks[0]!;
    const assetById = new Map(draft.assets.map((asset) => [asset.id, asset]));

    const assetToolDraft = buildAssetToolDraft({
      block,
      mode: "create",
      assetById,
      selectedVariantCode: "SUJET_2",
      sourcePages,
      sourcePageById,
    });

    expect(assetToolDraft).toEqual({
      mode: "create",
      targetBlockId: "block-1",
      assetId: null,
      sourcePageId: "page-1",
      classification: "graph",
      role: "PROMPT",
      variantCode: "SUJET_2",
      cropBox: {
        x: 0,
        y: 0,
        width: 600,
        height: 900,
      },
    });

    const saved = saveAssetToolDraftChanges({
      draft,
      assetToolDraft: assetToolDraft!,
      assetToolPage: sourcePages[0]!,
      assetById,
      nextAssetId: "asset-new",
    });

    expect(saved).toEqual({
      assetId: "asset-new",
      draft: expect.objectContaining({
        assets: expect.arrayContaining([
          expect.objectContaining({
            id: "asset-new",
            classification: "graph",
            variantCode: "SUJET_2",
          }),
        ]),
      }),
    });
    expect(saved?.draft.variants[0]?.nodes[0]?.blocks[0]?.assetId).toBe(
      "asset-new",
    );
  });

  it("updates assets and applies native suggestions through the extracted asset helpers", () => {
    const draft = createDraft();
    const withSuggestion = updateDraftAsset(draft, "asset-1", {
      classification: "graph",
      nativeSuggestion: {
        type: "graph",
        value: "y=x",
        data: {
          kind: "formula_graph",
        },
        status: "suggested",
        source: "codex_app_extraction",
        notes: ["Imported native suggestion"],
      },
    });
    const updatedDraft = updateDraftAsset(withSuggestion, "asset-1", {
      cropBox: {
        x: 10,
        y: 0,
        width: 400,
        height: 300,
      },
    });
    const updatedAsset = updatedDraft.assets[0]!;

    expect(updatedAsset.nativeSuggestion?.status).toBe("stale");

    const appliedDraft = applyNativeSuggestionToDraftBlock({
      draft: updatedDraft,
      variantCode: "SUJET_1",
      nodeId: "question-1",
      blockId: "block-2",
      asset: {
        ...updatedAsset,
        nativeSuggestion: {
          ...updatedAsset.nativeSuggestion!,
          status: "suggested",
        },
      },
    });

    expect(
      appliedDraft.variants[0]?.nodes[2]?.blocks.find(
        (block) => block.id === "block-2",
      ),
    ).toEqual(
      expect.objectContaining({
        type: "graph",
        value: "y=x",
        data: {
          kind: "formula_graph",
        },
        assetId: "asset-1",
      }),
    );
  });

  it("builds preview blocks with inferred media metadata and asset previews", () => {
    const draft = createDraft();
    const exercise = draft.variants[0]!.nodes[0]!;
    const question = draft.variants[0]!.nodes[2]!;
    const assetById = new Map(draft.assets.map((asset) => [asset.id, asset]));

    const previewBlocks = buildPreviewBlocks(
      [...exercise.blocks, ...question.blocks],
      assetById,
      "/api/admin/assets",
    );

    expect(previewBlocks).toEqual([
      expect.objectContaining({
        id: "block-1",
        blockType: "GRAPH",
        data: { kind: "formula_graph" },
        media: null,
      }),
      expect.objectContaining({
        id: "block-2",
        blockType: "IMAGE",
        media: {
          id: "asset-1",
          url: "/api/admin/assets/asset-1/preview",
          type: "IMAGE",
          metadata: {
            label: "Diagram",
            classification: "image",
          },
        },
      }),
      expect.objectContaining({
        id: "block-3",
        blockType: "TABLE",
        data: {
          rows: [
            ["a", "b"],
            ["1", "2"],
          ],
        },
      }),
    ]);
  });

  it("marks native suggestions stale when the underlying crop changes", () => {
    const previous = {
      ...createDraft().assets[0]!,
      classification: "graph" as const,
      nativeSuggestion: {
        type: "graph" as const,
        value: "y=x^2",
        data: null,
        status: "suggested" as const,
        source: "codex_app_extraction" as const,
        notes: [],
      },
    };

    const next = finalizeEditedAsset(previous, {
      ...previous,
      cropBox: {
        ...previous.cropBox,
        width: previous.cropBox.width + 10,
      },
    });

    expect(next.nativeSuggestion?.status).toBe("stale");
  });
});
