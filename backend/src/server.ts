import { getEnv } from './config/env';
import { createApp } from './app';
import { startIngestionScheduler } from './scheduler/ingestion.scheduler';

function start(): void {
  getEnv();
  const app = createApp();
  const env = getEnv();

  startIngestionScheduler();

  app.listen(env.port, () => {
    console.log(`Backend listening on port ${env.port}`);
  });
}

start();
