import type {
  AdminIngestionDraft,
  AdminIngestionJobResponse,
  AdminIngestionValidationIssue,
} from '@/lib/admin';
import { isRecord, readDraftSelectedStreamCodes } from '@/lib/admin-ingestion-structure';
import type { IngestionEditorFocusRequest } from '@/lib/admin-ingestion-editor-state';

export type ReviewSection =
  | 'overview'
  | 'metadata'
  | 'structure'
  | 'sources'
  | 'assets';

export const REVIEW_SECTION_LABELS: Record<ReviewSection, string> = {
  overview: 'Overview',
  metadata: 'Metadata',
  structure: 'Structure',
  sources: 'Sources',
  assets: 'Assets',
};

export function formatIssueLocation(issue: AdminIngestionValidationIssue) {
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

export function scrollToIssueTarget(issue: AdminIngestionValidationIssue) {
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

export function resolveIssueSection(
  issue: AdminIngestionValidationIssue,
): ReviewSection {
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

export function mergeExamMetadata(
  metadata: Record<string, unknown>,
  patch: Record<string, unknown>,
) {
  return {
    ...metadata,
    ...patch,
  };
}

export function buildReviewSessionSnapshot(
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

export function formatAutosaveTimestamp(value: string | null) {
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

export function buildExtractionSummary(draft: AdminIngestionDraft | null) {
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
  saving,
  autosaving,
  autosaveError,
  hasUnsavedChanges,
  formattedLastSavedAt,
  processing,
  attachingCorrection,
}: {
  job: Pick<AdminIngestionJobResponse['job'], 'status' | 'provider'>;
  saving: boolean;
  autosaving: boolean;
  autosaveError: string | null;
  hasUnsavedChanges: boolean;
  formattedLastSavedAt: string | null;
  processing: boolean;
  attachingCorrection: boolean;
}) {
  const workerActive = job.status === 'queued' || job.status === 'processing';
  const actionBusy = saving || processing || attachingCorrection || workerActive;
  const primaryActionLabel =
    job.status === 'approved' || job.status === 'published'
      ? 'Publish'
      : 'Approve & Publish';
  const isPublishedRevisionJob = job.provider === 'published_revision';
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

  return {
    actionBusy,
    primaryActionLabel,
    isPublishedRevisionJob,
    autosaveStatusMessage,
    autosaveStatusClassName,
  };
}

export function buildProcessActionLabel({
  workflow,
  jobStatus,
  processing,
}: {
  workflow: Pick<
    AdminIngestionJobResponse['workflow'],
    'awaiting_correction' | 'review_started'
  >;
  jobStatus: AdminIngestionJobResponse['job']['status'];
  processing: boolean;
}) {
  if (workflow.awaiting_correction) {
    return 'Waiting';
  }

  if (processing) {
    return 'Processing…';
  }

  if (jobStatus === 'queued') {
    return 'Queued';
  }

  if (jobStatus === 'processing') {
    return 'Worker running…';
  }

  if (workflow.review_started) {
    return 'Queue reprocess';
  }

  return 'Queue processing';
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
  const currentMetadata =
    typeof draft.exam.metadata === 'object' &&
    draft.exam.metadata !== null &&
    !Array.isArray(draft.exam.metadata)
      ? draft.exam.metadata
      : {};
  const nextPrimary =
    normalizedCodes.find((code) => code === draft.exam.streamCode) ??
    normalizedCodes[0] ??
    null;

  return {
    ...draft,
    exam: {
      ...draft.exam,
      streamCode: nextPrimary,
      metadata: mergeExamMetadata(currentMetadata, {
        sharedStreamCodes: normalizedCodes,
      }),
    },
  };
}

export { readDraftSelectedStreamCodes };
