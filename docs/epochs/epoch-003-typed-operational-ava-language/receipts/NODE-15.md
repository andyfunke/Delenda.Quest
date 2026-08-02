### AVA-LANGUAGE-N15 / Expose typed operational Ava language

Base commit: `3d04095961a40c72363adfa2d546ff2ec0187b79`

Completed commit: `16ad7c0`

Purpose: Record the owner-first operational vocabulary boundary and expose
truthful availability for typed formation, reserve, route, and opening reads.

Exact procedures executed:

- Reconciled the four concepts against `CONCEPTS`, `AVA_METRICS`, terminal
  metric ownership, and the existing `METRIC_EXPLANATION` route.
- Confirmed `reserve` as the only scalar owner in this set; kept formation,
  route, and opening static/contextual without fabricated values.
- Recorded the stable maneuver ID join and read-only `campaign-synopsis`
  fallback in the NODE-14 preflight record.

Changed files: `docs/epochs/epoch-003-typed-operational-ava-language/README.md`,
`docs/epochs/epoch-003-typed-operational-ava-language/nodes/NODE-14-owner-preflight.md`,
and the owner-availability branch in `app/ava/terminal.ts`.

New semantic contracts: missing formation/route/opening scalar values render
as unavailable in the current disclosed state; no owner gains an action field.

Tests added: owner and mutation-boundary coverage is included in the epoch
contextual corpus.

Validation results: `npm run typecheck` PASS; `bash scripts/test-substrate.sh`
PASS (231/231); native SSH gateway path PASS; `git diff --check` PASS.

Non-goals preserved: no new instruction kind, no hidden state, no mutation,
no HTTP SSH substitute, no deployment, no D1 write, no shadow change, and no
GitHub push.

Known limitations: Cloudflare authentication is unavailable; deployment is
outside this epoch boundary.

Next node handoff: project exact current maneuver label, rationale, and
presentation evidence with stable provenance and content digest coverage.

