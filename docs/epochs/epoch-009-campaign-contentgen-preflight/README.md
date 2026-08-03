# Epoch 009 — campaign / Contentgen preflight

Status: **complete and pushed** on
`cursor/epoch-009-campaign-contentgen-preflight-88d3` (PR #8). Not production
deployed.

| Field | Value |
|---|---|
| Base | `origin/main` @ `a0c62de` (contains Epoch 008 `0e4daf7`) |
| Branch | `cursor/epoch-009-campaign-contentgen-preflight-88d3` |
| Seal tip | `da91a7b` |
| PR | https://github.com/andyfunke/Delenda.Quest/pull/8 |
| Spec | `updated_epoch.md` Part 6 Epoch 009; §4.16 |

## Scope

Historical repair of Epoch 008 documentation, protected-library immutability
manifest, prose/turnover inventory, authority map, and R01–R41 requirement
freeze. No runtime source changes.

Operator note: the `updated_epoch.md` header claim of sealed base `fd4b783` /
`codex/epoch-006` was nullified for this epoch; work executed against live
`main` containing Epoch 008.

## Exact commands

```bash
npm run test:ava-content-quality
npm run test:ava-content-quality-epoch-008
npm run typecheck
npm run validate:epoch-009
git diff --check
```

All PASS at seal (see `receipts/NODE-06.md`).

## Exit artifacts

| Artifact | Path |
|---|---|
| Epoch 008 amendment | `../epoch-008-ava-quality-infrastructure/AMENDMENT-009-pushed-state.md` |
| Epoch 008 historical nodes | `../epoch-008-ava-quality-infrastructure/nodes/NODE-01…06` |
| Immutability manifest | `integrity/immutability-manifest.json` (30 entries) |
| Authority map | `authority-map.md` |
| Requirement trace | `requirement-trace.md` (R01–R41 + §1.2) |
| Prose / turnover inventory | `inventory/prose-and-turnover.md` |
| Independent validator | `validate-epoch-009.mjs` → `npm run validate:epoch-009` |
| Compatibility ledger | `feature.md` |
| Node contracts | `nodes/NODE-00…06` |
| Receipts | `receipts/NODE-00…06` |

## Automatic-turnover finding (for Epoch 026)

Client-driven `GameClient.advance("automatic")` uses the same
`claimDailyResolution` / `redeemDailyResolution` path as manual Resolve Day.
No Worker cron or server background resolver.

## Next epoch

Epoch 010 — Contentgen doctrine and shared chord metagrammar. Start a fresh
session; do not continue scaffolding 010 in this epoch tree.
