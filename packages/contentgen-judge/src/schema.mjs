import { CHECKLIST_BY_MEDIUM, JUDGE_SCHEMA_VERSION } from "./types.mjs";

export function validateJudgeOutput(output, medium) {
  if (!output || typeof output !== "object") {
    throw new Error("JUDGE_OUTPUT_REQUIRED");
  }
  if (output.schemaVersion !== JUDGE_SCHEMA_VERSION) {
    throw new Error("JUDGE_SCHEMA_VERSION_MISMATCH");
  }
  if (output.rewrittenCandidate != null) {
    throw new Error("JUDGE_MUST_NOT_REWRITE");
  }
  const checklistIds = CHECKLIST_BY_MEDIUM[medium];
  if (!checklistIds) throw new Error("UNKNOWN_MEDIUM");
  if (!output.checklist || typeof output.checklist !== "object") {
    throw new Error("CHECKLIST_REQUIRED");
  }
  for (const id of checklistIds) {
    if (typeof output.checklist[id] !== "boolean") {
      throw new Error(`CHECKLIST_ITEM_MISSING:${id}`);
    }
  }
  for (const key of Object.keys(output.checklist)) {
    if (!checklistIds.includes(key)) {
      throw new Error(`CHECKLIST_ITEM_UNKNOWN:${key}`);
    }
  }
  const required = [
    "evidenceSpans",
    "uncertainties",
    "curiousReasons",
    "priorityBand",
    "promptHash",
    "responseHash",
    "modelId",
  ];
  for (const key of required) {
    if (output[key] == null) throw new Error(`JUDGE_FIELD_MISSING:${key}`);
  }
  if (!["P0", "P1", "P2", "P3"].includes(output.priorityBand)) {
    throw new Error("PRIORITY_BAND_INVALID");
  }
  return output;
}

export function buildJudgeInput(candidate, analogues, medium) {
  const checklistIds = CHECKLIST_BY_MEDIUM[medium];
  if (!checklistIds) throw new Error("UNKNOWN_MEDIUM");
  return {
    schemaVersion: JUDGE_SCHEMA_VERSION,
    trustBoundary: "UNTRUSTED_CANDIDATE_DATA",
    medium,
    mediumContract: { medium },
    deterministicFeatures: candidate.features ?? {},
    prismResults: candidate.prismResults ?? [],
    analogues: {
      approved: (analogues?.approved ?? []).slice(0, 4),
      rejected: (analogues?.rejected ?? []).slice(0, 4),
    },
    checklistItems: checklistIds.map((id) => ({
      id,
      question: `Does evidence support ${id}?`,
    })),
    // Never include held-out labels.
    heldOutLabels: undefined,
  };
}
