import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { PublishIngestionJobResponse } from '@bac-bank/contracts/ingestion';
import { IngestionJobStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { collectDraftTopicCodes } from './ingestion-draft-graph';
import {
  getApiBaseUrl,
  readJsonString,
  readOptionalMetadataInteger,
  resolveDraftStreamCodes,
  resolvePaperFamilyCode,
  toJsonValue,
} from './ingestion-draft-support';
import {
  draftSessionTypeToPrismaSessionType,
  projectIngestionJobMetadataFromDraft,
} from './ingestion-job-metadata';
import {
  buildPublishedMediaCreateData,
  IngestionPublishedAssetsService,
  type PublishedMediaCleanupCandidate,
} from './ingestion-published-assets.service';
import { IngestionPublishedVariantService } from './ingestion-published-variant.service';
import { IngestionReadService } from './ingestion-read.service';
import { validateIngestionDraft } from './ingestion-validation';
import { canPublishIngestionJob } from './ingestion-workflow';
import { IngestionPaperSourceService } from './ingestion-paper-source.service';
import { R2StorageClient, readR2ConfigFromEnv } from './r2-storage';

@Injectable()
export class IngestionPublicationService {
  private readonly logger = new Logger(IngestionPublicationService.name);
  private storageClient: R2StorageClient | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly readService: IngestionReadService,
    private readonly paperSourceService: IngestionPaperSourceService,
    private readonly publishedAssetsService: IngestionPublishedAssetsService,
    private readonly publishedVariantService: IngestionPublishedVariantService,
  ) {}

  async publishJob(jobId: string): Promise<PublishIngestionJobResponse> {
    const job = await this.readService.findJobOrThrow(jobId);

    if (!canPublishIngestionJob(job.status)) {
      throw new BadRequestException(
        'Approve the ingestion job before publishing it.',
      );
    }

    const draft = this.readService.hydrateDraft(job);
    const validation = validateIngestionDraft(draft);
    this.throwIfDraftValidationFails(validation, 'publish');

    const selectedStreamCodes = resolveDraftStreamCodes(
      draft,
      this.paperSourceService,
    );

    if (!selectedStreamCodes.length || !draft.exam.subjectCode) {
      throw new BadRequestException(
        'draft_json.exam.subjectCode and at least one paper stream must be set before publication.',
      );
    }

    const sessionType = draftSessionTypeToPrismaSessionType(
      draft.exam.sessionType,
    );
    const [streams, subject] = await Promise.all([
      this.prisma.stream.findMany({
        where: {
          code: {
            in: selectedStreamCodes,
          },
        },
        select: {
          id: true,
          code: true,
          name: true,
        },
      }),
      this.prisma.subject.findUnique({
        where: {
          code: draft.exam.subjectCode,
        },
        select: {
          id: true,
        },
      }),
    ]);

    const streamsByCode = new Map(
      streams.map((stream) => [stream.code, stream]),
    );
    const selectedStreams = selectedStreamCodes
      .map((code) => streamsByCode.get(code) ?? null)
      .filter(
        (
          stream,
        ): stream is {
          id: string;
          code: string;
          name: string;
        } => Boolean(stream),
      );

    if (selectedStreams.length !== selectedStreamCodes.length || !subject) {
      const missingStreamCodes = selectedStreamCodes.filter(
        (code) => !streamsByCode.has(code),
      );
      const missingDetail = missingStreamCodes.length
        ? ` Missing streams: ${missingStreamCodes.join(', ')}.`
        : '';

      throw new BadRequestException(
        `Review metadata must resolve to existing stream and subject codes.${missingDetail}`,
      );
    }

    const selectedStreamIds = selectedStreams.map((stream) => stream.id);
    const paperFamilyCode = resolvePaperFamilyCode(
      draft,
      this.paperSourceService,
    );
    const existingPaper =
      job.publishedPaperId ??
      (
        await this.prisma.paper.findFirst({
          where: {
            paperSourceId: job.paperSourceId,
          },
          select: {
            id: true,
          },
        })
      )?.id ??
      null;

    if (
      existingPaper &&
      job.publishedPaperId &&
      job.publishedPaperId !== existingPaper
    ) {
      throw new BadRequestException(
        'A canonical paper already exists for this year/subject/session/family.',
      );
    }

    const conflictingExams = await this.prisma.exam.findMany({
      where: {
        year: draft.exam.year,
        subjectId: subject.id,
        sessionType,
        streamId: {
          in: selectedStreamIds,
        },
      },
      select: {
        id: true,
        streamId: true,
        paperId: true,
      },
    });

    for (const conflict of conflictingExams) {
      if (existingPaper && conflict.paperId === existingPaper) {
        continue;
      }

      const streamCode =
        selectedStreams.find((stream) => stream.id === conflict.streamId)
          ?.code ?? conflict.streamId;

      throw new BadRequestException(
        `A live exam already exists for stream ${streamCode} in this year/subject/session.`,
      );
    }

    const paperId = existingPaper ?? randomUUID();
    const preparedAssets =
      await this.publishedAssetsService.preparePublishedAssets({
        paperSourceId: job.paperSourceId,
        draft,
        paperId,
        storageClient: this.getStorageClient(),
      });

    let paperIdResult: string;
    let publishedExamIdsResult: string[] = [];
    let obsoletePublishedMedia: PublishedMediaCleanupCandidate[] = [];

    try {
      const publishResult: {
        paperId: string;
        publishedExamIds: string[];
      } = await this.prisma.$transaction(async (tx) => {
        const currentExistingPaper =
          job.publishedPaperId ??
          (
            await tx.paper.findFirst({
              where: {
                paperSourceId: job.paperSourceId,
              },
              select: {
                id: true,
              },
            })
          )?.id ??
          null;

        if (currentExistingPaper && currentExistingPaper !== paperId) {
          throw new BadRequestException(
            'A canonical paper already exists for this year/subject/session/family.',
          );
        }

        obsoletePublishedMedia = currentExistingPaper
          ? await this.publishedAssetsService.listPublishedMediaForPaper(
              tx,
              paperId,
            )
          : [];

        const officialSourceReference = this.buildOfficialSourceReference(
          job,
          draft,
        );
        const durationMinutes = readOptionalMetadataInteger(
          draft.exam.metadata,
          'durationMinutes',
        );

        if (currentExistingPaper) {
          await tx.paper.update({
            where: {
              id: paperId,
            },
            data: {
              paperSourceId: job.paperSourceId,
              year: draft.exam.year,
              subjectId: subject.id,
              sessionType,
              familyCode: paperFamilyCode,
              durationMinutes: durationMinutes ?? 210,
              officialSourceReference,
            },
          });

          await tx.examVariant.deleteMany({
            where: {
              paperId,
            },
          });
        } else {
          await tx.paper.create({
            data: {
              id: paperId,
              paperSourceId: job.paperSourceId,
              year: draft.exam.year,
              subjectId: subject.id,
              sessionType,
              familyCode: paperFamilyCode,
              durationMinutes: durationMinutes ?? 210,
              officialSourceReference,
            },
          });
        }

        const currentPaperOfferings = await tx.exam.findMany({
          where: {
            paperId,
          },
          select: {
            id: true,
            streamId: true,
          },
        });
        const currentConflictingExams = await tx.exam.findMany({
          where: {
            year: draft.exam.year,
            subjectId: subject.id,
            sessionType,
            streamId: {
              in: selectedStreamIds,
            },
          },
          select: {
            id: true,
            streamId: true,
            paperId: true,
          },
        });

        for (const conflict of currentConflictingExams) {
          if (conflict.paperId === paperId) {
            continue;
          }

          const streamCode =
            selectedStreams.find((stream) => stream.id === conflict.streamId)
              ?.code ?? conflict.streamId;

          throw new BadRequestException(
            `A live exam already exists for stream ${streamCode} in this year/subject/session.`,
          );
        }

        const matchedOfferingsByStreamId = new Map(
          currentPaperOfferings.map((offering) => [
            offering.streamId,
            offering,
          ]),
        );
        const reusableOfferings = currentPaperOfferings.filter(
          (offering) => !selectedStreamIds.includes(offering.streamId),
        );
        const publishedExamIdsByStreamCode = new Map<string, string>();
        const activeExamIds = new Set<string>();

        for (const stream of selectedStreams) {
          const matchedOffering = matchedOfferingsByStreamId.get(stream.id);

          if (matchedOffering) {
            await tx.exam.update({
              where: {
                id: matchedOffering.id,
              },
              data: {
                year: draft.exam.year,
                streamId: stream.id,
                subjectId: subject.id,
                sessionType,
                paperId,
                isPublished: true,
              },
            });

            activeExamIds.add(matchedOffering.id);
            publishedExamIdsByStreamCode.set(stream.code, matchedOffering.id);
            continue;
          }

          const reusableOffering = reusableOfferings.shift();

          if (reusableOffering) {
            await tx.exam.update({
              where: {
                id: reusableOffering.id,
              },
              data: {
                year: draft.exam.year,
                streamId: stream.id,
                subjectId: subject.id,
                sessionType,
                paperId,
                isPublished: true,
              },
            });

            activeExamIds.add(reusableOffering.id);
            publishedExamIdsByStreamCode.set(stream.code, reusableOffering.id);
            continue;
          }

          const nextExamId = randomUUID();
          await tx.exam.create({
            data: {
              id: nextExamId,
              year: draft.exam.year,
              streamId: stream.id,
              subjectId: subject.id,
              sessionType,
              paperId,
              isPublished: true,
            },
          });

          activeExamIds.add(nextExamId);
          publishedExamIdsByStreamCode.set(stream.code, nextExamId);
        }

        const staleOfferingIds = currentPaperOfferings
          .filter((offering) => !activeExamIds.has(offering.id))
          .map((offering) => offering.id);

        if (staleOfferingIds.length > 0) {
          await tx.exam.deleteMany({
            where: {
              id: {
                in: staleOfferingIds,
              },
            },
          });
        }

        const assetMediaIds = new Map<string, string>();
        const topicIdsByCode =
          await this.publishedVariantService.buildSubjectTopicIdMap(
            tx,
            subject.id,
            collectDraftTopicCodes(draft),
            draft.exam.subjectCode,
          );

        for (const preparedAsset of preparedAssets) {
          await tx.media.create({
            data: buildPublishedMediaCreateData(preparedAsset, getApiBaseUrl()),
          });

          assetMediaIds.set(preparedAsset.assetId, preparedAsset.mediaId);
        }

        await this.publishedVariantService.createPublishedVariants({
          tx,
          jobId: job.id,
          paperId,
          draft,
          topicIdsByCode,
          assetMediaIds,
        });

        const publishedExamIds = Array.from(
          publishedExamIdsByStreamCode.values(),
        );

        if (publishedExamIds.length === 0) {
          throw new BadRequestException(
            'Publishing did not produce any exam offerings for this paper.',
          );
        }

        await tx.ingestionJob.update({
          where: {
            id: job.id,
          },
          data: {
            ...projectIngestionJobMetadataFromDraft(draft),
            status: IngestionJobStatus.PUBLISHED,
            publishedAt: new Date(),
            publishedExamId: null,
            publishedPaperId: paperId,
            draftJson: toJsonValue(draft),
          },
        });

        return {
          paperId,
          publishedExamIds,
        };
      });

      paperIdResult = publishResult.paperId;
      publishedExamIdsResult = publishResult.publishedExamIds;
    } catch (error) {
      await this.publishedAssetsService.cleanupPreparedAssets(
        preparedAssets,
        this.getStorageClient(),
      );
      throw error;
    }

    if (obsoletePublishedMedia.length > 0) {
      try {
        await this.publishedAssetsService.cleanupOrphanedPublishedMedia({
          candidates: obsoletePublishedMedia,
          storageClient: this.getStorageClient(),
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown cleanup error';
        this.logger.warn(
          `Published media cleanup after publish of job ${job.id} failed: ${message}`,
        );
      }
    }

    return {
      job_id: job.id,
      published_paper_id: paperIdResult,
      published_exam_ids: publishedExamIdsResult,
    };
  }

  private buildOfficialSourceReference(
    job: {
      paperSource: {
        sourceExamPageUrl: string | null;
        sourceCorrectionPageUrl: string | null;
      };
      sourceDocuments: Array<{
        kind: string;
        storageKey: string;
      }>;
    },
    draft: ReturnType<IngestionReadService['hydrateDraft']>,
  ) {
    const parts = [
      `Provider: ${draft.exam.provider}`,
      `MIN_YEAR: ${draft.exam.minYear}`,
    ];

    if (job.paperSource.sourceExamPageUrl) {
      parts.push(`Exam page: ${job.paperSource.sourceExamPageUrl}`);
    }

    if (job.paperSource.sourceCorrectionPageUrl) {
      parts.push(`Correction page: ${job.paperSource.sourceCorrectionPageUrl}`);
    }

    const examDocument = job.sourceDocuments.find(
      (document) => document.kind === 'EXAM',
    );
    const correctionDocument = job.sourceDocuments.find(
      (document) => document.kind === 'CORRECTION',
    );

    if (examDocument) {
      parts.push(`Exam PDF key: ${examDocument.storageKey}`);
    }

    if (correctionDocument) {
      parts.push(`Correction PDF key: ${correctionDocument.storageKey}`);
    }

    const sourceReference = readJsonString(draft.exam.metadata, 'sourceReference');

    if (sourceReference) {
      parts.push(`Source reference: ${sourceReference}`);
    }

    return parts.join(' | ');
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

  private getStorageClient() {
    if (!this.storageClient) {
      this.storageClient = new R2StorageClient(readR2ConfigFromEnv());
    }

    return this.storageClient;
  }
}
