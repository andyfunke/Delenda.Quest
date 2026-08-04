/** Provider-neutral ContentJudge contracts (Epoch 016). */

export const JUDGE_SCHEMA_VERSION = "content-judge/v1";

export const PRIORITY_BANDS = {
  P0: 0.85,
  P1: 0.65,
  P2: 0.45,
};

/** Frozen per-medium checklist — feature families from Epoch 012, yes/no only. */
export const CHECKLIST_BY_MEDIUM = Object.freeze({
  ava: Object.freeze([
    "intent-lowering-safe",
    "clarification-safety",
    "action-read-separation",
    "compression-adequate",
    "claim-count-bounded",
    "no-hidden-outcome",
  ]),
  "campaign-brief": Object.freeze([
    "dramatic-pressure-present",
    "consequence-closure",
    "continuity-evidence",
    "claim-count-bounded",
    "no-omniscience",
    "register-consistent",
  ]),
  "execution-scene": Object.freeze([
    "consequence-closure",
    "continuity-evidence",
    "claim-count-bounded",
    "no-hidden-outcome",
    "register-consistent",
    "progression-shape-coherent",
  ]),
  "maneuver-procedure": Object.freeze([
    "mechanic-reference-exact",
    "action-read-separation",
    "claim-count-bounded",
    "no-imperative-leak",
    "register-consistent",
    "compression-adequate",
  ]),
  "romantic-arc": Object.freeze([
    "dramatic-pressure-present",
    "consequence-closure",
    "image-family-fresh",
    "no-sentimentality-collapse",
    "register-consistent",
    "continuity-evidence",
  ]),
});

export function priorityBand(priority) {
  if (priority >= PRIORITY_BANDS.P0) return "P0";
  if (priority >= PRIORITY_BANDS.P1) return "P1";
  if (priority >= PRIORITY_BANDS.P2) return "P2";
  return "P3";
}
