import cron from 'node-cron';
import { getEnv } from '../config/env';
import { runIngestion } from '../services/ingestion.service';

export function startIngestionScheduler(): void {
  const env = getEnv();
  cron.schedule(env.ingestionCron, async () => {
    try {
      console.log(`[scheduler] ingestion tick at ${new Date().toISOString()}`);
      await runIngestion();
    } catch (error) {
      console.error('[scheduler] ingestion failed', error);
    }
  });
}
