/**
 * @module resources/firewall
 * Railsr Compliance Firewall API — rule-set management + CSV datasets.
 */

import type { HttpClient, RequestOptions } from "../internal/http-client.js";
import type {
  FirewallRule,
  FirewallRules,
  FirewallDataset,
} from "../types/index.js";

// ── Request param types ────────────────────────────────────────────────────────

export interface SetRulesParams {
  rules: FirewallRule[];
}

export interface CreateDatasetParams {
  name: string;
  columns: string[];
  rows: string[][];
}

export interface UpdateDatasetParams {
  columns: string[];
  rows: string[][];
}

// ── Service ───────────────────────────────────────────────────────────────────

export class FirewallService {
  constructor(private readonly http: HttpClient) {}

  // ── Rules ──────────────────────────────────────────────────────────────────

  /**
   * Create or replace the customer's firewall rule-set (atomic swap).
   * POST /v1/customer/firewall
   */
  async setRules(
    params: SetRulesParams,
    opts?: RequestOptions,
  ): Promise<FirewallRules> {
    return this.http.request<FirewallRules>(
      "POST",
      "/v1/customer/firewall",
      params,
      opts,
    );
  }

  /**
   * Retrieve the current firewall rule-set.
   * GET /v1/customer/firewall
   */
  async getRules(opts?: RequestOptions): Promise<FirewallRules> {
    return this.http.request<FirewallRules>(
      "GET",
      "/v1/customer/firewall",
      undefined,
      opts,
    );
  }

  // ── Datasets ───────────────────────────────────────────────────────────────

  /**
   * Upload a new CSV lookup dataset.
   * POST /v1/customer/firewall/datasets
   */
  async createDataset(
    params: CreateDatasetParams,
    opts?: RequestOptions,
  ): Promise<FirewallDataset> {
    return this.http.request<FirewallDataset>(
      "POST",
      "/v1/customer/firewall/datasets",
      params,
      opts,
    );
  }

  /**
   * List all firewall datasets.
   * GET /v1/customer/firewall/datasets
   */
  async listDatasets(opts?: RequestOptions): Promise<FirewallDataset[]> {
    return this.http.request<FirewallDataset[]>(
      "GET",
      "/v1/customer/firewall/datasets",
      undefined,
      opts,
    );
  }

  /**
   * Replace an existing dataset by name.
   * PUT /v1/customer/firewall/datasets/:name
   */
  async updateDataset(
    name: string,
    params: UpdateDatasetParams,
    opts?: RequestOptions,
  ): Promise<FirewallDataset> {
    return this.http.request<FirewallDataset>(
      "PUT",
      `/v1/customer/firewall/datasets/${name}`,
      params,
      opts,
    );
  }

  /**
   * Delete a dataset by name.
   * DELETE /v1/customer/firewall/datasets/:name
   */
  async deleteDataset(name: string, opts?: RequestOptions): Promise<void> {
    await this.http.request<void>(
      "DELETE",
      `/v1/customer/firewall/datasets/${name}`,
      undefined,
      opts,
    );
  }

  /**
   * Retrieve reference documentation for built-in firewall functions.
   * GET /v1/customer/firewall/functions
   */
  async getFunctions(opts?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.request<Record<string, unknown>>(
      "GET",
      "/v1/customer/firewall/functions",
      undefined,
      opts,
    );
  }
}
