import { BadRequestException } from '@nestjs/common';
import { IngestionJobStatus, Prisma } from '@prisma/client';

export type IngestionProcessRequest = {
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
}): IngestionProcessRequest {
  const processRequest = {
    forceReprocess: input.forceReprocess,
    replaceExisting: input.replaceExisting,
    skipExtraction: input.skipExtraction,
    queuedAt: input.queuedAt ?? new Date().toISOString(),
  } satisfies IngestionProcessRequest;

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

export function readIngestionProcessRequest(
  metadata: Prisma.JsonValue | null,
): IngestionProcessRequest {
  const metadataRecord = asJsonRecord(metadata);
  const rawValue = metadataRecord?.processingRequest;

  if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
    return {
      forceReprocess: false,
      replaceExisting: false,
      skipExtraction: false,
      queuedAt: new Date().toISOString(),
    } satisfies IngestionProcessRequest;
  }

  const rawRecord = rawValue as Record<string, unknown>;

  return {
    forceReprocess: rawRecord.forceReprocess === true,
    replaceExisting: rawRecord.replaceExisting === true,
    skipExtraction: rawRecord.skipExtraction === true,
    queuedAt:
      typeof rawRecord.queuedAt === 'string'
        ? rawRecord.queuedAt
        : new Date().toISOString(),
  } satisfies IngestionProcessRequest;
}

export function withIngestionProcessRequestMetadata(
  metadata: Prisma.JsonValue | null,
  processRequest: IngestionProcessRequest,
) {
  return {
    ...(asJsonRecord(metadata) ?? {}),
    processingRequest: processRequest,
  };
}

export function withoutIngestionProcessRequestMetadata(
  metadata: Prisma.JsonValue | null,
) {
  const metadataRecord = asJsonRecord(metadata);

  if (!metadataRecord) {
    return {};
  }

  const rest = { ...metadataRecord };
  delete rest.processingRequest;
  return rest;
}

function asJsonRecord(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}
