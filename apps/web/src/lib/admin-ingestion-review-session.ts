import { useEffect, useRef, useState } from "react";
import type { UpdateIngestionJobPayload } from "@bac-bank/contracts/ingestion";
import type {
  AdminIngestionDraft,
  AdminIngestionJobResponse,
} from "@/lib/admin";
import {
  fetchAdmin,
  fetchAdminJson,
  parseAdminIngestionJobResponse,
  parseUpdateIngestionJobPayload,
} from "@/lib/admin";
import {
  buildProcessConfirmationMessage,
  buildProcessRequestPayload,
} from "@/lib/admin-ingestion-review";

type ReviewJobStatus = AdminIngestionJobResponse["job"]["status"];

export function hasActiveReviewWorker(
  jobStatus: ReviewJobStatus | null | undefined,
) {
  return jobStatus === "queued" || jobStatus === "processing";
}

function coerceInteger(value: unknown, fallback?: number): number | undefined {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (/^-?\d+$/u.test(trimmed)) {
      return Number.parseInt(trimmed, 10);
    }
  }

  return fallback;
}

export function normalizeReviewDraftForAutosave(
  draft: AdminIngestionDraft | null,
  fallback?: {
    year?: number;
    minYear?: number;
  },
) {
  if (!draft) {
    return null;
  }

  const year = coerceInteger(draft.exam.year, fallback?.year);
  const minYear = coerceInteger(draft.exam.minYear, fallback?.minYear);

  if (
    typeof year === "number" &&
    typeof minYear === "number" &&
    year === draft.exam.year &&
    minYear === draft.exam.minYear
  ) {
    return draft;
  }

  return {
    ...draft,
    exam: {
      ...draft.exam,
      year: year ?? fallback?.year ?? 0,
      minYear: minYear ?? fallback?.minYear ?? year ?? 0,
    },
  };
}

export function hasUnsavedReviewSessionChanges({
  localRevision,
  lastSavedRevision,
}: {
  localRevision: number;
  lastSavedRevision: number | null;
}) {
  return lastSavedRevision !== null && localRevision !== lastSavedRevision;
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
  const nextReviewNotes = payload.job.review_notes ?? "";
  const normalizedServerDraft = normalizeReviewDraftForAutosave(
    payload.draft_json,
    {
      year: payload.job.year,
      minYear: payload.job.min_year,
    },
  );
  const preservedLocalReviewSession =
    preserveLocalReviewSession && currentDraft !== null;

  return {
    data: payload,
    draft: preservedLocalReviewSession
      ? normalizeReviewDraftForAutosave(currentDraft, {
          year: payload.job.year,
          minYear: payload.job.min_year,
        })
      : normalizedServerDraft,
    reviewNotes: preservedLocalReviewSession
      ? currentReviewNotes
      : nextReviewNotes,
    preservedLocalReviewSession,
    lastSavedAt: payload.job.updated_at,
    clearCorrectionFile: payload.workflow.has_correction_document,
  };
}

export function resolveReviewSavePlan({
  draft,
  hasUnsavedChanges,
  jobStatus,
  hasData,
}: {
  draft: AdminIngestionDraft | null;
  hasUnsavedChanges: boolean;
  jobStatus: ReviewJobStatus | null | undefined;
  hasData: boolean;
}) {
  if (!draft) {
    return "missing" as const;
  }

  if (hasActiveReviewWorker(jobStatus)) {
    return "blocked" as const;
  }

  if (jobStatus === "published") {
    return "frozen" as const;
  }

  if (!hasUnsavedChanges && hasData) {
    return "unchanged" as const;
  }

  return "save" as const;
}

export function shouldWarnBeforeUnload({
  hasUnsavedChanges,
  hasSaveInFlight,
}: {
  hasUnsavedChanges: boolean;
  hasSaveInFlight: boolean;
}) {
  return hasUnsavedChanges || hasSaveInFlight;
}

export function shouldScheduleReviewAutosave({
  hasUnsavedChanges,
  saving,
  autosaving,
  processing,
  jobStatus,
  attachingCorrection,
}: {
  hasUnsavedChanges: boolean;
  saving: boolean;
  autosaving: boolean;
  processing: boolean;
  jobStatus: ReviewJobStatus | null | undefined;
  attachingCorrection: boolean;
}) {
  if (
    !hasUnsavedChanges ||
    saving ||
    autosaving ||
    processing ||
    attachingCorrection
  ) {
    return false;
  }

  if (jobStatus === "published") {
    return false;
  }

  return !hasActiveReviewWorker(jobStatus);
}

export function shouldTriggerQueuedReviewAutosave({
  queuedAutosave,
  hasUnsavedChanges,
}: {
  queuedAutosave: boolean;
  hasUnsavedChanges: boolean;
}) {
  return queuedAutosave || hasUnsavedChanges;
}

export function buildInitialReviewSessionState(
  initialPayload?: AdminIngestionJobResponse,
) {
  if (!initialPayload) {
    return {
      data: null,
      draft: null,
      reviewNotes: "",
      loading: true,
      localRevision: 0,
      lastSavedRevision: null,
      lastSavedAt: null,
    };
  }

  const applied = buildAppliedReviewPayloadState({
    payload: initialPayload,
    preserveLocalReviewSession: false,
    currentDraft: null,
    currentReviewNotes: "",
  });

  return {
    data: applied.data,
    draft: applied.draft,
    reviewNotes: applied.reviewNotes,
    loading: false,
    localRevision: 1,
    lastSavedRevision: 1,
    lastSavedAt: applied.lastSavedAt,
  };
}

export function useAdminIngestionReviewSession({
  jobId,
  initialPayload,
}: {
  jobId: string;
  initialPayload?: AdminIngestionJobResponse;
}) {
  const initialState = buildInitialReviewSessionState(initialPayload);
  const [data, setData] = useState<AdminIngestionJobResponse | null>(
    initialState.data,
  );
  const [draft, setDraft] = useState<AdminIngestionDraft | null>(
    initialState.draft,
  );
  const [reviewNotesState, setReviewNotesState] = useState(
    initialState.reviewNotes,
  );
  const [loading, setLoading] = useState(initialState.loading);
  const [saving, setSaving] = useState(false);
  const [autosaving, setAutosaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [attachingCorrection, setAttachingCorrection] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [autosaveError, setAutosaveError] = useState<string | null>(null);
  const [localRevision, setLocalRevision] = useState(
    initialState.localRevision,
  );
  const [lastSavedRevision, setLastSavedRevision] = useState<number | null>(
    initialState.lastSavedRevision,
  );
  const [lastSavedAt, setLastSavedAt] = useState<string | Date | null>(
    initialState.lastSavedAt,
  );
  const [correctionFile, setCorrectionFile] = useState<File | null>(null);
  const latestDraftRef = useRef<AdminIngestionDraft | null>(initialState.draft);
  const latestReviewNotesRef = useRef(initialState.reviewNotes);
  const localRevisionRef = useRef(initialState.localRevision);
  const autosaveTimerRef = useRef<number | null>(null);
  const saveInFlightRef = useRef<Promise<AdminIngestionJobResponse> | null>(
    null,
  );
  const queuedAutosaveRef = useRef(false);
  const lastSavedRevisionRef = useRef<number | null>(
    initialState.lastSavedRevision,
  );
  const hydratedInitialPayloadJobIdRef = useRef<string | null>(
    initialPayload?.job.id ?? null,
  );

  function setCurrentRevision(nextRevision: number) {
    localRevisionRef.current = nextRevision;
    setLocalRevision(nextRevision);
  }

  function setSavedRevision(nextRevision: number | null) {
    lastSavedRevisionRef.current = nextRevision;
    setLastSavedRevision(nextRevision);
  }

  function bumpLocalRevision() {
    const nextRevision = localRevisionRef.current + 1;
    setCurrentRevision(nextRevision);
    return nextRevision;
  }

  function replaceLocalReviewSession(
    nextDraft: AdminIngestionDraft | null,
    nextReviewNotes: string,
  ) {
    latestDraftRef.current = nextDraft;
    latestReviewNotesRef.current = nextReviewNotes;
    setDraft(nextDraft);
    setReviewNotesState(nextReviewNotes);
    const nextRevision = localRevisionRef.current + 1;
    setCurrentRevision(nextRevision);
    setSavedRevision(nextRevision);
  }

  function applyPayload(
    payload: AdminIngestionJobResponse,
    options?: {
      preserveLocalReviewSession?: boolean;
      savedRevision?: number | null;
    },
  ) {
    const applied = buildAppliedReviewPayloadState({
      payload,
      preserveLocalReviewSession: options?.preserveLocalReviewSession ?? false,
      currentDraft: latestDraftRef.current,
      currentReviewNotes: latestReviewNotesRef.current,
    });

    setData(applied.data);
    setLastSavedAt(applied.lastSavedAt);
    setAutosaveError(null);

    if (applied.clearCorrectionFile) {
      setCorrectionFile(null);
    }

    if (applied.preservedLocalReviewSession) {
      setSavedRevision(options?.savedRevision ?? localRevisionRef.current);
      return;
    }

    replaceLocalReviewSession(applied.draft, applied.reviewNotes);
  }

  useEffect(() => {
    if (initialPayload?.job.id === jobId) {
      if (hydratedInitialPayloadJobIdRef.current !== jobId) {
        setError(null);
        setNotice(null);
        applyPayload(initialPayload);
        hydratedInitialPayloadJobIdRef.current = jobId;
      }

      setLoading(false);
      return;
    }

    hydratedInitialPayloadJobIdRef.current = null;
    const controller = new AbortController();

    async function loadJob() {
      setLoading(true);
      setError(null);
      setNotice(null);

      try {
        const payload = await fetchAdminJson<AdminIngestionJobResponse>(
          `/ingestion/jobs/${jobId}`,
          {
            signal: controller.signal,
          },
          parseAdminIngestionJobResponse,
        );

        applyPayload(payload);
      } catch (loadError) {
        if (!(loadError instanceof Error) || loadError.name !== "AbortError") {
          setError("Failed to load ingestion job.");
        }
      } finally {
        setLoading(false);
      }
    }

    void loadJob();

    return () => {
      controller.abort();
    };
    // Loading is keyed by job id; we intentionally avoid depending on the recreated applyPayload helper.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPayload, jobId]);

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (
        shouldWarnBeforeUnload({
          hasUnsavedChanges: hasUnsavedReviewSessionChanges({
            localRevision: localRevisionRef.current,
            lastSavedRevision: lastSavedRevisionRef.current,
          }),
          hasSaveInFlight: Boolean(saveInFlightRef.current),
        })
      ) {
        event.preventDefault();
        event.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    if (!hasActiveReviewWorker(data?.job.status)) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void fetchAdminJson<AdminIngestionJobResponse>(
        `/ingestion/jobs/${jobId}`,
        undefined,
        parseAdminIngestionJobResponse,
      )
        .then((payload) => {
          applyPayload(payload);
        })
        .catch(() => undefined);
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
    // Polling is keyed by job status and id; we intentionally avoid depending on the recreated applyPayload helper.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.job.status, jobId]);

  async function saveDraft(options?: { autosave?: boolean }) {
    const autosave = options?.autosave ?? false;
    const draftToSave = normalizeReviewDraftForAutosave(
      latestDraftRef.current,
      {
        year: data?.job.year,
        minYear: data?.job.min_year,
      },
    );
    const reviewNotesToSave = latestReviewNotesRef.current;
    const revisionToSave = localRevisionRef.current;
    const savePlan = resolveReviewSavePlan({
      draft: draftToSave,
      hasUnsavedChanges: hasUnsavedReviewSessionChanges({
        localRevision: revisionToSave,
        lastSavedRevision: lastSavedRevisionRef.current,
      }),
      jobStatus: data?.job.status,
      hasData: Boolean(data),
    });

    if (savePlan === "missing") {
      throw new Error("Draft is not loaded yet.");
    }

    if (savePlan === "blocked") {
      if (!autosave) {
        setError(
          "Queued or active ingestion jobs cannot be edited until processing finishes.",
        );
        setNotice(null);
      }

      return data;
    }

    if (savePlan === "frozen") {
      if (!autosave) {
        setError(
          "Published ingestion jobs are frozen. Start a revision from the live library to make further changes.",
        );
        setNotice(null);
      }

      return data;
    }

    if (savePlan === "unchanged") {
      if (!autosave) {
        setError(null);
        setNotice("All changes are already saved.");
      }

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
        const body: UpdateIngestionJobPayload = parseUpdateIngestionJobPayload({
          draft_json: draftToSave ?? undefined,
          review_notes: reviewNotesToSave,
        });
        const payload = await fetchAdminJson<AdminIngestionJobResponse>(
          `/ingestion/jobs/${jobId}`,
          {
            method: "PATCH",
            body: JSON.stringify(body),
          },
          parseAdminIngestionJobResponse,
        );

        saveSucceeded = true;

        const preserveLocalReviewSession =
          localRevisionRef.current !== revisionToSave;

        applyPayload(payload, {
          preserveLocalReviewSession,
          savedRevision: revisionToSave,
        });

        if (!autosave) {
          setNotice(
            data?.job.draft_kind === "revision"
              ? "Revision saved."
              : "Draft saved.",
          );
        }

        if (preserveLocalReviewSession) {
          queuedAutosaveRef.current = true;
        }

        return payload;
      } catch (saveError) {
        const detail =
          saveError instanceof Error
            ? saveError.message
            : "Failed to save draft.";

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
          const latestHasUnsavedChanges = hasUnsavedReviewSessionChanges({
            localRevision: localRevisionRef.current,
            lastSavedRevision: lastSavedRevisionRef.current,
          });

          if (
            shouldTriggerQueuedReviewAutosave({
              queuedAutosave: queuedAutosaveRef.current,
              hasUnsavedChanges: latestHasUnsavedChanges,
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

  const hasUnsavedChanges = hasUnsavedReviewSessionChanges({
    localRevision,
    lastSavedRevision,
  });
  const autosaveDelay = autosaveError ? 5000 : 1400;

  useEffect(() => {
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    if (
      !shouldScheduleReviewAutosave({
        hasUnsavedChanges,
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
    hasUnsavedChanges,
    processing,
    saving,
  ]);

  async function processJob(
    workflow: Pick<
      AdminIngestionJobResponse["workflow"],
      "can_process" | "review_started"
    >,
  ) {
    if (!workflow.can_process) {
      setError("Add the correction PDF before processing this job.");
      return;
    }

    const confirmationMessage = buildProcessConfirmationMessage({
      workflow,
      jobStatus: data?.job.status ?? "draft",
    });

    if (confirmationMessage && !window.confirm(confirmationMessage)) {
      return;
    }

    setProcessing(true);
    setError(null);
    setNotice(null);

    try {
      const payload = await fetchAdminJson<AdminIngestionJobResponse>(
        `/ingestion/jobs/${jobId}/process`,
        {
          method: "POST",
          body: JSON.stringify(
            buildProcessRequestPayload({
              workflow,
              jobStatus: data?.job.status ?? "draft",
            }),
          ),
        },
        parseAdminIngestionJobResponse,
      );

      applyPayload(payload);
      setNotice(
        "Background processing queued. This page will refresh automatically when the worker updates the draft.",
      );
    } catch (processError) {
      setError(
        processError instanceof Error
          ? processError.message
          : "Failed to process source PDFs.",
      );
    } finally {
      setProcessing(false);
    }
  }

  async function attachCorrection() {
    if (!correctionFile) {
      setError("Choose a correction PDF before uploading it.");
      return;
    }

    setAttachingCorrection(true);
    setError(null);
    setNotice(null);

    try {
      const payload = new FormData();
      payload.set("correction_pdf", correctionFile);
      const response = await fetchAdmin(`/ingestion/jobs/${jobId}/correction`, {
        method: "POST",
        body: payload,
      });
      const nextPayload = parseAdminIngestionJobResponse(await response.json());
      applyPayload(nextPayload);
      setNotice("Correction PDF attached. The job can now be processed.");
    } catch (attachError) {
      setError(
        attachError instanceof Error
          ? attachError.message
          : "Failed to attach correction PDF.",
      );
    } finally {
      setAttachingCorrection(false);
    }
  }

  async function approveJob() {
    try {
      const savedPayload = await saveDraft();
      const status = savedPayload?.job.status ?? data?.job.status;

      if (status === "published") {
        setError(
          "Published ingestion jobs are frozen. Start a revision from the live library to make further changes.",
        );
        return;
      }

      if (status === "approved") {
        setNotice(
          data?.job.draft_kind === "revision"
            ? "Revision already approved."
            : "Draft already approved.",
        );
        return;
      }
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
          method: "POST",
        },
        parseAdminIngestionJobResponse,
      );

      applyPayload(payload);
      setNotice(
        data?.job.draft_kind === "revision"
          ? "Revision approved."
          : "Draft approved.",
      );
    } catch (approveError) {
      setError(
        approveError instanceof Error
          ? approveError.message
          : "Failed to approve draft.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function approveAndPublish() {
    if (!data) {
      setError("Ingestion job is not loaded yet.");
      return;
    }

    let status = data.job.status;

    try {
      const savedPayload = await saveDraft();
      status = savedPayload?.job.status ?? data.job.status;

      if (status === "published") {
        setError(
          "Published ingestion jobs are frozen. Start a revision from the live library to make further changes.",
        );
        return;
      }
    } catch {
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      if (status !== "approved") {
        const approvedPayload = await fetchAdminJson<AdminIngestionJobResponse>(
          `/ingestion/jobs/${jobId}/approve`,
          {
            method: "POST",
          },
          parseAdminIngestionJobResponse,
        );
        applyPayload(approvedPayload);
        status = approvedPayload.job.status;
      }

      if (status === "approved") {
        const queuedPayload = await fetchAdminJson<AdminIngestionJobResponse>(
          `/ingestion/jobs/${jobId}/publish`,
          {
            method: "POST",
          },
          parseAdminIngestionJobResponse,
        );
        applyPayload(queuedPayload);
        setNotice(
          data.job.draft_kind === "revision"
            ? "Background publication queued. This page will refresh automatically when the worker publishes the revision."
            : "Background publication queued. This page will refresh automatically when the worker publishes the draft.",
        );
      }
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : "Failed to approve and publish draft.",
      );
    } finally {
      setSaving(false);
    }
  }

  function syncDraft(nextDraft: AdminIngestionDraft) {
    latestDraftRef.current = nextDraft;
    setDraft(nextDraft);
    bumpLocalRevision();
  }

  function updateDraft(
    mutator: (current: AdminIngestionDraft) => AdminIngestionDraft,
  ) {
    const currentDraft = latestDraftRef.current;

    if (!currentDraft) {
      return;
    }

    syncDraft(mutator(currentDraft));
  }

  function setReviewNotes(nextReviewNotes: string) {
    latestReviewNotesRef.current = nextReviewNotes;
    setReviewNotesState(nextReviewNotes);
    bumpLocalRevision();
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
    hasUnsavedChanges,
    lastSavedAt,
    correctionFile,
    reviewNotes: reviewNotesState,
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
