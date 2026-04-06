import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SessionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildPaperSourceFamilyCode,
  buildPaperSourceSlug,
  normalizePaperSourceStreamCodes,
} from './paper-source-identity';

type DbClient = Prisma.TransactionClient | PrismaService;

@Injectable()
export class IngestionPaperSourceService {
  constructor(private readonly prisma: PrismaService) {}

  buildFamilyCode(streamCodes: string[]) {
    return buildPaperSourceFamilyCode(streamCodes);
  }

  normalizeStreamCodes(streamCodes: string[]) {
    return normalizePaperSourceStreamCodes(streamCodes);
  }

  buildSlug(input: {
    subjectCode: string;
    familyCode: string;
    year: number;
    sessionType: SessionType;
  }) {
    return buildPaperSourceSlug(input);
  }

  async upsertPaperSource(input: {
    tx?: DbClient;
    provider: string;
    year: number;
    sessionType: SessionType;
    subjectCode?: string;
    subjectId?: string;
    familyCode?: string | null;
    streamCodes?: string[];
    sourceListingUrl?: string | null;
    sourceExamPageUrl?: string | null;
    sourceCorrectionPageUrl?: string | null;
    metadata?: Prisma.InputJsonValue | null;
  }) {
    const tx = input.tx ?? this.prisma;
    const normalizedStreamCodes = this.normalizeStreamCodes(
      input.streamCodes ?? [],
    );
    const subjectRecord = await this.resolveSubject(tx, {
      subjectId: input.subjectId,
      subjectCode: input.subjectCode,
    });
    const familyCode =
      input.familyCode?.trim() || this.buildFamilyCode(normalizedStreamCodes);
    const slug = this.buildSlug({
      subjectCode: subjectRecord.code,
      familyCode,
      year: input.year,
      sessionType: input.sessionType,
    });
    const uniqueWhere = {
      year_subjectId_sessionType_familyCode: {
        year: input.year,
        subjectId: subjectRecord.id,
        sessionType: input.sessionType,
        familyCode,
      },
    } satisfies Prisma.PaperSourceWhereUniqueInput;
    const existing = await tx.paperSource.findUnique({
      where: uniqueWhere,
      select: {
        id: true,
        metadata: true,
      },
    });
    const paperSource = existing
      ? await tx.paperSource.update({
          where: uniqueWhere,
          data: {
            slug,
            provider: input.provider,
            ...(input.sourceListingUrl !== undefined
              ? {
                  sourceListingUrl: input.sourceListingUrl,
                }
              : {}),
            ...(input.sourceExamPageUrl !== undefined
              ? {
                  sourceExamPageUrl: input.sourceExamPageUrl,
                }
              : {}),
            ...(input.sourceCorrectionPageUrl !== undefined
              ? {
                  sourceCorrectionPageUrl: input.sourceCorrectionPageUrl,
                }
              : {}),
            ...(input.metadata !== undefined
              ? {
                  metadata:
                    input.metadata === null ? Prisma.JsonNull : input.metadata,
                }
              : {}),
          },
          select: {
            id: true,
            slug: true,
            familyCode: true,
            subjectId: true,
          },
        })
      : await tx.paperSource.create({
          data: {
            slug,
            provider: input.provider,
            year: input.year,
            sessionType: input.sessionType,
            subjectId: subjectRecord.id,
            familyCode,
            sourceListingUrl: input.sourceListingUrl ?? null,
            sourceExamPageUrl: input.sourceExamPageUrl ?? null,
            sourceCorrectionPageUrl: input.sourceCorrectionPageUrl ?? null,
            metadata:
              input.metadata === undefined
                ? undefined
                : input.metadata === null
                  ? Prisma.JsonNull
                  : input.metadata,
          },
          select: {
            id: true,
            slug: true,
            familyCode: true,
            subjectId: true,
          },
        });

    if (normalizedStreamCodes.length > 0) {
      const streamRecords = await tx.stream.findMany({
        where: {
          code: {
            in: normalizedStreamCodes,
          },
        },
        select: {
          id: true,
          code: true,
        },
      });
      const streamByCode = new Map(
        streamRecords.map((stream) => [stream.code, stream]),
      );
      const missingStreamCodes = normalizedStreamCodes.filter(
        (code) => !streamByCode.has(code),
      );

      if (missingStreamCodes.length > 0) {
        throw new NotFoundException(
          `Unknown stream codes: ${missingStreamCodes.join(', ')}.`,
        );
      }

      await tx.paperSourceStream.createMany({
        data: streamRecords.map((stream) => ({
          paperSourceId: paperSource.id,
          streamId: stream.id,
        })),
        skipDuplicates: true,
      });
    }

    return paperSource;
  }

  private async resolveSubject(
    tx: DbClient,
    input: {
      subjectId?: string;
      subjectCode?: string;
    },
  ) {
    if (input.subjectId) {
      const subject = await tx.subject.findUnique({
        where: {
          id: input.subjectId,
        },
        select: {
          id: true,
          code: true,
        },
      });

      if (!subject) {
        throw new NotFoundException(`Subject ${input.subjectId} not found.`);
      }

      return subject;
    }

    if (!input.subjectCode) {
      throw new NotFoundException('A subject id or subject code is required.');
    }

    const subject = await tx.subject.findUnique({
      where: {
        code: input.subjectCode.trim().toUpperCase(),
      },
      select: {
        id: true,
        code: true,
      },
    });

    if (!subject) {
      throw new NotFoundException(
        `Subject ${input.subjectCode.trim().toUpperCase()} not found.`,
      );
    }

    return subject;
  }
}
