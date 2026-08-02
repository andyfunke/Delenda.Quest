### AVA-LANGUAGE-N19 / Prove expanded Ava parity across surfaces

Base commit: `2b0a547`

Completed commit: `f10f465`

Purpose: Prove that the expanded operational and authored-language corpus
reaches one canonical Nexus/compiler result through web, terminal, and native
SSH surfaces without adapter-local contextual parsers or mutation.

Exact procedures executed:

- Exercised the complete existing contextual corpus and the Epoch 003 owner,
  maneuver, evidence, action-prefix, negation, ambiguity, and unavailable
  reference cases.
- Compared web Nexus, terminal-core, and native SSH session-core results for
  instruction kind, route, semantic subject, entity/topic, authored evidence,
  maneuver identity, evidence kind, state/content revision, proof identity,
  rendered evidence, and mutation flag.
- Confirmed native SSH calls `executeNativeSshGatewayLine` and reaches the
  Nexus directly; no HTTP transport or HTTP-based parity substitute was used.
- Added exact, uppercase, punctuation, hyphenated, whitespace-normalized,
  action-prefixed, negated, hidden-state, and sealed-outcome regressions.
- Added the bounded full typed presentation-title exception while retaining
  the eight-token free-span bound.

Changed files: `app/ava/compiler.ts`,
`app/ava/contextual-language-references.ts`,
`tests/ava-contextual-language.test.mjs`.

New semantic contracts: an exact authored maneuver label may outrank shell
parsing only when it is an indexed `AUTHORED_BRIEF` narrative reference with a
stable maneuver identity; prefixed or negated variants remain fail-closed.
Typed presentation titles longer than eight tokens remain addressable as
whole exact typed labels, while free authored spans remain bounded.

Tests added: expanded maneuver corpus, web-terminal-native-SSH parity,
normalization variants, action-prefix safeguards, negated-reference guard,
static precedence, structured ambiguity, unavailable declaration, and hidden
state boundary coverage.

Validation results: `npm run typecheck` PASS; `bash scripts/test-substrate.sh`
PASS (232/232); `git diff --check` PASS.

Non-goals preserved: no adapter parser, no HTTP SSH path, no action lowering,
no hidden maneuver orders, no sealed outcome, no state mutation, no D1 write,
no shadow mutation, no Cloudflare deployment, and no GitHub push.

Known limitations: Cloudflare authentication is not exposed in this
workspace; deployment remains outside the epoch release boundary.

Next node handoff: generate the exhaustive proof corpus, document the owner
and evidence model in the canonical doctrine/ledger, run all global gates, and
seal the epoch with a SHA-256 source manifest and NODE-20 receipt.
