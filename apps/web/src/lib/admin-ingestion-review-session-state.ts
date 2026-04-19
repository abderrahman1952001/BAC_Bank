import type {
  AdminIngestionDraft,
  AdminIngestionJobResponse,
} from "@/lib/admin";

export type ReviewJobStatus = AdminIngestionJobResponse["job"]["status"];

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
