import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health';
import { jobsRouter } from './routes/jobs';
import { sourcesRouter } from './routes/sources';
import { ingestionRouter } from './routes/ingestion';
import { getEnv } from './config/env';

export function createApp() {
  const env = getEnv();
  const app = express();

  app.use(express.json({ limit: '1mb' }));
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          callback(null, true);
          return;
        }

        const allowed = new Set(['http://localhost:3000', 'http://127.0.0.1:3000', env.frontendOrigin]);
        if (env.nodeEnv !== 'production' || allowed.has(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error('CORS blocked'));
      }
    })
  );

  app.use(healthRouter);
  app.use(jobsRouter);
  app.use(sourcesRouter);
  app.use(ingestionRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}
