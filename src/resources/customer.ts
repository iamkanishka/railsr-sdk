/**
 * @module resources/customer
 * Railsr Customer (self) API — account details, enabled products, limits.
 */

import type { HttpClient, RequestOptions } from "../internal/http-client.js";
import type { Customer } from "../types/index.js";

// ── Request param types ────────────────────────────────────────────────────────

export interface UpdateCustomerParams {
  metadata?: Record<string, unknown>;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class CustomerService {
  constructor(private readonly http: HttpClient) {}

  /**
   * Retrieve your customer account details, enabled products, and limits.
   * GET /v1/customer
   */
  async get(opts?: RequestOptions): Promise<Customer> {
    return this.http.request<Customer>("GET", "/v1/customer", undefined, opts);
  }

  /**
   * Update customer metadata.
   * PUT /v1/customer
   */
  async update(params: UpdateCustomerParams, opts?: RequestOptions): Promise<Customer> {
    return this.http.request<Customer>("PUT", "/v1/customer", params, opts);
  }

  /**
   * List the embedded finance products enabled for this customer.
   * GET /v1/customer/products
   */
  async listProducts(opts?: RequestOptions): Promise<string[]> {
    return this.http.request<string[]>("GET", "/v1/customer/products", undefined, opts);
  }
}
