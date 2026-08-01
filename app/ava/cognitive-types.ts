export type CognitiveScalar = string | number | boolean | null;
export type CognitiveValue =
  | CognitiveScalar
  | CognitiveValue[]
  | { [key: string]: CognitiveValue };

export type CognitiveVisibility = "AVA_VISIBLE" | "PLAYER_VISIBLE" | "HIDDEN";
export type CognitiveAuthority = "READ_ONLY" | "PLAN_ONLY" | "PREPARE" | "MUTATE";
export type CognitiveValueKind =
  | "NUMBER"
  | "STRING"
  | "BOOLEAN"
  | "ENUM"
  | "ENTITY_ID"
  | "NUMBER_SET"
  | "STRING_SET"
  | "RECORD";

export type CognitiveUncertainty =
  | { kind: "EXACT" }
  | { kind: "INTERVAL"; low: number; high: number }
  | {
      kind: "CATEGORICAL";
      alternatives: Array<{ value: CognitiveScalar; weight: number }>;
    };

export type CognitiveSource = {
  id: string;
  kind: "WORLD" | "COMPILER" | "PLAYER" | "DERIVED" | "ENGINE";
  label: string;
  visibility: CognitiveVisibility;
  reliability: number;
  independentGroup: string;
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

export const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isRecord(value))
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, child]) => child !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("cognitive values must be finite");
    return Object.is(value, -0) ? 0 : value;
  }
  return value;
};

export const canonicalJson = (value: unknown) =>
  JSON.stringify(canonicalize(value));

const SHA256_INITIAL_STATE: readonly number[] = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f,
  0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
];

const SHA256_ROUND_CONSTANTS = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b,
  0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01,
  0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7,
  0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152,
  0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
  0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819,
  0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08,
  0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f,
  0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
] as const;

const rotateRight = (value: number, count: number) =>
  (value >>> count) | (value << (32 - count));

/** Synchronous SHA-256 over UTF-8 text, usable in browsers, Workers, and Node. */
export const sha256Hex = (text: string) => {
  const bytes = new TextEncoder().encode(text);
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const message = new Uint8Array(paddedLength);
  message.set(bytes);
  message[bytes.length] = 0x80;

  const bitLength = bytes.length * 8;
  const view = new DataView(message.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x1_0000_0000));
  view.setUint32(paddedLength - 4, bitLength >>> 0);

  const state = [...SHA256_INITIAL_STATE];
  const words = new Uint32Array(64);
  for (let offset = 0; offset < message.length; offset += 64) {
    for (let index = 0; index < 16; index += 1)
      words[index] = view.getUint32(offset + index * 4);
    for (let index = 16; index < 64; index += 1) {
      const before15 = words[index - 15];
      const before2 = words[index - 2];
      const sigma0 =
        rotateRight(before15, 7) ^
        rotateRight(before15, 18) ^
        (before15 >>> 3);
      const sigma1 =
        rotateRight(before2, 17) ^
        rotateRight(before2, 19) ^
        (before2 >>> 10);
      words[index] =
        (words[index - 16] + sigma0 + words[index - 7] + sigma1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = state;
    for (let index = 0; index < 64; index += 1) {
      const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temporary1 =
        (h + sum1 + choice + SHA256_ROUND_CONSTANTS[index] + words[index]) >>>
        0;
      const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temporary2 = (sum0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temporary1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temporary1 + temporary2) >>> 0;
    }

    state[0] = (state[0] + a) >>> 0;
    state[1] = (state[1] + b) >>> 0;
    state[2] = (state[2] + c) >>> 0;
    state[3] = (state[3] + d) >>> 0;
    state[4] = (state[4] + e) >>> 0;
    state[5] = (state[5] + f) >>> 0;
    state[6] = (state[6] + g) >>> 0;
    state[7] = (state[7] + h) >>> 0;
  }

  return state.map((word) => word.toString(16).padStart(8, "0")).join("");
};

export const cognitiveDigest = (value: unknown) => {
  return sha256Hex(canonicalJson(value));
};

export const uniqueStrings = (values: readonly string[]) =>
  values.length === new Set(values).size;

export const assertIdentifier = (value: string, label: string) => {
  if (!/^[a-z][a-z0-9]*(?:[-_.][a-z0-9]+)*$/i.test(value))
    throw new Error(`${label} has invalid identifier ${JSON.stringify(value)}`);
};

export const cloneCognitive = <T>(value: T): T =>
  JSON.parse(canonicalJson(value)) as T;

export const validateUncertainty = (uncertainty: CognitiveUncertainty) => {
  if (uncertainty.kind === "EXACT") return true;
  if (uncertainty.kind === "INTERVAL") {
    if (
      !Number.isFinite(uncertainty.low) ||
      !Number.isFinite(uncertainty.high) ||
      uncertainty.low > uncertainty.high
    )
      throw new Error("uncertainty interval is invalid");
    return true;
  }
  if (!uncertainty.alternatives.length)
    throw new Error("categorical uncertainty has no alternatives");
  let total = 0;
  const values = new Set<string>();
  for (const alternative of uncertainty.alternatives) {
    if (!Number.isFinite(alternative.weight) || alternative.weight <= 0)
      throw new Error("categorical uncertainty weight must be positive");
    const key = canonicalJson(alternative.value);
    if (values.has(key)) throw new Error("categorical uncertainty repeats a value");
    values.add(key);
    total += alternative.weight;
  }
  if (Math.abs(total - 1) > 1e-9)
    throw new Error("categorical uncertainty weights must sum to one");
  return true;
};
