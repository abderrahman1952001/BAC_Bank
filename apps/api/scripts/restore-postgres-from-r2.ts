import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import {
  downloadObjectFromR2,
  formatBytes,
  listBackupObjects,
  loadApiScriptEnv,
  readBackupR2ConfigFromEnv,
  requireEnv,
  sanitizeDatabaseUrl,
  selectLatestBackupObject,
} from './postgres-backup-r2-utils';

type RestoreArgs = {
  key: string | null;
  latest: boolean;
  keepLocal: boolean;
  yes: boolean;
};

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Restore failed: ${message}`);
  process.exitCode = 1;
});

async function main() {
  loadApiScriptEnv();

  const args = parseArgs(process.argv.slice(2));
  const targetDatabaseUrl = sanitizeDatabaseUrl(
    requireEnv(process.env.TARGET_DATABASE_URL, 'TARGET_DATABASE_URL'),
  );
  const backupR2 = readBackupR2ConfigFromEnv();
  const backupObject = await resolveBackupObjectKey({
    key: args.key,
    latest: args.latest,
    bucketName: backupR2.bucketName,
    prefix: backupR2.prefix,
    client: backupR2.client,
  });
  const tempDirectory = await mkdtemp(
    path.join(tmpdir(), 'bac-bank-postgres-restore-'),
  );
  const backupFilePath = path.join(
    tempDirectory,
    path.basename(backupObject.key),
  );

  try {
    console.log(
      `Downloading ${backupObject.key} from r2://${backupR2.bucketName}...`,
    );
    const downloadResult = await downloadObjectFromR2({
      client: backupR2.client,
      bucketName: backupR2.bucketName,
      key: backupObject.key,
      destinationPath: backupFilePath,
    });

    console.log(
      `Downloaded ${formatBytes(downloadResult.sizeInBytes)}. Restoring into target database...`,
    );

    await runPgRestore({
      backupFilePath,
      targetDatabaseUrl,
      yes: args.yes,
    });

    console.log(`Restore finished from ${backupObject.key}.`);

    if (args.keepLocal) {
      console.log(`Local backup kept at ${backupFilePath}.`);
      return;
    }
  } finally {
    if (!args.keepLocal) {
      await rm(tempDirectory, {
        recursive: true,
        force: true,
      });
    }
  }
}

function parseArgs(argv: string[]): RestoreArgs {
  let key: string | null = null;
  let latest = false;
  let keepLocal = false;
  let yes = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--key') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('Missing value for --key.');
      }

      key = value;
      index += 1;
      continue;
    }

    if (arg === '--latest') {
      latest = true;
      continue;
    }

    if (arg === '--keep-local') {
      keepLocal = true;
      continue;
    }

    if (arg === '--yes') {
      yes = true;
      continue;
    }

    if (arg === '--help') {
      printUsage();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!key && !latest) {
    throw new Error('Pass either --key <object-key> or --latest.');
  }

  if (!yes) {
    throw new Error('Pass --yes to confirm the destructive restore.');
  }

  return {
    key,
    latest,
    keepLocal,
    yes,
  };
}

async function resolveBackupObjectKey(input: {
  key: string | null;
  latest: boolean;
  bucketName: string;
  prefix: string;
  client: ReturnType<typeof readBackupR2ConfigFromEnv>['client'];
}) {
  if (input.key) {
    return {
      key: input.key,
    };
  }

  if (!input.latest) {
    throw new Error('Backup selection is required.');
  }

  const backupObjects = await listBackupObjects({
    client: input.client,
    bucketName: input.bucketName,
    prefix: input.prefix,
  });
  const latestBackup = selectLatestBackupObject(backupObjects);

  if (!latestBackup) {
    throw new Error(`No backups found under ${input.prefix}.`);
  }

  return {
    key: latestBackup.Key,
  };
}

async function runPgRestore(input: {
  backupFilePath: string;
  targetDatabaseUrl: string;
  yes: boolean;
}) {
  if (!input.yes) {
    throw new Error('Restore confirmation is required.');
  }

  const pgRestore = spawn(
    'pg_restore',
    [
      '--clean',
      '--if-exists',
      '--no-owner',
      '--no-privileges',
      '--format=custom',
      '--file=-',
      input.backupFilePath,
    ],
    {
      stdio: ['ignore', 'pipe', 'inherit'],
      env: {
        ...process.env,
        PGAPPNAME: 'bac-bank-db-restore-export',
      },
    },
  );
  const psql = spawn(
    'psql',
    [`--dbname=${input.targetDatabaseUrl}`, '--set=ON_ERROR_STOP=1'],
    {
      stdio: ['pipe', 'inherit', 'inherit'],
      env: {
        ...process.env,
        PGAPPNAME: 'bac-bank-db-restore-apply',
      },
    },
  );

  if (!pgRestore.stdout) {
    throw new Error('pg_restore did not expose stdout.');
  }

  if (!psql.stdin) {
    throw new Error('psql did not expose stdin.');
  }

  await Promise.all([
    pipeline(pgRestore.stdout, stripUnsupportedSessionSettings(), psql.stdin),
    waitForExit(pgRestore, 'pg_restore'),
    waitForExit(psql, 'psql'),
  ]);
}

function stripUnsupportedSessionSettings() {
  let buffered = '';

  return new Transform({
    transform(chunk, _encoding, callback) {
      buffered += Buffer.isBuffer(chunk)
        ? chunk.toString('utf8')
        : String(chunk);
      const lines = buffered.split('\n');
      buffered = lines.pop() ?? '';

      callback(
        null,
        lines
          .filter((line) => !isUnsupportedSessionSetting(line))
          .map((line) => `${line}\n`)
          .join(''),
      );
    },
    flush(callback) {
      const output = isUnsupportedSessionSetting(buffered)
        ? ''
        : buffered.length > 0
          ? `${buffered}\n`
          : '';
      callback(null, output);
    },
  });
}

function isUnsupportedSessionSetting(line: string) {
  return /^SET transaction_timeout = /.test(line.trim());
}

async function waitForExit(child: ReturnType<typeof spawn>, command: string) {
  await new Promise<void>((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} exited with code ${code ?? 'unknown'}.`));
    });
  });
}

function printUsage() {
  console.log(
    'Usage: TARGET_DATABASE_URL=postgresql://... npm run db:restore:r2 -w @bac-bank/api -- (--key <object-key> | --latest) --yes [--keep-local]',
  );
}
