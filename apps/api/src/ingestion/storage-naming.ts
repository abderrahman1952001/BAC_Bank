import path from 'path';
import { SessionType, SourceDocumentKind } from '@prisma/client';

export type CanonicalStorageContext = {
  year: number;
  streamCode: string | null;
  familyCode?: string | null;
  subjectCode: string | null;
  sessionType: SessionType;
  qualifierKey?: string | null;
};

export function buildCanonicalDocumentFileName(
  context: CanonicalStorageContext,
  kind: SourceDocumentKind,
) {
  const familySegment = slugifySegment(
    context.familyCode ?? context.streamCode ?? 'pending-family',
  );
  const subjectSegment = slugifySegment(
    context.subjectCode ?? 'pending-subject',
  );
  const parts = [
    'bac',
    kind === SourceDocumentKind.CORRECTION ? 'correction' : 'exam',
    subjectSegment,
    familySegment,
    `${context.year}`,
    context.sessionType === SessionType.MAKEUP ? 'makeup' : 'normal',
  ];

  return `${parts.join('-')}.pdf`;
}

export function buildCanonicalDocumentStorageKey(
  context: Pick<CanonicalStorageContext, 'year'>,
  fileName: string,
) {
  return ['bac', `${context.year}`, 'documents', fileName].join('/');
}

export function buildCanonicalPageStorageKey(
  context: Pick<CanonicalStorageContext, 'year'>,
  documentFileName: string,
  pageNumber: number,
) {
  return [
    'bac',
    `${context.year}`,
    'pages',
    stripPdfExtension(documentFileName),
    `page-${`${pageNumber}`.padStart(3, '0')}.png`,
  ].join('/');
}

export function normalizeLookup(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function slugifySegment(value: string) {
  return normalizeLookup(value) || 'unknown';
}

export function fileNameFromUrl(url: string | null) {
  if (!url) {
    return null;
  }

  try {
    return path.basename(new URL(url).pathname) || null;
  } catch {
    return null;
  }
}

export function stripPdfExtension(fileName: string) {
  return fileName.replace(/\.pdf$/i, '');
}
