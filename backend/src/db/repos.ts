import { supabase } from './supabase';
import type {
  ClassifiedJob,
  IngestionErrorRecord,
  IngestionRunRecord,
  JobRecord,
  SourceRecord,
  SourceStatus
} from '../types/job';

type DbSourceRow = {
  id: string;
  name: string;
  base_url: string;
  type: string;
  status: SourceStatus;
  last_success_at: string | null;
  last_failure_at: string | null;
  consecutive_failures: number;
  created_at: string;
  updated_at: string;
};

type DbJobRow = {
  id: string;
  source_id: string;
  external_id: string;
  title: string;
  company: string;
  category: string;
  role: string;
  location: string | null;
  description: string | null;
  job_type: string | null;
  remote: boolean | null;
  salary_min: number | null;
  salary_max: number | null;
  currency: string | null;
  original_url: string;
  published_at: string | null;
  last_seen_at: string;
  fetched_at: string;
  created_at: string;
  updated_at: string;
};

type DbRunRow = {
  id: string;
  source_id: string;
  status: IngestionRunRecord['status'];
  started_at: string;
  completed_at: string | null;
  fetched_count: number;
  inserted_count: number;
  updated_count: number;
  failed_count: number;
  error_message: string | null;
};

type DbErrorRow = {
  id: string;
  run_id: string;
  source_id: string;
  error_type: string;
  status_code: number | null;
  message: string;
  created_at: string;
};

function mapSource(row: DbSourceRow): SourceRecord {
  return {
    id: row.id,
    name: row.name as SourceRecord['name'],
    baseUrl: row.base_url,
    type: row.type,
    status: row.status,
    lastSuccessAt: row.last_success_at,
    lastFailureAt: row.last_failure_at,
    consecutiveFailures: row.consecutive_failures,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapJob(row: DbJobRow, sourceName: SourceRecord['name']): JobRecord {
  return {
    id: row.id,
    sourceId: row.source_id,
    sourceName,
    externalId: row.external_id,
    title: row.title,
    company: row.company,
    category: row.category as JobRecord['category'],
    role: row.role as JobRecord['role'],
    location: row.location,
    description: row.description,
    jobType: row.job_type,
    remote: row.remote,
    salaryMin: row.salary_min,
    salaryMax: row.salary_max,
    currency: row.currency,
    originalUrl: row.original_url,
    publishedAt: row.published_at,
    tags: [],
    lastSeenAt: row.last_seen_at,
    fetchedAt: row.fetched_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapRun(row: DbRunRow): IngestionRunRecord {
  return {
    id: row.id,
    sourceId: row.source_id,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    fetchedCount: row.fetched_count,
    insertedCount: row.inserted_count,
    updatedCount: row.updated_count,
    failedCount: row.failed_count,
    errorMessage: row.error_message
  };
}

function mapError(row: DbErrorRow): IngestionErrorRecord {
  return {
    id: row.id,
    runId: row.run_id,
    sourceId: row.source_id,
    errorType: row.error_type,
    statusCode: row.status_code,
    message: row.message,
    createdAt: row.created_at
  };
}

export async function getSourceByName(name: string): Promise<SourceRecord | null> {
  const { data, error } = await supabase.from('sources').select('*').eq('name', name).maybeSingle();
  if (error) throw error;
  return data ? mapSource(data as DbSourceRow) : null;
}

export async function getSourceById(id: string): Promise<SourceRecord | null> {
  const { data, error } = await supabase.from('sources').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? mapSource(data as DbSourceRow) : null;
}

export async function listSources(): Promise<SourceRecord[]> {
  const { data, error } = await supabase.from('sources').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return (data as DbSourceRow[] | null | undefined)?.map(mapSource) ?? [];
}

export async function updateSourceHealth(
  sourceId: string,
  patch: Partial<Pick<SourceRecord, 'status' | 'lastSuccessAt' | 'lastFailureAt' | 'consecutiveFailures'>>
): Promise<void> {
  const payload: Record<string, string | number | null> = {};
  if (patch.status) payload.status = patch.status;
  if (patch.lastSuccessAt !== undefined) payload.last_success_at = patch.lastSuccessAt;
  if (patch.lastFailureAt !== undefined) payload.last_failure_at = patch.lastFailureAt;
  if (patch.consecutiveFailures !== undefined) payload.consecutive_failures = patch.consecutiveFailures;
  payload.updated_at = new Date().toISOString();
  const { error } = await supabase.from('sources').update(payload).eq('id', sourceId);
  if (error) throw error;
}

export async function listJobs(params: {
  page: number;
  limit: number;
  categories?: string[];
  roles?: string[];
}): Promise<{ jobs: JobRecord[]; total: number; totalPages: number; page: number; limit: number }> {
  const offset = (params.page - 1) * params.limit;
  let query = supabase.from('jobs').select('*', { count: 'exact' });

  if (params.categories?.length) {
    query = query.in('category', params.categories);
  }
  if (params.roles?.length) {
    query = query.in('role', params.roles);
  }

  const { data, count, error } = await query
    .order('published_at', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + params.limit - 1);

  if (error) throw error;

  const rows = (data as DbJobRow[] | null | undefined) ?? [];
  const sourceIds = [...new Set(rows.map((row) => row.source_id))];
  const { data: sourceRows, error: sourceError } = sourceIds.length
    ? await supabase.from('sources').select('*').in('id', sourceIds)
    : { data: [], error: null };
  if (sourceError) throw sourceError;

  const sourcesById = new Map<string, SourceRecord>();
  for (const row of (sourceRows as DbSourceRow[] | null | undefined) ?? []) {
    sourcesById.set(row.id, mapSource(row));
  }

  return {
    jobs: rows.map((row) => mapJob(row, sourcesById.get(row.source_id)?.name ?? 'Remote OK')),
    total: count ?? 0,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / params.limit)),
    page: params.page,
    limit: params.limit
  };
}

export async function getJobById(id: string): Promise<JobRecord | null> {
  const { data, error } = await supabase.from('jobs').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const job = data as DbJobRow;
  const source = await getSourceById(job.source_id);
  return mapJob(job, source?.name ?? 'Remote OK');
}

export async function listRecentRuns(limit = 20): Promise<IngestionRunRecord[]> {
  const { data, error } = await supabase
    .from('ingestion_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as DbRunRow[] | null | undefined)?.map(mapRun) ?? [];
}

export async function getLatestIngestionRun(): Promise<IngestionRunRecord | null> {
  const { data, error } = await supabase
    .from('ingestion_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRun(data as DbRunRow) : null;
}

export async function createIngestionRun(sourceId: string): Promise<IngestionRunRecord> {
  const payload = {
    source_id: sourceId,
    status: 'RUNNING',
    fetched_count: 0,
    inserted_count: 0,
    updated_count: 0,
    failed_count: 0
  };
  const { data, error } = await supabase.from('ingestion_runs').insert(payload).select('*').single();
  if (error) throw error;
  return mapRun(data as DbRunRow);
}

export async function updateIngestionRun(
  runId: string,
  patch: Partial<Pick<IngestionRunRecord, 'status' | 'completedAt' | 'fetchedCount' | 'insertedCount' | 'updatedCount' | 'failedCount' | 'errorMessage'>> & {
    sourceId?: string;
  }
): Promise<void> {
  const payload: Record<string, string | number | null> = {};
  if (patch.status) payload.status = patch.status;
  if (patch.sourceId) payload.source_id = patch.sourceId;
  if (patch.completedAt !== undefined) payload.completed_at = patch.completedAt;
  if (patch.fetchedCount !== undefined) payload.fetched_count = patch.fetchedCount;
  if (patch.insertedCount !== undefined) payload.inserted_count = patch.insertedCount;
  if (patch.updatedCount !== undefined) payload.updated_count = patch.updatedCount;
  if (patch.failedCount !== undefined) payload.failed_count = patch.failedCount;
  if (patch.errorMessage !== undefined) payload.error_message = patch.errorMessage;
  const { error } = await supabase.from('ingestion_runs').update(payload).eq('id', runId);
  if (error) throw error;
}

export async function insertIngestionError(errorRow: Omit<IngestionErrorRecord, 'id' | 'createdAt'>): Promise<void> {
  const payload = {
    run_id: errorRow.runId,
    source_id: errorRow.sourceId,
    error_type: errorRow.errorType,
    status_code: errorRow.statusCode,
    message: errorRow.message
  };
  const { error } = await supabase.from('ingestion_errors').insert(payload);
  if (error) throw error;
}

export async function persistJobsForSource(sourceId: string, jobs: ClassifiedJob[], nowIso: string): Promise<{ inserted: number; updated: number }> {
  if (!jobs.length) return { inserted: 0, updated: 0 };

  const externalIds = jobs.map((job) => job.externalId);
  const { data: existingRows, error: selectError } = await supabase
    .from('jobs')
    .select('id, external_id')
    .eq('source_id', sourceId)
    .in('external_id', externalIds);
  if (selectError) throw selectError;

  const existing = new Set(((existingRows as Array<{ external_id: string }> | null | undefined) ?? []).map((row) => row.external_id));
  const inserts = jobs.filter((job) => !existing.has(job.externalId));
  const updates = jobs.filter((job) => existing.has(job.externalId));

  if (inserts.length) {
    const insertPayload = inserts.map((job) => ({
      source_id: sourceId,
      external_id: job.externalId,
      title: job.title,
      company: job.company,
      category: job.category,
      role: job.role,
      location: job.location,
      description: job.description,
      job_type: job.jobType,
      remote: job.remote,
      salary_min: job.salaryMin,
      salary_max: job.salaryMax,
      currency: job.currency,
      original_url: job.originalUrl,
      published_at: job.publishedAt,
      last_seen_at: nowIso,
      fetched_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso
    }));
    const { error } = await supabase.from('jobs').insert(insertPayload);
    if (error) throw error;
  }

  for (const job of updates) {
    const { error } = await supabase
      .from('jobs')
      .update({
        title: job.title,
        company: job.company,
        category: job.category,
        role: job.role,
        location: job.location,
        description: job.description,
        job_type: job.jobType,
        remote: job.remote,
        salary_min: job.salaryMin,
        salary_max: job.salaryMax,
        currency: job.currency,
        original_url: job.originalUrl,
        published_at: job.publishedAt,
        last_seen_at: nowIso,
        fetched_at: nowIso,
        updated_at: nowIso
      })
      .eq('source_id', sourceId)
      .eq('external_id', job.externalId);
    if (error) throw error;
  }

  return { inserted: inserts.length, updated: updates.length };
}
