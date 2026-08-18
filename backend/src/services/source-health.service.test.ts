import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = {
  sources: new Map<string, any>()
};

vi.mock('../db/repos', () => ({
  getSourceById: vi.fn(async (id: string) => state.sources.get(id) ?? null),
  updateSourceHealth: vi.fn(async (id: string, patch: any) => {
    const current = state.sources.get(id);
    if (!current) return;
    state.sources.set(id, {
      ...current,
      ...patch
    });
  })
}));

async function loadService() {
  return import('./source-health.service');
}

beforeEach(() => {
  state.sources = new Map([
    [
      'source-1',
      {
        id: 'source-1',
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
    ]
  ]);
});

describe('source health service', () => {
  it('degrades after repeated failures and resets after success', async () => {
    const { recordSourceFailure, recordSourceSuccess } = await loadService();

    await recordSourceFailure('source-1');
    await recordSourceFailure('source-1');
    await recordSourceFailure('source-1');

    expect(state.sources.get('source-1').status).toBe('DEGRADED');
    expect(state.sources.get('source-1').consecutiveFailures).toBe(3);

    await recordSourceSuccess('source-1');

    expect(state.sources.get('source-1').status).toBe('HEALTHY');
    expect(state.sources.get('source-1').consecutiveFailures).toBe(0);
    expect(state.sources.get('source-1').lastSuccessAt).toBeTruthy();
  });
});
