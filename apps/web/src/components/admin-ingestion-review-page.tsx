'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AdminIngestionAssetWorkspace } from '@/components/admin-ingestion-asset-workspace';
import { AdminIngestionStructureEditor } from '@/components/admin-ingestion-structure-editor';
import type {
  AdminIngestionDraft,
  AdminIngestionJobResponse,
  AdminIngestionValidationIssue,
} from '@/lib/admin';
import { fetchAdmin, fetchAdminJson } from '@/lib/admin';
import {
  INGESTION_STREAM_OPTIONS,
  INGESTION_SUBJECT_OPTIONS,
} from '@/lib/ingestion-options';

type ReviewSection =
  | 'overview'
  | 'metadata'
  | 'structure'
  | 'sources'
  | 'assets';

const REVIEW_SECTION_LABELS: Record<ReviewSection, string> = {
  overview: 'Overview',
  metadata: 'Metadata',
  structure: 'Structure',
  sources: 'Sources',
  assets: 'Assets',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatIssueLocation(issue: AdminIngestionValidationIssue) {
  const parts: string[] = [];

  if (issue.variantCode) {
    parts.push(issue.variantCode.replace('_', ' '));
  }

  if (issue.nodeId) {
    parts.push(`node ${issue.nodeId.slice(0, 8)}`);
  }

  if (issue.blockId) {
    parts.push(`block ${issue.blockId.slice(0, 8)}`);
  }

  if (issue.assetId) {
    parts.push(`asset ${issue.assetId.slice(0, 8)}`);
  }

  if (issue.pageNumber !== null) {
    parts.push(`page ${issue.pageNumber}`);
  }

  return parts.length ? parts.join(' · ') : issue.target;
}

function scrollToIssueTarget(issue: AdminIngestionValidationIssue) {
  const targetIds = [
    issue.blockId ? `preview-block-${issue.blockId}` : null,
    issue.nodeId ? `tree-node-${issue.nodeId}` : null,
    issue.assetId ? `asset-library-${issue.assetId}` : null,
    issue.sourcePageId ? `source-page-${issue.sourcePageId}` : null,
    'ingestion-structure-editor',
  ].filter((value): value is string => Boolean(value));

  window.requestAnimationFrame(() => {
    for (const targetId of targetIds) {
      const element = document.getElementById(targetId);

      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
        return;
      }
    }
  });
}

function resolveIssueSection(issue: AdminIngestionValidationIssue): ReviewSection {
  if (issue.sourcePageId) {
    return 'sources';
  }

  if (issue.assetId) {
    return 'assets';
  }

  if (issue.blockId || issue.nodeId || issue.variantCode) {
    return 'structure';
  }

  if (issue.field === 'streamCode' || issue.field === 'subjectCode') {
    return 'metadata';
  }

  return 'overview';
}

function readSelectedStreamCodes(
  exam: AdminIngestionDraft['exam'] | null | undefined,
) {
  if (!exam) {
    return [];
  }

  const metadata = isRecord(exam.metadata) ? exam.metadata : {};
  const fromMetadata = Array.isArray(metadata.sharedStreamCodes)
    ? metadata.sharedStreamCodes
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim().toUpperCase())
        .filter((value) => value.length > 0)
    : [];

  return Array.from(
    new Set(
      [exam.streamCode, ...fromMetadata]
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim().toUpperCase())
        .filter((value) => value.length > 0),
    ),
  );
}

function mergeExamMetadata(
  metadata: Record<string, unknown>,
  patch: Record<string, unknown>,
) {
  return {
    ...metadata,
    ...patch,
  };
}

function buildReviewSessionSnapshot(
  draft: AdminIngestionDraft | null,
  reviewNotes: string,
) {
  if (!draft) {
    return null;
  }

  return JSON.stringify({
    draft,
    reviewNotes,
  });
}

function formatAutosaveTimestamp(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(parsed);
}

export function AdminIngestionReviewPage({ jobId }: { jobId: string }) {
  const [data, setData] = useState<AdminIngestionJobResponse | null>(null);
  const [draft, setDraft] = useState<AdminIngestionDraft | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autosaving, setAutosaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [attachingCorrection, setAttachingCorrection] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [autosaveError, setAutosaveError] = useState<string | null>(null);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [focusedIssueId, setFocusedIssueId] = useState<string | null>(null);
  const [correctionFile, setCorrectionFile] = useState<File | null>(null);
  const [activeSection, setActiveSection] = useState<ReviewSection>('overview');
  const latestDraftRef = useRef<AdminIngestionDraft | null>(null);
  const latestReviewNotesRef = useRef('');
  const autosaveTimerRef = useRef<number | null>(null);
  const saveInFlightRef = useRef<Promise<AdminIngestionJobResponse> | null>(null);
  const queuedAutosaveRef = useRef(false);
  const lastSavedSnapshotRef = useRef<string | null>(null);

  const sourcePages = useMemo(
    () =>
      data?.documents.flatMap((document) =>
        document.pages.map((page) => ({
          ...page,
          documentId: document.id,
          documentKind: document.kind,
        })),
      ) ?? [],
    [data?.documents],
  );

  const extractionSummary = useMemo(() => {
    if (!draft || !isRecord(draft.exam.metadata)) {
      return null;
    }

    const extraction = draft.exam.metadata.extraction;

    if (!isRecord(extraction)) {
      return null;
    }

    return {
      engine: typeof extraction.engine === 'string' ? extraction.engine : null,
      model: typeof extraction.model === 'string' ? extraction.model : null,
      exerciseCount:
        typeof extraction.exerciseCount === 'number'
          ? extraction.exerciseCount
          : null,
      questionCount:
        typeof extraction.questionCount === 'number'
          ? extraction.questionCount
          : null,
      assetCount:
        typeof extraction.assetCount === 'number' ? extraction.assetCount : null,
      uncertaintyCount: Array.isArray(extraction.uncertainties)
        ? extraction.uncertainties.length
        : null,
    };
  }, [draft]);

  const validationSummary = data?.validation ?? {
    errors: [],
    warnings: [],
    issues: [],
    can_approve: false,
    can_publish: false,
  };
  const workflow = data?.workflow ?? {
    has_exam_document: false,
    has_correction_document: false,
    awaiting_correction: false,
    can_process: false,
    review_started: false,
  };
  const actionBusy = saving || processing || attachingCorrection;
  const reviewSessionSnapshot = useMemo(
    () => buildReviewSessionSnapshot(draft, reviewNotes),
    [draft, reviewNotes],
  );
  const hasUnsavedChanges = Boolean(
    reviewSessionSnapshot &&
      lastSavedSnapshot &&
      reviewSessionSnapshot !== lastSavedSnapshot,
  );
  const formattedLastSavedAt = useMemo(
    () => formatAutosaveTimestamp(lastSavedAt),
    [lastSavedAt],
  );
  const autosaveDelay = autosaveError ? 5000 : 1400;
  const focusedIssue = useMemo(
    () =>
      validationSummary.issues.find((issue) => issue.id === focusedIssueId) ?? null,
    [focusedIssueId, validationSummary.issues],
  );
  const focusRequest = useMemo(
    () =>
      focusedIssue
        ? {
            issueId: focusedIssue.id,
            variantCode: focusedIssue.variantCode,
            nodeId: focusedIssue.nodeId,
            blockId: focusedIssue.blockId,
            assetId: focusedIssue.assetId,
            sourcePageId: focusedIssue.sourcePageId,
          }
        : null,
    [focusedIssue],
  );
  const selectedStreamCodes = useMemo(
    () => readSelectedStreamCodes(draft?.exam),
    [draft?.exam],
  );
  const issueCountBySection = useMemo(() => {
    const counts: Record<ReviewSection, number> = {
      overview: 0,
      metadata: 0,
      structure: 0,
      sources: 0,
      assets: 0,
    };

    for (const issue of validationSummary.issues) {
      counts[resolveIssueSection(issue)] += 1;
    }

    return counts;
  }, [validationSummary.issues]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadJob() {
      setLoading(true);
      setError(null);

      try {
        const payload = await fetchAdminJson<AdminIngestionJobResponse>(
          `/ingestion/jobs/${jobId}`,
          {
            signal: controller.signal,
          },
        );

        applyPayload(payload);
      } catch (loadError) {
        if (!(loadError instanceof Error) || loadError.name !== 'AbortError') {
          setError('Failed to load ingestion job.');
        }
      } finally {
        setLoading(false);
      }
    }

    void loadJob();

    return () => {
      controller.abort();
    };
  // Keep the initial job load keyed to the route param instead of every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  useEffect(() => {
    if (
      focusedIssueId &&
      !validationSummary.issues.some((issue) => issue.id === focusedIssueId)
    ) {
      setFocusedIssueId(null);
    }
  }, [focusedIssueId, validationSummary.issues]);

  useEffect(() => {
    latestDraftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    latestReviewNotesRef.current = reviewNotes;
  }, [reviewNotes]);

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const snapshot = buildReviewSessionSnapshot(
        latestDraftRef.current,
        latestReviewNotesRef.current,
      );

      if (
        snapshot &&
        (snapshot !== lastSavedSnapshotRef.current || saveInFlightRef.current)
      ) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  function syncSavedSnapshot(snapshot: string | null, savedAt: string | null) {
    lastSavedSnapshotRef.current = snapshot;
    setLastSavedSnapshot(snapshot);
    setLastSavedAt(savedAt);
  }

  function applyPayload(
    payload: AdminIngestionJobResponse,
    options?: { preserveLocalReviewSession?: boolean },
  ) {
    const nextReviewNotes = payload.job.review_notes ?? '';
    const nextSnapshot = buildReviewSessionSnapshot(payload.draft_json, nextReviewNotes);

    setData(payload);
    syncSavedSnapshot(nextSnapshot, payload.job.updated_at);
    setAutosaveError(null);

    if (!options?.preserveLocalReviewSession) {
      setDraft(payload.draft_json);
      setReviewNotes(nextReviewNotes);
    }

    if (payload.workflow.has_correction_document) {
      setCorrectionFile(null);
    }
  }

  function syncDraft(nextDraft: AdminIngestionDraft) {
    setDraft(nextDraft);
  }

  function updateDraft(
    mutator: (current: AdminIngestionDraft) => AdminIngestionDraft,
  ) {
    if (!draft) {
      return;
    }

    syncDraft(mutator(draft));
  }

  function handleIssueFocus(issue: AdminIngestionValidationIssue) {
    const nextSection = resolveIssueSection(issue);
    setActiveSection(nextSection);
    setFocusedIssueId(issue.id);

    window.setTimeout(() => {
      scrollToIssueTarget(issue);
    }, 80);
  }

  function updateSelectedStreams(nextCodes: string[]) {
    updateDraft((current) => {
      const normalizedCodes = Array.from(
        new Set(
          nextCodes
            .map((code) => code.trim().toUpperCase())
            .filter((code) => code.length > 0),
        ),
      );
      const currentMetadata = isRecord(current.exam.metadata)
        ? current.exam.metadata
        : {};
      const nextPrimary =
        normalizedCodes.find((code) => code === current.exam.streamCode) ??
        normalizedCodes[0] ??
        null;

      return {
        ...current,
        exam: {
          ...current.exam,
          streamCode: nextPrimary,
          metadata: mergeExamMetadata(currentMetadata, {
            sharedStreamCodes: normalizedCodes,
          }),
        },
      };
    });
  }

  async function refreshJob() {
    const payload = await fetchAdminJson<AdminIngestionJobResponse>(
      `/ingestion/jobs/${jobId}`,
    );
    applyPayload(payload);
    return payload;
  }

  async function saveDraft(options?: { autosave?: boolean }) {
    const autosave = options?.autosave ?? false;
    const draftToSave = latestDraftRef.current;
    const reviewNotesToSave = latestReviewNotesRef.current;
    const snapshotToSave = buildReviewSessionSnapshot(draftToSave, reviewNotesToSave);

    if (!draftToSave || !snapshotToSave) {
      throw new Error('Draft is not loaded yet.');
    }

    if (snapshotToSave === lastSavedSnapshotRef.current && data) {
      return data;
    }

    if (saveInFlightRef.current) {
      if (autosave) {
        queuedAutosaveRef.current = true;
        return saveInFlightRef.current;
      }

      try {
        await saveInFlightRef.current;
      } catch {
        // Fall through and retry with the latest local state.
      }

      return saveDraft(options);
    }

    if (autosave) {
      setAutosaving(true);
      setAutosaveError(null);
    } else {
      setSaving(true);
      setError(null);
      setNotice(null);
    }

    let saveSucceeded = false;

    const request = (async () => {
      try {
        const payload = await fetchAdminJson<AdminIngestionJobResponse>(
          `/ingestion/jobs/${jobId}`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              draft_json: draftToSave,
              review_notes: reviewNotesToSave,
            }),
          },
        );

        saveSucceeded = true;

        const latestSnapshot = buildReviewSessionSnapshot(
          latestDraftRef.current,
          latestReviewNotesRef.current,
        );
        const preserveLocalReviewSession = latestSnapshot !== snapshotToSave;

        applyPayload(payload, {
          preserveLocalReviewSession,
        });

        if (!autosave) {
          setNotice('Draft saved.');
        }

        if (preserveLocalReviewSession) {
          queuedAutosaveRef.current = true;
        }

        return payload;
      } catch (saveError) {
        const detail =
          saveError instanceof Error
            ? saveError.message
            : 'Failed to save draft.';

        if (autosave) {
          setAutosaveError(detail);
        } else {
          setError(detail);
        }

        throw new Error(detail);
      } finally {
        saveInFlightRef.current = null;

        if (autosave) {
          setAutosaving(false);
        } else {
          setSaving(false);
        }

        if (saveSucceeded) {
          const latestSnapshot = buildReviewSessionSnapshot(
            latestDraftRef.current,
            latestReviewNotesRef.current,
          );

          if (
            (queuedAutosaveRef.current ||
              (latestSnapshot &&
                latestSnapshot !== lastSavedSnapshotRef.current)) &&
            !saveInFlightRef.current
          ) {
            queuedAutosaveRef.current = false;
            window.setTimeout(() => {
              void saveDraft({
                autosave: true,
              }).catch(() => undefined);
            }, 0);
          } else {
            queuedAutosaveRef.current = false;
          }
        }
      }
    })();

    saveInFlightRef.current = request;
    return request;
  }

  useEffect(() => {
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    if (
      !reviewSessionSnapshot ||
      !lastSavedSnapshot ||
      reviewSessionSnapshot === lastSavedSnapshot ||
      saving ||
      autosaving ||
      processing ||
      attachingCorrection
    ) {
      return;
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      autosaveTimerRef.current = null;
      void saveDraft({
        autosave: true,
      }).catch(() => undefined);
    }, autosaveDelay);

    return () => {
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  // Autosave should react to draft state changes, not to the recreated helper identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    attachingCorrection,
    autosaveDelay,
    autosaving,
    lastSavedSnapshot,
    processing,
    reviewSessionSnapshot,
    saving,
  ]);

  async function processJob() {
    if (!workflow.can_process) {
      setError('Add the correction PDF before processing this job.');
      return;
    }

    const forceReprocess =
      workflow.review_started &&
      !window.confirm(
        'Reprocessing will rerun extraction and can replace reviewed draft edits. Continue?',
      )
        ? null
        : workflow.review_started;

    if (forceReprocess === null) {
      return;
    }

    setProcessing(true);
    setError(null);
    setNotice(null);

    try {
      const payload = await fetchAdminJson<AdminIngestionJobResponse>(
        `/ingestion/jobs/${jobId}/process`,
        {
          method: 'POST',
          body: JSON.stringify({
            force_reprocess: forceReprocess,
          }),
        },
      );

      applyPayload(payload);
      setNotice('Source pages and extraction draft refreshed.');
    } catch (processError) {
      setError(
        processError instanceof Error
          ? processError.message
          : 'Failed to process source PDFs.',
      );
    } finally {
      setProcessing(false);
    }
  }

  async function attachCorrection() {
    if (!correctionFile) {
      setError('Choose a correction PDF before uploading it.');
      return;
    }

    setAttachingCorrection(true);
    setError(null);
    setNotice(null);

    try {
      const payload = new FormData();
      payload.set('correction_pdf', correctionFile);
      const response = await fetchAdmin(`/ingestion/jobs/${jobId}/correction`, {
        method: 'POST',
        body: payload,
      });
      const nextPayload =
        (await response.json()) as AdminIngestionJobResponse;
      applyPayload(nextPayload);
      setNotice('Correction PDF attached. The job can now be processed.');
    } catch (attachError) {
      setError(
        attachError instanceof Error
          ? attachError.message
          : 'Failed to attach correction PDF.',
      );
    } finally {
      setAttachingCorrection(false);
    }
  }

  async function approveJob() {
    try {
      await saveDraft();
    } catch {
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const payload = await fetchAdminJson<AdminIngestionJobResponse>(
        `/ingestion/jobs/${jobId}/approve`,
        {
          method: 'POST',
        },
      );

      applyPayload(payload);
      setNotice('Draft approved.');
    } catch (approveError) {
      setError(
        approveError instanceof Error
          ? approveError.message
          : 'Failed to approve draft.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function approveAndPublish() {
    if (!data) {
      setError('Ingestion job is not loaded yet.');
      return;
    }

    try {
      await saveDraft();
    } catch {
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      let status = data.job.status;

      if (status !== 'approved' && status !== 'published') {
        const approvedPayload = await fetchAdminJson<AdminIngestionJobResponse>(
          `/ingestion/jobs/${jobId}/approve`,
          {
            method: 'POST',
          },
        );
        applyPayload(approvedPayload);
        status = approvedPayload.job.status;
      }

      if (status === 'approved' || status === 'published') {
        await fetchAdminJson(`/ingestion/jobs/${jobId}/publish`, {
          method: 'POST',
        });
        await refreshJob();
        setNotice(
          status === 'published'
            ? 'Draft published to live exam tables.'
            : 'Draft approved and published to live exam tables.',
        );
      }
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : 'Failed to approve and publish draft.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="panel">
        <p>Loading ingestion job…</p>
      </section>
    );
  }

  if (!data || !draft) {
    return (
      <section className="panel">
        <p className="error-text">{error ?? 'Ingestion job not found.'}</p>
      </section>
    );
  }

  const primaryActionLabel =
    data.job.status === 'approved' || data.job.status === 'published'
      ? 'Publish'
      : 'Approve & Publish';
  const isPublishedRevisionJob = data.job.provider === 'published_revision';
  const publishedExams = data.job.published_exams;
  const autosaveStatusMessage = autosaving
    ? 'Autosaving review session…'
    : saving
      ? 'Saving review session…'
      : autosaveError
        ? 'Autosave failed. Your latest edits are still only in this browser.'
        : hasUnsavedChanges
          ? 'Unsaved changes detected. Autosave will run shortly.'
          : formattedLastSavedAt
            ? `All review changes saved at ${formattedLastSavedAt}.`
            : 'Autosave is on for this review session.';
  const autosaveStatusClassName = autosaveError
    ? 'error-text'
    : autosaving || saving || hasUnsavedChanges
      ? 'muted-text'
      : 'success-text';

  return (
    <section className="panel">
      <div className="admin-page-head">
        <div>
          <p className="page-kicker">Admin CMS</p>
          <h1>{data.job.label}</h1>
          <p className="muted-text">
            {isPublishedRevisionJob
              ? 'Revise a published canonical paper with the same review editor used for ingestion, then validate and republish it.'
              : 'Review hierarchy, preview the final render, reconcile source assets, and publish from the canonical draft.'}
          </p>
        </div>
        <div className="table-actions ingestion-action-bar">
          {publishedExams.map((exam) => (
            <Link
              key={exam.id}
              href={`/admin/library?examId=${exam.id}`}
              className="btn-secondary"
            >
              {exam.is_primary ? `Open ${exam.stream_code} Exam` : exam.stream_code}
            </Link>
          ))}
          {!isPublishedRevisionJob ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={processJob}
              disabled={
                actionBusy || data.job.status === 'published' || !workflow.can_process
              }
            >
              {workflow.awaiting_correction
                ? 'Waiting for Correction'
                : processing
                  ? 'Processing…'
                  : workflow.review_started
                    ? 'Reprocess'
                    : 'Process PDFs'}
            </button>
          ) : null}
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              void saveDraft().catch(() => undefined);
            }}
            disabled={actionBusy}
          >
            Save Draft
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={approveJob}
            disabled={actionBusy || !validationSummary.can_approve}
          >
            Approve only
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={approveAndPublish}
            disabled={
              actionBusy ||
              !validationSummary.can_publish ||
              (!isPublishedRevisionJob && !workflow.has_correction_document)
            }
          >
            {primaryActionLabel}
          </button>
        </div>
      </div>

      <p className={autosaveStatusClassName}>{autosaveStatusMessage}</p>
      {error ? <p className="error-text">{error}</p> : null}
      {notice ? <p className="success-text">{notice}</p> : null}

      <div className="ingestion-review-section-nav" role="tablist" aria-label="Review sections">
        {(Object.keys(REVIEW_SECTION_LABELS) as ReviewSection[]).map((section) => (
          <button
            key={section}
            type="button"
            className={
              activeSection === section
                ? 'ingestion-section-chip active'
                : 'ingestion-section-chip'
            }
            onClick={() => {
              setActiveSection(section);
            }}
          >
            {REVIEW_SECTION_LABELS[section]}
            {issueCountBySection[section] > 0 ? (
              <span>{issueCountBySection[section]}</span>
            ) : null}
          </button>
        ))}
      </div>

      {activeSection === 'overview' ? (
        <section className="ingestion-section-panel">
        <div className="admin-workflow-grid">
          <article className="admin-workflow-card">
            <h3>Status</h3>
            <p>
              <span className={`status-chip ${data.job.status}`}>
                {data.job.status}
              </span>
            </p>
            {workflow.awaiting_correction ? (
              <p className="muted-text">Waiting for correction before processing.</p>
            ) : null}
            <p className="muted-text">Provider: {data.job.provider}</p>
          </article>
          <article className="admin-workflow-card">
            <h3>{isPublishedRevisionJob ? 'Revision Source' : 'Source Files'}</h3>
            {isPublishedRevisionJob ? (
              <>
                <p>Published canonical paper</p>
                <p>{publishedExams.length || 1} live offering(s)</p>
                <p className="muted-text">
                  This revision draft starts from live content, so PDF processing and
                  crop recovery are intentionally unavailable.
                </p>
              </>
            ) : (
              <>
                <p>{data.documents.length} documents</p>
                <p>{sourcePages.length} rasterized pages</p>
                <p className="muted-text">
                  Correction: {workflow.has_correction_document ? 'attached' : 'missing'}
                </p>
              </>
            )}
          </article>
          <article className="admin-workflow-card">
            <h3>Draft Assets</h3>
            <p>{draft.assets.length} reviewed asset regions</p>
            <p className="muted-text">
              Publish only reads reviewed data from this draft.
            </p>
          </article>
          <article className="admin-workflow-card">
            <h3>{isPublishedRevisionJob ? 'Imported Draft' : 'Extraction'}</h3>
            {isPublishedRevisionJob ? (
              <>
                <p>Loaded from the published paper hierarchy</p>
                <p>
                  Exercises: <strong>{extractionSummary?.exerciseCount ?? 0}</strong>{' '}
                  · Questions: <strong>{extractionSummary?.questionCount ?? 0}</strong>
                </p>
                <p className="muted-text">
                  The revision editor starts from the current live structure instead of
                  OCR output.
                </p>
              </>
            ) : (
              <>
                <p>
                  {extractionSummary?.engine ?? 'Unknown engine'}
                  {extractionSummary?.model ? ` · ${extractionSummary.model}` : ''}
                </p>
                <p>
                  Exercises: <strong>{extractionSummary?.exerciseCount ?? 0}</strong>{' '}
                  · Questions: <strong>{extractionSummary?.questionCount ?? 0}</strong>
                </p>
                <p className="muted-text">
                  Assets: <strong>{extractionSummary?.assetCount ?? 0}</strong> ·
                  Uncertainties:{' '}
                  <strong>{extractionSummary?.uncertaintyCount ?? 0}</strong>
                </p>
              </>
            )}
          </article>
          <article className="admin-workflow-card">
            <h3>Validation</h3>
            <p>
              Errors: <strong>{validationSummary.errors.length}</strong> · Warnings:{' '}
              <strong>{validationSummary.warnings.length}</strong>
            </p>
            <p className="muted-text">
              Approval and publish are blocked until errors reach zero.
            </p>
          </article>
          <article className="admin-workflow-card">
            <h3>Published Offerings</h3>
            {publishedExams.length ? (
              <>
                <p>{publishedExams.length} stream offering(s)</p>
                <div className="block-item-actions">
                  {publishedExams.map((exam) => (
                    <Link
                      key={exam.id}
                      href={`/admin/library?examId=${exam.id}`}
                      className="btn-secondary"
                    >
                      {exam.is_primary
                        ? `${exam.stream_code} · Primary`
                        : exam.stream_code}
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <p className="muted-text">
                Publish creates one exam offering per selected paper stream.
              </p>
            )}
          </article>
        </div>

        {validationSummary.issues.length ? (
          <section className="admin-validation-issue-grid">
            <article className="admin-validation-box">
              <strong>Blocking Validation Errors</strong>
              {validationSummary.issues
                .filter((issue) => issue.severity === 'error')
                .map((issue) => (
                  <button
                    key={issue.id}
                    type="button"
                    className={
                      issue.id === focusedIssueId
                        ? 'validation-issue-button active'
                        : 'validation-issue-button'
                    }
                    onClick={() => {
                      handleIssueFocus(issue);
                    }}
                  >
                    <strong>{issue.message}</strong>
                    <span>{formatIssueLocation(issue)}</span>
                  </button>
                ))}
            </article>

            <article className="admin-context-card">
              <strong>Validation Warnings</strong>
              {validationSummary.issues
                .filter((issue) => issue.severity === 'warning')
                .map((issue) => (
                  <button
                    key={issue.id}
                    type="button"
                    className={
                      issue.id === focusedIssueId
                        ? 'validation-issue-button active'
                        : 'validation-issue-button'
                    }
                    onClick={() => {
                      handleIssueFocus(issue);
                    }}
                  >
                    <strong>{issue.message}</strong>
                    <span>{formatIssueLocation(issue)}</span>
                  </button>
                ))}
            </article>
          </section>
        ) : null}

        {data.job.error_message ? (
          <article className="admin-validation-box">
            <strong>Importer error</strong>
            <p>{data.job.error_message}</p>
          </article>
        ) : null}

        {workflow.awaiting_correction ? (
          <section className="admin-context-card">
            <div className="admin-page-head ingestion-section-head">
              <div>
                <h2>Waiting for Correction</h2>
                <p className="muted-text">
                  Upload the correction PDF here, then process exam and correction
                  together in one pass.
                </p>
              </div>
            </div>

            <div className="admin-form-grid">
              <label className="field admin-form-wide">
                <span>Correction PDF</span>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) => {
                    setCorrectionFile(event.target.files?.[0] ?? null);
                  }}
                />
              </label>
            </div>

            <div className="block-item-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  void attachCorrection();
                }}
                disabled={actionBusy || !correctionFile}
              >
                {attachingCorrection ? 'Uploading…' : 'Attach Correction PDF'}
              </button>
            </div>
          </section>
        ) : null}
        </section>
      ) : null}

      {activeSection === 'metadata' ? (
        <section className="ingestion-section-panel">
        <section className="admin-form">
          <div className="admin-page-head ingestion-section-head">
            <div>
              <h2>Metadata Review</h2>
              <p className="muted-text">
                Keep paper metadata explicit before approval. Subject is controlled,
                and shared-paper streams are tracked together here.
              </p>
            </div>
          </div>

          <div className="admin-form-grid">
            <label className="field">
              <span>Year</span>
              <input
                type="number"
                value={draft.exam.year}
                onChange={(event) => {
                  const value = Number.parseInt(event.target.value, 10);
                  updateDraft((current) => ({
                    ...current,
                    exam: {
                      ...current.exam,
                      year: Number.isInteger(value) ? value : current.exam.year,
                    },
                  }));
                }}
              />
            </label>

            <label className="field">
              <span>Subject Code</span>
              <select
                value={draft.exam.subjectCode ?? ''}
                onChange={(event) => {
                  updateDraft((current) => ({
                    ...current,
                    exam: {
                      ...current.exam,
                      subjectCode: event.target.value || null,
                    },
                  }));
                }}
              >
                <option value="">Select subject</option>
                {INGESTION_SUBJECT_OPTIONS.map(([code, label]) => (
                  <option key={code} value={code}>
                    {code} · {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Session</span>
              <select
                value={draft.exam.sessionType}
                onChange={(event) => {
                  updateDraft((current) => ({
                    ...current,
                    exam: {
                      ...current.exam,
                      sessionType: event.target.value as 'NORMAL' | 'MAKEUP',
                    },
                  }));
                }}
              >
                <option value="NORMAL">Normal</option>
                <option value="MAKEUP">Rattrapage</option>
              </select>
            </label>

            {selectedStreamCodes.length > 1 ? (
              <label className="field">
                <span>Primary Exam Offering Stream</span>
                <select
                  value={draft.exam.streamCode ?? selectedStreamCodes[0]}
                  onChange={(event) => {
                    updateDraft((current) => ({
                      ...current,
                      exam: {
                        ...current.exam,
                        streamCode: event.target.value || null,
                      },
                    }));
                  }}
                >
                  {selectedStreamCodes.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="field">
                <span>Primary Exam Offering Stream</span>
                <input value={draft.exam.streamCode ?? ''} readOnly />
              </label>
            )}

            <label className="field admin-form-wide">
              <span>Paper Streams</span>
              <div className="ingestion-stream-checkbox-grid">
                {INGESTION_STREAM_OPTIONS.map(([code, label]) => {
                  const checked = selectedStreamCodes.includes(code);

                  return (
                    <label
                      key={code}
                      className={
                        checked
                          ? 'ingestion-stream-option active'
                          : 'ingestion-stream-option'
                      }
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          updateSelectedStreams(
                            event.target.checked
                              ? [...selectedStreamCodes, code]
                              : selectedStreamCodes.filter(
                                  (streamCode) => streamCode !== code,
                                ),
                          );
                        }}
                      />
                      <span>{code}</span>
                      <small>{label}</small>
                    </label>
                  );
                })}
              </div>
              <small className="muted-text">
                These PDFs are the provenance of the shared paper. Publish creates
                one exam offering per selected stream, and the primary stream keeps
                the default job-level exam link stable.
              </small>
            </label>
          </div>
        </section>
        </section>
      ) : null}

      {activeSection === 'structure' ? (
        <section className="ingestion-section-panel">
        <AdminIngestionStructureEditor
          jobId={jobId}
          draft={draft}
          sourcePages={sourcePages}
          assetPreviewBaseUrl={data.asset_preview_base_url}
          issues={validationSummary.issues}
          focusRequest={activeSection === 'structure' ? focusRequest : null}
          onChange={syncDraft}
        />
        </section>
      ) : null}

      {activeSection === 'sources' ? (
        <section className="ingestion-section-panel">
        <div className="admin-workflow-grid">
          {data.documents.length ? (
            data.documents.map((document) => (
              <article key={document.id} className="admin-context-card">
                <h3>
                  {document.kind === 'correction' ? 'Correction PDF' : 'Exam PDF'}
                </h3>
                <p>{document.file_name}</p>
                <p className="muted-text">
                  {document.page_count ?? 0} pages
                  {document.source_url ? ` · ${document.source_url}` : ''}
                </p>
                <p>
                  <a href={document.download_url} target="_blank" rel="noreferrer">
                    Open source PDF
                  </a>
                </p>
              </article>
            ))
          ) : (
            <article className="admin-context-card">
              <h3>No source PDFs attached</h3>
              <p className="muted-text">
                {isPublishedRevisionJob
                  ? 'This draft was created from the live published paper. Start a new ingestion job if you need source-page processing or crop-based asset recovery.'
                  : 'Attach and process the exam source files before reviewing this section.'}
              </p>
            </article>
          )}
        </div>

        <section className="admin-context-card">
          <div className="admin-page-head ingestion-section-head">
            <div>
              <h2>Source Pages</h2>
              <p className="muted-text">
                Browse the rasterized pages separately from structure editing.
              </p>
            </div>
          </div>

          <div className="ingestion-page-list">
            {data.documents.some((document) => document.pages.length > 0) ? (
              data.documents.map((document) =>
                document.pages.map((page) => (
                  <article
                    key={page.id}
                    className="ingestion-page-card"
                    id={`source-page-${page.id}`}
                  >
                    <div className="ingestion-section-head">
                      <div>
                        <strong>
                          {document.kind === 'correction' ? 'Correction' : 'Exam'} page{' '}
                          {page.page_number}
                        </strong>
                        <p className="muted-text">
                          {page.width} × {page.height}
                        </p>
                      </div>
                    </div>

                    <figure className="ingestion-preview-card">
                      <img
                        src={page.image_url}
                        alt={`${document.kind} page ${page.page_number}`}
                      />
                      <figcaption>Stored source page</figcaption>
                    </figure>
                  </article>
                )),
              )
            ) : (
              <p className="muted-text">
                {isPublishedRevisionJob
                  ? 'Published revisions do not include rasterized source pages.'
                  : 'No rasterized pages are available for this job yet.'}
              </p>
            )}
          </div>
        </section>
        </section>
      ) : null}

      {activeSection === 'assets' ? (
        <section className="ingestion-section-panel">
        <AdminIngestionAssetWorkspace
          draft={draft}
          sourcePages={sourcePages}
          assetPreviewBaseUrl={data.asset_preview_base_url}
          focusedAssetId={activeSection === 'assets' ? focusedIssue?.assetId ?? null : null}
          focusedSourcePageId={
            activeSection === 'assets' ? focusedIssue?.sourcePageId ?? null : null
          }
          onChange={syncDraft}
        />
        </section>
      ) : null}
    </section>
  );
}
