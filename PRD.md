# PRD — Job Ingestion Platform (Acdyon Technologies Assessment, Part 1)

## 1. Purpose

Build a small, deployed, fully explainable web application that ingests technical job
listings from a **permitted public job API**, stores them in a database, and serves
them to users through our own backend — demonstrating reliable ingestion engineering
(retry, backoff, fallback, deduplication, data preservation) rather than any attempt
to bypass access controls on a protected platform.

This directly answers Assessment Part 1: "Getting Data Out of a Platform That Doesn't
Want You To," using the assessment's own recommended low-risk approach (public
job-board API) instead of a protected platform.

## 2. Non-Goals (explicitly out of scope)

Do NOT build or introduce, under any circumstances:

- LinkedIn/Indeed/Naukri/Wellfound scraping, login automation, or any protected-platform bypass
- CAPTCHA solving, stealth browsers, proxy/IP rotation, fake accounts, anti-bot evasion
- Redis, BullMQ, Kafka, RabbitMQ, or any queue system
- Prisma (use Supabase client directly)
- Zod (use manual validation functions)
- Prometheus, Grafana, OpenTelemetry, ELK, or any external monitoring platform
- Kubernetes or container orchestration
- AI-based job classification (classification must be deterministic/rule-based)
- Authentication, user accounts, saved jobs, email notifications, chat, recommendation engine, vector DB, complex analytics
- A search box/search parameter on the frontend or backend

Simplicity, correctness, and explainability outrank feature count at every decision point.

## 3. System Overview

Two independent flows, fully decoupled:

**A. Background ingestion flow** (backend-only, never touched by the browser)
```
Public Job API (Remote OK, fallback Arbeitnow)
  → Ingestion Service → Parse → Validate → Filter (technical only)
  → Classify (category + role) → Normalize → Deduplicate
  → Insert/Update → Supabase PostgreSQL
```

**B. User-facing flow** (frontend never calls external job APIs)
```
User → Next.js Frontend → Express REST API → Supabase PostgreSQL
  → JSON response → Next.js Frontend → User
```

The frontend/backend REST layer and the ingestion layer are architecturally separate;
the REST API only ever reads/writes the application's own database.

## 4. Technology Stack (exact — no substitutions)

| Layer | Technology |
|---|---|
| Frontend | Next.js, TypeScript, Tailwind CSS |
| Frontend deploy | Vercel |
| Backend | Node.js, TypeScript, Express.js |
| Backend deploy | Render |
| Database | Supabase PostgreSQL (via Supabase client, no ORM) |
| Scheduler | node-cron |
| Validation | Manual TypeScript validation functions |
| Monitoring | Application logs only (no external platform) |
| Testing | Lightweight JS/TS test runner (e.g. Vitest or Jest — pick one, keep minimal config) |
| Containerization | Docker optional, local dev only — no orchestration |

## 5. Data Sources

- **Primary:** Remote OK public job API — isolated entirely inside `backend/src/sources/remoteok.ts`
- **Fallback:** Arbeitnow public job API — isolated entirely inside `backend/src/sources/arbeitnow.ts`, used only after the primary source degrades
- Source-specific field names/shapes must never leak outside their adapter file. Each adapter outputs a shared `NormalizedJob` shape.
- Polling cadence: configurable via `INGESTION_CRON`, defaulting to roughly once per hour. No aggressive polling, no parallel flooding, no infinite retries, no proxy/IP rotation.

## 6. Data Model

Exactly four tables in Supabase Postgres.

### `sources`
`id, name, base_url, type, status (HEALTHY|DEGRADED|DISABLED), last_success_at, last_failure_at, consecutive_failures, created_at, updated_at`

### `jobs`
`id, source_id, external_id, title, company, category, role, location, description, job_type, remote, salary_min, salary_max, currency, original_url, published_at, last_seen_at, fetched_at, created_at, updated_at`

- **Unique constraint:** `(source_id, external_id)` — the sole deduplication mechanism.
- Indexes on `published_at`, `category`, `role`, `source_id`.

### `ingestion_runs`
`id, source_id, status (RUNNING|SUCCESS|PARTIAL|FAILED), started_at, completed_at, fetched_count, inserted_count, updated_count, failed_count, error_message`

### `ingestion_errors`
`id, run_id, source_id, error_type, status_code, message, created_at`

### Fixed data rules
- **Never delete jobs.** A job missing from the latest response is left untouched; `last_seen_at` is only updated for jobs that *were* returned.
- Existing job on match → **UPDATE** (fields + `last_seen_at`, `fetched_at`, `updated_at`).
- New external_id → **INSERT**.
- Empty API response (`[]`) → record the run with `fetched_count = 0`; do not touch existing rows.

## 7. Classification & Filtering (deterministic, rule-based — no AI)

**Categories:** Engineering, DevOps, Cloud, Data, AI / ML, Security, QA / Testing

**Roles:** Backend Engineer, Frontend Engineer, Full Stack Engineer, Software Engineer,
DevOps Engineer, Cloud Engineer, Data Engineer, AI Engineer, ML Engineer, Security
Engineer, QA Engineer

- One classification utility (`backend/src/utils/classifier.ts`) owns all title/tag/keyword
  matching logic — not scattered across files.
- Filtering happens before classification: only technical/SDE-relevant jobs are kept
  (e.g., Backend/DevOps/Data/ML Engineer included; Marketing/Sales/Design/Recruiter excluded).
- Seniority (Senior/Junior/etc.) collapses into the base role — no separate roles per seniority.
- A job missing a required field (`external_id`, `title`, `company`, `original_url`) is
  rejected: not inserted, `failed_count++`, and an `ingestion_errors` row recorded.
  One bad job never aborts the whole run.

## 8. Resilience Requirements

- **Retry:** only on transient failures (500/502/503/504/429, timeouts, connection errors); small fixed max attempts; exponential backoff between attempts.
- **429 handling:** respect `Retry-After` if present, then backoff, then retry within the attempt budget.
- **Source health:** track `status`, `last_success_at`, `last_failure_at`, `consecutive_failures` per source. Success resets `consecutive_failures = 0` and `status = HEALTHY`. Repeated failure → `DEGRADED`.
- **Fallback:** Remote OK degraded → Arbeitnow attempted. If both fail: record failure, preserve existing data, return failure info — never delete anything.
- **Schema drift:** missing/unexpected fields in the source response → validation failure, error recorded, malformed job skipped, source possibly marked degraded — never insert a partial/broken record.
- **Manual ingestion cooldown:** `POST /api/ingestion/run` is guarded by a configurable cooldown (`MANUAL_INGESTION_COOLDOWN_MS`) so repeated manual clicks cannot hammer the external API.
- **Controlled failure demo (local/dev only):** `MOCK_PRIMARY_FAILURE=true` env flag makes the Remote OK adapter simulate a 429/failure to safely demonstrate retry → backoff → fallback. Must be disabled in production.

## 9. REST API

| Method & Path | Purpose |
|---|---|
| `GET /health` | `{ "status": "healthy" }` |
| `GET /api/jobs` | Paginated, filterable job feed. Params: `page` (default 1), `limit` (default 20), `categories` (comma list, OR), `roles` (comma list, OR). Categories AND roles are ANDed together. Always sorted `published_at DESC`, then `created_at DESC`. No search parameter. |
| `GET /api/jobs/:id` | Single job detail |
| `GET /api/sources` | Source health status |
| `GET /api/ingestion-runs` | Recent ingestion run history |
| `POST /api/ingestion/run` | Manually trigger ingestion (cooldown-guarded) |

Response shape for `/api/jobs` returns only camelCase, user-relevant fields (no internal DB columns) plus a `pagination` object (`page, limit, total, totalPages`).

## 10. Frontend Requirements

- Pages: job feed (`/`), job detail (`/jobs/[id]`).
- Components: `JobCard`, `CategoryFilters`, `RoleFilters`, `JobList`, `SourceStatus`, `IngestionStatus`.
- **No search box, ever.**
- Multi-select category buttons + multi-select role buttons + an `All` control that clears both.
- Filtering logic: `(category IN selected) AND (role IN selected)`, computed server-side — the frontend never downloads the full dataset to filter client-side.
- Default order: newest published jobs first.
- Pagination via `Load More` (20 jobs/page), maintaining sort order across pages.
- Job card shows: title, company, category, role, location, remote/on-site, job type, published date, source.
- Job detail shows all card fields plus salary (or "Salary not provided"), description, and a `View Original Job` link to `original_url`.
- Manual `Run Ingestion` button with visible states: running / success (with counts) / fallback-used / failure (existing jobs preserved).
- Source status panel (Healthy/Degraded + consecutive failure count) and ingestion history list, both reflecting real backend/DB state — never fabricated.
- Explicit loading state, error state, and empty-results state — never a blank screen.
- No fake data anywhere (no fake counts, testimonials, logos, salaries, descriptions). Missing data shows literally "Not provided".
- Responsive: works on mobile and desktop, no horizontal scrolling.
- State: plain React state (`selectedCategories, selectedRoles, currentPage, jobs, hasMore, loading, error`) — no external state library.

## 11. Security

- `SUPABASE_SERVICE_ROLE_KEY` exists only on the backend; never referenced under a `NEXT_PUBLIC_*` variable.
- Frontend never talks to Supabase or the external job APIs directly — only to the Express backend.
- No secrets committed to git; `.env.example` documents required variables without values.
- CORS on the backend restricted to the deployed frontend origin (plus localhost in dev).

## 12. Environment Variables

**Backend:** `PORT, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, REMOTE_OK_API_URL, ARBEITNOW_API_URL, INGESTION_CRON, MAX_RETRIES, BASE_RETRY_DELAY_MS, MANUAL_INGESTION_COOLDOWN_MS, MOCK_PRIMARY_FAILURE (dev only)`

**Frontend:** `NEXT_PUBLIC_API_URL`

## 13. Testing Scope (minimum required, no more)

Unit/integration tests for: normal ingestion end-to-end, insert-on-new-external_id,
update-on-existing-external_id, no duplicate on repeat run, rejection of a job missing
a required field, retry/backoff on 429, retry on 500/503, DEGRADED after repeated
failure, fallback to Arbeitnow when Remote OK is degraded, and no-deletion on an empty
`[]` response.

## 14. Deployment

```
Frontend  → Vercel
Backend   → Render
Database  → Supabase (managed Postgres)
```

No Redis, queue, or monitoring servers exist in the deployed architecture.

## 15. Documentation Deliverables

- `README.md`: overview, architecture diagram, stack, data flow, filtering/classification explanation, deduplication explanation, failure handling explanation, database schema, API docs, local setup, deployment instructions.
- `DECISIONS.md` (max 1 page): (1) why this ingestion strategy vs. the obvious alternative, (2) what was deliberately left out under time pressure and why, (3) truthful account of where AI assistance was used and what was personally verified/changed/tested/rejected.

## 16. Acceptance Criteria (Definition of Done)

The project is complete only when every item below is true:

- [ ] Remote OK ingestion works against the real public API
- [ ] Non-technical jobs are filtered out; category and role are assigned deterministically
- [ ] Jobs are normalized into a single shared shape before persistence
- [ ] Jobs stored in Supabase with `(source_id, external_id)` uniqueness enforced
- [ ] Existing jobs are updated, never duplicated; old jobs are never deleted; `last_seen_at` is tracked
- [ ] Ingestion runs and ingestion errors are recorded for every run
- [ ] Retry + exponential backoff work; 429 + `Retry-After` handled; persistent failure marks source DEGRADED
- [ ] Arbeitnow fallback activates when Remote OK is degraded; both-fail path preserves existing data
- [ ] Scheduled (node-cron) and manual (`POST /api/ingestion/run`, cooldown-guarded) ingestion both work
- [ ] REST API implements all six endpoints with correct filtering/sorting/pagination and no search parameter
- [ ] Frontend shows newest-first jobs, multi-select category/role filters (AND across groups, OR within group), `All` clears filters, `Load More` pagination, job detail with original link, source status, ingestion history, loading/error/empty states, no fake data, no search box, responsive with no horizontal scroll
- [ ] `SUPABASE_SERVICE_ROLE_KEY` never exposed to the frontend; no secrets committed
- [ ] Required tests (Section 13) pass
- [ ] Controlled failure demo (`MOCK_PRIMARY_FAILURE`) works locally and is off in production
- [ ] Backend deployed to Render, frontend deployed to Vercel, Supabase production database in use
- [ ] `README.md` and `DECISIONS.md` completed and accurate
