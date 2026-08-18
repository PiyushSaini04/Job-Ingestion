import Link from 'next/link';
import { ApiJob } from '../lib/api';
import { compactLocation, formatDate } from '../lib/text';

interface Props {
  job: ApiJob;
}

export function JobCard({ job }: Props) {
  return (
    <article className="rounded-3xl border border-white/10 bg-white/6 p-5 shadow-glow backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-sky-300/30 hover:bg-white/8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.25em] text-slate-400">
            <span>{job.source}</span>
            <span>•</span>
            <span>{job.category}</span>
            <span>•</span>
            <span>{job.role}</span>
          </div>
          <h3 className="text-xl font-semibold text-white sm:text-2xl">
            <Link href={`/jobs/${job.id}`} className="hover:text-sky-300">
              {job.title}
            </Link>
          </h3>
          <p className="text-sm text-slate-300">{job.company}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-right text-xs text-slate-300">
          <div>{formatDate(job.publishedAt)}</div>
          <div className="mt-1">{job.remote ? 'Remote' : 'On-site'}</div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 text-sm text-slate-200">
        <span className="rounded-full bg-white/5 px-3 py-1">{compactLocation(job.location)}</span>
        <span className="rounded-full bg-white/5 px-3 py-1">{job.jobType || 'Not provided'}</span>
        <span className="rounded-full bg-white/5 px-3 py-1">{job.remote ? 'Remote' : 'On-site'}</span>
      </div>
    </article>
  );
}
