import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IngestionDraft } from './ingestion.contract';
import { draftSessionTypeToPrismaSessionType } from './ingestion-job-metadata';
import { IngestionPaperSourceService } from './ingestion-paper-source.service';
import { CanonicalStorageContext } from './storage-naming';

type PaperSourceSupport = Pick<
  IngestionPaperSourceService,
  'buildFamilyCode' | 'normalizeStreamCodes'
>;

export function readOptionalString(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException('Expected a string value.');
  }

  const trimmed = value.trim();
  return trimmed || null;
}

export function readNonEmptyText(value: string, fieldName: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new BadRequestException(`${fieldName} is required.`);
  }

  return value.trim();
}

export function readStrictPositiveYear(value: number) {
  if (!Number.isInteger(value) || value < 1900 || value > 2100) {
    throw new BadRequestException('year must be a valid integer year.');
  }

  return value;
}

export function readOptionalMetadataInteger(
  value: Record<string, unknown>,
  field: string,
) {
  const raw = value[field];

  if (typeof raw !== 'number' || !Number.isInteger(raw)) {
    return null;
  }

  return raw;
}

export function readJsonString(value: unknown, field: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const raw = (value as Record<string, unknown>)[field];

  if (typeof raw !== 'string' || !raw.trim()) {
    return null;
  }

  return raw.trim();
}

export function readJsonStringArray(value: unknown, field: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }

  const raw = (value as Record<string, unknown>)[field];

  if (!Array.isArray(raw)) {
    return [];
  }

  return Array.from(
    new Set(
      raw
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => entry.trim().toUpperCase())
        .filter((entry) => entry.length > 0),
    ),
  );
}

export function resolveDraftStreamCodes(
  draft: IngestionDraft,
  paperSourceService: PaperSourceSupport,
) {
  const paperStreamCodes = readJsonStringArray(
    draft.exam.metadata,
    'paperStreamCodes',
  );

  if (paperStreamCodes.length > 0) {
    return paperStreamCodes;
  }

  const sharedStreamCodes = readJsonStringArray(
    draft.exam.metadata,
    'sharedStreamCodes',
  );
  const orderedCodes = [
    draft.exam.streamCode?.trim().toUpperCase() ?? null,
    ...sharedStreamCodes,
  ].filter((value): value is string => Boolean(value));

  return paperSourceService.normalizeStreamCodes(orderedCodes);
}

export function resolvePaperFamilyCode(
  draft: IngestionDraft,
  paperSourceService: PaperSourceSupport,
) {
  const explicitFamilyCode =
    readJsonString(draft.exam.metadata, 'paperFamilyCode') ??
    readJsonString(draft.exam.metadata, 'sharedPaperCode');

  if (explicitFamilyCode) {
    return explicitFamilyCode.trim();
  }

  return paperSourceService.buildFamilyCode(
    resolveDraftStreamCodes(draft, paperSourceService),
  );
}

export function buildStorageContextFromDraft(
  draft: IngestionDraft,
  paperSourceService: PaperSourceSupport,
): CanonicalStorageContext {
  return {
    year: draft.exam.year,
    streamCode: draft.exam.streamCode,
    familyCode: resolvePaperFamilyCode(draft, paperSourceService),
    subjectCode: draft.exam.subjectCode,
    sessionType: draftSessionTypeToPrismaSessionType(draft.exam.sessionType),
    qualifierKey: readJsonString(draft.exam.metadata, 'qualifierKey'),
  };
}

export function asJsonRecord(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

export function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export function getApiBaseUrl() {
  const explicit = process.env.PUBLIC_API_BASE_URL;

  if (explicit) {
    return explicit.replace(/\/$/, '');
  }

  return `http://localhost:${process.env.PORT ?? 3001}`;
}
