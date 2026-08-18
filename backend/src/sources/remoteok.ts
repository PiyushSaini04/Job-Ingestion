import { getEnv } from '../config/env';
import type { NormalizedJob } from '../types/job';
import { RetryableHttpError } from '../utils/retry';

interface RemoteOkJob {
  id?: string | number;
  epoch?: number;
  date?: string;
  company?: string;
  position?: string;
  tags?: string[];
  description?: string;
  location?: string;
  apply_url?: string;
  url?: string;
  salary_min?: number;
  salary_max?: number;
  currency?: string;
  remote?: boolean;
  job_type?: string;
}

function toIso(epoch?: number): string | null {
  if (!epoch) return null;
  return new Date(epoch * 1000).toISOString();
}

function makeFetchError(status: number, message: string, retryAfterHeader: string | null = null): Error {
  return new RetryableHttpError(message, status, retryAfterHeader ? Number(retryAfterHeader) * 1000 : null);
}

export async function fetchRemoteOkJobs(fetchImpl: typeof fetch = fetch): Promise<NormalizedJob[]> {
  const env = getEnv();
  if (env.nodeEnv !== 'production' && String(process.env.MOCK_PRIMARY_FAILURE).toLowerCase() === 'true') {
    throw new RetryableHttpError('MOCK_PRIMARY_FAILURE enabled for Remote OK', 429, 1000);
  }

  const response = await fetchImpl(env.remoteOkApiUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0'
    }
  });

  if (!response.ok) {
    throw makeFetchError(response.status, `Remote OK responded with ${response.status}`, response.headers.get('retry-after'));
  }

  const data = (await response.json()) as RemoteOkJob[];
  const jobs = Array.isArray(data) ? data.slice(1) : [];

  return jobs
    .filter((job): job is RemoteOkJob => Boolean(job && job.id && job.position && job.company))
    .map((job) => ({
      externalId: String(job.id),
      title: String(job.position ?? '').trim(),
      company: String(job.company ?? '').trim(),
      location: job.location?.trim() || null,
      description: job.description?.trim() || null,
      jobType: job.job_type?.trim() || null,
      remote: true,
      salaryMin: job.salary_min && job.salary_min > 0 ? job.salary_min : null,
      salaryMax: job.salary_max && job.salary_max > 0 ? job.salary_max : null,
      currency: job.currency?.trim() || null,
      originalUrl: String(job.apply_url || job.url || '').trim(),
      publishedAt: toIso(job.epoch),
      tags: Array.isArray(job.tags) ? job.tags.map((tag) => String(tag).toLowerCase()) : []
    }))
    .filter((job) => Boolean(job.originalUrl));
}
