import type { ClassifiedJob } from '../types/job';
import { persistJobsForSource } from '../db/repos';

export async function persistTechnicalJobs(sourceId: string, jobs: ClassifiedJob[]): Promise<{ inserted: number; updated: number }> {
  const now = new Date().toISOString();
  return persistJobsForSource(sourceId, jobs, now);
}
