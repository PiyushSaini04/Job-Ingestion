import { SourceStatusRecord } from '../lib/api';

interface Props {
  sources: SourceStatusRecord[];
}

export function SourceStatus({ sources }: Props) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/6 p-5 shadow-glow backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">Source Status</h2>
        <span className="text-xs text-slate-400">Live</span>
      </div>
      <div className="space-y-3">
        {sources.map((source) => (
          <div key={source.id} className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={[
                    'h-2.5 w-2.5 rounded-full',
                    source.status === 'HEALTHY'
                      ? 'bg-emerald-400'
                      : source.status === 'DEGRADED'
                        ? 'bg-amber-400'
                        : 'bg-slate-500'
                  ].join(' ')}
                />
                <p className="font-medium text-white">{source.name}</p>
              </div>
              <p className="mt-1 text-sm text-slate-400">
                {source.status} {source.status === 'DEGRADED' ? `• ${source.consecutiveFailures} failures` : ''}
              </p>
            </div>
            <div className="text-right text-xs text-slate-400">
              <p>Last success</p>
              <p className="text-slate-200">{source.lastSuccessAt ? new Date(source.lastSuccessAt).toLocaleString() : 'Not provided'}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
