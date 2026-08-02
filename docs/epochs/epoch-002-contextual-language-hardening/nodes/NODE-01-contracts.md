# NODE-01 — contextual contract hardening

## Output

- Contextual surface normalization uses NFKC, lowercasing, punctuation
  separation, whitespace collapse, and preserved internal apostrophes.
- Runtime validators now enforce route-specific destination fields,
  provenance, state/content revisions, and digest equality.
- The validators are re-exported through `app/ava/compiler.ts`.

## Current-main adaptation

The live implementation calls surface strings `aliases` and strategic axes
`StrategicDimension`; the stale packet's absent `surfaces` field and
`packages/priorities-library` are not reintroduced.

## Verification

- `bash scripts/test-ava.sh`
- `bash scripts/test-substrate.sh`
- `npm run typecheck`
