# Epoch 003 — typed operational Ava language

Status: in progress; NODE-20 proof and final seal pending

This epoch extends the sealed contextual-language surface with disclosed,
read-only operational concepts and authored evidence for the current maneuver
docket. It is ported onto the current `main` head; the stale handoff base
`9973b8e` is not used.

## Node sequence

| Node | Contract | Status |
| --- | --- | --- |
| NODE-14 | owner and maneuver preflight | complete |
| NODE-15 | typed operational projection and static vocabulary | complete |
| NODE-16 | authored maneuver evidence projection | complete |
| NODE-17 | deterministic authored-reference indexing and lowering | complete |
| NODE-18 | semantic rendering | complete |
| NODE-19 | web, terminal, and native SSH parity | complete (`f10f465`) |
| NODE-20 | exhaustive proof, documentation, and receipt | in progress |

## Release boundary

This epoch is local-only. It does not push GitHub, deploy Cloudflare, write
D1, mutate the shadow environment, or use HTTP as an SSH substitute.

## Authorities

- Game state and maneuver identity: `app/game.ts` and
  `app/campaign-substrate.ts`
- Disclosure: `app/ava/projection.ts` and `app/ava/world-model.ts`
- Typed entities and concepts: `app/ava/game-context.ts` and `app/concepts.ts`
- Ava contextual language: `app/ava/contextual-language*.ts`
- Canonical execution: `app/ava/nexus.ts`
- Terminal and SSH adapters: `packages/terminal-core` and
  `packages/ssh-gateway/src/session-core.ts`
