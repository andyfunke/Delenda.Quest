# NODE-25 — Project typed Ava operational relationships

Status: sealed; immutable receipt follows the implementation commit.

Base commit: `6ada48a`

Completed commit: `6275e2d`

Purpose: Project only the repository’s two confirmed operational relationship owners into a bounded, directed, read-only model.

Exact procedures executed:

- Read `CONCEPTS[source].related[]` in source order and emitted directed `RELATED_CONCEPT` edges only for canonical concept targets.
- Joined `campaign-synopsis` to `currentSituation.maneuvers[]` by stable maneuver ID and exact source order.
- Added join keys, current visible revision, source provenance, relation bounds, evidence-fragment bounds, and structured unavailable evidence.
- Attached the relationship model to read-only `EXPLAIN` semantic results and added direct owner/digest/state-preservation tests.
- Preserved fail-closed behavior for over-bound requests and absent canonical targets.

Changed files: `app/ava/operational-relationships.ts`, `app/ava/operational-semantics.ts`, `tests/ava-operational-semantics.test.mjs`, and the NODE-25 documentation record.

New semantic contracts: `AvaOperationalRelationships` contains only `RELATED_CONCEPT` and `CURRENT_VISIBLE_MANEUVER` edges, each marked `SOURCE_TO_TARGET` and `readOnly: true`, with explicit bounds and a digest.

Tests added: formation concept-edge ownership, campaign-synopsis maneuver joins, relation direction/join-key checks, deterministic digest coverage, and state-preservation checks.

Validation results: typecheck PASS; focused operational corpus 5/5 PASS; complete substrate corpus 239/239 PASS after the corrected relationship assertions; `git diff --check` PASS.

Non-goals preserved: no generic graph, prose or semantic inference, hidden-state relation, second parser, mutation path, push, deployment, D1 write, shadow mutation, or HTTP SSH path.

Known limitations: shared presentation and cross-surface parity remain deferred to NODE-26 and NODE-27.

Next node handoff: NODE-26 renders the composed semantic model through the existing Nexus surfaces.
