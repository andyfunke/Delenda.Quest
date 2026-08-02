# NODE-22 — Expose canonical Ava calculus evidence

Status: sealed; immutable receipt follows the implementation commit.

Base commit: `a473e3d3720e3c0dfe0eb3c83db63db2144eab77`

Completed commit: `04927d6`

Purpose: Project the active disclosed cognitive decision and temporal authorities into a typed, read-only operational semantics contract without reviving the quarantined legacy calculus or exposing hidden, private, random, or sealed state.

Exact procedures executed:

- Inspected the active decision and temporal owners before implementation.
- Added typed operational contracts, the canonical calculus projection, and the Nexus projection seam.
- Wired the semantic result through the browser/Nexus, terminal, and native SSH session-core surfaces.
- Preserved command and directive boundaries; executable instructions remain unprojected.
- Added deterministic evidence and hidden-field regression coverage.

Changed files: `app/ava/operational-contracts.ts`, `app/ava/operational-calculus.ts`, `app/ava/operational-semantics.ts`, `app/ava/request-ir.ts`, `app/ava/terminal.ts`, `app/ava/nexus.ts`, `packages/terminal-core/src/session.ts`, `packages/ssh-gateway/src/session-core.ts`, `scripts/test-substrate.sh`, `tests/ava-operational-semantics.test.mjs`, `tests/ssh-gateway-session.test.mjs`, and the Epoch 004 owner/README records.

New semantic contracts: `AvaOperationalSemanticResult` is versioned, read-only, content-addressed, and limited to disclosed inputs, derived values, equations, rules, options, alternatives, uncertainties, provenance, and explicit unavailable boundaries. The active decision identity is `delenda-cognitive-decision`; the active temporal identity is `ava-temporal-disclosed-projection`.

Tests added: deterministic advice/calculus evidence, temporal projection evidence, no-state-mutation checks, hidden-field checks, and native SSH semantic pass-through checks.

Validation results: `npm run typecheck` passed; the focused operational corpus passed 3/3; native SSH session tests passed 3/3; `git diff --check` passed.

Non-goals preserved: no legacy `app/ava/decision-calculus.ts` revival, second parser, fuzzy or inferred semantics, mutation route, RNG/seed/private state, sealed resolution ticket, deployment, push, D1 write, shadow mutation, or HTTP SSH path.

Known limitations: advice composition, pairwise maneuver comparison, multi-entity relationships, and terminal rendering are deferred to NODE-23 through NODE-26. Coupled-order evidence remains explicitly unavailable where the active authority does not disclose it.

Next node handoff: NODE-23 composes typed advice from the canonical calculus, objective, priority axes, and visible operational context.
