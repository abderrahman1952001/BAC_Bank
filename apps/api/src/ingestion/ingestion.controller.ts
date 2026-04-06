import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Multipart, MultipartFile } from '@fastify/multipart';
import type { FastifyReply } from 'fastify';
import type { FastifyRequest } from 'fastify';
import { AdminRoleGuard } from '../admin/admin.guard';
import { ProcessIngestionJobDto } from './dto/process-ingestion-job.dto';
import { RecoverAssetContentDto } from './dto/recover-asset-content.dto';
import { RecoverSnippetContentDto } from './dto/recover-snippet-content.dto';
import { UpdateIngestionJobDto } from './dto/update-ingestion-job.dto';
import { IngestionService } from './ingestion.service';

type MultipartRequest = FastifyRequest & {
  isMultipart: () => boolean;
  parts: () => AsyncIterableIterator<Multipart>;
};

@Controller()
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @UseGuards(AdminRoleGuard)
  @Get('admin/ingestion/jobs')
  listJobs() {
    return this.ingestionService.listJobs();
  }

  @UseGuards(AdminRoleGuard)
  @Get('admin/ingestion/jobs/:jobId')
  getJob(@Param('jobId', ParseUUIDPipe) jobId: string) {
    return this.ingestionService.getJob(jobId);
  }

  @UseGuards(AdminRoleGuard)
  @Patch('admin/ingestion/jobs/:jobId')
  updateJob(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Body() payload: UpdateIngestionJobDto,
  ) {
    return this.ingestionService.updateJob(jobId, payload);
  }

  @UseGuards(AdminRoleGuard)
  @Post('admin/ingestion/intake/manual')
  async createManualUploadJob(@Req() request: FastifyRequest) {
    const payload = await this.parseManualUploadRequest(request);
    return this.ingestionService.createManualUploadJob(payload);
  }

  @UseGuards(AdminRoleGuard)
  @Post('admin/ingestion/papers/:paperId/revision')
  createPublishedRevisionJob(@Param('paperId', ParseUUIDPipe) paperId: string) {
    return this.ingestionService.createPublishedRevisionJob(paperId);
  }

  @UseGuards(AdminRoleGuard)
  @Post('admin/ingestion/jobs/:jobId/correction')
  async attachCorrectionDocument(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Req() request: FastifyRequest,
  ) {
    const payload = await this.parseCorrectionUploadRequest(request);
    return this.ingestionService.attachCorrectionDocument(jobId, payload);
  }

  @UseGuards(AdminRoleGuard)
  @Post('admin/ingestion/jobs/:jobId/approve')
  approveJob(@Param('jobId', ParseUUIDPipe) jobId: string) {
    return this.ingestionService.approveJob(jobId);
  }

  @UseGuards(AdminRoleGuard)
  @Post('admin/ingestion/jobs/:jobId/process')
  processJob(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Body() payload: ProcessIngestionJobDto = {},
  ) {
    return this.ingestionService.processJob(jobId, payload);
  }

  @UseGuards(AdminRoleGuard)
  @Post('admin/ingestion/jobs/:jobId/publish')
  publishJob(@Param('jobId', ParseUUIDPipe) jobId: string) {
    return this.ingestionService.publishJob(jobId);
  }

  @UseGuards(AdminRoleGuard)
  @Post('admin/ingestion/jobs/:jobId/assets/:assetId/recover')
  recoverAssetContent(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Param('assetId') assetId: string,
    @Body() payload: RecoverAssetContentDto = {},
  ) {
    return this.ingestionService.recoverAssetContent(jobId, assetId, payload);
  }

  @UseGuards(AdminRoleGuard)
  @Post('admin/ingestion/jobs/:jobId/recover-snippet')
  recoverSnippetContent(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Body() payload: RecoverSnippetContentDto,
  ) {
    return this.ingestionService.recoverSnippetContent(jobId, payload);
  }

  @UseGuards(AdminRoleGuard)
  @Get('ingestion/documents/:documentId/file')
  async getDocumentFile(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    const file = await this.ingestionService.getDocumentFile(documentId);
    response.header('Content-Type', file.mimeType);
    response.header(
      'Content-Disposition',
      `inline; filename="${file.fileName.replace(/"/g, '')}"`,
    );
    return new StreamableFile(file.data);
  }

  @UseGuards(AdminRoleGuard)
  @Get('ingestion/pages/:pageId/image')
  async getPageImage(
    @Param('pageId', ParseUUIDPipe) pageId: string,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    const image = await this.ingestionService.getPageImage(pageId);
    response.header('Content-Type', image.mimeType);
    return new StreamableFile(image.data);
  }

  @Get('ingestion/media/:mediaId')
  async getPublishedMedia(
    @Param('mediaId', ParseUUIDPipe) mediaId: string,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    const image = await this.ingestionService.getPublishedMedia(mediaId);
    response.header('Content-Type', image.mimeType);
    response.header('Cache-Control', 'public, max-age=31536000, immutable');
    return new StreamableFile(image.data);
  }

  @UseGuards(AdminRoleGuard)
  @Get('ingestion/jobs/:jobId/assets/:assetId/preview')
  async getAssetPreview(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Param('assetId') assetId: string,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    const image = await this.ingestionService.getAssetPreview(jobId, assetId);
    response.header('Content-Type', image.mimeType);
    return new StreamableFile(image.data);
  }

  private async parseManualUploadRequest(request: FastifyRequest) {
    const multipartRequest = this.asMultipartRequest(request);

    if (!multipartRequest || !multipartRequest.isMultipart()) {
      throw new BadRequestException(
        'manual intake expects multipart/form-data.',
      );
    }

    const fields = new Map<string, string>();
    const paperStreamCodes: string[] = [];
    let examDocument: Awaited<
      ReturnType<IngestionController['readMultipartFilePart']>
    > | null = null;
    let correctionDocument: Awaited<
      ReturnType<IngestionController['readMultipartFilePart']>
    > | null = null;

    for await (const part of multipartRequest.parts()) {
      if (part.type === 'file') {
        const parsed = await this.readMultipartFilePart(part);

        if (part.fieldname === 'exam_pdf') {
          examDocument = parsed;
          continue;
        }

        if (part.fieldname === 'correction_pdf') {
          correctionDocument = parsed;
          continue;
        }

        throw new BadRequestException(
          `Unexpected file field "${part.fieldname}".`,
        );
      }

      const fieldValue =
        typeof part.value === 'string' ? part.value : String(part.value);

      if (part.fieldname === 'paper_stream_codes') {
        paperStreamCodes.push(fieldValue);
        continue;
      }

      fields.set(part.fieldname, fieldValue);
    }

    if (!examDocument) {
      throw new BadRequestException('exam_pdf is required.');
    }

    return {
      year: this.parseIntegerField(fields.get('year'), 'year'),
      subjectCode: this.parseRequiredField(
        fields.get('subject_code'),
        'subject_code',
      ),
      sessionType:
        fields.get('session') === 'MAKEUP'
          ? ('MAKEUP' as const)
          : ('NORMAL' as const),
      title: this.parseRequiredField(fields.get('title'), 'title'),
      qualifierKey: this.parseOptionalField(fields.get('qualifier_key')),
      sourceReference: this.parseOptionalField(fields.get('source_reference')),
      paperStreamCodes,
      examDocument,
      correctionDocument,
    };
  }

  private async readMultipartFilePart(part: MultipartFile) {
    return {
      buffer: await part.toBuffer(),
      mimeType: part.mimetype,
      originalFileName: part.filename,
    };
  }

  private async parseCorrectionUploadRequest(request: FastifyRequest) {
    const multipartRequest = this.asMultipartRequest(request);

    if (!multipartRequest || !multipartRequest.isMultipart()) {
      throw new BadRequestException(
        'correction upload expects multipart/form-data.',
      );
    }

    let correctionDocument: Awaited<
      ReturnType<IngestionController['readMultipartFilePart']>
    > | null = null;

    for await (const part of multipartRequest.parts()) {
      if (part.type !== 'file') {
        continue;
      }

      if (part.fieldname !== 'correction_pdf') {
        throw new BadRequestException(
          `Unexpected file field "${part.fieldname}".`,
        );
      }

      correctionDocument = await this.readMultipartFilePart(part);
    }

    if (!correctionDocument) {
      throw new BadRequestException('correction_pdf is required.');
    }

    return {
      correctionDocument,
    };
  }

  private asMultipartRequest(request: FastifyRequest): MultipartRequest | null {
    const candidate = request as Partial<MultipartRequest>;

    if (
      typeof candidate.isMultipart !== 'function' ||
      typeof candidate.parts !== 'function'
    ) {
      return null;
    }

    return request as MultipartRequest;
  }

  private parseRequiredField(value: string | undefined, fieldName: string) {
    if (!value || !value.trim()) {
      throw new BadRequestException(`${fieldName} is required.`);
    }

    return value.trim();
  }

  private parseOptionalField(value: string | undefined) {
    if (!value || !value.trim()) {
      return null;
    }

    return value.trim();
  }

  private parseIntegerField(value: string | undefined, fieldName: string) {
    if (!value || !value.trim()) {
      throw new BadRequestException(`${fieldName} is required.`);
    }

    const parsed = Number.parseInt(value, 10);

    if (!Number.isInteger(parsed)) {
      throw new BadRequestException(`${fieldName} must be an integer.`);
    }

    return parsed;
  }
}
