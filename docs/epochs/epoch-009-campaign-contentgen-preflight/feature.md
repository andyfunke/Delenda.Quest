# Epoch 009 — Historical repair, preflight, and compatibility freeze

Status: **COMPLETE** (local; not pushed or deployed)

Authority: `updated_epoch.md` Part 6 Epoch 009; contracts consumed §4.16.

## Objective

Correct Epoch 008's historical declaration, freeze the complete requirement
and authority map, and prove that the new work starts from a clean, known
substrate.

## Base and branch

| Field | Value |
|---|---|
| Working branch | `cursor/epoch-009-campaign-contentgen-preflight-88d3` |
| Live baseline tip | `origin/main` @ `a0c62de2bb8cca028dd25f99995f0a2abfbaa055` |
| Epoch 008 commit | `0e4daf7266cd1e3f365adc47a4983f76779633e5` ⊆ `origin/main` |
| Spec header `fd4b783` / sealed epoch-006 branch claim | **Operator-nullified** (2026-08-03): treat as non-binding Kimi artifact; execute against live `main` containing Epoch 008 |

## Owned files

- append-only amendment under `docs/epochs/epoch-008-ava-quality-infrastructure/`
- `docs/epochs/epoch-009-campaign-contentgen-preflight/`
- no runtime source files (`app/**` untouched)
- Part 5 command registration: `package.json` script → epoch-local validator

## Node map

| Node | Scope | Status |
|---|---|---|
| NODE-00 | Preflight; operator clears spurious `fd4b783` stop | complete |
| NODE-01 | Epoch 008 historical node records from `0e4daf7` | complete |
| NODE-02 | Append-only pushed-state amendment | complete |
| NODE-03 | Prose inventory + day-turnover / automatic path | complete |
| NODE-04 | R01 immutability manifest | complete |
| NODE-05 | R01–R41 ledger + §1.2 baseline + authority map | complete |
| NODE-06 | `validate:epoch-009` + focused-gate seal | complete |

## Exit artifacts

- Authenticated historical amendment: `../epoch-008-ava-quality-infrastructure/AMENDMENT-009-pushed-state.md`
- Protected-library manifest: `integrity/immutability-manifest.json`
- Authority map: `authority-map.md`
- Complete requirement trace: `requirement-trace.md`
- Independent validator: `npm run validate:epoch-009`

## Explicit non-goals

No GitHub push, Cloudflare deployment, D1 write, secret movement, Contentgen
implementation, campaign metastratum code, or Epoch 010+ scaffolding.
