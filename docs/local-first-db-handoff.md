# Local-First Database Handoff

## Purpose

Use the local PostgreSQL database as the fast working database for ingestion,
admin review, crop work, and publication. Use the hosted Neon database as a
handoff checkpoint between devices, not as the default live write target.

This is the preferred workflow when Neon connection latency or timeouts make
long ingestion/admin work unreliable.

## Rule

Only one database is writable at a time.

- During active work, write to the current device's local Postgres.
- Before switching devices, freeze writes and publish a checkpoint to Neon.
- On the next device, restore that checkpoint into its local Postgres before
  starting work.

Do not write independently to local DBs on two devices and then try to merge
them. PostgreSQL row-level merges are risky for this app because ingestion jobs,
published rows, study sessions, and media references can diverge.

## Local Working Environment

For active work on a device, `apps/api/.env` should point at local Postgres:

```env
DATABASE_URL=postgresql://bac_user:bac_password@localhost:5433/bac_bank?schema=public
REDIS_URL=redis://localhost:6379
REDIS_REQUIRED=false
BAC_THEORY_CONTENT_SOURCE=r2
```

Start local services:

```bash
npm run db:up
```

Run the API, admin app, import scripts, and worker from this local database.
Use one worker unless intentionally draining the same local queue from multiple
processes.

## Keep The Neon URL Local

Keep the Neon connection string only in a local password manager, shell session,
or ignored file. Never commit it.

For commands below, set it in the shell for the current terminal:

```bash
export NEON_DATABASE_URL='postgresql://...'
export LOCAL_DATABASE_URL='postgresql://bac_user:bac_password@localhost:5433/bac_bank?schema=public'
```

If the Neon URL includes Prisma-only query parameters such as
`connection_limit`, the repo restore script strips unsupported parameters for
`psql`/`pg_restore`.

## Before Starting On This Device

Use this when the latest work was done on the other device and pushed to Neon.

1. Stop local writers on this device:

```bash
pkill -f 'nest start --watch' || true
pkill -f 'src/worker.ts' || true
pkill -f 'scripts/import-reviewed-extract.ts' || true
pkill -f 'scripts/approve-publish-ingestion-jobs.ts' || true
```

2. Start local Postgres:

```bash
npm run db:up
```

3. Optional but safest: checkpoint current Neon state to R2:

```bash
DATABASE_URL="$NEON_DATABASE_URL" \
npm run db:backup:r2 -w @bac-bank/api -- --keep-local
```

4. Restore the latest R2 checkpoint into local Postgres:

```bash
TARGET_DATABASE_URL="$LOCAL_DATABASE_URL" \
npm run db:restore:r2 -w @bac-bank/api -- --latest --yes
```

5. Set `apps/api/.env` back to `LOCAL_DATABASE_URL` and verify:

```bash
npm run prisma:validate -w @bac-bank/api
```

## Before Switching To The Other Device

Use this when this device has the newest local database state.

1. Freeze writes:

```bash
pkill -f 'nest start --watch' || true
pkill -f 'src/worker.ts' || true
pkill -f 'scripts/import-reviewed-extract.ts' || true
pkill -f 'scripts/approve-publish-ingestion-jobs.ts' || true
```

2. Back up the local working DB to R2:

```bash
DATABASE_URL="$LOCAL_DATABASE_URL" \
npm run db:backup:r2 -w @bac-bank/api -- --keep-local
```

3. Restore that latest backup into Neon:

```bash
TARGET_DATABASE_URL="$NEON_DATABASE_URL" \
npm run db:restore:r2 -w @bac-bank/api -- --latest --yes
```

4. Verify Neon accepts Prisma queries:

```bash
DATABASE_URL="$NEON_DATABASE_URL" \
npx prisma db execute --schema apps/api/prisma/schema.prisma --stdin <<'SQL'
SELECT 1;
SQL
```

5. On the other device, run the "Before Starting On This Device" flow.

## Safety Checks

Before any destructive restore, confirm:

- API, worker, Prisma Studio, import, and publish scripts are stopped.
- You know which side is authoritative.
- A fresh backup exists in R2.
- The target is the database you intend to overwrite.

If unsure, do not restore. Run a count/schema comparison first and decide which
database should win.

## When To Use Hosted Directly

Point `DATABASE_URL` directly at Neon only for:

- quick inspection
- lightweight app testing
- creating or restoring handoff checkpoints
- emergency work when local Postgres is unavailable

For long ingestion batches, publication sweeps, crop review, and admin work,
prefer local Postgres.
