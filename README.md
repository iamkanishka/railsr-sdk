# railsr-sdk

Production-grade TypeScript SDK for the [Railsr](https://docs.railsr.com) Embedded Finance API.

[![npm](https://img.shields.io/npm/v/railsr-sdk)](https://www.npmjs.com/package/railsr-sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

## Features

- **Full API coverage** — Endusers, Ledgers, Transactions, Beneficiaries, Cards, Mandates, Direct Debit, Firewall, Webhooks, Customer
- **OAuth 2.0 auto-refresh** — transparent `client_credentials` token management with 60 s pre-emptive refresh
- **Idempotency** — auto-generated `Idempotency-Key` on all `POST`/`PUT`/`PATCH` requests
- **Retry with full-jitter back-off** — configurable `maxRetries`, `baseBackoffMs`, `maxBackoffMs`
- **Circuit breaker** — sliding-window protection against cascading failures
- **Client-side rate limiter** — token-bucket to stay within Railsr's rate limits
- **Telemetry hook** — plug in your own metrics / tracing on every HTTP attempt
- **Webhook signature verification** — constant-time HMAC-SHA256 via `verifyWebhookSignature()`
- **Dual ESM + CJS** — works in Node.js, Bun, Deno, and bundled apps
- **Zero runtime dependencies** — only Node.js built-ins
- **Strict TypeScript** — `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`

## Requirements

- Node.js ≥ 18 (for native `fetch` and `crypto.randomUUID`)
- TypeScript ≥ 5.x (if using types)

## Installation

```bash
npm install railsr-sdk
# or
yarn add railsr-sdk
# or
pnpm add railsr-sdk
```

## Quick Start

```typescript
import { Railsr } from "railsr-sdk";

const rails = new Railsr({
  clientId: process.env.RAILSR_CLIENT_ID!,
  clientSecret: process.env.RAILSR_CLIENT_SECRET!,
  environment: "live", // "play" | "play_live" | "live"
});

// 1. Create an enduser
const enduser = await rails.endusers.create({
  person: {
    name: { family_name: "Smith", given_name: "Alice" },
    email: "alice@example.com",
    date_of_birth: "1990-01-15",
    nationality: "GB",
    country_of_residence: ["GB"],
  },
});

// 2. Open a GBP ledger
const ledger = await rails.ledgers.create({
  holder_id: enduser.enduser_id,
  ledger_type: "standard-gbp",
  asset_class: "currency",
  asset_type: "gbp",
});

// 3. Trigger a KYC check
const kyc = await rails.endusers.createKYCCheck(enduser.enduser_id);

// 4. Wait for KYC to pass (polling helper)
const activated = await rails.endusers.waitForStatus(enduser.enduser_id, {
  targetStatuses: ["active"],
  timeoutMs: 60_000,
});

// 5. Create a beneficiary
const ben = await rails.beneficiaries.create({
  name: "ACME Ltd",
  currency: "GBP",
  uk_sort_code: "010203",
  uk_account_number: "12345678",
});

// 6. Send money
const tx = await rails.transactions.sendMoney({
  ledger_id: ledger.ledger_id,
  beneficiary_id: ben.beneficiary_id,
  amount: 10000, // £100.00 in pence
  currency: "GBP",
  payment_type: "faster-payment",
  reference: "Invoice #42",
});

// 7. Wait for the transaction to settle
const settled = await rails.transactions.waitForTerminal(tx.transaction_id);
console.log(settled.status); // "accepted" | "failed" | "quarantined"
```

## API Reference

### `new Railsr(options)`

| Option | Type | Default | Description |
|---|---|---|---|
| `clientId` | `string` | **required** | Railsr OAuth 2.0 client ID |
| `clientSecret` | `string` | **required** | Railsr OAuth 2.0 client secret |
| `environment` | `"play" \| "play_live" \| "live"` | `"play"` | Target environment |
| `retry` | `RetryOptions` | `{ maxRetries: 3 }` | Retry / back-off config |
| `circuitBreaker` | `CircuitBreakerOptions` | `{ threshold: 5 }` | Circuit breaker config |
| `rateLimitRps` | `number` | `50` | Client-side RPS cap |
| `onRequest` | `TelemetryHook` | noop | Per-attempt telemetry callback |
| `signal` | `AbortSignal` | — | Global cancellation signal |
| `fetchFn` | `typeof fetch` | `globalThis.fetch` | Custom fetch implementation |

---

### Endusers — `rails.endusers`

```typescript
// CRUD
await rails.endusers.create(params)
await rails.endusers.get(enduserID)
await rails.endusers.list({ status: "active", limit: 50 })
await rails.endusers.update(enduserID, params)
await rails.endusers.patch(enduserID, partialParams)

// KYC
await rails.endusers.createKYCCheck(enduserID)
await rails.endusers.listKYCChecks(enduserID)
await rails.endusers.getKYCCheck(enduserID, checkID)

// Compliance
await rails.endusers.recalculateFirewall(enduserID)

// Polling
await rails.endusers.waitForStatus(enduserID, { targetStatuses: ["active"] })
```

### Ledgers — `rails.ledgers`

```typescript
await rails.ledgers.create(params)
await rails.ledgers.get(ledgerID)
await rails.ledgers.list({ holder_id: enduserID })
await rails.ledgers.update(ledgerID, { metadata: {} })
await rails.ledgers.findByUKAccount(sortCode, accountNumber)
await rails.ledgers.findByIBAN(iban)
await rails.ledgers.listEntries(ledgerID, { limit: 100 })
await rails.ledgers.creditVirtual({ ledger_id, amount })
await rails.ledgers.debitVirtual({ ledger_id, amount })
await rails.ledgers.devCredit(ledgerID, { amount, currency }) // PLAY only
await rails.ledgers.waitForActive(ledgerID)
```

### Transactions — `rails.transactions`

```typescript
await rails.transactions.sendMoney(params)
await rails.transactions.interLedger(params)
await rails.transactions.fx(params)
await rails.transactions.get(transactionID)
await rails.transactions.list({ ledger_id, status: "pending" })
await rails.transactions.listQuarantined()
await rails.transactions.approve(transactionID)
await rails.transactions.reject(transactionID, "reason")
await rails.transactions.resolveQuarantine(transactionID, { resolution: "approve" })
await rails.transactions.retry(transactionID)
await rails.transactions.waitForTerminal(transactionID)
```

### Beneficiaries — `rails.beneficiaries`

```typescript
await rails.beneficiaries.create(params)
await rails.beneficiaries.get(beneficiaryID)
await rails.beneficiaries.list({ enduser_id })
await rails.beneficiaries.update(beneficiaryID, { name })
await rails.beneficiaries.verify(beneficiaryID, { payment_type: "faster-payment" })
await rails.beneficiaries.recalculateFirewall(beneficiaryID)
```

### Cards — `rails.cards`

```typescript
await rails.cards.create(params)
await rails.cards.get(cardID)
await rails.cards.list({ ledger_id, card_type: "virtual" })
await rails.cards.activate(cardID)
await rails.cards.freeze(cardID)
await rails.cards.unfreeze(cardID)
await rails.cards.cancel(cardID)
await rails.cards.suspend(cardID)
await rails.cards.replace(cardID, { replacement_reason: "lost" })
await rails.cards.getPAN(cardID)
await rails.cards.resetPINAttempts(cardID)
await rails.cards.listTransactions(cardID)

// Spend controls
await rails.cards.createRule(cardID, { rule_type: "amount_limit", limit_amount: 50000 })
await rails.cards.listRules(cardID)
await rails.cards.getRule(cardID, ruleID)
await rails.cards.deleteRule(cardID, ruleID)

// Card Programmes
await rails.cards.listProgrammes()
await rails.cards.getProgramme(programmeID)

// Digital Wallets (Labs)
await rails.cards.createPaymentToken(cardID, params)
await rails.cards.listPaymentTokens(cardID)
```

### Mandates & Direct Debit

```typescript
// Mandates
await rails.mandates.create(params)
await rails.mandates.get(mandateID)
await rails.mandates.list({ enduser_id })
await rails.mandates.cancel(mandateID)
await rails.mandates.waitForActive(mandateID)

// Payments
await rails.payments.create({ mandate_id, amount: 5000 })
await rails.payments.get(paymentID)
await rails.payments.list({ mandate_id })
```

### Firewall — `rails.firewall`

```typescript
await rails.firewall.setRules({ rules: [...] })
await rails.firewall.getRules()
await rails.firewall.createDataset({ name, columns, rows })
await rails.firewall.listDatasets()
await rails.firewall.updateDataset(name, { columns, rows })
await rails.firewall.deleteDataset(name)
await rails.firewall.getFunctions()
```

### Webhooks — `rails.webhooks`

```typescript
await rails.webhooks.configure({ url: "https://...", secret: "..." })
await rails.webhooks.getConfig()
await rails.webhooks.listHistory({ from: "2024-01-01", status: "failed" })
await rails.webhooks.retry(notificationID)
```

### Customer — `rails.customer`

```typescript
await rails.customer.get()
await rails.customer.update({ metadata: {} })
await rails.customer.listProducts()
```

---

## Webhook Signature Verification

```typescript
import { verifyWebhookSignature } from "railsr-sdk";

// Express example
app.post("/webhook", express.raw({ type: "*/*" }), (req, res) => {
  verifyWebhookSignature(
    req.body,                                         // Buffer
    req.headers["x-railsr-signature"] as string,
    process.env.RAILSR_WEBHOOK_SECRET!,
  );
  // Signature is valid — process the event
  const event = JSON.parse(req.body.toString());
  console.log(event.type); // e.g. "transaction-accepted"
  res.sendStatus(200);
});
```

Throws `RailsrError` with `type: "invalid_signature"` on mismatch.

---

## Error Handling

All SDK methods throw `RailsrError` on failure:

```typescript
import { RailsrError, isRailsrError } from "railsr-sdk";

try {
  await rails.endusers.get("eu_missing");
} catch (err) {
  if (err instanceof RailsrError) {
    console.log(err.type);       // "not_found"
    console.log(err.statusCode); // 404
    console.log(err.code);       // "ERROR_ENTITY_NOT_FOUND"
    console.log(err.requestId);  // "req_abc123" — for Railsr support
    console.log(err.retryable);  // false
    console.log(err.details);    // full response body
  }
}
```

### Error types

| `type` | HTTP | Retryable | Meaning |
|---|---|---|---|
| `unauthorized` | 401 | on first attempt | Invalid / expired credentials |
| `forbidden` | 403 | ✗ | Insufficient permissions |
| `not_found` | 404 | ✗ | Resource does not exist |
| `conflict` | 409 | ✗ | Duplicate / state conflict |
| `unprocessable` | 422 | ✗ | Validation failure |
| `rate_limited` | 429 | ✓ | Too many requests |
| `server_error` | 5xx | ✓ | Railsr internal error |
| `circuit_open` | — | ✓ | Too many recent failures |
| `network` | — | ✓ | Connection / DNS error |
| `invalid_signature` | — | ✗ | Webhook HMAC mismatch |
| `validation` | — | ✗ | SDK-level validation |

---

## Advanced Configuration

### Telemetry / Observability

```typescript
const rails = new Railsr({
  clientId: "...",
  clientSecret: "...",
  onRequest: (event) => {
    // Fires after every HTTP attempt (including retries)
    metrics.histogram("railsr.request.duration_ms", event.durationMs, {
      method: event.method,
      path: event.path,
      status: String(event.statusCode ?? 0),
      attempt: String(event.attempt),
    });
    if (event.error) {
      metrics.increment("railsr.request.errors", { type: event.error.type });
    }
  },
});
```

### Custom Retry Policy

```typescript
const rails = new Railsr({
  clientId: "...",
  clientSecret: "...",
  retry: {
    maxRetries: 5,
    baseBackoffMs: 100,
    maxBackoffMs: 30_000,
  },
});
```

### Circuit Breaker

```typescript
const rails = new Railsr({
  clientId: "...",
  clientSecret: "...",
  circuitBreaker: {
    threshold: 10,          // open after 10 failures in the window
    resetTimeoutMs: 60_000, // try again after 60 s
  },
});
```

### Graceful Shutdown

```typescript
const controller = new AbortController();
const rails = new Railsr({ clientId: "...", clientSecret: "...", signal: controller.signal });

process.on("SIGTERM", () => controller.abort());
```

### Per-Request Idempotency Keys

```typescript
await rails.transactions.sendMoney(params, {
  idempotencyKey: "my-own-key-tied-to-db-record-id-42",
});
```

---

## Development

```bash
# Install
npm install

# Type-check
npm run typecheck

# Test
npm test

# Test with coverage
npm run test:coverage

# Build
npm run build
```

## Environments

| Environment | Base URL | Purpose |
|---|---|---|
| `play` | `https://play.railsbank.com` | Sandbox — fake money |
| `play_live` | `https://playlive.railsbank.com` | Staging — real rails |
| `live` | `https://live.railsbank.com` | Production |

## License

MIT © Voidspace
