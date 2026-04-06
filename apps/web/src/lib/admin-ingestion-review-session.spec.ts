import { describe, expect, it } from "vitest";
import type {
  AdminIngestionDraft,
  AdminIngestionJobResponse,
} from "@/lib/admin";
import {
  buildAppliedReviewPayloadState,
  buildInitialReviewSessionState,
  hasUnsavedReviewSessionChanges,
  hasActiveReviewWorker,
  normalizeReviewDraftForAutosave,
  resolveReviewSavePlan,
  shouldScheduleReviewAutosave,
  shouldTriggerQueuedReviewAutosave,
  shouldWarnBeforeUnload,
} from "./admin-ingestion-review-session";

function createDraft(): AdminIngestionDraft {
  return {
    schema: "bac_ingestion_draft/v1",
    exam: {
      year: 2025,
      streamCode: "SE",
      subjectCode: "MATHEMATICS",
      sessionType: "NORMAL",
      provider: "manual",
      title: "BAC 2025 Mathematics SE",
      minYear: 2008,
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
    variants: [],
  };
}

function createPayload(): AdminIngestionJobResponse {
  return {
    job: {
      id: "job-1",
      label: "BAC 2025 Mathematics SE",
      draft_kind: "ingestion",
      provider: "manual",
      year: 2025,
      stream_codes: ["SE"],
      subject_code: "MATHEMATICS",
      session: "normal",
      min_year: 2008,
      status: "draft",
      review_notes: "Server notes",
      error_message: null,
      published_paper_id: null,
      published_exams: [],
      created_at: "2026-03-29T09:00:00.000Z",
      updated_at: "2026-03-29T10:00:00.000Z",
    },
    workflow: {
      has_exam_document: true,
      has_correction_document: true,
      awaiting_correction: false,
      can_process: true,
      review_started: false,
    },
    documents: [],
    draft_json: createDraft(),
    asset_preview_base_url: "https://example.com/assets",
    validation: {
      errors: [],
      warnings: [],
      issues: [],
      can_approve: true,
      can_publish: true,
    },
  };
}

describe("admin ingestion review session helpers", () => {
  it("detects worker-active statuses and save plans", () => {
    const draft = createDraft();

    expect(hasActiveReviewWorker("queued")).toBe(true);
    expect(hasActiveReviewWorker("processing")).toBe(true);
    expect(hasActiveReviewWorker("draft")).toBe(false);

    expect(
      resolveReviewSavePlan({
        draft: null,
        hasUnsavedChanges: false,
        jobStatus: "draft",
        hasData: false,
      }),
    ).toBe("missing");
    expect(
      resolveReviewSavePlan({
        draft,
        hasUnsavedChanges: true,
        jobStatus: "processing",
        hasData: true,
      }),
    ).toBe("blocked");
    expect(
      resolveReviewSavePlan({
        draft,
        hasUnsavedChanges: false,
        jobStatus: "draft",
        hasData: true,
      }),
    ).toBe("unchanged");
    expect(
      resolveReviewSavePlan({
        draft,
        hasUnsavedChanges: true,
        jobStatus: "published",
        hasData: true,
      }),
    ).toBe("frozen");
    expect(
      resolveReviewSavePlan({
        draft,
        hasUnsavedChanges: true,
        jobStatus: "draft",
        hasData: true,
      }),
    ).toBe("save");
  });

  it("applies payloads while optionally preserving local review session changes", () => {
    const payload = createPayload();
    const localDraft = {
      ...createDraft(),
      exam: {
        ...createDraft().exam,
        title: "Local title",
      },
    };

    expect(
      buildAppliedReviewPayloadState({
        payload,
        preserveLocalReviewSession: false,
        currentDraft: localDraft,
        currentReviewNotes: "Local notes",
      }),
    ).toMatchObject({
      draft: payload.draft_json,
      reviewNotes: "Server notes",
      preservedLocalReviewSession: false,
      lastSavedAt: payload.job.updated_at,
      clearCorrectionFile: true,
    });

    expect(
      buildAppliedReviewPayloadState({
        payload,
        preserveLocalReviewSession: true,
        currentDraft: localDraft,
        currentReviewNotes: "Local notes",
      }),
    ).toMatchObject({
      draft: localDraft,
      reviewNotes: "Local notes",
      preservedLocalReviewSession: true,
      lastSavedAt: payload.job.updated_at,
      clearCorrectionFile: true,
    });
  });

  it("builds initial review session state from a server payload", () => {
    expect(buildInitialReviewSessionState()).toMatchObject({
      data: null,
      draft: null,
      reviewNotes: "",
      loading: true,
      localRevision: 0,
      lastSavedRevision: null,
      lastSavedAt: null,
    });

    expect(buildInitialReviewSessionState(createPayload())).toMatchObject({
      data: createPayload(),
      draft: createPayload().draft_json,
      reviewNotes: "Server notes",
      loading: false,
      localRevision: 1,
      lastSavedRevision: 1,
      lastSavedAt: createPayload().job.updated_at,
    });
  });

  it("normalizes legacy string year values before autosave", () => {
    const malformedDraft = {
      ...createDraft(),
      exam: {
        ...createDraft().exam,
        year: "2025",
        minYear: "2008",
      },
    } as unknown as AdminIngestionDraft;

    expect(
      normalizeReviewDraftForAutosave(malformedDraft, {
        year: 2025,
        minYear: 2008,
      }),
    ).toMatchObject({
      exam: {
        year: 2025,
        minYear: 2008,
      },
    });
  });

  it("evaluates before-unload, autosave, and queued autosave rules", () => {
    expect(
      shouldWarnBeforeUnload({
        hasUnsavedChanges: false,
        hasSaveInFlight: false,
      }),
    ).toBe(false);
    expect(
      shouldWarnBeforeUnload({
        hasUnsavedChanges: true,
        hasSaveInFlight: false,
      }),
    ).toBe(true);

    expect(
      shouldScheduleReviewAutosave({
        hasUnsavedChanges: true,
        saving: false,
        autosaving: false,
        processing: false,
        jobStatus: "draft",
        attachingCorrection: false,
      }),
    ).toBe(true);
    expect(
      shouldScheduleReviewAutosave({
        hasUnsavedChanges: true,
        saving: false,
        autosaving: false,
        processing: false,
        jobStatus: "queued",
        attachingCorrection: false,
      }),
    ).toBe(false);
    expect(
      shouldScheduleReviewAutosave({
        hasUnsavedChanges: true,
        saving: false,
        autosaving: false,
        processing: false,
        jobStatus: "published",
        attachingCorrection: false,
      }),
    ).toBe(false);

    expect(
      shouldTriggerQueuedReviewAutosave({
        queuedAutosave: false,
        hasUnsavedChanges: true,
      }),
    ).toBe(true);
    expect(
      shouldTriggerQueuedReviewAutosave({
        queuedAutosave: false,
        hasUnsavedChanges: false,
      }),
    ).toBe(false);
  });

  it("tracks unsaved state from local and saved revisions", () => {
    expect(
      hasUnsavedReviewSessionChanges({
        localRevision: 4,
        lastSavedRevision: 4,
      }),
    ).toBe(false);
    expect(
      hasUnsavedReviewSessionChanges({
        localRevision: 5,
        lastSavedRevision: 4,
      }),
    ).toBe(true);
    expect(
      hasUnsavedReviewSessionChanges({
        localRevision: 1,
        lastSavedRevision: null,
      }),
    ).toBe(false);
  });
});
