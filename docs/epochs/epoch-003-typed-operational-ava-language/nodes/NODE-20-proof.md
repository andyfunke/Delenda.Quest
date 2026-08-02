# NODE-20 / exhaustive typed operational Ava proof

Status: sealed locally; immutable receipt `786da93` follows implementation
commit `c41dc9b`.

Base authority: current `main` at `3d04095961a40c72363adfa2d546ff2ec0187b79`.
Implementation seal: `c41dc9b`; NODE-19 receipt: `85cfe3b`; NODE-20 receipt:
`786da93`.
The stale packet base `9973b8e` is not an authority and is not used.

## Owner-first vocabulary

The contextual surface begins with one verified owner per concept. It does not
infer ownership from a phrase, duplicate a target table, or promote a
presentation string into a mechanic.

| Concept | Confirmed owner | Static ID and route | Allowlisted disclosed fields | Action boundary |
| --- | --- | --- | --- | --- |
| formation | `CONCEPTS.formation` plus the `formation` metric entity | `metric.formation` → existing `METRIC_EXPLANATION`/`EXPLAIN` | definition, consequence, control, related concepts; no scalar value | non-actionable explanation; no staging or preparation |
| reserve | `CONCEPTS.reserve` plus the `reserve` metric entity | `metric.reserve` → existing `METRIC_EXPLANATION`/`EXPLAIN` | definition, consequence, control, related concepts, disclosed `state.reserves`, and `calculationFor("reserve")` rows | read-only calculus; cannot release reserve or prepare an order |
| route | `CONCEPTS.route` plus the `route` metric entity | `metric.route` → existing `METRIC_EXPLANATION`/`EXPLAIN` | definition, consequence, control, related concepts; no fabricated route scalar | non-actionable explanation; terrain and supply context do not become a route score |
| opening | `CONCEPTS.opening` plus the `opening` metric entity | `metric.opening` → existing `METRIC_EXPLANATION`/`EXPLAIN` | definition, consequence, control, related concepts; no fabricated opening scalar | explains the docket; never resolves or mutates a maneuver |

All four owners are `CONFIRMED_AND_TYPED`. There are no deferred concepts in
this epoch. Formation, route, and opening explicitly render unavailable scalar
values rather than inventing one; reserve uses only its existing disclosed
scalar/calculation authority.

## Maneuver identity and evidence

Current maneuver IDs come from `currentSituation.maneuvers`, not from prose,
array position, a hash, or a guessed priority axis. Each ID joins to
`MANEUVERS[id]` in `app/game.ts` and to the disclosed
`currentSituation.maneuverPresentations[id]`. The projection preserves:

- the stable maneuver ID and owner label;
- exact label, rationale, and presentation source text;
- source section (`maneuver-label`, `maneuver-rationale`, or
  `maneuver-presentation`);
- source path and deterministic source order; and
- provenance for every indexed authored reference.

Only the disclosed projection is indexed. Hidden orders, `resolutionTicket`,
RNG seeds, private calculus, future maneuvers, sealed outcomes, success
pressure, and raw undisclosed `GameState` fields are excluded.

Authored lookup uses NFKC normalization, lowercase, punctuation-to-space
normalization, and collapsed whitespace. Stored labels, phrases, and excerpts
remain exact source text. Free authored spans are bounded to 2–8 tokens; a
single-token span is admitted only for an exact typed label, and an exact typed
presentation title longer than eight tokens is admitted as one whole title.
The long-title exception does not widen free-span indexing.

## Precedence and lowering

Static catalog entries are assembled first and own their normalized aliases.
Authored entries cannot replace a static owner. Exact authored references use
the existing `NARRATIVE_REFERENCE` contextual route and lower to the existing
typed `EXPLAIN` instruction with the `campaign-synopsis` fallback entity.
No new instruction kind, route, parser, action, or mutation authority is
introduced.

An accepted authored surface has exactly one of these outcomes:

1. a typed read-only authored-reference route;
2. a structured ambiguity when distinct maneuver identities (or a maneuver and
   another authored identity) share the exact surface; or
3. a structured unavailable-reference clarification for the declared
   `future freedom` surface when it is absent from the current disclosed
   authored briefing.

The result cannot be generic unknown fallback, an `UNKNOWN` subject, hidden
state, an invented maneuver/objective/strategy, or a mutation. Exact authored
labels may outrank shell or generic semantic parsing only after unsafe syntax,
negated consequential input, and negated authored-reference guards have run.
Action-like prefixes such as `issue`, `stage`, `prepare`, and `confirm` remain
outside the exact authored read route.

## Collision matrix

| Input/evidence | Required owner/result | Proof boundary |
| --- | --- | --- |
| `advance` | static `priority.advance` priority advice | authored `advance` cannot override the static owner |
| `front` | static `metric.front-movement` explanation | no action or day resolution |
| `enemy position` | static `report.adversary` report | disclosed report only |
| `condition` | static `report.overview` report | one static owner |
| `strategy` | static `advice.strategy` advice | not a shell command |
| `goals` | static `objective.current` axis-bearing objective explanation | never axis-less generic intent |
| same text + one maneuver identity | merged evidence for that identity | label/presentation/rationale evidence remains ordered |
| same text + multiple identities | structured ambiguity | no identity selection or mutation |
| `future freedom` absent from visible briefing | `AUTHORED_REFERENCE_UNAVAILABLE` | no generic disappearance or fabricated evidence |
| standing order, headline, briefing, question | authored evidence-bound read | never stages an order |
| exact maneuver label | `NARRATIVE_REFERENCE` → `EXPLAIN` | indexing does not create an action |
| `resolve the front` / `resolve the opening` | fail-closed clarification | never resolves the day or mutates state |

## Rendering and surface parity

The canonical renderer exposes typed availability and authored evidence under
`MANEUVER REFERENCE`: matched phrase, stable ID, owner label, evidence kind,
source section/path/order, exact excerpt, provenance, and `AUTHORED LANGUAGE`
status. Missing formation/route/opening scalar values say
`NOT PRESENT IN THE CURRENT DISCLOSED STATE`. Rendering never shows hidden
orders, sealed outcomes, private calculus, or raw `GameState`.

Web, terminal, and native SSH all call the same Nexus/compiler semantics. The
native path is `executeNativeSshGatewayLine` in the SSH session core; it does
not call HTTP. Approved surface differences are presentation formatting only;
instruction kind, route, entity/topic, evidence, maneuver identity, state and
content revisions, proof identity, and mutation flag remain equal.

## Generated proof corpus

`tests/ava-contextual-language.test.mjs` generates the following checks from
the projected catalog and current maneuver evidence rather than maintaining a
second hand-written alias list:

- every static alias in exact, uppercase, punctuation, hyphenated, and
  whitespace-normalized forms; owner destination, non-actionability, typed
  subject, and Nexus mutation safety;
- every current maneuver label, presentation, and bounded rationale evidence
  entry; source excerpt, provenance, identity, normalization variants, typed
  route, same-identity evidence merge, cross-identity ambiguity, and Nexus
  mutation safety;
- unavailable `future freedom`, static precedence, action-prefix and negation
  guards, hidden-state probes, and sealed-outcome probes; and
- web/terminal/native-SSH parity for an exact maneuver presentation.

The inherited NODE-13 corpus remains mandatory: territorial advice, advance
and front movement, adversary/condition/loss reports, objective and strategy
language, supply/communications/intelligence/readiness/force/position, the
complete goal/strategy/condition/front aliases, and the standing-order,
headline, briefing, question, and `future freedom` references.

## Required invariant

> Any high-information phrase from the current disclosed briefing, typed campaign ontology, declared conceptual catalog, or current maneuver evidence must either compile into a valid typed read-only Ava route or produce a narrow, truthful, evidence-bound clarification. It may never become an action merely because it resembles an authored maneuver, and it may never disappear into generic unrecognized fallback merely because it was expressed in ordinary language.

## Release boundary

This proof is local. It does not push GitHub, deploy Cloudflare, write D1,
mutate `delenda-quest-shadow`, use HTTP as an SSH substitute, move secrets, or
perform destructive Git recovery. The final seal requires focused tests, all
repository gates, `git diff --check`, a verified SHA-256 source manifest, and
one receipt appended after the completed implementation commit.
