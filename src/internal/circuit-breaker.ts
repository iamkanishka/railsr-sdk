/**
 * @internal
 * Sliding-window circuit breaker.
 *
 * States:
 *   CLOSED   — normal operation; failures are counted.
 *   OPEN     — too many failures; all requests are blocked immediately.
 *   HALF_OPEN — one probe request is allowed; success closes, failure re-opens.
 */

import { RailsrError } from "../types/errors.js";

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerOptions {
  /** Number of failures in the window before the circuit opens. Default 5. */
  threshold?: number;
  /** Duration (ms) the circuit stays OPEN before moving to HALF_OPEN. Default 30_000. */
  resetTimeoutMs?: number;
}

export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failureCount = 0;
  private lastFailureTime = 0;

  private readonly threshold: number;
  private readonly resetTimeoutMs: number;

  constructor(opts: CircuitBreakerOptions = {}) {
    this.threshold = opts.threshold ?? 5;
    this.resetTimeoutMs = opts.resetTimeoutMs ?? 30_000;
  }

  get currentState(): CircuitState {
    return this.state;
  }

  /** Throws RailsrError.circuitOpen() when the circuit is OPEN. */
  check(): void {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = "HALF_OPEN";
        return;
      }
      throw RailsrError.circuitOpen();
    }
  }

  recordSuccess(): void {
    this.failureCount = 0;
    this.state = "CLOSED";
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.threshold) {
      this.state = "OPEN";
    }
  }

  /** Reset to closed state — useful for testing. */
  reset(): void {
    this.state = "CLOSED";
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }
}
