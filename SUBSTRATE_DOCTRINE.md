# SUBSTRATE DOCTRINE

This document is mandatory product law for Delenda Quest substrate work.
Repository agent instructions (`AGENTS.md`) must point here. Do not duplicate
this doctrine into multiple files.

Canonical architecture docs:
- `docs/substrate/architecture.md`
- `docs/substrate/grammar.md`
- `docs/substrate/directive-migration.md`
- `docs/ssh/architecture.md`

# DELENDA SUBSTRATE DOCTRINE

## 1. One authority, many surfaces

Delenda Quest has one authoritative campaign state machine. Web, Ava, SSH, MCP, future native clients, voice clients, notifications, and exports are adapters over the same application contracts. A client may parse input and render output. It may not own game rules, calculate outcomes independently, or mutate campaign state directly.

## 2. Semantic objects precede presentation

Every player-visible or player-issued object must exist first as a typed semantic object. HTML, terminal text, MCP JSON, speech, and dispatch prose are renderings of that object. Never scrape one client’s rendered output to supply another client.

## 3. Unlimited language, finite grammar, deterministic authority

Language may be abundant. Mechanics must be finite, declared, typed, versioned, validated, and deterministic. An LLM may:

- Recognize a player’s pattern.
- Complete a supplied pattern.
- Elicit missing intent.
- Map natural language to declared semantic fields.
- Propose combinations of declared primitives.
- Author prose constrained by required and forbidden claims.

An LLM may not:

- Invent a mechanic, effect, state field, resource, probability, cost, order, actor, gate operator, or transition.
- Bypass validation.
- mutate campaign state.
- Declare an order executed.
- Infer hidden state and present it as fact.

## 4. Precompute before inference

Prefer exhaustive enumeration, lookup, indexing, normalization, compilation, and deterministic ranking over live probabilistic inference. Treat the grammar as a software rainbow table: enumerate valid forms and collapse variable language into canonical operations. Treat the semantic compiler like a stenographer’s keyboard: many surface gestures resolve to a small, precise chord vocabulary. Treat optimization like CUDA: expose stable language abstractions over bounded algorithmic activity.

Use an LLM only when its pattern-recognition or pattern-completion advantage exceeds a deterministic alternative. Every LLM output must collapse back into a schema before it can affect recommendations, visibility, or state.

## 5. Ava Classic is a first-class intelligence

Ava Classic, the non-LLM agent, is not a fallback, demo mode, or degraded imitation of a chatbot. She is the reference implementation of Delenda’s semantic substrate and must consume the maximum useful portion of it without probabilistic inference. Her production runtime is the Nexus; `app/substrate/ava-classic.ts` is only a read-only differential reference interpreter.

Ava Classic should appear intelligent because she has:

- Exhaustive knowledge of the player-visible grammar.
- Exact access to campaign facts.
- Persistent discourse state.
- Deterministic intent recognition.
- Gate-aware action retrieval.
- Strategic posture and priority handling.
- Counterfactual comparison of legal choices.
- Explicit uncertainty.
- Clarification logic.
- Mechanic-grounded explanations.
- Canonical voice realizations.
- Memory of player-visible campaign history.

Her power comes from compiled structure, not fabricated freedom. Every new substrate capability must be evaluated for Ava Classic consumption before it is reserved for an LLM.

## 6. The LLM inherits the compiler

An attached LLM does not replace Ava Classic’s scaffolding. It receives the same semantic objects, valid dimensions, legal choices, campaign constraints, evaluation outputs, required claims, forbidden claims, and clarification rules. The model contributes open-ended pattern recognition, pattern completion, conversational adaptation, and prose variation over an already informed substrate.

The quality equation is:

```text
Agent quality =
  deterministic world model
  + enumerated grammar
  + validated retrieval
  + counterfactual calculus
  + discourse state
  + optional LLM deliberation
```

Never use an LLM to compensate for missing game structure. First improve the substrate. Then allow the LLM to consume it.

## 7. Generated content is compiled, not prompted into existence

“Generate a story from the game state” is prohibited as a production content strategy. LLM authorship begins only after the system supplies:

- A stable mechanic.
- Typed bindings.
- Exact visible facts.
- Required claims.
- Forbidden claims.
- Register constraints.
- Output shape.
- Length bounds.
- Continuity facts.
- Exhaustion history.
- Validation and rejection rules.

The model completes a declared pattern. It does not create game law, discover the intended genre from scratch, or improvise continuity.

## 8. The Labyrinth is latent

The complete content space is the Labyrinth. Players receive a gated, persisted docket, not the entire catalog. Abundance belongs behind the compiler. Scarcity, relevance, rotation, and non-repetition govern what becomes visible.

## 9. Gates recurse

The same recursive gate calculus governs campaign situations, Production, Military, Diplomacy, upgrades, Domestic, Network, Ava clarification, and future channels. Do not create channel-specific boolean systems when the shared calculus can express the rule.

## 10. Selection is deterministic and persisted

Eligibility, scoring, tie-breaking, exhaustion, and realization selection must be reproducible from versioned content, campaign state, history, and a stable seed. Once a docket or situation is presented, persist it. State changes during the day must not reroll it unless an explicit invalidation rule exists and is recorded.

## 11. Mechanics and realization are separate

A mechanic has stable identity and effects. A realization supplies context-specific language. Multiple realizations may render the same mechanic. Changing copy must not silently change mechanics. Changing mechanics must not depend on copy matching.

## 12. Input fails closed

Ambiguity resolves toward inspection, clarification, or preparation, never execution. Invalid language returns nearby valid semantic options. No parser fallback may turn an unrecognized phrase into a consequential default.

## 13. Mutations are idempotent and auditable

Every consequential operation requires authorization, a stable command contract, an idempotency key, and an audit record. Preparation and confirmation are distinct operations wherever ambiguity or remote clients are involved.

## 14. Clients are replaceable

No client-specific feature may require duplicating campaign law. New modalities must be added by implementing input and output adapters against the application layer. If adding a client requires changing the simulation, first repair the missing shared contract.

## 15. Parity is tested

Given the same campaign revision and canonical command, every surface must invoke the same handler and produce the same state transition. Tests must compare semantic results, not merely similar text.

## 16. Content is versioned

Gate definitions, nodes, rotations, realization templates, and grammar indices are versioned. Saved campaigns retain enough version information for deterministic replay or explicit migration.

## 17. Discovery is protected

Never expose the full quote corpus, unseen events, future branches, RNG state, eligibility internals, hidden disposition, or content exhaustion order through any client. An adapter cannot reveal more than the player-visible projection returned by the application layer.

## 18. Future-agent rule

Before implementing a new game channel, input modality, generated-content system, or LLM feature, identify:

1. The canonical semantic input.
2. The authoritative handler.
3. The canonical semantic output.
4. The gate and visibility policy.
5. The deterministic fallback.
6. The persistence and idempotency behavior.
7. The parity tests across existing surfaces.

If any answer is “the client handles it,” stop and extract the missing application contract.

## 19. Patch epochs are supergit receipts

Patch work is organized as `docs/epochs/<epoch>/nodes/`, with one node file per
bounded execution unit. The root `feature.md` is the compatibility ledger for
proposed work against the current repository. `DELENDA_QUEST_UBERDOC.md` is the
append-only execution logbook; it records node identity, command, result, and
integrity evidence. These files extend this doctrine; they do not replace it.

Each sealed epoch records:

1. The exact base commit and expected branch.
2. The node and file ownership boundary.
3. Focused tests, full gates, and `git diff --check` results.
4. The completed commit, tree identity, and SHA-256 source manifest when the
   seal is available.
5. Explicit non-goals, especially production deployment, hidden-state access,
   destructive git recovery, and alternate mutation authorities.

“Supergit” means ordinary Git plus these human-readable, content-addressed
receipts. It is not a second version-control system. Never rewrite an epoch
receipt to conceal a failed attempt; append a correction and preserve the
original command/result pair.

Patch nodes may compose several small modules, but no node may create an
unbounded implementation file or a second parser. New language must lower into
an existing typed instruction and pass the existing request validator. Public
contextual language must be derived from the disclosed projection, carry its
visible revision, and never expose hidden adversary actuality.

Cloudflare configuration remains production-owned. Validation and dry runs are
permitted; deployment, shadow mutation, D1 replacement, and secret movement
require an explicit release operation outside a patch epoch.

## 20. Typed operational Ava language protocol

Epoch 003 applies the doctrine to disclosed operational vocabulary and current
maneuver evidence. It adds no semantic owner outside the existing typed
application contracts.

- Resolve one typed owner before adding language. Formation, reserve, route,
  and opening are confirmed owners with static IDs `metric.formation`,
  `metric.reserve`, `metric.route`, and `metric.opening`; all lower through the
  existing `METRIC_EXPLANATION`/`EXPLAIN` path and remain non-actionable.
- Allow only the owner-confirmed disclosed fields. Reserve may expose its
  existing scalar and calculation rows; formation, route, and opening have no
  scalar and must say so. Maneuver evidence may expose only stable ID, owner
  label, exact rationale/presentation text, source section/path/order, and
  provenance.
- Static catalog ownership precedes authored indexing. Normalize lookup keys
  deterministically, preserve exact source bytes, bound free authored spans to
  2–8 tokens, permit the single-token exact typed-label exception, and permit
  a full exact typed title only as a bounded long-title exception.
- Exact authored references lower through `NARRATIVE_REFERENCE` to existing
  read-only `EXPLAIN` with `campaign-synopsis` fallback. Collisions clarify,
  absent declared evidence produces structured unavailability, and action-like
  prefixes or negation never become actions.
- Web, terminal, and native SSH are parity adapters over Nexus. Native SSH
  uses the session core directly and never substitutes HTTP. Renderers show
  evidence and availability, not hidden orders, sealed outcomes, or private
  calculus.

> Any high-information phrase from the current disclosed briefing, typed campaign ontology, declared conceptual catalog, or current maneuver evidence must either compile into a valid typed read-only Ava route or produce a narrow, truthful, evidence-bound clarification. It may never become an action merely because it resembles an authored maneuver, and it may never disappear into generic unrecognized fallback merely because it was expressed in ordinary language.

## 21. Composed operational Ava semantics protocol

Epoch 004 extends the typed operational language with one versioned semantic
model: `ava-operational-semantics/v1`. The model is a read-only projection over
existing authorities, not a new calculus, parser, graph, or mutation channel.

- Canonical calculus evidence comes from the active cognitive decision and
  temporal routes. It may disclose typed inputs, derived values, equations,
  rules, options, alternatives, intervals, provenance, and explicit unavailable
  boundaries. It must exclude hidden inputs, private RNG/seed material, sealed
  tickets, prepared orders, and sealed outcomes.
- Advice composition may name only the compiled decision winner and the
  disclosed objective, priority axes, visible options, alternatives,
  uncertainties, equations, rules, and limitations. A recommendation is not a
  prepared or issued order.
- Pairwise maneuver comparison is evidence-shaped, bounded, and stable-ID
  based. Its dimensions are individually statused; intervals remain intervals;
  and its verdict may describe a tradeoff or insufficient evidence but may not
  select a winner or invent a score.
- Operational relationships have exactly two owners: `CONCEPTS[source].related[]`
  for directed concept edges and `currentSituation.maneuvers[]` for the
  campaign synopsis’s current maneuver joins. Generic graph inference and prose
  association are prohibited. Bounds fail closed without truncation.
- Rendering is a projection of the semantic model. Browser/Nexus,
  terminal-core, and native SSH consume the same result and renderer through
  `runAvaNexusLine`; native SSH remains direct session-core execution and never
  becomes an HTTP proxy.
- Every composed result carries a visible state/content revision and digest.
  Generated corpus tests must cover aliases, current maneuver pairs, relation
  ownership, ambiguity/unavailability, mutation neighbors, hidden-field
  exclusion, and all supported surfaces.

The Epoch 004 release boundary remains local-only: no GitHub push, Cloudflare
deployment, D1 write, shadow mutation, secret movement, or destructive Git
recovery occurs inside the epoch. Cloudflare checks are types and dry-run
validation only.
