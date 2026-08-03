/** §4.3 Canonical serialization (ratify@010). */

export const CONTENTGEN_CONTRACT_VERSION = "contentgen-contract/v1" as const;

/** Fields excluded from artifact identity hashes. */
export const HASH_EXCLUSIONS = ["generatedAt"] as const;

export type HashExclusion = (typeof HASH_EXCLUSIONS)[number];

export const nfc = (value: string): string => value.normalize("NFC");

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

/**
 * Canonical JSON: UTF-8 NFC text, object keys by Unicode codepoint,
 * no insignificant whitespace, fixed number rendering.
 */
export const canonicalJson = (value: unknown): string => {
  const walk = (node: unknown): unknown => {
    if (node === null) return null;
    if (typeof node === "string") return nfc(node);
    if (typeof node === "number") {
      if (!Number.isFinite(node)) {
        throw new TypeError("canonicalJson rejects NaN/Infinity");
      }
      return node;
    }
    if (typeof node === "boolean") return node;
    if (typeof node === "undefined") {
      throw new TypeError("canonicalJson rejects undefined");
    }
    if (typeof node === "bigint") {
      throw new TypeError("canonicalJson rejects bigint");
    }
    if (Array.isArray(node)) return node.map(walk);
    if (isPlainObject(node)) {
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(node).sort((a, b) =>
        a < b ? -1 : a > b ? 1 : 0,
      )) {
        out[nfc(key)] = walk(node[key]);
      }
      return out;
    }
    throw new TypeError(`canonicalJson rejects ${typeof node}`);
  };
  return JSON.stringify(walk(value));
};

/** Strip identity-excluded fields before hashing. */
export const stripHashExclusions = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stripHashExclusions);
  if (!isPlainObject(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if ((HASH_EXCLUSIONS as readonly string[]).includes(key)) continue;
    out[key] = stripHashExclusions(child);
  }
  return out;
};

export const identityCanonicalJson = (value: unknown): string =>
  canonicalJson(stripHashExclusions(value));

/** Version-bump rules for contentgen contracts. */
export const VERSION_BUMP_RULES = {
  contractVersion: CONTENTGEN_CONTRACT_VERSION,
  bumpMajorWhen: [
    "remove or retype a schema field",
    "change ticket grammar table",
    "change disposition legality matrix",
    "change trainer hyperparameter table without ratification",
  ],
  bumpMinorWhen: [
    "add optional field",
    "add medium projection field",
    "add reason code or failure class with migration note",
  ],
  bumpPatchWhen: ["documentation-only clarifications that do not alter validators"],
} as const;
