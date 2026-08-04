# Epoch 015 — Appified Contentgen Lab

Status: **COMPLETE**

**Depends on:** Epoch 014.

**Objective:** Internal admin product surface for batch creation, complete
grammar-list review, failure confirmation, quality judgment, and reductions.
No AI dependency. No auto-promote. Ordinary accounts never see the lab.

**Contracts consumed:** §4.14 (batch data flow — ratification), §4.7, §4.8,
§4.9 NONE-mode provenance rule.

**Owned files:**

- `app/admin/contentgen/`
- `app/ContentgenLab.tsx`
- `app/api/admin/contentgen/**`
- `packages/contentgen-lab/`
- Contentgen Lab styles in `app/globals.css`
- `content-quality/lab/`
- `tests/contentgen-lab.test.mjs`
- `db/contentgen.ts` (lab query helpers only)
- `db/contentgen-lab.ts` (route store + D1 persistence adapter)

**Exit:** Complete internal curation workflow without AI dependency.
Focused gate: `npm run test:contentgen-lab`.
