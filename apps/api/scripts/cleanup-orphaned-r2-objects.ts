import { PrismaClient, Prisma } from '@prisma/client';
import {
  R2StorageClient,
  readR2ConfigFromEnv,
} from '../src/ingestion/r2-storage';
import { deleteStorageKeysBestEffort } from '../src/ingestion/storage-cleanup';

const prisma = new PrismaClient();
const storageClient = new R2StorageClient(readR2ConfigFromEnv());

const DEFAULT_PREFIXES = ['bac/', 'published/assets/', 'admin/images/'];
const DEFAULT_DELETE_BATCH_SIZE = 100;

type CliOptions = {
  apply: boolean;
  prefixes: string[];
  deleteBatchSize: number;
};

async function main() {
  const options = parseCliOptions(process.argv.slice(2));
  const referencedKeys = await collectReferencedKeys();
  const discoveredKeys = await listManagedKeys(options.prefixes);
  const orphanedKeys = Array.from(discoveredKeys).filter(
    (key) => !referencedKeys.has(key),
  );

  const summary = {
    prefixes: options.prefixes,
    referencedKeys: referencedKeys.size,
    discoveredKeys: discoveredKeys.size,
    orphanedKeys: orphanedKeys.length,
    samples: orphanedKeys.slice(0, 50),
    apply: options.apply,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (!options.apply || orphanedKeys.length === 0) {
    return;
  }

  let deletedCount = 0;
  const failedKeys: string[] = [];

  for (let index = 0; index < orphanedKeys.length; index += options.deleteBatchSize) {
    const batch = orphanedKeys.slice(index, index + options.deleteBatchSize);
    const result = await deleteStorageKeysBestEffort(storageClient, batch);
    deletedCount += result.deletedKeys.length;
    failedKeys.push(...result.failedKeys);
    console.log(
      `deleted ${deletedCount}/${orphanedKeys.length} orphaned object(s)`,
    );
  }

  console.log(
    JSON.stringify(
      {
        deletedKeys: deletedCount,
        failedKeys: failedKeys.length,
        failedSamples: failedKeys.slice(0, 50),
      },
      null,
      2,
    ),
  );

  if (failedKeys.length > 0) {
    process.exitCode = 1;
  }
}

function parseCliOptions(argv: string[]): CliOptions {
  const options: CliOptions = {
    apply: false,
    prefixes: [...DEFAULT_PREFIXES],
    deleteBatchSize: DEFAULT_DELETE_BATCH_SIZE,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--apply') {
      options.apply = true;
      continue;
    }

    if (arg === '--prefix' && argv[index + 1]) {
      options.prefixes = argv[index + 1]
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
      index += 1;
      continue;
    }

    if (arg === '--delete-batch-size' && argv[index + 1]) {
      options.deleteBatchSize = parsePositiveInteger(
        argv[index + 1],
        '--delete-batch-size',
      );
      index += 1;
      continue;
    }
  }

  if (options.prefixes.length === 0) {
    throw new Error('At least one --prefix value is required.');
  }

  return options;
}

async function collectReferencedKeys() {
  const referencedKeys = new Set<string>();

  const [sourceDocuments, sourcePages, media] = await Promise.all([
    prisma.sourceDocument.findMany({
      select: {
        storageKey: true,
      },
    }),
    prisma.sourcePage.findMany({
      select: {
        storageKey: true,
      },
    }),
    prisma.media.findMany({
      select: {
        metadata: true,
      },
    }),
  ]);

  for (const document of sourceDocuments) {
    addKey(referencedKeys, document.storageKey);
  }

  for (const page of sourcePages) {
    addKey(referencedKeys, page.storageKey);
  }

  for (const entry of media) {
    addKey(referencedKeys, readJsonString(entry.metadata, 'storageKey'));
  }

  return referencedKeys;
}

async function listManagedKeys(prefixes: string[]) {
  const keys = new Set<string>();

  for (const prefix of prefixes) {
    let continuationToken: string | null = null;

    do {
      const response = await storageClient.listObjects({
        prefix,
        continuationToken: continuationToken ?? undefined,
      });

      for (const key of response.keys) {
        addKey(keys, key);
      }

      continuationToken = response.nextContinuationToken;
    } while (continuationToken);
  }

  return keys;
}

function addKey(target: Set<string>, value: string | null | undefined) {
  if (typeof value !== 'string') {
    return;
  }

  const normalized = value.trim();

  if (!normalized) {
    return;
  }

  target.add(normalized);
}

function readJsonString(metadata: Prisma.JsonValue | null, key: string) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

function parsePositiveInteger(value: string, label: string) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return parsed;
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
