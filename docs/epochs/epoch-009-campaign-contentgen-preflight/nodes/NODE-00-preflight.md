# NODE-00 — preflight and specification-base seal

| Field | Value |
|---|---|
| Epoch | 009 |
| Node | 00 |
| Title | Preflight and specification-base seal |
| Depends-on | none |
| Status | **STOPPED** |

## Owned files

- `docs/epochs/epoch-009-campaign-contentgen-preflight/feature.md`
- `docs/epochs/epoch-009-campaign-contentgen-preflight/nodes/NODE-00-preflight.md`
- `docs/epochs/epoch-009-campaign-contentgen-preflight/receipts/NODE-00.md`
- append-only entry in `DELENDA_QUEST_UBERDOC.md` (doctrine §19 logbook)

## Procedure

1. Confirm §0.3 reading order materials exist.
2. Record branch, HEAD, dirty tree, Node version, lockfile hash, owned-files
   boundary.
3. Verify specification base `fd4b783` resolves.
4. Verify Epoch 008 commit `0e4daf7` ⊆ `origin/main`.
5. Re-run focused Epoch 008 tests and typecheck (Part 6 step 1 evidence).
6. Halt on any §0.5 missing referent or §1.2 baseline mismatch; do not open
   later nodes.

## Focused commands

```bash
git rev-parse HEAD
git status --short --branch
git cat-file -t fd4b783
git merge-base --is-ancestor 0e4daf7266cd1e3f365adc47a4983f76779633e5 origin/main
npm run test:ava-content-quality
npm run test:ava-content-quality-epoch-008
npm run typecheck
git diff --check
```

## Acceptance

- Spec base commit resolves and matches the branch plan in `updated_epoch.md`.
- Epoch 008 ancestry and focused gates match §1.1 expectations.
- Dirty tree does not overlap unowned runtime work.

## Stop conditions hit

- **`fd4b783` missing.** `git cat-file -t fd4b783` → `fatal: Not a valid
  object name fd4b783`. `updated_epoch.md` requires branching
  `epoch-009-027` from that tip (or a recorded successor of it). No successor
  of a non-existent commit can be identified without improvisation (§0.5).

## Stop conditions not hit

- Epoch 008 reproduces: ancestry confirmed; tests 4/4 and 3/3; typecheck 0.
- No overlapping uncommitted user runtime changes beyond this epoch's docs and
  the operator-supplied `updated_epoch.md`.
- Campaign/day authority identification deferred to later nodes (not reached).

## Receipt

See `receipts/NODE-00.md`.
