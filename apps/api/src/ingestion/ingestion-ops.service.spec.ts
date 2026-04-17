import { BadRequestException } from '@nestjs/common';
import { IngestionJobStatus } from '@prisma/client';
import { IngestionOpsService } from './ingestion-ops.service';

function createDraft() {
  return {
    schema: 'bac_ingestion_draft/v1' as const,
    exam: {
      year: 2025,
      streamCode: 'SE',
      subjectCode: 'MATHEMATICS',
      sessionType: 'NORMAL' as const,
      provider: 'eddirasa',
      title: 'BAC 2025 Mathematics',
      minYear: 2008,
      sourceListingUrl: null,
      sourceExamPageUrl: null,
      sourceCorrectionPageUrl: null,
      examDocumentId: null,
      correctionDocumentId: null,
      examDocumentStorageKey: null,
      correctionDocumentStorageKey: null,
      metadata: {},
    },
    sourcePages: [],
    assets: [],
    variants: [],
  };
}

describe('IngestionOpsService', () => {
  it('saves a draft without changing the current workflow status', async () => {
    const prisma = {
      ingestionJob: {
        update: jest.fn().mockResolvedValue(undefined),
      },
    };
    const readService = {
      findJobOrThrow: jest.fn().mockResolvedValue({
        id: 'job-1',
        status: IngestionJobStatus.APPROVED,
        reviewNotes: 'existing notes',
        reviewedAt: new Date('2026-04-01T00:00:00.000Z'),
      }),
      getJob: jest.fn().mockResolvedValue({ job: { id: 'job-1' } }),
    };
    const service = new IngestionOpsService(
      prisma as never,
      readService as never,
    );
    const draft = createDraft();

    const result = await service.saveDraft('job-1', {
      draft,
      reviewNotes: 'updated notes',
      clearErrorMessage: true,
    });

    expect(prisma.ingestionJob.update).toHaveBeenCalledWith({
      where: {
        id: 'job-1',
      },
      data: expect.objectContaining({
        draftJson: draft,
        reviewNotes: 'updated notes',
        errorMessage: null,
        label: 'BAC 2025 Mathematics',
      }),
    });
    expect(result).toEqual({ job: { id: 'job-1' } });
  });

  it('resets mutable jobs to draft and clears review state', async () => {
    const reviewedAt = new Date('2026-04-01T00:00:00.000Z');
    const prisma = {
      ingestionJob: {
        update: jest.fn().mockResolvedValue(undefined),
      },
    };
    const readService = {
      findJobOrThrow: jest.fn().mockResolvedValue({
        id: 'job-2',
        status: IngestionJobStatus.APPROVED,
        reviewNotes: 'reviewed',
        reviewedAt,
      }),
      getJob: jest.fn().mockResolvedValue({ job: { id: 'job-2' } }),
    };
    const service = new IngestionOpsService(
      prisma as never,
      readService as never,
    );

    await service.resetToDraft('job-2', {
      draft: createDraft(),
    });

    expect(prisma.ingestionJob.update).toHaveBeenCalledWith({
      where: {
        id: 'job-2',
      },
      data: expect.objectContaining({
        status: IngestionJobStatus.DRAFT,
        reviewedAt: null,
        errorMessage: null,
      }),
    });
  });

  it('keeps published jobs published during repair-style draft rewrites', async () => {
    const reviewedAt = new Date('2026-04-01T00:00:00.000Z');
    const prisma = {
      ingestionJob: {
        update: jest.fn().mockResolvedValue(undefined),
      },
    };
    const readService = {
      findJobOrThrow: jest.fn().mockResolvedValue({
        id: 'job-3',
        status: IngestionJobStatus.PUBLISHED,
        reviewNotes: 'published',
        reviewedAt,
      }),
      getJob: jest.fn().mockResolvedValue({ job: { id: 'job-3' } }),
    };
    const service = new IngestionOpsService(
      prisma as never,
      readService as never,
    );

    await service.resetToDraft('job-3', {
      draft: createDraft(),
      metadata: {
        slug: 'eddirasa-bac-se-math-2025',
      },
      preservePublishedStatus: true,
    });

    expect(prisma.ingestionJob.update).toHaveBeenCalledWith({
      where: {
        id: 'job-3',
      },
      data: expect.objectContaining({
        status: IngestionJobStatus.PUBLISHED,
        reviewedAt,
      }),
    });
  });

  it('rejects queued jobs', async () => {
    const service = new IngestionOpsService(
      {
        ingestionJob: {
          update: jest.fn(),
        },
      } as never,
      {
        findJobOrThrow: jest.fn().mockResolvedValue({
          id: 'job-4',
          status: IngestionJobStatus.QUEUED,
          reviewNotes: null,
          reviewedAt: null,
        }),
      } as never,
    );

    await expect(
      service.saveDraft('job-4', {
        draft: createDraft(),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
