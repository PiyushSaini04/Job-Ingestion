"use client";

import { useEffect, useMemo, useState } from 'react';
import { getIngestionRuns, getSources, listJobs, runIngestion } from '../lib/api';
import { FilterPills } from '../components/FilterPills';
import { IngestionStatus } from '../components/IngestionStatus';
import { JobList } from '../components/JobList';
import { SourceStatus } from '../components/SourceStatus';
import type { ApiJob, IngestionRunRecord, SourceStatusRecord } from '../lib/api';

const categories = ['Engineering', 'DevOps', 'Cloud', 'Data', 'AI / ML', 'Security', 'QA / Testing'];
const roles = [
  'Backend Engineer',
  'Frontend Engineer',
  'Full Stack Engineer',
  'Software Engineer',
  'DevOps Engineer',
  'Cloud Engineer',
  'Data Engineer',
  'AI Engineer',
  'ML Engineer',
  'Security Engineer',
  'QA Engineer'
];

export default function HomePage() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [jobs, setJobs] = useState<ApiJob[]>([]);
  const [page, setPage] = useState(1);
  const [paginationTotalPages, setPaginationTotalPages] = useState(1);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [sources, setSources] = useState<SourceStatusRecord[]>([]);
  const [runs, setRuns] = useState<IngestionRunRecord[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [runningIngestion, setRunningIngestion] = useState(false);

  const filtersKey = useMemo(
    () => JSON.stringify({ selectedCategories, selectedRoles }),
    [selectedCategories, selectedRoles]
  );

  async function refreshMeta() {
    const [sourceResponse, runResponse] = await Promise.all([getSources(), getIngestionRuns()]);
    setSources(sourceResponse.sources);
    setRuns(runResponse.runs);
  }

  async function fetchJobs(nextPage: number, replace: boolean) {
    try {
      if (replace) setLoadingJobs(true);
      else setLoadingMore(true);
      setJobsError(null);

      const response = await listJobs({
        page: nextPage,
        limit: 20,
        categories: selectedCategories,
        roles: selectedRoles
      });

      setPaginationTotalPages(response.pagination.totalPages);
      setPage(response.pagination.page);
      setJobs((current) => (replace ? response.jobs : [...current, ...response.jobs]));
    } catch (error) {
      setJobsError(error instanceof Error ? error.message : 'Unable to load jobs');
    } finally {
      setLoadingJobs(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    void fetchJobs(1, true);
    void refreshMeta().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  useEffect(() => {
    if (!jobs.length && !loadingJobs) {
      setJobsError('No jobs match the selected filters.');
    } else {
      setJobsError(null);
    }
  }, [jobs, loadingJobs]);

  async function handleRunIngestion() {
    setRunningIngestion(true);
    setStatusMessage(null);
    try {
      const result = await runIngestion();
      const counts = result.run;
      setStatusMessage(
        result.fallbackUsed
          ? `Fallback used. Fetched ${counts.fetchedCount ?? 0}, inserted ${counts.insertedCount ?? 0}, updated ${counts.updatedCount ?? 0}.`
          : `Run complete. Fetched ${counts.fetchedCount ?? 0}, inserted ${counts.insertedCount ?? 0}, updated ${counts.updatedCount ?? 0}.`
      );
      await Promise.all([refreshMeta(), fetchJobs(1, true)]);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to run ingestion');
    } finally {
      setRunningIngestion(false);
    }
  }

  const hasMore = page < paginationTotalPages;
  const showEmptyState = !loadingJobs && !jobsError && jobs.length === 0;

  return (
    <main className="space-y-6">
      <header className="rounded-[2rem] border border-white/10 bg-white/6 p-6 shadow-glow backdrop-blur-sm sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <p className="text-xs uppercase tracking-[0.4em] text-sky-300">Job Ingestion Platform</p>
            <h1 className="font-[var(--font-space-grotesk)] text-4xl font-semibold leading-tight text-white sm:text-5xl">
              Technical jobs, normalized and served from our own backend.
            </h1>
            <p className="max-w-2xl text-base text-slate-300 sm:text-lg">
              Multi-select filters, deterministic classification, deduplication, and a real ingestion trail. No search box. No fake data. No browser-to-third-party API calls.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-300 lg:w-80">
            <p className="text-white">Current view</p>
            <p className="mt-2">Categories: {selectedCategories.length ? selectedCategories.join(', ') : 'All'}</p>
            <p>Roles: {selectedRoles.length ? selectedRoles.join(', ') : 'All'}</p>
          </div>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/6 p-5 shadow-glow backdrop-blur-sm">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">Filters</h2>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategories([]);
                    setSelectedRoles([]);
                  }}
                  className="rounded-full border border-white/10 bg-slate-950/50 px-4 py-2 text-sm text-slate-200 transition hover:border-sky-300/40 hover:text-white"
                >
                  All
                </button>
              </div>
              <FilterPills label="Categories" items={categories} selected={selectedCategories} onChange={setSelectedCategories} />
              <FilterPills label="Roles" items={roles} selected={selectedRoles} onChange={setSelectedRoles} />
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/6 p-5 shadow-glow backdrop-blur-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">Latest Jobs</h2>
              <p className="text-xs text-slate-400">{jobs.length} shown</p>
            </div>

            {loadingJobs ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-6 text-slate-300">
                Loading latest jobs...
              </div>
            ) : jobsError ? (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-6 text-rose-100">
                {jobsError}
              </div>
            ) : showEmptyState ? (
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-6 text-slate-300">
                No jobs match the selected filters.
              </div>
            ) : (
              <JobList jobs={jobs} />
            )}

            <div className="mt-5 flex justify-center">
              <button
                type="button"
                disabled={!hasMore || loadingMore || loadingJobs}
                onClick={() => void fetchJobs(page + 1, false)}
                className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-sky-300/40 hover:bg-sky-300/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingMore ? 'Loading...' : hasMore ? 'Load More' : 'No more jobs'}
              </button>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <IngestionStatus runs={runs} loading={runningIngestion} onRun={handleRunIngestion} statusMessage={statusMessage} />
          <SourceStatus sources={sources} />
        </aside>
      </section>
    </main>
  );
}
