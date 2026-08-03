# NODE-03 — Prose producers/consumers and day-turnover authority

| Field | Value |
|---|---|
| Epoch | 009 |
| Node | 03 |
| Title | Cross-surface prose inventory + day-turnover authority |
| Depends-on | NODE-02 |
| Status | complete |

## Owned files

- `docs/epochs/epoch-009-campaign-contentgen-preflight/inventory/prose-and-turnover.md`
- this node file

## Procedure

Inventory producers and consumers of Ava prose, main-campaign prose, manoeuvre
presentations, sub-missions, reports, and resolution records. Identify the
day-turnover authority path and whether an automatic (non-manual) turnover
path exists.

## Acceptance

Inventory names the claim/redeem path through `app/api/turn/route.ts` →
`db/turns.ts` and records the automatic-turnover finding for Epoch 026.

## Stop conditions hit

none — canonical campaign/day authority identified.
