# NODE-00 — Preflight

**Epoch:** 015  
**Depends-on:** none  

## Owned files

- `docs/epochs/epoch-015-contentgen-lab/**` (this node may only write docs under this epoch)

## Procedure

1. Confirm branch and base.
2. Confirm Node version and lockfile hash.
3. Confirm Epoch 014 service and migration present.
4. Confirm parking-lot overlap (`PL-AVA-001`) does not authorize secrets or deploy.
5. Materialize `feature.md` before implementation nodes.

## Focused commands

```bash
git rev-parse HEAD
node -v
sha256sum package-lock.json
test -f db/contentgen.ts && test -f drizzle/0015_contentgen_review.sql
```

## Acceptance

Preflight recorded; feature ledger exists before owned runtime files change.

## Stop conditions hit

none

## Receipt

| Command | Result |
|---|---|
| `git rev-parse HEAD` | `bc80c18eede6ec3fa03681bf5ea1c13f11cbb9d0` |
| `node -v` | `v22.14.0` |
| `sha256sum package-lock.json` | `b499ed553ebe2ccf799c450b300eebf4c9fdd0a7a8ccbb3951feacfb5034d75a` |
| Epoch 014 artifacts | present |
| Branch | `cursor/epoch-015-019-contentgen-campaign-88d3` |
