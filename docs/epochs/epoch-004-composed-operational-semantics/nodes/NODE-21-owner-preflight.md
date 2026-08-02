# NODE-21 / composed operational semantics owner preflight

Status: complete; no implementation commit

Base authority: Epoch 003 remote head `a473e3d3720e3c0dfe0eb3c83db63db2144eab77` on
`main`. The attached handoff's `9973b8e` base remains stale and is not used.

## Calculus owner map

| Operation | Actual source path | Existing route | Stable inputs | Disclosed outputs | Hidden boundary | Mutation relationship |
| --- | --- | --- | --- | --- | --- | --- |
| `ADVISE` | `app/ava/cognitive-nexus.ts::decisionRoute` → `app/ava/decision-engine.ts` → `app/ava/cognitive-domain.ts` | `ADVISE`/`RANK`/`RECOMMEND` campaign-choice route | current visible action descriptors, `projectAvaAction`, `projectAvaEnvelope`, visible world revision, compiled decision model | candidate metric intervals, normalization, utility interval, feasibility, regret, ranking, Pareto front, tradeoffs, proof IDs, digest | hidden facts, raw adversary actuality, resolution ticket, RNG/private calculus, sealed outcomes | read-only cognitive execution; terminal realization cannot prepare or issue an order |
| `FORECAST` | `app/ava/cognitive-nexus.ts::temporalRoute` → `app/ava/temporal-engine.ts` and `projectionArtifactFor` | existing `FORECAST`/temporal envelope route | visible world revision, typed action/plan target, disclosed projection artifact, compiled horizon | projected disclosed envelope, changes, confidence terms where maneuver owner provides them, `UNBOUND` temporal outcome semantics | hidden inputs, future resolution, resolution ticket, RNG, sealed boundary details beyond the typed status/reason | read-only projection; no resolution or mutation |
| `COMPARE` | existing generic campaign-choice decision route; typed pairwise maneuver comparison is not yet an owner | `COMPARE` with two current action entities | stable action/maneuver IDs, visible docket, current disclosed projection, compiled decision model | current generic ranking exists; no typed pairwise dimensions yet | no prose-derived factor, no global winner for the new pairwise layer unless the owner defines one | read-only |

The deprecated `app/ava/decision-calculus.ts` is not an active runtime owner and
is explicitly excluded. It is not revived as a parallel calculator.

## Comparison owner map

| Dimension | Actual owner | Value source | Unit/domain | Comparable conditions | Missing behavior | Ranking authority |
| --- | --- | --- | --- | --- | --- | --- |
| execution confidence | `app/game.ts::explainManeuverChance` | stable maneuver ID plus disclosed state | probability | both IDs are current disclosed maneuvers | unavailable | no new pairwise winner |
| commitment | `app/game.ts::Maneuver.commitment` | stable maneuver definition | personnel | both definitions expose the field | unavailable | no new pairwise winner |
| casualty factor | `app/game.ts::Maneuver.casualty` | stable maneuver definition | multiplier | both definitions expose the field | unavailable | no new pairwise winner |
| supply burden | `app/game.ts::Maneuver.supply` | stable maneuver definition | multiplier | both definitions expose the field | unavailable | no new pairwise winner |
| success/failure pressure | `app/game.ts::Maneuver.successPressure` / `failurePressure` | stable maneuver definition | authored operational pressure domain | values are exposed but direction is context-dependent | not comparable when the owner does not define direction | no new pairwise winner |
| projected ground movement | `app/ava/projection.ts::projectAvaEnvelope` | pure disclosed action projection | km interval | both actions project successfully | unavailable | no new pairwise winner |

Authored labels and rationales are evidence only; they are never numeric inputs.

## Relationship owner map

| Source entity | Relationship | Target entity | Stable join key | Visible fields | Relationship owner | Read-only route |
| --- | --- | --- | --- | --- | --- | --- |
| concept/metric ID | `RELATED_CONCEPT` | concept/metric ID | `CONCEPTS[source].related[]` | source and target concept IDs/labels, exact owner definition, relation order | `app/concepts.ts::CONCEPTS` | existing `EXPLAIN` result projection |
| `campaign-synopsis` | `CURRENT_VISIBLE_MANEUVER` | `maneuver:<id>` | `currentSituation.maneuvers[]` → `MANEUVERS[id]` + presentation map | stable ID, exact label/rationale, current situation ID/order | `app/game.ts` + `app/campaign-substrate.ts` | existing read-only `EXPLAIN`/`REPORT` semantics |

Both relationships are directed. No generic graph, co-occurrence edge, or prose
inference is authorized. Relationship bounds are explicit in the projection
contract.

## Advice composition map

| Component | Authoritative source | Inputs | Derived fields | Rule/equation | Disclosure status | Provenance |
| --- | --- | --- | --- | --- | --- | --- |
| objective | `CompiledSituation`, `operationalObjectiveForProblemClass`, `operationalTargetForProblemClass` | problem class, question, sector | typed objective label/target | existing substrate lookup | disclosed | campaign-substrate paths |
| priority axes | semantic query and contextual priority catalog | query criteria / declared axes | ordered axis list | existing compiler lowering | disclosed | query/catalog trace |
| operational context | `CompiledSituation` | situation ID, bands, content revision | visible context | no new equation | disclosed | campaign-substrate |
| visible maneuvers | `enumerateAvaActions`, decision route | current docket, disclosed projection | option envelope | decision-engine model | disclosed | runtime/decision proof |
| alternatives | decision ranking | visible ranked candidates | non-winning visible options | existing ranking | disclosed when present | decision result |
| uncertainty | decision metric intervals / forecast ranges | owner-produced ranges | typed interval | existing engine/projection | disclosed when present | metric/projection facts |
| coupled orders | no active typed owner found | — | structured unavailable | — | unavailable | explicit limitation |

## Preflight gates

- Epoch 003 sealed and remote/local heads reconciled: PASS (`a473e3d`).
- GitHub repository and write permission reconciled: PASS; no write performed.
- Native SSH entrypoint available: PASS; it calls `runAvaNexusLine` directly.
- Cloudflare connector/deployment: unavailable and packet forbids deployment; local
  Cloudflare validation remains the only allowed boundary.
- Hidden-state, mutation, and stale-calculus stop conditions: no blocker for the
  scoped read-only projections above.
