import { PrismaClient } from '@prisma/client';
import {
  buildCanonicalDocumentFileName,
  buildCanonicalDocumentStorageKey,
  buildCanonicalPageStorageKey,
} from '../src/ingestion/storage-naming';

const prisma = new PrismaClient();
const DEFAULT_MIN_YEAR = 2008;
const DEFAULT_MAX_YEAR = new Date().getFullYear();

async function main() {
  const options = parseCliOptions(process.argv.slice(2));
  const sources = await prisma.paperSource.findMany({
    where: {
      year: {
        gte: options.minYear,
        lte: options.maxYear,
      },
    },
    orderBy: [{ year: 'desc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      provider: true,
      year: true,
      sessionType: true,
      familyCode: true,
      subject: {
        select: {
          code: true,
        },
      },
      sourceDocuments: {
        select: {
          id: true,
          kind: true,
          fileName: true,
          storageKey: true,
          pageCount: true,
          pages: {
            select: {
              id: true,
              pageNumber: true,
              storageKey: true,
              width: true,
              height: true,
            },
          },
        },
      },
    },
  });

  const documentKeyCounts = new Map<string, number>();
  const pageKeyCounts = new Map<string, number>();
  const issues = {
    nonCanonicalDocuments: [] as string[],
    nonCanonicalPages: [] as string[],
    duplicateDocumentKeys: [] as string[],
    duplicatePageKeys: [] as string[],
    pageCountMismatches: [] as string[],
    missingExamDocument: [] as string[],
    invalidPageDimensions: [] as string[],
    missingCorrectionDocument: [] as string[],
  };

  for (const source of sources) {
    const storageContext = {
      year: source.year,
      streamCode: null,
      familyCode: source.familyCode,
      subjectCode: source.subject.code,
      sessionType: source.sessionType,
    };

    if (
      !source.sourceDocuments.some((document) => document.kind === 'EXAM')
    ) {
      issues.missingExamDocument.push(source.id);
    }

    if (
      !source.sourceDocuments.some((document) => document.kind === 'CORRECTION')
    ) {
      issues.missingCorrectionDocument.push(source.id);
    }

    for (const document of source.sourceDocuments) {
      const expectedFileName = buildCanonicalDocumentFileName(
        storageContext,
        document.kind,
      );
      const expectedStorageKey = buildCanonicalDocumentStorageKey(
        storageContext,
        expectedFileName,
      );

      documentKeyCounts.set(
        document.storageKey,
        (documentKeyCounts.get(document.storageKey) ?? 0) + 1,
      );

      if (
        document.fileName !== expectedFileName ||
        document.storageKey !== expectedStorageKey
      ) {
        issues.nonCanonicalDocuments.push(document.id);
      }

      if (
        document.pageCount !== null &&
        document.pageCount !== document.pages.length
      ) {
        issues.pageCountMismatches.push(document.id);
      }

      for (const page of document.pages) {
        const expectedPageKey = buildCanonicalPageStorageKey(
          { year: source.year },
          expectedFileName,
          page.pageNumber,
        );

        pageKeyCounts.set(
          page.storageKey,
          (pageKeyCounts.get(page.storageKey) ?? 0) + 1,
        );

        if (page.storageKey !== expectedPageKey) {
          issues.nonCanonicalPages.push(page.id);
        }

        if (page.width <= 0 || page.height <= 0) {
          issues.invalidPageDimensions.push(page.id);
        }
      }
    }
  }

  issues.duplicateDocumentKeys.push(
    ...Array.from(documentKeyCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([storageKey]) => storageKey),
  );
  issues.duplicatePageKeys.push(
    ...Array.from(pageKeyCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([storageKey]) => storageKey),
  );

  const summary = {
    auditedAt: new Date().toISOString(),
    range: {
      minYear: options.minYear,
      maxYear: options.maxYear,
    },
    sources: sources.length,
    documents: sources.reduce(
      (sum, source) => sum + source.sourceDocuments.length,
      0,
    ),
    pages: sources.reduce(
      (sum, source) =>
        sum +
        source.sourceDocuments.reduce(
          (docSum, document) => docSum + document.pages.length,
          0,
        ),
      0,
    ),
    counts: {
      nonCanonicalDocuments: uniq(issues.nonCanonicalDocuments).length,
      nonCanonicalPages: uniq(issues.nonCanonicalPages).length,
      duplicateDocumentKeys: uniq(issues.duplicateDocumentKeys).length,
      duplicatePageKeys: uniq(issues.duplicatePageKeys).length,
      pageCountMismatches: uniq(issues.pageCountMismatches).length,
      missingExamDocument: uniq(issues.missingExamDocument).length,
      missingCorrectionDocument: uniq(issues.missingCorrectionDocument).length,
      invalidPageDimensions: uniq(issues.invalidPageDimensions).length,
    },
    samples: {
      nonCanonicalDocuments: uniq(issues.nonCanonicalDocuments).slice(0, 10),
      nonCanonicalPages: uniq(issues.nonCanonicalPages).slice(0, 10),
      duplicateDocumentKeys: uniq(issues.duplicateDocumentKeys).slice(0, 10),
      duplicatePageKeys: uniq(issues.duplicatePageKeys).slice(0, 10),
      pageCountMismatches: uniq(issues.pageCountMismatches).slice(0, 10),
      missingExamDocument: uniq(issues.missingExamDocument).slice(0, 10),
      missingCorrectionDocument: uniq(issues.missingCorrectionDocument).slice(
        0,
        10,
      ),
      invalidPageDimensions: uniq(issues.invalidPageDimensions).slice(0, 10),
    },
  };

  console.log(JSON.stringify(summary, null, 2));
}

function parseCliOptions(argv: string[]) {
  const options = {
    minYear: DEFAULT_MIN_YEAR,
    maxYear: DEFAULT_MAX_YEAR,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--min-year' && argv[index + 1]) {
      options.minYear = Number.parseInt(argv[index + 1], 10);
      index += 1;
      continue;
    }

    if (arg === '--max-year' && argv[index + 1]) {
      options.maxYear = Number.parseInt(argv[index + 1], 10);
      index += 1;
    }
  }

  if (!Number.isInteger(options.minYear) || options.minYear < 0) {
    throw new Error('--min-year must be a non-negative integer.');
  }

  if (!Number.isInteger(options.maxYear) || options.maxYear < options.minYear) {
    throw new Error('--max-year must be an integer greater than or equal to --min-year.');
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
