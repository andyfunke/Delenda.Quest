# NODE-14 / owner and maneuver preflight

Status: complete; no implementation commit

Base inspected: `3d04095961a40c72363adfa2d546ff2ec0187b79`

The earlier authored-language NODE-13 is sealed in the Epoch 001 history at
`df6ed97b5be858dd255fb0ed9ca64c874d42ba22`. Epoch 002 is a valid sealed
successor, so this cohort uses the current clean Epoch 002 head rather than
rewinding to either the stale packet base or the older NODE-13 commit.

## Operational owner map

| Concept | Source path | Typed owner | Entity ID or report topic | Existing route | Facet | Visible fields | Mutation relationship |
| --- | --- | --- | --- | --- | --- | --- | --- |
| formation | `app/concepts.ts::CONCEPTS.formation`; `app/ava/game-context.ts::AVA_METRICS` | `Concept` + non-action metric entity | `formation` | `METRIC_EXPLANATION` → `EXPLAIN` | `meaning` | owner-confirmed definition, consequence, control, related concepts; no scalar value is registered | entity has no `action`; control is disclosed as a typed campaign control only and does not stage or prepare an order |
| reserve | `app/concepts.ts::CONCEPTS.reserve`; `app/ava/terminal.ts::metricValue` and `app/concepts.ts::calculationFor` | `Concept` + non-action metric entity | `reserve` | `METRIC_EXPLANATION` → `EXPLAIN` | `calculus` | definition, consequence, control, related concepts, `state.reserves`, reserve calculation rows | entity has no `action`; read path cannot release reserve or mutate prepared orders |
| route | `app/concepts.ts::CONCEPTS.route`; `app/ava/game-context.ts::AVA_METRICS` | `Concept` + non-action metric entity | `route` | `METRIC_EXPLANATION` → `EXPLAIN` | `meaning` | owner-confirmed definition, consequence, control, related concepts; no route scalar is registered | entity has no `action`; terrain/ground/network/supply remain disclosed context and are not converted into a fabricated route score |
| opening | `app/concepts.ts::CONCEPTS.opening`; `app/ava/game-context.ts::AVA_METRICS` | `Concept` + non-action metric entity | `opening` | `METRIC_EXPLANATION` → `EXPLAIN` | `meaning` | owner-confirmed definition, consequence, control, related concepts; no opening scalar is registered | entity has no `action`; an opening explains the docket and never authorizes or resolves a maneuver |

All four concepts are `CONFIRMED_AND_TYPED` owners. The absence of a scalar
for formation, route, or opening is an explicit availability boundary, not a
placeholder. No hidden adversary fields, `resolutionTicket`, private calculus,
or prepared-order data is admitted to this language layer.

## Maneuver map

| Field | Verified owner and join |
| --- | --- |
| Stable identity | `currentSituation.maneuvers` contains stable maneuver IDs owned by `app/game.ts::MANEUVERS`; identity is not derived from prose, hash, or array position |
| Label | `MANEUVERS[id].label` and the disclosed `currentSituation.maneuverPresentations[id].label` are joined by `id` |
| Rationale | disclosed `currentSituation.maneuverPresentations[id].rationale` |
| Presentation | disclosed `currentSituation.maneuverPresentations[id]`, with label/rationale source paths preserved separately |
| Determinism | `app/game.ts::maneuverForSituation` and `maneuversForState` perform the stable ID join; presentation realization is content-addressed by the existing substrate compiler |
| Read-only owner | `app/ava/game-context.ts::enumerateAvaActions` supplies action descriptors, while `campaign-synopsis` is the existing non-action mission entity used by `NARRATIVE_REFERENCE` when no maneuver-specific non-action entity exists |
| Native SSH | `packages/ssh-gateway/src/session-core.ts::executeNativeSshGatewayLine` calls `runAvaNexusLine` directly; no HTTP path is involved |

The existing current docket keeps labels unique within its presentation set;
identity and source order remain authoritative even when text is equal across
different maneuvers. Exact authored evidence is copied only from disclosed
owner fields.

## Preflight gates

- clean worktree at the inspected base: passed
- GitHub repository/ref reconciliation: passed (`andyfunke/Delenda.Quest`, `main` at the same head)
- focused Ava baseline: passed through `scripts/test-ava.sh`
- focused substrate baseline: passed, 226/226
- NODE-13 sealed: passed
- native SSH session core available: passed
- Cloudflare deployment: not attempted; packet forbids deployment and no authenticated Cloudflare connector is exposed

