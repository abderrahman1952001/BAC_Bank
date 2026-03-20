#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const initialEnvKeys = new Set(Object.keys(process.env));

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  const source = trimmed.startsWith('export ')
    ? trimmed.slice('export '.length).trimStart()
    : trimmed;
  const separatorIndex = source.indexOf('=');
  if (separatorIndex === -1) return null;

  const key = source.slice(0, separatorIndex).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return null;

  let value = source.slice(separatorIndex + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    const quote = value[0];
    value = value.slice(1, -1);
    if (quote === '"') {
      value = value
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t');
    }
  } else {
    const commentMatch = value.match(/^(.*?)\s+#.*$/);
    if (commentMatch) {
      value = commentMatch[1].trimEnd();
    }
  }

  return { key, value };
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');

  for (const line of content.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (!parsed) continue;

    // Keep explicit shell env highest priority, but let closer .env files override farther ones.
    if (initialEnvKeys.has(parsed.key)) continue;
    process.env[parsed.key] = parsed.value;
  }
}

const apiRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(apiRoot, '..', '..');
const envFiles = [
  path.join(workspaceRoot, '.env'),
  path.join(apiRoot, '.env'),
  path.join(apiRoot, 'prisma', '.env'),
];

for (const envFile of envFiles) {
  loadEnvFile(envFile);
}

if (!process.env.DATABASE_URL) {
  console.error(
    [
      'DATABASE_URL is not set.',
      `Checked: ${envFiles.join(', ')}`,
      'Set DATABASE_URL in one of those files or in your current shell.',
    ].join('\n'),
  );
  process.exit(1);
}

const prismaExecutable = process.platform === 'win32' ? 'prisma.cmd' : 'prisma';
const args = ['studio', ...process.argv.slice(2)];

const child = spawn(prismaExecutable, args, {
  cwd: apiRoot,
  env: process.env,
  stdio: 'inherit',
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error(`Failed to start Prisma Studio: ${error.message}`);
  process.exit(1);
});
