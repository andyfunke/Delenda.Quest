### AVA-LANGUAGE-N20 / Prove typed operational Ava language coverage

Base commit: `85cfe3b`

Completed commit: `c41dc9b`

Purpose: Close Epoch 003 with exhaustive owner, authored-evidence, collision,
availability, rendering, parity, mutation, documentation, and integrity proof
for typed operational Ava language on the current repository authorities.

Exact procedures executed:

- Reconciled the Epoch 003 packet against current `main`, the Epoch 002 push,
  the existing feature ledger, `SUBSTRATE_DOCTRINE.md`, and the sealed
  NODE-14 through NODE-19 sequence without rewinding the stale packet base.
- Generated static-catalog tests for exact, uppercase, punctuation,
  hyphenated, whitespace-normalized, owner-bound, non-actionable, and
  state-immutable aliases.
- Generated authored-maneuver tests for every projected label, presentation,
  and bounded rationale entry, including exact evidence, source order,
  provenance, normalized variants, same-identity evidence merge,
  cross-identity ambiguity, structured unavailability, and Nexus mutation
  safety.
- Preserved static precedence, exact `NARRATIVE_REFERENCE` → `EXPLAIN`
  lowering, campaign-synopsis fallback, the single-token typed-label rule,
  the bounded long-title exception, and fail-closed action/negation guards.
- Added the canonical NODE-20 proof to the epoch node hierarchy and extended
  the existing doctrine and feature ledger rather than creating parallel
  authorities.
- Ran the complete repository and release-validation command set locally;
  generated and verified the epoch SHA-256 source manifest.

Changed files: `app/ava/compiler.ts`,
`tests/ava-contextual-language.test.mjs`,
`docs/epochs/epoch-003-typed-operational-ava-language/nodes/NODE-20-proof.md`,
`SUBSTRATE_DOCTRINE.md`, and `feature.md`.

New semantic contracts: every confirmed static owner and every accepted
current maneuver evidence span has a deterministic typed read outcome or a
narrow structured clarification; exact authored language cannot become an
action; same-identity evidence merges without losing sections; distinct
identities clarify; declared absent references are explicitly unavailable;
and generic unknown fallback cannot absorb high-information disclosed prose.

Tests added: generated static catalog coverage and generated authored maneuver
coverage, plus the compiler-ordering regression that lets safe exact authored
references outrank generic semantic clarification while retaining unsafe,
consequential, and negated guards.

Validation results: `npm test` PASS; rendered/plumbing 30/30; rule suites
40/40, 11/11, 6/6, 1/1, 8/8, 6/6, and 5/5; Ava 32/32; substrate 234/234;
`npm run typecheck` PASS; `npm run build:ssh-gateway` PASS; `npm run build`
PASS; `npm run cloudflare:types` PASS; Cloudflare types check and dry-run
PASS; `npm run lint` PASS with 0 errors and 23 warnings; `git diff --check`
PASS.

Non-goals preserved: no new parser, instruction kind, semantic owner, action,
mutation authority, hidden-state field, sealed outcome, D1 write, shadow
mutation, HTTP SSH path, GitHub push, Cloudflare deployment, secret movement,
or destructive Git recovery.

Known limitations: the Cloudflare connector/authentication is not exposed in
this workspace, so Cloudflare validation is local types/dry-run only. The
repository retains 23 pre-existing lint warnings and no lint errors.

Next node handoff: the next epoch may address richer typed advice composition,
maneuver comparison, and multi-entity explanations only after this epoch’s
local seal and release boundary are explicitly accepted.
