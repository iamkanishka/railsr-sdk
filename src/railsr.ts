/**
 * @module railsr-sdk
 * Root Railsr SDK client.
 *
 * @example
 * ```ts
 * import { Railsr } from "railsr-sdk";
 *
 * const rails = new Railsr({
 *   clientId: process.env.RAILSR_CLIENT_ID!,
 *   clientSecret: process.env.RAILSR_CLIENT_SECRET!,
 *   environment: "live",
 * });
 *
 * // Create an enduser
 * const eu = await rails.endusers.create({
 *   person: {
 *     name: { family_name: "Smith", given_name: "Alice" },
 *     email: "alice@example.com",
 *     date_of_birth: "1990-01-15",
 *     nationality: "GB",
 *   },
 * });
 *
 * // Open a GBP ledger for that enduser
 * const ledger = await rails.ledgers.create({
 *   holder_id: eu.enduser_id,
 *   ledger_type: "standard-gbp",
 *   asset_class: "currency",
 *   asset_type: "gbp",
 * });
 * ```
 */

import { HttpClient, type HttpClientOptions } from "./internal/http-client.js";
import { EndusersService } from "./resources/endusers.js";
import { LedgersService } from "./resources/ledgers.js";
import { TransactionsService } from "./resources/transactions.js";
import { BeneficiariesService } from "./resources/beneficiaries.js";
import { CardsService } from "./resources/cards.js";
import { MandatesService, PaymentsService } from "./resources/mandates.js";
import { FirewallService } from "./resources/firewall.js";
import { WebhooksService } from "./resources/webhooks.js";
import { CustomerService } from "./resources/customer.js";
import type { Environment } from "./types/index.js";
import type { TelemetryHook } from "./internal/telemetry.js";
import type { RetryOptions } from "./internal/retry.js";
import type { CircuitBreakerOptions } from "./internal/circuit-breaker.js";

// ── Client options ─────────────────────────────────────────────────────────────

export interface RailsrOptions {
  /** Railsr OAuth 2.0 client ID. */
  clientId: string;
  /** Railsr OAuth 2.0 client secret. */
  clientSecret: string;
  /**
   * Target environment.
   * - `"play"`      — Sandbox (fake money). Default.
   * - `"play_live"` — Staging (real money, real rails).
   * - `"live"`      — Full production.
   */
  environment?: Environment;
  /** Override the `User-Agent` header sent with every request. */
  userAgent?: string;
  /**
   * Global AbortSignal. When aborted, all in-flight requests are cancelled.
   * Useful for graceful shutdown.
   */
  signal?: AbortSignal;
  /** Retry policy. Defaults: maxRetries=3, baseBackoffMs=200, maxBackoffMs=10_000. */
  retry?: RetryOptions;
  /** Circuit breaker configuration. Defaults: threshold=5, resetTimeoutMs=30_000. */
  circuitBreaker?: CircuitBreakerOptions;
  /** Client-side requests-per-second cap. Default 50. */
  rateLimitRps?: number;
  /**
   * Telemetry hook invoked after every HTTP attempt.
   * Use this to record latency, errors, and retry counts in your observability stack.
   */
  onRequest?: TelemetryHook;
  /**
   * Custom `fetch` implementation. Defaults to `globalThis.fetch`.
   * Useful for injecting middleware (e.g. `node-fetch`, test mocks).
   */
  fetchFn?: typeof fetch;
}

// ── Root SDK class ─────────────────────────────────────────────────────────────

export class Railsr {
  /** Person and company enduser CRUD + KYC. */
  readonly endusers: EndusersService;

  /** GBP, EUR, and virtual ledger management. */
  readonly ledgers: LedgersService;

  /** Send money, inter-ledger, FX, quarantine. */
  readonly transactions: TransactionsService;

  /** External payee CRUD + Confirmation of Payee. */
  readonly beneficiaries: BeneficiariesService;

  /** Virtual/physical card lifecycle, rules, programmes, and digital wallets. */
  readonly cards: CardsService;

  /** BACS Direct Debit mandate lifecycle. */
  readonly mandates: MandatesService;

  /** Direct Debit payment collection. */
  readonly payments: PaymentsService;

  /** Compliance firewall rules and datasets. */
  readonly firewall: FirewallService;

  /** Webhook configuration, delivery history, and signature verification. */
  readonly webhooks: WebhooksService;

  /** Authenticated customer account. */
  readonly customer: CustomerService;

  /** The underlying HTTP client (advanced use: custom requests). */
  readonly http: HttpClient;

  constructor(opts: RailsrOptions) {
    if (!opts.clientId) throw new Error("railsr-sdk: clientId is required");
    if (!opts.clientSecret)
      throw new Error("railsr-sdk: clientSecret is required");

    const httpOpts: HttpClientOptions = {
      clientId: opts.clientId,
      clientSecret: opts.clientSecret,
      environment: opts.environment ?? "play",
      ...(opts.userAgent !== undefined ? { userAgent: opts.userAgent } : {}),
      ...(opts.signal !== undefined ? { signal: opts.signal } : {}),
      ...(opts.retry !== undefined ? { retry: opts.retry } : {}),
      ...(opts.circuitBreaker !== undefined
        ? { circuitBreaker: opts.circuitBreaker }
        : {}),
      ...(opts.rateLimitRps !== undefined
        ? { rateLimitRps: opts.rateLimitRps }
        : {}),
      ...(opts.onRequest !== undefined ? { onRequest: opts.onRequest } : {}),
      ...(opts.fetchFn !== undefined ? { fetchFn: opts.fetchFn } : {}),
    };

    this.http = new HttpClient(httpOpts);

    this.endusers = new EndusersService(this.http);
    this.ledgers = new LedgersService(this.http);
    this.transactions = new TransactionsService(this.http);
    this.beneficiaries = new BeneficiariesService(this.http);
    this.cards = new CardsService(this.http);
    this.mandates = new MandatesService(this.http);
    this.payments = new PaymentsService(this.http);
    this.firewall = new FirewallService(this.http);
    this.webhooks = new WebhooksService(this.http);
    this.customer = new CustomerService(this.http);
  }
}
