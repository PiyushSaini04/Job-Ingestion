# human_tasks.md — Tasks Requiring a Human

AI agents should not perform these: they involve real credentials, money/billing,
irreversible production actions, judgment calls about the assessment itself, or
final sign-off. Each task references the related PRD.md section and BABY_STEPS.md step.

---

## HT-01 — Account & Project Setup
*(BABY_STEPS Step 0)*
- Create a Supabase project (choose region, project name).
- Create a Render account/service for the backend.
- Create a Vercel account/project for the frontend.
- Create the GitHub repository and set visibility (public/private) per assessment rules.
**Output needed by agents:** none directly — agents work against `.env.example` placeholders until you provide real values locally.

## HT-02 — Credential Collection & Storage
*(PRD.md Section 12, Section 11)*
- Retrieve `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the Supabase dashboard.
- Store them only in a local `.env` (gitignored) and later in Render's environment variable settings — never in code, commits, or `NEXT_PUBLIC_*` variables.
- Confirm the anon/public key is not needed anywhere in this project (backend uses the service role key only).

## HT-03 — Run Production Schema
*(BABY_STEPS Step 2, agent_tasks AT-02)*
- Review the agent-generated `supabase/schema.sql`.
- Execute it against the real Supabase project (SQL editor or CLI).
- Verify the four tables, the `(source_id, external_id)` unique constraint, and the four indexes exist.
- Confirm the two seed `sources` rows (Remote OK, Arbeitnow) are present.

## HT-04 — Approve External API Usage Cadence
*(PRD.md Section 5, Section 8)*
- Confirm `INGESTION_CRON` default (~hourly) is acceptable for both Remote OK's and Arbeitnow's public usage norms.
- Sanity-check `MAX_RETRIES`, `BASE_RETRY_DELAY_MS`, and `MANUAL_INGESTION_COOLDOWN_MS` values chosen by the agent are conservative, not aggressive.
- This is a judgment call about being a "good citizen" of a public API — an AI agent should not unilaterally decide acceptable request cadence for a live third-party service.

## HT-05 — Manual End-to-End Testing (local)
*(BABY_STEPS Steps 5, 9, 12, 15–21)*
- Run a real ingestion against Remote OK locally and visually confirm the jobs make sense (titles, companies, categories look right — not just that tests pass).
- Manually test `MOCK_PRIMARY_FAILURE=true` to watch the fallback happen in real logs/UI.
- Click through the actual frontend: filters, pagination, job detail, original job links, ingestion button, source status — confirm it feels right, not just that automated tests pass.
- Try edge cases a script might miss: extremely long job titles, jobs with no salary, jobs with no description, rapid double-clicking "Run Ingestion."

## HT-06 — Security Review Before Deployment
*(PRD.md Section 11)*
- Grep the repo history and current tree for any accidental secret commits.
- Confirm `SUPABASE_SERVICE_ROLE_KEY` appears nowhere in `frontend/` and nowhere prefixed `NEXT_PUBLIC_*`.
- Confirm CORS on the backend only allows the real deployed frontend origin (and localhost in dev), not `*`.
- Review `.env.example` to ensure it has variable names only, no real values.

## HT-07 — Deploy Backend to Render
*(BABY_STEPS Step 25)*
- Create the Render web service pointed at `backend/`.
- Set all backend environment variables from PRD.md Section 12 in Render's dashboard (real values); ensure `MOCK_PRIMARY_FAILURE` is unset/false.
- Set the build/start commands appropriate for the Express + TypeScript setup.
- Confirm `GET /health` responds on the live Render URL.

## HT-08 — Deploy Frontend to Vercel
*(BABY_STEPS Step 25)*
- Create the Vercel project pointed at `frontend/`.
- Set `NEXT_PUBLIC_API_URL` to the live Render backend URL.
- Deploy and confirm the live site loads real job data from the live backend/Supabase.

## HT-09 — Production Smoke Test
*(BABY_STEPS Step 25–26)*
- On the live deployed site: load jobs, apply category/role filters, paginate, open a job detail, click "View Original Job," trigger manual ingestion, and confirm source status/ingestion history reflect reality.
- Confirm scheduled ingestion actually fires on Render over time (check logs/`ingestion_runs` an hour later).

## HT-10 — Documentation Accuracy Review
*(PRD.md Section 15, agent_tasks AT-23)*
- Read `README.md` and `DECISIONS.md` end-to-end.
- Confirm every claim (architecture, tech list, testing coverage, AI-usage account) is truthful and matches what was actually built and actually tested — correct anything the agent overstated.
- Personally write or verify the `DECISIONS.md` "Where was AI used" section, since only you know what you actually reviewed/changed/rejected.

## HT-11 — Definition of Done Sign-off
*(PRD.md Section 16)*
- Walk the full checklist yourself against the live deployment and the codebase.
- Do not mark an item done because an agent claims it — verify each one directly (query the live API, click the live UI, check the live database).

## HT-12 — Assessment Readiness
- Re-read every major file so you can explain it line-by-line, per the assessment's own requirement.
- Prepare your own plain-language explanation of: detection surface, ingestion strategy, resilience, and where the implementation intentionally stops short of circumventing access controls (PRD.md context / original assessment brief Sections 64–66) — this is the discussion an AI agent cannot have on your behalf.
