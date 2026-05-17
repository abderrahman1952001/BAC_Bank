import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type _Object,
} from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { createWriteStream, existsSync } from 'node:fs';
import { mkdir, readFile, readdir, stat } from 'node:fs/promises';
import https from 'node:https';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { loadApiScriptEnv } from './postgres-backup-r2-utils';
import {
  readTheoryContentLocalRoot,
  readTheoryContentR2Prefix,
  resolveTheoryContentMimeType,
} from '../src/courses/theory-content-storage';
import { readR2ConfigFromEnv } from '../src/ingestion/r2-storage';

type Mode = 'audit' | 'push' | 'pull';

type CliOptions = {
  mode: Mode;
  apply: boolean;
  includeObsidian: boolean;
  concurrency: number;
};

type LocalFile = {
  key: string;
  path: string;
  size: number;
};

type RemoteFile = {
  key: string;
  objectKey: string;
  size: number;
  lastModified: string | null;
};

const DEFAULT_R2_CONNECTION_TIMEOUT_MS = 30_000;
const DEFAULT_R2_SOCKET_TIMEOUT_MS = 180_000;
const DEFAULT_R2_MAX_SOCKETS = 128;
const DEFAULT_FILE_OPERATION_RETRIES = 4;

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

async function main() {
  loadApiScriptEnv();

  const options = parseArgs(process.argv.slice(2));
  const localRoot = readTheoryContentLocalRoot();
  const prefix = readTheoryContentR2Prefix();
  const r2 = readR2ConfigFromEnv();
  const client = buildR2Client();
  const [localFiles, remoteFiles] = await Promise.all([
    listLocalFiles(localRoot, options),
    listRemoteFiles({
      client,
      bucketName: r2.bucketName,
      prefix,
    }),
  ]);
  const localByKey = new Map(localFiles.map((file) => [file.key, file]));
  const remoteByKey = new Map(remoteFiles.map((file) => [file.key, file]));
  const localOnly = localFiles.filter((file) => !remoteByKey.has(file.key));
  const remoteOnly = remoteFiles.filter((file) => !localByKey.has(file.key));
  const differing = localFiles.filter((file) => {
    const remoteFile = remoteByKey.get(file.key);
    return remoteFile && remoteFile.size !== file.size;
  });
  const summary = {
    mode: options.mode,
    apply: options.apply,
    localRoot,
    bucketName: r2.bucketName,
    prefix,
    localFiles: localFiles.length,
    remoteFiles: remoteFiles.length,
    localOnly: localOnly.length,
    remoteOnly: remoteOnly.length,
    differing: differing.length,
    localOnlySamples: localOnly.slice(0, 20).map((file) => file.key),
    remoteOnlySamples: remoteOnly.slice(0, 20).map((file) => file.key),
    differingSamples: differing.slice(0, 20).map((file) => {
      const remoteFile = remoteByKey.get(file.key);
      return `${file.key} local=${file.size} r2=${remoteFile?.size ?? 0}`;
    }),
  };

  console.log(JSON.stringify(summary, null, 2));

  if (!options.apply || options.mode === 'audit') {
    return;
  }

  if (options.mode === 'push') {
    const uploadFiles = [...localOnly, ...differing];

    await runWithConcurrency(
      uploadFiles,
      options.concurrency,
      async (file, index) => {
        await retryFileOperation(file.key, () =>
          uploadFile({
            client,
            bucketName: r2.bucketName,
            prefix,
            file,
          }),
        );
        console.log(`uploaded ${index + 1}/${uploadFiles.length}: ${file.key}`);
      },
    );

    return;
  }

  const downloadFiles = [
    ...remoteOnly,
    ...differing
      .map((file) => remoteByKey.get(file.key))
      .filter((file): file is RemoteFile => Boolean(file)),
  ];

  await runWithConcurrency(
    downloadFiles,
    options.concurrency,
    async (file, index) => {
      await retryFileOperation(file.key, () =>
        downloadFile({
          client,
          bucketName: r2.bucketName,
          localRoot,
          file,
        }),
      );
      console.log(
        `downloaded ${index + 1}/${downloadFiles.length}: ${file.key}`,
      );
    },
  );
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
) {
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      await worker(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () =>
      runWorker(),
    ),
  );
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    mode: 'audit',
    apply: false,
    includeObsidian: false,
    concurrency: 4,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--mode' && argv[index + 1]) {
      options.mode = parseMode(argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg === '--apply') {
      options.apply = true;
      continue;
    }

    if (arg === '--include-obsidian') {
      options.includeObsidian = true;
      continue;
    }

    if (arg === '--concurrency' && argv[index + 1]) {
      options.concurrency = parsePositiveInteger(
        argv[index + 1],
        '--concurrency',
      );
      index += 1;
      continue;
    }

    if (arg === '--help') {
      printUsage();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
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

async function retryFileOperation(key: string, operation: () => Promise<void>) {
  let lastError: unknown;

  for (
    let attempt = 1;
    attempt <= DEFAULT_FILE_OPERATION_RETRIES;
    attempt += 1
  ) {
    try {
      await operation();
      return;
    } catch (error) {
      lastError = error;

      if (attempt >= DEFAULT_FILE_OPERATION_RETRIES) {
        break;
      }

      const delayMs = 500 * attempt;
      console.warn(
        `retrying ${key} after attempt ${attempt}: ${readErrorMessage(error)}`,
      );
      await sleep(delayMs);
    }
  }

  throw lastError;
}

function readErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function parseMode(value: string): Mode {
  if (value === 'audit' || value === 'push' || value === 'pull') {
    return value;
  }

  throw new Error('--mode must be audit, push, or pull.');
}

async function listLocalFiles(
  localRoot: string,
  options: Pick<CliOptions, 'includeObsidian'>,
) {
  const files: LocalFile[] = [];

  async function walk(directory: string) {
    const entries = await readdir(directory, { withFileTypes: true }).catch(
      () => [],
    );

    for (const entry of entries) {
      if (!options.includeObsidian && entry.name === '.obsidian') {
        continue;
      }

      const fullPath = join(directory, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const fileStat = await stat(fullPath);
      files.push({
        key: relative(localRoot, fullPath).split(sep).join('/'),
        path: fullPath,
        size: fileStat.size,
      });
    }
  }

  if (!existsSync(localRoot)) {
    return files;
  }

  await walk(localRoot);
  return files.sort((left, right) => left.key.localeCompare(right.key));
}
async function listRemoteFiles(input: {
  client: S3Client;
  bucketName: string;
  prefix: string;
}) {
  const objects: _Object[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await input.client.send(
      new ListObjectsV2Command({
        Bucket: input.bucketName,
        Prefix: `${input.prefix}/`,
        ContinuationToken: continuationToken,
      }),
    );

    objects.push(...(response.Contents ?? []));
    continuationToken = response.IsTruncated
      ? (response.NextContinuationToken ?? undefined)
      : undefined;
  } while (continuationToken);

  return objects
    .filter((object): object is _Object & { Key: string } =>
      Boolean(object.Key?.startsWith(`${input.prefix}/`)),
    )
    .map((object) => ({
      key: object.Key.slice(input.prefix.length + 1),
      objectKey: object.Key,
      size: object.Size ?? 0,
      lastModified: object.LastModified?.toISOString() ?? null,
    }))
    .sort((left, right) => left.key.localeCompare(right.key));
}

async function uploadFile(input: {
  client: S3Client;
  bucketName: string;
  prefix: string;
  file: LocalFile;
}) {
  await input.client.send(
    new PutObjectCommand({
      Bucket: input.bucketName,
      Key: joinObjectKey(input.prefix, input.file.key),
      Body: await readFile(input.file.path),
      ContentLength: input.file.size,
      ContentType: resolveTheoryContentMimeType(input.file.key),
      Metadata: {
        source: 'bac_theory_content',
      },
    }),
  );
}

async function downloadFile(input: {
  client: S3Client;
  bucketName: string;
  localRoot: string;
  file: RemoteFile;
}) {
  const destinationPath = resolveInside(input.localRoot, input.file.key);
  await mkdir(dirname(destinationPath), { recursive: true });
  const response = await input.client.send(
    new GetObjectCommand({
      Bucket: input.bucketName,
      Key: input.file.objectKey,
    }),
  );

  if (!response.Body) {
    throw new Error(`R2 object ${input.file.objectKey} is empty.`);
  }

  await pipeline(
    response.Body as NodeJS.ReadableStream,
    createWriteStream(destinationPath),
  );
}

function buildR2Client() {
  const config = readR2ConfigFromEnv();

  return new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    forcePathStyle: true,
    maxAttempts: 5,
    requestHandler: new NodeHttpHandler({
      connectionTimeout: DEFAULT_R2_CONNECTION_TIMEOUT_MS,
      socketTimeout: DEFAULT_R2_SOCKET_TIMEOUT_MS,
      httpsAgent: new https.Agent({
        family: 4,
        keepAlive: true,
        maxSockets: DEFAULT_R2_MAX_SOCKETS,
      }),
    }),
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

function joinObjectKey(prefix: string, key: string) {
  return `${prefix.replace(/\/+$/, '')}/${key.replace(/^\/+/, '')}`;
}

function resolveInside(root: string, requestedPath: string) {
  const absoluteRoot = resolve(root);
  const absolutePath = resolve(absoluteRoot, requestedPath);
  const relativePath = relative(absoluteRoot, absolutePath);

  if (relativePath.startsWith('..') || relativePath === '') {
    throw new Error(
      `Refusing to write outside theory content root: ${requestedPath}`,
    );
  }

  return absolutePath;
}

function printUsage() {
  console.log(`Usage:
  npm run theory:r2:audit -w @bac-bank/api
  npm run theory:r2:push -w @bac-bank/api
  npm run theory:r2:pull -w @bac-bank/api

Options:
  --mode audit|push|pull
  --apply
  --concurrency <n>
  --include-obsidian`);
}
