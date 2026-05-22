# Hosted Development Database

## Purpose

Use one hosted PostgreSQL database as a shared development database or as a
handoff checkpoint for BAC ingestion work across multiple devices.

For heavy ingestion and publication work, the current preferred workflow is
local-first handoff: one device writes to local Postgres, then pushes a
checkpoint to the hosted DB before another device pulls that checkpoint. See
`docs/local-first-db-handoff.md`.

The hosted-live workflow below is still available for light app testing and
short shared sessions, but it can be slower because hosted connections may have
remote latency, cold starts, or connection churn.

## Recommended Provider

Use Neon Postgres first for the shared development database unless there is a
specific reason to keep all hosted infrastructure on Render.

Why Neon is the better default for this ingestion workflow:

- it is plain hosted PostgreSQL, so the current Prisma schema and scripts still
  work with `DATABASE_URL`
- its free tier has no fixed 30-day database expiry
- paid usage can stay low for an intermittent two-device development database
- scale-to-zero is acceptable for ingestion because the first query may wake the
  database, then active work keeps it warm

Render Postgres is still compatible with the repo and `render.yaml`, but do not
use a temporary free Render database as the canonical ingestion DB. If using
Render, use a paid database.

Supabase is also compatible because it is Postgres, but it brings more platform
surface than this workflow needs. Use it only if you also want Supabase-specific
features.

Whichever provider you choose, use a durable database for serious corpus work
and keep R2 backups enabled.

## What Remains Local

Each device still has its own:

- Git checkout
- local `.env` files
- local dev server processes
- optional local Redis or in-memory Redis fallback
- local generated artifacts and reviewed extract JSONs before they are imported

The hosted DB owns shared ingestion state:

- source bundles
- source document/page references
- ingestion jobs and draft JSON
- crop review state
- approval and publish state
- published app rows

R2 still owns source PDFs, page images, published assets, backups, and other
large object storage.

## Redis

For local two-device ingestion, hosted PostgreSQL is the important shared
component.

The ingestion worker queue is claimed through PostgreSQL job state and leases,
not through Redis. For local development, keep `REDIS_REQUIRED=false` and either
use a local Redis instance on each device or omit Redis when the API can fall
back safely.

Run the ingestion worker on one device at a time unless you intentionally want
both devices draining the same shared queue. The database lease logic should
prevent duplicate claims, but one worker is easier to reason about during
manual ingestion and publication.

If deploying the API/worker to Render, use Render Key Value for production-like
Redis and set `REDIS_REQUIRED=true` there.

## Migration Plan

Run the migration from the device that currently owns the authoritative local
database.

### 1. Freeze Local Writes

Stop local API, worker, Prisma Studio, and any import/publish scripts on both
devices.

Do not start a Gemini batch collection, reviewed-extract import, crop edit, or
publish while the migration is in progress.

### 2. Confirm Current DB Is Healthy

From the authoritative device:

```bash
npm run prisma:validate -w @bac-bank/api
npm run audit:canonical-completeness -w @bac-bank/api
```

If the audit reports known pre-existing content issues, record them before the
move so they are not confused with migration problems.

### 3. Create A Backup To R2

From the authoritative device:

```bash
npm run db:backup:r2 -w @bac-bank/api -- --keep-local
```

Keep the printed local backup path until the hosted restore is verified.

### 4. Provision Hosted Postgres

Recommended Neon setup:

- PostgreSQL major version: use the provider default unless it is older than the
  repo's current target
- region: closest stable region to your devices, preferably Europe
- start on Free if the current DB fits comfortably under the limit
- move to Launch if storage, compute hours, or reliability become annoying
- cap autoscaling/max compute so an ingestion loop cannot surprise-bill you

Use the connection string from the provider dashboard only in local `.env` files
and terminal sessions. Never commit it.

For local development with Prisma, start with the normal direct PostgreSQL
connection URL and add a small Prisma connection limit, for example:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require&connection_limit=3
```

If connection limits become annoying, switch `DATABASE_URL` to the provider's
pooled/session-pooler URL where supported. Test imports and migrations before
doing real ingestion work.

If possible, restrict external access to your two device IPs or a VPN/Tailscale
exit IP. If your IPs change often, allow broader access temporarily but treat
the DB password as a real secret.

### 5. Restore Into Hosted DB

From the authoritative device, restore the latest R2 backup:

```bash
TARGET_DATABASE_URL='postgresql://HOSTED_DATABASE_URL_FROM_DASHBOARD' \
npm run db:restore:r2 -w @bac-bank/api -- --latest --yes
```

Use the exact external URL the provider gives you. If the URL does not include
SSL settings and the connection fails, add the provider-recommended SSL option.

### 6. Verify Hosted DB

Temporarily set `apps/api/.env` on the authoritative device to the hosted DB:

```env
DATABASE_URL=postgresql://HOSTED_DATABASE_URL_FROM_DASHBOARD
REDIS_REQUIRED=false
BAC_THEORY_CONTENT_SOURCE=r2
```

Then run:

```bash
npm run prisma:validate -w @bac-bank/api
npm run prisma:migrate:deploy -w @bac-bank/api
npm run audit:canonical-completeness -w @bac-bank/api
npm run audit:bac-storage -w @bac-bank/api -- --min-year 2008
```

Start the API and admin app and open a few known draft and published papers.
Check at least:

- one already published paper
- one in-review ingestion job
- one source bundle with page images
- one crop-review screen

### 7. Switch Both Devices

On both devices, set `apps/api/.env` to the same hosted DB URL and shared R2
settings.

Recommended local ingestion environment:

```env
DATABASE_URL=postgresql://HOSTED_DATABASE_URL_FROM_DASHBOARD
REDIS_URL=redis://localhost:6379
REDIS_REQUIRED=false
BAC_THEORY_CONTENT_SOURCE=r2
```

Before starting work on either device:

```bash
git pull --ff-only
npm run theory:r2:pull -w @bac-bank/api
```

### 8. Resume Work

Use either device for:

- Gemini artifact collection
- reviewed extract normalization
- import through `import:reviewed-extract`
- admin preview
- crop refinement
- approval
- publish

Keep one worker process active at a time during manual ingestion:

```bash
npm run dev:worker -w @bac-bank/api
```

If a device is only doing Codex reviewed-extract JSON work and not importing or
publishing, it does not need the worker.

## Schema Changes After The Move

Do not casually run `prisma migrate dev` against the hosted shared DB.

Preferred flow for schema changes:

1. Create and test migrations locally against a disposable local DB.
2. Commit the migration files.
3. Pull the migration on the other device.
4. Apply to the hosted DB with:

```bash
npm run prisma:migrate:deploy -w @bac-bank/api
```

This keeps the hosted DB as a shared working database, not a migration
scratchpad.

## Backups

Take manual checkpoints during corpus work:

```bash
npm run db:backup:r2 -w @bac-bank/api
```

Recommended times:

- before switching both devices to the hosted DB
- after a subject sweep finishes
- before large imports
- before bulk crop/publish sessions
- before schema migrations

The database backup does not include R2 source PDFs, page images, or published
assets. Keep R2 storage intact and audited separately.

## Rollback

If the hosted DB restore or early verification fails:

1. Stop local API/worker processes that point to the hosted DB.
2. Switch `DATABASE_URL` back to the old local DB on the authoritative device.
3. Keep using the local DB until the restore issue is fixed.
4. Do not import or publish on both DBs in parallel.

Once both devices have written to the hosted DB, treat the hosted DB as the
source of truth. Do not resume writing to the old local DB unless you
intentionally restore a hosted backup into it and make that rollback decision
explicit.

## Daily Rules

- One hosted DB is the content authority.
- Git is the authority for code, docs, skills, migrations, and reviewed text
  artifacts committed to the repo.
- R2 is the authority for large source and asset files.
- Do not put database URLs, R2 credentials, Gemini keys, Clerk keys, or other
  secrets in Git.
- Do not run destructive restores into the hosted DB without a fresh backup and
  an explicit reason.
- Prefer one active ingestion worker unless intentionally parallelizing queue
  processing.
