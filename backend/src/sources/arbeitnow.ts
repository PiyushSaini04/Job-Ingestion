import { getEnv } from '../config/env';
import type { NormalizedJob } from '../types/job';
import { RetryableHttpError } from '../utils/retry';

interface ArbeitnowJob {
  slug?: string;
  company_name?: string;
  title?: string;
  description?: string;
  remote?: boolean;
  url?: string;
  tags?: string[];
  job_types?: string[];
  location?: string;
  created_at?: number;
}

interface ArbeitnowResponse {
  data?: ArbeitnowJob[];
}

export async function fetchArbeitnowJobs(fetchImpl: typeof fetch = fetch): Promise<NormalizedJob[]> {
  const env = getEnv();
  const response = await fetchImpl(env.arbeitnowApiUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0'
    }
  });

  if (!response.ok) {
    const retryAfter = response.headers.get('retry-after');
    throw new RetryableHttpError(
      `Arbeitnow responded with ${response.status}`,
      response.status,
      retryAfter ? Number(retryAfter) * 1000 : null
    );
  }

  const payload = (await response.json()) as ArbeitnowResponse;
  const jobs = Array.isArray(payload?.data) ? payload.data : [];

  return jobs
    .filter((job): job is Required<Pick<ArbeitnowJob, 'slug' | 'company_name' | 'title' | 'url'>> & ArbeitnowJob =>
      Boolean(job?.slug && job?.company_name && job?.title && job?.url)
    )
    .map((job) => ({
      externalId: String(job.slug),
      title: String(job.title ?? '').trim(),
      company: String(job.company_name ?? '').trim(),
      location: job.location?.trim() || null,
      description: job.description?.trim() || null,
      jobType: Array.isArray(job.job_types) && job.job_types.length ? job.job_types.join(', ') : null,
      remote: Boolean(job.remote),
      salaryMin: null,
      salaryMax: null,
      currency: null,
      originalUrl: String(job.url || '').trim(),
      publishedAt: typeof job.created_at === 'number' ? new Date(job.created_at * 1000).toISOString() : null,
      tags: Array.isArray(job.tags) ? job.tags.map((tag) => String(tag).toLowerCase()) : []
    }));
}
