import { BadRequestException } from '@nestjs/common';
import { IngestionJobStatus } from '@prisma/client';
import {
  buildIngestionProcessRequest,
  readIngestionProcessRequest,
  withIngestionProcessRequestMetadata,
  withoutIngestionProcessRequestMetadata,
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
      forceReprocess: false,
      replaceExisting: true,
      skipExtraction: false,
      queuedAt: '2026-03-28T13:00:00.000Z',
    });
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
    const stored = readIngestionProcessRequest({
      other: 'value',
      processingRequest: {
        forceReprocess: true,
        replaceExisting: true,
        skipExtraction: false,
        queuedAt: '2026-03-28T14:00:00.000Z',
      },
    });

    expect(stored).toEqual({
      forceReprocess: true,
      replaceExisting: true,
      skipExtraction: false,
      queuedAt: '2026-03-28T14:00:00.000Z',
    });
    expect(
      withIngestionProcessRequestMetadata(
        {
          provider: 'manual_upload',
        },
        stored,
      ),
    ).toEqual({
      provider: 'manual_upload',
      processingRequest: stored,
    });
    expect(
      withoutIngestionProcessRequestMetadata({
        provider: 'manual_upload',
        processingRequest: stored,
      }),
    ).toEqual({
      provider: 'manual_upload',
    });
  });

  it('falls back to a safe default when processing metadata is absent or malformed', () => {
    const fallback = readIngestionProcessRequest({
      processingRequest: 'invalid',
    });

    expect(fallback.forceReprocess).toBe(false);
    expect(fallback.replaceExisting).toBe(false);
    expect(fallback.skipExtraction).toBe(false);
    expect(typeof fallback.queuedAt).toBe('string');
  });
});
