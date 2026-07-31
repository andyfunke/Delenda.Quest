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

export const cognitiveDigest = (value: unknown) => {
  const text = canonicalJson(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
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
