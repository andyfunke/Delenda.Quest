import { createHash } from "node:crypto";

export type PromotedContentManifest = {
  version: string;
  corpusVersion: string;
  manifestHash: string;
  candidates: readonly { productionId: string; parameters: Record<string, string | number | boolean>; contentHash: string; text: string }[];
};

const stable = (value: unknown): string => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${stable((value as Record<string, unknown>)[key])}`).join(",")}}`;
};

const digest = (value: unknown) => createHash("sha256").update(stable(value)).digest("hex");

export const verifyPromotedContentManifest = (manifest: PromotedContentManifest) => {
  const expected = digest({ version: manifest.version, corpusVersion: manifest.corpusVersion, candidates: manifest.candidates });
  if (expected !== manifest.manifestHash) return { ok: false as const, reason: "MANIFEST_HASH_MISMATCH" };
  if (!manifest.candidates.every((candidate) => candidate.productionId && candidate.contentHash && typeof candidate.text === "string")) return { ok: false as const, reason: "INVALID_CANDIDATE" };
  return { ok: true as const, reason: "PROMOTED_MANIFEST_VERIFIED" };
};

export const findPromotedCandidate = (manifest: PromotedContentManifest, productionId: string, parameters: Record<string, string | number | boolean>) => {
  if (!verifyPromotedContentManifest(manifest).ok) return null;
  return manifest.candidates.find((candidate) => candidate.productionId === productionId && stable(candidate.parameters) === stable(parameters)) ?? null;
};
