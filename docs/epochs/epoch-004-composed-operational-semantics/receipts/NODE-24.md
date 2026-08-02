# NODE-24 — Compile typed Ava maneuver comparisons

Status: sealed; immutable receipt follows the implementation commit.

Base commit: `57def89`

Completed commit: `17dac16`

Purpose: Compile a bounded, read-only comparison between two visible current maneuvers using stable identities and existing game/projection authorities.

Exact procedures executed:

- Joined `maneuver:<id>` subjects to `situationForState`, `maneuversForState`, and the authored maneuver presentation.
- Projected execution confidence through `explainManeuverChance`.
- Compared only actual maneuver fields for commitment, casualty, supply, success pressure, and failure pressure.
- Reused `projectAvaAction` and `projectAvaEnvelope` for disclosed projected ground movement, retaining interval uncertainty and explicit unavailable evidence.
- Added orientation, no-winner, state-preservation, stable-identity, and hidden-field assertions.

Changed files: `app/ava/operational-comparison.ts`, `app/ava/operational-semantics.ts`, `tests/ava-operational-semantics.test.mjs`, and the NODE-24 documentation record.

New semantic contracts: `AvaOperationalComparison` is a pairwise evidence object with stable maneuver identities, shared context, seven bounded dimensions, explicit dimension statuses, evidence-shaped verdicts, provenance, limitations, and a digest. It has no winner or score field.

Tests added: current-handle comparison, direct reversed-identity comparison, dimension-status coverage, no-winner assertion, state preservation, and hidden/private field checks.

Validation results: typecheck PASS; complete substrate corpus 238/238 PASS; `git diff --check` PASS.

Non-goals preserved: no replacement parser or decision calculus, no inferred relationship, no pairwise winner, no sealed outcome, no private resolution ticket or RNG, no mutation route, push, deployment, D1 write, shadow mutation, or HTTP SSH path.

Known limitations: compiler-owned relationship projection and shared semantic rendering remain deferred to NODE-25 and NODE-26.

Next node handoff: NODE-25 projects only `CONCEPTS.related` and current-situation maneuver joins.
