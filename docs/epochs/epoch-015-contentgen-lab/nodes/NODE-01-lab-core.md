# NODE-01 — Lab core (sampler, dispositions, workflow)

**Epoch:** 015  
**Depends-on:** NODE-00  

## Owned files

- `packages/contentgen-lab/**`
- `content-quality/lab/**`
- `db/contentgen.ts` (query helpers)
- `db/contentgen-lab.ts`

## Procedure

1. Implement §4.14 deterministic subset sampler (audit stream first).
2. Implement disposition legality / queue summary / NONE-mode projection.
3. Implement testable lab workflow (create/get/review/close/export).
4. Add staging manifest fixture with identity hash.
5. Add D1 flush/hydrate adapters (memory remains isolate authority when D1 absent).

## Focused commands

```bash
npm run test:contentgen-lab
```

## Acceptance

Sampler byte-stable for fixed seed; illegal dispositions rejected; NONE mode hides AI provenance.

## Stop conditions hit

none
