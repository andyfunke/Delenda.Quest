# Epoch 009 — Historical repair, preflight, and compatibility freeze

Status: **STOPPED at NODE-00** (missing specification base referent)

Prepared against: `updated_epoch.md` Part 6 Epoch 009; contracts consumed §4.16.

## Objective

Correct Epoch 008's historical declaration, freeze the complete requirement and
authority map, and prove that the new work starts from a clean, known
substrate.

## Owned files (Part 6)

- append-only amendment under `docs/epochs/epoch-008-ava-quality-infrastructure/`
- `docs/epochs/epoch-009-campaign-contentgen-preflight/`
- no runtime source files

## Compatibility ledger

| Concern | Finding | Decision |
|---|---|---|
| Authority document | Operator provided `updated_epoch.md`; placed at repo root | Required for §0.3 reading order |
| Spec base `fd4b783` | Not a valid object in any fetched ref | **STOP** — §0.5 missing referent; do not invent a substitute base |
| Live `origin/codex/epoch-006` tip | `b9500150418695fea81540219283f183d336aa7e` | Recorded; not used as improvised `fd4b783` alias |
| Live `origin/main` tip | `a0c62de` (contains Epoch 008 commit `0e4daf7`) | Recorded for ancestry evidence only |
| Epoch 008 ancestry | `0e4daf7266cd1e3f365adc47a4983f76779633e5` ⊆ `origin/main` | Confirmed |
| Prior session stop | Root `feature.md` append for missing `updated_epoch.md` | Preserved; this epoch file owns Epoch 009 state |

## Requirements to freeze (deferred — not written while stopped)

R01–R41 and §1.2 baseline table are not recorded into the immutability /
authority / requirement artifacts until NODE-00 clears.

## Stop conditions hit

1. `updated_epoch.md` header requires superepoch work on `epoch-009-027`
   branched from `fd4b783`, but `fd4b783` does not exist in the repository.
2. No amendment authorizes substituting `b950015`, `a0c62de`, or another tip.

## Explicit non-goals while stopped

No Epoch 008 amendment, immutability manifest, authority map, requirement
trace, `validate:epoch-009` script, push, deploy, secret, or D1 change.
