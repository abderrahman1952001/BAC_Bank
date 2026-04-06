import { BadRequestException, Injectable } from '@nestjs/common';
import type { AdminIngestionJobResponse } from '@bac-bank/contracts/ingestion';
import { IngestionJobStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateIngestionJobDto } from './dto/update-ingestion-job.dto';
import {
  IngestionDraft,
  normalizeIngestionDraft,
} from './ingestion.contract';
import { projectIngestionJobMetadataFromDraft } from './ingestion-job-metadata';
import { IngestionReadService } from './ingestion-read.service';
import { validateIngestionDraft } from './ingestion-validation';
import {
  canApproveIngestionJob,
  canEditIngestionJob,
  resolveStatusAfterDraftEdit,
} from './ingestion-workflow';
import { hasDefinedUpdateIngestionJobField } from './update-ingestion-job-payload';

@Injectable()
export class IngestionReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly readService: IngestionReadService,
  ) {}

  async updateJob(
    jobId: string,
    payload: UpdateIngestionJobDto,
  ): Promise<AdminIngestionJobResponse> {
    const job = await this.readService.findJobOrThrow(jobId);

    if (!canEditIngestionJob(job.status)) {
      if (job.status === IngestionJobStatus.PUBLISHED) {
        throw new BadRequestException(
          'Published ingestion jobs are frozen. Start a revision from the live library to make further changes.',
        );
      }

      throw new BadRequestException(
        'Queued or active ingestion jobs cannot be edited until processing finishes.',
      );
    }

    const currentDraft = this.readService.hydrateDraft(job);
    let draft = currentDraft;
    const reviewNotes = hasDefinedUpdateIngestionJobField(
      payload,
      'review_notes',
    )
      ? this.readOptionalString(payload.review_notes)
      : job.reviewNotes;

    if (hasDefinedUpdateIngestionJobField(payload, 'draft_json')) {
      try {
        draft = normalizeIngestionDraft(payload.draft_json);
      } catch (error) {
        throw new BadRequestException(
          error instanceof Error
            ? error.message
            : 'Invalid draft_json payload.',
        );
      }
    }

    const draftChanged = !this.draftsEqual(currentDraft, draft);
    const nextStatus = resolveStatusAfterDraftEdit({
      currentStatus: job.status,
      provider: currentDraft.exam.provider,
      draftChanged,
    });
    const reviewedAt = nextStatus === job.status ? job.reviewedAt : null;

    await this.prisma.ingestionJob.update({
      where: {
        id: jobId,
      },
      data: {
        ...projectIngestionJobMetadataFromDraft(draft),
        reviewNotes,
        status: nextStatus,
        reviewedAt,
        draftJson: this.toJsonValue(draft),
      },
    });

    return this.readService.getJob(jobId);
  }

  async approveJob(jobId: string): Promise<AdminIngestionJobResponse> {
    const job = await this.readService.findJobOrThrow(jobId);

    if (
      job.status === IngestionJobStatus.QUEUED ||
      job.status === IngestionJobStatus.PROCESSING
    ) {
      throw new BadRequestException(
        'Wait until processing finishes before approving this ingestion job.',
      );
    }

    if (
      !canApproveIngestionJob({
        status: job.status,
        provider: this.readService.hydrateDraft(job).exam.provider,
      })
    ) {
      if (job.status === IngestionJobStatus.PUBLISHED) {
        throw new BadRequestException(
          'Published ingestion jobs are frozen. Start a revision from the live library to make further changes.',
        );
      }

      throw new BadRequestException(
        'Finish review before approving this ingestion job.',
      );
    }

    const draft = this.readService.hydrateDraft(job);
    const validation = validateIngestionDraft(draft);
    this.throwIfDraftValidationFails(validation, 'approve');

    if (job.status === IngestionJobStatus.APPROVED) {
      return this.readService.mapJobDetail(job, draft);
    }

    await this.prisma.ingestionJob.update({
      where: {
        id: jobId,
      },
      data: {
        ...projectIngestionJobMetadataFromDraft(draft),
        status: IngestionJobStatus.APPROVED,
        reviewedAt: new Date(),
        draftJson: this.toJsonValue(draft),
      },
    });

    return this.readService.getJob(jobId);
  }

  private readOptionalString(value: unknown) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('Expected a string value.');
    }

    const trimmed = value.trim();
    return trimmed || null;
  }

  private throwIfDraftValidationFails(
    validation: ReturnType<typeof validateIngestionDraft>,
    action: 'approve' | 'publish',
  ) {
    if (validation.errors.length === 0) {
      return;
    }

    const preview = validation.errors.slice(0, 3).join(' | ');
    throw new BadRequestException(
      `Cannot ${action} this draft until validation errors are resolved. ${preview}`,
    );
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private draftsEqual(left: IngestionDraft, right: IngestionDraft) {
    return (
      JSON.stringify(this.toJsonValue(left)) ===
      JSON.stringify(this.toJsonValue(right))
    );
  }
}
