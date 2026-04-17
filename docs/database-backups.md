# Database Backups

Use the API workspace scripts to keep a logical PostgreSQL backup in R2.

## What This Covers

- PostgreSQL data from `DATABASE_URL`
- A custom-format `pg_dump` backup that can be restored with `pg_restore`
- Storage in the existing R2 account

This does not replace the need to keep ingestion source assets in R2. The
database backup only covers PostgreSQL state.

## Environment

The scripts load `apps/api/.env.local` first and then `apps/api/.env`.

Required:

- `DATABASE_URL`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_ACCOUNT_ID`
- `R2_BUCKET_NAME`
- `R2_ENDPOINT`

Optional:

- `DB_BACKUP_R2_BUCKET_NAME`
  Use a dedicated bucket for backups. If omitted, the scripts reuse
  `R2_BUCKET_NAME`.
- `DB_BACKUP_R2_PREFIX`
  Defaults to `backups/postgres`.

## Create A Backup

```bash
npm run db:backup:r2 -w @bac-bank/api
```

That command:

1. runs `pg_dump` against `DATABASE_URL`
2. uploads the dump to `r2://<bucket>/<prefix>/...`
3. removes the temporary local file

Keep a local copy if you need one:

```bash
npm run db:backup:r2 -w @bac-bank/api -- --keep-local
```

## Restore A Backup

Always restore into a clean non-production database first.

Restore the latest backup:

```bash
TARGET_DATABASE_URL=postgresql://... \
npm run db:restore:r2 -w @bac-bank/api -- --latest --yes
```

Restore a specific backup object:

```bash
TARGET_DATABASE_URL=postgresql://... \
npm run db:restore:r2 -w @bac-bank/api -- --key backups/postgres/<file>.dump --yes
```

The restore command is intentionally destructive:

- it requires `TARGET_DATABASE_URL`
- it requires `--yes`
- it runs `pg_restore --clean --if-exists`

## Recommended Storage Layout

For immediate safety, a backup prefix inside the current R2 bucket is acceptable.
Longer term, prefer a dedicated private backup bucket in the same R2 account and
set `DB_BACKUP_R2_BUCKET_NAME` to that bucket name.
