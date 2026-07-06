/**
 * @module errors
 * Structured, typed errors for the Railsr SDK.
 * Every SDK function that can fail throws or rejects with a `RailsrError`.
 */

export type ErrorType =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "unprocessable"
  | "rate_limited"
  | "server_error"
  | "circuit_open"
  | "timeout"
  | "network"
  | "invalid_signature"
  | "validation"
  | "unknown";

export interface RailsrErrorOptions {
  readonly type: ErrorType;
  readonly message: string;
  readonly statusCode?: number;
  readonly code?: string;
  readonly requestId?: string;
  readonly details?: Record<string, unknown>;
  readonly retryable?: boolean;
  readonly cause?: unknown;
}

/**
 * RailsrError is the single error class thrown by all SDK operations.
 *
 * @example
 * ```ts
 * import { RailsrError } from "railsr-sdk";
 *
 * try {
 *   await rails.endusers.get("eu_missing");
 * } catch (err) {
 *   if (err instanceof RailsrError && err.type === "not_found") {
 *     console.log("Enduser does not exist");
 *   }
 * }
 * ```
 */
export class RailsrError extends Error {
  /** Machine-readable error classification. */
  readonly type: ErrorType;
  /** HTTP status code, if applicable (0 for network errors). */
  readonly statusCode: number;
  /** Railsr API error code, e.g. `"ERROR_ENTITY_NOT_FOUND"`. */
  readonly code: string;
  /** `X-Request-Id` header value, useful for support tracing. */
  readonly requestId: string;
  /** Full decoded response body for additional context. */
  readonly details: Record<string, unknown>;
  /** Whether the request is safe to retry. */
  readonly retryable: boolean;
  /** Underlying cause (network error, JSON parse error, etc.). */
  readonly cause?: unknown;

  constructor(opts: RailsrErrorOptions) {
    super(opts.message);
    this.name = "RailsrError";
    this.type = opts.type;
    this.statusCode = opts.statusCode ?? 0;
    this.code = opts.code ?? "";
    this.requestId = opts.requestId ?? "";
    this.details = opts.details ?? {};
    this.retryable = opts.retryable ?? false;
    this.cause = opts.cause;

    // Restore prototype chain for `instanceof` checks after transpilation.
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /** Human-readable representation including error code when present. */
  override toString(): string {
    const codeStr = this.code ? ` [${this.code}]` : "";
    const statusStr = this.statusCode ? ` (status=${this.statusCode})` : "";
    return `RailsrError<${this.type}>${codeStr}: ${this.message}${statusStr}`;
  }

  // ── Sentinel factories ─────────────────────────────────────────────────────

  static unauthorized(
    message = "Unauthorized",
    opts?: Partial<RailsrErrorOptions>,
  ): RailsrError {
    return new RailsrError({
      ...opts,
      type: "unauthorized",
      message,
      statusCode: 401,
    });
  }

  static forbidden(
    message = "Forbidden",
    opts?: Partial<RailsrErrorOptions>,
  ): RailsrError {
    return new RailsrError({
      ...opts,
      type: "forbidden",
      message,
      statusCode: 403,
    });
  }

  static notFound(
    message = "Not found",
    opts?: Partial<RailsrErrorOptions>,
  ): RailsrError {
    return new RailsrError({
      ...opts,
      type: "not_found",
      message,
      statusCode: 404,
    });
  }

  static conflict(
    message = "Conflict",
    opts?: Partial<RailsrErrorOptions>,
  ): RailsrError {
    return new RailsrError({
      ...opts,
      type: "conflict",
      message,
      statusCode: 409,
    });
  }

  static unprocessable(
    message = "Unprocessable entity",
    opts?: Partial<RailsrErrorOptions>,
  ): RailsrError {
    return new RailsrError({
      ...opts,
      type: "unprocessable",
      message,
      statusCode: 422,
    });
  }

  static rateLimited(
    message = "Rate limited",
    opts?: Partial<RailsrErrorOptions>,
  ): RailsrError {
    return new RailsrError({
      ...opts,
      type: "rate_limited",
      message,
      statusCode: 429,
      retryable: true,
    });
  }

  static serverError(
    message = "Internal server error",
    opts?: Partial<RailsrErrorOptions>,
  ): RailsrError {
    return new RailsrError({
      ...opts,
      type: "server_error",
      message,
      retryable: true,
    });
  }

  static circuitOpen(): RailsrError {
    return new RailsrError({
      type: "circuit_open",
      message:
        "Circuit breaker is open; too many recent failures. Try again shortly.",
      retryable: true,
    });
  }

  static network(message: string, cause?: unknown): RailsrError {
    return new RailsrError({
      type: "network",
      message,
      retryable: true,
      cause,
    });
  }

  static invalidSignature(): RailsrError {
    return new RailsrError({
      type: "invalid_signature",
      message: "Webhook signature verification failed.",
    });
  }

  static validation(message: string): RailsrError {
    return new RailsrError({ type: "validation", message });
  }
}

// ── Helper utilities ──────────────────────────────────────────────────────────

/** True if `err` is a RailsrError of the given type. */
export function isRailsrError(
  err: unknown,
  type?: ErrorType,
): err is RailsrError {
  return (
    err instanceof RailsrError && (type === undefined || err.type === type)
  );
}

/** Map an HTTP status code to an ErrorType. */
export function classifyStatus(status: number): ErrorType {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 422) return "unprocessable";
  if (status === 429) return "rate_limited";
  if (status >= 500 && status <= 599) return "server_error";
  return "unknown";
}

/** True if the given HTTP status code is worth retrying. */
export function isRetryableStatus(status: number): boolean {
  return [429, 500, 502, 503, 504].includes(status);
}
