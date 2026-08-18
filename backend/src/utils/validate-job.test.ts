import { validateNormalizedJob } from './validate-job';
import type { NormalizedJob } from '../types/job';

function makeJob(overrides: Partial<NormalizedJob> = {}): NormalizedJob {
  return {
    externalId: '123',
    title: 'Backend Engineer',
    company: 'Acme',
    location: 'Remote',
    description: 'Build things',
    jobType: 'Full-time',
    remote: true,
    salaryMin: null,
    salaryMax: null,
    currency: null,
    originalUrl: 'https://example.com',
    publishedAt: new Date().toISOString(),
    tags: [],
    ...overrides
  };
}

describe('validateNormalizedJob', () => {
  it('accepts a complete job', () => {
    expect(validateNormalizedJob(makeJob())).toEqual({ valid: true });
  });

  for (const field of ['externalId', 'title', 'company', 'originalUrl'] as const) {
    it(`rejects a missing ${field}`, () => {
      const job = makeJob({ [field]: '' } as Partial<NormalizedJob>);
      expect(validateNormalizedJob(job)).toMatchObject({ valid: false, reason: expect.stringContaining(field) });
    });
  }
});
