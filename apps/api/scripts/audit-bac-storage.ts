import { PrismaClient, SessionType } from '@prisma/client';
import {
  buildEddirasaPageStorageKey,
  type EddirasaStorageContext,
} from '../src/ingestion/eddirasa-normalization';
import { normalizeIngestionDraft } from '../src/ingestion/ingestion.contract';

const prisma = new PrismaClient();
const DEFAULT_MIN_YEAR = 2008;

async function main() {
  const options = parseCliOptions(process.argv.slice(2));
  const jobs = await prisma.ingestionJob.findMany({
    where: {
      provider: 'eddirasa',
      year: {
        gte: options.minYear,
      },
    },
    select: {
      id: true,
      year: true,
      streamCode: true,
      subjectCode: true,
      sessionType: true,
      metadata: true,
      draftJson: true,
      sourceDocuments: {
        select: {
          id: true,
          fileName: true,
          storageKey: true,
          pageCount: true,
          pages: {
            select: {
              id: true,
              pageNumber: true,
              storageKey: true,
            },
          },
        },
      },
    },
    orderBy: [{ year: 'desc' }, { createdAt: 'asc' }],
  });

  const pageKeyCounts = new Map<string, number>();

  for (const job of jobs) {
    for (const document of job.sourceDocuments) {
      for (const page of document.pages) {
        pageKeyCounts.set(
          page.storageKey,
          (pageKeyCounts.get(page.storageKey) ?? 0) + 1,
        );
      }
    }
  }

  const issues = {
    legacyDocuments: [] as string[],
    legacyPages: [] as string[],
    duplicatePageKeys: [] as string[],
    pageCountMismatches: [] as string[],
    nonCanonicalPageKeys: [] as string[],
    missingDraftSourcePages: [] as string[],
    missingDraftAssetPages: [] as string[],
  };

  for (const job of jobs) {
    const draft = normalizeIngestionDraft(job.draftJson);
    const sourcePageIds = new Set<string>();
    const context: EddirasaStorageContext = {
      year: job.year,
      streamCode: job.streamCode,
      subjectCode: job.subjectCode,
      sessionType: job.sessionType ?? SessionType.NORMAL,
      slug:
        typeof draft.exam.metadata.slug === 'string'
          ? draft.exam.metadata.slug
          : null,
    };

    for (const document of job.sourceDocuments) {
      if (
        !document.fileName.startsWith('bac-') ||
        !document.storageKey.startsWith('bac/')
      ) {
        issues.legacyDocuments.push(document.id);
      }

      if (
        document.pageCount !== null &&
        document.pageCount !== document.pages.length
      ) {
        issues.pageCountMismatches.push(document.id);
      }

      for (const page of document.pages) {
        sourcePageIds.add(page.id);

        if (
          !page.storageKey.startsWith('bac/') ||
          !page.storageKey.includes('/pages/bac-')
        ) {
          issues.legacyPages.push(page.id);
        }

        if ((pageKeyCounts.get(page.storageKey) ?? 0) > 1) {
          issues.duplicatePageKeys.push(page.storageKey);
        }

        const expectedStorageKey = buildEddirasaPageStorageKey(
          context,
          document.fileName,
          page.pageNumber,
        );

        if (page.storageKey !== expectedStorageKey) {
          issues.nonCanonicalPageKeys.push(page.id);
        }
      }
    }

    for (const sourcePage of draft.sourcePages) {
      if (!sourcePageIds.has(sourcePage.id)) {
        issues.missingDraftSourcePages.push(sourcePage.id);
      }
    }

    for (const asset of draft.assets) {
      if (!sourcePageIds.has(asset.sourcePageId)) {
        issues.missingDraftAssetPages.push(asset.id);
      }
    }
  }

  const summary = {
    jobs: jobs.length,
    legacyDocuments: uniq(issues.legacyDocuments).length,
    legacyPages: uniq(issues.legacyPages).length,
    duplicatePageKeys: uniq(issues.duplicatePageKeys).length,
    pageCountMismatches: uniq(issues.pageCountMismatches).length,
    nonCanonicalPageKeys: uniq(issues.nonCanonicalPageKeys).length,
    missingDraftSourcePages: uniq(issues.missingDraftSourcePages).length,
    missingDraftAssetPages: uniq(issues.missingDraftAssetPages).length,
    samples: {
      legacyDocuments: uniq(issues.legacyDocuments).slice(0, 10),
      legacyPages: uniq(issues.legacyPages).slice(0, 10),
      duplicatePageKeys: uniq(issues.duplicatePageKeys).slice(0, 10),
      pageCountMismatches: uniq(issues.pageCountMismatches).slice(0, 10),
      nonCanonicalPageKeys: uniq(issues.nonCanonicalPageKeys).slice(0, 10),
      missingDraftSourcePages: uniq(issues.missingDraftSourcePages).slice(0, 10),
      missingDraftAssetPages: uniq(issues.missingDraftAssetPages).slice(0, 10),
    },
  };

  console.log(JSON.stringify(summary, null, 2));
}

function parseCliOptions(argv: string[]) {
  const options = {
    minYear: DEFAULT_MIN_YEAR,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--min-year' && argv[index + 1]) {
      options.minYear = Number.parseInt(argv[index + 1], 10);
      index += 1;
    }
  }

  if (!Number.isInteger(options.minYear) || options.minYear < 0) {
    throw new Error('--min-year must be a non-negative integer.');
  }

  return options;
}

function uniq<T>(values: T[]) {
  return Array.from(new Set(values));
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
