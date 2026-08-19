export interface ApiJob {
  id: string;
  sourceId: string;
  source: string;
  externalId: string;
  title: string;
  company: string;
  category: string;
  role: string;
  location: string | null;
  description: string | null;
  jobType: string | null;
  remote: boolean | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  originalUrl: string;
  publishedAt: string | null;
  lastSeenAt: string;
  fetchedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface JobListResponse {
  jobs: ApiJob[];
  pagination: Pagination;
}

export interface SourceStatusRecord {
  id: string;
  name: string;
  baseUrl: string;
  type: string;
  status: 'HEALTHY' | 'DEGRADED' | 'DISABLED';
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  consecutiveFailures: number;
  createdAt: string;
  updatedAt: string;
}

export interface IngestionRunRecord {
  id: string;
  sourceId: string;
  status: 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED';
  startedAt: string;
  completedAt: string | null;
  fetchedCount: number;
  insertedCount: number;
  updatedCount: number;
  failedCount: number;
  errorMessage: string | null;
}

export interface IngestionRunResponse {
  run: {
    id?: string;
    status?: 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED';
    sourceId?: string;
    fetchedCount?: number;
    insertedCount?: number;
    updatedCount?: number;
    failedCount?: number;
    errorMessage?: string | null;
  };
  fallbackUsed: boolean;
  message: string | null;
}

export class ApiError extends Error {
  status: number;
  retryAfterMs: number | null;

  constructor(message: string, status: number, retryAfterMs: number | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:3001';
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : response.statusText || 'Request failed';
    const retryAfterMs =
      payload && typeof payload === 'object' && 'retryAfterMs' in payload && typeof payload.retryAfterMs === 'number'
        ? payload.retryAfterMs
        : null;
    throw new ApiError(message, response.status, retryAfterMs);
  }

  return (await response.json()) as T;
}

export function listJobs(params: { page: number; limit: number; categories: string[]; roles: string[] }) {
  const searchParams = new URLSearchParams();
  searchParams.set('page', String(params.page));
  searchParams.set('limit', String(params.limit));
  if (params.categories.length) searchParams.set('categories', params.categories.join(','));
  if (params.roles.length) searchParams.set('roles', params.roles.join(','));
  return request<JobListResponse>(`/api/jobs?${searchParams.toString()}`);
}

export function getJob(id: string) {
  return request<ApiJob>(`/api/jobs/${encodeURIComponent(id)}`);
}

export function getSources() {
  return request<{ sources: SourceStatusRecord[] }>('/api/sources');
}

export function getIngestionRuns() {
  return request<{ runs: IngestionRunRecord[] }>('/api/ingestion-runs');
}

export function runIngestion() {
  return request<IngestionRunResponse>('/api/ingestion/run', { method: 'POST' });
}
