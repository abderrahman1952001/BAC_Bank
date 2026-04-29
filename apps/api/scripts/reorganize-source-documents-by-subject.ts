import { promises as fs } from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import {
  R2StorageClient,
  readR2ConfigFromEnv,
} from '../src/ingestion/r2-storage';
import { buildCanonicalDocumentStorageKey } from '../src/ingestion/storage-naming';

const prisma = new PrismaClient();
const storageClient = new R2StorageClient(readR2ConfigFromEnv());
const DEFAULT_MIN_YEAR = 2008;
const DEFAULT_MAX_YEAR = new Date().getFullYear();
const DEFAULT_DOWNLOAD_DIR = path.resolve(
  __dirname,
  '../../..',
  'output',
  'r2-source-documents',
);

type CliOptions = {
  apply: boolean;
  minYear: number;
  maxYear: number;
  downloadDir: string;
  skipDownload: boolean;
};

type SourceDocumentRecord = {
  id: string;
  fileName: string;
  storageKey: string;
  paperSource: {
    year: number;
    subject: {
      code: string;
    };
  };
};

type MigrationPlan = {
  documentId: string;
  fileName: string;
  currentStorageKey: string;
  desiredStorageKey: string;
};

async function main() {
  const options = parseCliOptions(process.argv.slice(2));
  const sourceDocuments = await loadSourceDocuments(options);
  const migrationPlans = buildMigrationPlans(sourceDocuments);

  assertNoDestinationConflicts(sourceDocuments, migrationPlans);

  console.log(
    JSON.stringify(
      {
        apply: options.apply,
        range: {
          minYear: options.minYear,
          maxYear: options.maxYear,
        },
        documents: sourceDocuments.length,
        migrationsNeeded: migrationPlans.length,
        downloadDir: options.downloadDir,
        skipDownload: options.skipDownload,
        samples: migrationPlans.slice(0, 20),
      },
      null,
      2,
    ),
  );

  if (options.apply) {
    await applyMigrationPlans(migrationPlans);
  }

  if (!options.skipDownload) {
    const postMigrationDocuments = options.apply
      ? await loadSourceDocuments(options)
      : sourceDocuments;

    await downloadSourceDocuments(postMigrationDocuments, options.downloadDir);
  }
}

function parseCliOptions(argv: string[]): CliOptions {
  const options: CliOptions = {
    apply: false,
    minYear: DEFAULT_MIN_YEAR,
    maxYear: DEFAULT_MAX_YEAR,
    downloadDir: DEFAULT_DOWNLOAD_DIR,
    skipDownload: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--apply') {
      options.apply = true;
      continue;
    }

    if (arg === '--min-year' && argv[index + 1]) {
      options.minYear = parseYear(argv[index + 1], '--min-year');
      index += 1;
      continue;
    }

    if (arg === '--max-year' && argv[index + 1]) {
      options.maxYear = parseYear(argv[index + 1], '--max-year');
      index += 1;
      continue;
    }

    if (arg === '--download-dir' && argv[index + 1]) {
      options.downloadDir = path.resolve(argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg === '--skip-download') {
      options.skipDownload = true;
    }
  }

  if (options.maxYear < options.minYear) {
    throw new Error('--max-year must be greater than or equal to --min-year.');
  }

  return options;
}

function parseYear(value: string, label: string) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }

  return parsed;
}

async function loadSourceDocuments(options: Pick<CliOptions, 'minYear' | 'maxYear'>) {
  return prisma.sourceDocument.findMany({
    where: {
      paperSource: {
        year: {
          gte: options.minYear,
          lte: options.maxYear,
        },
      },
    },
    orderBy: [
      {
        paperSource: {
          year: 'desc',
        },
      },
      {
        fileName: 'asc',
      },
    ],
    select: {
      id: true,
      fileName: true,
      storageKey: true,
      paperSource: {
        select: {
          year: true,
          subject: {
            select: {
              code: true,
            },
          },
        },
      },
    },
  });
}

function buildMigrationPlans(sourceDocuments: SourceDocumentRecord[]) {
  return sourceDocuments
    .map((document) => {
      const subjectCode = document.paperSource.subject.code?.trim();

      if (!subjectCode) {
        throw new Error(
          `Source document ${document.id} is missing a paper source subject code.`,
        );
      }

      const desiredStorageKey = buildCanonicalDocumentStorageKey(
        {
          year: document.paperSource.year,
          subjectCode,
        },
        document.fileName,
      );

      if (desiredStorageKey === document.storageKey) {
        return null;
      }

      return {
        documentId: document.id,
        fileName: document.fileName,
        currentStorageKey: document.storageKey,
        desiredStorageKey,
      } satisfies MigrationPlan;
    })
    .filter((plan): plan is MigrationPlan => plan !== null);
}

function assertNoDestinationConflicts(
  sourceDocuments: SourceDocumentRecord[],
  migrationPlans: MigrationPlan[],
) {
  const plannedDestinations = new Map<string, string>();
  const currentStorageOwners = new Map(
    sourceDocuments.map((document) => [document.storageKey, document.id]),
  );

  for (const plan of migrationPlans) {
    const existingPlanOwner = plannedDestinations.get(plan.desiredStorageKey);

    if (existingPlanOwner && existingPlanOwner !== plan.documentId) {
      throw new Error(
        `Multiple documents would be moved to ${plan.desiredStorageKey}: ${existingPlanOwner} and ${plan.documentId}.`,
      );
    }

    const existingStorageOwner = currentStorageOwners.get(plan.desiredStorageKey);

    if (existingStorageOwner && existingStorageOwner !== plan.documentId) {
      throw new Error(
        `Destination key ${plan.desiredStorageKey} is already owned by source document ${existingStorageOwner}.`,
      );
    }

    plannedDestinations.set(plan.desiredStorageKey, plan.documentId);
  }
}

async function applyMigrationPlans(migrationPlans: MigrationPlan[]) {
  for (const [index, plan] of migrationPlans.entries()) {
    logProgress(
      'migrated',
      index,
      migrationPlans.length,
      `${plan.currentStorageKey} -> ${plan.desiredStorageKey}`,
    );

    await storageClient.copyObject({
      sourceKey: plan.currentStorageKey,
      destinationKey: plan.desiredStorageKey,
    });

    try {
      await prisma.sourceDocument.update({
        where: {
          id: plan.documentId,
        },
        data: {
          storageKey: plan.desiredStorageKey,
        },
      });
    } catch (error) {
      await storageClient.deleteObject(plan.desiredStorageKey);
      throw error;
    }

    await storageClient.deleteObject(plan.currentStorageKey);
  }
}

async function downloadSourceDocuments(
  sourceDocuments: SourceDocumentRecord[],
  downloadDir: string,
) {
  await fs.rm(downloadDir, { recursive: true, force: true });
  await fs.mkdir(downloadDir, { recursive: true });

  for (const [index, document] of sourceDocuments.entries()) {
    const buffer = await storageClient.getObjectBuffer(document.storageKey);
    const destinationPath = path.join(
      downloadDir,
      ...document.storageKey.split('/'),
    );

    await fs.mkdir(path.dirname(destinationPath), { recursive: true });
    await fs.writeFile(destinationPath, buffer);

    logProgress('downloaded', index, sourceDocuments.length, document.storageKey);
  }
}

function logProgress(
  action: string,
  index: number,
  total: number,
  detail: string,
) {
  const current = index + 1;

  if (current === 1 || current === total || current % 25 === 0) {
    console.log(`${action} ${current}/${total}: ${detail}`);
  }
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
