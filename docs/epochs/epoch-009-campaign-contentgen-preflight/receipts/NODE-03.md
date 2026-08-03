# Epoch 009 — NODE-03 receipt

Status: complete

## Result

Wrote `inventory/prose-and-turnover.md`.

Day-turnover authority:
`app/api/turn/route.ts` → `claimDailyResolution` / `redeemDailyResolution`
(`db/turns.ts`) → Nexus `{kind:"resolve-day"}` → `app/game.ts::resolve`.

Automatic turnover finding: **yes**, client-driven `GameClient.advance("automatic")`
on overdue/expired account-day clock; **no** Worker cron / server background
resolver. Recorded for Epoch 026 behavior 3.
