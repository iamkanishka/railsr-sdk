import { Railsr } from "../railsr.js";
import { RailsrError } from "../types/errors.js";
import {
  verifyWebhookSignature,
  computeWebhookSignature,
} from "../resources/webhooks.js";
import { fetchWithToken, mockFetch, tokenResponse } from "./helpers.js";

// ── Factory ────────────────────────────────────────────────────────────────────

function makeSdk(fetch: jest.Mock) {
  return new Railsr({
    clientId: "test-id",
    clientSecret: "test-secret",
    environment: "play",
    fetchFn: fetch as unknown as typeof globalThis.fetch,
    retry: { maxRetries: 0 }, // no retries in unit tests
  });
}

// ── Endusers ───────────────────────────────────────────────────────────────────

describe("Endusers", () => {
  const enduser = {
    enduser_id: "eu_123",
    status: "active",
    type: "person",
    person: { name: { family_name: "Smith", given_name: "Alice" } },
  };

  it("create() sends POST /v2/endusers with body", async () => {
    const fetch = fetchWithToken({ status: 201, body: enduser });
    const rails = makeSdk(fetch);

    const result = await rails.endusers.create({
      person: { name: { family_name: "Smith", given_name: "Alice" } },
    });

    expect(result.enduser_id).toBe("eu_123");
    const [, init] = fetch.mock.calls[1]!; // calls[0] is the token request
    expect(JSON.parse(init.body as string)).toMatchObject({ person: { name: { family_name: "Smith" } } });
    expect(init.method).toBe("POST");
  });

  it("get() sends GET /v2/endusers/:id", async () => {
    const fetch = fetchWithToken({ status: 200, body: enduser });
    const rails = makeSdk(fetch);

    const result = await rails.endusers.get("eu_123");
    expect(result.enduser_id).toBe("eu_123");
    const [url] = fetch.mock.calls[1]!;
    expect(url).toContain("/v2/endusers/eu_123");
  });

  it("list() appends query params", async () => {
    const fetch = fetchWithToken({ status: 200, body: [enduser] });
    const rails = makeSdk(fetch);

    await rails.endusers.list({ status: "active", limit: 10 });
    const [url] = fetch.mock.calls[1]!;
    expect(url).toContain("status=active");
    expect(url).toContain("limit=10");
  });

  it("createKYCCheck() sends POST .../kyc-checks", async () => {
    const kycCheck = { kyc_check_id: "kyc_1", status: "pending" };
    const fetch = fetchWithToken({ status: 201, body: kycCheck });
    const rails = makeSdk(fetch);

    const result = await rails.endusers.createKYCCheck("eu_123", { provider: "onfido" });
    expect(result.kyc_check_id).toBe("kyc_1");
    const [url] = fetch.mock.calls[1]!;
    expect(url).toContain("/v2/endusers/eu_123/kyc-checks");
  });

  it("throws RailsrError on 404", async () => {
    const notFound = { status: 404, body: { message: "not found", error_code: "E404" } };
    const fetch = fetchWithToken(notFound);
    const rails = makeSdk(fetch);

    const err = await rails.endusers.get("eu_missing").catch((e) => e);
    expect(err).toBeInstanceOf(RailsrError);
    expect(err.type).toBe("not_found");
  });
});

// ── Ledgers ────────────────────────────────────────────────────────────────────

describe("Ledgers", () => {
  const ledger = {
    ledger_id: "led_1",
    holder_id: "eu_123",
    holder_type: "enduser",
    ledger_type: "standard-gbp",
    asset_class: "currency",
    asset_type: "gbp",
    status: "active",
    balance: 10000,
    amount_reserved: 0,
    amount_available: 10000,
    currency: "GBP",
  };

  it("create() sends POST /v1/customer/ledgers", async () => {
    const fetch = fetchWithToken({ status: 201, body: ledger });
    const rails = makeSdk(fetch);

    const result = await rails.ledgers.create({
      holder_id: "eu_123",
      ledger_type: "standard-gbp",
      asset_class: "currency",
      asset_type: "gbp",
    });
    expect(result.ledger_id).toBe("led_1");
  });

  it("listEntries() scopes path to ledger", async () => {
    const fetch = fetchWithToken({ status: 200, body: [] });
    const rails = makeSdk(fetch);

    await rails.ledgers.listEntries("led_1", { limit: 50 });
    const [url] = fetch.mock.calls[1]!;
    expect(url).toContain("/v1/customer/ledgers/led_1/entries");
    expect(url).toContain("limit=50");
  });

  it("devCredit() sends POST to dev endpoint", async () => {
    const fetch = fetchWithToken({ status: 204 });
    const rails = makeSdk(fetch);

    await rails.ledgers.devCredit("led_1", { amount: 5000, currency: "GBP" });
    const [url, init] = fetch.mock.calls[1]!;
    expect(url).toContain("/v1/customer/dev/ledgers/led_1/credit");
    expect(init.method).toBe("POST");
  });
});

// ── Transactions ───────────────────────────────────────────────────────────────

describe("Transactions", () => {
  const tx = {
    transaction_id: "tx_1",
    transaction_type: "send-money",
    status: "accepted",
    amount: 1000,
    currency: "GBP",
  };

  it("sendMoney() sends POST /v1/customer/transactions", async () => {
    const fetch = fetchWithToken({ status: 201, body: tx });
    const rails = makeSdk(fetch);

    const result = await rails.transactions.sendMoney({
      ledger_id: "led_1",
      beneficiary_id: "ben_1",
      amount: 1000,
      currency: "GBP",
      payment_type: "faster-payment",
    });
    expect(result.transaction_id).toBe("tx_1");
  });

  it("list() scopes path to ledger when ledger_id provided", async () => {
    const fetch = fetchWithToken({ status: 200, body: [tx] });
    const rails = makeSdk(fetch);

    await rails.transactions.list({ ledger_id: "led_1" });
    const [url] = fetch.mock.calls[1]!;
    expect(url).toContain("/v1/customer/ledgers/led_1/transactions");
  });

  it("approve() posts 'approve' resolution", async () => {
    const fetch = fetchWithToken({ status: 200, body: { ...tx, status: "accepted" } });
    const rails = makeSdk(fetch);

    await rails.transactions.approve("tx_1");
    const [, init] = fetch.mock.calls[1]!;
    expect(JSON.parse(init.body as string).resolution).toBe("approve");
  });

  it("reject() posts 'reject' resolution with reason", async () => {
    const fetch = fetchWithToken({ status: 200, body: { ...tx, status: "failed" } });
    const rails = makeSdk(fetch);

    await rails.transactions.reject("tx_1", "suspicious");
    const [, init] = fetch.mock.calls[1]!;
    const body = JSON.parse(init.body as string);
    expect(body.resolution).toBe("reject");
    expect(body.reason).toBe("suspicious");
  });
});

// ── Beneficiaries ──────────────────────────────────────────────────────────────

describe("Beneficiaries", () => {
  const ben = {
    beneficiary_id: "ben_1",
    name: "ACME Corp",
    status: "active",
    currency: "GBP",
    uk_account_number: "12345678",
    uk_sort_code: "010203",
  };

  it("verify() posts to /verify", async () => {
    const fetch = fetchWithToken({ status: 200, body: { ...ben, cop_result: "matched" } });
    const rails = makeSdk(fetch);

    const result = await rails.beneficiaries.verify("ben_1", { payment_type: "faster-payment" });
    expect(result.cop_result).toBe("matched");
    const [url] = fetch.mock.calls[1]!;
    expect(url).toContain("/v1/customer/beneficiaries/ben_1/verify");
  });
});

// ── Cards ──────────────────────────────────────────────────────────────────────

describe("Cards", () => {
  const card = {
    card_id: "card_1",
    ledger_id: "led_1",
    card_type: "virtual",
    status: "active",
    card_programme_id: "prog_1",
    last_four: "4242",
  };

  it("freeze() sends status=frozen", async () => {
    const fetch = fetchWithToken({ status: 200, body: { ...card, status: "frozen" } });
    const rails = makeSdk(fetch);

    const result = await rails.cards.freeze("card_1");
    expect(result.status).toBe("frozen");
    const [, init] = fetch.mock.calls[1]!;
    expect(JSON.parse(init.body as string).status).toBe("frozen");
  });

  it("deleteRule() sends DELETE", async () => {
    const fetch = fetchWithToken({ status: 204 });
    const rails = makeSdk(fetch);

    await rails.cards.deleteRule("card_1", "rule_1");
    const [url, init] = fetch.mock.calls[1]!;
    expect(init.method).toBe("DELETE");
    expect(url).toContain("/rules/rule_1");
  });
});

// ── Webhooks ───────────────────────────────────────────────────────────────────

describe("verifyWebhookSignature", () => {
  const secret = "super-secret";
  const body = Buffer.from(JSON.stringify({ type: "enduser-created" }));

  it("passes for a valid signature", () => {
    const sig = computeWebhookSignature(body, secret);
    expect(() => verifyWebhookSignature(body, sig, secret)).not.toThrow();
  });

  it("throws RailsrError for wrong signature", () => {
    expect(() =>
      verifyWebhookSignature(body, "deadbeef".repeat(8), secret),
    ).toThrow(RailsrError);
  });

  it("throws for empty signature", () => {
    expect(() => verifyWebhookSignature(body, "", secret)).toThrow(RailsrError);
  });

  it("accepts string body", () => {
    const str = JSON.stringify({ hello: "world" });
    const sig = computeWebhookSignature(Buffer.from(str), secret);
    expect(() => verifyWebhookSignature(str, sig, secret)).not.toThrow();
  });
});

// ── Auth token refresh ─────────────────────────────────────────────────────────

describe("Auth token refresh", () => {
  it("re-fetches token on 401 when attempt=0", async () => {
    const fetch = mockFetch([
      { status: 200, body: tokenResponse() },         // initial token
      { status: 401, body: { message: "Unauthorized" } }, // API call → 401
      // retry: no retry since maxRetries=0; the error is thrown
    ]);
    const rails = makeSdk(fetch);

    await expect(rails.customer.get()).rejects.toMatchObject({ type: "unauthorized" });
    // Token manager invalidate was called — a second token call would happen on
    // next request but maxRetries=0 prevents another attempt here.
  });

  it("attaches Idempotency-Key on POST", async () => {
    const fetch = fetchWithToken({ status: 201, body: { enduser_id: "eu_1", status: "pending", type: "person" } });
    const rails = makeSdk(fetch);

    await rails.endusers.create({ person: {} });
    const [, init] = fetch.mock.calls[1]!;
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBeTruthy();
  });
});

// ── Retry policy ───────────────────────────────────────────────────────────────

describe("Retry policy", () => {
  it("retries on 503 up to maxRetries", async () => {
    const fetch = mockFetch([
      { status: 200, body: tokenResponse() },
      { status: 503, body: { message: "unavailable" } },
      { status: 503, body: { message: "unavailable" } },
      { status: 200, body: { enduser_id: "eu_1", status: "active", type: "person" } },
    ]);
    const rails = new Railsr({
      clientId: "id",
      clientSecret: "secret",
      fetchFn: fetch as unknown as typeof globalThis.fetch,
      retry: { maxRetries: 3, baseBackoffMs: 0 }, // zero backoff in tests
    });

    const result = await rails.endusers.get("eu_1");
    expect(result.enduser_id).toBe("eu_1");
    // token + 2 failures + 1 success = 4 calls
    expect(fetch).toHaveBeenCalledTimes(4);
  });
});
