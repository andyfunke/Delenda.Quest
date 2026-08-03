# NODE-04 — R01 immutability manifest

| Field | Value |
|---|---|
| Epoch | 009 |
| Node | 04 |
| Title | Protected-library immutability manifest |
| Depends-on | NODE-03 |
| Status | complete |

## Owned files

- `docs/epochs/epoch-009-campaign-contentgen-preflight/integrity/immutability-manifest.json`
- this node file

## Procedure

Hash existing authored libraries that R01 protects:

- whole-file SHA-256 (NFC UTF-8) for dedicated content files;
- ast-initializer SHA-256 for authored exports inside mixed code/mechanics
  files (`app/game.ts`, `app/campaign-substrate.ts`).

Manifest enumerates every protected entry with `hashType` ∈
{`whole-file`,`ast-initializer`}.

## Acceptance

Manifest includes at least:

- `app/epoch-006-content.ts`, `app/sub-mission-content.ts`, `app/concepts.ts`
  (whole-file);
- authored exports in `app/game.ts` including phases/theaters/events/maneuvers
  and related prose-bearing definitions;
- `GENERIC_SITUATION_TEMPLATES` (and related authored constants) in
  `app/campaign-substrate.ts`.

## Stop conditions hit

none
