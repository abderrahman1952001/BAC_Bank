import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type CatalogReadClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class CatalogCurriculumService {
  constructor(private readonly prisma: PrismaService) {}

  async listActiveFilterTopics(client?: CatalogReadClient) {
    const db = client ?? this.prisma;
    const currentYear = this.getCurrentCatalogYear();
    const topicRows = await db.topic.findMany({
      where: {
        curriculum: {
          isActive: true,
          validFromYear: {
            lte: currentYear,
          },
          OR: [{ validToYear: null }, { validToYear: { gte: currentYear } }],
        },
      },
      select: {
        code: true,
        name: true,
        slug: true,
        path: true,
        displayOrder: true,
        isSelectable: true,
        studentLabel: true,
        parent: {
          select: {
            code: true,
          },
        },
        curriculum: {
          select: {
            streamMappings: {
              select: {
                stream: {
                  select: {
                    code: true,
                  },
                },
              },
            },
          },
        },
        subject: {
          select: {
            code: true,
            name: true,
            family: {
              select: {
                code: true,
                name: true,
              },
            },
            streamMappings: {
              select: {
                stream: {
                  select: {
                    code: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [
        { subject: { name: 'asc' } },
        { path: 'asc' },
        { displayOrder: 'asc' },
      ],
    });
    const mergedTopics = new Map<
      string,
      {
        code: string;
        name: string;
        slug: string;
        path: string;
        displayOrder: number;
        isSelectable: boolean;
        studentLabel: string | null;
        parent: {
          code: string;
        } | null;
        subject: (typeof topicRows)[number]['subject'];
        streamCodeSet: Set<string>;
      }
    >();

    for (const row of topicRows) {
      const key = `${row.subject.code}:${row.code}`;
      const streamCodes =
        row.curriculum.streamMappings.length > 0
          ? row.curriculum.streamMappings.map((mapping) => mapping.stream.code)
          : row.subject.streamMappings.map((mapping) => mapping.stream.code);
      const current = mergedTopics.get(key);

      if (!current) {
        mergedTopics.set(key, {
          code: row.code,
          name: row.name,
          slug: row.slug,
          path: row.path,
          displayOrder: row.displayOrder,
          isSelectable: row.isSelectable,
          studentLabel: row.studentLabel,
          parent: row.parent,
          subject: row.subject,
          streamCodeSet: new Set(streamCodes),
        });
        continue;
      }

      for (const streamCode of streamCodes) {
        current.streamCodeSet.add(streamCode);
      }
    }

    return Array.from(mergedTopics.values())
      .map((topic) => ({
        code: topic.code,
        name: topic.name,
        slug: topic.slug,
        path: topic.path,
        displayOrder: topic.displayOrder,
        isSelectable: topic.isSelectable,
        studentLabel: topic.studentLabel,
        parent: topic.parent,
        subject: topic.subject,
        streamCodes: Array.from(topic.streamCodeSet).sort((left, right) =>
          left.localeCompare(right),
        ),
      }))
      .sort((left, right) => {
        const subjectOrder = left.subject.name.localeCompare(
          right.subject.name,
        );

        if (subjectOrder !== 0) {
          return subjectOrder;
        }

        const pathOrder = left.path.localeCompare(right.path);

        if (pathOrder !== 0) {
          return pathOrder;
        }

        return left.displayOrder - right.displayOrder;
      });
  }

  async resolveSubjectCurriculumScope(
    input: {
      subjectCode: string;
      streamCodes?: string[];
      years?: number[];
    },
    client?: CatalogReadClient,
  ) {
    const db = client ?? this.prisma;
    const subjectCode = input.subjectCode.trim().toUpperCase();
    const streamCodes = Array.from(
      new Set(
        (input.streamCodes ?? []).map((code) => code.trim().toUpperCase()),
      ),
    ).filter(Boolean);
    const years = Array.from(new Set(input.years ?? [])).sort((a, b) => a - b);
    const effectiveYears =
      years.length > 0 ? years : [this.getCurrentCatalogYear()];

    const subject = await db.subject.findUnique({
      where: {
        code: subjectCode,
      },
      select: {
        id: true,
        code: true,
        streamMappings: {
          select: {
            validFromYear: true,
            validToYear: true,
            stream: {
              select: {
                code: true,
              },
            },
          },
        },
        curricula: {
          where: {
            isActive: true,
          },
          select: {
            id: true,
            familyCode: true,
            validFromYear: true,
            validToYear: true,
            streamMappings: {
              select: {
                stream: {
                  select: {
                    code: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!subject) {
      return null;
    }

    const allowedStreamCodes = Array.from(
      new Set(
        subject.streamMappings
          .filter((mapping) => this.matchesYearWindow(mapping, effectiveYears))
          .map((mapping) => mapping.stream.code),
      ),
    ).sort((left, right) => left.localeCompare(right));

    const yearMatchedCurricula = subject.curricula.filter((curriculum) =>
      this.matchesYearWindow(curriculum, effectiveYears),
    );
    const relevantCurricula =
      yearMatchedCurricula.length > 0
        ? yearMatchedCurricula
        : subject.curricula;
    const streamMatchedCurricula = streamCodes.length
      ? relevantCurricula.filter((curriculum) =>
          curriculum.streamMappings.some((mapping) =>
            streamCodes.includes(mapping.stream.code),
          ),
        )
      : relevantCurricula;
    const applicableCurricula =
      streamMatchedCurricula.length > 0
        ? streamMatchedCurricula
        : relevantCurricula;

    return {
      subjectId: subject.id,
      subjectCode: subject.code,
      allowedStreamCodes,
      curriculumIds: Array.from(
        new Set(applicableCurricula.map((curriculum) => curriculum.id)),
      ),
    };
  }

  private getCurrentCatalogYear() {
    return new Date().getUTCFullYear();
  }

  private matchesYearWindow(
    value: {
      validFromYear: number;
      validToYear: number | null;
    },
    years: number[],
  ) {
    return years.some(
      (year) =>
        year >= value.validFromYear &&
        (value.validToYear === null || year <= value.validToYear),
    );
  }
}
