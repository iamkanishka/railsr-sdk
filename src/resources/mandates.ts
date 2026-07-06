/**
 * @module resources/mandates
 * Railsr BACS Direct Debit — mandate lifecycle + payment collection.
 */

import type { HttpClient, RequestOptions } from "../internal/http-client.js";
import type { Mandate, Payment, PaginationParams } from "../types/index.js";
import { RailsrError } from "../types/errors.js";
import { buildPaginationQuery, sleep } from "./endusers.js";

// ── Mandate request param types ────────────────────────────────────────────────

export interface CreateMandateParams {
  enduser_id: string;
  ledger_id: string;
  account_number: string;
  sort_code: string;
  account_holder_name: string;
  reference?: string;
  metadata?: Record<string, unknown>;
}

export interface ListMandatesParams extends PaginationParams {
  enduser_id?: string;
  status?: string;
}

export interface WaitForMandateActiveOptions {
  /** Default 600_000 ms (10 min) — BACS takes 3-5 days in production. */
  timeoutMs?: number;
  pollIntervalMs?: number;
}

// ── Payment request param types ────────────────────────────────────────────────

export interface CreatePaymentParams {
  mandate_id: string;
  amount: number;
  reason?: string;
  /** ISO 8601 date string YYYY-MM-DD */
  collection_date?: string;
  metadata?: Record<string, unknown>;
}

export interface ListPaymentsParams extends PaginationParams {
  mandate_id?: string;
  status?: string;
}

// ── MandatesService ────────────────────────────────────────────────────────────

export class MandatesService {
  constructor(private readonly http: HttpClient) {}

  /**
   * Create a new BACS Direct Debit mandate.
   * POST /v1/customer/payment/mandates
   */
  async create(params: CreateMandateParams, opts?: RequestOptions): Promise<Mandate> {
    return this.http.request<Mandate>(
      "POST",
      "/v1/customer/payment/mandates",
      params,
      opts,
    );
  }

  /**
   * Retrieve a mandate by ID.
   * GET /v1/customer/payment/mandates/:id
   */
  async get(mandateID: string, opts?: RequestOptions): Promise<Mandate> {
    return this.http.request<Mandate>(
      "GET",
      `/v1/customer/payment/mandates/${mandateID}`,
      undefined,
      opts,
    );
  }

  /**
   * List mandates with optional filters.
   * GET /v1/customer/payment/mandates
   */
  async list(params?: ListMandatesParams, opts?: RequestOptions): Promise<Mandate[]> {
    return this.http.request<Mandate[]>(
      "GET",
      "/v1/customer/payment/mandates",
      undefined,
      { ...opts, query: buildPaginationQuery(params as Record<string, unknown>) },
    );
  }

  /**
   * Cancel an active mandate.
   * POST /v1/customer/payment/mandates/:id/cancel
   */
  async cancel(mandateID: string, opts?: RequestOptions): Promise<Mandate> {
    return this.http.request<Mandate>(
      "POST",
      `/v1/customer/payment/mandates/${mandateID}/cancel`,
      {},
      opts,
    );
  }

  /**
   * Poll until the mandate is `"active"` or a terminal status is reached.
   * Returns an error immediately if the mandate enters `"cancelled"` or `"failed"`.
   */
  async waitForActive(
    mandateID: string,
    opts: WaitForMandateActiveOptions = {},
  ): Promise<Mandate> {
    const { timeoutMs = 600_000, pollIntervalMs = 5_000 } = opts;
    const deadline = Date.now() + timeoutMs;

    for (;;) {
      const mandate = await this.get(mandateID);
      if (mandate.status === "active") return mandate;
      if (mandate.status === "cancelled" || mandate.status === "failed") {
        throw RailsrError.validation(
          `Mandate ${mandateID} reached terminal status "${mandate.status}"`,
        );
      }
      if (Date.now() >= deadline) {
        throw RailsrError.validation(
          `waitForActive timed out after ${timeoutMs}ms; last status="${mandate.status}"`,
        );
      }
      await sleep(pollIntervalMs);
    }
  }
}

// ── PaymentsService ────────────────────────────────────────────────────────────

export class PaymentsService {
  constructor(private readonly http: HttpClient) {}

  /**
   * Initiate a Direct Debit collection using an active mandate.
   * POST /v1/customer/payment
   */
  async create(params: CreatePaymentParams, opts?: RequestOptions): Promise<Payment> {
    return this.http.request<Payment>("POST", "/v1/customer/payment", params, opts);
  }

  /**
   * Retrieve a payment by ID.
   * GET /v1/customer/payment/:id
   */
  async get(paymentID: string, opts?: RequestOptions): Promise<Payment> {
    return this.http.request<Payment>(
      "GET",
      `/v1/customer/payment/${paymentID}`,
      undefined,
      opts,
    );
  }

  /**
   * List payments, optionally filtered by mandate.
   * GET /v1/customer/payment
   */
  async list(params?: ListPaymentsParams, opts?: RequestOptions): Promise<Payment[]> {
    return this.http.request<Payment[]>("GET", "/v1/customer/payment", undefined, {
      ...opts,
      query: buildPaginationQuery(params as Record<string, unknown>),
    });
  }
}
