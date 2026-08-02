### AVA-LANGUAGE-N16 / Project authored Ava maneuver evidence

Base commit: `16ad7c0`

Completed commit: `4a5a063`

Purpose: Project the current disclosed maneuver docket into the existing Ava
language evidence contract without exposing action mechanics or hidden state.

Exact procedures executed:

- Joined `currentSituation.maneuvers` to the stable `MANEUVERS` owner by ID.
- Projected exact label, rationale, and presentation evidence in source order.
- Preserved source paths, provenance, evidence kinds, capitalization,
  punctuation, and authored whitespace in stored evidence.
- Added digest coverage for evidence order and source metadata.
- Verified missing rationale/presentation fields are omitted and persisted
  game state is unchanged.

Changed files: `app/ava/contextual-language.ts`,
`app/ava/contextual-language-projection.ts`, and
`app/ava/contextual-language-references.ts`.

New semantic contracts: `AvaAuthoredManeuverEvidence` is a read-only typed
projection; maneuver evidence kinds are `maneuver-label`,
`maneuver-rationale`, and `maneuver-presentation`; evidence order is semantic
and content-addressed.

Tests added: exact evidence, stable identity, provenance, hidden-field
exclusion, deterministic digest, and state immutability coverage is included
in the epoch contextual corpus.

Validation results: `npm run typecheck` PASS; `bash scripts/test-substrate.sh`
PASS (231/231); `git diff --check` PASS.

Non-goals preserved: no new instruction kind, action selection, hidden
adversary access, resolution ticket, private calculus, deployment, D1 write,
shadow mutation, or HTTP SSH path.

Known limitations: the current repository has no separate presentation-title
field, so presentation evidence is the exact disclosed presentation label;
the rationale remains a separate evidence kind.

Next node handoff: index bounded exact authored spans and lower them through
the existing `NARRATIVE_REFERENCE`/`EXPLAIN` route.

