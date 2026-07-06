/**
 * @internal
 * Token-bucket client-side rate limiter.
 * Throws RailsrError.rateLimited() when the bucket is empty.
 */

import { RailsrError } from "../types/errors.js";

export class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(private readonly rps: number) {
    this.tokens = rps;
    this.lastRefill = Date.now();
  }

  /** Checks whether a request is allowed; throws if the bucket is empty. */
  allow(): void {
    this.refill();
    if (this.tokens < 1) {
      throw RailsrError.rateLimited(
        `Client-side rate limit exceeded (${this.rps} req/s). Slow down.`,
      );
    }
    this.tokens--;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.rps, this.tokens + elapsed * this.rps);
    this.lastRefill = now;
  }
}
