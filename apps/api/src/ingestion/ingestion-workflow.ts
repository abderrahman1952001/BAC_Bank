import { IngestionJobStatus } from '@prisma/client';
import { isPublishedRevisionProvider } from './ingestion.constants';

export function canEditIngestionJob(status: IngestionJobStatus) {
  return (
    status !== IngestionJobStatus.QUEUED &&
    status !== IngestionJobStatus.PROCESSING &&
    status !== IngestionJobStatus.PUBLISHED
  );
}

export function canApproveIngestionJob(input: {
  status: IngestionJobStatus;
  provider: string;
}) {
  const { status, provider } = input;

  if (
    status === IngestionJobStatus.QUEUED ||
    status === IngestionJobStatus.PROCESSING ||
    status === IngestionJobStatus.PUBLISHED
  ) {
    return false;
  }

  if (status === IngestionJobStatus.APPROVED) {
    return true;
  }

  if (isPublishedRevisionProvider(provider)) {
    return (
      status === IngestionJobStatus.DRAFT ||
      status === IngestionJobStatus.IN_REVIEW
    );
  }

  return status === IngestionJobStatus.IN_REVIEW;
}

export function canPublishIngestionJob(status: IngestionJobStatus) {
  return status === IngestionJobStatus.APPROVED;
}

export function resolveStatusAfterDraftEdit(input: {
  currentStatus: IngestionJobStatus;
  provider: string;
  draftChanged: boolean;
}) {
  const { currentStatus, provider, draftChanged } = input;

  if (!draftChanged || currentStatus !== IngestionJobStatus.APPROVED) {
    return currentStatus;
  }

  return isPublishedRevisionProvider(provider)
    ? IngestionJobStatus.DRAFT
    : IngestionJobStatus.IN_REVIEW;
}
