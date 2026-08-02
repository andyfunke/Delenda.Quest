### AVA-LANGUAGE-N17 / Compile authored maneuver references through Ava

Base commit: `4a5a063`

Completed commit: `ede0075`

Purpose: Index exact authored maneuver language and lower it through the
existing read-only `NARRATIVE_REFERENCE` → `EXPLAIN` route.

Exact procedures executed:

- Indexed contiguous exact spans from two through eight tokens, with the
  single-token exception limited to exact typed labels.
- Preserved raw input and exact source evidence while using the repository's
  existing normalization only for lookup keys.
- Allowed static catalog ownership to win before authored entries.
- Merged same-identity evidence, retained identity-distinct collisions, and
  returned structured ambiguity.
- Added the explicit unavailable declaration for `future freedom` when it is
  absent from the current disclosed briefing.
- Extended the compiler trace and request binding with authored evidence,
  maneuver identity, evidence kind, provenance, availability, and declaration.
- Kept explicit consequential/negated neighbors outside contextual lowering.

Changed files: `app/ava/contextual-language-compiler.ts`,
`app/ava/compiler.ts`, `app/ava/schema.ts`, and `app/ava/request-ir.ts`.

New semantic contracts: successful maneuver references compile to existing
`EXPLAIN` instructions with `NARRATIVE_REFERENCE`; ambiguous identities are
structured clarifications; unavailable declared phrases use
`AUTHORED_REFERENCE_UNAVAILABLE` and `availability: UNAVAILABLE`.

Tests added: exact labels, rationale/presentation spans, static precedence,
structured ambiguity, unavailable references, trace identity, and mutation
guards are included in the epoch corpus.

Validation results: `npm run typecheck` PASS; `bash scripts/test-substrate.sh`
PASS (231/231); `git diff --check` PASS.

Non-goals preserved: no fuzzy matching, stemming, embeddings, LLM calls,
action inference, new route, new instruction kind, deployment, D1 write,
shadow mutation, or HTTP SSH path.

Known limitations: the explicit declaration registry currently contains the
packet's `future freedom` availability boundary; other absent prose remains
ordinary exact-match clarification unless separately declared.

Next node handoff: render typed operational concepts and maneuver evidence as
exact, authored, read-only terminal output.

