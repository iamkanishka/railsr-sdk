/**
 * @module resources/webhooks
 * Railsr Webhook / Notification API — configuration, delivery history,
 * retry, and HMAC-SHA256 signature verification.
 */

import { createHmac, timingSafeEqual } from "crypto";
import type { HttpClient, RequestOptions } from "../internal/http-client.js";
import type {
  WebhookConfig,
  WebhookEvent,
  PaginationParams,
} from "../types/index.js";
import { RailsrError } from "../types/errors.js";
import { buildPaginationQuery } from "./endusers.js";

// ── Request param types ────────────────────────────────────────────────────────

export interface ConfigureWebhookParams {
  url: string;
  secret: string;
}

export interface ListWebhookHistoryParams extends PaginationParams {
  from?: string;
  to?: string;
  type?: string;
  /** "delivered" | "failed" | "pending" */
  status?: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class WebhooksService {
  constructor(private readonly http: HttpClient) {}

  // ── Configuration ──────────────────────────────────────────────────────────

  /**
   * Create or update the webhook endpoint.
   * POST /v1/customer/notifications/enduser
   */
  async configure(
    params: ConfigureWebhookParams,
    opts?: RequestOptions,
  ): Promise<WebhookConfig> {
    return this.http.request<WebhookConfig>(
      "POST",
      "/v1/customer/notifications/enduser",
      params,
      opts,
    );
  }

  /**
   * Retrieve the current webhook configuration.
   * GET /v1/customer/notifications/enduser
   */
  async getConfig(opts?: RequestOptions): Promise<WebhookConfig> {
    return this.http.request<WebhookConfig>(
      "GET",
      "/v1/customer/notifications/enduser",
      undefined,
      opts,
    );
  }

  // ── History ────────────────────────────────────────────────────────────────

  /**
   * Retrieve webhook delivery history (up to 90 days).
   * GET /v1/customer/notifications/history
   */
  async listHistory(
    params?: ListWebhookHistoryParams,
    opts?: RequestOptions,
  ): Promise<WebhookEvent[]> {
    return this.http.request<WebhookEvent[]>(
      "GET",
      "/v1/customer/notifications/history",
      undefined,
      {
        ...opts,
        query: buildPaginationQuery(params as Record<string, unknown>),
      },
    );
  }

  /**
   * Re-deliver a specific notification.
   * POST /v1/customer/notifications/:id/retry
   */
  async retry(
    notificationID: string,
    opts?: RequestOptions,
  ): Promise<WebhookEvent> {
    return this.http.request<WebhookEvent>(
      "POST",
      `/v1/customer/notifications/${notificationID}/retry`,
      {},
      opts,
    );
  }
}

// ── Signature verification ─────────────────────────────────────────────────────

/**
 * Verify the HMAC-SHA256 signature on an incoming Railsr webhook.
 *
 * Uses constant-time comparison (`timingSafeEqual`) to prevent timing attacks.
 *
 * @param rawBody  - Raw request body buffer (e.g. from `req.rawBody` or `Buffer.from(body)`)
 * @param signature - Value of the `X-Railsr-Signature` header (hex string)
 * @param secret   - Webhook signing secret configured via `webhooks.configure()`
 * @throws {RailsrError} with type `"invalid_signature"` on mismatch
 *
 * @example
 * ```ts
 * import { verifyWebhookSignature } from "railsr-sdk";
 *
 * app.post("/webhook", express.raw({ type: "*\/\*" }), (req, res) => {
 *   verifyWebhookSignature(
 *     req.body,
 *     req.headers["x-railsr-signature"] as string,
 *     process.env.RAILSR_WEBHOOK_SECRET!,
 *   );
 *   // body is authentic — process the event
 *   res.sendStatus(200);
 * });
 * ```
 */
export function verifyWebhookSignature(
  rawBody: Buffer | string,
  signature: string,
  secret: string,
): void {
  if (!signature) throw RailsrError.invalidSignature();

  const buf = typeof rawBody === "string" ? Buffer.from(rawBody) : rawBody;
  const expected = createHmac("sha256", secret).update(buf).digest("hex");

  let sigBuf: Buffer;
  let expBuf: Buffer;
  try {
    sigBuf = Buffer.from(signature.toLowerCase(), "hex");
    expBuf = Buffer.from(expected, "hex");
  } catch {
    throw RailsrError.invalidSignature();
  }

  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    throw RailsrError.invalidSignature();
  }
}

/**
 * Compute the expected HMAC-SHA256 hex digest for a given body + secret.
 * Intended for use in tests / generating test payloads.
 */
export function computeWebhookSignature(
  rawBody: Buffer | string,
  secret: string,
): string {
  const buf = typeof rawBody === "string" ? Buffer.from(rawBody) : rawBody;
  return createHmac("sha256", secret).update(buf).digest("hex");
}

// ── Event type catalogue ──────────────────────────────────────────────────────

export const WEBHOOK_EVENT_TYPES = [
  // Enduser
  "enduser-created",
  "enduser-updated",
  "enduser-activated",
  "enduser-suspended",
  "enduser-kyc-passed",
  "enduser-kyc-failed",
  "enduser-kyc-referred",
  // Ledger
  "ledger-created",
  "ledger-updated",
  "ledger-activated",
  // Transaction
  "transaction-pending",
  "transaction-processing",
  "transaction-accepted",
  "transaction-failed",
  "transaction-quarantined",
  "transaction-quarantine-resolved",
  // Card
  "card-created",
  "card-status-changed",
  "card-authorisation",
  "card-authorisation-declined",
  "card-transaction",
  "card-replacement-pending",
  // Beneficiary
  "beneficiary-created",
  "beneficiary-updated",
  "beneficiary-kyc-passed",
  "beneficiary-kyc-failed",
  // Direct Debit
  "mandate-created",
  "mandate-activated",
  "mandate-cancelled",
  "mandate-failed",
  "payment-collected",
  "payment-failed",
  "payment-cancelled",
  // FX
  "fx-rate-updated",
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];
