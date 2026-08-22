/**
 * Canonical seeded-draw hash (32-bit FNV-1a over UTF-16 code units).
 *
 * Every live deck draw, writing selection, docket ticket, and sub-mission
 * rotation derives from this idiom via the shared substrate
 * (`app/substrate/substrate-core.ts`). Draw tickets are ASCII by
 * construction, so no Unicode normalization is applied here. The offline
 * `.mjs` copies (`packages/campaign-scheduler/src/hash.mjs`,
 * `packages/contentgen-lab/src/hash.mjs`) additionally NFC-normalize their
 * input; that divergence only matters for non-NFC input and is pinned by
 * `tests/hash-parity.test.mjs` until the scheduler wiring epoch reconciles
 * the copies. Never fork another inline copy in app code.
 */
export const hashInt = (text: string) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export const stableHash = (text: string) => hashInt(text) / 4294967295;

export const candidateSetHash = (ids: string[]) =>
  hashInt([...ids].sort().join("|")).toString(16).padStart(8, "0");

export const selectionTicketFor = (parts: string[]) =>
  `docket-${hashInt(parts.join(":")).toString(16).padStart(8, "0")}`;
