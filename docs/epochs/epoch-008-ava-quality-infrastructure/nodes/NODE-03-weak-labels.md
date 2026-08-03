# NODE-03 — weak-label aggregation

| Field | Value |
|---|---|
| Epoch | 008 |
| Node | 03 |
| Title | Weak-label aggregation |
| Status | historical record (reconstructed from Git; not a live execution receipt) |

## Source of truth

Commit `0e4daf7266cd1e3f365adc47a4983f76779633e5`.

## Owned files

- `scripts/ava-content-quality.mjs` (weak-label lineage and aggregation)
- `tests/ava-content-quality-epoch-008.test.mjs`

## Procedure (historical)

Retain every source result; hard authority rejection dominates threshold
aggregation. No fabricated intermediate commits.

## Acceptance evidence present in Git

Focused test: weak labels preserve hard safety rejection
(`receipts/NODE-08.md`).
