/**
 * @module types
 * Complete type definitions for the Railsr Embedded Finance API.
 *
 * Open-ended string enums follow the `"known_value" | (string & {})` pattern —
 * this preserves autocomplete for the known values while still accepting
 * undocumented strings the API may return. It satisfies
 * `@typescript-eslint/no-redundant-type-constituents` because
 * `string & {}` is a distinct type from `string`.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Open enum helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * An open string enum: the listed literals get autocomplete,
 * but any other string is also valid (for forward-compat with new API values).
 */
type OpenEnum<T extends string> = T | (string & Record<never, never>);

// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────

export interface Token {
  readonly access_token: string;
  readonly token_type: string;
  readonly expires_in: number;
  readonly scope: string;
  /** Epoch ms when the token was fetched. Not part of the API response. */
  readonly fetched_at: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared sub-types
// ─────────────────────────────────────────────────────────────────────────────

export interface Address {
  address_refinement?: string;
  address_number?: string;
  address_street?: string;
  address_city?: string;
  address_region?: string;
  address_postal_code?: string;
  address_iso_country?: string;
}

export interface PersonName {
  family_name?: string;
  given_name?: string;
  middle_name?: string;
}

export interface Person {
  name?: PersonName;
  email?: string;
  date_of_birth?: string;
  nationality?: string;
  country_of_residence?: string[];
  address?: Address;
}

export interface Company {
  name?: string;
  registration_number?: string;
  country?: string;
  address?: Address;
}

// ─────────────────────────────────────────────────────────────────────────────
// Enduser
// ─────────────────────────────────────────────────────────────────────────────

export type EnduserType = OpenEnum<"person" | "company">;
export type EnduserStatus = OpenEnum<
  "pending" | "active" | "suspended" | "closed"
>;
export type KYCStatus = OpenEnum<
  "not_started" | "pending" | "passed" | "failed" | "referred"
>;

export interface Enduser {
  readonly enduser_id: string;
  readonly status: EnduserStatus;
  readonly type: EnduserType;
  readonly person?: Person;
  readonly company?: Company;
  readonly kyc_status?: KYCStatus;
  readonly customer_id?: string;
  readonly created_at?: string;
  readonly updated_at?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface KYCCheck {
  readonly kyc_check_id: string;
  readonly status: KYCStatus;
  readonly provider?: string;
  readonly created_at?: string;
  readonly updated_at?: string;
  readonly failure_reasons?: string[];
  readonly refer_reasons?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Ledger
// ─────────────────────────────────────────────────────────────────────────────

export type LedgerStatus = OpenEnum<
  "pending" | "active" | "suspended" | "closed"
>;
export type HolderType = OpenEnum<"enduser" | "customer">;
export type AssetClass = OpenEnum<"currency" | "crypto">;

export interface Ledger {
  readonly ledger_id: string;
  readonly holder_id: string;
  readonly holder_type: HolderType;
  readonly ledger_type: string;
  readonly asset_class: AssetClass;
  readonly asset_type: string;
  readonly status: LedgerStatus;
  /** Balance in minor units (pence, cents). */
  readonly balance: number;
  readonly amount_reserved: number;
  readonly amount_available: number;
  readonly currency: string;
  readonly uk_account_number?: string;
  readonly uk_sort_code?: string;
  readonly iban?: string;
  readonly bic?: string;
  readonly customer_id?: string;
  readonly created_at?: string;
  readonly updated_at?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface LedgerEntry {
  readonly entry_id: string;
  readonly ledger_id: string;
  readonly transaction_id?: string;
  readonly debit_credit: OpenEnum<"debit" | "credit">;
  readonly amount: number;
  readonly currency: string;
  readonly balance_before: number;
  readonly balance_after: number;
  readonly created_at?: string;
  readonly description?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Beneficiary
// ─────────────────────────────────────────────────────────────────────────────

export type BeneficiaryStatus = OpenEnum<
  "pending" | "active" | "quarantined" | "suspended"
>;
export type COPResult = OpenEnum<
  "matched" | "close_match" | "not_matched" | "cannot_match"
>;

export interface Beneficiary {
  readonly beneficiary_id: string;
  readonly enduser_id?: string;
  readonly customer_id?: string;
  readonly status: BeneficiaryStatus;
  readonly name: string;
  readonly uk_account_number?: string;
  readonly uk_sort_code?: string;
  readonly iban?: string;
  readonly bic?: string;
  readonly country?: string;
  readonly currency: string;
  readonly cop_result?: COPResult;
  readonly cop_matched?: boolean;
  readonly created_at?: string;
  readonly updated_at?: string;
  readonly metadata?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Transaction
// ─────────────────────────────────────────────────────────────────────────────

export type TransactionStatus = OpenEnum<
  "pending" | "processing" | "accepted" | "failed" | "quarantined"
>;
export type TransactionType = OpenEnum<
  | "send-money"
  | "inter-ledger"
  | "fx"
  | "virtual-credit"
  | "virtual-debit"
  | "card-transaction"
  | "direct-debit"
>;
export type PaymentType = OpenEnum<
  "faster-payment" | "bacs" | "sepa" | "swift"
>;

export interface Transaction {
  readonly transaction_id: string;
  readonly ledger_id?: string;
  readonly beneficiary_id?: string;
  readonly transaction_type: TransactionType;
  readonly status: TransactionStatus;
  readonly amount: number;
  readonly currency: string;
  readonly payment_type?: PaymentType;
  readonly reason?: string;
  readonly reference?: string;
  readonly destination_ledger_id?: string;
  readonly fx_rate?: number;
  readonly fee_amount?: number;
  readonly failure_reasons?: string[];
  readonly quarantine_id?: string;
  readonly entry_mode?: string;
  readonly merchant_name?: string;
  readonly merchant_category_code?: string;
  readonly customer_id?: string;
  readonly created_at?: string;
  readonly updated_at?: string;
  readonly metadata?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Card
// ─────────────────────────────────────────────────────────────────────────────

export type CardType = OpenEnum<"virtual" | "physical">;
export type CardStatus = OpenEnum<
  "pending" | "active" | "frozen" | "suspended" | "cancelled"
>;
export type CardScheme = OpenEnum<"visa" | "mastercard">;
export type CardRuleType = OpenEnum<
  "amount_limit" | "mcc_block" | "country_block" | "mcc_allow"
>;
export type CardLimitInterval = OpenEnum<
  "transaction" | "daily" | "weekly" | "monthly"
>;
export type ReplacementReason = OpenEnum<
  "lost" | "stolen" | "damaged" | "expired"
>;
export type WalletProvider = OpenEnum<"apple_pay" | "google_pay">;

export interface CardRule {
  readonly rule_id: string;
  readonly card_id: string;
  readonly rule_type: CardRuleType;
  readonly limit_amount?: number;
  readonly limit_currency?: string;
  readonly limit_interval?: CardLimitInterval;
  readonly mcc_list?: string[];
  readonly country_list?: string[];
  readonly created_at?: string;
}

export interface Card {
  readonly card_id: string;
  readonly ledger_id: string;
  readonly enduser_id?: string;
  readonly card_type: CardType;
  readonly status: CardStatus;
  readonly card_programme_id: string;
  readonly scheme?: CardScheme;
  readonly expiry_month?: string;
  readonly expiry_year?: string;
  readonly last_four?: string;
  readonly card_holder_name?: string;
  readonly dispatch_method?: string;
  readonly physical_delivery_address?: Address;
  readonly payment_tokens?: unknown[];
  readonly created_at?: string;
  readonly updated_at?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface CardProgramme {
  readonly card_programme_id: string;
  readonly name: string;
  readonly scheme: CardScheme;
  readonly currency: string;
  readonly card_type: CardType;
  readonly customer_id?: string;
  readonly created_at?: string;
}

/** Raw PAN token response from the MeaWallet secure endpoint. */
export type PANResponse = Record<string, unknown>;

/** Digital wallet provisioning response. */
export type PaymentTokenResponse = Record<string, unknown>;

// ─────────────────────────────────────────────────────────────────────────────
// Direct Debit
// ─────────────────────────────────────────────────────────────────────────────

export type MandateStatus = OpenEnum<
  "pending" | "active" | "cancelled" | "failed"
>;

export interface Mandate {
  readonly mandate_id: string;
  readonly enduser_id: string;
  readonly ledger_id: string;
  readonly status: MandateStatus;
  readonly account_number: string;
  readonly sort_code: string;
  readonly account_holder_name: string;
  readonly reference?: string;
  readonly created_at?: string;
  readonly updated_at?: string;
  readonly activated_at?: string;
  readonly cancelled_at?: string;
}

export type PaymentStatus = OpenEnum<
  "pending" | "collected" | "failed" | "cancelled"
>;

export interface Payment {
  readonly payment_id: string;
  readonly mandate_id: string;
  readonly ledger_id: string;
  readonly status: PaymentStatus;
  readonly amount: number;
  readonly currency: string;
  readonly reason?: string;
  readonly created_at?: string;
  readonly updated_at?: string;
  readonly collected_at?: string;
  readonly failure_reason?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Firewall
// ─────────────────────────────────────────────────────────────────────────────

export type FirewallAction = OpenEnum<"allow" | "block" | "quarantine">;

export interface FirewallRule {
  name: string;
  rule: string;
  action: FirewallAction;
  priority: number;
}

export interface FirewallRules {
  readonly customer_id: string;
  readonly rules: FirewallRule[];
  readonly updated_at?: string;
}

export interface FirewallDataset {
  readonly name: string;
  readonly columns: string[];
  readonly row_count?: number;
  readonly created_at?: string;
  readonly updated_at?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook / Notifications
// ─────────────────────────────────────────────────────────────────────────────

export type WebhookDeliveryStatus = OpenEnum<
  "delivered" | "failed" | "pending"
>;

export interface WebhookConfig {
  readonly url: string;
  readonly secret_present: boolean;
  readonly created_at?: string;
  readonly updated_at?: string;
}

export interface WebhookEvent {
  readonly notification_id: string;
  readonly type: string;
  readonly data: Record<string, unknown>;
  readonly timestamp?: string;
  readonly status: WebhookDeliveryStatus;
  readonly next_attempt_at?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Customer
// ─────────────────────────────────────────────────────────────────────────────

export interface Customer {
  readonly customer_id: string;
  readonly name: string;
  readonly status: string;
  readonly products?: string[];
  readonly limits?: Record<string, unknown>;
  readonly created_at?: string;
  readonly updated_at?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────────────────────────────────────

export interface PaginationParams {
  limit?: number;
  offset?: number;
  from?: string;
  to?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Environment
// ─────────────────────────────────────────────────────────────────────────────

export type Environment = "play" | "play_live" | "live";
