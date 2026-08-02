# NODE-04 — disclosed objective projection

## Output

- The existing non-action `campaign-synopsis` entity now owns the full goal
  vocabulary, including the packet's `goals` and operational-objective forms.
- Authored/current-situation entries are emitted only when the state carries a
  valid persisted current situation for the current day and content version.
- Projection remains derived through `projectAvaDisclosedState` and does not
  serialize private resolution or adversary fields.

## Current-main adaptation

The packet's proposed `campaign-objective` ID is represented by the existing
`campaign-synopsis` semantic entity; the entity is explicitly non-actionable.

## Verification

- Same state produces the same language digest.
- Missing persisted situation yields static language only.
- Objective entity has no action payload.
- `bash scripts/test-substrate.sh` and `npm run typecheck` pass.
