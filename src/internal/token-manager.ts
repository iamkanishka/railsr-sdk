/**
 * @internal
 * OAuth 2.0 `client_credentials` token manager.
 * Caches the bearer token and auto-refreshes 60 s before expiry.
 */

import type { Token } from "../types/index.js";
import { RailsrError } from "../types/errors.js";

/** Minimum remaining TTL (ms) before we proactively refresh. */
const REFRESH_BUFFER_MS = 60_000;

export class TokenManager {
  private cached: Token | undefined;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly tokenUrl: string,
    private readonly fetchFn: typeof fetch = globalThis.fetch,
  ) {}

  /** Returns a valid bearer token, refreshing when necessary. */
  async token(signal?: AbortSignal): Promise<string> {
    if (this.isFresh()) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return this.cached!.access_token;
    }
    await this.refresh(signal);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.cached!.access_token;
  }

  /** Force-invalidate the cached token (used after 401 responses). */
  invalidate(): void {
    this.cached = undefined;
  }

  private isFresh(): boolean {
    if (!this.cached) return false;
    const expiresAtMs =
      this.cached.fetched_at + this.cached.expires_in * 1000;
    return Date.now() < expiresAtMs - REFRESH_BUFFER_MS;
  }

  private async refresh(signal?: AbortSignal): Promise<void> {
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    let resp: Response;
    try {
      resp = await this.fetchFn(this.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        ...(signal !== undefined ? { signal } : {}),
      });
    } catch (err) {
      throw RailsrError.network(
        `Failed to obtain access token: ${String(err)}`,
        err,
      );
    }

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new RailsrError({
        type: "unauthorized",
        message: `Token endpoint returned ${resp.status}: ${text}`,
        statusCode: resp.status,
      });
    }

    const json = (await resp.json()) as Partial<Token>;
    if (!json.access_token) {
      throw new RailsrError({
        type: "unauthorized",
        message: "Token response missing access_token",
      });
    }

    this.cached = {
      access_token: json.access_token,
      token_type: json.token_type ?? "Bearer",
      expires_in: json.expires_in ?? 3600,
      scope: json.scope ?? "",
      fetched_at: Date.now(),
    };
  }
}
