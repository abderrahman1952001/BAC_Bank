import { describe, expect, it } from 'vitest';
import type { AdminIngestionDraft, AdminIngestionJobResponse } from '@/lib/admin';
import {
  buildAppliedReviewPayloadState,
  hasActiveReviewWorker,
  resolveReviewSavePlan,
  shouldScheduleReviewAutosave,
  shouldTriggerQueuedReviewAutosave,
  shouldWarnBeforeUnload,
} from './admin-ingestion-review-session';

function createDraft(): AdminIngestionDraft {
  return {
    schema: '1',
    exam: {
      year: 2025,
      streamCode: 'SE',
      subjectCode: 'MATHEMATICS',
      sessionType: 'NORMAL',
      provider: 'manual',
      title: 'BAC 2025 Mathematics SE',
      minYear: 2008,
      sourceListingUrl: null,
      sourceExamPageUrl: null,
      sourceCorrectionPageUrl: null,
      examDocumentId: 'doc-exam',
      correctionDocumentId: null,
      examDocumentStorageKey: 'exam.pdf',
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
      id: 'job-1',
      label: 'BAC 2025 Mathematics SE',
      provider: 'manual',
      year: 2025,
      stream_code: 'SE',
      subject_code: 'MATHEMATICS',
      session: 'normal',
      min_year: 2008,
      status: 'draft',
      review_notes: 'Server notes',
      error_message: null,
      published_exam_id: null,
      published_paper_id: null,
      published_exams: [],
      created_at: '2026-03-29T09:00:00.000Z',
      updated_at: '2026-03-29T10:00:00.000Z',
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
    asset_preview_base_url: 'https://example.com/assets',
    validation: {
      errors: [],
      warnings: [],
      issues: [],
      can_approve: true,
      can_publish: true,
    },
  };
}

describe('admin ingestion review session helpers', () => {
  it('detects worker-active statuses and save plans', () => {
    const draft = createDraft();

    expect(hasActiveReviewWorker('queued')).toBe(true);
    expect(hasActiveReviewWorker('processing')).toBe(true);
    expect(hasActiveReviewWorker('draft')).toBe(false);

    expect(
      resolveReviewSavePlan({
        draft: null,
        snapshot: null,
        jobStatus: 'draft',
        hasData: false,
        lastSavedSnapshot: null,
      }),
    ).toBe('missing');
    expect(
      resolveReviewSavePlan({
        draft,
        snapshot: '{"draft":1}',
        jobStatus: 'processing',
        hasData: true,
        lastSavedSnapshot: null,
      }),
    ).toBe('blocked');
    expect(
      resolveReviewSavePlan({
        draft,
        snapshot: '{"draft":1}',
        jobStatus: 'draft',
        hasData: true,
        lastSavedSnapshot: '{"draft":1}',
      }),
    ).toBe('unchanged');
    expect(
      resolveReviewSavePlan({
        draft,
        snapshot: '{"draft":2}',
        jobStatus: 'draft',
        hasData: true,
        lastSavedSnapshot: '{"draft":1}',
      }),
    ).toBe('save');
  });

  it('applies payloads while optionally preserving local review session changes', () => {
    const payload = createPayload();
    const localDraft = {
      ...createDraft(),
      exam: {
        ...createDraft().exam,
        title: 'Local title',
      },
    };

    expect(
      buildAppliedReviewPayloadState({
        payload,
        preserveLocalReviewSession: false,
        currentDraft: localDraft,
        currentReviewNotes: 'Local notes',
      }),
    ).toMatchObject({
      draft: payload.draft_json,
      reviewNotes: 'Server notes',
      lastSavedAt: payload.job.updated_at,
      clearCorrectionFile: true,
    });

    expect(
      buildAppliedReviewPayloadState({
        payload,
        preserveLocalReviewSession: true,
        currentDraft: localDraft,
        currentReviewNotes: 'Local notes',
      }),
    ).toMatchObject({
      draft: localDraft,
      reviewNotes: 'Local notes',
      lastSavedAt: payload.job.updated_at,
      clearCorrectionFile: true,
    });
  });

  it('evaluates before-unload, autosave, and queued autosave rules', () => {
    expect(
      shouldWarnBeforeUnload({
        snapshot: '{"draft":1}',
        lastSavedSnapshot: '{"draft":1}',
        hasSaveInFlight: false,
      }),
    ).toBe(false);
    expect(
      shouldWarnBeforeUnload({
        snapshot: '{"draft":2}',
        lastSavedSnapshot: '{"draft":1}',
        hasSaveInFlight: false,
      }),
    ).toBe(true);

    expect(
      shouldScheduleReviewAutosave({
        reviewSessionSnapshot: '{"draft":2}',
        lastSavedSnapshot: '{"draft":1}',
        saving: false,
        autosaving: false,
        processing: false,
        jobStatus: 'draft',
        attachingCorrection: false,
      }),
    ).toBe(true);
    expect(
      shouldScheduleReviewAutosave({
        reviewSessionSnapshot: '{"draft":2}',
        lastSavedSnapshot: '{"draft":1}',
        saving: false,
        autosaving: false,
        processing: false,
        jobStatus: 'queued',
        attachingCorrection: false,
      }),
    ).toBe(false);

    expect(
      shouldTriggerQueuedReviewAutosave({
        queuedAutosave: false,
        latestSnapshot: '{"draft":2}',
        lastSavedSnapshot: '{"draft":1}',
      }),
    ).toBe(true);
    expect(
      shouldTriggerQueuedReviewAutosave({
        queuedAutosave: false,
        latestSnapshot: '{"draft":1}',
        lastSavedSnapshot: '{"draft":1}',
      }),
    ).toBe(false);
  });
});
