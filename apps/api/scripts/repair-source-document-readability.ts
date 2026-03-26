import { PrismaClient } from '@prisma/client';
import {
  fetchBufferWithRetry,
  mapWithConcurrency,
} from '../src/ingestion/intake-runtime';
import {
  R2StorageClient,
  readR2ConfigFromEnv,
} from '../src/ingestion/r2-storage';

const prisma = new PrismaClient();
const storageClient = new R2StorageClient(readR2ConfigFromEnv());
const DEFAULT_MIN_YEAR = 2008;
const DEFAULT_CONCURRENCY = 4;

type CliOptions = {
  minYear: number;
  repair: boolean;
  concurrency: number;
};

type SourceDocumentRecord = {
  id: string;
  jobId: string;
  kind: string;
  fileName: string;
  storageKey: string;
  sourceUrl: string | null;
};

async function main() {
  const options = parseCliOptions(process.argv.slice(2));
  const sourceDocuments = await prisma.sourceDocument.findMany({
    where: {
      job: {
        year: {
          gte: options.minYear,
        },
      },
    },
    orderBy: [{ job: { year: 'desc' } }, { createdAt: 'asc' }],
    select: {
      id: true,
      jobId: true,
      kind: true,
      fileName: true,
      storageKey: true,
      sourceUrl: true,
    },
  });

  let checked = 0;
  let repaired = 0;
  let unreadable = 0;
  const failures: Array<{
    jobId: string;
    documentId: string;
    fileName: string;
    storageKey: string;
    sourceUrl: string | null;
    error: string;
  }> = [];

  await mapWithConcurrency(
    sourceDocuments,
    options.concurrency,
    async (document) => {
      checked += 1;

      try {
        await storageClient.getObjectBuffer(document.storageKey);
        await markDocumentAudited(document.id, false, null);
        return;
      } catch (error) {
        const readError = error instanceof Error ? error.message : String(error);

        if (!options.repair || !document.sourceUrl) {
          unreadable += 1;
          failures.push({
            jobId: document.jobId,
            documentId: document.id,
            fileName: document.fileName,
            storageKey: document.storageKey,
            sourceUrl: document.sourceUrl,
            error: readError,
          });
          await markDocumentAudited(document.id, false, readError);
          return;
        }

        try {
          const buffer = await fetchBuffer(document.sourceUrl);
          await storageClient.putObject({
            key: document.storageKey,
            body: buffer,
            contentType: 'application/pdf',
          });
          await storageClient.getObjectBuffer(document.storageKey);
          repaired += 1;
          await markDocumentAudited(document.id, true, null);
          console.log(`repaired ${document.fileName}`);
          return;
        } catch (repairError) {
          const message =
            repairError instanceof Error
              ? repairError.message
              : String(repairError);
          unreadable += 1;
          failures.push({
            jobId: document.jobId,
            documentId: document.id,
            fileName: document.fileName,
            storageKey: document.storageKey,
            sourceUrl: document.sourceUrl,
            error: `${readError} | repair=${message}`,
          });
          await markDocumentAudited(document.id, false, message);
        }
      }
    },
  );

  console.log(
    `done checked=${checked} repaired=${repaired} unreadable=${unreadable} minYear=${options.minYear} repair=${options.repair}`,
  );

  if (failures.length > 0) {
    console.log(JSON.stringify(failures, null, 2));
    process.exitCode = 1;
  }
}

function parseCliOptions(argv: string[]): CliOptions {
  const options: CliOptions = {
    minYear: DEFAULT_MIN_YEAR,
    repair: false,
    concurrency: DEFAULT_CONCURRENCY,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === '--min-year' && argv[index + 1]) {
      options.minYear = parsePositiveInteger(argv[index + 1], '--min-year');
      index += 1;
      continue;
    }

    if (value === '--concurrency' && argv[index + 1]) {
      options.concurrency = parsePositiveInteger(
        argv[index + 1],
        '--concurrency',
      );
      index += 1;
      continue;
    }

    if (value === '--repair') {
      options.repair = true;
    }
  }

  return options;
}

function parsePositiveInteger(value: string, label: string) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return parsed;
}

async function markDocumentAudited(
  documentId: string,
  repaired: boolean,
  errorMessage: string | null,
) {
  const current = await prisma.sourceDocument.findUnique({
    where: {
      id: documentId,
    },
    select: {
      metadata: true,
    },
  });

  const metadata = asRecord(current?.metadata);
  await prisma.sourceDocument.update({
    where: {
      id: documentId,
    },
    data: {
      metadata: {
        ...(metadata ?? {}),
        readabilityAuditAt: new Date().toISOString(),
        readabilityAuditError: errorMessage,
        readabilityRepairAt: repaired ? new Date().toISOString() : null,
      },
    },
  });
}

async function fetchBuffer(url: string) {
  return fetchBufferWithRetry(url, {
    userAgent: 'BAC Bank repair bot/1.0',
  });
}

function asRecord(
  value: unknown,
): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
