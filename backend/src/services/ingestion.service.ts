import { getEnv } from '../config/env';
import { createIngestionRun, getLatestIngestionRun, getSourceByName, insertIngestionError, updateIngestionRun } from '../db/repos';
import { classifyJob } from '../utils/classifier';
import { validateNormalizedJob } from '../utils/validate-job';
import { withRetry, RetryableHttpError } from '../utils/retry';
import { fetchRemoteOkJobs } from '../sources/remoteok';
import { fetchArbeitnowJobs } from '../sources/arbeitnow';
import { persistTechnicalJobs } from './job.service';
import { recordSourceFailure, recordSourceSuccess } from './source-health.service';
import { normalizeDescription } from '../utils/normalize-description';
import type { ClassifiedJob, IngestionRunRecord, SourceRecord, SourceName } from '../types/job';

export interface IngestionOutcome {
  run: IngestionRunRecord;
  source: SourceRecord | null;
  fallbackUsed: boolean;
  message: string | null;
  skipped: boolean;
}

const remoteOkSourceName: SourceName = 'Remote OK';
const arbeitnowSourceName: SourceName = 'Arbeitnow';

let currentRun: Promise<IngestionOutcome> | null = null;

function nowIso(): string {
  return new Date().toISOString();
}

async function processFetchedJobs(runId: string, source: SourceRecord, rawJobs: Awaited<ReturnType<typeof fetchRemoteOkJobs>>): Promise<{ fetched: number; inserted: number; updated: number; failed: number; message: string | null }> {
  let failed = 0;
  const technicalJobs: ClassifiedJob[] = [];

  for (const rawJob of rawJobs) {
    const normalizedJob = {
      ...rawJob,
      description: normalizeDescription(rawJob.description)
    };
    const validation = validateNormalizedJob(rawJob);
    if (!validation.valid) {
      failed += 1;
      await insertIngestionError({
        runId,
        sourceId: source.id,
        errorType: 'validation',
        statusCode: null,
        message: validation.reason ?? 'Invalid job'
      });
      continue;
    }

    const classified = classifyJob(rawJob);
    if (!classified) {
      continue;
    }

    technicalJobs.push(classified);
  }

  const persisted = await persistTechnicalJobs(source.id, technicalJobs);
  return {
    fetched: rawJobs.length,
    inserted: persisted.inserted,
    updated: persisted.updated,
    failed,
    message: failed > 0 ? 'Some jobs were rejected during validation' : null
  };
}

async function fetchWithRetry<T>(fetcher: () => Promise<T>): Promise<T> {
  const env = getEnv();
  return withRetry(fetcher, {
    maxRetries: env.maxRetries,
    baseDelayMs: env.baseRetryDelayMs
  });
}

async function fetchPrimaryJobs(): Promise<Awaited<ReturnType<typeof fetchRemoteOkJobs>>> {
  return fetchWithRetry(() => fetchRemoteOkJobs());
}

async function fetchFallbackJobs(): Promise<Awaited<ReturnType<typeof fetchArbeitnowJobs>>> {
  return fetchWithRetry(() => fetchArbeitnowJobs());
}

async function runSingleSource(
  runId: string,
  sourceName: SourceName,
  fetcher: () => Promise<Awaited<ReturnType<typeof fetchRemoteOkJobs>>>
): Promise<{ source: SourceRecord; result: Awaited<ReturnType<typeof processFetchedJobs>> }> {
  const source = await getSourceByName(sourceName);
  if (!source) {
    throw new Error(`Source not found: ${sourceName}`);
  }

  try {
    const jobs = await fetcher();
    const result = await processFetchedJobs(runId, source, jobs);
    await recordSourceSuccess(source.id);
    return { source, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown ingestion failure';
    const statusCode = error instanceof RetryableHttpError ? error.statusCode : null;
    await insertIngestionError({
      runId,
      sourceId: source.id,
      errorType: 'fetch',
      statusCode,
      message
    });
    await recordSourceFailure(source.id);
    throw error;
  }
}

async function runIngestionInternal(): Promise<IngestionOutcome> {
  const remoteOkSource = await getSourceByName(remoteOkSourceName);
  const arbeitnowSource = await getSourceByName(arbeitnowSourceName);

  if (!remoteOkSource) {
    throw new Error('Remote OK source is missing from the database');
  }

  if (!arbeitnowSource) {
    throw new Error('Arbeitnow source is missing from the database');
  }

  const run = await createIngestionRun(remoteOkSource.id);

  let remoteOkResult: Awaited<ReturnType<typeof processFetchedJobs>> | null = null;
  let arbeitnowResult: Awaited<ReturnType<typeof processFetchedJobs>> | null = null;

  let remoteOkError: string | null = null;
  let arbeitnowError: string | null = null;

  // --------------------------------------------------
  // 1. Fetch Remote OK
  // --------------------------------------------------
  try {
    const remoteOk = await runSingleSource(
      run.id,
      remoteOkSourceName,
      fetchPrimaryJobs
    );

    remoteOkResult = remoteOk.result;
  } catch (error) {
    remoteOkError =
      error instanceof Error ? error.message : 'Remote OK failed';
  }

  // --------------------------------------------------
  // 2. Fetch Arbeitnow
  // ALWAYS runs, even if Remote OK succeeds
  // --------------------------------------------------
  try {
    const arbeitnow = await runSingleSource(
      run.id,
      arbeitnowSourceName,
      fetchFallbackJobs
    );

    arbeitnowResult = arbeitnow.result;
  } catch (error) {
    arbeitnowError =
      error instanceof Error ? error.message : 'Arbeitnow failed';
  }

  // --------------------------------------------------
  // 3. Calculate combined results
  // --------------------------------------------------

  const fetchedCount =
    (remoteOkResult?.fetched ?? 0) +
    (arbeitnowResult?.fetched ?? 0);

  const insertedCount =
    (remoteOkResult?.inserted ?? 0) +
    (arbeitnowResult?.inserted ?? 0);

  const updatedCount =
    (remoteOkResult?.updated ?? 0) +
    (arbeitnowResult?.updated ?? 0);

  const failedCount =
    (remoteOkResult?.failed ?? 0) +
    (arbeitnowResult?.failed ?? 0);

  const remoteOkSucceeded = remoteOkResult !== null;
  const arbeitnowSucceeded = arbeitnowResult !== null;

  // --------------------------------------------------
  // 4. Determine overall status
  // --------------------------------------------------

  let status: 'SUCCESS' | 'PARTIAL' | 'FAILED';

  if (remoteOkSucceeded && arbeitnowSucceeded) {
    status = failedCount > 0 ? 'PARTIAL' : 'SUCCESS';
  } else if (remoteOkSucceeded || arbeitnowSucceeded) {
    status = 'PARTIAL';
  } else {
    status = 'FAILED';
  }

  // --------------------------------------------------
  // 5. Build error/message information
  // --------------------------------------------------

  const errors = [
    remoteOkError ? `Remote OK: ${remoteOkError}` : null,
    arbeitnowError ? `Arbeitnow: ${arbeitnowError}` : null,
    remoteOkResult?.message,
    arbeitnowResult?.message,
  ].filter(Boolean);

  const errorMessage = errors.length > 0
    ? errors.join('; ')
    : null;

  // --------------------------------------------------
  // 6. Update ingestion run
  // --------------------------------------------------

  await updateIngestionRun(run.id, {
    status,
    completedAt: nowIso(),
    fetchedCount,
    insertedCount,
    updatedCount,
    failedCount,
    errorMessage,
  });

  // --------------------------------------------------
  // 7. Return combined outcome
  // --------------------------------------------------

  return {
    run: {
      ...run,
      status,
      completedAt: nowIso(),
      fetchedCount,
      insertedCount,
      updatedCount,
      failedCount,
      errorMessage,
    } as IngestionRunRecord,

    // Keep Remote OK as the primary/source shown for the run.
    source: remoteOkSource,

    // This is no longer really "fallback" behavior.
    fallbackUsed: false,

    message: errorMessage,

    skipped: false,
  };
}

function getCooldownRemainingMs(latestRunStartedAt: string | null | undefined, now = Date.now()): number {
  if (!latestRunStartedAt) return 0;
  const env = getEnv();
  const startedAtMs = new Date(latestRunStartedAt).getTime();
  if (Number.isNaN(startedAtMs)) return 0;
  return Math.max(0, env.manualIngestionCooldownMs - (now - startedAtMs));
}

export async function runIngestion(): Promise<IngestionOutcome> {
  if (currentRun) {
    return currentRun;
  }

  currentRun = runIngestionInternal().finally(() => {
    currentRun = null;
  });

  return currentRun;
}

export async function triggerManualIngestion(): Promise<{ accepted: boolean; retryAfterMs?: number; outcome?: IngestionOutcome }> {
  const latestRun = await getLatestIngestionRun();
  const retryAfterMs = getCooldownRemainingMs(latestRun?.startedAt ?? null);

  if (retryAfterMs > 0) {
    return {
      accepted: false,
      retryAfterMs
    };
  }

  return {
    accepted: true,
    outcome: await runIngestion()
  };
}

export function getIngestionRuntimeState(): { running: boolean; lastManualRunAt: number } {
  return {
    running: Boolean(currentRun),
    lastManualRunAt: 0
  };
}
