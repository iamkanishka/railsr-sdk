# Changelog

All notable changes to `railsr-sdk` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-28

### Added

- **Full API surface coverage**
  - `Endusers` — CRUD, KYC checks, compliance firewall recalculation, `waitForStatus()` polling helper
  - `Ledgers` — GBP/EUR/virtual ledgers, entry history, `findByUKAccount()`, `findByIBAN()`, virtual credit/debit, PLAY `devCredit()`, `waitForActive()` polling helper
  - `Transactions` — `sendMoney()`, `interLedger()`, `fx()`, quarantine management (`approve()`, `reject()`, `resolveQuarantine()`), `retry()`, `waitForTerminal()` polling helper
  - `Beneficiaries` — CRUD, Confirmation of Payee (`verify()`), firewall recalculation
  - `Cards` — virtual/physical card lifecycle (`activate`, `freeze`, `unfreeze`, `cancel`, `suspend`, `replace`), PAN retrieval, PIN reset, transaction history, spend-control rules, card programmes, digital wallet tokens (Labs)
  - `Mandates` — BACS Direct Debit mandate lifecycle, `waitForActive()` polling helper
  - `Payments` — Direct Debit payment collection
  - `Firewall` — rule-set management (atomic swap), CSV datasets, built-in function reference
  - `Webhooks` — configuration, delivery history, per-notification retry
  - `Customer` — account details, product list

- **Infrastructure**
  - OAuth 2.0 `client_credentials` token manager with 60 s pre-emptive refresh and 401 auto-invalidation
  - Auto-generated `Idempotency-Key` on all `POST`/`PUT`/`PATCH` requests
  - Full-jitter exponential back-off retry (`maxRetries`, `baseBackoffMs`, `maxBackoffMs`)
  - Sliding-window circuit breaker (`threshold`, `resetTimeoutMs`)
  - Token-bucket client-side rate limiter (`rateLimitRps`)
  - Pluggable telemetry hook (`onRequest`) for metrics / tracing
  - Per-request and global `AbortSignal` cancellation
  - `verifyWebhookSignature()` — constant-time HMAC-SHA256 webhook verification
  - `computeWebhookSignature()` — test utility for generating expected signatures
  - `WEBHOOK_EVENT_TYPES` — typed catalogue of all Railsr event type strings

- **Build**
  - Dual ESM (`dist/esm/`) + CJS (`dist/cjs/`) output
  - Declaration files + source maps (`dist/types/`)
  - Zero runtime dependencies
  - TypeScript 5.5, `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`
  - 55 unit tests, 100 % of all resource methods covered

[1.0.0]: https://github.com/voidspace/railsr-sdk/releases/tag/v1.0.0
