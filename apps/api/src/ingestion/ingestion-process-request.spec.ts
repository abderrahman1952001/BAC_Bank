import { BadRequestException } from '@nestjs/common';
import { IngestionJobStatus } from '@prisma/client';
import {
  buildIngestionPublishRequest,
  buildIngestionProcessRequest,
  readIngestionWorkerRequest,
  withIngestionWorkerRequestMetadata,
  withoutIngestionWorkerRequestMetadata,
} from './ingestion-process-request';

describe('ingestion process request helpers', () => {
  it('builds process requests from parsed flags', () => {
    expect(
      buildIngestionProcessRequest({
        forceReprocess: false,
        replaceExisting: true,
        skipExtraction: false,
        jobStatus: IngestionJobStatus.DRAFT,
        isPublishedRevision: false,
        queuedAt: '2026-03-28T13:00:00.000Z',
      }),
    ).toEqual({
      action: 'process',
      forceReprocess: false,
      replaceExisting: true,
      skipExtraction: false,
      queuedAt: '2026-03-28T13:00:00.000Z',
    });
  });

  it('builds publish requests for approved jobs only', () => {
    expect(
      buildIngestionPublishRequest({
        jobStatus: IngestionJobStatus.APPROVED,
        queuedAt: '2026-03-28T13:30:00.000Z',
      }),
    ).toEqual({
      action: 'publish',
      forceReprocess: false,
      replaceExisting: false,
      skipExtraction: false,
      queuedAt: '2026-03-28T13:30:00.000Z',
    });

    expect(() =>
      buildIngestionPublishRequest({
        jobStatus: IngestionJobStatus.DRAFT,
      }),
    ).toThrow('Approve the ingestion job before publishing it.');
  });

  it('blocks reviewed or failed jobs unless force reprocess is set', () => {
    expect(() =>
      buildIngestionProcessRequest({
        forceReprocess: false,
        replaceExisting: false,
        skipExtraction: false,
        jobStatus: IngestionJobStatus.IN_REVIEW,
        isPublishedRevision: false,
      }),
    ).toThrow(BadRequestException);
  });

  it('blocks published revision reprocessing without force after the draft stage', () => {
    expect(() =>
      buildIngestionProcessRequest({
        forceReprocess: false,
        replaceExisting: false,
        skipExtraction: false,
        jobStatus: IngestionJobStatus.QUEUED,
        isPublishedRevision: true,
      }),
    ).toThrow(
      'Published revision drafts can only be reprocessed explicitly with force_reprocess.',
    );
  });

  it('reads and updates processing metadata consistently', () => {
    const stored = readIngestionWorkerRequest({
      other: 'value',
      workerRequest: {
        action: 'publish',
        forceReprocess: true,
        replaceExisting: true,
        skipExtraction: false,
        queuedAt: '2026-03-28T14:00:00.000Z',
      },
    });

    expect(stored).toEqual({
      action: 'publish',
      forceReprocess: true,
      replaceExisting: true,
      skipExtraction: false,
      queuedAt: '2026-03-28T14:00:00.000Z',
    });
    expect(
      withIngestionWorkerRequestMetadata(
        {
          provider: 'manual_upload',
        },
        stored,
      ),
    ).toEqual({
      provider: 'manual_upload',
      workerRequest: stored,
    });
    expect(
      withoutIngestionWorkerRequestMetadata({
        provider: 'manual_upload',
        workerRequest: stored,
      }),
    ).toEqual({
      provider: 'manual_upload',
    });
  });

  it('falls back to safe defaults for malformed or legacy metadata', () => {
    const fallback = readIngestionWorkerRequest({
      workerRequest: 'invalid',
    });
    const legacyFallback = readIngestionWorkerRequest({
      processingRequest: 'invalid',
    });

    expect(fallback.action).toBe('process');
    expect(fallback.forceReprocess).toBe(false);
    expect(fallback.replaceExisting).toBe(false);
    expect(fallback.skipExtraction).toBe(false);
    expect(typeof fallback.queuedAt).toBe('string');
    expect(legacyFallback.action).toBe('process');
  });
});
