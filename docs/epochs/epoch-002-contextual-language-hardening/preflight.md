# NODE-00 preflight

## Reconciliation

- Actual `HEAD`: `adfeebb02c22089b2f916e546f53567b6adacbba`
- Required handoff base `9973b8e`: unreachable in the local clone and absent
  from the connected GitHub repository.
- Worktree: clean before implementation.
- Current authority: `app/ava/schema.ts`, `app/ava/compiler.ts`,
  `app/ava/contextual-language-*.ts`, `app/ava/nexus.ts`, and the existing
  `StrategicDimension` definitions in `app/substrate/gates.ts`.
- Cloudflare: `wrangler whoami` reports no authenticated session; no release
  action is permitted by the packet.

## Required seams found

| Seam | Owner |
|---|---|
| Compiler context/result/entities/report topics | `app/ava/schema.ts` |
| Compiler entrypoint | `app/ava/compiler.ts::compileAvaCommand` |
| Nexus compiler boundary | `app/ava/nexus.ts::compileVisibleAvaContext` and `runAvaNexusLine` |
| Visible entity builder | `app/ava/game-context.ts::avaEntitiesForState` |
| Condition owner | existing typed report/semantic compilation plus contextual `report.overview` |
| Priority owner | `app/substrate/gates.ts` StrategicDimension catalog and current contextual lowerer |
| Report renderer | `app/ava/reports.ts` and `app/ava/terminal.ts` |
| Explanation renderer | `app/ava/terminal.ts` |
| State revision | `app/ava/world-model.ts::avaVisibleWorldRevision` |
| Native session path | `packages/ssh-gateway/src/session-core.ts` over Nexus |

## Decision

The stop condition for a stale base is satisfied by the repository's existing
epoch-port doctrine: do not rewind. Focused Ava and substrate baselines pass,
so the packet is adapted onto current `main` and the remaining acceptance gaps
are repaired in bounded current-owner modules.
