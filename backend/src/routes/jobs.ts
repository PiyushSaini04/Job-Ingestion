import { Router } from 'express';
import { getJobById, listJobs } from '../db/repos';

function parseCsv(value: unknown): string[] {
  if (typeof value !== 'string' || !value.trim()) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePositiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

export const jobsRouter = Router();

jobsRouter.get('/api/jobs', async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(100, parsePositiveInt(req.query.limit, 20));
    const categories = parseCsv(req.query.categories);
    const roles = parseCsv(req.query.roles);
    const result = await listJobs({ page, limit, categories, roles });

    res.json({
      jobs: result.jobs.map((job) => ({
        id: job.id,
        sourceId: job.sourceId,
        source: job.sourceName ?? (job as { source?: string }).source,
        externalId: job.externalId,
        title: job.title,
        company: job.company,
        category: job.category,
        role: job.role,
        location: job.location,
        description: job.description,
        jobType: job.jobType,
        remote: job.remote,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        currency: job.currency,
        originalUrl: job.originalUrl,
        publishedAt: job.publishedAt,
        lastSeenAt: job.lastSeenAt,
        fetchedAt: job.fetchedAt,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt
      })),
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch jobs';
    res.status(500).json({ error: message });
  }
});

jobsRouter.get('/api/jobs/:id', async (req, res) => {
  try {
    const job = await getJobById(req.params.id);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    res.json({
      id: job.id,
      sourceId: job.sourceId,
      source: job.sourceName ?? (job as { source?: string }).source,
      externalId: job.externalId,
      title: job.title,
      company: job.company,
      category: job.category,
      role: job.role,
      location: job.location,
      description: job.description,
      jobType: job.jobType,
      remote: job.remote,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      currency: job.currency,
      originalUrl: job.originalUrl,
      publishedAt: job.publishedAt,
      lastSeenAt: job.lastSeenAt,
      fetchedAt: job.fetchedAt,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch job';
    res.status(500).json({ error: message });
  }
});
