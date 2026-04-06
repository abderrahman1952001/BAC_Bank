import { describe, expect, it } from "vitest";
import type {
  AdminIngestionDraft,
  AdminIngestionValidationIssue,
} from "@/lib/admin";
import {
  buildProcessConfirmationMessage,
  buildDraftWithSelectedStreamCodes,
  buildExtractionSummary,
  buildFocusRequest,
  buildIssueCountBySection,
  buildProcessActionLabel,
  buildProcessRequestPayload,
  buildReviewActionState,
  canRunPrimaryReviewAction,
  formatAutosaveTimestamp,
  formatIssueLocation,
  mergeExamMetadata,
  readDraftSelectedStreamCodes,
  resolveIssueSection,
} from "./admin-ingestion-review";

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
      metadata: {
        paperStreamCodes: ["SE", "TM"],
        extraction: {
          engine: "gemini",
          model: "2.5",
          exerciseCount: 3,
          questionCount: 8,
          assetCount: 4,
          uncertainties: ["u1", "u2"],
        },
      },
    },
    sourcePages: [],
    assets: [],
    variants: [],
  };
}

const issues: AdminIngestionValidationIssue[] = [
  {
    id: "issue-1",
    severity: "error",
    code: "metadata",
    target: "exam",
    message: "Missing subject",
    variantCode: null,
    nodeId: null,
    blockId: null,
    assetId: null,
    sourcePageId: null,
    pageNumber: null,
    field: "subjectCode",
  },
  {
    id: "issue-2",
    severity: "warning",
    code: "node",
    target: "node",
    message: "Check node",
    variantCode: "SUJET_1",
    nodeId: "node-12345678",
    blockId: "block-abcdefgh",
    assetId: null,
    sourcePageId: null,
    pageNumber: null,
    field: null,
  },
  {
    id: "issue-3",
    severity: "warning",
    code: "asset",
    target: "asset",
    message: "Check asset",
    variantCode: null,
    nodeId: null,
    blockId: null,
    assetId: "asset-abcdef12",
    sourcePageId: "page-1",
    pageNumber: 3,
    field: null,
  },
];

describe("admin ingestion review helpers", () => {
  it("formats issue locations and resolves issue sections", () => {
    expect(formatIssueLocation(issues[1]!)).toBe(
      "SUJET 1 · node node-123 · block block-ab",
    );
    expect(resolveIssueSection(issues[0]!)).toBe("metadata");
    expect(resolveIssueSection(issues[1]!)).toBe("structure");
    expect(resolveIssueSection(issues[2]!)).toBe("sources");
  });

  it("merges exam metadata", () => {
    expect(
      mergeExamMetadata(
        {
          paperStreamCodes: ["SE"],
          source: "legacy",
        },
        {
          paperStreamCodes: ["SE", "TM"],
        },
      ),
    ).toEqual({
      paperStreamCodes: ["SE", "TM"],
      source: "legacy",
    });
  });

  it("formats autosave timestamps and ignores invalid values", () => {
    expect(formatAutosaveTimestamp("invalid")).toBeNull();
    expect(formatAutosaveTimestamp("2026-03-29T12:34:56.000Z")).not.toBeNull();
  });

  it("builds extraction summaries and selected stream codes from review drafts", () => {
    const draft = createDraft();

    expect(buildExtractionSummary(draft)).toEqual({
      engine: "gemini",
      model: "2.5",
      exerciseCount: 3,
      questionCount: 8,
      assetCount: 4,
      uncertaintyCount: 2,
    });
    expect(readDraftSelectedStreamCodes(draft.exam)).toEqual(["SE", "TM"]);
  });

  it("builds focus requests and issue counts by review section", () => {
    expect(buildFocusRequest(issues[1]!)).toEqual({
      issueId: "issue-2",
      variantCode: "SUJET_1",
      nodeId: "node-12345678",
      blockId: "block-abcdefgh",
      assetId: null,
      sourcePageId: null,
    });
    expect(buildIssueCountBySection(issues)).toEqual({
      overview: 0,
      metadata: 1,
      structure: 1,
      sources: 1,
      assets: 0,
    });
  });

  it("builds review action state and process labels", () => {
    expect(
      buildReviewActionState({
        job: {
          status: "draft",
          draft_kind: "ingestion",
        },
        saving: false,
        autosaving: false,
        autosaveError: null,
        hasUnsavedChanges: true,
        formattedLastSavedAt: null,
        processing: false,
        attachingCorrection: false,
      }),
    ).toEqual({
      actionBusy: false,
      primaryActionLabel: "Approve & Publish",
      isRevisionDraft: false,
      saveActionLabel: "Save Draft",
      approveActionLabel: "Approve only",
      autosaveStatusMessage:
        "Unsaved changes detected. Autosave will run shortly.",
      autosaveStatusClassName: "muted-text",
    });

    expect(
      buildReviewActionState({
        job: {
          status: "published",
          draft_kind: "revision",
        },
        saving: false,
        autosaving: false,
        autosaveError: null,
        hasUnsavedChanges: false,
        formattedLastSavedAt: "12:34:56",
        processing: false,
        attachingCorrection: false,
      }),
    ).toEqual({
      actionBusy: false,
      primaryActionLabel: "Published Revision",
      isRevisionDraft: true,
      saveActionLabel: "Save Revision",
      approveActionLabel: "Approve Revision",
      autosaveStatusMessage: "All review changes saved at 12:34:56.",
      autosaveStatusClassName: "success-text",
    });

    expect(
      buildProcessActionLabel({
        workflow: {
          awaiting_correction: true,
          review_started: false,
        },
        jobStatus: "draft",
        processing: false,
      }),
    ).toBe("Waiting");
    expect(
      buildProcessActionLabel({
        workflow: {
          awaiting_correction: false,
          review_started: true,
        },
        jobStatus: "draft",
        processing: false,
      }),
    ).toBe("Re-run extraction");
    expect(
      buildProcessActionLabel({
        workflow: {
          awaiting_correction: false,
          review_started: false,
        },
        jobStatus: "failed",
        processing: false,
      }),
    ).toBe("Re-run extraction");
    expect(
      buildProcessActionLabel({
        workflow: {
          awaiting_correction: false,
          review_started: false,
        },
        jobStatus: "draft",
        processing: false,
      }),
    ).toBe("Process");
    expect(
      buildProcessConfirmationMessage({
        workflow: {
          review_started: true,
        },
        jobStatus: "in_review",
      }),
    ).toContain("replace the current extracted structure");
    expect(
      buildProcessConfirmationMessage({
        workflow: {
          review_started: false,
        },
        jobStatus: "draft",
      }),
    ).toBeNull();
    expect(
      buildProcessRequestPayload({
        workflow: {
          review_started: true,
        },
        jobStatus: "approved",
      }),
    ).toEqual({
      force_reprocess: true,
      replace_existing: true,
    });
    expect(
      buildProcessRequestPayload({
        workflow: {
          review_started: false,
        },
        jobStatus: "draft",
      }),
    ).toEqual({});
  });

  it("unlocks the primary review action when approval is allowed", () => {
    expect(
      canRunPrimaryReviewAction({
        job: {
          status: "draft",
          draft_kind: "revision",
        },
        validation: {
          can_approve: true,
          can_publish: false,
        },
      }),
    ).toBe(true);

    expect(
      canRunPrimaryReviewAction({
        job: {
          status: "approved",
          draft_kind: "ingestion",
        },
        validation: {
          can_approve: true,
          can_publish: true,
        },
      }),
    ).toBe(true);

    expect(
      canRunPrimaryReviewAction({
        job: {
          status: "draft",
          draft_kind: "ingestion",
        },
        validation: {
          can_approve: false,
          can_publish: false,
        },
      }),
    ).toBe(false);

    expect(
      canRunPrimaryReviewAction({
        job: {
          status: "published",
          draft_kind: "revision",
        },
        validation: {
          can_approve: true,
          can_publish: false,
        },
      }),
    ).toBe(false);
  });

  it("updates selected stream codes while preserving a valid paper stream set", () => {
    const draft = createDraft();

    expect(
      buildDraftWithSelectedStreamCodes(draft, [" tm ", "se", "", "TM"]).exam,
    ).toMatchObject({
      metadata: {
        paperStreamCodes: ["TM", "SE"],
      },
    });

    expect(buildDraftWithSelectedStreamCodes(draft, ["LP"]).exam).toMatchObject(
      {
        metadata: {
          paperStreamCodes: ["LP"],
        },
      },
    );

    expect(buildDraftWithSelectedStreamCodes(draft, []).exam).toMatchObject({
      metadata: {
        paperStreamCodes: ["SE", "TM"],
      },
    });
  });
});
