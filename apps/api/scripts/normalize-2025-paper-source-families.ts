import { PrismaClient, SessionType } from '@prisma/client';
import { buildPaperSourceSlug } from '../src/ingestion/paper-source-identity';

type NormalizationRule = {
  subjectCode: string;
  fromFamilyCode: string;
  toFamilyCode: string;
  streamCodes: string[];
  sessionType?: SessionType;
  allowLinkedPapers?: boolean;
};

const prisma = new PrismaClient();

const NORMALIZATION_RULES: NormalizationRule[] = [
  {
    subjectCode: 'ARABIC',
    fromFamilyCode: 'se',
    toFamilyCode: 'se-m-tm-ge',
    streamCodes: ['SE', 'M', 'MT_CIVIL', 'MT_ELEC', 'MT_MECH', 'MT_PROC', 'GE'],
  },
  {
    subjectCode: 'FRENCH',
    fromFamilyCode: 'se',
    toFamilyCode: 'se-m-tm-ge',
    streamCodes: ['SE', 'M', 'MT_CIVIL', 'MT_ELEC', 'MT_MECH', 'MT_PROC', 'GE'],
  },
  {
    subjectCode: 'HISTORY_GEOGRAPHY',
    fromFamilyCode: 'se',
    toFamilyCode: 'se-m-tm',
    streamCodes: ['SE', 'M', 'MT_CIVIL', 'MT_ELEC', 'MT_MECH', 'MT_PROC'],
  },
  {
    subjectCode: 'PHYSICS',
    fromFamilyCode: 'm',
    toFamilyCode: 'm-tm',
    streamCodes: ['M', 'MT_CIVIL', 'MT_ELEC', 'MT_MECH', 'MT_PROC'],
  },
  {
    subjectCode: 'MATHEMATICS',
    fromFamilyCode: 'lp',
    toFamilyCode: 'lp-le',
    streamCodes: ['LP', 'LE'],
  },
  {
    subjectCode: 'MATHEMATICS',
    fromFamilyCode: 'unassigned',
    toFamilyCode: 'tm',
    streamCodes: ['MT_CIVIL', 'MT_ELEC', 'MT_MECH', 'MT_PROC'],
  },
  {
    subjectCode: 'PHILOSOPHY',
    fromFamilyCode: 'ge',
    toFamilyCode: 'tm-ge',
    streamCodes: ['GE', 'MT_CIVIL', 'MT_ELEC', 'MT_MECH', 'MT_PROC'],
  },
  {
    subjectCode: 'PHILOSOPHY',
    fromFamilyCode: 'unassigned',
    toFamilyCode: 'se-m',
    streamCodes: ['SE', 'M'],
  },
  {
    subjectCode: 'ISLAMIC_STUDIES',
    fromFamilyCode: 'unassigned',
    toFamilyCode: 'all',
    streamCodes: ['SE', 'M', 'MT_CIVIL', 'MT_ELEC', 'MT_MECH', 'MT_PROC', 'GE', 'LP', 'LE'],
  },
];

async function main() {
  const streamRows = await prisma.stream.findMany({
    select: {
      id: true,
      code: true,
    },
  });
  const streamIdByCode = new Map(streamRows.map((stream) => [stream.code, stream.id]));
  const results: string[] = [];

  for (const rule of NORMALIZATION_RULES) {
    const sessionType = rule.sessionType ?? SessionType.NORMAL;
    const source = await prisma.paperSource.findFirst({
      where: {
        year: 2025,
        sessionType,
        familyCode: rule.fromFamilyCode,
        subject: {
          code: rule.subjectCode,
        },
      },
      select: {
        id: true,
        slug: true,
        year: true,
        familyCode: true,
        sessionType: true,
        subjectId: true,
        subject: {
          select: {
            code: true,
          },
        },
        streamMappings: {
          select: {
            streamId: true,
            stream: {
              select: {
                code: true,
              },
            },
          },
        },
        papers: {
          select: {
            id: true,
            familyCode: true,
          },
        },
      },
    });
    const target = await prisma.paperSource.findFirst({
      where: {
        year: 2025,
        sessionType,
        familyCode: rule.toFamilyCode,
        subject: {
          code: rule.subjectCode,
        },
      },
      select: {
        id: true,
      },
    });

    if (!source) {
      if (target) {
        results.push(
          `${rule.subjectCode}:${rule.fromFamilyCode} already normalized to ${rule.toFamilyCode}.`,
        );
        continue;
      }

      throw new Error(
        `Could not find 2025 ${rule.subjectCode} source family ${rule.fromFamilyCode}.`,
      );
    }

    if (target && target.id !== source.id) {
      throw new Error(
        `Normalization conflict for ${rule.subjectCode}:${rule.fromFamilyCode} -> ${rule.toFamilyCode}; target row already exists.`,
      );
    }

    if (source.papers.length > 0 && !rule.allowLinkedPapers) {
      throw new Error(
        `Refusing to rewrite ${rule.subjectCode}:${rule.fromFamilyCode} because it already has linked papers (${source.papers
          .map((paper) => `${paper.id}:${paper.familyCode}`)
          .join(', ')}).`,
      );
    }

    const targetStreamIds = rule.streamCodes.map((streamCode) => {
      const streamId = streamIdByCode.get(streamCode);

      if (!streamId) {
        throw new Error(`Missing stream ${streamCode} while normalizing ${rule.subjectCode}.`);
      }

      return streamId;
    });
    const nextSlug = buildPaperSourceSlug({
      subjectCode: source.subject.code,
      familyCode: rule.toFamilyCode,
      year: source.year,
      sessionType: source.sessionType,
    });

    await prisma.$transaction(async (tx) => {
      await tx.paperSource.update({
        where: {
          id: source.id,
        },
        data: {
          familyCode: rule.toFamilyCode,
          slug: nextSlug,
        },
      });

      await tx.paperSourceStream.deleteMany({
        where: {
          paperSourceId: source.id,
          streamId: {
            notIn: targetStreamIds,
          },
        },
      });

      await tx.paperSourceStream.createMany({
        data: targetStreamIds.map((streamId) => ({
          paperSourceId: source.id,
          streamId,
        })),
        skipDuplicates: true,
      });
    });

    results.push(
      `${rule.subjectCode}:${rule.fromFamilyCode} -> ${rule.toFamilyCode} [${rule.streamCodes.join(', ')}]`,
    );
  }

  console.log('2025 paper-source family normalization complete:');
  for (const result of results) {
    console.log(`- ${result}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
