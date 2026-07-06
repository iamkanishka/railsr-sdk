/**
 * @internal
 * Idempotency key generation.
 * Uses `crypto.randomUUID()` (available in Node ≥ 15 and all modern browsers).
 */

export function generateIdempotencyKey(): string {
  // Prefer the Web Crypto API (universal Node 18+ / browsers).
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }
  // Fallback: Math.random()-based UUID v4 (test environments).
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
