import { getSourceById, updateSourceHealth } from '../db/repos';
import type { SourceRecord, SourceStatus } from '../types/job';

const DEGRADE_THRESHOLD = 3;

function utcNow(): string {
  return new Date().toISOString();
}

export async function recordSourceSuccess(sourceId: string): Promise<SourceRecord | null> {
  const source = await getSourceById(sourceId);
  if (!source) return null;

  await updateSourceHealth(sourceId, {
    status: 'HEALTHY',
    consecutiveFailures: 0,
    lastSuccessAt: utcNow()
  });

  return {
    ...source,
    status: 'HEALTHY',
    consecutiveFailures: 0,
    lastSuccessAt: utcNow(),
    updatedAt: utcNow()
  };
}

export async function recordSourceFailure(sourceId: string): Promise<SourceRecord | null> {
  const source = await getSourceById(sourceId);
  if (!source) return null;

  const nextFailures = source.consecutiveFailures + 1;
  const status: SourceStatus = nextFailures >= DEGRADE_THRESHOLD ? 'DEGRADED' : source.status;
  const now = utcNow();

  await updateSourceHealth(sourceId, {
    status,
    consecutiveFailures: nextFailures,
    lastFailureAt: now
  });

  return {
    ...source,
    status,
    consecutiveFailures: nextFailures,
    lastFailureAt: now,
    updatedAt: now
  };
}
