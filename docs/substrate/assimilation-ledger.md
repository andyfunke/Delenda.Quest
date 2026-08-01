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

## Epoch 2026-08-01-B — daily quotation and typed terminal language

Source: the approved terminal, quotation, export, archive, and bounded-tool
batch evaluated immediately before implementation.

| Observed surface | Class | Canonical result | Assimilation rule |
|---|---|---|---|
| `quote`, `daily quote`, `quote of the day` | exact read aliases | assigned daily aphorism | Retrieval never rerolls or consumes a second quotation. |
| `fortune` | shell read alias | assigned daily aphorism | Shell and Ava return the same campaign-day assignment. |
| `A \| grep PATTERN` | typed composition | read-only pipeline | The first stage must produce visible text and every later stage must be an enumerated filter. |
| `explain --trace last` | exact diagnostic | prior compiler trace | The trace is session-local and cannot expose sealed state. |
| `prove last` | exact diagnostic | prior public proof digest | The receipt attests to the prior visible result without becoming a hidden-state oracle. |
| `vim PATH`, `nano PATH` | bounded applications | commander note editor | Writes are limited to declared commander directories and text extensions. |

Permutation policy for this epoch:

- Quote aliases admit ordinary apostrophe, case, punctuation, and whitespace
  normalization only.
- A literal pipe inside a quoted grep pattern remains data, not composition.
- Pipelines reject mutation commands, redirects, chaining, substitutions,
  binary downloads, and remote archive requests.
- Bare `less` retains Ava's disclosure-depth meaning; `less` is a pager only
  when it appears after a typed pipe.
- Editor controls are enumerated state transitions, never host keystroke or
  process access.

## Epoch 2026-08-01-C — public artifacts and unresolved directive handles

Source: reviewed player transcript attached as `Pasted text(8).txt`, including
the failed `compare production`, `p1`, and `production 1` surfaces.

| Observed surface | Class | Canonical result | Assimilation rule |
|---|---|---|---|
| `generate social post` | exact read alias | assigned quote plus canonical HTTPS availability line | The command retrieves the day's existing quote and cannot publish externally. |
| `compare production` | recognized unsupported capability | no mutation | Remains rejected until every visible directive has a stable action identity and a shared comparison projection. |
| `p1` | unresolved directive shorthand | clarification | Must not be aliased to a legacy global `P<n>` identity; the next epoch must bind it to the displayed Production docket. |
| `production 1` | unresolved ordinal | clarification | Must resolve only against the currently displayed Production docket and its state seal. |
| `compare M1 M2` | existing Campaign comparison | read-only cognitive comparison | Campaign comparison remains valid but does not imply directive or cross-menu comparability. |

Permutation policy for this epoch:

- Social-post aliases admit case, punctuation, and whitespace normalization
  only; they never call a social network or consume another aphorism.
- Raw directive scores are no longer player-facing; the workbook retains the
  internal values and formula provenance.
- A local directive ordinal may be assimilated only after the rendered docket,
  Ava discourse context, and Nexus all share one day- and revision-sealed
  descriptor.
- No grammar rule may reinterpret bare `M1` as a directive merely because the
  player most recently viewed Military; explicit Campaign identities retain
  precedence until distinct directive handles exist.
