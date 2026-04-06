import { SessionType } from '@prisma/client';
import type { IngestionDraft } from './ingestion.contract';

export type IngestionJobMetadataProjection = {
  label: string;
};

export function projectIngestionJobMetadataFromDraft(
  draft: IngestionDraft,
): IngestionJobMetadataProjection {
  return {
    label: draft.exam.title,
  };
}

export function draftSessionTypeToPrismaSessionType(
  value: IngestionDraft['exam']['sessionType'],
) {
  return value === 'MAKEUP' ? SessionType.MAKEUP : SessionType.NORMAL;
}

export function prismaSessionTypeToDraftSessionType(value: SessionType | null) {
  return value === SessionType.MAKEUP ? 'MAKEUP' : 'NORMAL';
}
