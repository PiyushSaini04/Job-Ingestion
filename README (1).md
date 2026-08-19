# Job Ingestion Platform

*Acdyon Technologies Engineering Challenge — Part 1: Getting Data Out of a Platform
That Doesn't Want You To*

## Overview

This project ingests technical job listings from a **permitted public job API**
(Remote OK, with Arbeitnow as a fallback), filters them down to technical/SDE-relevant
roles, classifies and normalizes them, deduplicates against what's already stored, and
persists them to a Postgres database (Supabase). A small Next.js frontend then reads
*only from our own database* — never from the external job APIs directly — to show
users a newest-first, filterable job feed.

**Why it exists:** the assessment asks for ingestion engineering that survives a
source rate-limiting or blocking mid-run — not a scraper aimed at a platform that
prohibits automation. This project demonstrates that resilience (retry, backoff,
health tracking, fallback, no data loss) against a real, permitted public API, per the
assessment's own scope guardrail. The full reasoning on detection surfaces, ingestion
strategy, resilience, and where this design intentionally stops is in
**[`DESIGN.md`](./DESIGN.md)** — read that alongside this README for the complete
picture; this file covers what the system *is*, `DESIGN.md` covers *why it's built
this way*.

**How ingestion works, in one line:** a scheduled job (node-cron, hourly by default)
pulls from Remote OK, validates/filters/classifies/normalizes each listing, and
upserts it by `(source_id, external_id)` — falling back to Arbeitnow if Remote OK is
degraded, and never deleting existing rows regardless of what the source returns.

---

## Architecture

```
                         PUBLIC JOB SOURCE
                    (Remote OK, primary)
                              │
                              ▼
                    ┌───────────────────┐
                    │   Node.js +       │
                    │    Express        │
                    │ Ingestion Service │
                    └─────────┬─────────┘
                              │
                              ▼
                     Basic Validation
                              │
                              ▼
                       Job Filtering
                              │
                              ▼
                    Category + Role
                     Classification
                              │
                              ▼
                         Normalize
                              │
                              ▼
                        Deduplicate
                              │
                              ▼
                    ┌───────────────────┐
                    │     Supabase      │
                    │    PostgreSQL     │
                    │                   │
                    │ jobs              │
                    │ sources           │
                    │ ingestion_runs    │
                    │ ingestion_errors  │
                    └─────────┬─────────┘
                              │
                              ▼
                       Express REST API
                              │
                              ▼
                         Next.js UI
                              │
                              ▼
                            USER
```

Failure path (see `DESIGN.md` §3 for full detail):

```
Remote OK → temporary failure → retry → exponential backoff
   → repeated failure → mark source DEGRADED → use Arbeitnow → continue ingestion
```

Two flows are architecturally separate and never cross:
- **Ingestion flow** (backend only): `Public Job API → Ingestion Service → Supabase`
- **User-facing flow** (frontend never touches the external APIs):
  `User → Next.js → Express REST API → Supabase → JSON → Next.js → User`

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, TypeScript, Tailwind CSS — deployed to Vercel |
| Backend | Node.js, TypeScript, Express.js — deployed to Render |
| Database | Supabase PostgreSQL, accessed via the Supabase client (no ORM) |
| Scheduler | node-cron |
| Validation | Manual TypeScript validation functions (no Zod) |
| Monitoring | Application logs only |
| Testing | Vitest/Jest (minimal config) |

No Redis, queue system, Prisma, Prometheus/Grafana, or container orchestration is used
— see `DECISIONS.md` for why the simpler stack was chosen deliberately.

---

## Data Flow

```
External API (Remote OK / Arbeitnow)
   → parse → validate required fields → filter to technical roles only
   → classify (category + role) → normalize into NormalizedJob
   → deduplicate by (source_id, external_id) → insert or update
   → Supabase PostgreSQL
   → Express REST API (GET /api/jobs, filtered/paginated/sorted)
   → Next.js frontend
   → User
```

---

## Filtering & Classification

- **Categories:** Engineering, DevOps, Cloud, Data, AI / ML, Security, QA / Testing
- **Roles:** Backend Engineer, Frontend Engineer, Full Stack Engineer, Software
  Engineer, DevOps Engineer, Cloud Engineer, Data Engineer, AI Engineer, ML Engineer,
  Security Engineer, QA Engineer
- Filtering (technical-relevance) and classification (category + role) are both
  **deterministic, rule-based** (title/tag keyword matching) — no AI model is used at
  ingestion time. Seniority prefixes (Senior/Junior/etc.) collapse into the base role;
  they don't create separate roles.
- Multi-select filters on the frontend combine as `(category IN selected) AND (role IN
  selected)`, computed server-side, never by downloading the full dataset to the
  browser. There is no search box/parameter anywhere in this project by design.

---

## Deduplication

Every job is uniquely identified by **`(source_id, external_id)`**, enforced with a
database unique constraint. On each ingestion run:
- Unknown `(source_id, external_id)` → **insert**.
- Known `(source_id, external_id)` → **update** (fields + `last_seen_at`, `fetched_at`,
  `updated_at`).
- A job absent from the latest response is **left untouched** — it is never deleted.
  `last_seen_at` only advances for jobs actually returned in a given run.

---

## Failure Handling

Full design rationale in `DESIGN.md`. Summary:
- Retry only on transient failures (500/502/503/504/429/timeout), exponential backoff,
  `Retry-After` respected on 429.
- Per-source health tracking (`HEALTHY` / `DEGRADED` / `DISABLED`) via
  `consecutive_failures`.
- Automatic fallback from Remote OK to Arbeitnow once the primary is degraded.
- Every ingestion run and every rejected job is recorded (`ingestion_runs`,
  `ingestion_errors`) — nothing fails silently.
- An empty (`[]`) source response never deletes existing data.
- A `MOCK_PRIMARY_FAILURE=true` env flag (local/dev only) safely demonstrates the
  retry → backoff → fallback path without needing to actually abuse a real API.

---

## Database Schema

Four tables (full column list in `supabase/schema.sql`):

- **`sources`** — `id, name, base_url, type, status, last_success_at, last_failure_at, consecutive_failures, created_at, updated_at`
- **`jobs`** — `id, source_id, external_id, title, company, category, role, location, description, job_type, remote, salary_min, salary_max, currency, original_url, published_at, last_seen_at, fetched_at, created_at, updated_at`. Unique constraint on `(source_id, external_id)`; indexes on `published_at`, `category`, `role`, `source_id`.
- **`ingestion_runs`** — `id, source_id, status, started_at, completed_at, fetched_count, inserted_count, updated_count, failed_count, error_message`
- **`ingestion_errors`** — `id, run_id, source_id, error_type, status_code, message, created_at`

---

## API

| Method & Path | Description |
|---|---|
| `GET /health` | `{ "status": "healthy" }` |
| `GET /api/jobs` | Paginated feed. Query params: `page` (default 1), `limit` (default 20), `categories` (comma-separated, OR'd), `roles` (comma-separated, OR'd); category group AND role group are AND'd together. Always sorted `published_at DESC, created_at DESC`. No search parameter. |
| `GET /api/jobs/:id` | Single job detail |
| `GET /api/sources` | Source health status |
| `GET /api/ingestion-runs` | Recent ingestion run history |
| `POST /api/ingestion/run` | Manually trigger ingestion (cooldown-guarded via `MANUAL_INGESTION_COOLDOWN_MS`) |

Example:
```
GET /api/jobs?categories=Engineering,DevOps&roles=Backend%20Engineer,DevOps%20Engineer&page=1&limit=20
```

---

## Local Setup

**Prerequisites:** Node.js, a Supabase project, `npm`.

```bash
# 1. Clone and install
git clone <repo-url>
cd job-ingestion-platform

cd backend && npm install
cd ../frontend && npm install

# 2. Configure environment
cp .env.example backend/.env      # fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, etc.
cp .env.example frontend/.env.local  # set NEXT_PUBLIC_API_URL=http://localhost:<PORT>

# 3. Apply the database schema
# Run supabase/schema.sql against your Supabase project (SQL editor or CLI)

# 4. Run backend
cd backend && npm run dev

# 5. Run frontend (separate terminal)
cd frontend && npm run dev
```

**Environment variables:**

Backend: `PORT, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, REMOTE_OK_API_URL, ARBEITNOW_API_URL, INGESTION_CRON, MAX_RETRIES, BASE_RETRY_DELAY_MS, MANUAL_INGESTION_COOLDOWN_MS, MOCK_PRIMARY_FAILURE (dev only, leave unset in production)`

Frontend: `NEXT_PUBLIC_API_URL`

**Manually trigger ingestion locally:**
```bash
curl -X POST http://localhost:<PORT>/api/ingestion/run
```

**Run tests:**
```bash
cd backend && npm test
```

---

## Deployment

```
Frontend  → Vercel     (NEXT_PUBLIC_API_URL points at the Render backend URL)
Backend   → Render     (all backend env vars above, MOCK_PRIMARY_FAILURE unset)
Database  → Supabase   (production project, schema applied via supabase/schema.sql)
```

`SUPABASE_SERVICE_ROLE_KEY` exists only in the backend's environment — it is never
referenced by the frontend and never committed to the repository. CORS on the backend
is restricted to the deployed frontend origin.

---

## Related Documents

- **[`DESIGN.md`](./DESIGN.md)** — required design document: detection surface,
  ingestion strategy, resilience, and where this implementation intentionally stops
  with respect to ToS.
- **[`DECISIONS.md`](./DECISIONS.md)** — one-page summary: why this ingestion strategy
  over the rejected alternative, the trade-off made under the time limit, and where AI
  tools were used and what was personally verified.
