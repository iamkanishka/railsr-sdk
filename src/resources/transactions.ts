/**
 * @module resources/transactions
 * Railsr Transaction API — send money, inter-ledger, FX, quarantine management.
 */

import type { HttpClient, RequestOptions } from "../internal/http-client.js";
import type { Transaction, PaginationParams, PaymentType } from "../types/index.js";
import { RailsrError } from "../types/errors.js";
import { buildPaginationQuery, sleep } from "./endusers.js";

// ── Request param types ────────────────────────────────────────────────────────

export interface SendMoneyParams {
  ledger_id: string;
  beneficiary_id: string;
  amount: number;
  currency: string;
  payment_type: PaymentType;
  reason?: string;
  reference?: string;
  metadata?: Record<string, unknown>;
}

export interface InterLedgerParams {
  source_ledger_id: string;
  destination_ledger_id: string;
  amount: number;
  currency: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface FXParams {
  source_ledger_id: string;
  destination_ledger_id: string;
  amount: number;
  /** Whether the `amount` is on the source or destination side. */
  fixed_side: "source" | "destination";
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface ResolveQuarantineParams {
  resolution: "approve" | "reject";
  reason?: string;
}

export interface ListTransactionsParams extends PaginationParams {
  /** When set, scopes the list to a single ledger. */
  ledger_id?: string;
  status?: string;
  transaction_type?: string;
}

export interface WaitForTerminalOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
}

const TERMINAL_STATUSES = new Set(["accepted", "failed", "quarantined"]);

// ── Service ───────────────────────────────────────────────────────────────────

export class TransactionsService {
  constructor(private readonly http: HttpClient) {}

  // ── Send / transfer ────────────────────────────────────────────────────────

  /**
   * Create an outbound payment to a beneficiary.
   * POST /v1/customer/transactions
   */
  async sendMoney(params: SendMoneyParams, opts?: RequestOptions): Promise<Transaction> {
    return this.http.request<Transaction>(
      "POST",
      "/v1/customer/transactions",
      params,
      opts,
    );
  }

  /**
   * Transfer funds between two Railsr ledgers.
   * POST /v1/customer/transactions/inter-ledger
   */
  async interLedger(params: InterLedgerParams, opts?: RequestOptions): Promise<Transaction> {
    return this.http.request<Transaction>(
      "POST",
      "/v1/customer/transactions/inter-ledger",
      params,
      opts,
    );
  }

  /**
   * Foreign-exchange transaction between two currency ledgers.
   * POST /v1/customer/transactions/fx
   */
  async fx(params: FXParams, opts?: RequestOptions): Promise<Transaction> {
    return this.http.request<Transaction>(
      "POST",
      "/v1/customer/transactions/fx",
      params,
      opts,
    );
  }

  // ── Read ──────────────────────────────────────────────────────────────────

  /**
   * Retrieve a transaction by ID.
   * GET /v1/customer/transactions/:id
   */
  async get(transactionID: string, opts?: RequestOptions): Promise<Transaction> {
    return this.http.request<Transaction>(
      "GET",
      `/v1/customer/transactions/${transactionID}`,
      undefined,
      opts,
    );
  }

  /**
   * List transactions across all ledgers or scoped to one ledger.
   * GET /v1/customer/transactions  or  GET /v1/customer/ledgers/:id/transactions
   */
  async list(params?: ListTransactionsParams, opts?: RequestOptions): Promise<Transaction[]> {
    const { ledger_id, ...rest } = params ?? {};
    const path = ledger_id
      ? `/v1/customer/ledgers/${ledger_id}/transactions`
      : "/v1/customer/transactions";
    return this.http.request<Transaction[]>("GET", path, undefined, {
      ...opts,
      query: buildPaginationQuery(rest),
    });
  }

  // ── Quarantine ────────────────────────────────────────────────────────────

  /**
   * List all transactions currently in quarantine.
   */
  async listQuarantined(opts?: RequestOptions): Promise<Transaction[]> {
    return this.list({ status: "quarantined" }, opts);
  }

  /**
   * Approve or reject a quarantined transaction.
   * POST /v1/customer/transactions/:id/resolve-quarantine
   */
  async resolveQuarantine(
    transactionID: string,
    params: ResolveQuarantineParams,
    opts?: RequestOptions,
  ): Promise<Transaction> {
    return this.http.request<Transaction>(
      "POST",
      `/v1/customer/transactions/${transactionID}/resolve-quarantine`,
      params,
      opts,
    );
  }

  /**
   * Approve a quarantined transaction.
   */
  async approve(transactionID: string, opts?: RequestOptions): Promise<Transaction> {
    return this.resolveQuarantine(transactionID, { resolution: "approve" }, opts);
  }

  /**
   * Reject a quarantined transaction with an optional reason.
   */
  async reject(
    transactionID: string,
    reason?: string,
    opts?: RequestOptions,
  ): Promise<Transaction> {
    return this.resolveQuarantine(
      transactionID,
      { resolution: "reject", ...(reason ? { reason } : {}) },
      opts,
    );
  }

  // ── Retry ──────────────────────────────────────────────────────────────────

  /**
   * Retry a failed transaction.
   * POST /v1/customer/transactions/:id/retry
   */
  async retry(transactionID: string, opts?: RequestOptions): Promise<Transaction> {
    return this.http.request<Transaction>(
      "POST",
      `/v1/customer/transactions/${transactionID}/retry`,
      {},
      opts,
    );
  }

  // ── Polling ────────────────────────────────────────────────────────────────

  /**
   * Poll a transaction until it reaches a terminal status
   * (`accepted`, `failed`, `quarantined`) or the timeout expires.
   */
  async waitForTerminal(
    transactionID: string,
    opts: WaitForTerminalOptions = {},
  ): Promise<Transaction> {
    const { timeoutMs = 120_000, pollIntervalMs = 3_000 } = opts;
    const deadline = Date.now() + timeoutMs;

    for (;;) {
      const tx = await this.get(transactionID);
      if (TERMINAL_STATUSES.has(tx.status)) return tx;
      if (Date.now() >= deadline) {
        throw RailsrError.validation(
          `waitForTerminal timed out after ${timeoutMs}ms; last status="${tx.status}"`,
        );
      }
      await sleep(pollIntervalMs);
    }
  }
}
