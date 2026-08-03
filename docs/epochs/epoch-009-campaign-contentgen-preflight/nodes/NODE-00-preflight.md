# NODE-00 — preflight and specification-base seal

| Field | Value |
|---|---|
| Epoch | 009 |
| Node | 00 |
| Title | Preflight and specification-base seal |
| Depends-on | none |
| Status | complete (stop cleared by operator) |

## Owned files

- `docs/epochs/epoch-009-campaign-contentgen-preflight/feature.md`
- `docs/epochs/epoch-009-campaign-contentgen-preflight/nodes/NODE-00-preflight.md`
- `docs/epochs/epoch-009-campaign-contentgen-preflight/receipts/NODE-00.md`

## Procedure

1. Confirm §0.3 reading order materials exist (`updated_epoch.md` present).
2. Record branch, HEAD, dirty tree, Node version, lockfile hash.
3. Verify Epoch 008 commit `0e4daf7` ⊆ `origin/main` / `HEAD`.
4. Re-run focused Epoch 008 tests and typecheck.
5. Treat document header `fd4b783` / sealed `codex/epoch-006` branch claim as
   **operator-nullified** (2026-08-03 instruction: execute normally against live
   main). Do not stop on that referent.

## Focused commands

```bash
git merge-base --is-ancestor 0e4daf7266cd1e3f365adc47a4983f76779633e5 origin/main
npm run test:ava-content-quality
npm run test:ava-content-quality-epoch-008
npm run typecheck
git diff --check
```

## Acceptance

Epoch 008 ancestry and focused gates match §1.1; operator cleared the spurious
spec-base stop; dirty tree does not overlap unowned runtime work.

## Stop conditions hit

- Prior session: `fd4b783` missing — recorded in `receipts/NODE-00.md`.
- **Cleared by operator (2026-08-03):** forget sealed epoch-6 base artifact;
  continue on live main.

## Receipt

See `receipts/NODE-00.md` (append-only; clearance appended).
