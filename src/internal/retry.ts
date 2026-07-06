/**
 * @internal
 * Full-jitter exponential back-off retry policy.
 *
 * Implements the algorithm described by AWS:
 *   sleep = random_between(0, min(cap, base * 2 ** attempt))
 */

import { RailsrError } from "../types/errors.js";

export interface RetryOptions {
  maxRetries?: number;
  baseBackoffMs?: number;
  maxBackoffMs?: number;
}

/** sleep for `ms` milliseconds, honouring an AbortSignal. */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new RailsrError({ type: "network", message: "Request aborted" }));
      return;
    }
    const id = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(id);
      reject(new RailsrError({ type: "network", message: "Request aborted" }));
    });
  });
}

/** Full-jitter backoff: `rand(0, min(cap, base * 2^attempt))` */
function jitter(attempt: number, baseMs: number, capMs: number): number {
  const ceiling = Math.min(capMs, baseMs * Math.pow(2, attempt));
  return Math.random() * ceiling;
}

/**
 * Execute `fn`, retrying on retryable RailsrErrors up to `maxRetries` times.
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: RetryOptions = {},
  signal?: AbortSignal,
): Promise<T> {
  const maxRetries = opts.maxRetries ?? 3;
  const baseMs = opts.baseBackoffMs ?? 200;
  const capMs = opts.maxBackoffMs ?? 10_000;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (signal?.aborted) {
      throw new RailsrError({ type: "network", message: "Request aborted" });
    }
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      const isRetryable = err instanceof RailsrError && err.retryable;
      if (!isRetryable || attempt === maxRetries) throw err;
      const delay = jitter(attempt, baseMs, capMs);
      await sleep(delay, signal);
    }
  }
  throw lastErr;
}
