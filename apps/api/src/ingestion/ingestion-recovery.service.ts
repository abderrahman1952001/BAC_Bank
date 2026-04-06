import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AdminIngestionRecoveryResponse,
  AdminIngestionSnippetRecoveryResponse,
} from '@bac-bank/contracts/ingestion';
import { SourceDocumentKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RecoverAssetContentDto } from './dto/recover-asset-content.dto';
import { RecoverSnippetContentDto } from './dto/recover-snippet-content.dto';
import { DraftAsset } from './ingestion.contract';
import { cropBufferWithBox } from './ingestion-image-crop';
import { IngestionReadService } from './ingestion-read.service';
import {
  readDefaultGeminiMaxOutputTokens,
  readDefaultGeminiModel,
  readDefaultGeminiTemperature,
  recoverBlockSuggestionFromGemini,
} from './gemini-extractor';
import { R2StorageClient, readR2ConfigFromEnv } from './r2-storage';

@Injectable()
export class IngestionRecoveryService {
  private storageClient: R2StorageClient | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly readService: IngestionReadService,
  ) {}

  async recoverAssetContent(
    jobId: string,
    assetId: string,
    payload: RecoverAssetContentDto = {},
  ): Promise<AdminIngestionRecoveryResponse> {
    const job = await this.readService.findJobOrThrow(jobId);
    const draft = this.readService.hydrateDraft(job);
    const asset = draft.assets.find((entry) => entry.id === assetId);

    if (!asset) {
      throw new NotFoundException(
        `Asset ${assetId} not found in job ${jobId}.`,
      );
    }

    const page = await this.findSourcePageForJobOrThrow(
      jobId,
      asset.sourcePageId,
    );
    const mode = this.toGeminiRecoveryMode(payload.mode, asset.classification);
    const suggestion = await this.recoverSuggestionFromCrop({
      pageStorageKey: page.storageKey,
      cropBox: asset.cropBox,
      label: asset.label ?? asset.id,
      mode,
      fileName: `${asset.id}.png`,
      notes: asset.notes,
    });

    return {
      asset: {
        id: asset.id,
        classification: asset.classification,
        source_page_id: asset.sourcePageId,
        page_number: asset.pageNumber,
      },
      recovery: {
        mode,
        type: suggestion.type,
        value: suggestion.value,
        data: suggestion.data,
        notes: suggestion.notes,
      },
    };
  }

  async recoverSnippetContent(
    jobId: string,
    payload: RecoverSnippetContentDto,
  ): Promise<AdminIngestionSnippetRecoveryResponse> {
    const sourcePageId = this.readOptionalString(payload.source_page_id);

    if (!sourcePageId) {
      throw new BadRequestException('source_page_id is required.');
    }

    const cropBox = this.readCropBoxPayload(payload.crop_box);
    const page = await this.findSourcePageForJobOrThrow(jobId, sourcePageId);
    const mode = 'text';
    const suggestion = await this.recoverSuggestionFromCrop({
      pageStorageKey: page.storageKey,
      cropBox,
      label:
        this.readOptionalString(payload.label) ??
        `${page.document.kind} page ${page.pageNumber} snippet`,
      mode,
      fileName: `snippet-${page.id}.png`,
      caption: this.readOptionalString(payload.caption),
      notes: this.readOptionalString(payload.notes),
    });

    return {
      source_page: {
        id: page.id,
        page_number: page.pageNumber,
        document_kind:
          page.document.kind === SourceDocumentKind.CORRECTION
            ? 'CORRECTION'
            : 'EXAM',
      },
      recovery: {
        mode,
        type: suggestion.type,
        value: suggestion.value,
        data: suggestion.data,
        notes: suggestion.notes,
      },
    };
  }

  private async recoverSuggestionFromCrop(input: {
    pageStorageKey: string;
    cropBox: DraftAsset['cropBox'];
    label: string;
    mode: 'text' | 'table' | 'tree' | 'graph';
    fileName: string;
    caption?: string | null;
    notes?: string | null;
  }) {
    const pageBuffer = await this.getStorageClient().getObjectBuffer(
      input.pageStorageKey,
    );
    const cropped = await cropBufferWithBox(pageBuffer, input.cropBox);

    return recoverBlockSuggestionFromGemini({
      label: input.label,
      mode: input.mode,
      model: readDefaultGeminiModel(),
      maxOutputTokens: readDefaultGeminiMaxOutputTokens(),
      temperature: readDefaultGeminiTemperature(),
      imageBuffer: cropped,
      fileName: input.fileName,
      caption: input.caption,
      notes: input.notes,
    });
  }

  private async findSourcePageForJobOrThrow(jobId: string, pageId: string) {
    const job = await this.prisma.ingestionJob.findUnique({
      where: {
        id: jobId,
      },
      select: {
        paperSourceId: true,
      },
    });

    if (!job) {
      throw new NotFoundException(`Ingestion job ${jobId} not found.`);
    }

    const page = await this.prisma.sourcePage.findUnique({
      where: {
        id: pageId,
      },
      include: {
        document: {
          select: {
            paperSourceId: true,
            kind: true,
          },
        },
      },
    });

    if (!page || page.document.paperSourceId !== job.paperSourceId) {
      throw new NotFoundException(
        `Source page ${pageId} was not found in job ${jobId}.`,
      );
    }

    return page;
  }

  private toGeminiRecoveryMode(
    value: unknown,
    fallback: DraftAsset['classification'],
  ): 'text' | 'table' | 'tree' | 'graph' {
    if (
      value === 'text' ||
      value === 'table' ||
      value === 'tree' ||
      value === 'graph'
    ) {
      return value;
    }

    if (fallback === 'table' || fallback === 'tree' || fallback === 'graph') {
      return fallback;
    }

    return 'text';
  }

  private getStorageClient() {
    if (!this.storageClient) {
      this.storageClient = new R2StorageClient(readR2ConfigFromEnv());
    }

    return this.storageClient;
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

  private readCropBoxPayload(value: unknown): DraftAsset['cropBox'] {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('crop_box must be an object.');
    }

    const raw = value as Record<string, unknown>;

    return {
      x: this.readNonNegativeNumber(raw.x, 'crop_box.x'),
      y: this.readNonNegativeNumber(raw.y, 'crop_box.y'),
      width: this.readPositiveNumber(raw.width, 'crop_box.width'),
      height: this.readPositiveNumber(raw.height, 'crop_box.height'),
    };
  }

  private readNonNegativeNumber(value: unknown, fieldName: string) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new BadRequestException(
        `${fieldName} must be a non-negative number.`,
      );
    }

    return Math.round(value);
  }

  private readPositiveNumber(value: unknown, fieldName: string) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive number.`);
    }

    return Math.round(value);
  }
}
