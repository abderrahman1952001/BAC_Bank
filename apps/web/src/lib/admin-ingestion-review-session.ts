import { useEffect, useRef, useState } from 'react';
import type { AdminIngestionDraft, AdminIngestionJobResponse } from '@/lib/admin';
import { fetchAdmin, fetchAdminJson } from '@/lib/admin';
import { buildReviewSessionSnapshot } from '@/lib/admin-ingestion-review';

type ReviewJobStatus = AdminIngestionJobResponse['job']['status'];

export function hasActiveReviewWorker(jobStatus: ReviewJobStatus | null | undefined) {
  return jobStatus === 'queued' || jobStatus === 'processing';
}

export function buildAppliedReviewPayloadState({
  payload,
  preserveLocalReviewSession,
  currentDraft,
  currentReviewNotes,
}: {
  payload: AdminIngestionJobResponse;
  preserveLocalReviewSession: boolean;
  currentDraft: AdminIngestionDraft | null;
  currentReviewNotes: string;
}) {
  const nextReviewNotes = payload.job.review_notes ?? '';
  const nextSnapshot = buildReviewSessionSnapshot(payload.draft_json, nextReviewNotes);

  return {
    data: payload,
    draft:
      preserveLocalReviewSession && currentDraft
        ? currentDraft
        : payload.draft_json,
    reviewNotes: preserveLocalReviewSession
      ? currentReviewNotes
      : nextReviewNotes,
    lastSavedSnapshot: nextSnapshot,
    lastSavedAt: payload.job.updated_at,
    clearCorrectionFile: payload.workflow.has_correction_document,
  };
}

export function resolveReviewSavePlan({
  draft,
  snapshot,
  jobStatus,
  hasData,
  lastSavedSnapshot,
}: {
  draft: AdminIngestionDraft | null;
  snapshot: string | null;
  jobStatus: ReviewJobStatus | null | undefined;
  hasData: boolean;
  lastSavedSnapshot: string | null;
}) {
  if (!draft || !snapshot) {
    return 'missing' as const;
  }

  if (hasActiveReviewWorker(jobStatus)) {
    return 'blocked' as const;
  }

  if (snapshot === lastSavedSnapshot && hasData) {
    return 'unchanged' as const;
  }

  return 'save' as const;
}

export function shouldWarnBeforeUnload({
  snapshot,
  lastSavedSnapshot,
  hasSaveInFlight,
}: {
  snapshot: string | null;
  lastSavedSnapshot: string | null;
  hasSaveInFlight: boolean;
}) {
  return Boolean(
    snapshot && (snapshot !== lastSavedSnapshot || hasSaveInFlight),
  );
}

export function shouldScheduleReviewAutosave({
  reviewSessionSnapshot,
  lastSavedSnapshot,
  saving,
  autosaving,
  processing,
  jobStatus,
  attachingCorrection,
}: {
  reviewSessionSnapshot: string | null;
  lastSavedSnapshot: string | null;
  saving: boolean;
  autosaving: boolean;
  processing: boolean;
  jobStatus: ReviewJobStatus | null | undefined;
  attachingCorrection: boolean;
}) {
  if (
    !reviewSessionSnapshot ||
    !lastSavedSnapshot ||
    reviewSessionSnapshot === lastSavedSnapshot ||
    saving ||
    autosaving ||
    processing ||
    attachingCorrection
  ) {
    return false;
  }

  return !hasActiveReviewWorker(jobStatus);
}

export function shouldTriggerQueuedReviewAutosave({
  queuedAutosave,
  latestSnapshot,
  lastSavedSnapshot,
}: {
  queuedAutosave: boolean;
  latestSnapshot: string | null;
  lastSavedSnapshot: string | null;
}) {
  return Boolean(
    queuedAutosave ||
      (latestSnapshot && latestSnapshot !== lastSavedSnapshot),
  );
}

export function useAdminIngestionReviewSession({ jobId }: { jobId: string }) {
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
  const [correctionFile, setCorrectionFile] = useState<File | null>(null);
  const latestDraftRef = useRef<AdminIngestionDraft | null>(null);
  const latestReviewNotesRef = useRef('');
  const autosaveTimerRef = useRef<number | null>(null);
  const saveInFlightRef = useRef<Promise<AdminIngestionJobResponse> | null>(null);
  const queuedAutosaveRef = useRef(false);
  const lastSavedSnapshotRef = useRef<string | null>(null);

  useEffect(() => {
    latestDraftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    latestReviewNotesRef.current = reviewNotes;
  }, [reviewNotes]);

  function applyPayload(
    payload: AdminIngestionJobResponse,
    options?: { preserveLocalReviewSession?: boolean },
  ) {
    const applied = buildAppliedReviewPayloadState({
      payload,
      preserveLocalReviewSession: options?.preserveLocalReviewSession ?? false,
      currentDraft: latestDraftRef.current,
      currentReviewNotes: latestReviewNotesRef.current,
    });

    setData(applied.data);
    lastSavedSnapshotRef.current = applied.lastSavedSnapshot;
    setLastSavedSnapshot(applied.lastSavedSnapshot);
    setLastSavedAt(applied.lastSavedAt);
    setAutosaveError(null);
    setDraft(applied.draft);
    setReviewNotes(applied.reviewNotes);

    if (applied.clearCorrectionFile) {
      setCorrectionFile(null);
    }
  }

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
  }, [jobId]);

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
        shouldWarnBeforeUnload({
          snapshot,
          lastSavedSnapshot: lastSavedSnapshotRef.current,
          hasSaveInFlight: Boolean(saveInFlightRef.current),
        })
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

  useEffect(() => {
    if (!hasActiveReviewWorker(data?.job.status)) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void fetchAdminJson<AdminIngestionJobResponse>(`/ingestion/jobs/${jobId}`)
        .then((payload) => {
          applyPayload(payload);
        })
        .catch(() => undefined);
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [data?.job.status, jobId]);

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
    const savePlan = resolveReviewSavePlan({
      draft: draftToSave,
      snapshot: snapshotToSave,
      jobStatus: data?.job.status,
      hasData: Boolean(data),
      lastSavedSnapshot: lastSavedSnapshotRef.current,
    });

    if (savePlan === 'missing') {
      throw new Error('Draft is not loaded yet.');
    }

    if (savePlan === 'blocked' || savePlan === 'unchanged') {
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
            shouldTriggerQueuedReviewAutosave({
              queuedAutosave: queuedAutosaveRef.current,
              latestSnapshot,
              lastSavedSnapshot: lastSavedSnapshotRef.current,
            }) &&
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

  const reviewSessionSnapshot = buildReviewSessionSnapshot(draft, reviewNotes);
  const autosaveDelay = autosaveError ? 5000 : 1400;

  useEffect(() => {
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    if (
      !shouldScheduleReviewAutosave({
        reviewSessionSnapshot,
        lastSavedSnapshot,
        saving,
        autosaving,
        processing,
        jobStatus: data?.job.status,
        attachingCorrection,
      })
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
  // Autosave should react to review-session changes, not to the recreated save helper identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    attachingCorrection,
    autosaveDelay,
    autosaving,
    data?.job.status,
    lastSavedSnapshot,
    processing,
    reviewSessionSnapshot,
    saving,
  ]);

  async function processJob(
    workflow: Pick<
      AdminIngestionJobResponse['workflow'],
      'can_process' | 'review_started'
    >,
  ) {
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
      setNotice(
        'Background processing queued. This page will refresh automatically when the worker updates the draft.',
      );
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

  return {
    data,
    draft,
    loading,
    saving,
    autosaving,
    processing,
    attachingCorrection,
    error,
    notice,
    autosaveError,
    lastSavedSnapshot,
    lastSavedAt,
    correctionFile,
    reviewNotes,
    setReviewNotes,
    setCorrectionFile,
    syncDraft,
    updateDraft,
    saveDraft,
    processJob,
    attachCorrection,
    approveJob,
    approveAndPublish,
  };
}
