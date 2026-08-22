/**
 * The shared substrate — the named owner of the layers that inform BOTH the
 * canonical Ava Nexus and the campaign deck/draw compilers (doctrine §4:
 * precompute before inference; §9: gates recurse; §10: selection is
 * deterministic and persisted).
 *
 * Exactly three layers are shared, and they are shared only through this
 * module:
 *
 * 1. Gate calculus  — `./gates`: the recursive gate grammar and evaluator
 *    used by campaign situation eligibility, daily dockets, and Ava
 *    visibility.
 * 2. Draw idiom     — `./hash`: the canonical FNV-1a seeded-ticket hash that
 *    makes every deck draw, writing selection, and docket ticket
 *    reproducible.
 * 3. Vocabulary     — `./vocabulary`: the typed identifier sets (channels,
 *    theaters, phases, problem classes, maneuvers, tiers, heats, metrics,
 *    operations) both sides speak.
 *
 * Consumers on either side (`app/campaign-substrate.ts`, `app/game.ts`,
 * `app/submission-schema.ts`, `app/ava/*`) reach these layers via this
 * module so the shared surface stays visible, bounded, and test-enforced
 * (`tests/substrate-architecture.test.mjs`). This module adds no behavior:
 * it re-exports existing authorities and may never grow handlers, parsers,
 * or state.
 */

export const SHARED_SUBSTRATE_VERSION = "shared-substrate/v1";

export {
  evaluateGate,
  evaluateGateDetailed,
  validateGate,
  type SubstrateGate,
  type StrategicDimension,
  type ToleranceDimension,
  type StrategicWeight,
  type ToleranceLevel,
  type SurfaceId,
} from "./gates";

export {
  hashInt,
  stableHash,
  candidateSetHash,
  selectionTicketFor,
} from "./hash";

export * from "./vocabulary";
