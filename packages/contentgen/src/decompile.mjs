import { normalizeP0ThroughP4 } from "./normalize.mjs";

export const DECOMPILER_VERSION = "contentgen-decompiler/v1";

export function decompile(candidate) {
  const projections = normalizeP0ThroughP4(candidate.text);
  const shared = {
    tokenCount: projections.P3.length,
    compression: projections.P4.includes("compressed") ? 1 : 0,
    claimCount: Array.isArray(candidate.recipe?.requiredClaims)
      ? candidate.recipe.requiredClaims.length
      : 0,
    chordTensionId: candidate.recipe?.chord?.tensionId ?? null,
    mechanicRefs: candidate.recipe?.mechanicRefs ?? [],
    registerProfileId: candidate.recipe?.registerProfileId ?? null,
    continuityRefs: extractContinuity(projections.P2),
  };
  const mediumFeatures = extractMediumFeatures(candidate, projections);
  const claims = {
    required: candidate.recipe?.requiredClaims ?? [],
    forbidden: candidate.recipe?.forbiddenClaims ?? [],
    evidenceOnly: true,
  };
  return {
    version: DECOMPILER_VERSION,
    candidateId: candidate.candidateId,
    medium: candidate.recipe?.medium,
    projections,
    shared,
    mediumFeatures,
    claims,
    provenance: candidate.provenance,
    textExact: projections.P0,
  };
}

function extractContinuity(p2) {
  const refs = [];
  if (/\byesterday|prior|previous|earlier\b/.test(p2)) refs.push("temporal");
  if (/\bhe|she|they|the formation|the reserve\b/.test(p2)) refs.push("actor");
  return refs;
}

function extractMediumFeatures(candidate, projections) {
  const medium = candidate.recipe?.medium;
  const base = { medium, projectionEvidence: "P2" };
  if (medium === "ava") {
    return {
      ...base,
      intentLowering: candidate.recipe?.projection?.intentLowering ?? null,
      actionLanguage: /\b(do|issue|execute|send|attack)\b/.test(projections.P2),
      clarificationSafety: Boolean(
        candidate.recipe?.projection?.clarificationSafety,
      ),
    };
  }
  if (medium === "maneuver-procedure") {
    return {
      ...base,
      mechanicId: candidate.recipe?.projection?.mechanicId ?? null,
      heat: candidate.recipe?.projection?.heat ?? null,
    };
  }
  if (medium === "campaign-brief") {
    return {
      ...base,
      situationTemplateId:
        candidate.recipe?.projection?.situationTemplateId ?? null,
      problemClass: candidate.recipe?.projection?.problemClass ?? null,
    };
  }
  return {
    ...base,
    tier: candidate.recipe?.projection?.tier ?? null,
    heat: candidate.recipe?.projection?.heat ?? null,
  };
}
