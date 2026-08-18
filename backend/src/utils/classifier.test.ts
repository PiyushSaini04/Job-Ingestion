import { classifyJob } from './classifier';
import type { NormalizedJob } from '../types/job';

function job(title: string, tags: string[] = []): NormalizedJob {
  return {
    externalId: title,
    title,
    company: 'Acme',
    location: null,
    description: null,
    jobType: null,
    remote: true,
    salaryMin: null,
    salaryMax: null,
    currency: null,
    originalUrl: 'https://example.com',
    publishedAt: null,
    tags
  };
}

describe('classifyJob', () => {
  it('classifies backend engineer jobs', () => {
    expect(classifyJob(job('Senior Backend Engineer'))).toMatchObject({
      category: 'Engineering',
      role: 'Backend Engineer'
    });
  });

  it('classifies devops jobs', () => {
    expect(classifyJob(job('DevOps Engineer'))).toMatchObject({
      category: 'DevOps',
      role: 'DevOps Engineer'
    });
  });

  it('classifies data jobs', () => {
    expect(classifyJob(job('Data Engineer'))).toMatchObject({
      category: 'Data',
      role: 'Data Engineer'
    });
  });

  it('classifies ml jobs', () => {
    expect(classifyJob(job('Machine Learning Engineer'))).toMatchObject({
      category: 'AI / ML',
      role: 'ML Engineer'
    });
  });

  it('classifies qa jobs', () => {
    expect(classifyJob(job('QA Engineer'))).toMatchObject({
      category: 'QA / Testing',
      role: 'QA Engineer'
    });
  });

  it('excludes marketing roles', () => {
    expect(classifyJob(job('Marketing Manager'))).toBeNull();
  });

  it('excludes recruiter roles even with generic engineering tags', () => {
    expect(classifyJob(job('Recruiter', ['engineer']))).toBeNull();
  });

  it('uses technical tags when the title is generic but not non-technical', () => {
    expect(classifyJob(job('Analyst', ['javascript']))).toMatchObject({
      category: 'Engineering',
      role: 'Backend Engineer'
    });
  });
});
