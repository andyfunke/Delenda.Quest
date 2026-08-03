# NODE-02 — Routes and UI

**Epoch:** 015  
**Depends-on:** NODE-01  

## Owned files

- `app/admin/contentgen/**`
- `app/ContentgenLab.tsx`
- `app/api/admin/contentgen/**`
- `app/globals.css` (Contentgen Lab styles only)
- `tests/contentgen-lab.test.mjs`
- `package.json` (`test:contentgen-lab` script)

## Procedure

1. Wire admin-gated `/admin/contentgen` page.
2. Wire `/api/admin/contentgen` route adapters over Epoch 014 service.
3. Ship review card, reduction side-by-side, queue summary, completion gate.
4. Accessibility: keyboard-selectable candidates + `aria-live` status.
5. Focused gate green.

## Focused commands

```bash
npm run test:contentgen-lab
git diff --check
```

## Acceptance

Ordinary accounts rejected; unresolved blocks close; stale revision conflicts; reload preserves queue from durable store.

## Stop conditions hit

none
