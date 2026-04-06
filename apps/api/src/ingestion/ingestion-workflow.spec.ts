import { IngestionJobStatus } from '@prisma/client';
import {
  canApproveIngestionJob,
  canEditIngestionJob,
  canPublishIngestionJob,
  resolveStatusAfterDraftEdit,
} from './ingestion-workflow';

describe('ingestion workflow helpers', () => {
  it('blocks editing for queued, processing, and published jobs', () => {
    expect(canEditIngestionJob(IngestionJobStatus.DRAFT)).toBe(true);
    expect(canEditIngestionJob(IngestionJobStatus.IN_REVIEW)).toBe(true);
    expect(canEditIngestionJob(IngestionJobStatus.APPROVED)).toBe(true);
    expect(canEditIngestionJob(IngestionJobStatus.FAILED)).toBe(true);
    expect(canEditIngestionJob(IngestionJobStatus.QUEUED)).toBe(false);
    expect(canEditIngestionJob(IngestionJobStatus.PROCESSING)).toBe(false);
    expect(canEditIngestionJob(IngestionJobStatus.PUBLISHED)).toBe(false);
  });

  it('allows approval only from review-ready states', () => {
    expect(
      canApproveIngestionJob({
        status: IngestionJobStatus.IN_REVIEW,
        provider: 'manual_upload',
      }),
    ).toBe(true);
    expect(
      canApproveIngestionJob({
        status: IngestionJobStatus.APPROVED,
        provider: 'manual_upload',
      }),
    ).toBe(true);
    expect(
      canApproveIngestionJob({
        status: IngestionJobStatus.DRAFT,
        provider: 'manual_upload',
      }),
    ).toBe(false);
    expect(
      canApproveIngestionJob({
        status: IngestionJobStatus.PUBLISHED,
        provider: 'manual_upload',
      }),
    ).toBe(false);
  });

  it('lets published revisions approve from draft without enabling publish shortcuts elsewhere', () => {
    expect(
      canApproveIngestionJob({
        status: IngestionJobStatus.DRAFT,
        provider: 'published_revision',
      }),
    ).toBe(true);
    expect(
      canApproveIngestionJob({
        status: IngestionJobStatus.QUEUED,
        provider: 'published_revision',
      }),
    ).toBe(false);
  });

  it('only allows publishing from approved jobs', () => {
    expect(canPublishIngestionJob(IngestionJobStatus.APPROVED)).toBe(true);
    expect(canPublishIngestionJob(IngestionJobStatus.PUBLISHED)).toBe(false);
    expect(canPublishIngestionJob(IngestionJobStatus.IN_REVIEW)).toBe(false);
  });

  it('invalidates approval after real draft edits', () => {
    expect(
      resolveStatusAfterDraftEdit({
        currentStatus: IngestionJobStatus.APPROVED,
        provider: 'manual_upload',
        draftChanged: true,
      }),
    ).toBe(IngestionJobStatus.IN_REVIEW);
    expect(
      resolveStatusAfterDraftEdit({
        currentStatus: IngestionJobStatus.APPROVED,
        provider: 'published_revision',
        draftChanged: true,
      }),
    ).toBe(IngestionJobStatus.DRAFT);
    expect(
      resolveStatusAfterDraftEdit({
        currentStatus: IngestionJobStatus.APPROVED,
        provider: 'manual_upload',
        draftChanged: false,
      }),
    ).toBe(IngestionJobStatus.APPROVED);
  });
});
