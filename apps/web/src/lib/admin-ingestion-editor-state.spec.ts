import { describe, expect, it } from "vitest";
import type {
  AdminFiltersResponse,
  AdminIngestionDraft,
  AdminIngestionValidationIssue,
} from "@/lib/admin";
import {
  buildAssetReferenceById,
  buildBlockReferenceById,
  buildIssueCountById,
  buildNodeReferenceById,
  buildSelectedNodePath,
  filterAvailableTopics,
  resolveFocusRequestTargets,
  resolveFocusScrollTargetId,
  resolveSelectedBlockId,
  resolveSelectedNodeId,
  resolveSelectedVariantCode,
  toggleCollapsedNodeIds,
} from "./admin-ingestion-editor-state";

function createDraft(): AdminIngestionDraft {
  return {
    schema: "1",
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
    sourcePages: [],
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
          width: 100,
          height: 120,
        },
        label: "Figure 1",
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
            orderIndex: 1,
            label: "Exercise 1",
            maxPoints: 5,
            topicCodes: ["ALG"],
            blocks: [
              {
                id: "block-1",
                role: "PROMPT",
                type: "image",
                value: "",
                assetId: "asset-1",
                data: null,
              },
            ],
          },
          {
            id: "question-1",
            nodeType: "QUESTION",
            parentId: "exercise-1",
            orderIndex: 1,
            label: "Q1",
            maxPoints: 2,
            topicCodes: [],
            blocks: [
              {
                id: "block-2",
                role: "PROMPT",
                type: "paragraph",
                value: "Solve",
                data: null,
              },
            ],
          },
        ],
      },
      {
        code: "SUJET_2",
        title: "Sujet 2",
        nodes: [],
      },
    ],
  };
}

const filters: AdminFiltersResponse = {
  subjects: [
    {
      code: "MATH",
      name: "Mathematics",
    },
  ],
  streams: [
    {
      code: "SE",
      name: "Sciences experimentales",
    },
    {
      code: "TM",
      name: "Techniques mathematiques",
    },
  ],
  years: [2025],
  topics: [
    {
      code: "ALG",
      name: "Algebra",
      parentCode: null,
      displayOrder: 1,
      isSelectable: true,
      subject: {
        code: "MATH",
        name: "Mathematics",
      },
      streamCodes: ["SE"],
    },
    {
      code: "FUNC",
      name: "Functions",
      parentCode: null,
      displayOrder: 2,
      isSelectable: true,
      subject: {
        code: "MATH",
        name: "Mathematics",
      },
      streamCodes: ["TM"],
    },
  ],
};

const issues: AdminIngestionValidationIssue[] = [
  {
    id: "issue-1",
    severity: "error",
    code: "missing-node",
    target: "node",
    message: "Missing node",
    variantCode: "SUJET_1",
    nodeId: "exercise-1",
    blockId: null,
    assetId: null,
    sourcePageId: null,
    pageNumber: null,
    field: null,
  },
  {
    id: "issue-2",
    severity: "warning",
    code: "missing-block",
    target: "block",
    message: "Missing block",
    variantCode: "SUJET_1",
    nodeId: null,
    blockId: "block-1",
    assetId: "asset-1",
    sourcePageId: null,
    pageNumber: null,
    field: null,
  },
];

describe("admin ingestion editor state helpers", () => {
  it("builds block, node, and asset references for focus resolution", () => {
    const draft = createDraft();
    const assetById = new Map(draft.assets.map((asset) => [asset.id, asset]));
    const blockReferenceById = buildBlockReferenceById(draft);
    const nodeReferenceById = buildNodeReferenceById(draft);
    const assetReferenceById = buildAssetReferenceById({
      draft,
      assetById,
      blockReferenceById,
    });

    expect(blockReferenceById.get("block-1")).toEqual({
      variantCode: "SUJET_1",
      nodeId: "exercise-1",
      blockId: "block-1",
      assetId: "asset-1",
    });
    expect(nodeReferenceById.get("question-1")).toEqual({
      variantCode: "SUJET_1",
      nodeId: "question-1",
    });
    expect(assetReferenceById.get("asset-1")).toEqual({
      variantCode: "SUJET_1",
      nodeId: "exercise-1",
      blockId: "block-1",
      assetId: "asset-1",
      sourcePageId: "page-1",
    });
  });

  it("counts issues by target id", () => {
    expect(buildIssueCountById(issues, "nodeId")).toEqual(
      new Map([["exercise-1", 1]]),
    );
    expect(buildIssueCountById(issues, "blockId")).toEqual(
      new Map([["block-1", 1]]),
    );
    expect(buildIssueCountById(issues, "assetId")).toEqual(
      new Map([["asset-1", 1]]),
    );
  });

  it("builds the selected node path from parent links", () => {
    const draft = createDraft();
    const nodes = draft.variants[0]!.nodes;
    const nodeById = new Map(nodes.map((node) => [node.id, node]));

    expect(buildSelectedNodePath(nodeById, nodes[1]!)).toEqual([
      nodes[0],
      nodes[1],
    ]);
  });

  it("filters topics by subject and selected stream codes", () => {
    expect(
      filterAvailableTopics({
        filters,
        subjectCode: "MATH",
        selectedStreamCodes: ["SE"],
      }).map((topic) => topic.code),
    ).toEqual(["ALG"]);
    expect(
      filterAvailableTopics({
        filters,
        subjectCode: "MATH",
        selectedStreamCodes: [],
      }).map((topic) => topic.code),
    ).toEqual(["ALG", "FUNC"]);
  });

  it("resolves the right scroll target for focus requests", () => {
    expect(
      resolveFocusScrollTargetId({
        focusRequest: {
          issueId: "issue-1",
          variantCode: null,
          nodeId: null,
          blockId: null,
          assetId: "asset-1",
          sourcePageId: null,
        },
        targets: {
          nextVariantCode: "SUJET_1",
          nextNodeId: "exercise-1",
          nextBlockId: "block-1",
          nextAssetId: "asset-1",
        },
      }),
    ).toBe("inspector-block-block-1");
    expect(
      resolveFocusScrollTargetId({
        focusRequest: {
          issueId: "issue-2",
          variantCode: null,
          nodeId: null,
          blockId: "block-1",
          assetId: null,
          sourcePageId: null,
        },
        targets: {
          nextVariantCode: "SUJET_1",
          nextNodeId: "exercise-1",
          nextBlockId: "block-1",
          nextAssetId: null,
        },
      }),
    ).toBe("preview-block-block-1");
    expect(
      resolveFocusScrollTargetId({
        focusRequest: {
          issueId: "issue-3",
          variantCode: null,
          nodeId: "question-1",
          blockId: null,
          assetId: null,
          sourcePageId: null,
        },
        targets: {
          nextVariantCode: "SUJET_1",
          nextNodeId: "question-1",
          nextBlockId: null,
          nextAssetId: null,
        },
      }),
    ).toBe("tree-node-question-1");
  });

  it("toggles collapsed node membership without mutating the input set", () => {
    const original = new Set(["node-1"]);
    const expanded = toggleCollapsedNodeIds(original, "node-1");
    const collapsed = toggleCollapsedNodeIds(expanded, "node-2");

    expect([...original]).toEqual(["node-1"]);
    expect([...expanded]).toEqual([]);
    expect([...collapsed]).toEqual(["node-2"]);
  });

  it("repairs invalid selected variant, node, and block ids", () => {
    const draft = createDraft();
    const activeVariant =
      draft.variants.find((variant) => variant.code === "SUJET_1") ?? null;
    const selectedNode = activeVariant?.nodes[0] ?? null;

    expect(
      resolveSelectedVariantCode({
        variants: draft.variants,
        selectedVariantCode: "SUJET_1",
      }),
    ).toBe("SUJET_1");
    expect(
      resolveSelectedVariantCode({
        variants: draft.variants,
        selectedVariantCode: "SUJET_1",
      }),
    ).toBe("SUJET_1");
    expect(
      resolveSelectedNodeId({
        activeVariant,
        selectedNodeId: "missing-node",
      }),
    ).toBe("exercise-1");
    expect(
      resolveSelectedBlockId({
        selectedNode,
        selectedBlockId: "missing-block",
      }),
    ).toBe("block-1");
  });

  it("resolves focus request targets from block, node, and asset references", () => {
    const draft = createDraft();
    const assetById = new Map(draft.assets.map((asset) => [asset.id, asset]));
    const blockReferenceById = buildBlockReferenceById(draft);
    const nodeReferenceById = buildNodeReferenceById(draft);
    const assetReferenceById = buildAssetReferenceById({
      draft,
      assetById,
      blockReferenceById,
    });

    expect(
      resolveFocusRequestTargets({
        focusRequest: {
          issueId: "issue-2",
          variantCode: null,
          nodeId: null,
          blockId: "block-1",
          assetId: null,
          sourcePageId: null,
        },
        blockReferenceById,
        nodeReferenceById,
        assetReferenceById,
      }),
    ).toEqual({
      nextVariantCode: "SUJET_1",
      nextNodeId: "exercise-1",
      nextBlockId: "block-1",
      nextAssetId: "asset-1",
    });
  });
});
