import { SourceStatusRecord } from '../lib/api';

interface Props {
  sources: SourceStatusRecord[];
}

export function SourceStatus({ sources }: Props) {
  return (
    <section className="ui-card rounded-[1.75rem] p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.32em] text-[color:var(--text-secondary)]">Source Status</h2>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-[color:var(--text-primary)]">Live source health</p>
        </div>
        <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-hover)] px-3 py-1 text-xs text-[color:var(--text-secondary)]">
          Real backend data
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
        {sources.length === 0 ? (
          <div className="rounded-[1.35rem] border border-[color:var(--border)] bg-[color:var(--surface-hover)] p-5 text-sm text-[color:var(--text-secondary)]">
            No source data yet.
          </div>
        ) : null}
        {sources.map((source) => {
          const statusTone =
            source.status === 'HEALTHY'
              ? 'text-[color:var(--success)]'
              : source.status === 'DEGRADED'
                ? 'text-[color:var(--warning)]'
                : 'text-[color:var(--danger)]';

          const dotTone =
            source.status === 'HEALTHY'
              ? 'bg-[color:var(--success)] healthy-pulse'
              : source.status === 'DEGRADED'
                ? 'bg-[color:var(--warning)]'
                : 'bg-[color:var(--danger)]';

          return (
            <article
              key={source.id}
              className="ui-card-hover rounded-[1.35rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-4 status-pop"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className={`h-3.5 w-3.5 rounded-full ${dotTone}`} aria-hidden="true" />
                    <p className="font-medium text-[color:var(--text-primary)]">{source.name}</p>
                  </div>
                  <p className={`text-sm font-medium ${statusTone}`}>
                    {source.status}
                    {source.status === 'DEGRADED' ? ` • ${source.consecutiveFailures} consecutive failures` : ''}
                  </p>
                </div>

                <div className="text-right text-xs text-[color:var(--text-secondary)]">
                  <p>Last success</p>
                  <p className="mt-1 text-[color:var(--text-primary)]">
                    {source.lastSuccessAt ? new Date(source.lastSuccessAt).toLocaleString() : 'Not provided'}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-2 text-xs text-[color:var(--text-secondary)] sm:grid-cols-2">
                <p>Last failure: {source.lastFailureAt ? new Date(source.lastFailureAt).toLocaleString() : 'Not provided'}</p>
                <p className="sm:text-right">Base URL: {source.baseUrl}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
