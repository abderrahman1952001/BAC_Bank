# Production Runbook

## Release Gate

Run the release check locally or in CI before every deploy:

```bash
npm run release:check
```

That verifies:

- Prisma client generation
- Prisma schema validation
- lint
- tests
- production builds

CI should additionally run `npm run prisma:migrate:deploy -w @bac-bank/api`
against an ephemeral PostgreSQL instance before `release:check` so migrations are
smoke-tested on every merge.

## Deployment Stack

This repository is wired for a Render-based deployment:

- `render.yaml` provisions the web app, API, background worker, PostgreSQL, and Render Key Value.
- `.github/workflows/deploy-render.yml` triggers staging or production deploys with Render deploy hook URLs stored as GitHub environment secrets.
- `staging` and `production` GitHub environments should each define:
  - `RENDER_API_DEPLOY_HOOK_URL`
  - `RENDER_WORKER_DEPLOY_HOOK_URL`
  - `RENDER_WEB_DEPLOY_HOOK_URL`

Render will prompt for the blueprint values marked `sync: false`, including:

- `CORS_ORIGIN`
- `PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_ASSET_BASE_URL`
- `GEMINI_API_KEY`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_ACCOUNT_ID`
- `R2_BUCKET_NAME`
- `R2_ENDPOINT`

## Required Services

- PostgreSQL
- Redis
- API
- Web
- Ingestion worker

The worker is required for queued ingestion processing. Admin intake requests now enqueue jobs, and the worker drains them in the background.

## Required Environment

### API

- `DATABASE_URL`
- `REDIS_URL`
- `REDIS_REQUIRED=true`
- `AUTH_SESSION_SECRET`
- `CORS_ORIGIN`
- `PUBLIC_API_BASE_URL`
- `TRUST_PROXY`
- `HEALTH_WORKER_STALE_MS`

### Web

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_ASSET_BASE_URL` when assets are served from a separate origin

### Ingestion

- `GEMINI_API_KEY` or `GOOGLE_API_KEY`
- `WORKER_HEARTBEAT_INTERVAL_MS`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_ACCOUNT_ID`
- `R2_BUCKET_NAME`
- `R2_ENDPOINT`

## Deploy Order

1. Run database migrations.
2. Deploy the API.
3. Deploy the ingestion worker using the same image/build as the API.
4. Deploy the web app.
5. Run smoke tests:
   - `GET /api/v1/health/live`
   - `GET /api/v1/health/ready`
   - login
   - create a practice session
   - queue an ingestion job
   - verify the worker advances queued ingestion jobs to `processing` and then `in_review` or `failed`

For Render, the API service runs `npm run prisma:migrate:deploy -w @bac-bank/api`
as its pre-deploy command, so schema migrations are applied before the new API
release starts serving traffic.

## Rollback

If a release causes user-facing breakage:

1. Stop the rollout.
2. Roll API, worker, and web back to the previous image/build together.
3. If the release included a schema migration, only roll the database back if the migration is known to be reversible and already rehearsed.
4. Re-run smoke tests against the rollback target.

## Backups And Restore Drill

Before public launch, rehearse this on a non-production environment:

1. Take a PostgreSQL backup.
2. Restore it into a clean database.
3. Point the API at the restored database.
4. Verify auth, browse, sessions, and admin ingestion pages still work.
5. Verify Redis-backed rate limits recover cleanly after Redis restarts.

## Monitoring Baseline

At minimum, monitor:

- API health endpoint
- API error rate
- worker process uptime
- queued ingestion job count
- failed ingestion job count
- PostgreSQL availability
- Redis availability

## Incident Notes

- If ingestion jobs stay in `queued`, check the worker first.
- If ingestion jobs stay in `processing`, check for a stuck worker or an expired processing lease.
- If auth rate limiting is ineffective, confirm Redis connectivity and `REDIS_REQUIRED`.
