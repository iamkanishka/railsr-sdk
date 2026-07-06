/**
 * @module resources/cards
 * Railsr Card API — virtual/physical card lifecycle, spend controls, card
 * programmes, PAN retrieval, and digital-wallet (Labs) provisioning.
 */

import type { HttpClient, RequestOptions } from "../internal/http-client.js";
import type {
  Card,
  CardRule,
  CardProgramme,
  PANResponse,
  PaymentTokenResponse,
  Address,
  PaginationParams,
  CardType,
  CardRuleType,
  CardLimitInterval,
  ReplacementReason,
  WalletProvider,
} from "../types/index.js";
import { buildPaginationQuery } from "./endusers.js";

// ── Request param types ────────────────────────────────────────────────────────

export interface CreateCardParams {
  ledger_id: string;
  card_type: CardType;
  card_programme_id: string;
  card_holder_name?: string;
  physical_delivery_address?: Address;
  metadata?: Record<string, unknown>;
}

export interface ListCardsParams extends PaginationParams {
  ledger_id?: string;
  enduser_id?: string;
  card_type?: CardType;
  status?: string;
}

export interface ReplaceCardParams {
  replacement_reason: ReplacementReason;
  card_type?: CardType;
  physical_delivery_address?: Address;
}

export interface CreateCardRuleParams {
  rule_type: CardRuleType;
  limit_amount?: number;
  limit_currency?: string;
  limit_interval?: CardLimitInterval;
  mcc_list?: string[];
  country_list?: string[];
}

export interface CreatePaymentTokenParams {
  wallet_provider: WalletProvider;
  nonce: string;
  nonce_signature: string;
  certificates?: unknown[];
}

export interface ListCardTransactionsParams extends PaginationParams {
  status?: string;
  transaction_type?: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class CardsService {
  constructor(private readonly http: HttpClient) {}

  // ── CRUD ──────────────────────────────────────────────────────────────────

  /**
   * Create a virtual or physical card.
   * POST /v1/customer/cards
   */
  async create(params: CreateCardParams, opts?: RequestOptions): Promise<Card> {
    return this.http.request<Card>("POST", "/v1/customer/cards", params, opts);
  }

  /**
   * Retrieve a card by ID.
   * GET /v1/customer/cards/:id
   */
  async get(cardID: string, opts?: RequestOptions): Promise<Card> {
    return this.http.request<Card>("GET", `/v1/customer/cards/${cardID}`, undefined, opts);
  }

  /**
   * List cards with optional filters.
   * GET /v1/customer/cards
   */
  async list(params?: ListCardsParams, opts?: RequestOptions): Promise<Card[]> {
    return this.http.request<Card[]>("GET", "/v1/customer/cards", undefined, {
      ...opts,
      query: buildPaginationQuery(params as Record<string, unknown>),
    });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /** Activate a pending card. */
  async activate(cardID: string, opts?: RequestOptions): Promise<Card> {
    return this.updateStatus(cardID, "active", opts);
  }

  /** Freeze (temporarily block) a card. */
  async freeze(cardID: string, opts?: RequestOptions): Promise<Card> {
    return this.updateStatus(cardID, "frozen", opts);
  }

  /** Unfreeze a frozen card. */
  async unfreeze(cardID: string, opts?: RequestOptions): Promise<Card> {
    return this.updateStatus(cardID, "active", opts);
  }

  /** Permanently cancel a card. */
  async cancel(cardID: string, opts?: RequestOptions): Promise<Card> {
    return this.updateStatus(cardID, "cancelled", opts);
  }

  /** Admin-level suspension. */
  async suspend(cardID: string, opts?: RequestOptions): Promise<Card> {
    return this.updateStatus(cardID, "suspended", opts);
  }

  /**
   * Update card status.
   * PUT /v1/customer/cards/:id
   */
  async updateStatus(
    cardID: string,
    status: string,
    opts?: RequestOptions,
  ): Promise<Card> {
    return this.http.request<Card>(
      "PUT",
      `/v1/customer/cards/${cardID}`,
      { status },
      opts,
    );
  }

  /**
   * Replace a card (lost, stolen, damaged, expired).
   * POST /v1/customer/cards/:id/replace
   */
  async replace(
    cardID: string,
    params: ReplaceCardParams,
    opts?: RequestOptions,
  ): Promise<Card> {
    return this.http.request<Card>(
      "POST",
      `/v1/customer/cards/${cardID}/replace`,
      params,
      opts,
    );
  }

  // ── Sensitive data ────────────────────────────────────────────────────────

  /**
   * Retrieve the secure PAN token via MeaWallet.
   * GET /v1/customer/cards/:id/pan
   */
  async getPAN(cardID: string, opts?: RequestOptions): Promise<PANResponse> {
    return this.http.request<PANResponse>(
      "GET",
      `/v1/customer/cards/${cardID}/pan`,
      undefined,
      opts,
    );
  }

  /**
   * Reset the PIN lockout counter (Debit-Card-2/3 products).
   * POST /v1/customer/cards/:id/reset-pin-attempts
   */
  async resetPINAttempts(cardID: string, opts?: RequestOptions): Promise<void> {
    await this.http.request<void>(
      "POST",
      `/v1/customer/cards/${cardID}/reset-pin-attempts`,
      {},
      opts,
    );
  }

  // ── Transactions ──────────────────────────────────────────────────────────

  /**
   * List card transactions (authorisations, clearings, refunds).
   * GET /v1/customer/cards/:id/transactions
   */
  async listTransactions(
    cardID: string,
    params?: ListCardTransactionsParams,
    opts?: RequestOptions,
  ): Promise<Record<string, unknown>[]> {
    return this.http.request<Record<string, unknown>[]>(
      "GET",
      `/v1/customer/cards/${cardID}/transactions`,
      undefined,
      { ...opts, query: buildPaginationQuery(params as Record<string, unknown>) },
    );
  }

  // ── Card Rules ────────────────────────────────────────────────────────────

  /**
   * Create a spend-control rule on a card.
   * POST /v1/customer/cards/:id/rules
   */
  async createRule(
    cardID: string,
    params: CreateCardRuleParams,
    opts?: RequestOptions,
  ): Promise<CardRule> {
    return this.http.request<CardRule>(
      "POST",
      `/v1/customer/cards/${cardID}/rules`,
      params,
      opts,
    );
  }

  /**
   * List all rules on a card.
   * GET /v1/customer/cards/:id/rules
   */
  async listRules(cardID: string, opts?: RequestOptions): Promise<CardRule[]> {
    return this.http.request<CardRule[]>(
      "GET",
      `/v1/customer/cards/${cardID}/rules`,
      undefined,
      opts,
    );
  }

  /**
   * Retrieve a specific card rule.
   * GET /v1/customer/cards/:id/rules/:rule_id
   */
  async getRule(
    cardID: string,
    ruleID: string,
    opts?: RequestOptions,
  ): Promise<CardRule> {
    return this.http.request<CardRule>(
      "GET",
      `/v1/customer/cards/${cardID}/rules/${ruleID}`,
      undefined,
      opts,
    );
  }

  /**
   * Delete a card rule.
   * DELETE /v1/customer/cards/:id/rules/:rule_id
   */
  async deleteRule(
    cardID: string,
    ruleID: string,
    opts?: RequestOptions,
  ): Promise<void> {
    await this.http.request<void>(
      "DELETE",
      `/v1/customer/cards/${cardID}/rules/${ruleID}`,
      undefined,
      opts,
    );
  }

  // ── Card Programmes ───────────────────────────────────────────────────────

  /**
   * List card programmes available for this customer.
   * GET /v1/customer/card-programmes
   */
  async listProgrammes(opts?: RequestOptions): Promise<CardProgramme[]> {
    return this.http.request<CardProgramme[]>(
      "GET",
      "/v1/customer/card-programmes",
      undefined,
      opts,
    );
  }

  /**
   * Retrieve a specific card programme.
   * GET /v1/customer/card-programmes/:id
   */
  async getProgramme(
    programmeID: string,
    opts?: RequestOptions,
  ): Promise<CardProgramme> {
    return this.http.request<CardProgramme>(
      "GET",
      `/v1/customer/card-programmes/${programmeID}`,
      undefined,
      opts,
    );
  }

  // ── Digital Wallet Tokens (Labs) ──────────────────────────────────────────

  /**
   * Provision an Apple Pay or Google Pay token (Railsr Labs API).
   * POST /labs/cards/:id/payment-tokens
   */
  async createPaymentToken(
    cardID: string,
    params: CreatePaymentTokenParams,
    opts?: RequestOptions,
  ): Promise<PaymentTokenResponse> {
    return this.http.request<PaymentTokenResponse>(
      "POST",
      `/labs/cards/${cardID}/payment-tokens`,
      params,
      opts,
    );
  }

  /**
   * List digital wallet tokens on a card (Railsr Labs API).
   * GET /labs/cards/:id/payment-tokens
   */
  async listPaymentTokens(
    cardID: string,
    opts?: RequestOptions,
  ): Promise<PaymentTokenResponse[]> {
    return this.http.request<PaymentTokenResponse[]>(
      "GET",
      `/labs/cards/${cardID}/payment-tokens`,
      undefined,
      opts,
    );
  }
}
