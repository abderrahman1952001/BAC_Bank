import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type _Object,
} from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { existsSync, createReadStream, createWriteStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { loadEnvFile } from 'node:process';
import https from 'node:https';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { readR2ConfigFromEnv } from '../src/ingestion/r2-storage';

const DEFAULT_R2_CONNECTION_TIMEOUT_MS = 30_000;
const DEFAULT_R2_SOCKET_TIMEOUT_MS = 180_000;
const DEFAULT_BACKUP_PREFIX = 'backups/postgres';

export type BackupR2Config = {
  bucketName: string;
  prefix: string;
  client: S3Client;
};

export function loadApiScriptEnv(cwd: string = process.cwd()) {
  for (const relativePath of ['.env.local', '.env']) {
    const envPath = path.join(cwd, relativePath);
    if (existsSync(envPath)) {
      loadEnvFile(envPath);
    }
  }
}

export function readBackupR2ConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): BackupR2Config {
  const baseConfig = readR2ConfigFromEnv(env);
  const bucketName =
    normalizeOptionalString(env.DB_BACKUP_R2_BUCKET_NAME) ??
    baseConfig.bucketName;
  const prefix = normalizeObjectPrefix(
    normalizeOptionalString(env.DB_BACKUP_R2_PREFIX) ?? DEFAULT_BACKUP_PREFIX,
  );

  return {
    bucketName,
    prefix,
    client: new S3Client({
      region: 'auto',
      endpoint: baseConfig.endpoint,
      forcePathStyle: true,
      maxAttempts: 5,
      requestHandler: new NodeHttpHandler({
        connectionTimeout: DEFAULT_R2_CONNECTION_TIMEOUT_MS,
        socketTimeout: DEFAULT_R2_SOCKET_TIMEOUT_MS,
        httpsAgent: new https.Agent({
          family: 4,
          keepAlive: true,
          maxSockets: 32,
        }),
      }),
      credentials: {
        accessKeyId: baseConfig.accessKeyId,
        secretAccessKey: baseConfig.secretAccessKey,
      },
    }),
  };
}

export function requireEnv(value: string | undefined, name: string): string {
  if (!value || !value.trim()) {
    throw new Error(`${name} is required.`);
  }

  return value.trim();
}

export function sanitizeDatabaseUrl(databaseUrl: string): string {
  try {
    const parsed = new URL(databaseUrl);
    parsed.searchParams.delete('schema');
    return parsed.toString();
  } catch {
    return databaseUrl;
  }
}

export function readDatabaseName(databaseUrl: string): string {
  try {
    const parsed = new URL(databaseUrl);
    const value = parsed.pathname.replace(/^\/+/, '').trim();
    return value.length > 0 ? value : 'database';
  } catch {
    return 'database';
  }
}

export function buildBackupObjectKey(input: {
  prefix: string;
  createdAt?: Date;
  databaseName: string;
}) {
  const timestamp = formatBackupTimestamp(input.createdAt ?? new Date());
  const safeDatabaseName = sanitizeSegment(input.databaseName);

  return `${normalizeObjectPrefix(input.prefix)}/${timestamp}-${safeDatabaseName}.dump`;
}

export function formatBackupTimestamp(value: Date): string {
  return value
    .toISOString()
    .replace(/\.\d{3}Z$/, 'Z')
    .replace(/:/g, '-');
}

export async function uploadFileToR2(input: {
  client: S3Client;
  bucketName: string;
  key: string;
  filePath: string;
  metadata?: Record<string, string>;
}) {
  const fileStats = await stat(input.filePath);

  await input.client.send(
    new PutObjectCommand({
      Bucket: input.bucketName,
      Key: input.key,
      Body: createReadStream(input.filePath),
      ContentLength: fileStats.size,
      ContentType: 'application/octet-stream',
      Metadata: input.metadata,
    }),
  );

  return {
    sizeInBytes: fileStats.size,
  };
}

export async function listBackupObjects(input: {
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
        Prefix: normalizeObjectPrefix(input.prefix),
        ContinuationToken: continuationToken,
      }),
    );

    objects.push(...(response.Contents ?? []));
    continuationToken = response.IsTruncated
      ? (response.NextContinuationToken ?? undefined)
      : undefined;
  } while (continuationToken);

  return objects.filter(
    (object): object is _Object & { Key: string } =>
      typeof object.Key === 'string' && object.Key.trim().length > 0,
  );
}

export function selectLatestBackupObject<
  T extends { Key: string; LastModified?: Date },
>(objects: T[]) {
  if (objects.length === 0) {
    return null;
  }

  return [...objects].sort((left, right) => {
    const leftTime = left.LastModified?.getTime() ?? 0;
    const rightTime = right.LastModified?.getTime() ?? 0;

    if (leftTime !== rightTime) {
      return rightTime - leftTime;
    }

    return right.Key.localeCompare(left.Key);
  })[0];
}

export async function downloadObjectFromR2(input: {
  client: S3Client;
  bucketName: string;
  key: string;
  destinationPath: string;
}) {
  const response = await input.client.send(
    new GetObjectCommand({
      Bucket: input.bucketName,
      Key: input.key,
    }),
  );

  if (!response.Body) {
    throw new Error(`R2 object ${input.key} is empty.`);
  }

  await pipeline(
    toNodeReadable(response.Body),
    createWriteStream(input.destinationPath),
  );

  const fileStats = await stat(input.destinationPath);
  return {
    sizeInBytes: fileStats.size,
  };
}

export function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  const units = ['KB', 'MB', 'GB', 'TB'];
  let currentValue = value / 1024;
  let unitIndex = 0;

  while (currentValue >= 1024 && unitIndex < units.length - 1) {
    currentValue /= 1024;
    unitIndex += 1;
  }

  return `${currentValue.toFixed(1)} ${units[unitIndex]}`;
}

function normalizeOptionalString(value: string | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeObjectPrefix(value: string) {
  return value.replace(/^\/+/, '').replace(/\/+$/, '');
}

function sanitizeSegment(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-');
  return normalized.replace(/^-+/, '').replace(/-+$/, '') || 'database';
}

function toNodeReadable(
  body: NonNullable<Awaited<ReturnType<S3Client['send']>>['Body']>,
) {
  if (body instanceof Readable) {
    return body;
  }

  if (
    typeof (body as { transformToWebStream?: unknown }).transformToWebStream ===
    'function'
  ) {
    return Readable.fromWeb(
      (
        body as {
          transformToWebStream: () => ReadableStream<Uint8Array>;
        }
      ).transformToWebStream(),
    );
  }

  return Readable.from(body as AsyncIterable<Uint8Array>);
}
