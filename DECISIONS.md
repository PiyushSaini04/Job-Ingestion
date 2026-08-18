# Decisions

## 1. Why this ingestion strategy

I used permitted public job APIs instead of scraping protected platforms. That keeps the implementation aligned with the assessment's low-risk approach, avoids bypass behavior, and still demonstrates the engineering goals: retry, backoff, fallback, deduplication, and data preservation.

## 2. What was left out

I intentionally left out auth, saved jobs, search, queues, AI-based classification, notifications, analytics stacks, container orchestration, and any browser automation or anti-bot evasion. Those additions would add complexity without improving the core ingestion demonstration.

## 3. AI assistance and verification

AI assistance was used to draft and assemble the repository, including the initial code, tests, and documentation. I verified the result by running the backend test suite and a full workspace build locally, then corrected the implementation where the compiler or tests exposed mismatches. No deployment claims are being made here.
