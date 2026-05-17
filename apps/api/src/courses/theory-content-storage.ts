import { existsSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';
import { Injectable, NotFoundException } from '@nestjs/common';
import { R2StorageClient, readR2ConfigFromEnv } from '../ingestion/r2-storage';

const DEFAULT_THEORY_CONTENT_R2_PREFIX = 'theory-content';
const THEORY_CONTENT_SOURCE_ENV = 'BAC_THEORY_CONTENT_SOURCE';
const THEORY_CONTENT_R2_PREFIX_ENV = 'BAC_THEORY_CONTENT_R2_PREFIX';
const THEORY_CONTENT_LOCAL_ROOT_ENV = 'BAC_THEORY_CONTENT_LOCAL_ROOT';

export type TheoryContentSource = 'local' | 'r2';

export type TheoryContentAsset = {
  data: Buffer;
  mimeType: string;
  fileName: string;
};

export type TheoryContentStorage = {
  listKeys(prefix?: string): Promise<string[]>;
  getText(key: string): Promise<string>;
  getAsset(key: string): Promise<TheoryContentAsset>;
};

@Injectable()
export class TheoryContentStorageService implements TheoryContentStorage {
  private readonly storage = createTheoryContentStorage();

  listKeys(prefix?: string) {
    return this.storage.listKeys(prefix);
  }

  getText(key: string) {
    return this.storage.getText(key);
  }

  getAsset(key: string) {
    return this.storage.getAsset(key);
  }
}

export function createTheoryContentStorage(
  env: NodeJS.ProcessEnv = process.env,
): TheoryContentStorage {
  const source = readTheoryContentSource(env);

  if (source === 'r2') {
    return new R2TheoryContentStorage({
      prefix: readTheoryContentR2Prefix(env),
      client: new R2StorageClient(readR2ConfigFromEnv(env)),
    });
  }

  return new LocalTheoryContentStorage({
    root: readTheoryContentLocalRoot(env),
  });
}

export function readTheoryContentSource(
  env: NodeJS.ProcessEnv = process.env,
): TheoryContentSource {
  const configured = env[THEORY_CONTENT_SOURCE_ENV]?.trim().toLowerCase();

  if (!configured || configured === 'local') {
    return 'local';
  }

  if (configured === 'r2') {
    return 'r2';
  }

  throw new Error(
    `${THEORY_CONTENT_SOURCE_ENV} must be either "local" or "r2".`,
  );
}

export function readTheoryContentR2Prefix(
  env: NodeJS.ProcessEnv = process.env,
) {
  return normalizeObjectPrefix(
    env[THEORY_CONTENT_R2_PREFIX_ENV] ?? DEFAULT_THEORY_CONTENT_R2_PREFIX,
  );
}

export function readTheoryContentLocalRoot(
  env: NodeJS.ProcessEnv = process.env,
  cwd = process.cwd(),
) {
  const configured = env[THEORY_CONTENT_LOCAL_ROOT_ENV]?.trim();

  if (configured) {
    return resolve(configured);
  }

  const candidates = [
    resolve(cwd, 'bac_theory_content'),
    resolve(cwd, '..', '..', 'bac_theory_content'),
    resolve(cwd, '..', '..', '..', 'bac_theory_content'),
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
}

export function normalizeTheoryContentKey(key: string) {
  const normalized = key
    .replaceAll('\\', '/')
    .split('/')
    .filter((segment) => segment.length > 0)
    .join('/');

  if (
    !normalized ||
    normalized.includes('\0') ||
    normalized.startsWith('/') ||
    normalized.split('/').some((segment) => segment === '..')
  ) {
    throw new NotFoundException('Theory content asset was not found.');
  }

  return normalized;
}

export function resolveTheoryContentMimeType(key: string) {
  const extension = extname(key).toLowerCase();

  if (extension === '.json') return 'application/json; charset=utf-8';
  if (extension === '.md') return 'text/markdown; charset=utf-8';
  if (extension === '.yml' || extension === '.yaml') {
    return 'application/yaml; charset=utf-8';
  }
  if (extension === '.png') return 'image/png';
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  if (extension === '.webp') return 'image/webp';
  if (extension === '.gif') return 'image/gif';
  if (extension === '.svg') return 'image/svg+xml';
  if (extension === '.pdf') return 'application/pdf';

  return 'application/octet-stream';
}

class LocalTheoryContentStorage implements TheoryContentStorage {
  constructor(private readonly config: { root: string }) {}

  async listKeys(prefix = '') {
    const normalizedPrefix = normalizeOptionalKeyPrefix(prefix);
    const root = this.config.root;
    const keys: string[] = [];

    async function walk(directory: string) {
      const entries = await readdir(directory, { withFileTypes: true }).catch(
        () => [],
      );

      for (const entry of entries) {
        const absolutePath = join(directory, entry.name);

        if (entry.isDirectory()) {
          await walk(absolutePath);
          continue;
        }

        if (!entry.isFile()) {
          continue;
        }

        const key = relative(root, absolutePath).split(sep).join('/');

        if (!normalizedPrefix || key.startsWith(normalizedPrefix)) {
          keys.push(key);
        }
      }
    }

    await walk(root);
    return keys.sort((left, right) => left.localeCompare(right));
  }

  async getText(key: string) {
    const buffer = await this.readBuffer(key);
    return buffer.toString('utf8');
  }

  async getAsset(key: string): Promise<TheoryContentAsset> {
    const normalizedKey = normalizeTheoryContentKey(key);

    return {
      data: await this.readBuffer(normalizedKey),
      mimeType: resolveTheoryContentMimeType(normalizedKey),
      fileName: normalizedKey.split('/').at(-1) ?? 'asset',
    };
  }

  private async readBuffer(key: string) {
    const normalizedKey = normalizeTheoryContentKey(key);
    const root = resolve(this.config.root);
    const absolutePath = resolve(root, normalizedKey);
    const relativePath = relative(root, absolutePath);

    if (
      relativePath.startsWith('..') ||
      relativePath === '' ||
      resolve(root, relativePath) !== absolutePath
    ) {
      throw new NotFoundException('Theory content asset was not found.');
    }

    const fileStat = await stat(absolutePath).catch(() => null);

    if (!fileStat?.isFile()) {
      throw new NotFoundException('Theory content asset was not found.');
    }

    return readFile(absolutePath);
  }
}

class R2TheoryContentStorage implements TheoryContentStorage {
  constructor(
    private readonly config: {
      prefix: string;
      client: R2StorageClient;
    },
  ) {}

  async listKeys(prefix = '') {
    const normalizedPrefix = normalizeOptionalKeyPrefix(prefix);
    const objectPrefix = joinObjectKey(this.config.prefix, normalizedPrefix);
    const keys: string[] = [];
    let continuationToken: string | null = null;

    do {
      const response = await this.config.client.listObjects({
        prefix: objectPrefix,
        continuationToken: continuationToken ?? undefined,
      });

      for (const objectKey of response.keys) {
        if (!objectKey.startsWith(`${this.config.prefix}/`)) {
          continue;
        }

        keys.push(objectKey.slice(this.config.prefix.length + 1));
      }

      continuationToken = response.nextContinuationToken;
    } while (continuationToken);

    return keys.sort((left, right) => left.localeCompare(right));
  }

  async getText(key: string) {
    const buffer = await this.readBuffer(key);
    return buffer.toString('utf8');
  }

  async getAsset(key: string): Promise<TheoryContentAsset> {
    const normalizedKey = normalizeTheoryContentKey(key);

    return {
      data: await this.readBuffer(normalizedKey),
      mimeType: resolveTheoryContentMimeType(normalizedKey),
      fileName: normalizedKey.split('/').at(-1) ?? 'asset',
    };
  }

  private async readBuffer(key: string) {
    const normalizedKey = normalizeTheoryContentKey(key);

    try {
      return await this.config.client.getObjectBuffer(
        joinObjectKey(this.config.prefix, normalizedKey),
      );
    } catch (error) {
      if (isMissingR2ObjectError(error)) {
        throw new NotFoundException('Theory content asset was not found.');
      }

      throw error;
    }
  }
}

function normalizeOptionalKeyPrefix(prefix: string) {
  if (!prefix.trim()) {
    return '';
  }

  return `${normalizeTheoryContentKey(prefix).replace(/\/+$/, '')}/`;
}

function normalizeObjectPrefix(prefix: string) {
  return prefix.replace(/^\/+/, '').replace(/\/+$/, '') || 'theory-content';
}

function joinObjectKey(prefix: string, key: string) {
  const normalizedPrefix = normalizeObjectPrefix(prefix);
  const normalizedKey = key.replace(/^\/+/, '');

  return normalizedKey
    ? `${normalizedPrefix}/${normalizedKey}`
    : normalizedPrefix;
}

function isMissingR2ObjectError(error: unknown) {
  const metadata = (error as { $metadata?: { httpStatusCode?: number } })
    ?.$metadata;
  const name = (error as { name?: string })?.name;

  return (
    metadata?.httpStatusCode === 404 ||
    name === 'NoSuchKey' ||
    name === 'NotFound'
  );
}
