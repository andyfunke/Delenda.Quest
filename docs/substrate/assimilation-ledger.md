# Ava substrate assimilation ledger

This is the append-only record for reviewed hard-coded utterances, generated
permutations, normalization rules, and discourse repairs admitted to Ava's
deterministic grammar. Existing epochs are never rewritten or removed. A later
epoch may supersede behavior only by naming the prior epoch and recording the
new rule explicitly.

## Assimilation law

1. Classify an observation as exact alias, compositional permutation, semantic
   shortcut, typo repair, discourse repair, or rejected mutation language.
2. Collapse every admitted surface to one typed, finite operation.
3. Prefer a read, inspection, or clarification when the surface is terse.
4. Typo tolerance may widen read-only recognition. Consequential operations
   retain exact targets, complete token consumption, preparation, confirmation,
   and fail-closed validation.
5. Explicit visible entity identities outrank inherited conversational scope.
   Inherited scope applies only when the player supplies no target.
6. Exercise the utterance through both the compiler and the Nexus. A phrase-table
   match without a functioning authoritative handler is not assimilated.
7. Reject collisions before release and preserve the raw observation only in
   the player's local/exported Ava transcript, never in telemetry.

## Epoch 2026-08-01-A — terse report surfaces and explicit-target precedence

Source: reviewed player transcript attached as `Pasted text(7).txt`, plus the
reported `advise M2` failure after entering a directive docket.

| Observed surface | Class | Canonical result | Assimilation rule |
|---|---|---|---|
| `query` | exact read alias | `STATUS` | A bare orientation noun returns strategic status. |
| `info` | exact read alias | `STATUS` | A bare orientation noun returns strategic status. |
| `summary` | exact read alias | `STATUS` | A bare orientation noun returns strategic status. |
| `daily` | exact report alias | canonical daily brief | The authored report remains distinct from Ava's paraphrase. |
| `brief` | exact report alias | Ava brief | Deterministic paraphrase; `daily brief` remains canonical. |
| `attack` | semantic shortcut | campaign operations report | A terse combat noun inspects visible operations and cannot select or issue one. |
| `enemy` | semantic shortcut | adversary report | Existing read-only interpretation retained. |
| `enemyt` | typo repair | adversary report | One reviewed typo collapses to `enemy`; no fuzzy mutation parser is introduced. |
| `advise M2` after Production | discourse repair | advice on visible Campaign M2 | An explicit maneuver handle defeats stale Production context. Bare `advise` still inherits the displayed docket. |

Permutation policy for this epoch:

- Case, punctuation, apostrophe, and whitespace variation use the shared normalizer.
- The exact orientation aliases do not generate mutation-bearing prefixes or
  suffixes.
- `attack` admits only the listed singular/plural and offense/offensive read
  surfaces in this epoch.
- `enemyt` is an enumerated typo, not an edit-distance rule.
- Campaign handles are resolved against today's visible entities, so the M2
  identity rotates with the campaign docket without hard-coding content IDs.
