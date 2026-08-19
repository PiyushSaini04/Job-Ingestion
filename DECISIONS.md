## 1. Why this ingestion strategy over the obvious alternative I rejected?

I chose a public-API ingestion path instead of browser automation against a protected job board. That keeps the demo safe, reproducible, and honest: the important parts of the system are retry, fallback, validation, deduplication, and source health, not bypassing access controls. Remote OK is the primary source and Arbeitnow is the fallback so the same ingestion pipeline can still demonstrate real resilience.

## 2. One trade-off I made under the time limit, and what I would do with a real week

The main trade-off was keeping the source set small and the filtering deterministic instead of adding more adapters, richer taxonomy mapping, or a broader UI. With a full week, I would add a second verified public source, more ingestion coverage around edge cases, and more route-level tests for failure modes that are only lightly exercised here.

## 3. Where I used AI tools, and what I personally verified or changed afterward

I used AI help to speed up scaffolding and initial refactors, then I checked the actual code paths myself. I verified the backend routes, the retry and fallback flow, the database upsert behavior, the frontend contract, and the documentation so they match the running app rather than the original draft notes.
