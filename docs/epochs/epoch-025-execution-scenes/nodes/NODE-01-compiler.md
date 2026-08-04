# NODE-01 — Execution scene compiler

**Epoch:** 025 · **Node:** 01  
**Depends-on:** NODE-00

**Owned files:**
- `packages/execution-scenes/**`
- `app/execution-scenes.ts`
- `app/campaign-content/execution-scenes/**`
- `content-quality/execution-scenes/**`
- `tests/execution-scenes.test.mjs`
- `app/game.ts` (DailyResolutionRecord + resolve integration only)
- `package.json` (`test:execution-scenes`)

**Procedure:** Schema §4.17; compile from ledgers; integrate into resolve after
mechanics; restore compatibility; independent fixture tests.

**Focused commands:** `npm run test:execution-scenes`

**Acceptance:** 5/5 pass; no resolve import in compiler; doomsday roll grep fails closed.

**Stop conditions hit:** none
