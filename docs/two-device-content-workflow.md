# Two-Device Content Workflow

This project supports three sync channels:

- Git for code, contracts, docs, migrations, and reviewed text changes.
- R2 for large assets, theory content, and database backup checkpoints.
- A PostgreSQL handoff workflow for active content and ingestion work.

Do not try to keep two local PostgreSQL databases bidirectionally synced. For
heavy ingestion/review/content work, use the local database on one device at a
time and publish a checkpoint to the hosted database before switching devices.

## Theory Content In R2

`bac_theory_content` is mirrored to R2 under:

```text
theory-content/
```

The API can read theory content from R2 when configured with:

```env
BAC_THEORY_CONTENT_SOURCE=r2
BAC_THEORY_CONTENT_R2_PREFIX=theory-content
BAC_THEORY_CONTENT_CACHE_TTL_MS=30000
```

It still supports local mode for offline work:

```env
BAC_THEORY_CONTENT_SOURCE=local
```

The course app reads generated course assets through the API:

```text
/api/v1/courses/assets?path=canonical/...
```

That keeps R2 credentials server-side.

## Sync Commands

Audit local `bac_theory_content` against R2:

```bash
npm run theory:r2:audit -w @bac-bank/api
```

Push local theory content changes to R2:

```bash
npm run theory:r2:push -w @bac-bank/api
```

Pull R2 theory content into the local working copy:

```bash
npm run theory:r2:pull -w @bac-bank/api
```

The sync script compares object keys and file sizes. It skips `.obsidian/` by
default and does not delete remote or local files.

## Recommended Daily Flow

Before starting on either device:

```bash
git pull --ff-only
npm run theory:r2:pull -w @bac-bank/api
```

After adding or changing theory content:

```bash
npm run theory:r2:audit -w @bac-bank/api
npm run theory:r2:push -w @bac-bank/api
git status -sb
git add <code-and-text-files>
git commit -m "..."
git push
```

Use Git for reviewed text/source files that should remain diffable. Use R2 for
large images, scans, generated course visuals, and durable source assets.

## Database For Active Ingestion

For heavy ingestion/admin work, use the local Postgres database on the device
currently doing the work. Treat the hosted database as a handoff checkpoint, not
as a live multi-device collaborative database.

For the active runbook, see `docs/local-first-db-handoff.md`.

On the active device, set `apps/api/.env` to local Postgres:

```env
DATABASE_URL=postgresql://bac_user:bac_password@localhost:5433/bac_bank?schema=public
REDIS_URL=redis://localhost:6379
BAC_THEORY_CONTENT_SOURCE=r2
```

Run the ingestion worker on only the active device. Before moving to the other
device, stop writers, back up local Postgres to R2, restore that checkpoint into
the hosted database, then restore the checkpoint into the other device's local
Postgres.

Use the backup commands for handoff checkpoints, not live two-way sync:

```bash
npm run db:backup:r2 -w @bac-bank/api
TARGET_DATABASE_URL=postgresql://... npm run db:restore:r2 -w @bac-bank/api -- --latest --yes
```
