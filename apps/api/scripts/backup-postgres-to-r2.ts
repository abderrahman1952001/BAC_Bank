import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  buildBackupObjectKey,
  formatBytes,
  loadApiScriptEnv,
  readBackupR2ConfigFromEnv,
  readDatabaseName,
  requireEnv,
  sanitizeDatabaseUrl,
  uploadFileToR2,
} from './postgres-backup-r2-utils';

type BackupArgs = {
  keepLocal: boolean;
};

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Backup failed: ${message}`);
  process.exitCode = 1;
});

async function main() {
  loadApiScriptEnv();

  const args = parseArgs(process.argv.slice(2));
  const databaseUrl = sanitizeDatabaseUrl(
    requireEnv(process.env.DATABASE_URL, 'DATABASE_URL'),
  );
  const databaseName = readDatabaseName(databaseUrl);
  const backupR2 = readBackupR2ConfigFromEnv();
  const objectKey = buildBackupObjectKey({
    prefix: backupR2.prefix,
    databaseName,
  });
  const tempDirectory = await mkdtemp(
    path.join(tmpdir(), 'bac-bank-postgres-backup-'),
  );
  const backupFilePath = path.join(tempDirectory, path.basename(objectKey));

  try {
    console.log(`Creating PostgreSQL backup for ${databaseName}...`);
    await runPgDump({
      databaseUrl,
      outputPath: backupFilePath,
    });

    const uploadResult = await uploadFileToR2({
      client: backupR2.client,
      bucketName: backupR2.bucketName,
      key: objectKey,
      filePath: backupFilePath,
      metadata: {
        database_name: databaseName,
        backup_format: 'pg_dump_custom',
        backup_schema: 'public',
        created_at: new Date().toISOString(),
      },
    });

    console.log(
      `Backup uploaded to r2://${backupR2.bucketName}/${objectKey} (${formatBytes(uploadResult.sizeInBytes)}).`,
    );

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

function parseArgs(argv: string[]): BackupArgs {
  let keepLocal = false;

  for (const arg of argv) {
    if (arg === '--keep-local') {
      keepLocal = true;
      continue;
    }

    if (arg === '--help') {
      printUsage();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return {
    keepLocal,
  };
}

async function runPgDump(input: { databaseUrl: string; outputPath: string }) {
  await runCommand('pg_dump', [
    `--dbname=${input.databaseUrl}`,
    '--format=custom',
    '--schema=public',
    '--no-owner',
    '--no-privileges',
    `--file=${input.outputPath}`,
  ]);
}

async function runCommand(command: string, args: string[]) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'inherit', 'inherit'],
      env: {
        ...process.env,
        PGAPPNAME: 'bac-bank-db-backup',
      },
    });

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
  console.log(`Usage: npm run db:backup:r2 -w @bac-bank/api -- [--keep-local]`);
}
