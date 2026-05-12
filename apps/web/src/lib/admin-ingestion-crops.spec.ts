import { describe, expect, it } from "vitest";
import type { AdminIngestionCropQueueItem } from "@/lib/admin";
import {
  buildCropQueueStats,
  buildCropSubjectOptions,
  filterCropQueueItems,
  selectInitialCropItem,
} from "./admin-ingestion-crops";

function createItem(
  overrides: Partial<AdminIngestionCropQueueItem> = {},
): AdminIngestionCropQueueItem {
  return {
    job_id: "job-1",
    job_label: "BAC 2025 Physics",
    job_status: "in_review",
    draft_kind: "ingestion",
    year: 2025,
    subject_code: "PHYSICS",
    stream_codes: ["SE", "M"],
    asset_id: "asset-1",
    asset_label: "Graph 1",
    classification: "graph",
    role: "PROMPT",
    variant_code: "SUJET_1",
    source_page_id: "page-1",
    source_document_kind: "EXAM",
    source_page_number: 1,
    source_page_width: 1200,
    source_page_height: 1600,
    page_image_url: "/api/v1/ingestion/pages/page-1/image",
    asset_preview_url: "/api/v1/ingestion/jobs/job-1/assets/asset-1/preview",
    crop_box: {
      x: 0,
      y: 0,
      width: 1200,
      height: 1600,
    },
    placeholder: true,
    needs_cleanup: false,
    cleanup_mask_count: 0,
    notes: null,
    linked_node_id: "node-1",
    linked_node_path: ["التمرين الأول", "1"],
    updated_at: "2026-05-09T12:00:00.000Z",
    ...overrides,
  };
}

describe("admin ingestion crop helpers", () => {
  it("counts placeholders, jobs, and source documents", () => {
    const stats = buildCropQueueStats([
      createItem(),
      createItem({
        job_id: "job-2",
        asset_id: "asset-2",
        source_document_kind: "CORRECTION",
      }),
      createItem({
        asset_id: "asset-3",
        placeholder: false,
      }),
    ]);

    expect(stats).toEqual({
      total: 3,
      placeholders: 2,
      jobs: 2,
      exam: 2,
      correction: 1,
      needsCleanup: 0,
    });
  });

  it("filters by query, document kind, and classification", () => {
    const items = [
      createItem(),
      createItem({
        asset_id: "asset-2",
        asset_label: "Correction table",
        classification: "table",
        source_document_kind: "CORRECTION",
        linked_node_path: ["الحل", "جدول"],
      }),
    ];

    expect(
      filterCropQueueItems({
        items,
        query: "table",
        subjectCode: "all",
        documentKind: "all",
        classification: "all",
      }).map((item) => item.asset_id),
    ).toEqual(["asset-2"]);
    expect(
      filterCropQueueItems({
        items,
        query: "",
        subjectCode: "all",
        documentKind: "EXAM",
        classification: "graph",
      }).map((item) => item.asset_id),
    ).toEqual(["asset-1"]);
  });

  it("builds subject counts and filters one subject at a time", () => {
    const items = [
      createItem({
        asset_id: "asset-physics-1",
        subject_code: "PHYSICS",
      }),
      createItem({
        asset_id: "asset-physics-2",
        subject_code: "physics",
      }),
      createItem({
        asset_id: "asset-svt-1",
        subject_code: "SVT",
      }),
      createItem({
        asset_id: "asset-missing-subject",
        subject_code: null,
      }),
    ];

    expect(buildCropSubjectOptions(items)).toEqual([
      { value: "all", label: "All subjects", count: 4 },
      { value: "PHYSICS", label: "PHYSICS", count: 2 },
      { value: "SVT", label: "SVT", count: 1 },
      { value: "UNASSIGNED", label: "Unassigned", count: 1 },
    ]);
    expect(
      filterCropQueueItems({
        items,
        query: "",
        subjectCode: "PHYSICS",
        documentKind: "all",
        classification: "all",
      }).map((item) => item.asset_id),
    ).toEqual(["asset-physics-1", "asset-physics-2"]);
  });

  it("keeps the selected item when it is still visible", () => {
    const items = [createItem(), createItem({ asset_id: "asset-2" })];

    expect(selectInitialCropItem(items, "asset-2")?.asset_id).toBe("asset-2");
    expect(selectInitialCropItem(items, "missing")?.asset_id).toBe("asset-1");
  });
});
