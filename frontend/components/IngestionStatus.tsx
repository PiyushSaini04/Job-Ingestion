import { IngestionRunRecord } from '../lib/api';

interface Props {
  runs: IngestionRunRecord[];
  loading: boolean;
  onRun: () => Promise<void>;
  statusMessage: string | null;
}

export function IngestionStatus({ runs, loading, onRun, statusMessage }: Props) {
  const latest = runs[0];

  return (
    <section className="ui-card rounded-[1.75rem] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.32em] text-[color:var(--text-secondary)]">Ingestion</h2>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-[color:var(--text-primary)]">Run ingestion now</p>
          <p className="mt-2 max-w-xl text-sm text-[color:var(--text-secondary)]">
            Trigger the backend ingestion flow, including retry, fallback, and deduplication.
          </p>
        </div>
        <button
          type="button"
          onClick={onRun}
          disabled={loading}
          className="ui-focus inline-flex items-center gap-2 rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <span className="spinner inline-flex h-4 w-4 rounded-full border-2 border-current border-t-transparent opacity-80" />
              Running ingestion...
            </>
          ) : (
            'Run Ingestion'
          )}
        </button>
      </div>

      <div className="status-pop mt-5 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-hover)] p-4 text-sm text-[color:var(--text-primary)]">
        <p>{statusMessage || 'Ready to run. The backend handles retry, fallback, and deduplication.'}</p>
        {latest ? (
          <p className="mt-2 text-[color:var(--text-secondary)]">
            Latest run: {latest.status} • fetched {latest.fetchedCount} • inserted {latest.insertedCount} • updated {latest.updatedCount} • failed {latest.failedCount}
          </p>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap gap-3 text-xs text-[color:var(--text-secondary)]">
        <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1.5">Healthy: pulsing dot</span>
        <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1.5">Degraded: static warning dot</span>
        <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1.5">Fallback: truthful message only</span>
      </div>
    </section>
  );
}
