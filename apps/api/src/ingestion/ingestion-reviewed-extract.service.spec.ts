import { BadRequestException } from '@nestjs/common';
import { IngestionJobStatus } from '@prisma/client';
import { createEmptyDraft } from './ingestion.contract';
import { parseReviewedPaperExtract } from './reviewed-paper-import';
import { IngestionReviewedExtractService } from './ingestion-reviewed-extract.service';

type DraftShape = ReturnType<typeof createBaseDraft>;
type ResetToDraftInput = {
  draft: DraftShape;
  reviewNotes: string | null;
  clearErrorMessage: boolean;
};
type RunStageInput = {
  jobId: string;
  replaceExisting: boolean;
  completionStatus: 'IN_REVIEW';
};
type JobRecord = {
  id: string;
  status: IngestionJobStatus;
  label: string;
};
type FindJobOrThrowMock = jest.MockedFunction<
  (jobId: string) => Promise<JobRecord>
>;
type HydrateDraftMock = jest.MockedFunction<(job: unknown) => DraftShape>;
type ResetToDraftMock = jest.MockedFunction<
  (jobId: string, input: ResetToDraftInput) => Promise<void>
>;
type RunStageMock = jest.MockedFunction<
  (input: RunStageInput) => Promise<void>
>;

function createBaseDraft() {
  const draft = createEmptyDraft({
    year: 2025,
    streamCode: 'SE',
    subjectCode: 'MATHEMATICS',
    sessionType: 'NORMAL',
    provider: 'eddirasa',
    title: 'BAC 2025 Mathematics',
    minYear: 2008,
  });

  draft.exam.examDocumentId = 'doc-exam';
  draft.exam.correctionDocumentId = 'doc-correction';
  draft.exam.examDocumentStorageKey = 'bac/2025/documents/exam.pdf';
  draft.exam.correctionDocumentStorageKey = 'bac/2025/documents/correction.pdf';
  draft.sourcePages = [
    {
      id: 'exam-page-1',
      documentId: 'doc-exam',
      documentKind: 'EXAM',
      pageNumber: 1,
      width: 1000,
      height: 1400,
    },
    {
      id: 'correction-page-1',
      documentId: 'doc-correction',
      documentKind: 'CORRECTION',
      pageNumber: 1,
      width: 1000,
      height: 1400,
    },
  ];

  return draft;
}

function createReviewedExtract() {
  return parseReviewedPaperExtract({
    variants: [
      {
        code: 'SUJET_1',
        title: 'الموضوع الأول',
        exercises: [
          {
            orderIndex: 1,
            title: 'التمرين الأول',
            contextBlocks: [
              {
                type: 'paragraph',
                text: 'تمهيد.',
              },
            ],
            assetIds: [],
            questions: [
              {
                orderIndex: 1,
                promptBlocks: [
                  {
                    type: 'paragraph',
                    text: '1) احسب النهاية.',
                  },
                ],
                solutionBlocks: [
                  {
                    type: 'paragraph',
                    text: 'نستعمل خواص النهايات.',
                  },
                ],
                hintBlocks: [],
                rubricBlocks: [
                  {
                    type: 'paragraph',
                    text: '1',
                  },
                ],
                assetIds: [],
              },
            ],
          },
        ],
      },
    ],
    assets: [],
    uncertainties: [],
    exam: {},
  });
}

describe('IngestionReviewedExtractService', () => {
  it('imports a reviewed extract and advances the job to in review when validation passes', async () => {
    const findJobOrThrow: FindJobOrThrowMock = jest.fn();
    findJobOrThrow.mockResolvedValue({
      id: 'job-1',
      status: IngestionJobStatus.DRAFT,
      label: 'Existing job title',
    });
    const hydrateDraft: HydrateDraftMock = jest.fn();
    hydrateDraft.mockReturnValue(createBaseDraft());
    const readService = {
      findJobOrThrow,
      hydrateDraft,
    };
    const resetToDraft: ResetToDraftMock = jest.fn();
    resetToDraft.mockResolvedValue(undefined);
    const opsService = {
      resetToDraft,
    };
    const runStage: RunStageMock = jest.fn();
    runStage.mockResolvedValue(undefined);
    const processingEngine = {
      runStage,
    };
    const service = new IngestionReviewedExtractService(
      readService as never,
      opsService as never,
      processingEngine as never,
    );

    const result = await service.importReviewedExtract({
      jobId: 'job-1',
      reviewedExtract: createReviewedExtract(),
      importFilePath: 'tmp/mathematics-se-2025.json',
      jobTitle: 'BAC 2025 MATHEMATICS SE',
      importedAt: new Date('2026-04-21T00:00:00.000Z'),
    });

    expect(resetToDraft).toHaveBeenCalledTimes(1);
    const [resetJobId, resetPayload] = resetToDraft.mock.calls[0] ?? [];
    expect(resetJobId).toBe('job-1');
    expect(resetPayload?.clearErrorMessage).toBe(true);
    expect(resetPayload?.reviewNotes).toContain(
      'Imported from tmp/mathematics-se-2025.json.',
    );
    expect(resetPayload?.draft.exam.title).toBe('BAC 2025 MATHEMATICS SE');
    expect(resetPayload?.draft.exam.metadata.importedFromReviewedExtract).toBe(
      true,
    );
    expect(resetPayload?.draft.exam.metadata.reviewedExtractFile).toBe(
      'tmp/mathematics-se-2025.json',
    );
    expect(runStage).toHaveBeenCalledWith({
      jobId: 'job-1',
      replaceExisting: false,
      completionStatus: 'IN_REVIEW',
    });
    expect(result.finalStatus).toBe(IngestionJobStatus.IN_REVIEW);
    expect(result.validation.errors).toEqual([]);
  });

  it('keeps the job in draft when validation fails', async () => {
    const invalidDraft = createBaseDraft();
    invalidDraft.sourcePages = [];

    const findJobOrThrow: FindJobOrThrowMock = jest.fn();
    findJobOrThrow.mockResolvedValue({
      id: 'job-2',
      status: IngestionJobStatus.DRAFT,
      label: 'Existing job title',
    });
    const hydrateDraft: HydrateDraftMock = jest.fn();
    hydrateDraft.mockReturnValue(invalidDraft);
    const readService = {
      findJobOrThrow,
      hydrateDraft,
    };
    const resetToDraft: ResetToDraftMock = jest.fn();
    resetToDraft.mockResolvedValue(undefined);
    const opsService = {
      resetToDraft,
    };
    const runStage: RunStageMock = jest.fn();
    runStage.mockResolvedValue(undefined);
    const processingEngine = {
      runStage,
    };
    const service = new IngestionReviewedExtractService(
      readService as never,
      opsService as never,
      processingEngine as never,
    );

    const result = await service.importReviewedExtract({
      jobId: 'job-2',
      reviewedExtract: createReviewedExtract(),
      importFilePath: 'tmp/broken.json',
    });

    expect(runStage).not.toHaveBeenCalled();
    expect(result.finalStatus).toBe(IngestionJobStatus.DRAFT);
    expect(result.validation.errors).not.toEqual([]);
  });

  it('rejects published jobs', async () => {
    const service = new IngestionReviewedExtractService(
      {
        findJobOrThrow: jest.fn().mockResolvedValue({
          id: 'job-3',
          status: IngestionJobStatus.PUBLISHED,
          label: 'Published job',
        }),
      } as never,
      {
        resetToDraft: jest.fn(),
      } as never,
      {
        runStage: jest.fn(),
      } as never,
    );

    await expect(
      service.importReviewedExtract({
        jobId: 'job-3',
        reviewedExtract: createReviewedExtract(),
        importFilePath: 'tmp/published.json',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
