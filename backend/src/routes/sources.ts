import { Router } from 'express';
import { listSources } from '../db/repos';

export const sourcesRouter = Router();

sourcesRouter.get('/api/sources', async (_req, res) => {
  try {
    const sources = await listSources();
    res.json({
      sources: sources.map((source) => ({
        id: source.id,
        name: source.name,
        baseUrl: source.baseUrl,
        type: source.type,
        status: source.status,
        lastSuccessAt: source.lastSuccessAt,
        lastFailureAt: source.lastFailureAt,
        consecutiveFailures: source.consecutiveFailures,
        createdAt: source.createdAt,
        updatedAt: source.updatedAt
      }))
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load sources';
    res.status(500).json({ error: message });
  }
});
