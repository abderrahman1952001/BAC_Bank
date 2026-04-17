import { SessionType } from '@prisma/client';
import { slugifySegment } from './storage-naming';

const STREAM_RANK: Record<string, number> = {
  SE: 10,
  M: 20,
  TM: 30,
  MT_CIVIL: 31,
  MT_ELEC: 32,
  MT_MECH: 33,
  MT_PROC: 34,
  GE: 40,
  LP: 50,
  LE: 60,
  LE_GERMAN: 61,
  LE_SPANISH: 62,
  LE_ITALIAN: 63,
  ARTS: 70,
};

export function normalizePaperSourceStreamCodes(streamCodes: string[]) {
  return Array.from(
    new Set(
      streamCodes
        .map((value) => value.trim().toUpperCase())
        .filter((value) => value.length > 0),
    ),
  ).sort(compareStreamCodes);
}

export function buildPaperSourceFamilyCode(streamCodes: string[]) {
  const normalizedCodes = normalizePaperSourceStreamCodes(streamCodes);

  if (!normalizedCodes.length) {
    return 'unassigned';
  }

  return normalizedCodes.map((code) => slugifySegment(code)).join('-');
}

export function buildPaperSourceSlug(input: {
  subjectCode: string;
  familyCode: string;
  year: number;
  sessionType: SessionType;
}) {
  return [
    'bac',
    slugifySegment(input.subjectCode),
    slugifySegment(input.familyCode),
    `${input.year}`,
    input.sessionType === SessionType.MAKEUP ? 'makeup' : 'normal',
  ].join('-');
}

function compareStreamCodes(left: string, right: string) {
  const leftRank = STREAM_RANK[left] ?? 10_000;
  const rightRank = STREAM_RANK[right] ?? 10_000;

  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  return left.localeCompare(right);
}
