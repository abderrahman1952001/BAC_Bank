# BAC Bank

BAC Bank is a mobile-first QBank platform for Algerian BAC students.

This repository is a monorepo with:

- `apps/api`: NestJS + Fastify + Prisma API
- `apps/web`: Next.js web app (PWA-ready foundation)

## Current MVP Scope

- Normalized BAC taxonomy:
  - Unique subject catalog (no duplicates)
  - Stream-to-subject mappings for common vs stream-specific subjects
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

- API base URL: `http://localhost:3001/api/v1`
- Web app URL: `http://localhost:3000`

## API Endpoints (MVP)

- `GET /api/v1/health`
- `GET /api/v1/qbank/filters`
- `GET /api/v1/qbank/questions`
- `GET /api/v1/qbank/questions/:id`
- `GET /api/v1/qbank/sessions?limit=8`
- `POST /api/v1/qbank/sessions/preview`
- `POST /api/v1/qbank/sessions`
- `GET /api/v1/qbank/sessions/:id`
- `POST /api/v1/qbank/questions/:id/attempts`

## Notes

- Migration SQL is generated in `apps/api/prisma/migrations`.
- `npm run prisma:seed -w @bac-bank/api` now includes a seeded sample:
  - BAC 2025 Math (Sciences Exp) from `/home/abderrahman/dzexams-bac-mathematiques-2229208.pdf`
  - Markdown summaries per exercise + linked original page assets at `apps/web/public/samples/dzexams/2025/math-sci/`.
- In this environment, Docker daemon access may be restricted; migrations can still be generated from schema, then applied on a DB-enabled machine/CI.
