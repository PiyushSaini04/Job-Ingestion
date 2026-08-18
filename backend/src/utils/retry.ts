export class RetryableHttpError extends Error {
  statusCode: number;
  retryAfterMs: number | null;

  constructor(message: string, statusCode: number, retryAfterMs: number | null = null) {
    super(message);
    this.name = 'RetryableHttpError';
    this.statusCode = statusCode;
    this.retryAfterMs = retryAfterMs;
  }
}

export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void | Promise<void>;
}

const retryableStatuses = new Set([429, 500, 502, 503, 504]);

export function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000);
  }

  const dateMs = Date.parse(header);
  if (Number.isNaN(dateMs)) return null;
  return Math.max(0, dateMs - Date.now());
}

export function isRetryableError(error: unknown): error is RetryableHttpError {
  return error instanceof RetryableHttpError || (error instanceof Error && /timeout|network|fetch/i.test(error.message));
}

function computeDelay(baseDelayMs: number, attempt: number): number {
  return Math.min(30000, baseDelayMs * 2 ** attempt);
}

export async function withRetry<T>(operation: () => Promise<T>, options: RetryOptions): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= options.maxRetries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const retryable =
        error instanceof RetryableHttpError
          ? retryableStatuses.has(error.statusCode)
          : isRetryableError(error);

      if (!retryable || attempt === options.maxRetries) {
        throw error;
      }

      const retryAfterMs = error instanceof RetryableHttpError ? error.retryAfterMs : null;
      const delayMs = retryAfterMs ?? computeDelay(options.baseDelayMs, attempt);
      await options.onRetry?.(attempt + 1, error, delayMs);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}
