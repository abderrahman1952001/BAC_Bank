# BAC Bank

BAC Bank is a mobile-first QBank platform for Algerian BAC students.

This repository is a monorepo with:

- `apps/api`: NestJS + Fastify + Prisma API
- `apps/web`: Next.js web app (PWA-ready foundation)

## Current MVP Scope

- Normalized BAC taxonomy:
  - Top-level `stream_families` / `subject_families` plus leaf `streams` / `subjects`
  - Year-aware stream-to-subject rules for common vs stream-specific subjects
- Canonical BAC paper storage:
  - One canonical `paper` can be shared by multiple stream-facing `exam` offerings
  - Browse and admin routes still address stream/year/subject exam offerings
- Session-based practice workflow:
  - Build a session for one subject with guided filters (stream/year/topic/session type)
  - Live preview of matching exercise count while filtering
  - Generate a curated set of exercises
  - Solve exercises one-by-one with per-question answer/explanation reveal
- Record question attempts

## Build Order (Recommended)

1. **Foundation and Infra**
   - Monorepo setup
   - Postgres/Redis services
   - Environment contracts
2. **Database and Core API**
   - Normalized QBank schema
   - Query/filter endpoints
   - Attempt tracking
3. **Admin Ingestion Pipeline**
   - Upload PDFs
   - Convert/capture question content as Markdown
   - Attach assets (graphs, tables, images)
   - Tag topic metadata and publish papers
4. **Student Practice App**
   - Filter UI and practice flow
   - Question detail with official correction
   - Progress and analytics basics
5. **Hardening and Scale**
   - Caching strategy
   - Monitoring and alerts
   - Security hardening and rate limiting

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env file:

```bash
cp .env.example .env
```

3. Start infrastructure (if Docker access is available):

```bash
npm run db:up
```

This also starts Adminer on `http://localhost:8080` (PostgreSQL UI).
PostgreSQL is exposed on host port `5433` to avoid collisions with local PostgreSQL installs.

4. Generate Prisma client:

```bash
npm run prisma:generate -w @bac-bank/api
```

5. Apply migrations (requires PostgreSQL access):

```bash
npm run prisma:migrate:dev -w @bac-bank/api
```

6. Run apps:

```bash
npm run dev:all
```

- The ingestion worker is included in `npm run dev:all`.
- You can also run it separately with:

```bash
npm run dev:worker
```

- API base URL: `http://localhost:3001/api/v1`
- Web app URL: `http://localhost:3000`

## Database Table + Field Management

### Browse all tables and edit records

1. Start DB services:

```bash
npm run db:up
```

2. Open Adminer: `http://localhost:8080`
3. Login with:
   - System: `PostgreSQL`
   - Server: `postgres`
   - Username: `bac_user`
   - Password: `bac_password`
   - Database: `bac_bank`

You can browse all tables and edit row data from the UI.

### Edit data with Prisma Studio

```bash
npm run db:studio
```

Prisma Studio opens a table editor for all Prisma models.

### Add or update DB fields for the app (recommended flow)

1. Update model fields in `apps/api/prisma/schema.prisma`.
2. Create/apply migration:

```bash
npm run db:migrate -- --name describe_change
```

3. Restart API if needed.

For quick local prototyping without a migration file, you can use:

```bash
npm run prisma:db:push -w @bac-bank/api
```

Use migrations for real app changes so schema stays reproducible.

If your API runs on the host machine (not in Docker), use:

```env
DATABASE_URL=postgresql://bac_user:bac_password@localhost:5433/bac_bank?schema=public
```

## Admin CMS Data Model

The live content model is split into browse-facing offerings and canonical paper content:

- `stream_families`
- `streams`
- `subject_families`
- `subjects`
- `papers`
- `exams`
- `exam_variants`
- `exam_nodes`
- `exam_node_blocks`

`streams` and `subjects` are the leaf pathway / paper-subject identities used by exam offerings.
`stream_families` and `subject_families` hold the top-level BAC taxonomy above them.
`exams` are the stream-facing offering rows (`year + stream + subject + session`).
`papers` own the shared hierarchy and allow one BAC sujet to be reused across multiple streams when the official paper is common.

The BAC ingestion workflow now uses a separate review layer before publication:

- `ingestion_jobs`
- `source_documents`
- `source_pages`

Review in `/admin/ingestion/*` keeps imported PDFs, page PNGs, crop boxes, and draft JSON out of the live exam tables until an admin explicitly approves and publishes the job.
If a paper is shared across streams, set `draft_json.exam.metadata.paperFamilyCode` before publication so multiple offerings attach to the same canonical paper.

## API Endpoints (MVP)

- `GET /api/v1/health`
- `GET /api/v1/health/live`
- `GET /api/v1/health/ready`
- `GET /api/v1/qbank/filters`
- `GET /api/v1/qbank/questions`
- `GET /api/v1/qbank/questions/:id`
- `GET /api/v1/qbank/sessions?limit=8`
- `POST /api/v1/qbank/sessions/preview`
- `POST /api/v1/qbank/sessions`
- `GET /api/v1/qbank/sessions/:id`
- `POST /api/v1/qbank/questions/:id/attempts`
- `POST /api/v1/admin/exams/bootstrap`
- `GET /api/v1/admin/ingestion/jobs`
- `GET /api/v1/admin/ingestion/jobs/:jobId`
- `POST /api/v1/admin/ingestion/intake/manual`
- `PATCH /api/v1/admin/ingestion/jobs/:jobId`
- `POST /api/v1/admin/ingestion/jobs/:jobId/approve`
- `POST /api/v1/admin/ingestion/jobs/:jobId/publish`
- `GET /api/v1/ingestion/documents/:documentId/file`
- `GET /api/v1/ingestion/pages/:pageId/image`
- `GET /api/v1/ingestion/jobs/:jobId/assets/:assetId/preview`
- `GET /api/v1/ingestion/media/:mediaId`

## Notes

- Production runbook: [docs/production-runbook.md](docs/production-runbook.md)
- Migration SQL is generated in `apps/api/prisma/migrations`.
- BAC intake overview: [docs/intake-pipeline.md](docs/intake-pipeline.md)
- Source intake command examples:
  - `npm run intake:source:eddirasa -w @bac-bank/api -- --stage originals --min-year 2008`
  - `npm run intake:source:eddirasa -w @bac-bank/api -- --stage pages --min-year 2008`
  - `npm run intake:source:eddirasa -w @bac-bank/api -- --stage ocr --ocr-backend gemini --job-id <job-id>`
  - Requires `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_ENDPOINT`, and `PUBLIC_API_BASE_URL`.
  - Gemini is the extraction backend. The current default model is `gemini-3-flash-preview`. Set `GEMINI_API_KEY` or `GOOGLE_API_KEY` before running `ocr` or `process`.
  - `--gemini-model gemini-3-flash-preview`, `--gemini-max-output-tokens 65535`, and `--gemini-temperature 1` override the Gemini 3 generation config.
  - `--stage originals` stores original PDFs in R2 and records `source_documents`.
  - `--stage pages` rasterizes PDFs, uploads PNG page images to R2, and creates/updates `source_pages`.
  - `--stage ocr` reuses the stored originals/pages and updates `draft_json` with Gemini extraction.
  - `--stage process` remains as a compatibility shortcut for `pages + ocr` on already uploaded originals.
  - `--job-id a,b,c` lets `pages`, `ocr`, or `process` target exact ingestion jobs.
  - `--slug slug-a,slug-b` lets `originals`, `pages`, `ocr`, or `process` target exact Eddirasa exam slugs.
  - Uses `pdftoppm` to rasterize PDF pages into PNGs before uploading them to R2.
  - Manual PDF intake is available in the admin UI at `/admin/ingestion`.
- `npm run prisma:seed -w @bac-bank/api` now syncs base BAC taxonomy plus the mathematics topic list used by the practice/topic mapping flow.
- In this environment, Docker daemon access may be restricted; migrations can still be generated from schema, then applied on a DB-enabled machine/CI.
