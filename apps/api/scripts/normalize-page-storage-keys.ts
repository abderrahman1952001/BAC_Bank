import { Prisma, PrismaClient, SessionType } from '@prisma/client';
import {
  buildEddirasaPageStorageKey,
  type EddirasaStorageContext,
} from '../src/ingestion/eddirasa-normalization';
import { R2StorageClient, readR2ConfigFromEnv } from '../src/ingestion/r2-storage';

const prisma = new PrismaClient();
const storageClient = new R2StorageClient(readR2ConfigFromEnv());
const DEFAULT_MIN_YEAR = 2008;

async function main() {
  const options = parseCliOptions(process.argv.slice(2));
  const duplicatedJobIds = options.includeAffected
    ? new Set<string>()
    : await loadDuplicatedJobIds(options.minYear);
  const pages = await prisma.sourcePage.findMany({
    where: {
      document: {
        job: {
          provider: 'eddirasa',
          year: {
            gte: options.minYear,
          },
          ...(options.jobIds.length > 0
            ? {
                id: {
                  in: options.jobIds,
                },
              }
            : {}),
        },
      },
    },
    orderBy: [{ updatedAt: 'asc' }, { pageNumber: 'asc' }],
    select: {
      id: true,
      pageNumber: true,
      storageKey: true,
      metadata: true,
      document: {
        select: {
          id: true,
          fileName: true,
          kind: true,
          job: {
            select: {
              id: true,
              year: true,
              streamCode: true,
              subjectCode: true,
              sessionType: true,
              metadata: true,
            },
          },
        },
      },
    },
  });

  let migrated = 0;
  let skipped = 0;

  for (const page of pages) {
    if (duplicatedJobIds.has(page.document.job.id)) {
      skipped += 1;
      continue;
    }

    const metadata = asRecord(page.document.job.metadata);
    const context: EddirasaStorageContext = {
      year: page.document.job.year,
      streamCode: page.document.job.streamCode,
      subjectCode: page.document.job.subjectCode,
      sessionType: page.document.job.sessionType ?? SessionType.NORMAL,
      slug: typeof metadata?.slug === 'string' ? metadata.slug : null,
    };
    const nextStorageKey = buildEddirasaPageStorageKey(
      context,
      page.document.fileName,
      page.pageNumber,
    );

    if (page.storageKey === nextStorageKey) {
      skipped += 1;
      continue;
    }

    await storageClient.copyObject({
      sourceKey: page.storageKey,
      destinationKey: nextStorageKey,
    });

    const pageMetadata = asRecord(page.metadata);
    await prisma.sourcePage.update({
      where: {
        id: page.id,
      },
      data: {
        storageKey: nextStorageKey,
        metadata: {
          ...(pageMetadata ?? {}),
          storageKeyNormalizedAt: new Date().toISOString(),
        },
      },
    });

    migrated += 1;
    console.log(`page ${page.id} -> ${nextStorageKey}`);
  }

  console.log(
    `done migrated=${migrated} skipped=${skipped} includeAffected=${options.includeAffected} minYear=${options.minYear}`,
  );
}

async function loadDuplicatedJobIds(minYear: number) {
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
    select distinct ij.id
    from source_pages sp
    join source_documents sd on sd.id = sp.document_id
    join ingestion_jobs ij on ij.id = sd.job_id
    join (
      select storage_key
      from source_pages
      group by storage_key
      having count(*) > 1
    ) dup on dup.storage_key = sp.storage_key
    where ij.provider = 'eddirasa'
      and ij.year >= ${Number(minYear)}
  `);

  return new Set(rows.map((row) => row.id));
}

function parseCliOptions(argv: string[]) {
  const options = {
    minYear: DEFAULT_MIN_YEAR,
    includeAffected: false,
    jobIds: [] as string[],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--min-year' && argv[index + 1]) {
      options.minYear = Number.parseInt(argv[index + 1], 10);
      index += 1;
      continue;
    }

    if (arg === '--include-affected') {
      options.includeAffected = true;
      continue;
    }

    if (arg === '--job-id' && argv[index + 1]) {
      options.jobIds.push(
        ...argv[index + 1]
          .split(',')
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0),
      );
      index += 1;
      continue;
    }
  }

  if (!Number.isInteger(options.minYear) || options.minYear < 0) {
    throw new Error('--min-year must be a non-negative integer.');
  }

  return options;
}

function asRecord(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
