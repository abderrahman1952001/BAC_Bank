# Two-Device Content Workflow

This project supports two different sync channels:

- Git for code, contracts, docs, migrations, and reviewed text changes.
- R2 plus a shared development database for active content and ingestion work.

Do not try to keep two local PostgreSQL databases bidirectionally synced. For
active ingestion/review/content work, use one shared development database as the
working source of truth and point both devices at it.

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

For seamless ingestion across two devices, use one shared development Postgres
database instead of two local databases.

On both devices, set `apps/api/.env` to the same shared values:

```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
BAC_THEORY_CONTENT_SOURCE=r2
```

Run the ingestion worker on only one device at a time unless you intentionally
want both devices processing the same shared queue.

Use the backup commands for checkpoints, not live two-way sync:

```bash
npm run db:backup:r2 -w @bac-bank/api
TARGET_DATABASE_URL=postgresql://... npm run db:restore:r2 -w @bac-bank/api -- --latest --yes
```
