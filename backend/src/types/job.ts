export type SourceName = 'Remote OK' | 'Arbeitnow';

export type SourceStatus = 'HEALTHY' | 'DEGRADED' | 'DISABLED';

export type IngestionRunStatus = 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED';

export type JobCategory =
  | 'Engineering'
  | 'DevOps'
  | 'Cloud'
  | 'Data'
  | 'AI / ML'
  | 'Security'
  | 'QA / Testing';

export type JobRole =
  | 'Backend Engineer'
  | 'Frontend Engineer'
  | 'Full Stack Engineer'
  | 'Software Engineer'
  | 'DevOps Engineer'
  | 'Cloud Engineer'
  | 'Data Engineer'
  | 'AI Engineer'
  | 'ML Engineer'
  | 'Security Engineer'
  | 'QA Engineer';

export interface NormalizedJob {
  externalId: string;
  title: string;
  company: string;
  location: string | null;
  description: string | null;
  jobType: string | null;
  remote: boolean | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  originalUrl: string;
  publishedAt: string | null;
  tags: string[];
}

export interface ClassifiedJob extends NormalizedJob {
  category: JobCategory;
  role: JobRole;
}

export interface JobRecord extends ClassifiedJob {
  id: string;
  sourceId: string;
  sourceName: SourceName;
  sourceStatus?: SourceStatus;
  lastSeenAt: string;
  fetchedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SourceRecord {
  id: string;
  name: SourceName;
  baseUrl: string;
  type: string;
  status: SourceStatus;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  consecutiveFailures: number;
  createdAt: string;
  updatedAt: string;
}

export interface IngestionRunRecord {
  id: string;
  sourceId: string;
  status: IngestionRunStatus;
  startedAt: string;
  completedAt: string | null;
  fetchedCount: number;
  insertedCount: number;
  updatedCount: number;
  failedCount: number;
  errorMessage: string | null;
}

export interface IngestionErrorRecord {
  id: string;
  runId: string;
  sourceId: string;
  errorType: string;
  statusCode: number | null;
  message: string;
  createdAt: string;
}
