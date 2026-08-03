# NODE-05 — promoted-manifest verification

| Field | Value |
|---|---|
| Epoch | 008 |
| Node | 05 |
| Title | Promoted-manifest verification |
| Status | historical record (reconstructed from Git; not a live execution receipt) |

## Source of truth

Commit `0e4daf7266cd1e3f365adc47a4983f76779633e5`.

## Owned files introduced by that commit

- `app/ava/content-quality-manifest.ts`
- `scripts/ava-content-quality.mjs` (pure verifier helpers)
- `package.json` (script wiring)

## Procedure (historical)

Hash version, corpus version, and candidates with a stable serializer; invalid
hash/candidate fails closed. The verifier is not imported into the live player
response path by this epoch.

## Acceptance evidence present in Git

Files and focused tests land in `0e4daf7`; see `receipts/NODE-08.md`.
