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
    <section className="rounded-3xl border border-white/10 bg-white/6 p-5 shadow-glow backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">Ingestion</h2>
          <p className="mt-1 text-2xl font-semibold text-white">Run ingestion now</p>
        </div>
        <button
          type="button"
          onClick={onRun}
          disabled={loading}
          className="rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Running...' : 'Run Ingestion'}
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-200">
        <p>{statusMessage || 'Ready to run. The backend handles retry, fallback, and deduplication.'}</p>
        {latest ? (
          <p className="mt-2 text-slate-400">
            Latest run: {latest.status} • fetched {latest.fetchedCount} • inserted {latest.insertedCount} • updated {latest.updatedCount} • failed {latest.failedCount}
          </p>
        ) : null}
      </div>

      <div className="mt-4 space-y-2">
        {runs.slice(0, 5).map((run) => (
          <div key={run.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm">
            <div>
              <p className="font-medium text-white">{run.status}</p>
              <p className="text-slate-400">{new Date(run.startedAt).toLocaleString()}</p>
            </div>
            <div className="text-right text-slate-300">
              <p>{run.fetchedCount} fetched</p>
              <p>{run.failedCount} failed</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
