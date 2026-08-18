# BABY_STEPS.md — Sequential Build Plan

Follow in order. Do not skip ahead. Each step ends with a **Validate** check —
do not proceed until it passes. This mirrors PRD.md Section 16 (Acceptance Criteria)
and agent_tasks.md task IDs are referenced in brackets, e.g. `[AT-03]`.

---

## Step 0 — Prerequisites (human)
- Create Supabase project, Render account, Vercel account, GitHub repo.
- Collect: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- **Validate:** you can log into all three dashboards and have a Supabase connection string.

## Step 1 — Repository Skeleton `[AT-01]`
- Create `job-ingestion-platform/` with `backend/`, `frontend/`, `supabase/`.
- Init TypeScript in `backend/` (Node + Express project) and `frontend/` (Next.js + TS + Tailwind).
- Add root `.gitignore`, `.env.example`, empty `README.md`, empty `DECISIONS.md`.
- **Validate:** `npm run build` (or `tsc --noEmit`) succeeds in both `backend/` and `frontend/` with placeholder code; nothing committed contains real secrets.

## Step 2 — Database Schema `[AT-02]`
- Write `supabase/schema.sql` creating `sources`, `jobs`, `ingestion_runs`, `ingestion_errors` exactly as in PRD.md Section 6.
- Add the `(source_id, external_id)` unique constraint on `jobs`.
- Add indexes on `published_at`, `category`, `role`, `source_id`.
- Seed `sources` with two rows: Remote OK, Arbeitnow (status `HEALTHY`).
- **Validate (human):** run the SQL against the real Supabase project; confirm tables, constraint, and indexes exist via the Supabase table editor or `\d jobs`.

## Step 3 — Backend Skeleton & Config `[AT-03]`
- `backend/src/config/env.ts` loads/validates all required env vars listed in PRD.md Section 12 (manual validation, no Zod). Fail fast with a clear error if a required var is missing.
- `backend/src/db/supabase.ts` creates the Supabase client using the service role key.
- `backend/src/server.ts` boots Express with `GET /health` only.
- **Validate:** `GET /health` returns `{ "status": "healthy" }` locally; missing an env var produces a clear startup error, not a silent crash.

## Step 4 — Types & Normalized Job Shape `[AT-04]`
- `backend/src/types/job.ts` defines `NormalizedJob` and the raw insert/update DB row shape.
- **Validate:** type-checks cleanly; used later by both source adapters.

## Step 5 — Remote OK Source Adapter `[AT-05]`
- `backend/src/sources/remoteok.ts`: fetch the public Remote OK API, parse its response, map into `NormalizedJob[]`. All Remote OK-specific field names live only here.
- No retry/fallback logic yet — just get one clean fetch+parse working.
- **Validate:** a small manual script/test fetches real data and logs a handful of correctly-shaped `NormalizedJob` objects.

## Step 6 — Validation Utility `[AT-06]`
- Manual (non-Zod) validation function checking required fields: `external_id, title, company, original_url`.
- **Validate:** unit test — job missing any required field is flagged invalid; complete job passes.

## Step 7 — Technical Filter + Classifier `[AT-07]`
- `backend/src/utils/classifier.ts`: one function determines technical relevance, category, and role from title/tags, per PRD.md Section 7.
- **Validate:** unit tests for each example in the spec (Backend Engineer → include/Engineering/Backend Engineer; Marketing Manager → excluded; Senior Backend Engineer → Backend Engineer; etc.).

## Step 8 — Job Persistence (Insert/Update/Upsert) `[AT-08]`
- `backend/src/services/job.service.ts`: given normalized+validated+classified jobs, upsert by `(source_id, external_id)`; update `last_seen_at`, `fetched_at`, `updated_at` on match; insert on new.
- **Validate:** unit test — first run inserts N jobs; second run with overlapping data updates existing rows and inserts only new ones; row count matches expectations; no duplicates.

## Step 9 — Ingestion Run/Error Tracking `[AT-09]`
- `backend/src/services/ingestion.service.ts` (core orchestration) creates an `ingestion_runs` row at start, updates counters (`fetched/inserted/updated/failed`) and status throughout, writes `ingestion_errors` rows for every rejected job or request failure, and marks the run `SUCCESS/PARTIAL/FAILED` at the end.
- **Validate:** run once against real Remote OK data; inspect `ingestion_runs` and confirm counters match manually-checked expectations; intentionally malformed test input produces an `ingestion_errors` row without aborting the run.

## Step 10 — Retry + Exponential Backoff `[AT-10]`
- `backend/src/utils/retry.ts`: retry only on 500/502/503/504/429/timeout/connection errors; small fixed max attempts; exponential delay; respect `Retry-After` header on 429.
- Wire into the Remote OK fetch call.
- **Validate:** unit tests simulate 429/500 responses and assert retry count, backoff growth, and eventual give-up behavior.

## Step 11 — Source Health Tracking `[AT-11]`
- `backend/src/services/source-health.service.ts`: update `sources.status/last_success_at/last_failure_at/consecutive_failures` after each attempt.
- **Validate:** unit test — N consecutive simulated failures flips status to `DEGRADED`; a subsequent success resets `consecutive_failures` to 0 and status to `HEALTHY`.

## Step 12 — Arbeitnow Fallback `[AT-12]`
- `backend/src/sources/arbeitnow.ts` mirrors the Remote OK adapter shape (own normalization, isolated field names).
- Ingestion service: if the primary source is `DEGRADED` after retries, attempt Arbeitnow before giving up.
- **Validate:** with `MOCK_PRIMARY_FAILURE=true` locally, confirm the run degrades Remote OK, successfully falls back to Arbeitnow, and the run is recorded as `PARTIAL` or `SUCCESS` (per your chosen convention) with a truthful `error_message`.

## Step 13 — Empty Response & No-Deletion Guarantee `[AT-13]`
- Explicitly handle `[]` from either source: record `fetched_count = 0`, do not touch existing rows.
- **Validate:** unit test — seed DB with jobs, run ingestion against a mocked empty response, assert row count unchanged.

## Step 14 — Scheduler `[AT-14]`
- `backend/src/scheduler/ingestion.scheduler.ts` wires `node-cron` to call `ingestionService.run()` on `INGESTION_CRON`. No business logic in this file.
- **Validate:** set a short cron expression locally (e.g. every minute) and confirm `runIngestion()` fires automatically and logs correctly; then revert to the real hourly default.

## Step 15 — REST API `[AT-15]`
- Implement all six endpoints (PRD.md Section 9) in `backend/src/routes/`.
- `GET /api/jobs`: pagination, `categories`/`roles` comma-list filters (OR within group, AND across groups), sort `published_at DESC, created_at DESC`, no search param.
- `POST /api/ingestion/run`: cooldown guard using `MANUAL_INGESTION_COOLDOWN_MS`.
- **Validate:** manual curl/Postman pass for each endpoint including filter combinations and pagination edges (page beyond last page returns empty list, not an error); rapid repeated `POST /api/ingestion/run` calls are rejected/cooldown-messaged after the first.

## Step 16 — Frontend Skeleton `[AT-16]`
- Next.js app with Tailwind; `lib/api.ts` wraps calls to `NEXT_PUBLIC_API_URL`.
- Home page fetches and renders page 1 of jobs with `JobCard`.
- **Validate:** local frontend against local backend shows real jobs, no console errors.

## Step 17 — Filters `[AT-17]`
- `CategoryFilters`, `RoleFilters`, `All` clear control; state lives in the page component; on change, refetch page 1 with new query params.
- **Validate:** selecting combinations produces the exact query string described in PRD.md Section 9's example; results match manual API calls.

## Step 18 — Pagination `[AT-18]`
- `Load More` button appends page N+1 to the existing list; `hasMore` derived from `pagination.totalPages`.
- **Validate:** scrolling through all pages reaches the end and `Load More` disappears/disables with no duplicate or skipped jobs.

## Step 19 — Job Detail Page `[AT-19]`
- `/jobs/[id]` fetches `GET /api/jobs/:id`; shows all detail fields; "Salary not provided" fallback; `View Original Job` link.
- **Validate:** every field in PRD.md Section 10 renders or shows an honest "Not provided"; original link opens the real source URL.

## Step 20 — Ingestion & Source Status UI `[AT-20]`
- `IngestionStatus` (Run Ingestion button + last-run outcome) and `SourceStatus` (health per source) wired to real endpoints.
- **Validate:** triggering ingestion from the UI updates counts shown and matches the DB; degrading a source locally (via `MOCK_PRIMARY_FAILURE`) is reflected in the status UI.

## Step 21 — Loading/Error/Empty States `[AT-21]`
- Cover: initial load, filter-change load, API failure, zero-match filter combination.
- **Validate:** simulate backend downtime and a zero-result filter; UI never shows a blank screen.

## Step 22 — Responsive Pass `[AT-22]`
- Verify mobile and desktop breakpoints, no horizontal scroll.
- **Validate (human):** manual check in browser dev tools at common breakpoints (375px, 768px, 1280px+).

## Step 23 — Automated Tests `[AT-23]`
- Consolidate the unit/integration tests referenced in Steps 6–13 into the project's chosen test runner; ensure all pass in CI-equivalent local run.
- **Validate:** `npm test` green in `backend/`.

## Step 24 — Documentation `[AT-24]`
- Write `README.md` and `DECISIONS.md` per PRD.md Sections 15.
- **Validate (human):** re-read against Section 16 acceptance list; every explained claim matches actual code behavior.

## Step 25 — Deployment (human)
- Push Supabase schema to production project.
- Deploy backend to Render with real env vars (`MOCK_PRIMARY_FAILURE` unset/false).
- Deploy frontend to Vercel with `NEXT_PUBLIC_API_URL` pointing at the Render URL.
- **Validate (human):** open the live Vercel URL, confirm jobs load, filters work, manual ingestion works, and no secret is visible in any client bundle or public repo.

## Step 26 — Final Walkthrough (human)
- Read every file end-to-end; be ready to explain each decision.
- Confirm every checkbox in PRD.md Section 16 is genuinely true, not assumed.
