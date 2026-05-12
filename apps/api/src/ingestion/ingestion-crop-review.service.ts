import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type AdminIngestionCropQueueItem,
  type AdminIngestionCropQueueResponse,
  type AdminIngestionStatus,
  type UpdateIngestionAssetCropResponse,
  parseUpdateIngestionAssetCropPayload,
} from '@bac-bank/contracts/ingestion';
import { IngestionJobStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  type DraftAsset,
  type DraftCropBox,
  type DraftNode,
  type DraftSourcePage,
  type IngestionDraft,
} from './ingestion.contract';
import { projectIngestionJobMetadataFromDraft } from './ingestion-job-metadata';
import {
  IngestionReadService,
  type FullIngestionJobRecord,
} from './ingestion-read.service';
import {
  canEditIngestionJob,
  resolveStatusAfterDraftEdit,
} from './ingestion-workflow';

@Injectable()
export class IngestionCropReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly readService: IngestionReadService,
  ) {}

  async listCropQueue(): Promise<AdminIngestionCropQueueResponse> {
    const jobs = await this.readService.listJobsForReview();
    const items = jobs.flatMap((job) => {
      if (!canEditIngestionJob(job.status)) {
        return [];
      }

      const draft = this.readService.hydrateDraft(job);

      return this.buildCropQueueItems({
        job,
        draft,
      }).filter((item) => item.placeholder);
    });
    const jobIds = new Set(items.map((item) => item.job_id));

    return {
      summary: {
        job_count: jobIds.size,
        placeholder_count: items.length,
      },
      data: items,
    };
  }

  async updateAssetCrop(
    jobId: string,
    assetId: string,
    payload: unknown,
  ): Promise<UpdateIngestionAssetCropResponse> {
    const parsed = parseUpdateIngestionAssetCropPayload(payload);
    const job = await this.readService.findJobOrThrow(jobId);

    if (!canEditIngestionJob(job.status)) {
      throw new BadRequestException(
        'Queued, active, or published ingestion jobs cannot be edited from the crop queue.',
      );
    }

    const draft = this.readService.hydrateDraft(job);
    const asset = draft.assets.find((entry) => entry.id === assetId);

    if (!asset) {
      throw new NotFoundException(
        `Asset ${assetId} not found in job ${jobId}.`,
      );
    }

    const sourcePage = draft.sourcePages.find(
      (page) => page.id === asset.sourcePageId,
    );

    if (!sourcePage) {
      throw new NotFoundException(
        `Asset ${assetId} references an unknown source page.`,
      );
    }

    const cropBox = normalizeCropBox(parsed.crop_box, sourcePage);
    const updatedAsset = finalizeEditedAsset(asset, {
      ...asset,
      cropBox,
      cleanupRequired: parsed.needs_cleanup ?? asset.cleanupRequired ?? false,
      notes:
        parsed.notes === undefined
          ? asset.notes
          : normalizeOptionalString(parsed.notes),
    });
    const updatedDraft: IngestionDraft = {
      ...draft,
      assets: draft.assets.map((entry) =>
        entry.id === assetId ? updatedAsset : entry,
      ),
    };
    const nextStatus = resolveStatusAfterDraftEdit({
      currentStatus: job.status,
      provider: draft.exam.provider,
      draftChanged: true,
    });

    await this.prisma.ingestionJob.update({
      where: {
        id: jobId,
      },
      data: {
        ...projectIngestionJobMetadataFromDraft(updatedDraft),
        status: nextStatus,
        reviewedAt: nextStatus === job.status ? job.reviewedAt : null,
        draftJson: toJsonValue(updatedDraft),
      },
    });

    return {
      item: this.buildCropQueueItem({
        job: {
          ...job,
          status: nextStatus,
          updatedAt: new Date(),
        },
        draft: updatedDraft,
        asset: updatedAsset,
        sourcePage,
      }),
    };
  }

  private buildCropQueueItems(input: {
    job: Pick<FullIngestionJobRecord, 'id' | 'status' | 'updatedAt'>;
    draft: IngestionDraft;
  }) {
    const sourcePageById = new Map(
      input.draft.sourcePages.map((page) => [page.id, page]),
    );

    return input.draft.assets
      .map((asset) => {
        const sourcePage = sourcePageById.get(asset.sourcePageId);

        if (!sourcePage) {
          return null;
        }

        return this.buildCropQueueItem({
          ...input,
          asset,
          sourcePage,
        });
      })
      .filter((item): item is AdminIngestionCropQueueItem => item !== null)
      .sort((left, right) => {
        if (left.source_document_kind !== right.source_document_kind) {
          return left.source_document_kind.localeCompare(
            right.source_document_kind,
          );
        }

        if (left.source_page_number !== right.source_page_number) {
          return left.source_page_number - right.source_page_number;
        }

        return left.asset_id.localeCompare(right.asset_id);
      });
  }

  private buildCropQueueItem(input: {
    job: Pick<FullIngestionJobRecord, 'id' | 'status' | 'updatedAt'>;
    draft: IngestionDraft;
    asset: DraftAsset;
    sourcePage: DraftSourcePage;
  }): AdminIngestionCropQueueItem {
    const linkedNode = findLinkedNode(input.draft, input.asset.id);

    return {
      job_id: input.job.id,
      job_label: input.draft.exam.title,
      job_status: fromIngestionStatus(input.job.status),
      draft_kind: isPublishedRevisionDraft(input.draft)
        ? 'revision'
        : 'ingestion',
      year: input.draft.exam.year,
      subject_code: input.draft.exam.subjectCode,
      stream_codes: resolveDraftStreamCodes(input.draft),
      asset_id: input.asset.id,
      asset_label: input.asset.label,
      classification: input.asset.classification,
      role: input.asset.role,
      variant_code: input.asset.variantCode,
      source_page_id: input.sourcePage.id,
      source_document_kind: input.sourcePage.documentKind,
      source_page_number: input.sourcePage.pageNumber,
      source_page_width: input.sourcePage.width,
      source_page_height: input.sourcePage.height,
      page_image_url: `/api/v1/ingestion/pages/${input.sourcePage.id}/image`,
      asset_preview_url: `/api/v1/ingestion/jobs/${input.job.id}/assets/${input.asset.id}/preview`,
      crop_box: input.asset.cropBox,
      placeholder: isFullPageCrop(input.asset.cropBox, input.sourcePage),
      needs_cleanup: input.asset.cleanupRequired === true,
      cleanup_mask_count: input.asset.cleanupMasks?.length ?? 0,
      notes: input.asset.notes,
      linked_node_id: linkedNode?.id ?? null,
      linked_node_path: linkedNode
        ? buildNodePath(input.draft, linkedNode).map(
            (node) => node.label?.trim() || node.nodeType,
          )
        : [],
      updated_at: input.job.updatedAt,
    };
  }
}

function normalizeCropBox(cropBox: DraftCropBox, sourcePage: DraftSourcePage) {
  const x = normalizeFiniteInteger(cropBox.x, 'crop_box.x');
  const y = normalizeFiniteInteger(cropBox.y, 'crop_box.y');
  const width = normalizeFiniteInteger(cropBox.width, 'crop_box.width');
  const height = normalizeFiniteInteger(cropBox.height, 'crop_box.height');

  if (x < 0 || y < 0) {
    throw new BadRequestException('Crop box cannot start outside the page.');
  }

  if (width <= 0 || height <= 0) {
    throw new BadRequestException(
      'Crop box width and height must be positive.',
    );
  }

  if (x >= sourcePage.width || y >= sourcePage.height) {
    throw new BadRequestException('Crop box starts outside the source page.');
  }

  return {
    x,
    y,
    width: Math.min(width, sourcePage.width - x),
    height: Math.min(height, sourcePage.height - y),
  };
}

function normalizeFiniteInteger(value: number, field: string) {
  if (!Number.isFinite(value)) {
    throw new BadRequestException(`${field} must be a finite number.`);
  }

  return Math.floor(value);
}

function finalizeEditedAsset(previous: DraftAsset, next: DraftAsset) {
  if (next.nativeSuggestion !== previous.nativeSuggestion) {
    return next;
  }

  const nativeSuggestion = previous.nativeSuggestion ?? null;

  if (!nativeSuggestion) {
    return next;
  }

  if (next.classification !== nativeSuggestion.type) {
    return {
      ...next,
      nativeSuggestion: null,
    };
  }

  if (areCropBoxesEqual(previous.cropBox, next.cropBox)) {
    return next;
  }

  if (nativeSuggestion.status === 'stale') {
    return next;
  }

  return {
    ...next,
    nativeSuggestion: {
      ...nativeSuggestion,
      status: 'stale' as const,
    },
  };
}

function areCropBoxesEqual(left: DraftCropBox, right: DraftCropBox) {
  return (
    left.x === right.x &&
    left.y === right.y &&
    left.width === right.width &&
    left.height === right.height
  );
}

function isFullPageCrop(cropBox: DraftCropBox, sourcePage: DraftSourcePage) {
  return (
    cropBox.x === 0 &&
    cropBox.y === 0 &&
    cropBox.width === sourcePage.width &&
    cropBox.height === sourcePage.height
  );
}

function findLinkedNode(draft: IngestionDraft, assetId: string) {
  for (const variant of draft.variants) {
    const node = variant.nodes.find((entry) =>
      entry.blocks.some((block) => block.assetId === assetId),
    );

    if (node) {
      return node;
    }
  }

  return null;
}

function buildNodePath(draft: IngestionDraft, node: DraftNode) {
  const nodeById = new Map<string, DraftNode>();

  for (const variant of draft.variants) {
    for (const entry of variant.nodes) {
      nodeById.set(entry.id, entry);
    }
  }

  const path: DraftNode[] = [];
  let current: DraftNode | undefined = node;

  while (current) {
    path.push(current);
    current = current.parentId ? nodeById.get(current.parentId) : undefined;
  }

  return path.reverse();
}

function resolveDraftStreamCodes(draft: IngestionDraft) {
  const metadata = asRecord(draft.exam.metadata);
  const paperStreamCodes = readStringArray(metadata, 'paperStreamCodes');

  if (paperStreamCodes.length > 0) {
    return paperStreamCodes;
  }

  const sharedStreamCodes = readStringArray(metadata, 'sharedStreamCodes');
  const legacyCodes = [
    draft.exam.streamCode?.trim().toUpperCase() ?? null,
    ...sharedStreamCodes,
  ].filter((value): value is string => Boolean(value));

  return Array.from(new Set(legacyCodes));
}

function readStringArray(value: Record<string, unknown> | null, field: string) {
  const raw = value?.[field];

  if (!Array.isArray(raw)) {
    return [];
  }

  return Array.from(
    new Set(
      raw
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => entry.trim().toUpperCase())
        .filter((entry) => entry.length > 0),
    ),
  );
}

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function fromIngestionStatus(status: IngestionJobStatus): AdminIngestionStatus {
  if (status === IngestionJobStatus.QUEUED) {
    return 'queued';
  }

  if (status === IngestionJobStatus.PROCESSING) {
    return 'processing';
  }

  if (status === IngestionJobStatus.IN_REVIEW) {
    return 'in_review';
  }

  if (status === IngestionJobStatus.APPROVED) {
    return 'approved';
  }

  if (status === IngestionJobStatus.PUBLISHED) {
    return 'published';
  }

  if (status === IngestionJobStatus.FAILED) {
    return 'failed';
  }

  return 'draft';
}

function isPublishedRevisionDraft(draft: IngestionDraft) {
  return (
    draft.exam.provider === 'published_revision' ||
    readString(asRecord(draft.exam.metadata), 'editingMode') ===
      'published_revision'
  );
}

function readString(value: Record<string, unknown> | null, field: string) {
  const raw = value?.[field];

  if (typeof raw !== 'string' || !raw.trim()) {
    return null;
  }

  return raw.trim();
}

function normalizeOptionalString(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
