import type {
  AdminIngestionDraft,
  AdminIngestionJobResponse,
  AdminIngestionValidationIssue,
} from "@/lib/admin";
import { readDraftSelectedStreamCodes } from "@/lib/admin-ingestion-structure-review";
import { isRecord } from "@/lib/admin-ingestion-structure-shared";
import type { IngestionEditorFocusRequest } from "@/lib/admin-ingestion-editor-state";

export type ReviewSection =
  | "overview"
  | "metadata"
  | "structure"
  | "sources"
  | "assets";

export const REVIEW_SECTION_LABELS: Record<ReviewSection, string> = {
  overview: "Overview",
  metadata: "Metadata",
  structure: "Structure",
  sources: "Sources",
  assets: "Assets",
};

export function formatIssueLocation(issue: AdminIngestionValidationIssue) {
  const parts: string[] = [];

  if (issue.variantCode) {
    parts.push(issue.variantCode.replace("_", " "));
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

  return parts.length ? parts.join(" · ") : issue.target;
}

export function scrollToIssueTarget(issue: AdminIngestionValidationIssue) {
  const targetIds = [
    issue.blockId ? `preview-block-${issue.blockId}` : null,
    issue.nodeId ? `tree-node-${issue.nodeId}` : null,
    issue.assetId ? `asset-library-${issue.assetId}` : null,
    issue.sourcePageId ? `source-page-${issue.sourcePageId}` : null,
    "ingestion-structure-editor",
  ].filter((value): value is string => Boolean(value));

  window.requestAnimationFrame(() => {
    for (const targetId of targetIds) {
      const element = document.getElementById(targetId);

      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        return;
      }
    }
  });
}

export function resolveIssueSection(
  issue: AdminIngestionValidationIssue,
): ReviewSection {
  if (issue.sourcePageId) {
    return "sources";
  }

  if (issue.assetId) {
    return "assets";
  }

  if (issue.blockId || issue.nodeId || issue.variantCode) {
    return "structure";
  }

  if (
    issue.field === "paperStreamCodes" ||
    issue.field === "streamCode" ||
    issue.field === "subjectCode"
  ) {
    return "metadata";
  }

  return "overview";
}

export function mergeExamMetadata(
  metadata: Record<string, unknown>,
  patch: Record<string, unknown>,
) {
  return {
    ...metadata,
    ...patch,
  };
}

export function formatAutosaveTimestamp(value: string | Date | null) {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(parsed);
}

export function buildExtractionSummary(draft: AdminIngestionDraft | null) {
  if (!draft || !isRecord(draft.exam.metadata)) {
    return null;
  }

  const extraction = draft.exam.metadata.extraction;

  if (!isRecord(extraction)) {
    return null;
  }

  return {
    engine: typeof extraction.engine === "string" ? extraction.engine : null,
    model: typeof extraction.model === "string" ? extraction.model : null,
    exerciseCount:
      typeof extraction.exerciseCount === "number"
        ? extraction.exerciseCount
        : null,
    questionCount:
      typeof extraction.questionCount === "number"
        ? extraction.questionCount
        : null,
    assetCount:
      typeof extraction.assetCount === "number" ? extraction.assetCount : null,
    uncertaintyCount: Array.isArray(extraction.uncertainties)
      ? extraction.uncertainties.length
      : null,
  };
}

export function buildFocusRequest(
  issue: AdminIngestionValidationIssue | null,
): IngestionEditorFocusRequest | null {
  if (!issue) {
    return null;
  }

  return {
    issueId: issue.id,
    variantCode: issue.variantCode,
    nodeId: issue.nodeId,
    blockId: issue.blockId,
    assetId: issue.assetId,
    sourcePageId: issue.sourcePageId,
  };
}

export function buildIssueCountBySection(
  issues: AdminIngestionValidationIssue[],
) {
  const counts: Record<ReviewSection, number> = {
    overview: 0,
    metadata: 0,
    structure: 0,
    sources: 0,
    assets: 0,
  };

  for (const issue of issues) {
    counts[resolveIssueSection(issue)] += 1;
  }

  return counts;
}

export function buildReviewActionState({
  job,
  workflow,
  saving,
  autosaving,
  autosaveError,
  hasUnsavedChanges,
  formattedLastSavedAt,
  processing,
  attachingCorrection,
}: {
  job: Pick<AdminIngestionJobResponse["job"], "status" | "draft_kind">;
  workflow: Pick<AdminIngestionJobResponse["workflow"], "active_operation">;
  saving: boolean;
  autosaving: boolean;
  autosaveError: string | null;
  hasUnsavedChanges: boolean;
  formattedLastSavedAt: string | null;
  processing: boolean;
  attachingCorrection: boolean;
}) {
  const workerActive = job.status === "queued" || job.status === "processing";
  const actionBusy =
    saving || processing || attachingCorrection || workerActive;
  const isRevisionDraft = job.draft_kind === "revision";
  const isPublishing =
    workerActive && workflow.active_operation === "publishing";
  const primaryActionLabel = isPublishing
    ? job.status === "queued"
      ? "Publish queued"
      : isRevisionDraft
        ? "Publishing Revision…"
        : "Publishing…"
    : job.status === "published"
      ? isRevisionDraft
        ? "Published Revision"
        : "Published"
      : job.status === "approved"
        ? isRevisionDraft
          ? "Publish Revision"
          : "Publish"
        : isRevisionDraft
          ? "Approve & Publish Revision"
          : "Approve & Publish";
  const saveActionLabel = isRevisionDraft ? "Save Revision" : "Save Draft";
  const approveActionLabel = isRevisionDraft
    ? "Approve Revision"
    : "Approve only";
  const autosaveStatusMessage = autosaving
    ? "Autosaving review session…"
    : saving
      ? "Saving review session…"
      : autosaveError
        ? "Autosave failed. Your latest edits are still only in this browser."
        : hasUnsavedChanges
          ? "Unsaved changes detected. Autosave will run shortly."
          : formattedLastSavedAt
            ? `All review changes saved at ${formattedLastSavedAt}.`
            : "Autosave is on for this review session.";
  const autosaveStatusClassName = autosaveError
    ? "error-text"
    : autosaving || saving || hasUnsavedChanges
      ? "muted-text"
      : "success-text";

  return {
    actionBusy,
    primaryActionLabel,
    isRevisionDraft,
    saveActionLabel,
    approveActionLabel,
    autosaveStatusMessage,
    autosaveStatusClassName,
  };
}

export function canRunPrimaryReviewAction({
  job,
  validation,
}: {
  job: Pick<AdminIngestionJobResponse["job"], "status" | "draft_kind">;
  validation: Pick<
    AdminIngestionJobResponse["validation"],
    "can_approve" | "can_publish"
  >;
}) {
  if (job.status === "published") {
    return false;
  }

  // The primary action is a compound "approve, then publish" flow, so it
  // should unlock as soon as approval is allowed instead of waiting until the
  // draft is already approved.
  return validation.can_approve || validation.can_publish;
}

export function buildProcessActionLabel({
  workflow,
  jobStatus,
  processing,
}: {
  workflow: Pick<
    AdminIngestionJobResponse["workflow"],
    "active_operation" | "awaiting_correction" | "review_started"
  >;
  jobStatus: AdminIngestionJobResponse["job"]["status"];
  processing: boolean;
}) {
  if (workflow.awaiting_correction) {
    return "Waiting";
  }

  if (processing) {
    return "Processing…";
  }

  if (jobStatus === "queued") {
    return workflow.active_operation === "publishing"
      ? "Publish queued"
      : "Queued";
  }

  if (jobStatus === "processing") {
    return workflow.active_operation === "publishing"
      ? "Publishing…"
      : "Worker running…";
  }

  if (shouldRefreshExistingSourcePages({ workflow, jobStatus })) {
    return "Refresh pages";
  }

  return "Prepare pages";
}

export function shouldRefreshExistingSourcePages({
  workflow,
  jobStatus,
}: {
  workflow: Pick<AdminIngestionJobResponse["workflow"], "review_started">;
  jobStatus: AdminIngestionJobResponse["job"]["status"];
}) {
  return workflow.review_started || jobStatus === "failed";
}

export function buildProcessConfirmationMessage({
  workflow,
  jobStatus,
}: {
  workflow: Pick<AdminIngestionJobResponse["workflow"], "review_started">;
  jobStatus: AdminIngestionJobResponse["job"]["status"];
}) {
  if (!shouldRefreshExistingSourcePages({ workflow, jobStatus })) {
    return null;
  }

  return "Refreshing source pages will re-rasterize the canonical PDFs while keeping the current reviewed draft structure. Continue?";
}

export function buildProcessRequestPayload({
  workflow,
  jobStatus,
}: {
  workflow: Pick<AdminIngestionJobResponse["workflow"], "review_started">;
  jobStatus: AdminIngestionJobResponse["job"]["status"];
}) {
  if (!shouldRefreshExistingSourcePages({ workflow, jobStatus })) {
    return {};
  }

  return {
    force_reprocess: true,
    replace_existing: true,
  };
}

export function buildDraftWithSelectedStreamCodes(
  draft: AdminIngestionDraft,
  nextCodes: string[],
) {
  const normalizedCodes = Array.from(
    new Set(
      nextCodes
        .map((code) => code.trim().toUpperCase())
        .filter((code) => code.length > 0),
    ),
  );
  const currentSelectedCodes = readDraftSelectedStreamCodes(draft.exam);
  const effectiveCodes = normalizedCodes.length
    ? normalizedCodes
    : currentSelectedCodes;
  const currentMetadata =
    typeof draft.exam.metadata === "object" &&
    draft.exam.metadata !== null &&
    !Array.isArray(draft.exam.metadata)
      ? draft.exam.metadata
      : {};

  return {
    ...draft,
    exam: {
      ...draft.exam,
      metadata: mergeExamMetadata(currentMetadata, {
        paperStreamCodes: effectiveCodes,
      }),
    },
  };
}

export { readDraftSelectedStreamCodes };
