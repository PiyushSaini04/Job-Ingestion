import Link from 'next/link';
import { ApiJob } from '../lib/api';
import { compactLocation, formatDate } from '../lib/text';

interface Props {
  job: ApiJob;
  index?: number;
}

export function JobCard({ job, index = 0 }: Props) {
  return (
    <article
      className="card-enter ui-card ui-card-hover rounded-[1.75rem] p-5 sm:p-6"
      style={{ animationDelay: `${Math.min(index, 12) * 60}ms` }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-[color:var(--text-secondary)]">
            <span className="rounded-full border border-[color:var(--border)] bg-[color:color-mix(in_srgb,var(--accent)_10%,transparent)] px-2.5 py-1 text-[color:var(--accent)]">
              {job.source}
            </span>
            <span>•</span>
            <span>{job.category}</span>
            <span>•</span>
            <span>{job.role}</span>
          </div>
          <h3 className="max-w-3xl text-xl font-semibold tracking-tight text-[color:var(--text-primary)] sm:text-2xl">
            <Link href={`/jobs/${job.id}`} className="transition hover:text-[color:var(--accent)]">
              {job.title}
            </Link>
          </h3>
          <p className="text-sm text-[color:var(--text-secondary)]">{job.company}</p>
        </div>
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-hover)] px-4 py-3 text-right text-xs text-[color:var(--text-secondary)]">
          <div className="text-[color:var(--text-primary)]">{formatDate(job.publishedAt)}</div>
          <div className="mt-1">{job.remote ? 'Remote' : 'On-site'}</div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 text-sm text-[color:var(--text-primary)]">
        <span className="ui-chip rounded-full border border-[color:var(--border)] bg-[color:var(--surface-hover)] px-3 py-1.5">
          {compactLocation(job.location)}
        </span>
        <span className="ui-chip rounded-full border border-[color:var(--border)] bg-[color:var(--surface-hover)] px-3 py-1.5">
          {job.jobType || 'Not provided'}
        </span>
        <span className="ui-chip rounded-full border border-[color:var(--border)] bg-[color:var(--surface-hover)] px-3 py-1.5">
          {job.remote ? 'Remote' : 'On-site'}
        </span>
      </div>
    </article>
  );
}
