## Detection Surface

The live demo does not use a browser or a protected platform login flow. It talks to public JSON APIs, so browser fingerprints, session choreography, and CAPTCHA handling are intentionally out of scope. The remaining surface is ordinary HTTP behavior: request rate, header hygiene, and retry patterns. Those are kept conservative through scheduled ingestion, cooldown-guarded manual runs, and isolated source adapters.

## Ingestion Strategy

The backend runs a scheduled ingestion job that fetches Remote OK first and falls back to Arbeitnow when the primary source fails past its retry budget. Each adapter returns the same normalized job shape, then the pipeline validates, classifies, deduplicates, and upserts into Supabase. Source-specific parsing stays inside the adapter files so the rest of the system stays stable when a source changes.

## Resilience

Retry is limited to transient failures such as 429 and 5xx responses, plus timeouts and connection errors. `Retry-After` is honored when provided, source health is updated on success and failure, and repeated primary-source failure can trigger fallback without deleting existing jobs. Empty responses are treated as no-op runs, and invalid jobs are recorded in `ingestion_errors` instead of crashing the whole ingestion.

## Where I'd Stop

I would not add bot-evasion, proxy rotation, stealth fingerprinting, or login automation against a real third-party job board. That crosses from ingestion engineering into bypassing access controls. The boundary for this submission is a low-risk public source with an architecture that would still be reusable if a permitted API or explicit authorization were available later.
