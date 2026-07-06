/**
 * @module resources/endusers
 * Railsr v2 Enduser API — person and company enduser CRUD + KYC.
 */

import type { HttpClient, RequestOptions } from "../internal/http-client.js";
import type { Enduser, KYCCheck, Person, Company, PaginationParams } from "../types/index.js";
import { RailsrError } from "../types/errors.js";

// ── Request param types ────────────────────────────────────────────────────────

export interface CreateEnduserParams {
  person?: Person;
  company?: Company;
  metadata?: Record<string, unknown>;
}

export interface UpdateEnduserParams {
  person?: Person;
  company?: Company;
  metadata?: Record<string, unknown>;
}

export type PatchEnduserParams = Partial<UpdateEnduserParams>;

export interface ListEndusersParams extends PaginationParams {
  status?: string;
}

export interface CreateKYCCheckParams {
  provider?: string;
  metadata?: Record<string, unknown>;
}

export interface WaitForStatusOptions {
  /** Statuses that end the polling loop. */
  targetStatuses: string[];
  /** Maximum total wait time in ms. Default 120_000. */
  timeoutMs?: number;
  /** Interval between polls in ms. Default 2_000. */
  pollIntervalMs?: number;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class EndusersService {
  constructor(private readonly http: HttpClient) {}

  /**
   * Create a new enduser (person or company).
   * POST /v2/endusers
   */
  async create(
    params: CreateEnduserParams,
    opts?: RequestOptions,
  ): Promise<Enduser> {
    return this.http.request<Enduser>("POST", "/v2/endusers", params, opts);
  }

  /**
   * Retrieve a single enduser by ID.
   * GET /v2/endusers/:id
   */
  async get(enduserID: string, opts?: RequestOptions): Promise<Enduser> {
    return this.http.request<Enduser>("GET", `/v2/endusers/${enduserID}`, undefined, opts);
  }

  /**
   * List endusers with optional filters.
   * GET /v2/endusers
   */
  async list(
    params?: ListEndusersParams,
    opts?: RequestOptions,
  ): Promise<Enduser[]> {
    return this.http.request<Enduser[]>("GET", "/v2/endusers", undefined, {
      ...opts,
      query: buildPaginationQuery(params as Record<string, unknown>),
    });
  }

  /**
   * Full replacement of an enduser.
   * PUT /v2/endusers/:id
   */
  async update(
    enduserID: string,
    params: UpdateEnduserParams,
    opts?: RequestOptions,
  ): Promise<Enduser> {
    return this.http.request<Enduser>("PUT", `/v2/endusers/${enduserID}`, params, opts);
  }

  /**
   * Partial update of an enduser.
   * PATCH /v2/endusers/:id
   */
  async patch(
    enduserID: string,
    params: PatchEnduserParams,
    opts?: RequestOptions,
  ): Promise<Enduser> {
    return this.http.request<Enduser>("PATCH", `/v2/endusers/${enduserID}`, params, opts);
  }

  // ── KYC ─────────────────────────────────────────────────────────────────────

  /**
   * Trigger a KYC check for an enduser.
   * POST /v2/endusers/:id/kyc-checks
   */
  async createKYCCheck(
    enduserID: string,
    params: CreateKYCCheckParams = {},
    opts?: RequestOptions,
  ): Promise<KYCCheck> {
    return this.http.request<KYCCheck>(
      "POST",
      `/v2/endusers/${enduserID}/kyc-checks`,
      params,
      opts,
    );
  }

  /**
   * List all KYC checks for an enduser.
   * GET /v2/endusers/:id/kyc-checks
   */
  async listKYCChecks(
    enduserID: string,
    opts?: RequestOptions,
  ): Promise<KYCCheck[]> {
    return this.http.request<KYCCheck[]>(
      "GET",
      `/v2/endusers/${enduserID}/kyc-checks`,
      undefined,
      opts,
    );
  }

  /**
   * Retrieve a specific KYC check.
   * GET /v2/endusers/:id/kyc-checks/:check_id
   */
  async getKYCCheck(
    enduserID: string,
    checkID: string,
    opts?: RequestOptions,
  ): Promise<KYCCheck> {
    return this.http.request<KYCCheck>(
      "GET",
      `/v2/endusers/${enduserID}/kyc-checks/${checkID}`,
      undefined,
      opts,
    );
  }

  // ── Compliance ───────────────────────────────────────────────────────────────

  /**
   * Manually re-run the compliance firewall for an enduser.
   * POST /v1/customer/endusers/:id/compliance-firewall-calculation
   */
  async recalculateFirewall(
    enduserID: string,
    opts?: RequestOptions,
  ): Promise<void> {
    await this.http.request<void>(
      "POST",
      `/v1/customer/endusers/${enduserID}/compliance-firewall-calculation`,
      {},
      opts,
    );
  }

  // ── Polling helper ────────────────────────────────────────────────────────────

  /**
   * Poll until the enduser reaches one of `targetStatuses` or the timeout
   * expires.  Useful for waiting for KYC processing to complete.
   *
   * @example
   * ```ts
   * const eu = await rails.endusers.waitForStatus(id, {
   *   targetStatuses: ["active"],
   *   timeoutMs: 60_000,
   * });
   * ```
   */
  async waitForStatus(
    enduserID: string,
    opts: WaitForStatusOptions,
  ): Promise<Enduser> {
    const {
      targetStatuses,
      timeoutMs = 120_000,
      pollIntervalMs = 2_000,
    } = opts;

    if (targetStatuses.length === 0) {
      throw RailsrError.validation("waitForStatus requires at least one targetStatus");
    }

    const targetSet = new Set(targetStatuses);
    const deadline = Date.now() + timeoutMs;

    for (;;) {
      const eu = await this.get(enduserID);
      if (targetSet.has(eu.status)) return eu;
      if (Date.now() >= deadline) {
        throw RailsrError.validation(
          `waitForStatus timed out after ${timeoutMs}ms; last status="${eu.status}"`,
        );
      }
      await sleep(pollIntervalMs);
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildPaginationQuery(
  p?: Record<string, unknown>,
): Record<string, string | number | boolean | undefined> {
  if (!p) return {};
  const q: Record<string, string | number | boolean | undefined> = {};
  for (const [k, v] of Object.entries(p)) {
    if (v !== undefined && v !== null && v !== "") {
      q[k] = v as string | number | boolean;
    }
  }
  return q;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { buildPaginationQuery, sleep };
