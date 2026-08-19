"use client";

import Link from 'next/link';
import DOMPurify from "isomorphic-dompurify";
import { useEffect, useState } from 'react';
import { getJob, type ApiJob } from '../../../lib/api';
import { compactLocation, formatDate, stripHtml } from '../../../lib/text';

export function JobDetailClient({ id }: { id: string }) {
  const [job, setJob] = useState<ApiJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const data = await getJob(id);
        if (active) setJob(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load job');
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="ui-card page-enter rounded-[2rem] p-8 text-[color:var(--text-secondary)]">
        Loading latest job...
      </div>
    );
  }

  if (error) {
    return (
      <div className="ui-card page-enter rounded-[2rem] border-[color:color-mix(in_srgb,var(--danger)_26%,var(--border))] bg-[color:color-mix(in_srgb,var(--danger)_10%,transparent)] p-8 text-[color:var(--text-primary)]">
        {error}
      </div>
    );
  }

  if (!job) {
    return (
      <div className="ui-card page-enter rounded-[2rem] p-8 text-[color:var(--text-secondary)]">
        Job not found.
      </div>
    );
  }

  return (
    <main className="page-enter mx-auto flex w-full max-w-5xl flex-col gap-6 pb-16">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="ui-focus rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-sm font-medium text-[color:var(--text-primary)] transition hover:bg-[color:var(--surface-hover)]"
        >
          ← Back to jobs
        </Link>
        <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1 text-xs text-[color:var(--text-secondary)]">
          {job.source}
        </span>
      </div>

      <header className="ui-card rounded-[2rem] p-6 sm:p-8">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.32em] text-[color:var(--text-secondary)]">
            <span className="rounded-full border border-[color:var(--border)] bg-[color:color-mix(in_srgb,var(--accent)_10%,transparent)] px-2.5 py-1 text-[color:var(--accent)]">
              {job.category}
            </span>
            <span>•</span>
            <span>{job.role}</span>
          </div>
          <h1 className="max-w-4xl font-display text-4xl font-semibold tracking-tight text-[color:var(--text-primary)] sm:text-5xl">
            {job.title}
          </h1>
          <p className="text-lg text-[color:var(--text-secondary)]">{job.company}</p>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="ui-card rounded-[1.75rem] p-6 sm:p-8">
          <h2 className="text-sm font-semibold uppercase tracking-[0.32em] text-[color:var(--text-secondary)]">
            Description
          </h2>
            {job.description ? (
              <div
                className="
                  job-description
                  prose prose-invert
                  mt-8 max-w-none

                  prose-p:text-[15px]
                  prose-p:leading-7
                  prose-p:my-6

                  prose-headings:font-bold
                  prose-headings:text-white
                  prose-headings:tracking-tight

                  prose-h2:text-3xl
                  prose-h2:mt-12
                  prose-h2:mb-6

                  prose-strong:text-white
                  prose-strong:font-bold

                  prose-ul:my-7
                  prose-ol:my-7
                  prose-li:my-4
                  prose-li:leading-7

                  prose-li::marker:text-violet-400
                "
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(job.description ?? ''),
                }}
              />
            ) : (
              <p className="mt-6 text-[color:var(--text-secondary)]">
                No description available.
              </p>
            )}
        </article>

        <aside className="space-y-4">
          <section className="ui-card rounded-[1.75rem] p-5 sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.32em] text-[color:var(--text-secondary)]">
              Details
            </h2>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="text-[color:var(--text-secondary)]">Company</dt>
                <dd className="mt-1 text-[color:var(--text-primary)]">{job.company}</dd>
              </div>
              <div>
                <dt className="text-[color:var(--text-secondary)]">Location</dt>
                <dd className="mt-1 text-[color:var(--text-primary)]">{compactLocation(job.location)}</dd>
              </div>
              <div>
                <dt className="text-[color:var(--text-secondary)]">Type</dt>
                <dd className="mt-1 text-[color:var(--text-primary)]">{job.jobType || 'Not provided'}</dd>
              </div>
              <div>
                <dt className="text-[color:var(--text-secondary)]">Published</dt>
                <dd className="mt-1 text-[color:var(--text-primary)]">{formatDate(job.publishedAt)}</dd>
              </div>
              <div>
                <dt className="text-[color:var(--text-secondary)]">Salary</dt>
                <dd className="mt-1 text-[color:var(--text-primary)]">
                  {job.salaryMin || job.salaryMax
                    ? `${job.salaryMin ?? 'Not provided'} - ${job.salaryMax ?? 'Not provided'} ${job.currency || ''}`.trim()
                    : 'Salary not provided'}
                </dd>
              </div>
            </dl>

            <a
              href={job.originalUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="ui-focus mt-6 inline-flex w-full items-center justify-center rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--accent-hover)]"
            >
              View Original Job
            </a>
          </section>
        </aside>
      </section>
    </main>
  );
}
