import { IngestionJobStatus } from '@prisma/client';
import { IngestionQueueService } from './ingestion-queue.service';

describe('IngestionQueueService', () => {
  const queuedPublishMetadata = {
    workerRequest: {
      action: 'publish',
      forceReprocess: false,
      replaceExisting: false,
      skipExtraction: false,
      queuedAt: '2026-04-13T10:00:00.000Z',
    },
  };

  let prisma: {
    ingestionJob: {
      findFirst: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let readService: {
    findJobOrThrow: jest.Mock;
    getJob: jest.Mock;
  };
  let processingEngine: {
    buildStageInput: jest.Mock;
    runStage: jest.Mock;
  };
  let publicationService: {
    publishQueuedJob: jest.Mock;
  };
  let service: IngestionQueueService;

  beforeEach(() => {
    prisma = {
      ingestionJob: {
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    readService = {
      findJobOrThrow: jest.fn(),
      getJob: jest.fn(),
    };
    processingEngine = {
      buildStageInput: jest.fn(),
      runStage: jest.fn(),
    };
    publicationService = {
      publishQueuedJob: jest.fn(),
    };
    service = new IngestionQueueService(
      prisma as never,
      readService as never,
      processingEngine as never,
      publicationService as never,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('queues approved jobs for background publication', async () => {
    readService.findJobOrThrow.mockResolvedValue({
      id: 'job-1',
      status: IngestionJobStatus.APPROVED,
      metadata: {
        provider: 'manual_upload',
      },
    });
    readService.getJob.mockResolvedValue({
      job: {
        id: 'job-1',
        status: 'queued',
      },
    });

    await expect(service.publishJob('job-1')).resolves.toMatchObject({
      job: {
        status: 'queued',
      },
    });

    expect(prisma.ingestionJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'job-1',
        },
        data: expect.objectContaining({
          status: IngestionJobStatus.QUEUED,
          errorMessage: null,
          processingStartedAt: null,
          processingFinishedAt: null,
          processingLeaseExpiresAt: null,
          processingWorkerId: null,
          metadata: expect.objectContaining({
            provider: 'manual_upload',
            workerRequest: expect.objectContaining({
              action: 'publish',
            }),
          }),
        }),
      }),
    );
  });

  it('routes queued publish work through the publication service', async () => {
    jest.useFakeTimers();
    prisma.ingestionJob.findFirst.mockResolvedValue({
      id: 'job-1',
      metadata: queuedPublishMetadata,
      processingAttemptCount: 0,
      processingLeaseExpiresAt: null,
      status: IngestionJobStatus.QUEUED,
    });
    prisma.ingestionJob.updateMany.mockResolvedValue({
      count: 1,
    });
    publicationService.publishQueuedJob.mockResolvedValue({
      job_id: 'job-1',
      published_paper_id: 'paper-1',
      published_exam_ids: ['exam-1'],
    });

    await expect(service.runNextQueuedJob('worker-1')).resolves.toBe('job-1');

    expect(publicationService.publishQueuedJob).toHaveBeenCalledWith('job-1');
    expect(processingEngine.runStage).not.toHaveBeenCalled();
  });

  it('restores approved status when queued publication fails', async () => {
    jest.useFakeTimers();
    prisma.ingestionJob.findFirst.mockResolvedValue({
      id: 'job-1',
      metadata: queuedPublishMetadata,
      processingAttemptCount: 0,
      processingLeaseExpiresAt: null,
      status: IngestionJobStatus.QUEUED,
    });
    prisma.ingestionJob.updateMany.mockResolvedValue({
      count: 1,
    });
    publicationService.publishQueuedJob.mockRejectedValue(
      new Error('R2 write failed'),
    );
    readService.findJobOrThrow.mockResolvedValue({
      id: 'job-1',
      status: IngestionJobStatus.PROCESSING,
      metadata: queuedPublishMetadata,
    });

    await expect(service.runNextQueuedJob('worker-1')).rejects.toThrow(
      'R2 write failed',
    );

    expect(prisma.ingestionJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'job-1',
        },
        data: expect.objectContaining({
          status: IngestionJobStatus.APPROVED,
          errorMessage: 'R2 write failed',
        }),
      }),
    );
  });
});
