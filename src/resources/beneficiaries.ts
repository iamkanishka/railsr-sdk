/**
 * @module resources/beneficiaries
 * Railsr Beneficiary API — external payee CRUD + Confirmation of Payee (CoP).
 */

import type { HttpClient, RequestOptions } from "../internal/http-client.js";
import type { Beneficiary, PaginationParams } from "../types/index.js";
import { buildPaginationQuery } from "./endusers.js";

// ── Request param types ────────────────────────────────────────────────────────

export interface CreateBeneficiaryParams {
  name: string;
  currency: string;
  enduser_id?: string;
  uk_account_number?: string;
  uk_sort_code?: string;
  iban?: string;
  bic?: string;
  country?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateBeneficiaryParams {
  name?: string;
  metadata?: Record<string, unknown>;
}

export interface ListBeneficiariesParams extends PaginationParams {
  enduser_id?: string;
  status?: string;
  currency?: string;
}

export interface VerifyBeneficiaryParams {
  payment_type: "faster-payment" | "bacs";
}

// ── Service ───────────────────────────────────────────────────────────────────

export class BeneficiariesService {
  constructor(private readonly http: HttpClient) {}

  /**
   * Create a new beneficiary.
   * POST /v1/customer/beneficiaries
   */
  async create(
    params: CreateBeneficiaryParams,
    opts?: RequestOptions,
  ): Promise<Beneficiary> {
    return this.http.request<Beneficiary>(
      "POST",
      "/v1/customer/beneficiaries",
      params,
      opts,
    );
  }

  /**
   * Retrieve a beneficiary by ID.
   * GET /v1/customer/beneficiaries/:id
   */
  async get(
    beneficiaryID: string,
    opts?: RequestOptions,
  ): Promise<Beneficiary> {
    return this.http.request<Beneficiary>(
      "GET",
      `/v1/customer/beneficiaries/${beneficiaryID}`,
      undefined,
      opts,
    );
  }

  /**
   * List beneficiaries with optional filters.
   * GET /v1/customer/beneficiaries
   */
  async list(
    params?: ListBeneficiariesParams,
    opts?: RequestOptions,
  ): Promise<Beneficiary[]> {
    return this.http.request<Beneficiary[]>(
      "GET",
      "/v1/customer/beneficiaries",
      undefined,
      {
        ...opts,
        query: buildPaginationQuery(params as Record<string, unknown>),
      },
    );
  }

  /**
   * Update a beneficiary (name / metadata).
   * PUT /v1/customer/beneficiaries/:id
   */
  async update(
    beneficiaryID: string,
    params: UpdateBeneficiaryParams,
    opts?: RequestOptions,
  ): Promise<Beneficiary> {
    return this.http.request<Beneficiary>(
      "PUT",
      `/v1/customer/beneficiaries/${beneficiaryID}`,
      params,
      opts,
    );
  }

  // ── Confirmation of Payee ─────────────────────────────────────────────────

  /**
   * Run Confirmation of Payee (CoP) for a UK beneficiary.
   * POST /v1/customer/beneficiaries/:id/verify
   */
  async verify(
    beneficiaryID: string,
    params: VerifyBeneficiaryParams,
    opts?: RequestOptions,
  ): Promise<Beneficiary> {
    return this.http.request<Beneficiary>(
      "POST",
      `/v1/customer/beneficiaries/${beneficiaryID}/verify`,
      params,
      opts,
    );
  }

  // ── Compliance ────────────────────────────────────────────────────────────

  /**
   * Trigger a compliance firewall re-calculation for a beneficiary.
   * POST /v1/customer/beneficiaries/:id/compliance-firewall-calculation
   */
  async recalculateFirewall(
    beneficiaryID: string,
    opts?: RequestOptions,
  ): Promise<void> {
    await this.http.request<void>(
      "POST",
      `/v1/customer/beneficiaries/${beneficiaryID}/compliance-firewall-calculation`,
      {},
      opts,
    );
  }
}
