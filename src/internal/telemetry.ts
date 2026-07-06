/**
 * @module telemetry
 * Pluggable telemetry / observability hook.
 *
 * Pass a `TelemetryHook` to `new Railsr({ ..., onRequest })` to collect
 * latency, error rates, and retry counts for every SDK request.
 *
 * @example
 * ```ts
 * const rails = new Railsr({
 *   clientId: "...",
 *   clientSecret: "...",
 *   onRequest: (event) => {
 *     metrics.histogram("railsr.request.duration", event.durationMs, {
 *       method: event.method,
 *       path: event.path,
 *       status: String(event.statusCode ?? 0),
 *     });
 *   },
 * });
 * ```
 */

import type { RailsrError } from "../types/errors.js";

export interface TelemetryEvent {
  /** HTTP method (GET, POST, etc.) */
  readonly method: string;
  /** API path (e.g. `/v2/endusers`) */
  readonly path: string;
  /** HTTP status code; undefined on network errors. */
  readonly statusCode?: number;
  /** Round-trip duration in milliseconds. */
  readonly durationMs: number;
  /** 0-based attempt index (0 = first attempt, 1 = first retry, …). */
  readonly attempt: number;
  /** Error if the request failed; undefined on success. */
  readonly error?: RailsrError;
}

/** Synchronous or async callback invoked after every HTTP attempt. */
export type TelemetryHook = (event: TelemetryEvent) => void | Promise<void>;

/** No-operation hook — the default when none is supplied. */
export const noopHook: TelemetryHook = () => undefined;
