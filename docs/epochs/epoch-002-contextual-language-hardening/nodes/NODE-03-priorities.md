# NODE-03 — declared priority lowering

## Output

The existing contextual priority helper now validates duplicate, unknown, and
overlong `StrategicDimension` declarations and accepts the declared surface
as a deterministic API input. It preserves the non-contextual empty-axis
fallback used by ordinary Ava advice.

## Current-main adaptation

The stale packet's `CompiledPriorityIntent`, `PriorityAxis`, and
`packages/priorities-library` do not exist in the live tree. Contextual
priority language lowers to the existing `StrategicDimension` criteria used by
the evaluator; no parallel axis catalog is created.

## Verification

- `advance` remains an `ADVISE` route over `initiative` and
  `territorial_control`.
- Lowering is deterministic and bounded to four axes.
- `npm run typecheck` PASS.
- `bash scripts/test-substrate.sh` PASS.
