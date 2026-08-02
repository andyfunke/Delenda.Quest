# Epoch 004 — composed operational Ava semantics

Status: in progress; local-only implementation epoch

This epoch extends the sealed Epoch 003 typed operational language with
evidence-bound calculus, composed advice, bounded pairwise maneuver comparison,
typed relationships, and one semantic render model. It is ported onto the
current pushed `main` head; the handoff base `9973b8e` is not used.

## Node sequence

| Node | Contract | Status |
| --- | --- | --- |
| NODE-21 | owner preflight and boundary map | complete; no implementation commit |
| NODE-22 | canonical calculus evidence | sealed (`04927d6`; receipt `NODE-22.md`) |
| NODE-23 | typed advice composition | sealed (`0656460`; receipt `NODE-23.md`) |
| NODE-24 | pairwise typed maneuver comparison | sealed (`17dac16`; receipt `NODE-24.md`) |
| NODE-25 | typed operational relationships | sealed (`6275e2d`; receipt `NODE-25.md`) |
| NODE-26 | canonical semantic rendering | sealed (`d021d9b`; receipt `NODE-26.md`) |
| NODE-27 | final parity, generated proof, and epoch seal | proof implementation complete; final gates pending |

## Authorities

- Ava request and surface routing: `app/ava/nexus.ts` and `app/ava/compiler.ts`
- Decision calculus: `app/ava/cognitive-nexus.ts::decisionRoute`,
  `app/ava/decision-engine.ts`, and `app/ava/cognitive-domain.ts`
- Forecast calculus: `app/ava/cognitive-nexus.ts::temporalRoute`,
  `app/ava/temporal-engine.ts`, and disclosed `app/ava/projection.ts`
- Maneuver identity and typed fields: `app/game.ts` and
  `app/campaign-substrate.ts`
- Typed concept relationships: `app/concepts.ts::CONCEPTS`
- Native SSH: `packages/ssh-gateway/src/session-core.ts`, calling
  `runAvaNexusLine` directly

The deprecated `app/ava/decision-calculus.ts` is not an active authority and is
not revived. No second parser, generic graph, hidden-state projection, or
mutation route is introduced.

## Release boundary

This epoch does not push GitHub, deploy Cloudflare, write D1, mutate
`delenda-quest-shadow`, change production bindings, or use HTTP as an SSH
substitute. Cloudflare validation remains local and dry-run only.
