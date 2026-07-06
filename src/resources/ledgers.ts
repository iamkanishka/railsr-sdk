/**
 * @module resources/ledgers
 * Railsr Ledger API — GBP, EUR, virtual ledgers + entry history.
 */

import type { HttpClient, RequestOptions } from "../internal/http-client.js";
import type { Ledger, LedgerEntry, PaginationParams } from "../types/index.js";
import { RailsrError } from "../types/errors.js";
import { buildPaginationQuery, sleep } from "./endusers.js";

// ── Request param types ────────────────────────────────────────────────────────

export interface CreateLedgerParams {
  holder_id: string;
  holder_type?: string;
  ledger_type: string;
  asset_class: string;
  asset_type: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateLedgerParams {
  metadata?: Record<string, unknown>;
}

export interface ListLedgersParams extends PaginationParams {
  holder_id?: string;
  holder_type?: string;
  asset_type?: string;
  status?: string;
}

export interface ListEntriesParams extends PaginationParams {}

export interface VirtualCreditParams {
  ledger_id: string;
  amount: number;
  reason?: string;
}

export interface VirtualDebitParams {
  ledger_id: string;
  amount: number;
  reason?: string;
}

/** PLAY-environment only: artificially fund a ledger for testing. */
export interface DevCreditParams {
  amount: number;
  currency: string;
}

export interface WaitForLedgerActiveOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class LedgersService {
  constructor(private readonly http: HttpClient) {}

  /**
   * Create a new ledger.
   * POST /v1/customer/ledgers
   */
  async create(
    params: CreateLedgerParams,
    opts?: RequestOptions,
  ): Promise<Ledger> {
    return this.http.request<Ledger>(
      "POST",
      "/v1/customer/ledgers",
      params,
      opts,
    );
  }

  /**
   * Retrieve a ledger by ID.
   * GET /v1/customer/ledgers/:id
   */
  async get(ledgerID: string, opts?: RequestOptions): Promise<Ledger> {
    return this.http.request<Ledger>(
      "GET",
      `/v1/customer/ledgers/${ledgerID}`,
      undefined,
      opts,
    );
  }

  /**
   * List ledgers with optional filters.
   * GET /v1/customer/ledgers
   */
  async list(
    params?: ListLedgersParams,
    opts?: RequestOptions,
  ): Promise<Ledger[]> {
    return this.http.request<Ledger[]>(
      "GET",
      "/v1/customer/ledgers",
      undefined,
      {
        ...opts,
        query: buildPaginationQuery(params as Record<string, unknown>),
      },
    );
  }

  /**
   * Update ledger metadata.
   * PUT /v1/customer/ledgers/:id
   */
  async update(
    ledgerID: string,
    params: UpdateLedgerParams,
    opts?: RequestOptions,
  ): Promise<Ledger> {
    return this.http.request<Ledger>(
      "PUT",
      `/v1/customer/ledgers/${ledgerID}`,
      params,
      opts,
    );
  }

  // ── Lookup helpers ────────────────────────────────────────────────────────────

  /**
   * Find a ledger by UK sort code and account number.
   */
  async findByUKAccount(
    sortCode: string,
    accountNumber: string,
    opts?: RequestOptions,
  ): Promise<Ledger> {
    const results = await this.http.request<Ledger[]>(
      "GET",
      "/v1/customer/ledgers",
      undefined,
      { ...opts, query: { account_number: `${sortCode}${accountNumber}` } },
    );
    if (!results?.length) {
      throw RailsrError.notFound("No ledger found for that UK account");
    }
    const first = results[0];
    if (!first)
      throw RailsrError.notFound("No ledger found for that UK account");
    return first;
  }

  /**
   * Find a ledger by IBAN.
   */
  async findByIBAN(iban: string, opts?: RequestOptions): Promise<Ledger> {
    const results = await this.http.request<Ledger[]>(
      "GET",
      "/v1/customer/ledgers",
      undefined,
      { ...opts, query: { account_number: iban } },
    );
    if (!results?.length) {
      throw RailsrError.notFound("No ledger found for that IBAN");
    }
    const first = results[0];
    if (!first) throw RailsrError.notFound("No ledger found for that IBAN");
    return first;
  }

  // ── Entry history ─────────────────────────────────────────────────────────────

  /**
   * List paginated entry history for a ledger.
   * GET /v1/customer/ledgers/:id/entries
   */
  async listEntries(
    ledgerID: string,
    params?: ListEntriesParams,
    opts?: RequestOptions,
  ): Promise<LedgerEntry[]> {
    return this.http.request<LedgerEntry[]>(
      "GET",
      `/v1/customer/ledgers/${ledgerID}/entries`,
      undefined,
      {
        ...opts,
        query: buildPaginationQuery(params as Record<string, unknown>),
      },
    );
  }

  // ── Virtual ledger ────────────────────────────────────────────────────────────

  /**
   * Credit a virtual ledger.
   * POST /v1/customer/transactions/credit-virtual-ledger
   */
  async creditVirtual(
    params: VirtualCreditParams,
    opts?: RequestOptions,
  ): Promise<void> {
    await this.http.request<void>(
      "POST",
      "/v1/customer/transactions/credit-virtual-ledger",
      params,
      opts,
    );
  }

  /**
   * Debit a virtual ledger.
   * POST /v1/customer/transactions/debit-virtual-ledger
   */
  async debitVirtual(
    params: VirtualDebitParams,
    opts?: RequestOptions,
  ): Promise<void> {
    await this.http.request<void>(
      "POST",
      "/v1/customer/transactions/debit-virtual-ledger",
      params,
      opts,
    );
  }

  // ── Dev helpers (PLAY only) ───────────────────────────────────────────────────

  /**
   * Artificially fund a ledger in the PLAY environment.
   * POST /v1/customer/dev/ledgers/:id/credit
   */
  async devCredit(
    ledgerID: string,
    params: DevCreditParams,
    opts?: RequestOptions,
  ): Promise<void> {
    await this.http.request<void>(
      "POST",
      `/v1/customer/dev/ledgers/${ledgerID}/credit`,
      params,
      opts,
    );
  }

  // ── Polling ────────────────────────────────────────────────────────────────────

  /**
   * Poll until the ledger reaches `"active"` status or the timeout expires.
   */
  async waitForActive(
    ledgerID: string,
    opts: WaitForLedgerActiveOptions = {},
  ): Promise<Ledger> {
    const { timeoutMs = 60_000, pollIntervalMs = 2_000 } = opts;
    const deadline = Date.now() + timeoutMs;

    for (;;) {
      const ledger = await this.get(ledgerID);
      if (ledger.status === "active") return ledger;
      if (Date.now() >= deadline) {
        throw RailsrError.validation(
          `waitForActive timed out after ${timeoutMs}ms; last status="${ledger.status}"`,
        );
      }
      await sleep(pollIntervalMs);
    }
  }
}
