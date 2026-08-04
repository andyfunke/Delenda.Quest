/** Deterministic feature-vector builder (§4.5 shared + medium residuals). */

export const SHARED_FEATURE_IDS = [
  "claim-count",
  "compression",
  "concrete-abstract-ratio",
  "continuity-evidence",
  "causal-structure",
  "duplicate-distance",
].sort((a, b) => a.localeCompare(b));

export const AVA_FEATURE_IDS = [
  "action-read-separation",
  "clarification-safety",
  "intent-lowering",
].sort((a, b) => a.localeCompare(b));

export function featureOrderFor(medium) {
  const mediumIds = medium === "ava" ? AVA_FEATURE_IDS : [];
  return [...SHARED_FEATURE_IDS, ...mediumIds.map((id) => `${medium}:${id}`)];
}

export function buildFeatureVector(row, medium = "ava") {
  const text = String(row.text ?? "");
  const words = text.split(/\s+/).filter(Boolean);
  const shared = {
    compression: Math.min(1, words.length / 40),
    "claim-count": Math.min(1, (text.match(/\./g) ?? []).length / 4),
    "concrete-abstract-ratio": /price|report|network|delay/i.test(text) ? 0.7 : 0.3,
    "causal-structure": /because|therefore|still|merely/i.test(text) ? 0.8 : 0.2,
    "continuity-evidence": row.chord ? 0.6 : 0.2,
    "duplicate-distance": typeof row.novelty === "number" ? row.novelty : 0.5,
  };
  const mediumFeatures =
    medium === "ava"
      ? {
          "intent-lowering": /must|succeed|won/i.test(text) ? 0.1 : 0.8,
          "clarification-safety": /\?/.test(text) ? 0.7 : 0.5,
          "action-read-separation": /do |attack |order /i.test(text) ? 0.1 : 0.9,
        }
      : {};
  const order = featureOrderFor(medium);
  const values = order.map((id) => {
    if (id.startsWith(`${medium}:`)) {
      return mediumFeatures[id.slice(medium.length + 1)] ?? 0;
    }
    return shared[id] ?? 0;
  });
  return { featureIds: order, values, shared, mediumFeatures };
}

export function groupKeyFor(row) {
  const recipeLineage = row.recipeLineage ?? row.id.split("-")[0] ?? row.id;
  const chordFamily = row.chord ?? "unknown";
  const productionFamily = row.productionFamily ?? row.corpusVersion ?? "default";
  return `${recipeLineage}|${chordFamily}|${productionFamily}`;
}
