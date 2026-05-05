import { BadRequestException } from '@nestjs/common';
import {
  IngestionJobStatus,
  SessionType,
  SourceDocumentKind,
} from '@prisma/client';
import { createEmptyDraft } from './ingestion.contract';
import { IngestionProcessingEngineService } from './ingestion-processing-engine.service';

describe('IngestionProcessingEngineService', () => {
  let prisma: {
    ingestionJob: {
      update: jest.Mock;
    };
  };
  let readService: {
    findJobOrThrow: jest.Mock;
    hydrateDraft: jest.Mock;
    mapJobDetail: jest.Mock;
  };
  let storedPageService: {
    ensureStoredPagesForDocument: jest.Mock;
    readSourceDocumentBuffer: jest.Mock;
  };
  let service: IngestionProcessingEngineService;

  beforeEach(() => {
    prisma = {
      ingestionJob: {
        update: jest.fn().mockResolvedValue(undefined),
      },
    };
    readService = {
      findJobOrThrow: jest.fn(),
      hydrateDraft: jest.fn(),
      mapJobDetail: jest.fn(),
    };
    storedPageService = {
      ensureStoredPagesForDocument: jest.fn(),
      readSourceDocumentBuffer: jest.fn(),
    };
    service = new IngestionProcessingEngineService(
      prisma as never,
      readService as never,
      storedPageService as never,
    );
  });

  it('fails processing when the correction PDF is missing', async () => {
    readService.findJobOrThrow.mockResolvedValueOnce({
      id: 'job-1',
      label: 'BAC 2024',
      status: IngestionJobStatus.DRAFT,
      metadata: null,
      sourceDocuments: [
        {
          id: 'doc-exam',
          kind: SourceDocumentKind.EXAM,
          fileName: 'exam.pdf',
          storageKey: 'bac/2024/documents/exam.pdf',
          pageCount: null,
          sourceUrl: null,
          pages: [],
        },
      ],
    });
    readService.hydrateDraft.mockReturnValue(
      createEmptyDraft({
        year: 2024,
        streamCode: 'SE',
        subjectCode: 'MATHEMATICS',
        sessionType: 'NORMAL',
        provider: 'eddirasa',
        title: 'BAC 2024',
        minYear: 2008,
      }),
    );

    await expect(
      service.runStage({
        jobId: 'job-1',
        replaceExisting: false,
        completionStatus: 'DRAFT',
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'Add the correction PDF before processing this job.',
      ),
    );

    expect(prisma.ingestionJob.update).toHaveBeenCalledWith({
      where: {
        id: 'job-1',
      },
      data: expect.objectContaining({
        status: IngestionJobStatus.FAILED,
        errorMessage: 'Add the correction PDF before processing this job.',
      }),
    });
    expect(
      storedPageService.ensureStoredPagesForDocument,
    ).not.toHaveBeenCalled();
  });
});
