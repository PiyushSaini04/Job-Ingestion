# agent_tasks.md — Tasks Safe for an AI Coding Agent

Ground rules for every task below:
- Follow PRD.md exactly. Do not add technologies, endpoints, tables, or features not listed there.
- No Redis/BullMQ/Kafka/RabbitMQ/Prisma/Zod/Prometheus/Grafana/Kubernetes/AI classifier/auth/search box — ever.
- Every `catch` block must log, and either update ingestion run/error state or return a clear error — never swallow silently.
- Keep source-specific (Remote OK / Arbeitnow) field names confined to their own adapter file.
- Do not touch: real Supabase credentials, Render/Vercel deployment, DNS, billing, or anything in human_tasks.md.

---

### AT-01 — Repository & TypeScript Skeleton
**Depends on:** none
**Files:** `job-ingestion-platform/**` (root), `backend/package.json`, `backend/tsconfig.json`, `frontend/package.json`, `.gitignore`, `.env.example`
**Requirements:**
- Create the folder structure exactly as in PRD.md's implied layout: `backend/src/{config,db,routes,services,sources,utils,scheduler,types}`, `frontend/{app,components,lib}`, `supabase/`.
- Backend: Node + TypeScript + Express dependencies only (no ORM, no validation library).
- Frontend: Next.js + TypeScript + Tailwind CSS, App Router.
- `.env.example` lists every variable from PRD.md Section 12 with no real values.
**Definition of done:** both `backend` and `frontend` type-check/build with placeholder `server.ts` / `page.tsx`; `.gitignore` excludes `.env`, `node_modules`, build output; no secrets present anywhere.

---

### AT-02 — Supabase Schema SQL
**Depends on:** AT-01
**Files:** `supabase/schema.sql`
**Requirements:**
- Create `sources`, `jobs`, `ingestion_runs`, `ingestion_errors` with exactly the fields listed in PRD.md Section 6.
- Add `UNIQUE (source_id, external_id)` on `jobs`.
- Add indexes: `jobs(published_at)`, `jobs(category)`, `jobs(role)`, `jobs(source_id)`.
- Include two seed `INSERT`s into `sources` for Remote OK and Arbeitnow with `status = 'HEALTHY'`.
- Use plain SQL (`CREATE TABLE`, `CREATE INDEX`) — no Supabase-specific migration framework required beyond a single `.sql` file.
**Definition of done:** file is valid, idempotent-safe Postgres SQL (`CREATE TABLE IF NOT EXISTS`, `ON CONFLICT DO NOTHING` for seeds); a human can run it once in the Supabase SQL editor. Do not execute it against real Supabase yourself — that's a human task.

---

### AT-03 — Backend Config, DB Client, Health Endpoint
**Depends on:** AT-01
**Files:** `backend/src/config/env.ts`, `backend/src/db/supabase.ts`, `backend/src/server.ts`
**Requirements:**
- `env.ts`: read all backend env vars from PRD.md Section 12, throw a clear startup error listing any missing required var (manual checks, no Zod).
- `supabase.ts`: instantiate and export the Supabase client using `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
- `server.ts`: Express app, JSON middleware, CORS restricted to configured frontend origin(s), mounts `GET /health` returning `{ "status": "healthy" }`, listens on `PORT`.
**Definition of done:** `npm run dev` in `backend/` starts cleanly with a valid `.env`; `curl localhost:$PORT/health` returns the expected JSON; removing a required var produces an immediate, readable startup error (not a runtime crash later).

---

### AT-04 — Shared Types
**Depends on:** AT-01
**Files:** `backend/src/types/job.ts`
**Requirements:** Define `NormalizedJob` (fields matching the `jobs` table minus DB-generated columns) and any small supporting types (e.g. `IngestionResult`, `SourceName`). No business logic in this file.
**Definition of done:** compiles cleanly; imported without circular dependency by adapters and services in later tasks.

---

### AT-05 — Remote OK Source Adapter
**Depends on:** AT-04
**Files:** `backend/src/sources/remoteok.ts`
**Requirements:**
- Fetch the Remote OK public API URL from `REMOTE_OK_API_URL`.
- Parse the raw response and map each entry to `NormalizedJob` (title, company, external_id, original_url, location, description, job_type, remote flag, salary fields if present, published date, tags/keywords for later classification).
- All Remote OK-specific field names/quirks stay inside this file; export only a function returning `NormalizedJob[]`.
- No retry logic here (handled centrally, AT-10) — but do throw a typed/identifiable error on non-2xx responses so the retry layer can classify it.
**Definition of done:** given a sample Remote OK JSON fixture (agent creates a small fixture file for tests), the adapter returns correctly-shaped `NormalizedJob[]`.

---

### AT-06 — Manual Validation Utility
**Depends on:** AT-04
**Files:** `backend/src/utils/validate-job.ts`
**Requirements:** Export a function that checks a `NormalizedJob` has non-empty `external_id`, `title`, `company`, `original_url`, returning `{ valid: boolean, reason?: string }`. Plain TypeScript, no library.
**Definition of done:** unit tests cover: all fields present → valid; each field individually missing/empty → invalid with a reason string.

---

### AT-07 — Classifier & Technical Filter
**Depends on:** AT-04
**Files:** `backend/src/utils/classifier.ts`
**Requirements:**
- One exported function, e.g. `classify(job: NormalizedJob): { isTechnical: boolean; category?: Category; role?: Role }`.
- Deterministic keyword/title matching only — no AI/model calls.
- Must correctly classify every example in PRD.md Section 7 (Backend/DevOps/Cloud/Data/ML/Security/QA engineers → included; Marketing/Sales/Support/Design/Content/Recruiter → excluded).
- Seniority prefixes (Senior/Junior/Lead/etc.) must not create new roles — they map to the base role.
**Definition of done:** unit tests cover every example explicitly listed in the spec plus at least 3 edge cases (e.g. "Senior Backend Developer", "ML Ops Engineer" if ambiguous — document the chosen resolution in a code comment).

---

### AT-08 — Job Persistence Service (Insert/Update)
**Depends on:** AT-02, AT-04
**Files:** `backend/src/services/job.service.ts`
**Requirements:**
- Function accepting an array of validated+classified `NormalizedJob`s plus `sourceId`.
- For each: look up by `(source_id, external_id)`; if absent → insert with `fetched_at/created_at/updated_at/last_seen_at = now`; if present → update mutable fields plus `last_seen_at/fetched_at/updated_at = now`.
- Never delete rows. Never touch jobs not present in the current batch.
- Return counts: `{ inserted, updated }`.
**Definition of done:** integration test against a local/test Supabase (or mocked client) — running twice with overlapping data produces expected insert/update counts and zero duplicate `(source_id, external_id)` pairs.

---

### AT-09 — Ingestion Orchestration Service
**Depends on:** AT-05, AT-06, AT-07, AT-08
**Files:** `backend/src/services/ingestion.service.ts`
**Requirements:**
- Implements the 18-step flow from PRD.md Section 3/8: create `ingestion_runs` row → fetch → validate structure → per-job validate/filter/classify/normalize → dedupe/persist via AT-08 → update counters → update source health (calls AT-11) → finalize run status (`SUCCESS` if failed_count=0, `PARTIAL` if some failed, `FAILED` if the fetch itself never succeeded).
- Every rejected job writes an `ingestion_errors` row with a specific `error_type`/`message`; the loop continues to the next job.
- Exposes a single `runIngestion()` entry point used by both the scheduler (AT-14) and the manual endpoint (AT-15).
**Definition of done:** running against a fixture with 1 valid, 1 missing-required-field, and 1 non-technical job produces correct `fetched/inserted/updated/failed` counts, one `ingestion_errors` row, and does not crash.

---

### AT-10 — Retry & Exponential Backoff
**Depends on:** AT-01
**Files:** `backend/src/utils/retry.ts`
**Requirements:**
- Generic `withRetry(fn, { maxRetries, baseDelayMs })` wrapper.
- Retries only on: 500/502/503/504/429/timeout/connection-refused. Any other error/status rethrows immediately without retry.
- Exponential backoff: delay grows each attempt (e.g. `baseDelay * 2^attempt`), capped at a sane max.
- On 429, if a `Retry-After` header/value is available, prefer it over the computed backoff delay.
- `maxRetries`/`baseDelayMs` sourced from `MAX_RETRIES`/`BASE_RETRY_DELAY_MS` env vars.
**Definition of done:** unit tests with a mocked failing function assert (a) retry count stops at `maxRetries`, (b) delays increase between attempts, (c) a non-retryable error (e.g. 400) is not retried, (d) `Retry-After` is honored when present.

---

### AT-11 — Source Health Service
**Depends on:** AT-02
**Files:** `backend/src/services/source-health.service.ts`
**Requirements:**
- `recordSuccess(sourceId)`: sets `status='HEALTHY', consecutive_failures=0, last_success_at=now`.
- `recordFailure(sourceId)`: increments `consecutive_failures`, sets `last_failure_at=now`, and sets `status='DEGRADED'` once a configured failure threshold is crossed (a small constant, e.g. 3, defined in this file with a comment explaining the choice).
**Definition of done:** unit tests: N failures below threshold keep status `HEALTHY`; crossing the threshold flips to `DEGRADED`; a subsequent success resets both the counter and status.

---

### AT-12 — Arbeitnow Adapter & Fallback Wiring
**Depends on:** AT-05, AT-09, AT-11
**Files:** `backend/src/sources/arbeitnow.ts`, edits to `backend/src/services/ingestion.service.ts`
**Requirements:**
- `arbeitnow.ts` mirrors `remoteok.ts`'s contract (returns `NormalizedJob[]`), isolating Arbeitnow-specific field names.
- Ingestion service: if Remote OK's retries (AT-10) are exhausted and it becomes `DEGRADED`, attempt Arbeitnow within the same run before finalizing; record which source actually served the data on the `ingestion_runs` row (e.g. via `source_id` referencing whichever source succeeded, or a note in `error_message` if you keep one row per attempted source — follow whatever the AT-09 schema decision was and stay consistent).
- Also implement the `MOCK_PRIMARY_FAILURE=true` dev-only simulation inside `remoteok.ts` (guarded by `process.env.NODE_ENV !== 'production'`), per PRD.md Section 8's controlled failure demo.
**Definition of done:** with `MOCK_PRIMARY_FAILURE=true` locally, a full ingestion run ends with jobs sourced from Arbeitnow, Remote OK marked `DEGRADED`, and no crash; with the flag off/unset, behavior is unchanged from AT-09.

---

### AT-13 — Empty-Response / No-Deletion Guarantee
**Depends on:** AT-09
**Files:** `backend/src/services/ingestion.service.ts` (extend), test file
**Requirements:** Confirm and test explicitly that a `[]` response results in `fetched_count = 0`, a normally-completed run, and zero writes/deletes to `jobs`.
**Definition of done:** test seeds the DB (or mock) with existing jobs, runs ingestion against a mocked empty array, asserts the job table/mock is byte-for-byte unchanged afterward.

---

### AT-14 — Scheduler
**Depends on:** AT-09
**Files:** `backend/src/scheduler/ingestion.scheduler.ts`, wiring in `backend/src/server.ts`
**Requirements:** `node-cron` job registered on `INGESTION_CRON` that calls `ingestionService.runIngestion()`. This file contains zero business logic — only scheduling and a log line per trigger.
**Definition of done:** with a short local cron expression, logs show the ingestion function firing on schedule without duplicate overlapping runs (guard against overlap if a run is still in progress — log and skip rather than queue).

---

### AT-15 — REST API Routes
**Depends on:** AT-08, AT-09
**Files:** `backend/src/routes/{jobs.ts,sources.ts,ingestion.ts,health.ts}`, mounted in `server.ts`
**Requirements:**
- `GET /api/jobs`: query params `page` (default 1), `limit` (default 20, cap it e.g. at 100), `categories`, `roles` (comma-separated). Category group OR'd, role group OR'd, groups AND'd. Sort `published_at DESC, created_at DESC`. Response shape exactly matches PRD.md Section 9 example (camelCase, no internal DB fields, includes `pagination`).
- `GET /api/jobs/:id`: 404 with a clear JSON error if not found.
- `GET /api/sources`: returns source health rows.
- `GET /api/ingestion-runs`: returns recent runs, most recent first, reasonably capped (e.g. last 20).
- `POST /api/ingestion/run`: calls `ingestionService.runIngestion()`; if called again within `MANUAL_INGESTION_COOLDOWN_MS` of the previous manual trigger, return a `429`-style JSON response explaining the cooldown instead of running again.
- No `search` parameter anywhere.
**Definition of done:** manual/automated request tests cover: default pagination, category-only filter, role-only filter, combined filter, out-of-range page, single job lookup + 404 case, and the cooldown rejection path.

---

### AT-16 — Frontend Skeleton & API Client
**Depends on:** AT-01, AT-15 (for shape agreement; can stub against PRD.md response shape if backend isn't deployed yet)
**Files:** `frontend/lib/api.ts`, `frontend/app/page.tsx`, `frontend/components/JobCard.tsx`, `frontend/components/JobList.tsx`
**Requirements:**
- `lib/api.ts` centralizes all `fetch` calls to `NEXT_PUBLIC_API_URL`; no other file constructs API URLs directly.
- Home page fetches page 1 (no filters) on load and renders via `JobList`/`JobCard` per PRD.md Section 10's card fields.
**Definition of done:** page renders real (or mocked) job data with no console errors; Tailwind styling applied; no search input present anywhere in the DOM.

---

### AT-17 — Category & Role Filters
**Depends on:** AT-16
**Files:** `frontend/components/CategoryFilters.tsx`, `frontend/components/RoleFilters.tsx`, edits to `frontend/app/page.tsx`
**Requirements:** Multi-select toggle buttons for the fixed category/role lists in PRD.md Section 7, plus an `All` control that clears both selections. On any change, refetch page 1 with the new `categories`/`roles` query params built exactly as in PRD.md Section 9's example (comma-separated, URL-encoded).
**Definition of done:** selecting combinations produces the exact expected query string (verifiable via network tab / test), and results visibly change accordingly.

---

### AT-18 — Load More Pagination
**Depends on:** AT-17
**Files:** edits to `frontend/app/page.tsx`
**Requirements:** `Load More` button fetches `page = currentPage + 1` with current filters and appends (not replaces) results; disabled/hidden once `page >= totalPages`.
**Definition of done:** paging through a filtered and unfiltered set never duplicates or skips a job; button disappears at the last page.

---

### AT-19 — Job Detail Page
**Depends on:** AT-16
**Files:** `frontend/app/jobs/[id]/page.tsx`
**Requirements:** Fetch `GET /api/jobs/:id`; render every field from PRD.md Section 10; show literal "Salary not provided" when salary fields are null; `View Original Job` links to `originalUrl` with `target="_blank" rel="noopener noreferrer"`.
**Definition of done:** works for a job with full data and a job with missing optional fields, showing honest fallbacks in both cases; handles a non-existent id gracefully (not a crash/blank page).

---

### AT-20 — Ingestion & Source Status Components
**Depends on:** AT-16, AT-15
**Files:** `frontend/components/IngestionStatus.tsx`, `frontend/components/SourceStatus.tsx`
**Requirements:**
- `IngestionStatus`: `Run Ingestion` button → calls `POST /api/ingestion/run`; shows running/success (with counts)/cooldown-blocked/failure states exactly matching the copy patterns in PRD.md Section 47.
- `SourceStatus`: renders real `GET /api/sources` data (name, status dot, consecutive failures if degraded) — never hardcoded.
- Also render recent `GET /api/ingestion-runs` as an ingestion history list (PRD.md Section 58).
**Definition of done:** triggering ingestion from the UI reflects real counts returned by the API; a degraded source (via local `MOCK_PRIMARY_FAILURE` testing) shows as Degraded in the UI, not Healthy.

---

### AT-21 — Loading / Error / Empty States
**Depends on:** AT-16–AT-20
**Files:** edits across `frontend/app/page.tsx` and relevant components
**Requirements:** Implement the three copy states from PRD.md Section 46 (`Loading latest jobs...`, `Unable to load jobs. Please try again.`, `No jobs match the selected filters.`). Never render a blank screen during any of these states.
**Definition of done:** manually simulating a backend error (e.g., wrong `NEXT_PUBLIC_API_URL`) and a zero-match filter combination both produce the correct, visible message.

---

### AT-22 — Automated Test Suite Consolidation
**Depends on:** AT-06, AT-07, AT-08, AT-09, AT-10, AT-11, AT-13
**Files:** `backend/src/**/*.test.ts` (or `__tests__/`), `backend/package.json` (test script)
**Requirements:** Ensure the test cases described in PRD.md Section 13 all exist and pass under one test runner (Vitest or Jest — pick one and keep config minimal). No unrelated testing infrastructure.
**Definition of done:** `npm test` in `backend/` runs and passes all listed scenarios locally.

---

### AT-23 — README.md and DECISIONS.md Drafting
**Depends on:** all backend/frontend tasks above (content must reflect actual implementation)
**Files:** `README.md`, `DECISIONS.md`
**Requirements:** Populate per PRD.md Section 15, describing the system as actually built (not aspirationally). The agent must not claim testing/verification steps that were not actually performed in this codebase.
**Definition of done:** every claim in both files is checkable against real code/files in the repo; `DECISIONS.md` stays within one page.

---

## Explicitly NOT agent tasks (see human_tasks.md)
Creating real Supabase/Render/Vercel accounts or projects, setting real environment
variables/secrets, running schema SQL against production, any deployment action,
final security review, and sign-off on the Definition of Done.
