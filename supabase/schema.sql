create extension if not exists pgcrypto;

create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  base_url text not null,
  type text not null,
  status text not null check (status in ('HEALTHY', 'DEGRADED', 'DISABLED')),
  last_success_at timestamptz,
  last_failure_at timestamptz,
  consecutive_failures integer not null default 0 check (consecutive_failures >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references sources(id) on delete restrict,
  external_id text not null,
  title text not null,
  company text not null,
  category text not null,
  role text not null,
  location text,
  description text,
  job_type text,
  remote boolean,
  salary_min integer,
  salary_max integer,
  currency text,
  original_url text not null,
  published_at timestamptz,
  last_seen_at timestamptz not null,
  fetched_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, external_id)
);

create index if not exists jobs_published_at_idx on jobs (published_at desc);
create index if not exists jobs_category_idx on jobs (category);
create index if not exists jobs_role_idx on jobs (role);
create index if not exists jobs_source_id_idx on jobs (source_id);

create table if not exists ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references sources(id) on delete restrict,
  status text not null check (status in ('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  fetched_count integer not null default 0,
  inserted_count integer not null default 0,
  updated_count integer not null default 0,
  failed_count integer not null default 0,
  error_message text
);

create table if not exists ingestion_errors (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references ingestion_runs(id) on delete cascade,
  source_id uuid not null references sources(id) on delete restrict,
  error_type text not null,
  status_code integer,
  message text not null,
  created_at timestamptz not null default now()
);

insert into sources (name, base_url, type, status)
values
  ('Remote OK', 'https://remoteok.com/api', 'public-job-api', 'HEALTHY'),
  ('Arbeitnow', 'https://www.arbeitnow.com/api/job-board-api', 'public-job-api', 'HEALTHY')
on conflict (name) do nothing;
