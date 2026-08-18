"use client";

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
    return <div className="rounded-3xl border border-white/10 bg-white/6 p-8 text-slate-200">Loading latest job...</div>;
  }

  if (error) {
    return <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-8 text-rose-100">{error}</div>;
  }

  if (!job) {
    return <div className="rounded-3xl border border-white/10 bg-white/6 p-8 text-slate-200">Job not found.</div>;
  }

  return (
    <main className="space-y-6">
      <header className="rounded-[2rem] border border-white/10 bg-white/6 p-6 shadow-glow backdrop-blur-sm">
        <p className="text-xs uppercase tracking-[0.4em] text-sky-300">{job.source}</p>
        <h1 className="mt-3 font-[var(--font-space-grotesk)] text-4xl font-semibold text-white">{job.title}</h1>
        <p className="mt-2 text-lg text-slate-300">{job.company}</p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <article className="rounded-3xl border border-white/10 bg-white/6 p-6 shadow-glow backdrop-blur-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">Description</h2>
          <p className="mt-4 whitespace-pre-wrap text-slate-200">{stripHtml(job.description)}</p>
        </article>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/6 p-5 shadow-glow backdrop-blur-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">Details</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-slate-400">Category</dt>
                <dd className="text-white">{job.category}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Role</dt>
                <dd className="text-white">{job.role}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Location</dt>
                <dd className="text-white">{compactLocation(job.location)}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Type</dt>
                <dd className="text-white">{job.jobType || 'Not provided'}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Published</dt>
                <dd className="text-white">{formatDate(job.publishedAt)}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Salary</dt>
                <dd className="text-white">
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
              className="mt-5 inline-flex rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
            >
              View Original Job
            </a>
          </div>
        </aside>
      </section>
    </main>
  );
}
