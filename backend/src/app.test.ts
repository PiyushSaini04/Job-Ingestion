import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = {
  jobs: [
    {
      id: 'job-1',
      sourceId: 'source-1',
      source: 'Remote OK',
      externalId: 'ext-1',
      title: 'Backend Engineer',
      company: 'Acme',
      category: 'Engineering',
      role: 'Backend Engineer',
      location: 'Remote',
      description: 'Build things',
      jobType: 'Full-time',
      remote: true,
      salaryMin: null,
      salaryMax: null,
      currency: null,
      originalUrl: 'https://example.com',
      publishedAt: '2026-08-18T00:00:00.000Z',
      lastSeenAt: '2026-08-18T00:00:00.000Z',
      fetchedAt: '2026-08-18T00:00:00.000Z',
      createdAt: '2026-08-18T00:00:00.000Z',
      updatedAt: '2026-08-18T00:00:00.000Z'
    }
  ],
  sources: [
    {
      id: 'source-1',
      name: 'Remote OK',
      baseUrl: 'https://remoteok.com/api',
      type: 'public-job-api',
      status: 'HEALTHY',
      lastSuccessAt: '2026-08-18T00:00:00.000Z',
      lastFailureAt: null,
      consecutiveFailures: 0,
      createdAt: '2026-08-18T00:00:00.000Z',
      updatedAt: '2026-08-18T00:00:00.000Z'
    }
  ],
  runs: [
    {
      id: 'run-1',
      sourceId: 'source-1',
      status: 'SUCCESS',
      startedAt: '2026-08-18T00:00:00.000Z',
      completedAt: '2026-08-18T01:00:00.000Z',
      fetchedCount: 1,
      insertedCount: 1,
      updatedCount: 0,
      failedCount: 0,
      errorMessage: null
    }
  ],
  manualAccepted: true
};

vi.mock('./db/repos', () => ({
  listJobs: vi.fn(async (params: any) => ({
    jobs: state.jobs.filter((job) => {
      const categoryOk = !params.categories?.length || params.categories.includes(job.category);
      const roleOk = !params.roles?.length || params.roles.includes(job.role);
      return categoryOk && roleOk;
    }),
    total: state.jobs.length,
    totalPages: 1,
    page: params.page,
    limit: params.limit
  })),
  getJobById: vi.fn(async (id: string) => state.jobs.find((job) => job.id === id) ?? null),
  listSources: vi.fn(async () => state.sources),
  listRecentRuns: vi.fn(async () => state.runs)
}));

vi.mock('./services/ingestion.service', () => ({
  getIngestionRuntimeState: vi.fn(() => ({ running: false, lastManualRunAt: 0 })),
  triggerManualIngestion: vi.fn(async () => {
    if (!state.manualAccepted) {
      return { accepted: false, retryAfterMs: 1200 };
    }
    state.manualAccepted = false;
    return {
      accepted: true,
      outcome: {
        run: state.runs[0],
        source: state.sources[0],
        fallbackUsed: false,
        message: null,
        skipped: false
      }
    };
  })
}));

async function loadApp() {
  const { createApp } = await import('./app');
  return createApp();
}

beforeEach(() => {
  state.manualAccepted = true;
});

describe('app routes', () => {
  it('serves health', async () => {
    const app = await loadApp();
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'healthy' });
  });

  it('parses job filters and pagination', async () => {
    const app = await loadApp();
    const response = await request(app).get('/api/jobs?page=2&limit=20&categories=Engineering,Data&roles=Backend%20Engineer');
    expect(response.status).toBe(200);
    expect(response.body.pagination).toMatchObject({ page: 2, limit: 20, total: 1 });
    expect(response.body.jobs).toHaveLength(1);
    expect(response.body.jobs[0].source).toBe('Remote OK');
  });

  it('returns job details and 404s when missing', async () => {
    const app = await loadApp();
    const hit = await request(app).get('/api/jobs/job-1');
    const miss = await request(app).get('/api/jobs/missing');

    expect(hit.status).toBe(200);
    expect(hit.body.id).toBe('job-1');
    expect(miss.status).toBe(404);
  });

  it('returns source and ingestion histories', async () => {
    const app = await loadApp();
    const sources = await request(app).get('/api/sources');
    const runs = await request(app).get('/api/ingestion-runs');

    expect(sources.status).toBe(200);
    expect(sources.body.sources).toHaveLength(1);
    expect(runs.status).toBe(200);
    expect(runs.body.runs).toHaveLength(1);
  });

  it('respects manual cooldown responses', async () => {
    const app = await loadApp();
    const first = await request(app).post('/api/ingestion/run');
    const second = await request(app).post('/api/ingestion/run');

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
    expect(second.body.retryAfterMs).toBeGreaterThan(0);
  });
});
