import { IngestionRunRecord } from '../lib/api';
import { formatDate } from '../lib/text';

interface Props {
  runs: IngestionRunRecord[];
}

function statusTone(status: IngestionRunRecord['status']) {
  if (status === 'SUCCESS') return 'text-[color:var(--success)]';
  if (status === 'PARTIAL') return 'text-[color:var(--warning)]';
  return 'text-[color:var(--danger)]';
}

export function IngestionHistory({ runs }: Props) {
  return (
    <section className="ui-card rounded-[1.75rem] p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.32em] text-[color:var(--text-secondary)]">
            Ingestion History
          </h2>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-[color:var(--text-primary)]">
            Recent runs
          </p>
        </div>
        <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-hover)] px-3 py-1 text-xs text-[color:var(--text-secondary)]">
          Last 20 runs
        </span>
      </div>

      {runs.length === 0 ? (
        <div className="rounded-[1.35rem] border border-[color:var(--border)] bg-[color:var(--surface-hover)] p-5 text-sm text-[color:var(--text-secondary)]">
          No ingestion runs yet.
        </div>
      ) : null}

      {runs.length > 0 ? (
        <>
          <div className="hidden overflow-hidden rounded-[1.25rem] border border-[color:var(--border)] md:block">
            <table className="min-w-full divide-y divide-[color:var(--border)]">
              <thead className="bg-[color:var(--surface-hover)] text-left text-xs uppercase tracking-[0.28em] text-[color:var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Started</th>
                  <th className="px-4 py-3">Completed</th>
                  <th className="px-4 py-3">Fetched</th>
                  <th className="px-4 py-3">Inserted</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3">Failed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)] bg-[color:var(--surface)]">
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td className={`px-4 py-4 text-sm font-semibold ${statusTone(run.status)}`}>{run.status}</td>
                    <td className="px-4 py-4 text-sm text-[color:var(--text-primary)]">{formatDate(run.startedAt)}</td>
                    <td className="px-4 py-4 text-sm text-[color:var(--text-secondary)]">
                      {run.completedAt ? formatDate(run.completedAt) : 'Running'}
                    </td>
                    <td className="px-4 py-4 text-sm text-[color:var(--text-primary)]">{run.fetchedCount}</td>
                    <td className="px-4 py-4 text-sm text-[color:var(--text-primary)]">{run.insertedCount}</td>
                    <td className="px-4 py-4 text-sm text-[color:var(--text-primary)]">{run.updatedCount}</td>
                    <td className="px-4 py-4 text-sm text-[color:var(--text-primary)]">{run.failedCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {runs.map((run) => (
              <article key={run.id} className="rounded-[1.35rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className={`text-sm font-semibold ${statusTone(run.status)}`}>{run.status}</p>
                    <p className="mt-1 text-xs text-[color:var(--text-secondary)]">{formatDate(run.startedAt)}</p>
                  </div>
                  <p className="text-xs text-[color:var(--text-secondary)]">
                    {run.completedAt ? formatDate(run.completedAt) : 'Running'}
                  </p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <p className="rounded-2xl bg-[color:var(--surface-hover)] px-3 py-2 text-[color:var(--text-primary)]">
                    Fetched: {run.fetchedCount}
                  </p>
                  <p className="rounded-2xl bg-[color:var(--surface-hover)] px-3 py-2 text-[color:var(--text-primary)]">
                    Inserted: {run.insertedCount}
                  </p>
                  <p className="rounded-2xl bg-[color:var(--surface-hover)] px-3 py-2 text-[color:var(--text-primary)]">
                    Updated: {run.updatedCount}
                  </p>
                  <p className="rounded-2xl bg-[color:var(--surface-hover)] px-3 py-2 text-[color:var(--text-primary)]">
                    Failed: {run.failedCount}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
