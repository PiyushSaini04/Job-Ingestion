"use client";

import { useEffect, useState } from 'react';
import { IngestionHistory } from '../../components/IngestionHistory';
import { IngestionStatus } from '../../components/IngestionStatus';
import { SourceStatus } from '../../components/SourceStatus';
import { getIngestionRuns, getSources, runIngestion, type IngestionRunRecord, type SourceStatusRecord } from '../../lib/api';

export function StatusClient() {
  const [sources, setSources] = useState<SourceStatusRecord[]>([]);
  const [runs, setRuns] = useState<IngestionRunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningIngestion, setRunningIngestion] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setLoading(true);
      setError(null);
      const [sourceResponse, runResponse] = await Promise.all([getSources(), getIngestionRuns()]);
      setSources(sourceResponse.sources);
      setRuns(runResponse.runs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load status data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleRun() {
    setRunningIngestion(true);
    setStatusMessage(null);
    try {
      const result = await runIngestion();
      const counts = result.run;
      setStatusMessage(
        result.fallbackUsed
          ? `Fallback used. Fetched ${counts.fetchedCount ?? 0}, inserted ${counts.insertedCount ?? 0}, updated ${counts.updatedCount ?? 0}.`
          : `Run complete. Fetched ${counts.fetchedCount ?? 0}, inserted ${counts.insertedCount ?? 0}, updated ${counts.updatedCount ?? 0}.`
      );
      await refresh();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Unable to run ingestion');
    } finally {
      setRunningIngestion(false);
    }
  }

  return (
    <main className="page-enter space-y-6 pb-16">
      <section className="ui-card rounded-[2rem] p-6 sm:p-8">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.42em] text-[color:var(--accent)]">System Status</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-[color:var(--text-primary)] sm:text-5xl">
            See the sources, recent ingestion runs, and manual run controls in one place.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-[color:var(--text-secondary)]">
            The backend contract stays the same. This page simply gives the resilience and ingestion story its own room.
          </p>
        </div>
      </section>

      {error ? (
        <section className="ui-card rounded-[1.5rem] border-[color:color-mix(in_srgb,var(--danger)_20%,var(--border))] bg-[color:color-mix(in_srgb,var(--danger)_8%,transparent)] p-5 text-[color:var(--text-primary)]">
          {error}
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_1.05fr]">
        <div className="space-y-6">
          {loading ? (
            <div className="ui-card rounded-[1.75rem] p-5 sm:p-6">
              <div className="space-y-4">
                <div className="h-6 w-52 rounded-full skeleton" />
                <div className="h-4 w-80 rounded-full skeleton" />
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                  <div className="h-32 rounded-[1.35rem] skeleton" />
                  <div className="h-32 rounded-[1.35rem] skeleton" />
                </div>
              </div>
              <span className="sr-only">Loading system status...</span>
            </div>
          ) : (
            <SourceStatus sources={sources} />
          )}

          <IngestionStatus runs={runs} loading={runningIngestion} onRun={handleRun} statusMessage={statusMessage} />
        </div>

        <IngestionHistory runs={runs} />
      </div>
    </main>
  );
}
