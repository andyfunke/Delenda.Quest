# NODE-23 — Compose typed Ava advice through canonical calculus

Status: sealed; immutable receipt follows the implementation commit.

Base commit: `42e8f02`

Completed commit: `0656460`

Purpose: Compose a typed, read-only advice result from the active canonical calculus, the persisted situation, and the semantic query’s declared priorities.

Exact procedures executed:

- Added a compiler-owned recommendation bound to `decision.winnerId` and the disclosed ranking.
- Exposed the objective, target, sector, situation bands, priority axes, visible inputs, alternatives, uncertainties, equations, rules, and coupled-order limitation in one advice model.
- Required the recommendation to resolve to a visible calculus option; projection rejects a missing canonical winner.
- Added deterministic regression assertions for recommendation authority, objective/priority context, calculus references, state preservation, and hidden-field absence.

Changed files: `app/ava/operational-contracts.ts`, `app/ava/operational-calculus.ts`, `tests/ava-operational-semantics.test.mjs`, and the NODE-23 documentation record.

New semantic contracts: `AvaOperationalAdvice.recommendation` is authoritative only as a disclosed compiled winner; `equations` and `rules` are exact references to the canonical calculus; `priorityAxes`, `objective`, and `operationalContext` are typed, provenance-bearing read inputs.

Tests added: advice recommendation, priority/objective composition, calculus-reference identity, and no-mutation/hidden-field assertions.

Validation results: typecheck PASS; complete substrate corpus 237/237 PASS; `git diff --check` PASS.

Non-goals preserved: no pairwise scoring or winner invention, second parser/calculus, fuzzy or inferred relation, prepared order, mutation route, private/random/sealed state, push, deployment, D1 write, shadow mutation, or HTTP SSH path.

Known limitations: pairwise maneuver comparison, relationship projection, and shared terminal rendering remain deferred to NODE-24 through NODE-26.

Next node handoff: NODE-24 compiles bounded typed comparisons between two visible current maneuvers.
