# NODE-02 — deterministic contextual catalog

## Output

Extended the existing static catalog with the packet's declared read-only
vocabulary, including ground/territory aliases, front movement and kilometer
aliases, adversary/condition report language, objective questions, and
strategy language.

## Ownership

All surfaces remain owned by `AVA_CONTEXTUAL_CATALOG`. Collision checking and
digest calculation remain in the contextual contract module. No entity or
action dictionary was added to a client adapter.

## Verification

- Every static alias has one deterministic owner.
- Catalog digest changes when a catalog entry changes.
- `bash scripts/test-substrate.sh` PASS (222/222).
- `npm run typecheck` PASS.
