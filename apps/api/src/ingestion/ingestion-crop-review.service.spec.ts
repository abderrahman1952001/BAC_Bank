import { BadRequestException, NotFoundException } from '@nestjs/common';
import { IngestionJobStatus } from '@prisma/client';
import { IngestionCropReviewService } from './ingestion-crop-review.service';
import type { IngestionDraft } from './ingestion.contract';

function createDraft(): IngestionDraft {
  return {
    schema: 'bac_ingestion_draft/v1',
    exam: {
      year: 2025,
      streamCode: 'SE',
      subjectCode: 'PHYSICS',
      sessionType: 'NORMAL',
      provider: 'eddirasa',
      title: 'BAC 2025 Physics',
      minYear: 2008,
      sourceListingUrl: null,
      sourceExamPageUrl: null,
      sourceCorrectionPageUrl: null,
      examDocumentId: 'doc-exam',
      correctionDocumentId: 'doc-correction',
      examDocumentStorageKey: 'exam.pdf',
      correctionDocumentStorageKey: 'correction.pdf',
      metadata: {
        paperStreamCodes: ['SE', 'M'],
      },
    },
    sourcePages: [
      {
        id: 'page-exam-1',
        documentId: 'doc-exam',
        documentKind: 'EXAM',
        pageNumber: 1,
        width: 1200,
        height: 1600,
      },
      {
        id: 'page-correction-1',
        documentId: 'doc-correction',
        documentKind: 'CORRECTION',
        pageNumber: 1,
        width: 1200,
        height: 1600,
      },
    ],
    assets: [
      {
        id: 'asset-placeholder',
        sourcePageId: 'page-exam-1',
        documentKind: 'EXAM',
        pageNumber: 1,
        variantCode: 'SUJET_1',
        role: 'PROMPT',
        classification: 'graph',
        cropBox: {
          x: 0,
          y: 0,
          width: 1200,
          height: 1600,
        },
        label: 'Graph 1',
        notes: null,
        nativeSuggestion: {
          type: 'graph',
          value: '',
          data: null,
          status: 'suggested',
          source: 'reviewed_extract',
          notes: [],
        },
      },
      {
        id: 'asset-tight',
        sourcePageId: 'page-correction-1',
        documentKind: 'CORRECTION',
        pageNumber: 1,
        variantCode: 'SUJET_1',
        role: 'SOLUTION',
        classification: 'image',
        cropBox: {
          x: 100,
          y: 200,
          width: 300,
          height: 240,
        },
        label: 'Solution figure',
        notes: null,
        nativeSuggestion: null,
      },
    ],
    variants: [
      {
        code: 'SUJET_1',
        title: 'الموضوع الأول',
        nodes: [
          {
            id: 'exercise-1',
            nodeType: 'EXERCISE',
            parentId: null,
            orderIndex: 0,
            label: 'التمرين الأول',
            maxPoints: null,
            topicCodes: [],
            blocks: [],
          },
          {
            id: 'question-1',
            nodeType: 'QUESTION',
            parentId: 'exercise-1',
            orderIndex: 0,
            label: '1',
            maxPoints: null,
            topicCodes: [],
            blocks: [
              {
                id: 'block-1',
                role: 'PROMPT',
                type: 'graph',
                value: '',
                assetId: 'asset-placeholder',
              },
            ],
          },
        ],
      },
      {
        code: 'SUJET_2',
        title: 'الموضوع الثاني',
        nodes: [],
      },
    ],
  };
}

function createJob(status = IngestionJobStatus.IN_REVIEW) {
  return {
    id: 'job-1',
    status,
    paperSourceId: 'paper-source-1',
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-02T00:00:00.000Z'),
  };
}

describe('IngestionCropReviewService', () => {
  it('lists full-page asset placeholders across editable ingestion jobs', async () => {
    const draft = createDraft();
    const service = new IngestionCropReviewService(
      {
        ingestionJob: {
          update: jest.fn(),
        },
      } as never,
      {
        listJobsForReview: jest.fn().mockResolvedValue([createJob()]),
        hydrateDraft: jest.fn().mockReturnValue(draft),
      } as never,
    );

    const response = await service.listCropQueue();

    expect(response.summary).toEqual({
      job_count: 1,
      placeholder_count: 1,
    });
    expect(response.data).toHaveLength(1);
    expect(response.data[0]).toMatchObject({
      job_id: 'job-1',
      job_label: 'BAC 2025 Physics',
      year: 2025,
      subject_code: 'PHYSICS',
      stream_codes: ['SE', 'M'],
      asset_id: 'asset-placeholder',
      asset_label: 'Graph 1',
      classification: 'graph',
      role: 'PROMPT',
      variant_code: 'SUJET_1',
      source_page_id: 'page-exam-1',
      source_document_kind: 'EXAM',
      source_page_number: 1,
      page_image_url: '/api/v1/ingestion/pages/page-exam-1/image',
      crop_box: {
        x: 0,
        y: 0,
        width: 1200,
        height: 1600,
      },
      placeholder: true,
      linked_node_path: ['التمرين الأول', '1'],
    });
  });

  it('patches one asset crop and invalidates stale native suggestions', async () => {
    const draft = createDraft();
    const prisma = {
      ingestionJob: {
        update: jest.fn().mockResolvedValue(undefined),
      },
    };
    const readService = {
      findJobOrThrow: jest
        .fn()
        .mockResolvedValue(createJob(IngestionJobStatus.APPROVED)),
      hydrateDraft: jest.fn().mockReturnValue(draft),
    };
    const service = new IngestionCropReviewService(
      prisma as never,
      readService as never,
    );

    const response = await service.updateAssetCrop(
      'job-1',
      'asset-placeholder',
      {
        crop_box: {
          x: 120,
          y: 220,
          width: 480,
          height: 360,
        },
        needs_cleanup: true,
      },
    );

    expect(prisma.ingestionJob.update).toHaveBeenCalledWith({
      where: {
        id: 'job-1',
      },
      data: expect.objectContaining({
        status: IngestionJobStatus.IN_REVIEW,
        reviewedAt: null,
      }),
    });
    const savedDraft = prisma.ingestionJob.update.mock.calls[0][0].data
      .draftJson as IngestionDraft;
    const savedAsset = savedDraft.assets.find(
      (asset) => asset.id === 'asset-placeholder',
    );
    expect(savedAsset?.cropBox).toEqual({
      x: 120,
      y: 220,
      width: 480,
      height: 360,
    });
    expect(savedAsset?.cleanupRequired).toBe(true);
    expect(savedAsset?.nativeSuggestion?.status).toBe('stale');
    expect(response.item.placeholder).toBe(false);
    expect(response.item.needs_cleanup).toBe(true);
  });

  it('rejects crop edits for frozen jobs', async () => {
    const service = new IngestionCropReviewService(
      {
        ingestionJob: {
          update: jest.fn(),
        },
      } as never,
      {
        findJobOrThrow: jest
          .fn()
          .mockResolvedValue(createJob(IngestionJobStatus.PUBLISHED)),
        hydrateDraft: jest.fn().mockReturnValue(createDraft()),
      } as never,
    );

    await expect(
      service.updateAssetCrop('job-1', 'asset-placeholder', {
        crop_box: {
          x: 1,
          y: 1,
          width: 10,
          height: 10,
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects missing asset ids', async () => {
    const service = new IngestionCropReviewService(
      {
        ingestionJob: {
          update: jest.fn(),
        },
      } as never,
      {
        findJobOrThrow: jest.fn().mockResolvedValue(createJob()),
        hydrateDraft: jest.fn().mockReturnValue(createDraft()),
      } as never,
    );

    await expect(
      service.updateAssetCrop('job-1', 'missing-asset', {
        crop_box: {
          x: 1,
          y: 1,
          width: 10,
          height: 10,
        },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
