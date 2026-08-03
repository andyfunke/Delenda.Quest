# NODE-04 — watcher delta attribution

| Field | Value |
|---|---|
| Epoch | 008 |
| Node | 04 |
| Title | Watcher delta attribution |
| Status | historical record (reconstructed from Git; not a live execution receipt) |

## Source of truth

Commit `0e4daf7266cd1e3f365adc47a4983f76779633e5`.

## Owned files

- `scripts/ava-content-quality.mjs` (watcher attribution)
- `tests/ava-content-quality-epoch-008.test.mjs`

## Procedure (historical)

Allow zero or one changed layer; emit `UNATTRIBUTABLE_DIFF` when more than one
layer changes. Single-commit historical map only.

## Acceptance evidence present in Git

Focused test: watcher attribution rejects multi-layer drift
(`receipts/NODE-08.md`).
