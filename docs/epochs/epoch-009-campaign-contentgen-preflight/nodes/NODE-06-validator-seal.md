# NODE-06 — independent validator and epoch seal

| Field | Value |
|---|---|
| Epoch | 009 |
| Node | 06 |
| Title | `validate:epoch-009` and focused-gate seal |
| Depends-on | NODE-05 |
| Status | complete |

## Owned files

- `docs/epochs/epoch-009-campaign-contentgen-preflight/validate-epoch-009.mjs`
- `package.json` (Part 5 command registration only — not runtime source)
- receipts under this epoch
- append-only `DELENDA_QUEST_UBERDOC.md` entries

## Procedure

1. Add shell/node validator that reads Git objects and protected hashes and
   imports no application source.
2. Register `npm run validate:epoch-009`.
3. Run focused commands; append receipts and UBERDOC.

## Focused commands

```bash
npm run test:ava-content-quality
npm run test:ava-content-quality-epoch-008
npm run typecheck
npm run validate:epoch-009
git diff --check
```

## Acceptance

Validator fails if Epoch 008 commit files differ from the documented set or if
any required protected library is omitted / drifted from the immutability
manifest. All focused commands PASS.

## Stop conditions hit

none
