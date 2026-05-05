# BAC Bank

BAC Bank is a study platform for Algerian BAC students. The product direction is no longer a narrow question bank: the platform is organized around a student library, guided training flows, a personal study space, and an admin ingestion pipeline for canonical BAC content.

## Documentation Map

- Product and UX source of truth: [BAC-platform-architecture-workbench.md](./BAC-platform-architecture-workbench.md)
- Production and operational runbook: [docs/production-runbook.md](./docs/production-runbook.md)
- Ingestion workflow: [docs/admin-ingestion-workflow.md](./docs/admin-ingestion-workflow.md)
- Agent ingestion playbook: [docs/agent-ingestion-playbook.md](./docs/agent-ingestion-playbook.md)

Use the README for repo orientation and local setup.
Use the workbench for the latest product spec, pedagogy rules, UX expectations, and target model direction.

## Monorepo Structure

- `apps/web`: Next.js web app for students and admins
- `apps/api`: NestJS + Fastify API, workers, and Prisma runtime
- `packages/contracts`: shared runtime-validated contracts and parsers
- `docs`: operational and workflow documentation

## Current App Surfaces

- `/student/my-space`: recent activity, continued training, and personal context
- `/student/my-space/roadmaps/:subjectCode`: deeper subject roadmap with node actions and open review work
- `/student/library`: official BAC sujets organized by stream, subject, and year
- `/student/training`: guided training-session builder and training player
- `/admin/intake`: manual source intake and draft workflow entry
- `/admin/drafts/*`: admin review and publication flow for extracted content

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the app-local environment files:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Do not set `NODE_ENV` inside these files. Next.js and Nest should decide that
from the command you run (`dev`, `build`, `start`).

3. Start local infrastructure if Docker is available:

```bash
npm run db:up
```

This starts PostgreSQL and Redis.
PostgreSQL is exposed on host port `5433` to avoid collisions with local installs.

4. Generate Prisma client:

```bash
npm run prisma:generate -w @bac-bank/api
```

5. Apply migrations:

```bash
npm run prisma:migrate:dev -w @bac-bank/api
```

6. Run the platform locally:

```bash
npm run dev:all
```

- Web app: `http://localhost:3000`
- API base URL: `http://localhost:3001/api/v1`
- Worker is included in `npm run dev:all`
- You can also run it separately with `npm run dev:worker`

## Common Commands

- `npm run dev:all`: run contracts, API, worker, and web together
- `npm run dev:api`: run contracts and API
- `npm run dev:web`: run contracts and web
- `npm run db:up`: start PostgreSQL and Redis
- `npm run db:down`: stop local infrastructure
- `npm run db:migrate -- --name <change>`: create and apply a Prisma migration
- `npm run release:check`: generate Prisma client, validate schema, lint, test, and build

## Schema And Contracts

- Prisma schema source of truth: `apps/api/prisma/schema.prisma`
- Shared runtime contracts: `packages/contracts`
- API routes live under `/api/v1`
- The workbench keeps the latest product and model intent; the README intentionally does not duplicate that full spec.

## Database Editing And Migrations

Open Prisma Studio:

```bash
npm run db:studio
```

Recommended schema workflow:

1. Update `apps/api/prisma/schema.prisma`
2. Create and apply a migration:

```bash
npm run db:migrate -- --name describe_change
```

3. Restart the API if needed

For quick local-only prototyping, you can use:

```bash
npm run prisma:db:push -w @bac-bank/api
```

Use real migrations for shared or durable changes so the schema stays reproducible.

If the API is running on the host machine instead of Docker, use:

```env
DATABASE_URL=postgresql://bac_user:bac_password@localhost:5433/bac_bank?schema=public
```

## Notes

- Prisma migrations live in `apps/api/prisma/migrations`
- Source intake examples:
  - `npm run ingest:eddirasa -w @bac-bank/api -- --stage originals --min-year 2008`
  - `npm run ingest:eddirasa -w @bac-bank/api -- --stage pages --min-year 2008`
  - `npm run ingest:eddirasa -w @bac-bank/api -- --stage pages --job-id <job-id>`
  - `--job-id a,b,c` lets `pages` target exact ingestion jobs.
  - `--slug slug-a,slug-b` lets `originals` or `pages` target exact Eddirasa exam slugs.
  - Uses `pdftoppm` to rasterize PDF pages into PNGs before uploading them to R2.
  - Paper content enters drafts through the premium reviewed-extract import path.
  - Manual PDF intake is available in the admin UI at `/admin/intake`.
- `npm run prisma:seed -w @bac-bank/api` syncs base taxonomy, active curricula, starter topic trees, first skill mappings, and default roadmap shells.
- In this environment, Docker daemon access may be restricted; migrations can still be generated from schema, then applied on a DB-enabled machine/CI.
- The repo root `.env` is no longer part of the app setup. Keep web env in
  `apps/web/.env.local` and API env in `apps/api/.env` or `apps/api/.env.local`.
