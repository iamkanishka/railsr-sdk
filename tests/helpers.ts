/**
 * Test utilities: minimal mock-fetch factory so tests never hit the network.
 */

export interface MockResponse {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
}

/** Build a jest mock function that returns the given responses in sequence. */
export function mockFetch(responses: MockResponse[]): jest.Mock {
  const queue = [...responses];

  const fn = jest.fn((_url: string, _init?: RequestInit) => {
    const next = queue.shift() ?? { status: 200, body: {} };
    const status = next.status ?? 200;
    const bodyText = next.body !== undefined ? JSON.stringify(next.body) : "";
    const headers = new Headers({ "Content-Type": "application/json", ...(next.headers ?? {}) });

    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      headers,
      text: () => Promise.resolve(bodyText),
      json: () => Promise.resolve(next.body),
    } as Response);
  });

  return fn;
}

/** Build a token response (OAuth2 client_credentials shape). */
export function tokenResponse() {
  return {
    access_token: "test-bearer-token",
    token_type: "Bearer",
    expires_in: 3600,
    scope: "",
  };
}

/** Create a fetch mock pre-seeded with a token response + any additional responses. */
export function fetchWithToken(...extras: MockResponse[]): jest.Mock {
  return mockFetch([{ status: 200, body: tokenResponse() }, ...extras]);
}
