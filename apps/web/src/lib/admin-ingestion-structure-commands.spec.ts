import { describe, expect, it } from "vitest";
import type { AdminIngestionDraft } from "@/lib/admin";
import {
  addDraftBlockCommand,
  addDraftNodeCommand,
  applyDraftBlockPresetCommand,
  removeDraftNodeCommand,
} from "./admin-ingestion-structure-commands";

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
    sourcePages: [],
    assets: [],
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
            maxPoints: null,
            topicCodes: [],
            blocks: [
              {
                id: "block-1",
                role: "PROMPT",
                type: "paragraph",
                value: "Prompt",
                assetId: null,
                data: null,
              },
            ],
          },
          {
            id: "question-1",
            nodeType: "QUESTION",
            parentId: "exercise-1",
            orderIndex: 1,
            label: "Question 1",
            maxPoints: null,
            topicCodes: [],
            blocks: [],
          },
        ],
      },
    ],
  };
}

describe("admin ingestion structure commands", () => {
  it("adds a node and selects it", () => {
    const draft = createDraft();
    const result = addDraftNodeCommand({
      draft,
      variantCode: "SUJET_1",
      nodes: draft.variants[0]!.nodes,
      parentId: "exercise-1",
      makeNodeId: () => "node-2",
    });

    expect(result.nextSelectedNodeId).toBe("node-2");
    expect(result.nextSelectedBlockId).toBeNull();
    expect(result.draft.variants[0]!.nodes.at(-1)).toMatchObject({
      id: "node-2",
      parentId: "exercise-1",
      nodeType: "QUESTION",
    });
  });

  it("removes a node tree and falls back to the parent selection", () => {
    const draft = createDraft();
    const selectedNode = draft.variants[0]!.nodes[1]!;
    const result = removeDraftNodeCommand({
      draft,
      variantCode: "SUJET_1",
      nodes: draft.variants[0]!.nodes,
      selectedNode,
    });

    expect(result.nextSelectedNodeId).toBe("exercise-1");
    expect(result.draft.variants[0]!.nodes.map((node) => node.id)).toEqual([
      "exercise-1",
    ]);
  });

  it("adds a block and selects it", () => {
    const draft = createDraft();
    const result = addDraftBlockCommand({
      draft,
      variantCode: "SUJET_1",
      nodeId: "question-1",
      makeBlockId: () => "block-2",
    });

    expect(result.nextSelectedBlockId).toBe("block-2");
    expect(result.draft.variants[0]!.nodes[1]!.blocks).toContainEqual(
      expect.objectContaining({
        id: "block-2",
        type: "paragraph",
      }),
    );
  });

  it("inserts a block at the requested position", () => {
    const draft = createDraft();
    draft.variants[0]!.nodes[0]!.blocks.push({
      id: "block-2",
      role: "SOLUTION",
      type: "paragraph",
      value: "Follow-up",
      assetId: null,
      data: null,
    });

    const result = addDraftBlockCommand({
      draft,
      variantCode: "SUJET_1",
      nodeId: "exercise-1",
      insertIndex: 1,
      makeBlockId: () => "block-new",
    });

    expect(result.nextSelectedBlockId).toBe("block-new");
    expect(result.draft.variants[0]!.nodes[0]!.blocks.map((block) => block.id)).toEqual([
      "block-1",
      "block-new",
      "block-2",
    ]);
  });

  it("applies a preset to the targeted block", () => {
    const draft = createDraft();
    const result = applyDraftBlockPresetCommand({
      draft,
      variantCode: "SUJET_1",
      nodeId: "exercise-1",
      blockId: "block-1",
      preset: "table",
    });

    expect(result.variants[0]!.nodes[0]!.blocks[0]).toMatchObject({
      id: "block-1",
      type: "table",
      data: {
        rows: [
          ["Header 1", "Header 2"],
          ["Value 1", "Value 2"],
        ],
      },
    });
  });
});
