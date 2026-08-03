# NODE-01 — Epoch 008 historical node records

| Field | Value |
|---|---|
| Epoch | 009 |
| Node | 01 |
| Title | Epoch 008 historical node records |
| Depends-on | NODE-00 |
| Status | complete |

## Owned files

- `docs/epochs/epoch-008-ava-quality-infrastructure/nodes/NODE-01-corpus.md`
- `docs/epochs/epoch-008-ava-quality-infrastructure/nodes/NODE-02-indexes.md`
- `docs/epochs/epoch-008-ava-quality-infrastructure/nodes/NODE-03-weak-labels.md`
- `docs/epochs/epoch-008-ava-quality-infrastructure/nodes/NODE-04-watcher.md`
- `docs/epochs/epoch-008-ava-quality-infrastructure/nodes/NODE-05-manifest.md`
- `docs/epochs/epoch-008-ava-quality-infrastructure/nodes/NODE-06-proof.md`

## Procedure

Add bounded historical node records describing the actual files introduced by
`0e4daf7`. Do not fabricate execution chronology not present in Git.

## Acceptance

Six node files exist; each cites `0e4daf7` and the file map from
`git show --name-only 0e4daf7`.

## Stop conditions hit

none
