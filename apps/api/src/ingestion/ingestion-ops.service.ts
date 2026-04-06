import { BadRequestException, Injectable } from '@nestjs/common';
import type { AdminIngestionJobResponse } from '@bac-bank/contracts/ingestion';
import { IngestionJobStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IngestionDraft } from './ingestion.contract';
import { projectIngestionJobMetadataFromDraft } from './ingestion-job-metadata';
import { IngestionReadService } from './ingestion-read.service';

type JobMetadata = Record<string, unknown> | null;

type SaveDraftInput = {
  draft: IngestionDraft;
  reviewNotes?: string | null;
  metadata?: JobMetadata;
  clearErrorMessage?: boolean;
};

type ResetToDraftInput = {
  draft?: IngestionDraft;
  reviewNotes?: string | null;
  metadata?: JobMetadata;
  clearErrorMessage?: boolean;
  preservePublishedStatus?: boolean;
};

@Injectable()
export class IngestionOpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly readService: IngestionReadService,
  ) {}

  async saveDraft(
    jobId: string,
    input: SaveDraftInput,
  ): Promise<AdminIngestionJobResponse> {
    const job = await this.readService.findJobOrThrow(jobId);
    this.assertJobIsMutable(job.status);

    await this.prisma.ingestionJob.update({
      where: {
        id: jobId,
      },
      data: {
        ...projectIngestionJobMetadataFromDraft(input.draft),
        reviewNotes:
          input.reviewNotes !== undefined ? input.reviewNotes : job.reviewNotes,
        ...(input.metadata !== undefined
          ? {
              metadata: this.toNullableJsonValue(input.metadata),
            }
          : {}),
        ...(input.clearErrorMessage
          ? {
              errorMessage: null,
            }
          : {}),
        draftJson: this.toJsonValue(input.draft),
      },
    });

    return this.readService.getJob(jobId);
  }

  async resetToDraft(
    jobId: string,
    input: ResetToDraftInput = {},
  ): Promise<AdminIngestionJobResponse> {
    const job = await this.readService.findJobOrThrow(jobId);
    this.assertJobIsMutable(job.status);

    const draft = input.draft ?? this.readService.hydrateDraft(job);
    const preservePublishedStatus =
      input.preservePublishedStatus === true &&
      job.status === IngestionJobStatus.PUBLISHED;
    const nextStatus = preservePublishedStatus
      ? IngestionJobStatus.PUBLISHED
      : IngestionJobStatus.DRAFT;

    await this.prisma.ingestionJob.update({
      where: {
        id: jobId,
      },
      data: {
        ...projectIngestionJobMetadataFromDraft(draft),
        status: nextStatus,
        reviewedAt: preservePublishedStatus ? job.reviewedAt : null,
        reviewNotes:
          input.reviewNotes !== undefined ? input.reviewNotes : job.reviewNotes,
        errorMessage:
          input.clearErrorMessage === false ? job.errorMessage : null,
        ...(input.metadata !== undefined
          ? {
              metadata: this.toNullableJsonValue(input.metadata),
            }
          : {}),
        draftJson: this.toJsonValue(draft),
      },
    });

    return this.readService.getJob(jobId);
  }

  private assertJobIsMutable(status: IngestionJobStatus) {
    if (
      status === IngestionJobStatus.QUEUED ||
      status === IngestionJobStatus.PROCESSING
    ) {
      throw new BadRequestException(
        'Queued or active ingestion jobs cannot be edited until processing finishes.',
      );
    }
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private toNullableJsonValue(value: JobMetadata) {
    if (value === null) {
      return Prisma.JsonNull;
    }

    return this.toJsonValue(value);
  }
}
