import { createHash } from "node:crypto";
import { CHECKLIST_BY_MEDIUM, JUDGE_SCHEMA_VERSION } from "./types.mjs";
import { validateJudgeOutput } from "./schema.mjs";

const sha256 = (value) =>
  createHash("sha256").update(String(value).normalize("NFC"), "utf8").digest("hex");

/**
 * Deterministic NONE judge — explicit outage/test mode.
 * Never claims AI priority; all judge terms are zeroed by queue law.
 */
export async function noneJudge(input) {
  const medium = input.medium;
  const checklistIds = CHECKLIST_BY_MEDIUM[medium];
  const checklist = Object.fromEntries(checklistIds.map((id) => [id, false]));
  const promptHash = sha256(JSON.stringify(input.checklistItems));
  const response = {
    schemaVersion: JUDGE_SCHEMA_VERSION,
    checklist,
    evidenceSpans: [],
    uncertainties: ["judgeId=NONE"],
    curiousReasons: [],
    priorityBand: "P3",
    promptHash,
    responseHash: sha256("NONE"),
    modelId: "NONE",
    rewrittenCandidate: null,
  };
  return validateJudgeOutput(response, medium);
}

/** ContentJudge interface surface. */
export const ContentJudge = {
  id: "NONE",
  judge: noneJudge,
};
