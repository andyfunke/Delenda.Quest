# Epoch 009 — NODE-00 receipt

Status: **STOPPED** — missing specification base `fd4b783`

## Environment

| Field | Value |
|---|---|
| Branch | `cursor/epoch-009-campaign-contentgen-preflight-88d3` |
| HEAD at node start | `9207febd439cfc579f512803a51f29f4687f8639` |
| Node | `v22.14.0` |
| `package-lock.json` SHA-256 | `b499ed553ebe2ccf799c450b300eebf4c9fdd0a7a8ccbb3951feacfb5034d75a` |
| Authority file | `/workspace/updated_epoch.md` (operator upload; untracked at preflight) |
| `origin/main` | `a0c62de2bb8cca028dd25f99995f0a2abfbaa055` |
| `origin/codex/epoch-006` | `b9500150418695fea81540219283f183d336aa7e` |

## Command / result log (append-only)

### `git cat-file -t fd4b783`

```text
fatal: Not a valid object name fd4b783
```

Result: FAIL — missing referent (§0.5). Halt authorized.

### `git merge-base --is-ancestor 0e4daf7266cd1e3f365adc47a4983f76779633e5 origin/main`

```text
exit 0
```

Result: PASS — Epoch 008 commit contained in `origin/main` (§1.1).

### `npm run test:ava-content-quality`

```text
# tests 4
# pass 4
# fail 0
exit 0
```

Result: PASS (4/4).

### `npm run test:ava-content-quality-epoch-008`

```text
# tests 3
# pass 3
# fail 0
exit 0
```

Result: PASS (3/3).

### `npm run typecheck`

```text
exit 0
```

Result: PASS.

### `git diff --check`

```text
exit 0
```

Result: PASS.

## Diff vs specification claim

| Claim in `updated_epoch.md` | Live finding |
|---|---|
| Spec base / branch-from `fd4b783` (sealed tip of `codex/epoch-006`) | Object absent from all fetched refs |
| `codex/epoch-006` sealed tip | Live tip `b950015` (contains `0e4daf7` and later comparison repairs) |
| Epoch 008 `0e4daf7` in `origin/main` | Confirmed |
| Focused tests / typecheck as of 2026-08-03 validation | Reconfirmed PASS in this node |

## Halt

Later Epoch 009 nodes (008 historical node records, pushed-state amendment,
prose inventory, immutability manifest, R01–R41 ledger, `validate:epoch-009`)
were not started. Operator must amend `updated_epoch.md` with a resolvable
base commit (or restore `fd4b783`) before NODE-00 can clear.

## Append — operator clearance (2026-08-03)

Operator instruction: forget sealed epoch-6 / `fd4b783` as a non-binding
artifact; execute Epoch 009 normally against live `main` containing
`0e4daf7`. NODE-00 stop cleared. Subsequent nodes proceeded.
