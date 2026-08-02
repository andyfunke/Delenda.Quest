# NODE-26 — Render composed Ava operational semantics

Status: sealed; immutable receipt follows the implementation commit.

Base commit: `73dc226`

Completed commit: `d021d9b`

Purpose: Render the composed operational semantic model through one canonical presentation boundary and preserve parity across browser/Nexus, terminal-core, and native SSH session-core.

Exact procedures executed:

- Added a typed renderer for advice, disclosed forecast, bounded maneuver comparison, declared relationships, limitations, revisions, and semantic digest.
- Appended rendered semantics after the existing realized answer while preserving the existing response/proof identity boundary.
- Updated terminal and result presentation fields from the same rendered text.
- Exercised `advise`, `forecast M1`, `compare M1 M2`, and `formation` through all three surfaces.

Changed files: `app/ava/operational-render.ts`, `app/ava/nexus.ts`, `app/ava/operational-semantics.ts`, `tests/ava-operational-semantics.test.mjs`, and the NODE-26 documentation record.

New semantic contracts: `renderAvaOperationalSemantics` is the sole text projection for `AvaOperationalSemanticResult`; pairwise rendering explicitly says no winner was selected and relationship rendering says declared relations only.

Tests added: renderer section coverage, hidden/private field checks, no-winner checks, and browser/terminal/native SSH byte-parity over advice, forecast, comparison, and explanation.

Validation results: typecheck PASS; focused operational corpus 7/7 PASS; `git diff --check` PASS.

Non-goals preserved: no surface-specific semantic reconstruction, second parser, inferred relationship, sealed outcome, mutation route, push, deployment, D1 write, shadow mutation, or HTTP SSH path.

Known limitations: final generated corpus, full repository gates, manifest, and epoch seal remain NODE-27.

Next node handoff: NODE-27 proves the complete composed semantics corpus and seals Epoch 004.
