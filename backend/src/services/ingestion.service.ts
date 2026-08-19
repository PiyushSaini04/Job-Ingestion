import { getEnv } from '../config/env';
import { createIngestionRun, getSourceByName, insertIngestionError, updateIngestionRun } from '../db/repos';
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

const primarySourceName: SourceName = 'Remote OK';
const fallbackSourceName: SourceName = 'Arbeitnow';

let manualIngestionStartedAt = 0;
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
        description: normalizeDescription(rawJob.description),
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
  const primarySource = await getSourceByName(primarySourceName);
  if (!primarySource) {
    throw new Error('Primary source is missing from the database');
  }

  const run = await createIngestionRun(primarySource.id);
  let fallbackUsed = false;
  let lastMessage: string | null = null;

  try {
    const primary = await runSingleSource(run.id, primarySourceName, fetchPrimaryJobs);
    await updateIngestionRun(run.id, {
      sourceId: primary.source.id
    });

    const status = primary.result.failed > 0 ? 'PARTIAL' : 'SUCCESS';
    await updateIngestionRun(run.id, {
      status,
      completedAt: nowIso(),
      fetchedCount: primary.result.fetched,
      insertedCount: primary.result.inserted,
      updatedCount: primary.result.updated,
      failedCount: primary.result.failed,
      errorMessage: primary.result.message
    });

    return {
      run: { ...run, sourceId: primary.source.id, status, completedAt: nowIso() } as IngestionRunRecord,
      source: primary.source,
      fallbackUsed: false,
      message: primary.result.message,
      skipped: false
    };
  } catch (primaryError) {
    const fallbackSource = await getSourceByName(fallbackSourceName);
    if (!fallbackSource) {
      const message = primaryError instanceof Error ? primaryError.message : 'Primary source failed';
      await updateIngestionRun(run.id, {
        status: 'FAILED',
        completedAt: nowIso(),
        errorMessage: message
      });
      return {
        run: { ...run, sourceId: primarySource.id, status: 'FAILED', completedAt: nowIso(), errorMessage: message } as IngestionRunRecord,
        source: primarySource,
        fallbackUsed: false,
        message,
        skipped: false
      };
    }

    fallbackUsed = true;
    lastMessage = primaryError instanceof Error ? primaryError.message : 'Primary source failed';

    try {
      const fallback = await runSingleSource(run.id, fallbackSourceName, fetchFallbackJobs);
      await updateIngestionRun(run.id, {
        sourceId: fallback.source.id
      });

      const status = fallback.result.failed > 0 ? 'PARTIAL' : 'PARTIAL';
      await updateIngestionRun(run.id, {
        status,
        completedAt: nowIso(),
        fetchedCount: fallback.result.fetched,
        insertedCount: fallback.result.inserted,
        updatedCount: fallback.result.updated,
        failedCount: fallback.result.failed,
        errorMessage: `${lastMessage}; fallback to Arbeitnow used`
      });

      return {
        run: {
          ...run,
          sourceId: fallback.source.id,
          status,
          completedAt: nowIso(),
          errorMessage: `${lastMessage}; fallback to Arbeitnow used`
        } as IngestionRunRecord,
        source: fallback.source,
        fallbackUsed: true,
        message: `${lastMessage}; fallback to Arbeitnow used`,
        skipped: false
      };
    } catch (fallbackError) {
      const message = fallbackError instanceof Error ? fallbackError.message : 'Fallback source failed';
      await updateIngestionRun(run.id, {
        status: 'FAILED',
        completedAt: nowIso(),
        errorMessage: `${lastMessage}; ${message}`
      });
      return {
        run: {
          ...run,
          sourceId: primarySource.id,
          status: 'FAILED',
          completedAt: nowIso(),
          errorMessage: `${lastMessage}; ${message}`
        } as IngestionRunRecord,
        source: primarySource,
        fallbackUsed: true,
        message: `${lastMessage}; ${message}`,
        skipped: false
      };
    }
  }
}

function isCooldownActive(now = Date.now()): boolean {
  const env = getEnv();
  return now - manualIngestionStartedAt < env.manualIngestionCooldownMs;
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
  const now = Date.now();
  const env = getEnv();
  if (isCooldownActive(now)) {
    return {
      accepted: false,
      retryAfterMs: Math.max(0, env.manualIngestionCooldownMs - (now - manualIngestionStartedAt))
    };
  }

  manualIngestionStartedAt = now;
  return {
    accepted: true,
    outcome: await runIngestion()
  };
}

export function getIngestionRuntimeState(): { running: boolean; lastManualRunAt: number } {
  return {
    running: Boolean(currentRun),
    lastManualRunAt: manualIngestionStartedAt
  };
}
