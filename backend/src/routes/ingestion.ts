import { Router } from 'express';
import { getIngestionRuntimeState, runIngestion, triggerManualIngestion } from '../services/ingestion.service';
import { listRecentRuns } from '../db/repos';

export const ingestionRouter = Router();

ingestionRouter.get('/api/ingestion-runs', async (_req, res) => {
  try {
    const runs = await listRecentRuns(20);
    res.json({
      runs: runs.map((run) => ({
        id: run.id,
        sourceId: run.sourceId,
        status: run.status,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        fetchedCount: run.fetchedCount,
        insertedCount: run.insertedCount,
        updatedCount: run.updatedCount,
        failedCount: run.failedCount,
        errorMessage: run.errorMessage
      }))
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load runs';
    res.status(500).json({ error: message });
  }
});

ingestionRouter.post('/api/ingestion/run', async (_req, res) => {
  try {
    const state = getIngestionRuntimeState();
    if (state.running) {
      res.status(409).json({ error: 'Ingestion is already running' });
      return;
    }

    const result = await triggerManualIngestion();
    if (!result.accepted) {
      res.status(429).json({
        error: 'Manual ingestion cooldown active',
        retryAfterMs: result.retryAfterMs ?? 0
      });
      return;
    }

    res.json({
      run: {
        id: result.outcome?.run.id,
        status: result.outcome?.run.status,
        sourceId: result.outcome?.run.sourceId,
        fetchedCount: result.outcome?.run.fetchedCount,
        insertedCount: result.outcome?.run.insertedCount,
        updatedCount: result.outcome?.run.updatedCount,
        failedCount: result.outcome?.run.failedCount,
        errorMessage: result.outcome?.run.errorMessage
      },
      fallbackUsed: result.outcome?.fallbackUsed ?? false,
      message: result.outcome?.message ?? null
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to run ingestion';
    res.status(500).json({ error: message });
  }
});
