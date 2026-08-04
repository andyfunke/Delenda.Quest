/**
 * §4.14 deterministic subset sampler over a frozen enumeration manifest.
 * Audit stream drawn first; weighted stream fills the remainder.
 */

import { stableHash, uniformInt } from "./hash.mjs";

/** §4.9 auditSlotFraction (ratify@017 / used by §4.14 sampler). */
const AUDIT_SLOT_FRACTION = 0.2;

/**
 * @param {object} input
 * @param {object} input.manifest frozen enumeration manifest
 * @param {number} input.batchSeed
 * @param {number} input.batchSize
 * @param {"uniform"|"curiosity-weighted"} [input.samplePolicy]
 */
export function sampleManifestSubset(input) {
  const { manifest, batchSeed, batchSize } = input;
  const samplePolicy = input.samplePolicy ?? "uniform";
  if (!manifest || typeof manifest !== "object") {
    throw new Error("MANIFEST_REQUIRED");
  }
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new Error("BATCH_SIZE_INVALID");
  }
  const inventory = [...(manifest.candidates ?? [])].sort((a, b) =>
    String(a.id).localeCompare(String(b.id)),
  );
  if (!inventory.length) throw new Error("MANIFEST_EMPTY");
  if (batchSize > inventory.length) throw new Error("BATCH_SIZE_EXCEEDS_MANIFEST");

  const auditSlots = Math.max(1, Math.floor(batchSize * AUDIT_SLOT_FRACTION));
  const auditCount = Math.min(auditSlots, batchSize);
  const selected = [];
  const used = new Set();

  for (let k = 0; k < auditCount; k++) {
    let pick = null;
    for (let attempt = 0; attempt < inventory.length * 2; attempt++) {
      const idx = uniformInt(
        `${batchSeed}:audit:${k}:${attempt}`,
        0,
        inventory.length - 1,
      );
      const row = inventory[idx];
      if (!used.has(row.id)) {
        pick = row;
        break;
      }
    }
    if (!pick) {
      pick = inventory.find((row) => !used.has(row.id));
    }
    if (!pick) break;
    used.add(pick.id);
    selected.push({ ...pick, sampleLane: "audit" });
  }

  const remaining = batchSize - selected.length;
  const pool = inventory.filter((row) => !used.has(row.id));
  if (samplePolicy === "uniform") {
    for (let k = 0; k < remaining; k++) {
      const idx = uniformInt(
        `${batchSeed}:weighted:${k}`,
        0,
        pool.length - 1,
      );
      const row = pool.splice(idx, 1)[0];
      if (!row) break;
      selected.push({ ...row, sampleLane: "weighted" });
    }
  } else {
    // Curiosity-weighted: rank by stableHash of id+seed as a stand-in weight
    // until Epoch 016/017 supply learned curiosity. Still deterministic.
    const ranked = [...pool].sort((a, b) => {
      const wa = stableHash(`${batchSeed}:weight:${a.id}`);
      const wb = stableHash(`${batchSeed}:weight:${b.id}`);
      return wb - wa || String(a.id).localeCompare(String(b.id));
    });
    for (let k = 0; k < remaining; k++) {
      const row = ranked[k];
      if (!row) break;
      selected.push({ ...row, sampleLane: "weighted" });
    }
  }

  return {
    manifestHash: manifest.manifestHash,
    medium: manifest.medium,
    sourceVersion: manifest.sourceVersion,
    seed: batchSeed,
    samplePolicy,
    batchSize,
    auditSlots: auditCount,
    candidateIds: selected.map((row) => row.id),
    candidates: selected,
  };
}
