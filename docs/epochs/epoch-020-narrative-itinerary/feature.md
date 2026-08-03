# Epoch 020 — Narrative itinerary and main-thread scheduler

Status: **COMPLETE**

**Depends on:** Epoch 019.

**Objective:** Deterministic persisted 30-day main-thread itinerary guaranteeing
three completed Romantic instances, strict heat alternation, and sealed
suppression records (§4.12 verbatim).

**Owned files:**

- `packages/campaign-scheduler/**`
- `app/campaign-metastratum.ts` (itinerary integration hooks)
- `scripts/validate-campaign-itineraries.mjs`
- `tests/campaign-scheduler.test.mjs`
- Fallback arc stubs (always-eligible per phase) under `app/campaign-content/romantic/`

**Focused gates:** `npm run test:campaign-metastratum`,
`npm run validate:campaign-itineraries -- --seeds 10000`
