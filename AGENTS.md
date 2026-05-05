# AGENTS.md

Use this file as a strong default, not as untouchable law.

If a rule here conflicts with a direct user request, the user request wins.
If two reasonable options exist, prefer the simpler one unless security, correctness, or scale clearly require otherwise.

## Priorities

Optimize for these, in order:

1. Correctness
2. Security
3. Maintainability
4. Clear boundaries
5. Performance
6. Scalability
7. Developer speed

Do not trade correctness or security for convenience.
Do not trade long-term clarity for small short-term speedups without saying so explicitly.

## Repo boundaries

This repo is a monorepo with explicit responsibilities:

- `apps/web`: Next.js web app
- `apps/api`: NestJS API and worker runtime
- `packages/contracts`: shared runtime-validated contracts and types
- `docs`: human-facing workflow and operational documentation

Keep these boundaries clear.
Do not move business logic into random scripts, UI components, or vague shared folders.

## Non-negotiables

Do not create a second implementation of an existing workflow.

If automation is needed, call or wrap the existing service, API, or worker path.
Scripts may orchestrate, batch, or queue work, but they must not duplicate business logic already owned by the app.

For ingestion work, the canonical implementation lives in `apps/api/src/ingestion/*` and the worker/API flow.
Do not create or keep a second ingestion engine in scripts.
Scripts may discover sources, enqueue jobs, or call shared services, but they must not own separate rasterization, extraction, state transitions, or publish logic if those already exist in the app.

Do not use destructive git commands.
Do not revert unrelated user changes.
Do not silently change public APIs, auth behavior, DB schema, or queue semantics without calling it out.

## Engineering defaults

Prefer boring, explicit code over clever code.
Prefer one obvious path through the system over multiple almost-equivalent ones.
Prefer small, composable modules over giant mixed-responsibility files.
Prefer strong types plus runtime validation at trust boundaries.

When adding or changing code:

- use concrete, domain-based names
- keep side effects isolated
- return structured data instead of passing loose objects around
- remove dead code instead of leaving parallel paths behind
- keep comments short and useful; explain why, not what

### Frontend

For UI implementation details, read `docs/design-system.md` before changing
`apps/web`. Use local shadcn primitives first, keep dark mode ink/navy by
default, and do not reintroduce legacy button/control classes or raw visible
form controls outside `apps/web/src/components/ui`.

The Next.js app should be server-first by default.

Prefer Server Components for:

- route files
- layouts
- initial page data loading
- auth checks and redirects when possible
- metadata

Use Client Components only where needed for:

- event handlers
- forms
- browser-only APIs
- local interactive state
- animations
- live editing

Do not make the main content path depend on blank-first-render plus `useEffect` fetching unless there is a real reason.

Keep route files responsible for params, redirects, auth, metadata, and first-load data.
Keep client components responsible for interaction and presentational state.
Keep reusable fetching, parsing, and domain logic out of large TSX files.

Prefer `loading.tsx` and Suspense for route-level waiting.
Keep interactive islands as small as practical.

### API

Use domain-based modules.
Keep controllers thin.
Keep business rules in services or domain modules.
Validate input at the boundary.
Keep authorization checks explicit.

Avoid fat controllers, hidden side effects, duplicated orchestration, and junk-drawer modules that mix unrelated concerns.

If admin behavior spans multiple domains, prefer domain modules with admin-facing controllers over one giant admin service.

### Contracts and validation

`packages/contracts` should contain real runtime contracts, not only compile-time interfaces.

Validate request bodies, query params, form payloads, third-party data, and external API responses at the boundary.
Parse untrusted input into explicit internal shapes.
Do not rely on TypeScript alone for runtime safety.

### Database

Treat the database as a critical shared system.

Prefer:

- explicit Prisma schema changes with migrations
- transactions for multi-step writes that must stay consistent
- indexes for real query paths
- pagination for list endpoints
- selecting only needed fields
- avoiding N+1 query patterns

Do not make casual schema changes.
Do not hide expensive queries inside loops.
Do not fetch large datasets where summaries or pagination are enough.

### Security

Assume all input is untrusted.

Always think about:

- authentication and authorization
- input validation
- file upload handling
- SSRF and unsafe outbound fetches
- XSS
- CSRF and cookie behavior
- secret handling
- rate limits for expensive or sensitive operations

Do not log secrets, tokens, raw credentials, or sensitive personal data.
Do not bypass validation because the frontend already checks it.
Do not expose admin-only actions through ambiguous routes or unchecked role assumptions.

### Performance

Optimize the hot path first.
Prefer simple systems that scale predictably over premature complexity.

For the web app:

- minimize unnecessary client JavaScript
- fetch first-load data on the server when possible
- keep interactive islands small

For the API:

- move long-running or expensive work to workers when appropriate
- avoid blocking request-response cycles with heavy processing
- paginate list endpoints

Do not add caching, memoization, or background systems by reflex.
Add them when there is a clear bottleneck, cost issue, or scaling reason.

## Testing and verification

Every meaningful change should be verified.

Use the smallest test that covers the risk well:

- unit tests for pure logic
- component tests for UI behavior when useful
- API tests for contracts and business flows
- end-to-end tests for critical user journeys

For bug fixes, verify the failing path directly and add or update a test when practical.
For refactors, preserve behavior unless the change is intentionally behavioral.

Never claim something is verified unless it was actually verified.

## Change discipline

Prefer tightening an existing boundary over rewriting the system.
When touching messy code, improve the local seam if you can do so safely.
Do not spread the mess into new files.
Do not create a parallel system just to avoid understanding the current one.
When replacing an old path with a new one, complete the cleanup so the repo is not left half old and half new, unless the user asks for preservation.

## Pause before high-blast-radius changes

Explain tradeoffs clearly before proceeding if the change involves:

- destructive schema or migration risk
- auth or permission model changes
- breaking public API contract changes
- ingestion workflow state-machine changes
- deployment or infrastructure changes with meaningful blast radius
- large refactors with multiple valid directions

If the path is straightforward and low-risk, just do the work.

## What to report after coding

After making changes, report:

- what changed
- what was verified
- any assumptions made
- any remaining risks or follow-ups

If you notice an architectural smell outside the task, mention it briefly without expanding scope unless asked.
