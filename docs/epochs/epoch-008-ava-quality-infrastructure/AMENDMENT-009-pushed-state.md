# Epoch 008 amendment — pushed-state correction (Epoch 009)

Status: append-only amendment. Does **not** rewrite or conceal
`receipts/NODE-08.md` or the original README status line.

Amended by: Epoch 009 (`docs/epochs/epoch-009-campaign-contentgen-preflight/`)
Date: 2026-08-03

## Correction

| Original declaration | Live finding | Correction |
|---|---|---|
| README L3: `Status: implemented locally; not pushed or deployed` | Commit `0e4daf7266cd1e3f365adc47a4983f76779633e5` is an ancestor of `origin/main` (`a0c62de2bb8cca028dd25f99995f0a2abfbaa055` at Epoch 009 preflight) | **"not pushed" is stale.** Epoch 008 implementation is contained in `origin/main`. |
| Directory lacked bounded `nodes/` files | Confirmed at Epoch 009 start (README + `receipts/` only) | Historical node records added under `nodes/` from the Git file map of `0e4daf7` only — no fabricated multi-commit chronology. |

## Historical implementation map (`0e4daf7`)

```text
app/ava/content-quality-manifest.ts
content-quality/corpus/approved.jsonl
content-quality/corpus/calibration.jsonl
content-quality/corpus/rejected.jsonl
docs/epochs/epoch-008-ava-quality-infrastructure/README.md
docs/epochs/epoch-008-ava-quality-infrastructure/receipts/NODE-08.md
package.json
scripts/ava-content-quality.mjs
tests/ava-content-quality-epoch-008.test.mjs
```

## Reconfirmed focused gates (Epoch 009 NODE-00 / seal)

```text
npm run test:ava-content-quality             PASS (4/4)
npm run test:ava-content-quality-epoch-008  PASS (3/3)
npm run typecheck                            PASS
git merge-base --is-ancestor 0e4daf7 origin/main  PASS
```

## Explicit non-claims

- This amendment does not authorize deployment, D1 mutation, secret movement,
  LLM judging, human curation application, self-training, narrative grammar,
  campaign law, or runtime promotion.
- Original NODE-08 receipt text remains authoritative for what was claimed at
  local seal time; this file only records the subsequent pushed-state fact and
  the historical file map.
