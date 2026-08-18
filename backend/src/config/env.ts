export interface AppEnv {
  port: number;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  remoteOkApiUrl: string;
  arbeitnowApiUrl: string;
  ingestionCron: string;
  maxRetries: number;
  baseRetryDelayMs: number;
  manualIngestionCooldownMs: number;
  frontendOrigin: string;
  nodeEnv: string;
}

let cachedEnv: AppEnv | null = null;

function required(name: string, value: string | undefined): string {
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseNumber(name: string, value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid numeric environment variable ${name}: ${value}`);
  }
  return parsed;
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  return {
    port: parseNumber('PORT', source.PORT, 3001),
    supabaseUrl: required('SUPABASE_URL', source.SUPABASE_URL),
    supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY', source.SUPABASE_SERVICE_ROLE_KEY),
    remoteOkApiUrl: source.REMOTE_OK_API_URL?.trim() || 'https://remoteok.com/api',
    arbeitnowApiUrl: source.ARBEITNOW_API_URL?.trim() || 'https://www.arbeitnow.com/api/job-board-api',
    ingestionCron: source.INGESTION_CRON?.trim() || '0 * * * *',
    maxRetries: parseNumber('MAX_RETRIES', source.MAX_RETRIES, 3),
    baseRetryDelayMs: parseNumber('BASE_RETRY_DELAY_MS', source.BASE_RETRY_DELAY_MS, 1000),
    manualIngestionCooldownMs: parseNumber(
      'MANUAL_INGESTION_COOLDOWN_MS',
      source.MANUAL_INGESTION_COOLDOWN_MS,
      300000
    ),
    frontendOrigin: source.FRONTEND_ORIGIN?.trim() || 'http://localhost:3000',
    nodeEnv: source.NODE_ENV?.trim() || 'development'
  };
}

export function getEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  if (!cachedEnv) {
    cachedEnv = loadEnv(source);
  }
  return cachedEnv;
}
