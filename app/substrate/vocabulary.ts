/**
 * Shared campaign/Ava vocabulary — the typed owner of identifier sets that
 * both the Ava grammar side and the campaign deck/draw side consume.
 *
 * This module is a leaf: it imports nothing, declares only erasable syntax
 * (`const ... as const` plus types), and is therefore importable from the
 * Worker build, esbuild test bundles, and `node --experimental-strip-types`
 * scripts alike.
 *
 * Ownership rules:
 * - A set declared here is canonical. Legacy declaration sites re-export or
 *   are locked to these sets by `tests/vocabulary-drift.test.mjs`.
 * - Never add a mechanic, effect, or handler here; this file owns names
 *   and their static lookup tables (such as the phase-boundary table), not
 *   law. Handlers stay with their existing authorities.
 * - Emission order in offline materializers (for example
 *   `scripts/build-campaign-packs.mjs`) is allowed to differ; those scripts
 *   assert set-equality against this module instead of importing order.
 */

export const VOCABULARY_VERSION = "substrate-vocabulary/v1";

/** Command channels — shared by gates, contracts, dockets, and Ava routing. */
export const CHANNELS = [
  "campaign",
  "production",
  "military",
  "diplomacy",
  "upgrade",
  "domestic",
  "network",
] as const;
export type Channel = (typeof CHANNELS)[number];

/** Campaign theaters, in `Theater` type declaration order. */
export const THEATERS = ["lowland", "ridge", "industrial", "river"] as const;
export type Theater = (typeof THEATERS)[number];

/** Campaign phases and the single live day-boundary table. */
export const CAMPAIGN_PHASES = [
  "contact",
  "compression",
  "exhaustion",
  "terminal",
] as const;
export type CampaignPhaseId = (typeof CAMPAIGN_PHASES)[number];

/**
 * Live campaign phase boundaries (inclusive upper day per phase). The
 * offline scheduler package keeps a divergent arc-pacing table
 * (`packages/campaign-scheduler/src/fallback-arcs.mjs`, 7/15/23) that is not
 * exercised by the live campaign; that divergence is pinned by
 * `tests/vocabulary-drift.test.mjs` until the scheduler wiring epoch
 * reconciles the two.
 */
export const CAMPAIGN_PHASE_BOUNDARIES = {
  contact: 5,
  compression: 12,
  exhaustion: 20,
} as const;

export const phaseIdForDay = (day: number): CampaignPhaseId =>
  day <= CAMPAIGN_PHASE_BOUNDARIES.contact
    ? "contact"
    : day <= CAMPAIGN_PHASE_BOUNDARIES.compression
      ? "compression"
      : day <= CAMPAIGN_PHASE_BOUNDARIES.exhaustion
        ? "exhaustion"
        : "terminal";

/** Situation problem classes owned by the campaign situation compiler. */
export const PROBLEM_CLASSES = [
  "force-preservation",
  "logistics",
  "command",
  "assault",
  "crossing",
  "exploitation",
  "counterstroke",
  "observation",
] as const;
export type ProblemClass = (typeof PROBLEM_CLASSES)[number];

/** Strategic maneuver identities, in `MANEUVERS` catalog order (`app/game.ts`). */
export const MANEUVER_IDS = [
  "reinforce",
  "interdict",
  "route",
  "abandon",
  "exploit",
  "breach",
  "network",
] as const;
export type ManeuverId = (typeof MANEUVER_IDS)[number];

/** Campaign metastratum tiers, heats, and escalation intensities. */
export const CAMPAIGN_TIERS = ["routine", "romantic", "escalatory"] as const;
export type CampaignTier = (typeof CAMPAIGN_TIERS)[number];

export const PROCEDURE_HEATS = ["hot", "medium"] as const;
export type ProcedureHeat = (typeof PROCEDURE_HEATS)[number];

export const ESCALATION_INTENSITIES = ["none", "standard", "maximum"] as const;
export type EscalationIntensity = (typeof ESCALATION_INTENSITIES)[number];

/**
 * Player-visible Ava metric identities (`AVA_METRICS` in
 * `app/ava/game-context.ts` owns labels and aliases; the id set is locked to
 * this list).
 */
export const METRIC_IDS = [
  "population",
  "armed",
  "enlistment",
  "training",
  "readiness",
  "equipment",
  "materiel",
  "industrial-condition",
  "treasury",
  "legitimacy",
  "resistance",
  "front",
  "reserve",
  "formation",
  "position",
  "route",
  "opening",
  "pressure",
  "desertion",
  "doctrine",
  "intelligence",
  "execution-confidence",
  "supply",
  "terrain",
  "ground",
  "network",
] as const;
export type MetricId = (typeof METRIC_IDS)[number];

/**
 * Scalar gate keys supplied by the campaign situation compiler's gate
 * context (`app/campaign-substrate.ts` builds its scalar record from this
 * list).
 */
export const SCALAR_KEYS = [
  "front",
  "readiness",
  "reserves",
  "intelligence",
  "legitimacy",
  "resistance",
  "dependency",
  "munitionsCoverage",
  "sectorSupply",
  "sectorDamage",
  "sectorFortification",
] as const;
export type ScalarKey = (typeof SCALAR_KEYS)[number];

/**
 * Scalar keys the daily docket compiler supplies to the same shared gate
 * evaluator (`app/substrate/docket.ts`); it adds `treasury`, which has an
 * Ava metric owner but is not part of the situation compiler's record.
 * Pinned against the docket source by `tests/vocabulary-drift.test.mjs`.
 */
export const DOCKET_SCALAR_KEYS = [
  "readiness",
  "legitimacy",
  "resistance",
  "dependency",
  "intelligence",
  "treasury",
  "front",
] as const;

/**
 * Which Ava metric a campaign gate scalar refers to, when the two names
 * denote the same disclosed quantity. `null` marks gate-only scalars with no
 * Ava metric owner; a client must not invent one. Documentation contract
 * consumed by the drift tests; no runtime consumer yet.
 */
export const SCALAR_TO_METRIC: Record<ScalarKey, MetricId | null> = {
  front: "front",
  readiness: "readiness",
  reserves: "reserve",
  intelligence: "intelligence",
  legitimacy: "legitimacy",
  resistance: "resistance",
  dependency: null,
  munitionsCoverage: "supply",
  sectorSupply: null,
  sectorDamage: null,
  sectorFortification: null,
};

/** Canonical command-surface operations (`CommandOperation` derives from this). */
export const COMMAND_OPERATIONS = [
  "HELP",
  "BRIEF",
  "STATUS",
  "SHOW_DOCKET",
  "SHOW_CHOICE",
  "ASK_AVA",
  "ADVISE",
  "COMPARE",
  "RANK",
  "PREPARE",
  "CONFIRM",
  "CANCEL",
  "INTERRUPTS",
  "MISSIONS",
  "BATTLE_LOG",
  "SERVICE_RECORD",
  "RECENT_DISPATCHES",
  "WHOAMI",
  "LOGOUT",
  "QUIT",
] as const;
export type CommandOperation = (typeof COMMAND_OPERATIONS)[number];

/** Ava semantic operations (`AvaSemanticOperation` derives from this). */
export const AVA_SEMANTIC_OPERATIONS = [
  "ADVISE",
  "EXPLAIN",
  "COMPARE",
  "RANK",
  "SUMMARIZE",
  "INSPECT",
  "CALCULATE",
  "PREDICT",
  "DIAGNOSE",
  "RECOMMEND",
  "WARN",
  "IDENTIFY",
  "DEFINE",
  "LIST",
  "JUSTIFY",
  "CHALLENGE",
  "CONFIRM",
  "CORRECT",
] as const;
export type AvaSemanticOperation = (typeof AVA_SEMANTIC_OPERATIONS)[number];

/**
 * The canonical command-surface operation an Ava semantic operation lowers
 * to when a subject-independent equivalent exists. `null` marks Nexus-only
 * semantic operations whose lowering depends on the resolved subject; they
 * have no single canonical command form and must not be given one here.
 * Only documented grammar aliases may create non-identity rows
 * (`recommend` → `advise` per `docs/substrate/grammar.md`). Documentation
 * contract consumed by the drift tests; no runtime consumer yet.
 */
export const AVA_OPERATION_TO_COMMAND: Record<
  AvaSemanticOperation,
  CommandOperation | null
> = {
  ADVISE: "ADVISE",
  EXPLAIN: null,
  COMPARE: "COMPARE",
  RANK: "RANK",
  SUMMARIZE: null,
  INSPECT: null,
  CALCULATE: null,
  PREDICT: null,
  DIAGNOSE: null,
  RECOMMEND: "ADVISE",
  WARN: null,
  IDENTIFY: null,
  DEFINE: null,
  LIST: null,
  JUSTIFY: null,
  CHALLENGE: null,
  CONFIRM: "CONFIRM",
  CORRECT: null,
};
