"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BackToTop } from '../components/BackToTop';
import { FilterPills } from '../components/FilterPills';
import { JobList } from '../components/JobList';
import { ApiError, listJobs, runIngestion, type ApiJob } from '../lib/api';
import { formatCooldownMessage } from '../lib/text';

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
const PAGE_SIZE = 100;

export default function HomePage() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [jobs, setJobs] = useState<ApiJob[]>([]);
  const [page, setPage] = useState(1);
  const [paginationTotalPages, setPaginationTotalPages] = useState(1);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshingJobs, setRefreshingJobs] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  const filtersKey = useMemo(
    () => JSON.stringify({ selectedCategories, selectedRoles }),
    [selectedCategories, selectedRoles]
  );

  async function fetchJobs(nextPage: number, replace: boolean) {
    try {
      if (replace) setLoadingJobs(true);
      else setLoadingMore(true);
      setJobsError(null);

      const response = await listJobs({
        page: nextPage,
        limit: PAGE_SIZE,
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

  async function refreshJobs() {
    try {
      setRefreshingJobs(true);
      setRefreshMessage(null);
      await runIngestion();
      await fetchJobs(1, true);
      setRefreshMessage('Jobs refreshed successfully.');
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        setRefreshMessage(formatCooldownMessage(error.retryAfterMs, 'Jobs') ?? error.message);
      } else {
        setRefreshMessage(error instanceof Error ? error.message : 'Unable to refresh jobs');
      }
    } finally {
      setRefreshingJobs(false);
    }
  }

  useEffect(() => {
    void fetchJobs(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  const hasMore = page < paginationTotalPages;
  const isEmpty = !loadingJobs && !jobsError && jobs.length === 0;

  return (
    <main className="page-enter space-y-6 pb-16">
      <section className="ui-card rounded-[1.5rem] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.42em] text-[color:var(--accent)]">Part 1 feed</p>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-[color:var(--text-primary)] sm:text-4xl">
              Technical jobs, shown plainly
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-[color:var(--text-secondary)] sm:text-base">
              Browse the backend-driven job list with server-side filters and pagination. Ingestion status lives on the Status page.
            </p>
          </div>

          <Link
            href="/status"
            className="ui-focus inline-flex items-center justify-center rounded-full border border-[color:color-mix(in_srgb,var(--accent)_28%,var(--border))] bg-[color:color-mix(in_srgb,var(--accent)_12%,transparent)] px-4 py-2.5 text-sm font-semibold text-[color:var(--text-primary)] transition hover:bg-[color:color-mix(in_srgb,var(--accent)_18%,transparent)]"
          >
            View status
          </Link>
          <button
            type="button"
            onClick={() => void refreshJobs()}
            disabled={refreshingJobs || loadingJobs}
            className="ui-focus inline-flex items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface-hover)] px-4 py-2.5 text-sm font-semibold text-[color:var(--text-primary)] transition hover:bg-[color:var(--surface)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshingJobs ? (
              <>
                <span className="spinner mr-2 inline-flex h-4 w-4 rounded-full border-2 border-current border-t-transparent opacity-80" />
                Refreshing...
              </>
            ) : (
              'Refresh Jobs'
            )}
          </button>
        </div>
        {refreshMessage ? <p className="mt-4 text-sm text-[color:var(--text-secondary)]">{refreshMessage}</p> : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-6 lg:sticky lg:top-24 self-start">
          <section className="ui-card rounded-[1.5rem] p-5 sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.32em] text-[color:var(--text-secondary)]">Filters</h2>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-[color:var(--text-primary)]">Pick one or more</p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">
              Categories and roles stay server-side, so the feed always matches the backend response.
            </p>

            <div className="mt-5">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategories([]);
                  setSelectedRoles([]);
                }}
                className="ui-focus rounded-full border border-[color:var(--border)] bg-[color:var(--surface-hover)] px-4 py-2 text-sm font-medium text-[color:var(--text-primary)] transition hover:bg-[color:var(--surface)]"
              >
                Clear all
              </button>
            </div>

            <div className="mt-5 space-y-5">
              <FilterPills label="Categories" items={categories} selected={selectedCategories} onChange={setSelectedCategories} />
              <FilterPills label="Roles" items={roles} selected={selectedRoles} onChange={setSelectedRoles} />
            </div>
          </section>

          <section className="ui-card rounded-[1.5rem] p-5 sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.32em] text-[color:var(--text-secondary)]">Current view</h2>
            <div className="mt-4 space-y-3 text-sm text-[color:var(--text-secondary)]">
              <p>
                Jobs shown: <span className="text-[color:var(--text-primary)]">{jobs.length}</span>
              </p>
              <p>
                Categories: <span className="text-[color:var(--text-primary)]">{selectedCategories.length ? selectedCategories.join(', ') : 'All'}</span>
              </p>
              <p>
                Roles: <span className="text-[color:var(--text-primary)]">{selectedRoles.length ? selectedRoles.join(', ') : 'All'}</span>
              </p>
            </div>
          </section>
        </aside>

        <section className="ui-card rounded-[1.5rem] p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.32em] text-[color:var(--text-secondary)]">Job feed</h2>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-[color:var(--text-primary)]">
                Latest technical listings
              </p>
            </div>
            
              {/* <p className="text-sm text-[color:var(--text-secondary)]">{jobs.length} shown</p> */}
            
          </div>
          
          <div className="jobs-scroll h-[135vh] overflow-y-auto pr-2">
            {loadingJobs ? (
              <JobList jobs={[]} loading skeletonCount={5} />
            ) : jobsError ? (
              <div className="rounded-[1.35rem] border border-[color:color-mix(in_srgb,var(--danger)_24%,var(--border))] bg-[color:color-mix(in_srgb,var(--danger)_8%,transparent)] p-6 text-[color:var(--text-primary)]">
                {jobsError}
              </div>
            ) : isEmpty ? (
              <div className="rounded-[1.35rem] border border-[color:var(--border)] bg-[color:var(--surface-hover)] p-6 text-[color:var(--text-secondary)]">
                No jobs match the selected filters.
              </div>
            ) : (
              <JobList jobs={jobs} />
            )}
          </div>

        </section>
      </div>

      <BackToTop />
    </main>
  );
}
