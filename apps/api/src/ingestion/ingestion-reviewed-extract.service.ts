import { BadRequestException, Injectable } from '@nestjs/common';
import { IngestionJobStatus } from '@prisma/client';
import { IngestionOpsService } from './ingestion-ops.service';
import { IngestionProcessingEngineService } from './ingestion-processing-engine.service';
import { IngestionReadService } from './ingestion-read.service';
import type {
  ReviewedPaperExtract,
  ReviewedPaperImportSummary,
} from './reviewed-paper-import';
import { importReviewedPaperExtract } from './reviewed-paper-import';
import {
  type IngestionDraftValidation,
  validateIngestionDraft,
} from './ingestion-validation';

export type ImportReviewedExtractInput = {
  jobId: string;
  reviewedExtract: ReviewedPaperExtract;
  importFilePath: string;
  importedAt?: Date;
  jobTitle?: string | null;
  moveToInReview?: boolean;
};

type ReviewedExtractImportFinalStatus = Extract<
  IngestionJobStatus,
  'DRAFT' | 'IN_REVIEW'
>;

export type ImportReviewedExtractResult = {
  jobId: string;
  finalStatus: ReviewedExtractImportFinalStatus;
  summary: ReviewedPaperImportSummary;
  validation: IngestionDraftValidation;
};

@Injectable()
export class IngestionReviewedExtractService {
  constructor(
    private readonly readService: IngestionReadService,
    private readonly opsService: IngestionOpsService,
    private readonly processingEngine: IngestionProcessingEngineService,
  ) {}

  async importReviewedExtract(
    input: ImportReviewedExtractInput,
  ): Promise<ImportReviewedExtractResult> {
    const job = await this.readService.findJobOrThrow(input.jobId);

    if (job.status === IngestionJobStatus.PUBLISHED) {
      throw new BadRequestException(
        'Published jobs cannot be overwritten by reviewed extract import.',
      );
    }

    const baseDraft = this.readService.hydrateDraft(job);
    const imported = importReviewedPaperExtract({
      baseDraft,
      reviewedExtract: input.reviewedExtract,
      importFilePath: input.importFilePath,
      importedAt: input.importedAt,
      jobTitle: input.jobTitle ?? job.label,
    });
    const validation = validateIngestionDraft(imported.draft);
    const reviewNotes = buildReviewedExtractImportReviewNotes({
      importFilePath: input.importFilePath,
      summary: imported.summary,
      validation,
    });

    await this.opsService.resetToDraft(input.jobId, {
      draft: imported.draft,
      reviewNotes,
      clearErrorMessage: true,
    });

    let finalStatus: ReviewedExtractImportFinalStatus =
      IngestionJobStatus.DRAFT;

    if (validation.errors.length === 0 && input.moveToInReview !== false) {
      await this.processingEngine.runStage({
        jobId: input.jobId,
        replaceExisting: false,
        skipExtraction: true,
        completionStatus: 'IN_REVIEW',
      });
      finalStatus = IngestionJobStatus.IN_REVIEW;
    }

    return {
      jobId: input.jobId,
      finalStatus,
      summary: imported.summary,
      validation,
    };
  }
}

function buildReviewedExtractImportReviewNotes(input: {
  importFilePath: string;
  summary: ReviewedPaperImportSummary;
  validation: IngestionDraftValidation;
}) {
  const notes = [
    `Imported from ${input.importFilePath}.`,
    `Variants: ${input.summary.variantCount}.`,
    `Exercises: ${input.summary.exerciseCount}.`,
    `Questions: ${input.summary.questionCount}.`,
    `Assets: ${input.summary.assetCount}.`,
    `Uncertainties: ${input.summary.uncertaintyCount}.`,
    'Asset crops are full-page placeholders because the reviewed extract does not include crop geometry.',
  ];

  if (input.summary.missingVariantCodes.length > 0) {
    notes.push(
      `Missing variants in reviewed extract: ${input.summary.missingVariantCodes.join(', ')}.`,
    );
  }

  if (input.validation.errors.length > 0) {
    notes.push(
      `Validation errors: ${input.validation.errors.slice(0, 3).join(' | ')}.`,
    );
  } else {
    notes.push(`Validation warnings: ${input.validation.warnings.length}.`);
    notes.push(
      'Ready for manual crop cleanup and final human review before approval.',
    );
  }

  return notes.join(' ');
}
