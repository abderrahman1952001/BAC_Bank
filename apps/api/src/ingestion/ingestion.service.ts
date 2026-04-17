import { Injectable } from '@nestjs/common';
import type {
  AdminIngestionJobListResponse,
  AdminIngestionJobResponse,
  AdminIngestionRecoveryResponse,
  AdminIngestionSnippetRecoveryResponse,
} from '@bac-bank/contracts/ingestion';
import { ProcessIngestionJobDto } from './dto/process-ingestion-job.dto';
import { RecoverAssetContentDto } from './dto/recover-asset-content.dto';
import { RecoverSnippetContentDto } from './dto/recover-snippet-content.dto';
import { UpdateIngestionJobDto } from './dto/update-ingestion-job.dto';
import {
  AttachCorrectionDocumentInput,
  CreateManualUploadJobInput,
  IngestionDraftIntakeService,
} from './ingestion-draft-intake.service';
import { IngestionQueueService } from './ingestion-queue.service';
import { IngestionReadService } from './ingestion-read.service';
import { IngestionRecoveryService } from './ingestion-recovery.service';
import { IngestionReviewService } from './ingestion-review.service';

@Injectable()
export class IngestionService {
  constructor(
    private readonly draftIntakeService: IngestionDraftIntakeService,
    private readonly queueService: IngestionQueueService,
    private readonly readService: IngestionReadService,
    private readonly recoveryService: IngestionRecoveryService,
    private readonly reviewService: IngestionReviewService,
  ) {}

  async listJobs(): Promise<AdminIngestionJobListResponse> {
    return this.readService.listJobs();
  }

  async createManualUploadJob(
    input: CreateManualUploadJobInput,
  ): Promise<AdminIngestionJobResponse> {
    return this.draftIntakeService.createManualUploadJob(input);
  }

  async createPublishedRevisionJob(
    paperId: string,
  ): Promise<AdminIngestionJobResponse> {
    return this.draftIntakeService.createPublishedRevisionJob(paperId);
  }

  async attachCorrectionDocument(
    jobId: string,
    input: AttachCorrectionDocumentInput,
  ): Promise<AdminIngestionJobResponse> {
    return this.draftIntakeService.attachCorrectionDocument(jobId, input);
  }

  async processJob(
    jobId: string,
    payload: ProcessIngestionJobDto = {},
  ): Promise<AdminIngestionJobResponse> {
    return this.queueService.processJob(jobId, payload);
  }

  async runNextQueuedJob(workerId: string) {
    return this.queueService.runNextQueuedJob(workerId);
  }

  async getJob(jobId: string): Promise<AdminIngestionJobResponse> {
    return this.readService.getJob(jobId);
  }

  async updateJob(
    jobId: string,
    payload: UpdateIngestionJobDto,
  ): Promise<AdminIngestionJobResponse> {
    return this.reviewService.updateJob(jobId, payload);
  }

  async approveJob(jobId: string): Promise<AdminIngestionJobResponse> {
    return this.reviewService.approveJob(jobId);
  }

  async publishJob(jobId: string): Promise<AdminIngestionJobResponse> {
    return this.queueService.publishJob(jobId);
  }

  async getDocumentFile(documentId: string) {
    return this.readService.getDocumentFile(documentId);
  }

  async getPageImage(pageId: string) {
    return this.readService.getPageImage(pageId);
  }

  async getPublishedMedia(mediaId: string) {
    return this.readService.getPublishedMedia(mediaId);
  }

  async getAssetPreview(jobId: string, assetId: string) {
    return this.readService.getAssetPreview(jobId, assetId);
  }

  async recoverAssetContent(
    jobId: string,
    assetId: string,
    payload: RecoverAssetContentDto = {},
  ): Promise<AdminIngestionRecoveryResponse> {
    return this.recoveryService.recoverAssetContent(jobId, assetId, payload);
  }

  async recoverSnippetContent(
    jobId: string,
    payload: RecoverSnippetContentDto,
  ): Promise<AdminIngestionSnippetRecoveryResponse> {
    return this.recoveryService.recoverSnippetContent(jobId, payload);
  }
}
