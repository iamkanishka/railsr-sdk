/**
 * railsr-sdk
 * Production-grade TypeScript SDK for the Railsr Embedded Finance API.
 *
 * @packageDocumentation
 */

// ── Root client ────────────────────────────────────────────────────────────────
export { Railsr } from "./railsr.js";
export type { RailsrOptions } from "./railsr.js";

// ── Error types ────────────────────────────────────────────────────────────────
export {
  RailsrError,
  isRailsrError,
  classifyStatus,
  isRetryableStatus,
} from "./types/errors.js";
export type { ErrorType, RailsrErrorOptions } from "./types/errors.js";

// ── Domain types ───────────────────────────────────────────────────────────────
export type {
  // Shared
  Address,
  PersonName,
  Person,
  Company,
  PaginationParams,
  Environment,
  Token,

  // Enduser
  Enduser,
  KYCCheck,
  EnduserType,
  EnduserStatus,
  KYCStatus,

  // Ledger
  Ledger,
  LedgerEntry,
  LedgerStatus,
  HolderType,
  AssetClass,

  // Beneficiary
  Beneficiary,
  BeneficiaryStatus,
  COPResult,

  // Transaction
  Transaction,
  TransactionStatus,
  TransactionType,
  PaymentType,

  // Card
  Card,
  CardRule,
  CardProgramme,
  PANResponse,
  PaymentTokenResponse,
  CardType,
  CardStatus,
  CardScheme,
  CardRuleType,
  CardLimitInterval,
  ReplacementReason,
  WalletProvider,

  // Direct Debit
  Mandate,
  MandateStatus,
  Payment,
  PaymentStatus,

  // Firewall
  FirewallRule,
  FirewallRules,
  FirewallDataset,
  FirewallAction,

  // Webhook
  WebhookConfig,
  WebhookEvent,
  WebhookDeliveryStatus,

  // Customer
  Customer,
} from "./types/index.js";

// ── Resource request param types ───────────────────────────────────────────────
export type {
  CreateEnduserParams,
  UpdateEnduserParams,
  PatchEnduserParams,
  ListEndusersParams,
  CreateKYCCheckParams,
  WaitForStatusOptions,
} from "./resources/endusers.js";

export type {
  CreateLedgerParams,
  UpdateLedgerParams,
  ListLedgersParams,
  ListEntriesParams,
  VirtualCreditParams,
  VirtualDebitParams,
  DevCreditParams,
  WaitForLedgerActiveOptions,
} from "./resources/ledgers.js";

export type {
  SendMoneyParams,
  InterLedgerParams,
  FXParams,
  ResolveQuarantineParams,
  ListTransactionsParams,
  WaitForTerminalOptions,
} from "./resources/transactions.js";

export type {
  CreateBeneficiaryParams,
  UpdateBeneficiaryParams,
  ListBeneficiariesParams,
  VerifyBeneficiaryParams,
} from "./resources/beneficiaries.js";

export type {
  CreateCardParams,
  ListCardsParams,
  ReplaceCardParams,
  CreateCardRuleParams,
  CreatePaymentTokenParams,
  ListCardTransactionsParams,
} from "./resources/cards.js";

export type {
  CreateMandateParams,
  ListMandatesParams,
  WaitForMandateActiveOptions,
  CreatePaymentParams,
  ListPaymentsParams,
} from "./resources/mandates.js";

export type {
  SetRulesParams,
  CreateDatasetParams,
  UpdateDatasetParams,
} from "./resources/firewall.js";

export type {
  ConfigureWebhookParams,
  ListWebhookHistoryParams,
} from "./resources/webhooks.js";

export type { UpdateCustomerParams } from "./resources/customer.js";

// ── Webhook utilities ──────────────────────────────────────────────────────────
export {
  verifyWebhookSignature,
  computeWebhookSignature,
  WEBHOOK_EVENT_TYPES,
} from "./resources/webhooks.js";
export type { WebhookEventType } from "./resources/webhooks.js";

// ── Telemetry ──────────────────────────────────────────────────────────────────
export type { TelemetryHook, TelemetryEvent } from "./internal/telemetry.js";

// ── Internal primitives (advanced use) ────────────────────────────────────────
export type { RetryOptions } from "./internal/retry.js";
export type { CircuitBreakerOptions } from "./internal/circuit-breaker.js";
export type { RequestOptions } from "./internal/http-client.js";
