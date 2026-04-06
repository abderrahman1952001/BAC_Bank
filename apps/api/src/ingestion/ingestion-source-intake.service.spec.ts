import { IngestionJobStatus, SessionType } from '@prisma/client';
import { createEmptyDraft } from './ingestion.contract';
import { IngestionSourceIntakeService } from './ingestion-source-intake.service';

describe('IngestionSourceIntakeService', () => {
  let prisma: {
    ingestionJob: {
      findFirst: jest.Mock;
      update: jest.Mock;
      create: jest.Mock;
    };
  };
  let sourceDocumentService: {
    replaceSourceDocument: jest.Mock;
    storeSourceDocument: jest.Mock;
    deleteSourceDocument: jest.Mock;
  };
  let service: IngestionSourceIntakeService;

  beforeEach(() => {
    prisma = {
      ingestionJob: {
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
    };
    sourceDocumentService = {
      replaceSourceDocument: jest.fn(),
      storeSourceDocument: jest.fn(),
      deleteSourceDocument: jest.fn(),
    };
    service = new IngestionSourceIntakeService(
      prisma as never,
      sourceDocumentService as never,
    );
  });

  it('skips reviewed jobs instead of overwriting them during bulk intake', async () => {
    prisma.ingestionJob.findFirst.mockResolvedValueOnce({
      id: 'job-1',
      status: IngestionJobStatus.APPROVED,
      sourceDocuments: [],
    });

    const draft = createEmptyDraft({
      year: 2024,
      streamCode: 'SE',
      subjectCode: 'MATHEMATICS',
      sessionType: 'NORMAL',
      provider: 'eddirasa',
      title: 'BAC 2024',
      minYear: 2008,
    });

    await expect(
      service.upsertExternalSourceJob({
        externalExamUrl: 'https://eddirasa.test/exam.pdf',
        replaceExisting: true,
        storageClient: {} as never,
        draft,
        metadata: {
          examPdfUrl: 'https://eddirasa.test/exam.pdf',
        },
        job: {
          label: 'BAC 2024',
          provider: 'eddirasa',
          sourceListingUrl: 'https://eddirasa.test/listing',
          sourceExamPageUrl: 'https://eddirasa.test/page',
          sourceCorrectionPageUrl: 'https://eddirasa.test/correction-page',
          year: 2024,
          streamCode: 'SE',
          subjectCode: 'MATHEMATICS',
          sessionType: SessionType.NORMAL,
          minYear: 2008,
        },
        documents: [],
      }),
    ).resolves.toBeNull();

    expect(prisma.ingestionJob.update).not.toHaveBeenCalled();
    expect(prisma.ingestionJob.create).not.toHaveBeenCalled();
    expect(sourceDocumentService.storeSourceDocument).not.toHaveBeenCalled();
  });
});
