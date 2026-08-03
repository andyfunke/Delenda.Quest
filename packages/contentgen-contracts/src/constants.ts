/** Versioned constants from §4.2, §4.5, §4.8, §4.9 (ratify@010). */

import type {
  ContentMedium,
  Disposition,
  FailureClass,
  ReviewReasonCode,
} from "./types.ts";

export const CONTENT_MEDIA: readonly ContentMedium[] = [
  "ava",
  "campaign-brief",
  "execution-scene",
  "maneuver-procedure",
  "romantic-arc",
] as const;

export const REVIEW_REASON_CODES: readonly ReviewReasonCode[] = [
  "REGISTER_BREAK",
  "MECHANIC_MISMATCH",
  "HIDDEN_STATE_RISK",
  "UNSUPPORTED_CLAIM",
  "CONTINUITY_BREAK",
  "DUPLICATE_IMAGE",
  "GENERIC_ABSTRACTION",
  "SENTIMENTALITY",
  "SLANG_REGISTER",
  "OMNISCIENCE",
  "UNEXPLAINED_JARGON",
  "CHORD_MISMATCH",
  "WEAK_CONSEQUENCE",
  "CLAIM_BUDGET_BREACH",
  "OTHER_WITH_NOTE",
] as const;

export const FAILURE_CLASSES: readonly FailureClass[] = [
  "HIDDEN_OUTCOME",
  "IMPERATIVE_ORDER",
  "ACTOR_SWAP",
  "TEMPORAL_CONTRADICTION",
  "GENERIC_ABSTRACTION",
  "SENTIMENTALITY",
  "DUPLICATE_IMAGE",
  "UNSUPPORTED_RESOURCE",
  "CONFUSABLE_SPELLING",
  "FALSE_MECHANIC_CLAIM",
  "BEAUTIFUL_BUT_IRRELEVANT",
  "RELEVANT_BUT_DEAD",
  "NOVEL_BUT_INCOHERENT",
] as const;

/** §4.8(d) disposition legality matrix. */
export const DISPOSITION_LEGALITY = {
  COMPILED: ["QUALITY_MET", "QUALITY_NOT_MET", "REVISE"] as const,
  HARD_FAILURE: ["FAILURE_CONFIRMED", "GATE_FALSE_POSITIVE"] as const,
} as const;

export const TERMINAL_DISPOSITIONS: readonly Disposition[] = [
  "QUALITY_MET",
  "QUALITY_NOT_MET",
  "FAILURE_CONFIRMED",
  "GATE_FALSE_POSITIVE",
] as const;

/** §4.5 trainer configuration v1. */
export const TRAINER_CONFIG_V1 = {
  version: "trainer-config/v1",
  featureOrder: "codepoint-ascending-feature-ids",
  weightInitialization: "zeros",
  iterations: 500,
  learningRate: { numerator: 0.2, denominatorBase: 1, denominatorSlope: 0.01 },
  l2PenaltyLambda: 1e-4,
  groupKey: "recipeLineage|chordFamily|productionFamily",
  split: { train: 0.7, calibration: 0.15, heldOut: 0.15 },
  trainOrder: "codepoint-ascending-candidate-ids",
  arithmetic: "ieee754-doubles-stream-order",
} as const;

/** §4.8(c) priority bands. */
export const PRIORITY_BANDS = {
  P0: 0.85,
  P1: 0.65,
  P2: 0.45,
} as const;

/** §4.9 thresholds (promotion values ratify@018 remain recorded here as law). */
export const QUALITY_THRESHOLDS_V1 = {
  version: "quality-thresholds/v1",
  promotionLogLossMarginDelta: 0.005,
  perMediumFalseNegativeCeiling: 0.1,
  zeroCanaryFlipsTolerated: true,
  curiosityLaneThreshold: 0.65,
  curiosityWeights: {
    entropy: 0.35,
    novelty: 0.2,
    judgeDeterministicDisagreement: 0.2,
    crossMediumTransferDisagreement: 0.15,
    chordCoverageDeficit: 0.1,
  },
  noveltyDuplicateThresholds: {
    approved: 0.92,
    rejected: 0.9,
    pending: 0.94,
  },
  analogueCounts: { approved: 4, rejected: 4 },
  auditSlotFraction: 0.2,
  probabilityFallbackChain: [
    "latest-promoted-policy",
    "epoch-008-weak-label-aggregate",
    "constant-0.5",
  ],
} as const;

/** §4.5 feature family declaration. */
export const FEATURE_FAMILIES = {
  shared: [
    "compression",
    "claim-count",
    "concrete-abstract-ratio",
    "causal-structure",
    "continuity-evidence",
    "duplicate-distance",
  ],
  avaOnly: ["intent-lowering", "clarification-safety", "action-read-separation"],
  narrativeOnly: [
    "dramatic-pressure",
    "consequence-closure",
    "image-family-exhaustion",
    "progression-shape",
  ],
  forbiddenTransfer: [
    "ava-intent-ownership",
    "ava-action-authority",
    "narrative-taste-as-ava-safety",
    "quality-score-as-mechanic",
  ],
} as const;
