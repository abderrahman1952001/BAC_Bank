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
    const preApprovalChecklist = buildReviewedExtractPreApprovalChecklist({
      summary: imported.summary,
      validation,
      nativeSuggestionCount: imported.draft.assets.filter((asset) =>
        Boolean(asset.nativeSuggestion),
      ).length,
    });
    imported.draft.exam.metadata = {
      ...imported.draft.exam.metadata,
      preApprovalChecklist,
    };
    const reviewNotes = buildReviewedExtractImportReviewNotes({
      importFilePath: input.importFilePath,
      summary: imported.summary,
      validation,
      preApprovalChecklist,
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
  preApprovalChecklist: ReturnType<
    typeof buildReviewedExtractPreApprovalChecklist
  >;
}) {
  const notes = [
    `Imported from ${input.importFilePath}.`,
    `Variants: ${input.summary.variantCount}.`,
    `Exercises: ${input.summary.exerciseCount}.`,
    `Questions: ${input.summary.questionCount}.`,
    `Assets: ${input.summary.assetCount}.`,
    `Uncertainties: ${input.summary.uncertaintyCount}.`,
    input.summary.placeholderAssetCount > 0
      ? `Asset crops needing geometry review: ${input.summary.placeholderAssetCount}.`
      : 'Asset crop geometry was supplied for every imported asset.',
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
      input.summary.placeholderAssetCount > 0
        ? 'Ready for crop cleanup and final human review before approval.'
        : 'Ready for final human review before approval.',
    );
  }

  notes.push(
    `Pre-approval checklist: ${input.preApprovalChecklist.items
      .map((item) => item.label)
      .join(' ')}`,
  );

  return notes.join(' ');
}

function buildReviewedExtractPreApprovalChecklist(input: {
  summary: ReviewedPaperImportSummary;
  validation: IngestionDraftValidation;
  nativeSuggestionCount: number;
}) {
  return {
    schema: 'bac_ingestion_pre_approval_checklist/v1',
    source: 'reviewed_extract_import',
    status: input.validation.errors.length > 0 ? 'blocked' : 'pending_review',
    counts: {
      placeholderAssetCount: input.summary.placeholderAssetCount,
      nativeSuggestionCount: input.nativeSuggestionCount,
      uncertaintyCount: input.summary.uncertaintyCount,
      validationErrorCount: input.validation.errors.length,
      validationWarningCount: input.validation.warnings.length,
    },
    items: [
      {
        key: 'visual_coverage',
        status: 'pending',
        label:
          'Record exam/correction page visual coverage and high-risk regions checked.',
      },
      {
        key: 'crop_review',
        status:
          input.summary.placeholderAssetCount > 0
            ? 'pending'
            : 'pending_confirmation',
        label:
          input.summary.placeholderAssetCount > 0
            ? `Refine or confirm ${input.summary.placeholderAssetCount} placeholder crop(s).`
            : 'Confirm supplied crop geometry in the crop UI.',
      },
      {
        key: 'native_assets',
        status: input.nativeSuggestionCount > 0 ? 'pending' : 'not_applicable',
        label:
          input.nativeSuggestionCount > 0
            ? `Visually check ${input.nativeSuggestionCount} native-rendered asset suggestion(s).`
            : 'No native-rendered asset suggestions were imported.',
      },
      {
        key: 'uncertainties',
        status:
          input.summary.uncertaintyCount > 0 ? 'pending' : 'not_applicable',
        label:
          input.summary.uncertaintyCount > 0
            ? `Resolve or explicitly accept ${input.summary.uncertaintyCount} extraction uncertainty item(s).`
            : 'No extraction uncertainties were imported.',
      },
      {
        key: 'student_preview',
        status: 'pending',
        label:
          'Open the student-side draft preview and check hierarchy, RTL layout, assets, and solution reveal before approval.',
      },
    ],
  };
}
