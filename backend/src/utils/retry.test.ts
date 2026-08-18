import { RetryableHttpError, withRetry } from './retry';

describe('withRetry', () => {
  it('retries retryable errors with exponential backoff', async () => {
    const delays: number[] = [];
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout').mockImplementation(((handler: TimerHandler, timeout?: number) => {
      delays.push(timeout ?? 0);
      if (typeof handler === 'function') {
        handler();
      }
      return 0 as unknown as NodeJS.Timeout;
    }) as unknown as typeof setTimeout);

    let attempts = 0;
    const result = await withRetry(
      async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new RetryableHttpError('retry', 500);
        }
        return 'ok';
      },
      { maxRetries: 3, baseDelayMs: 10 }
    );

    expect(result).toBe('ok');
    expect(attempts).toBe(3);
    expect(delays).toEqual([10, 20]);

    setTimeoutSpy.mockRestore();
  });

  it('honors Retry-After when present', async () => {
    const delays: number[] = [];
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout').mockImplementation(((handler: TimerHandler, timeout?: number) => {
      delays.push(timeout ?? 0);
      if (typeof handler === 'function') handler();
      return 0 as unknown as NodeJS.Timeout;
    }) as unknown as typeof setTimeout);

    let attempts = 0;
    const result = await withRetry(
      async () => {
        attempts += 1;
        if (attempts === 1) {
          throw new RetryableHttpError('too many requests', 429, 250);
        }
        return 'done';
      },
      { maxRetries: 2, baseDelayMs: 10 }
    );

    expect(result).toBe('done');
    expect(delays).toEqual([250]);

    setTimeoutSpy.mockRestore();
  });

  it('does not retry non-retryable errors', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    await expect(
      withRetry(async () => {
        throw new Error('bad request');
      }, { maxRetries: 3, baseDelayMs: 10 })
    ).rejects.toThrow('bad request');

    expect(setTimeoutSpy).not.toHaveBeenCalled();
    setTimeoutSpy.mockRestore();
  });
});
