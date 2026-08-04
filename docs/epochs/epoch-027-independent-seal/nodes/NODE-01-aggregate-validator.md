# NODE-01 — Aggregate independent validator

**Owned files:**
- `scripts/validate-epoch-009-027.mjs`
- `scripts/build-campaign-packs.mjs` (binding-domain capacity expansion)
- `app/campaign-content/**/*.v1.json` (regenerated slotDomains)
- `content-quality/packs/capacity.v1.json`
- `package.json` (`validate:epoch-009-027`)
- `docs/epochs/epoch-027-independent-seal/**`

**Procedure:** Independent suites 0–19; expand legal pack capacity ≥100k via
attested slot domains; run Part 5 final gate order; seal without deploy.

**Focused commands:** `npm run validate:epoch-009-027`

**Acceptance:** all suites PASS; import boundary clean; capacity ≥100000.

**Stop conditions hit:** none
