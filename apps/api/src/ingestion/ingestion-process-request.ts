import { BadRequestException } from '@nestjs/common';
import { IngestionJobStatus, Prisma } from '@prisma/client';

export type IngestionWorkerAction = 'process' | 'publish';

export type IngestionWorkerRequest = {
  action: IngestionWorkerAction;
  forceReprocess: boolean;
  replaceExisting: boolean;
  skipExtraction: boolean;
  queuedAt: string;
};

export function buildIngestionProcessRequest(input: {
  forceReprocess: boolean;
  replaceExisting: boolean;
  skipExtraction: boolean;
  jobStatus: IngestionJobStatus;
  isPublishedRevision: boolean;
  queuedAt?: string;
}): IngestionWorkerRequest {
  const processRequest = {
    action: 'process' as const,
    forceReprocess: input.forceReprocess,
    replaceExisting: input.replaceExisting,
    skipExtraction: input.skipExtraction,
    queuedAt: input.queuedAt ?? new Date().toISOString(),
  } satisfies IngestionWorkerRequest;

  if (
    !processRequest.forceReprocess &&
    (input.jobStatus === IngestionJobStatus.IN_REVIEW ||
      input.jobStatus === IngestionJobStatus.APPROVED ||
      input.jobStatus === IngestionJobStatus.FAILED)
  ) {
    throw new BadRequestException(
      'This job already entered review or failed after processing. Retry with force_reprocess if you really want to rerun extraction.',
    );
  }

  if (
    input.isPublishedRevision &&
    !processRequest.forceReprocess &&
    input.jobStatus !== IngestionJobStatus.DRAFT
  ) {
    throw new BadRequestException(
      'Published revision drafts can only be reprocessed explicitly with force_reprocess.',
    );
  }

  return processRequest;
}

export function buildIngestionPublishRequest(input: {
  jobStatus: IngestionJobStatus;
  queuedAt?: string;
}): IngestionWorkerRequest {
  if (input.jobStatus !== IngestionJobStatus.APPROVED) {
    throw new BadRequestException(
      'Approve the ingestion job before publishing it.',
    );
  }

  return {
    action: 'publish',
    forceReprocess: false,
    replaceExisting: false,
    skipExtraction: false,
    queuedAt: input.queuedAt ?? new Date().toISOString(),
  } satisfies IngestionWorkerRequest;
}

export function readIngestionWorkerRequest(
  metadata: Prisma.JsonValue | null,
): IngestionWorkerRequest {
  const metadataRecord = asJsonRecord(metadata);
  const rawValue =
    metadataRecord?.workerRequest ?? metadataRecord?.processingRequest;

  if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
    return {
      action: 'process',
      forceReprocess: false,
      replaceExisting: false,
      skipExtraction: false,
      queuedAt: new Date().toISOString(),
    } satisfies IngestionWorkerRequest;
  }

  const rawRecord = rawValue as Record<string, unknown>;

  return {
    action: rawRecord.action === 'publish' ? 'publish' : 'process',
    forceReprocess: rawRecord.forceReprocess === true,
    replaceExisting: rawRecord.replaceExisting === true,
    skipExtraction: rawRecord.skipExtraction === true,
    queuedAt:
      typeof rawRecord.queuedAt === 'string'
        ? rawRecord.queuedAt
        : new Date().toISOString(),
  } satisfies IngestionWorkerRequest;
}

export function withIngestionWorkerRequestMetadata(
  metadata: Prisma.JsonValue | null,
  workerRequest: IngestionWorkerRequest,
) {
  const nextMetadata = {
    ...(asJsonRecord(metadata) ?? {}),
    workerRequest,
  } as Record<string, unknown>;

  delete nextMetadata.processingRequest;
  return nextMetadata;
}

export function withoutIngestionWorkerRequestMetadata(
  metadata: Prisma.JsonValue | null,
) {
  const metadataRecord = asJsonRecord(metadata);

  if (!metadataRecord) {
    return {};
  }

  const rest = { ...metadataRecord };
  delete rest.workerRequest;
  delete rest.processingRequest;
  return rest;
}

function asJsonRecord(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}
