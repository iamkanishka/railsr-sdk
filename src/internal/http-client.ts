/**
 * @internal
 * Core HTTP transport for the Railsr SDK.
 *
 * Responsibilities:
 *   - OAuth 2.0 bearer token injection + auto-refresh
 *   - Idempotency-Key on all mutating requests (POST/PUT/PATCH)
 *   - Full-jitter exponential back-off + configurable retry policy
 *   - Sliding-window circuit breaker
 *   - Client-side token-bucket rate limiter
 *   - Telemetry hook invocation on every attempt
 *   - Structured error mapping (RailsrError)
 */

import { CircuitBreaker, type CircuitBreakerOptions } from "./circuit-breaker.js";
import { RateLimiter } from "./rate-limiter.js";
import { withRetry, type RetryOptions } from "./retry.js";
import { TokenManager } from "./token-manager.js";
import { generateIdempotencyKey } from "./idempotency.js";
import { noopHook, type TelemetryHook } from "./telemetry.js";
import { RailsrError, classifyStatus, isRetryableStatus } from "../types/errors.js";
import type { Environment } from "../types/index.js";

const BASE_URLS: Record<Environment, string> = {
  play: "https://play.railsbank.com",
  play_live: "https://playlive.railsbank.com",
  live: "https://live.railsbank.com",
};

const SDK_VERSION = "1.0.0";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH"]);

export interface HttpClientOptions {
  clientId: string;
  clientSecret: string;
  environment?: Environment;
  userAgent?: string;
  /** AbortSignal for the whole client — all requests honour this. */
  signal?: AbortSignal;
  retry?: RetryOptions;
  circuitBreaker?: CircuitBreakerOptions;
  /** Client-side requests per second cap. Default 50. */
  rateLimitRps?: number;
  onRequest?: TelemetryHook;
  /** Override the underlying fetch implementation (useful for tests). */
  fetchFn?: typeof fetch;
}

/** Per-request overrides. */
export interface RequestOptions {
  /** Override the auto-generated idempotency key. */
  idempotencyKey?: string;
  /** Additional query parameters. */
  query?: Record<string, string | number | boolean | undefined>;
  /** Per-request AbortSignal. */
  signal?: AbortSignal;
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly userAgent: string;
  private readonly tokens: TokenManager;
  private readonly cb: CircuitBreaker;
  private readonly rl: RateLimiter;
  private readonly retryOpts: RetryOptions;
  private readonly hook: TelemetryHook;
  private readonly fetchFn: typeof fetch;
  private readonly clientSignal?: AbortSignal;

  constructor(opts: HttpClientOptions) {
    const env = opts.environment ?? "play";
    const baseUrl = BASE_URLS[env];
    if (!baseUrl) {
      throw RailsrError.validation(`Unknown Railsr environment: "${env}"`);
    }
    this.baseUrl = baseUrl;
    this.userAgent = opts.userAgent ?? `railsr-sdk-ts/${SDK_VERSION}`;
    this.fetchFn = opts.fetchFn ?? globalThis.fetch;
    this.tokens = new TokenManager(
      opts.clientId,
      opts.clientSecret,
      `${baseUrl}/oauth/token`,
      this.fetchFn,
    );
    this.cb = new CircuitBreaker(opts.circuitBreaker);
    this.rl = new RateLimiter(opts.rateLimitRps ?? 50);
    this.retryOpts = opts.retry ?? {};
    this.hook = opts.onRequest ?? noopHook;
    if (opts.signal !== undefined) {
      this.clientSignal = opts.signal;
    }
  }

  /**
   * Execute a Railsr API request, returning the decoded response body.
   * Returns `undefined` when the response has no body (e.g. 204 No Content).
   */
  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    reqOpts: RequestOptions = {},
  ): Promise<T> {
    const signal = mergeSignals(this.clientSignal, reqOpts.signal);

    const idemKey =
      MUTATING_METHODS.has(method.toUpperCase())
        ? (reqOpts.idempotencyKey ?? generateIdempotencyKey())
        : undefined;

    return withRetry(
      async (attempt) => this.attempt<T>(method, path, body, reqOpts.query, idemKey, attempt, signal),
      this.retryOpts,
      signal,
    );
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private async attempt<T>(
    method: string,
    path: string,
    body: unknown,
    query: RequestOptions["query"],
    idemKey: string | undefined,
    attempt: number,
    signal: AbortSignal | undefined,
  ): Promise<T> {
    // 1. Circuit breaker
    this.cb.check();

    // 2. Rate limiter
    this.rl.allow();

    // 3. Bearer token
    let token: string;
    try {
      token = await this.tokens.token(signal);
    } catch (err) {
      if (err instanceof RailsrError) throw err;
      throw RailsrError.network(`Failed to obtain access token: ${String(err)}`, err);
    }

    // 4. Build URL
    const url = buildUrl(this.baseUrl, path, query);

    // 5. Build request
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "User-Agent": this.userAgent,
    };
    if (body !== undefined && body !== null) {
      headers["Content-Type"] = "application/json";
    }
    if (idemKey) {
      headers["Idempotency-Key"] = idemKey;
    }

    const init: RequestInit = {
      method: method.toUpperCase(),
      headers,
      ...(body !== null && body !== undefined ? { body: JSON.stringify(body) } : {}),
      ...(signal !== undefined ? { signal } : {}),
    };

    const start = Date.now();
    let resp: Response;

    try {
      resp = await this.fetchFn(url, init);
    } catch (err) {
      const duration = Date.now() - start;
      const apiErr = RailsrError.network(String(err), err);
      this.cb.recordFailure();
      await this.hook({ method, path, durationMs: duration, attempt, error: apiErr });
      throw apiErr;
    }

    const duration = Date.now() - start;
    const statusCode = resp.status;

    if (statusCode >= 200 && statusCode <= 299) {
      this.cb.recordSuccess();
      await this.hook({ method, path, statusCode, durationMs: duration, attempt });
      return decodeBody<T>(resp);
    }

    // Error path
    const apiErr = await this.buildError(resp, statusCode, attempt);

    if (isRetryableStatus(statusCode)) {
      this.cb.recordFailure();
    }

    await this.hook({ method, path, statusCode, durationMs: duration, attempt, error: apiErr });
    throw apiErr;
  }

  private async buildError(
    resp: Response,
    status: number,
    attempt: number,
  ): Promise<RailsrError> {
    let decoded: Record<string, unknown> = {};
    try {
      decoded = (await resp.json()) as Record<string, unknown>;
    } catch {
      // non-JSON error body
    }

    const message = extractString(decoded, ["message", "error_message", "error"]) ?? "Unknown error";
    const code = extractString(decoded, ["error_code", "code"]) ?? "";
    const requestId = resp.headers.get("X-Request-Id") ?? "";

    const err = new RailsrError({
      type: classifyStatus(status),
      message,
      statusCode: status,
      code,
      requestId,
      details: decoded,
      retryable: isRetryableStatus(status),
    });

    // On the first 401, invalidate the token cache; the retry mechanism will
    // fetch a fresh token automatically.
    if (status === 401 && attempt === 0) {
      this.tokens.invalidate();
      // Note: retryable already set from isRetryableStatus; 401 is handled by token invalidate
    }

    return err;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildUrl(
  base: string,
  path: string,
  query?: Record<string, string | number | boolean | undefined>,
): string {
  const url = new URL(base + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.set(k, String(v));
      }
    }
  }
  return url.toString();
}

async function decodeBody<T>(resp: Response): Promise<T> {
  if (resp.status === 204) return undefined as T;
  const text = await resp.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch (err) {
    throw new RailsrError({
      type: "unknown",
      message: `Failed to decode response body: ${String(err)}`,
      statusCode: resp.status,
      cause: err,
    });
  }
}

function extractString(
  obj: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const k of keys) {
    const val = obj[k];
    if (typeof val === "string" && val !== "") return val;
  }
  return undefined;
}

/** Combine multiple AbortSignals into one (any abort propagates). */
function mergeSignals(...signals: (AbortSignal | undefined)[]): AbortSignal | undefined {
  const active = signals.filter(Boolean) as AbortSignal[];
  if (active.length === 0) return undefined;
  if (active.length === 1) return active[0];
  const controller = new AbortController();
  for (const s of active) {
    if (s.aborted) {
      controller.abort(s.reason);
      break;
    }
    s.addEventListener("abort", () => controller.abort(s.reason), { once: true });
  }
  return controller.signal;
}
