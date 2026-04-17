import { SessionType } from '@prisma/client';
import {
  draftSessionTypeToPrismaSessionType,
  prismaSessionTypeToDraftSessionType,
  projectIngestionJobMetadataFromDraft,
} from './ingestion-job-metadata';

describe('ingestion job metadata helpers', () => {
  it('projects the ingestion job label from the draft exam payload', () => {
    expect(
      projectIngestionJobMetadataFromDraft({
        schema: 'bac_ingestion_draft/v1',
        exam: {
          year: 2025,
          streamCode: 'SE',
          subjectCode: 'MATH',
          sessionType: 'MAKEUP',
          provider: 'manual_upload',
          title: '2025 Mathematics',
          minYear: 2008,
          sourceListingUrl: 'https://example.com/listing',
          sourceExamPageUrl: 'https://example.com/exam',
          sourceCorrectionPageUrl: 'https://example.com/correction',
          examDocumentId: null,
          correctionDocumentId: null,
          examDocumentStorageKey: null,
          correctionDocumentStorageKey: null,
          metadata: {},
        },
        sourcePages: [],
        assets: [],
        variants: [],
      }),
    ).toEqual({
      label: '2025 Mathematics',
    });
  });

  it('converts session types consistently in both directions', () => {
    expect(draftSessionTypeToPrismaSessionType('NORMAL')).toBe(
      SessionType.NORMAL,
    );
    expect(draftSessionTypeToPrismaSessionType('MAKEUP')).toBe(
      SessionType.MAKEUP,
    );
    expect(prismaSessionTypeToDraftSessionType(SessionType.NORMAL)).toBe(
      'NORMAL',
    );
    expect(prismaSessionTypeToDraftSessionType(SessionType.MAKEUP)).toBe(
      'MAKEUP',
    );
    expect(prismaSessionTypeToDraftSessionType(null)).toBe('NORMAL');
  });
});
