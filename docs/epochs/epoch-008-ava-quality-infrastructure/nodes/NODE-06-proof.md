# NODE-06 — focused proof

| Field | Value |
|---|---|
| Epoch | 008 |
| Node | 06 |
| Title | Focused proof |
| Status | historical record (reconstructed from Git; not a live execution receipt) |

## Source of truth

Commit `0e4daf7266cd1e3f365adc47a4983f76779633e5` plus receipt
`receipts/NODE-08.md`.

## Owned files

- `tests/ava-content-quality-epoch-008.test.mjs`
- `docs/epochs/epoch-008-ava-quality-infrastructure/receipts/NODE-08.md`
- `docs/epochs/epoch-008-ava-quality-infrastructure/README.md`

## Procedure (historical)

Seal local implementation with focused commands recorded in NODE-08. Git shows
a single implementation commit; no multi-node commit chronology is invented.

## Commands recorded in NODE-08

```text
npm run test:ava-content-quality             PASS (4/4)
npm run test:ava-content-quality-epoch-008  PASS (3/3)
npm run typecheck                            PASS
git diff --check                             PASS
```
