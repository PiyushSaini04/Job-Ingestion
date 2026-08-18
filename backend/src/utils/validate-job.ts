import type { NormalizedJob } from '../types/job';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

const requiredFields: Array<keyof Pick<NormalizedJob, 'externalId' | 'title' | 'company' | 'originalUrl'>> = [
  'externalId',
  'title',
  'company',
  'originalUrl'
];

export function validateNormalizedJob(job: NormalizedJob): ValidationResult {
  for (const field of requiredFields) {
    const value = job[field];
    if (typeof value !== 'string' || !value.trim()) {
      return { valid: false, reason: `Missing required field: ${field}` };
    }
  }

  return { valid: true };
}
