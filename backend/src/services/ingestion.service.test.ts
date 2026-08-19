import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RetryableHttpError } from '../utils/retry';
import type { ClassifiedJob, IngestionRunRecord, SourceRecord } from '../types/job';

const state = {
  sources: new Map<string, SourceRecord>(),
  jobs: [] as Array<any>,
  runs: [] as IngestionRunRecord[],
  errors: [] as Array<any>,
  fallbackJobs: [] as any[]
};

let remoteJobs: any[] = [];
let remoteError: Error | null = null;
let fallbackError: Error | null = null;

function seedSources() {
  state.sources = new Map([
    [
      'remote-ok-id',
      {
        id: 'remote-ok-id',
        name: 'Remote OK',
        baseUrl: 'https://remoteok.com/api',
        type: 'public-job-api',
        status: 'HEALTHY',
        lastSuccessAt: null,
        lastFailureAt: null,
        consecutiveFailures: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ],
    [
      'arbeitnow-id',
      {
        id: 'arbeitnow-id',
        name: 'Arbeitnow',
        baseUrl: 'https://www.arbeitnow.com/api/job-board-api',
        type: 'public-job-api',
        status: 'HEALTHY',
        lastSuccessAt: null,
        lastFailureAt: null,
        consecutiveFailures: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  ]);
}

vi.mock('../db/repos', () => ({
  getSourceByName: vi.fn(async (name: string) => [...state.sources.values()].find((source) => source.name === name) ?? null),
  getSourceById: vi.fn(async (id: string) => state.sources.get(id) ?? null),
  createIngestionRun: vi.fn(async (sourceId: string) => {
    const run: IngestionRunRecord = {
      id: `run-${state.runs.length + 1}`,
      sourceId,
      status: 'RUNNING',
      startedAt: new Date().toISOString(),
      completedAt: null,
      fetchedCount: 0,
      insertedCount: 0,
      updatedCount: 0,
      failedCount: 0,
      errorMessage: null
    };
    state.runs.push(run);
    return run;
  }),
  updateIngestionRun: vi.fn(async (runId: string, patch: any) => {
    const run = state.runs.find((item) => item.id === runId);
    if (run) {
      Object.assign(run, patch);
    }
  }),
  getLatestIngestionRun: vi.fn(async () => (state.runs.length ? state.runs[state.runs.length - 1] : null)),
  insertIngestionError: vi.fn(async (row: any) => {
    state.errors.push(row);
  }),
  persistJobsForSource: vi.fn(async (sourceId: string, jobs: ClassifiedJob[], nowIso: string) => {
    let inserted = 0;
    let updated = 0;

    for (const job of jobs) {
      const existing = state.jobs.find((row) => row.source_id === sourceId && row.external_id === job.externalId);
      if (existing) {
        updated += 1;
        Object.assign(existing, {
          title: job.title,
          company: job.company,
          category: job.category,
          role: job.role,
          location: job.location,
          description: job.description,
          job_type: job.jobType,
          remote: job.remote,
          salary_min: job.salaryMin,
          salary_max: job.salaryMax,
          currency: job.currency,
          original_url: job.originalUrl,
          published_at: job.publishedAt,
          last_seen_at: nowIso,
          fetched_at: nowIso,
          updated_at: nowIso
        });
      } else {
        inserted += 1;
        state.jobs.push({
          source_id: sourceId,
          external_id: job.externalId,
          title: job.title,
          company: job.company,
          category: job.category,
          role: job.role,
          location: job.location,
          description: job.description,
          job_type: job.jobType,
          remote: job.remote,
          salary_min: job.salaryMin,
          salary_max: job.salaryMax,
          currency: job.currency,
          original_url: job.originalUrl,
          published_at: job.publishedAt,
          last_seen_at: nowIso,
          fetched_at: nowIso,
          created_at: nowIso,
          updated_at: nowIso
        });
      }
    }

    return { inserted, updated };
  }),
  updateSourceHealth: vi.fn(async (sourceId: string, patch: any) => {
    const source = state.sources.get(sourceId);
    if (source) {
      Object.assign(source, patch);
    }
  })
}));

vi.mock('../sources/remoteok', () => ({
  fetchRemoteOkJobs: vi.fn(async () => {
    if (remoteError) throw remoteError;
    return remoteJobs;
  })
}));

vi.mock('../sources/arbeitnow', () => ({
  fetchArbeitnowJobs: vi.fn(async () => {
    if (fallbackError) throw fallbackError;
    return state.fallbackJobs;
  })
}));

async function loadService() {
  return import('./ingestion.service');
}

function techJob(overrides: Partial<any> = {}): any {
  return {
    externalId: 'job-1',
    title: 'Backend Engineer',
    company: 'Acme',
    location: 'Remote',
    description: 'Build things',
    jobType: 'Full-time',
    remote: true,
    salaryMin: null,
    salaryMax: null,
    currency: null,
    originalUrl: 'https://example.com/job-1',
    publishedAt: new Date().toISOString(),
    tags: ['javascript'],
    ...overrides
  };
}

beforeEach(() => {
  vi.resetModules();
  seedSources();
  state.jobs = [];
  state.runs = [];
  state.errors = [];
  state.fallbackJobs = [];
  remoteJobs = [];
  remoteError = null;
  fallbackError = null;
});

describe('ingestion service', () => {
  it('ingests, validates, filters, and tracks run state', async () => {
    remoteJobs = [
      techJob(),
      techJob({ externalId: '', title: 'Broken job' }),
      techJob({ externalId: 'job-2', title: 'Marketing Manager' })
    ];

    const { runIngestion } = await loadService();
    const outcome = await runIngestion();

    expect(outcome.fallbackUsed).toBe(false);
    expect(outcome.run.status).toBe('PARTIAL');
    expect(outcome.run.fetchedCount).toBe(3);
    expect(outcome.run.insertedCount).toBe(1);
    expect(outcome.run.updatedCount).toBe(0);
    expect(outcome.run.failedCount).toBe(1);
    expect(state.jobs).toHaveLength(1);
    expect(state.errors).toHaveLength(1);
    expect(state.sources.get('remote-ok-id')?.status).toBe('HEALTHY');
  });

  it('falls back to Arbeitnow when the primary source fails', async () => {
    remoteError = new RetryableHttpError('Remote down', 429, 0);
    state.fallbackJobs = [techJob({ externalId: 'arbeit-1', title: 'DevOps Engineer' })];

    const { runIngestion } = await loadService();
    const outcome = await runIngestion();

    expect(outcome.fallbackUsed).toBe(true);
    expect(outcome.source?.name).toBe('Arbeitnow');
    expect(outcome.run.status).toBe('PARTIAL');
    expect(outcome.run.sourceId).toBe('arbeitnow-id');
    expect(state.sources.get('remote-ok-id')?.consecutiveFailures).toBeGreaterThanOrEqual(1);
    expect(state.sources.get('arbeitnow-id')?.status).toBe('HEALTHY');
    expect(state.jobs).toHaveLength(1);
  });

  it('keeps existing jobs when the source returns an empty array', async () => {
    state.jobs.push({
      source_id: 'remote-ok-id',
      external_id: 'existing',
      title: 'Existing',
      company: 'Acme',
      category: 'Engineering',
      role: 'Backend Engineer',
      location: null,
      description: null,
      job_type: null,
      remote: true,
      salary_min: null,
      salary_max: null,
      currency: null,
      original_url: 'https://example.com/existing',
      published_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      fetched_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    remoteJobs = [];
    const { runIngestion } = await loadService();
    const outcome = await runIngestion();

    expect(outcome.run.status).toBe('SUCCESS');
    expect(outcome.run.fetchedCount).toBe(0);
    expect(state.jobs).toHaveLength(1);
  });

  it('enforces manual cooldown', async () => {
    remoteJobs = [techJob()];
    const { triggerManualIngestion } = await loadService();

    const first = await triggerManualIngestion();
    const second = await triggerManualIngestion();

    expect(first.accepted).toBe(true);
    expect(second.accepted).toBe(false);
    expect(second.retryAfterMs).toBeGreaterThan(0);
  });

  it('allows manual ingestion once the persisted cooldown window has passed', async () => {
    state.runs.push({
      id: 'run-stale',
      sourceId: 'remote-ok-id',
      status: 'SUCCESS',
      startedAt: new Date(Date.now() - 31 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      fetchedCount: 1,
      insertedCount: 1,
      updatedCount: 0,
      failedCount: 0,
      errorMessage: null
    });
    remoteJobs = [techJob({ externalId: 'job-stale' })];

    const { triggerManualIngestion } = await loadService();
    const result = await triggerManualIngestion();

    expect(result.accepted).toBe(true);
    expect(result.outcome?.run.status).toBe('SUCCESS');
  });
});
