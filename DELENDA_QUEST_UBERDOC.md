# DELENDA QUEST UBERDOC / EXECUTION LOGBOOK

Append-only execution receipts for adapted patch epochs. Product law remains in
`SUBSTRATE_DOCTRINE.md`; feature compatibility remains in `feature.md`.

## Epoch identity

- Epoch: `AVA-LANGUAGE-EPOCH-001`
- Handoff: `Epoch 1.md` / `AVA-LANGUAGE-E1..E15`
- Live base: `a54fe7e75e8cb51f6e7bf8064133b7351c449e36`
- Handoff base not found: `9973b8e`
- Branch: `main`
- Deployment policy: local validation only; no push, deploy, shadow mutation,
  D1 replacement, or secret movement
- Receipt mode: one demarcated node entry, then one seal entry

## PRE-EPOCH-00 / preflight receipt

```text
NODE: PRE-EPOCH-00
BASE: a54fe7e75e8cb51f6e7bf8064133b7351c449e36
WORKTREE: clean at start
REPOSITORY: andyfunke/Delenda.Quest
AUTHORITY: current main, existing Ava compiler/Nexus, disclosed projection
RESULT: PASS
EVIDENCE: npm ci; npm test; npm run typecheck; npm run build:ssh-gateway;
          npm run cloudflare:validate; npm run lint; git diff --check
NON-GOALS: no reset, checkout, clean, push, wrangler deploy, or production write
```

## Node receipts

### E1 — contracts

```text
NODE: AVA-LANGUAGE-E1
OUTPUT: app/ava/contextual-language.ts; schema contextual binding/context
RESULT: PASS
BOUNDARY: versioned route/source/facet/evidence contract; no parser or mutation
```

### E2 — normalization and validation

```text
NODE: AVA-LANGUAGE-E2
OUTPUT: NFKD normalized aliases, collision checks, SHA-256 digest sealing,
        request-IR runtime binding validation
RESULT: PASS
```

### E3 — static catalog

```text
NODE: AVA-LANGUAGE-E3
OUTPUT: app/ava/contextual-language-catalog.ts
RESULT: PASS
OWNERS: priority, report, metric, objective routes are explicit and finite
```

### E4 — priority lowering

```text
NODE: AVA-LANGUAGE-E4
OUTPUT: app/ava/contextual-language-priorities.ts
RESULT: PASS
AUTHORITY: StrategicDimension in app/substrate/gates.ts
```

### E5 — campaign target and concepts

```text
NODE: AVA-LANGUAGE-E5
OUTPUT: read-only operational target accessor; grounded concept entries; live
        metric/synopsis entities
RESULT: PASS
```

### E6 — disclosed projection

```text
NODE: AVA-LANGUAGE-E6
OUTPUT: app/ava/contextual-language-projection.ts
RESULT: PASS
BOUNDARY: projectAvaDisclosedState + avaVisibleWorldRevision + content pack
```

### E7 — authored references

```text
NODE: AVA-LANGUAGE-E7
OUTPUT: app/ava/contextual-language-references.ts
RESULT: PASS
BOUNDARY: visible briefing sections only; exact excerpt capped at 280 chars
```

### E8 — Nexus injection

```text
NODE: AVA-LANGUAGE-E8
OUTPUT: visible Nexus context carries the sealed language projection
RESULT: PASS
```

### E9 — exact matcher

```text
NODE: AVA-LANGUAGE-E9
OUTPUT: app/ava/contextual-language-compiler.ts
RESULT: PASS
RULE: normalized exact phrase containment, longest alias wins, ambiguity clarifies
```

### E10 — typed lowering

```text
NODE: AVA-LANGUAGE-E10
OUTPUT: contextual routes lower to existing ADVISE/REPORT/EXPLAIN instructions
RESULT: PASS
```

### E11 — mutation guards

```text
NODE: AVA-LANGUAGE-E11
OUTPUT: contextual compiler placement after unsafe/negated guards; explicit
        protection for stage/prepare/issue/resolve and negated advance language
RESULT: PASS
```

### E12 — renderings

```text
NODE: AVA-LANGUAGE-E12
OUTPUT: contextual priority, report, objective, metric, and authored-reference
        renderings in the existing terminal realization
RESULT: PASS
```

### E13 — live corpus

```text
NODE: AVA-LANGUAGE-E13
OUTPUT: tests/ava-contextual-language.test.mjs
RESULT: PASS
EVIDENCE: 5 contextual tests plus existing substrate suite
```

### E14 — parity

```text
NODE: AVA-LANGUAGE-E14
OUTPUT: web/native terminal/SSH surface parity assertion for contextual read
RESULT: PASS
```

### E15 — proof and documentation

```text
NODE: AVA-LANGUAGE-E15
OUTPUT: feature ledger, epoch nodes, doctrine protocol, source manifest
RESULT: PASS; sealed by the local implementation commit below
```

## Seal receipt

This section is completed after the final local commit. The source manifest
intentionally excludes this append-only logbook and its own file, preventing a
self-referential hash cycle.

```text
EPOCH_COMMIT: 79181aef440c279f57e76f42ad346f7736f8cda2
TREE: 675e7f70aa402deb3cab0f6ff4e183793549c4bd
SOURCE_MANIFEST_SHA256: 52b13a53d752cf5e308ac548c2b8da96423649916e0cddad695a08146815a851
FULL_GATES: PASS
CLOUDFLARE_RELEASE: not run by policy and unavailable in this environment
```

### AVA-LANGUAGE-002-N01 / contextual contract hardening

Base commit: `adfeebb02c22089b2f916e546f53567b6adacbba`

Completed commit: `2feb3af42b4f0960b978b0f791843dd425ddd5d2`

Purpose: Port the packet's contract and normalization boundary onto the
current-main contextual-language authority without introducing the stale
priorities package or a second parser.

Exact procedures executed:

- Reconciled the unreachable `9973b8e` handoff against current `main`.
- Added NFKC contextual surface normalization with punctuation separation and
  preserved internal apostrophes.
- Added provenance-aware route validation, language validation, digest
  validation, and compiler re-exports.
- Added normalization and fail-closed validator regression tests.

Changed files: `app/ava/contextual-language.ts`, `app/ava/compiler.ts`,
`tests/ava-contextual-language.test.mjs`, and the Epoch 002 manifest/preflight
records.

New semantic contracts: contextual entries must have valid route-specific
destinations, non-empty provenance, and a digest matching their visible
state/content revisions.

Tests added: contextual surface normalization and runtime validation.

Validation results: `npm run typecheck` PASS; `bash scripts/test-substrate.sh`
PASS (221/221); `git diff --check` PASS.

Non-goals preserved: no deployment, no D1 or shadow mutation, no GitHub push,
no HTTP SSH substitute, no hidden-state exposure, no second parser.

Known limitations: the packet's `surfaces` and `PriorityAxis` names remain
represented by the live repository's `aliases` and `StrategicDimension`
authorities.

Next node handoff: extend the declared catalog with the packet's missing
read-only aliases and verify collision-free deterministic ownership.

### AVA-LANGUAGE-002-N02 / deterministic contextual catalog

Base commit: `98d23f6b6c34a52a70a429868241328d8e81d772`

Completed commit: `c1c87cf8209f010f7d17b38d5cf847a24d47abc4`

Purpose: Expand the finite contextual vocabulary so the declared packet
surfaces resolve through one static owner while preserving current-main
ontology and priority authorities.

Exact procedures executed:

- Added territory/ground and advance/breakthrough aliases.
- Added front/frontline/kilometer/distance aliases.
- Added adversary, condition, objective, and strategic-advice aliases.
- Added collision and digest-change regression coverage.

Changed files: `app/ava/contextual-language-catalog.ts`,
`tests/ava-contextual-language.test.mjs`, and the Epoch 002 NODE-02 record.

New semantic contracts: normalized static surfaces have exactly one owner;
catalog changes alter the content-addressed contextual language digest.

Tests added: static owner map and digest mutation proof.

Validation results: `npm run typecheck` PASS; `bash scripts/test-substrate.sh`
PASS (222/222); `git diff --check` PASS.

Non-goals preserved: no new parser, no client-local dictionaries, no mutation
routes, no stale `PriorityAxis` package, no deployment or GitHub push.

Known limitations: `advance` lowers to the live `initiative` plus
`territorial_control` dimensions rather than the absent handoff-only `attack`
and `territory` axis names.

Next node handoff: verify the live strategic-dimension lowering remains
deterministic and bounded.

### AVA-LANGUAGE-002-N03 / declared priority lowering

Base commit: `088714ef8b94e7cc7036b0f78769553e15002c7d`

Completed commit: `a897139d5ab66a7ee482e4a47edddf38cc187e1b`

Purpose: Harden contextual priority lowering against malformed or unbounded
axis declarations while retaining the current strategic evaluator authority.

Exact procedures executed:

- Added runtime validation for empty, duplicate, unknown, and overlong axis
  declarations.
- Preserved deterministic canonical order and criteria derivation.
- Accepted the declared surface as a stable lowerer input without using it as
  a second parser or mechanic source.
- Re-exported the current lowerer and validator through `app/ava/compiler.ts`.

Changed files: `app/ava/contextual-language-priorities.ts`,
`app/ava/compiler.ts`, `tests/ava-contextual-language.test.mjs`, and the Epoch
002 NODE-03 record.

New semantic contracts: contextual priority declarations are bounded to four
known unique `StrategicDimension` axes and lower to existing evaluation
criteria.

Tests added: deterministic lowering and bounded-axis rejection tests.

Validation results: `npm run typecheck` PASS; `bash scripts/test-substrate.sh`
PASS (223/223); `git diff --check` PASS.

Non-goals preserved: no stale priorities package, no invented `attack` or
`territory` dimensions, no state mutation, no deployment or GitHub push.

Known limitations: the stale packet's `CompiledPriorityIntent` shape is not
present; the live `AvaDeclaredPriorityFocus` remains the canonical adapter.

Next node handoff: verify objective language is projected only from disclosed
current situation state and binds to a non-action entity.

### AVA-LANGUAGE-002-N04 / disclosed objective projection

Base commit: `be5236835a58571412bc23cd59ea6aad5751f5a8`

Completed commit: `551f625225294e814fbfa64fa63b62de211a0072`

Purpose: Bind objective and authored contextual language to the current
disclosed situation without creating an executable objective entity or
synthetic language when no current situation is persisted.

Exact procedures executed:

- Extended the existing non-action `campaign-synopsis` entity with goal and
  operational-objective aliases.
- Gated current-situation and authored entries on the current persisted day,
  content version, and maneuver presentation.
- Added hidden-field and absent-situation regression coverage.
- Added the existing game-context bundle to the substrate test harness so the
  projection test runs through the same entity owner as production.

Changed files: `app/ava/game-context.ts`,
`app/ava/contextual-language-projection.ts`, `scripts/test-substrate.sh`,
`tests/ava-contextual-language.test.mjs`, and the Epoch 002 NODE-04 record.

New semantic contracts: objective language is read-only, state-bound, and
visible only when the current persisted situation exists; the entity carries
no action payload.

Tests added: non-action objective projection, static-only missing-situation
projection, and hidden-field exclusion.

Validation results: `npm run typecheck` PASS; `bash scripts/test-substrate.sh`
PASS (224/224); `git diff --check` PASS.

Non-goals preserved: no target-table duplication, no hidden adversary data, no
state mutation, no deployment or GitHub push.

Known limitations: the live semantic entity remains `campaign-synopsis`
rather than creating the stale packet's absent `campaign-objective` ID.

Next node handoff: make exact contextual matching and route lowering return
stable instruction/clarification outcomes with contextual trace identity.

### AVA-LANGUAGE-002-N05 / exact contextual matcher and route lowerer

Base commit: `319bf6e44c7d111c81e3f852a364741e1a6717bb`

Completed commit: `5d986696359946aac2319730a1817f7b3f4ca210`

Purpose: Make declared contextual language exact, deterministic, typed, and
traceable while preserving the existing compiler and request IR.

Exact procedures executed:

- Replaced contextual substring matching with exact normalized-surface
  matching.
- Added structured unavailable-destination clarification.
- Changed contextual source/concept provenance and resolution IDs to declared
  entry ownership.
- Changed successful contextual trace rules to
  `CONTEXTUAL_LANGUAGE:<entry-id>` and retained exact-index proof.
- Extended the live corpus and negative near-neighbor tests.

Changed files: `app/ava/contextual-language-compiler.ts`,
`app/ava/compiler.ts`, `tests/ava-contextual-language.test.mjs`, and the Epoch
002 NODE-05 record.

New semantic contracts: contextual matches are exact after normalization;
unavailable visible destinations clarify; contextual success cannot produce an
unknown semantic subject.

Tests added: packet corpus route assertions, trace identity, exact-index
assertions, and near-neighbor exclusion.

Validation results: `npm run typecheck` PASS; `bash scripts/test-substrate.sh`
PASS (224/224); `git diff --check` PASS.

Non-goals preserved: no fuzzy matching, embeddings, LLM calls, second parser,
mutation, deployment, or GitHub push.

Known limitations: the live matcher retains bounded legacy compiler guards
before contextual matching so consequential prefixes cannot become advice.

Next node handoff: prove all declared phrases through the real Nexus path and
assert state, plan, action, and day immutability.

### AVA-LANGUAGE-002-N06 / Nexus vertical slice and mutation proof

Base commit: `da8077826356704eb48a81ccfdd9ca00e41ca1ed`

Completed commit: `3617a1a9da947e88164a3dabd5ce539905a32b46`

Purpose: Prove the complete declared contextual corpus through the existing
Nexus compiler boundary and prove that contextual reads cannot mutate game or
terminal planning state.

Exact procedures executed:

- Exercised territory/advance advice, front and kilometer explanations,
  adversary/condition/loss reports, objective explanation, and strategy advice
  through `runAvaNexusLine`.
- Asserted typed instruction kinds, routes, topics, entities, and stable
  `CONTEXTUAL_LANGUAGE:<entry-id>` traces for every corpus phrase.
- Snapshotted state, actions, day, decisions, prepared orders, and terminal
  plan for every read and required deep equality after compilation.
- Exercised consequential prefixes, negation, confirmation, and front
  resolution neighbors to ensure they cannot lower into contextual advice.

Changed files: `tests/ava-contextual-language.test.mjs` and the Epoch 002
NODE-06 record.

New semantic contracts: the real Nexus is the single contextual route;
contextual reads are typed, exact, state-bound, and non-mutating across web,
terminal, and SSH parity paths.

Tests added: live corpus vertical slice and consequential/negated neighbor
regression tests.

Validation results: `npm run typecheck` PASS; `bash scripts/test-substrate.sh`
PASS (226/226); `git diff --check` PASS.

Non-goals preserved: no browser or adapter parser, no HTTP SSH path, no D1 or
shadow mutation, no deployment, and no GitHub push.

Known limitations: Cloudflare authentication remains unavailable in this
workspace; release validation is local and dry-run only.

Next node handoff: run the full repository gates, generate the epoch source
manifest, and seal the local epoch receipt.

### EPOCH-002-SEAL / contextual language hardening

Base commit: `adfeebb02c22089b2f916e546f53567b6adacbba`

Completed seal commit: `4bad3c0c0fc6b2928ea35f40b1526e6031e772f9`

Seal tree: `e63490ad878ed062de278ab082df3be16a310475`

Purpose: Close the attached next batch as a current-main adaptation with
bounded contextual language, exact typed lowering, Nexus mutation proof, and
content-addressed execution evidence.

Exact procedures executed:

- Reconciled the stale handoff base and package assumptions against the live
  repository and preserved current authorities instead of rewinding.
- Sealed Nodes 01–06 in order; each node has a dedicated record, focused
  validation, implementation commit, and append-only receipt commit.
- Ran `npm test`, typecheck, application build, native SSH gateway build,
  Cloudflare type generation/check, local Wrangler dry run, lint, and
  `git diff --check`.
- Generated and verified
  `docs/epochs/epoch-002-contextual-language-hardening/integrity/source-manifest.sha256`.

Final validation: full repository suite PASS; contextual substrate PASS
(226/226); typecheck PASS; build PASS; SSH build PASS; Cloudflare types and
dry run PASS; lint PASS with 0 errors and 23 warnings; diff check PASS.

Manifest digest:
`08127d66b393c49deeae303731a45ba316297721f2826871546d83358742fd23`.

Release boundary: no `git push`, Cloudflare deployment, D1 write, shadow
mutation, HTTP SSH path, or destructive Git recovery was performed. GitHub
connectivity was read-only for reconciliation; Cloudflare authentication was
unavailable, so only local validation and dry run were executed.

Result: Epoch 002 is locally sealed and the worktree is clean. The next
authorized action, if desired, is an explicit release/push operation outside
this patch epoch.

### AVA-LANGUAGE-003-N15 / typed operational owner boundary

Base commit: `3d04095961a40c72363adfa2d546ff2ec0187b79`

Completed commit: `16ad7c0`

Purpose: Begin Epoch 003 by confirming one disclosed, non-action owner for
formation, reserve, route, and opening and recording the stable current
maneuver join without creating a second semantic route.

Exact procedures executed: owner inspection, current-state disclosure check,
static route/facet check, action-field check, stable maneuver identity check,
and native SSH session-core availability check.

Validation: focused Ava baseline PASS; substrate corpus PASS (231/231);
typecheck PASS; no deployment, push, D1, shadow, or HTTP SSH path.

Next node handoff: project authored maneuver evidence with exact source text,
source order, evidence kind, identity, and provenance.

### AVA-LANGUAGE-003-N16 / authored maneuver evidence projection

Base commit: `16ad7c0`

Completed commit: `4a5a063`

Purpose: Bind current disclosed maneuver labels, rationales, and presentations
to stable maneuver identities and content-addressed evidence without widening
the public state projection.

Exact procedures executed: stable-ID join, source-order projection, exact
evidence copy, provenance preservation, hidden-field exclusion, digest
coverage, and no-mutation verification.

Validation: substrate corpus PASS (231/231); typecheck PASS; diff check PASS.

Next node handoff: compile exact authored maneuver spans through the existing
typed read-only route, with static ownership and availability safeguards.

### AVA-LANGUAGE-003-N17 / authored reference indexing and lowering

Base commit: `4a5a063`

Completed commit: `ede0075`

Purpose: Compile exact current maneuver language into typed, evidence-bound
read routes while preserving static ownership, ambiguity, and truthful
unavailability.

Exact procedures executed: bounded span indexing, repository normalization,
static precedence, same-identity merge, identity collision clarification,
declared unavailable reference handling, trace enrichment, request validation,
and consequential-neighbor safeguards.

Validation: substrate corpus PASS (231/231); typecheck PASS; diff check PASS.

Next node handoff: render expanded evidence and explicit availability through
the canonical terminal/Nexus presentation.

### AVA-LANGUAGE-003-N18 / typed operational rendering

Base commit: `2251e34`

Completed commit: `2bec345`

Purpose: Present exact authored maneuver evidence and truthful typed
operational availability through the existing terminal renderer.

Exact procedures executed: typed missing-value rendering, maneuver reference
heading/identity/kind/provenance output, exact excerpt preservation, and
authored-language status boundary.

Validation: substrate corpus PASS (231/231); typecheck PASS; diff check PASS.

Next node handoff: verify canonical web, terminal, and native SSH semantic and
proof parity without adapter-local parsers.

### AVA-LANGUAGE-003-N19 / web, terminal, and native SSH parity

Base commit: `2b0a547`

Completed commit: `f10f465`

Command/result: ran `npm run typecheck` and
`bash scripts/test-substrate.sh`; both passed, with the focused substrate
corpus green at 232/232. The expanded authored maneuver corpus was exercised
through web Nexus, terminal-core, and native SSH session-core paths. Native
SSH invoked `executeNativeSshGatewayLine` directly and did not use HTTP.

Integrity: action-prefixed and negated maneuver references remained
fail-closed; static aliases retained precedence; ambiguous identities produced
structured clarification; unavailable declared references remained truthful;
rendered authored evidence and cognitive proof matched across surfaces. No
state, plan, day, decision, prepared order, D1, shadow environment, or remote
ref was changed.

Next node handoff: exhaustive generated corpus proof, canonical doctrine and
feature-ledger documentation, full repository gates, manifest, and final
receipt.

### AVA-LANGUAGE-003-N20 / exhaustive typed operational Ava proof

Base commit: `85cfe3b`

Completed commit: `c41dc9b`

Command/result: generated static and authored corpus tests, then ran `npm
test`, `npm run typecheck`, `npm run build:ssh-gateway`, `npm run
cloudflare:types`, `npm run cloudflare:validate`, `npm run lint`, and `git
diff --check`. All gates passed: substrate 234/234, full repository suites
green, Cloudflare types/dry-run green, and lint 0 errors with 23 warnings.

Integrity: static owners retained precedence; current maneuver evidence kept
stable identity, exact source, section, order, and provenance; same-identity
phrases merged evidence; distinct identities clarified; absent declared
references were unavailable rather than generic; and web/terminal/native SSH
reads remained non-mutating. The native SSH path was the session core, not
HTTP. The SHA-256 source manifest is generated and verified in the following
seal commit.

Release boundary: no GitHub push, Cloudflare deployment, D1 write, shadow
mutation, secret movement, HTTP SSH path, or destructive Git recovery.

### EPOCH-003-SEAL / typed operational Ava language

Implementation seal: `c41dc9b` (`Prove typed operational Ava language
coverage`)

Receipt seals: NODE-19 `85cfe3b`; NODE-20 `786da93`.

Integrity result: `docs/epochs/epoch-003-typed-operational-ava-language/integrity/source-manifest.sha256`
was regenerated for the final documentation bytes and verified with
`sha256sum -c`; `git diff --check` passed. The epoch corpus is 234/234 and all
full repository, type, build, SSH, Cloudflare dry-run, and lint gates are
green. The next release boundary remains explicit: no push or deployment was
performed.

Next authorized scope: richer typed advice composition, maneuver comparison,
and multi-entity explanations in a subsequent epoch.

### AVA-SEMANTICS-N22 / Expose canonical Ava calculus evidence

Base commit: `a473e3d3720e3c0dfe0eb3c83db63db2144eab77`

Completed commit: `04927d6`

Purpose: Project the active disclosed cognitive decision and temporal authorities into a typed, read-only operational semantics contract.

Exact procedures executed: inspected the live decision and temporal owners; added versioned operational contracts and canonical projections; wired the result through Nexus, terminal, and native SSH session-core surfaces; preserved command/directive boundaries; and added deterministic hidden-state and no-mutation checks.

Changed files: `app/ava/operational-contracts.ts`, `app/ava/operational-calculus.ts`, `app/ava/operational-semantics.ts`, `app/ava/request-ir.ts`, `app/ava/terminal.ts`, `app/ava/nexus.ts`, `packages/terminal-core/src/session.ts`, `packages/ssh-gateway/src/session-core.ts`, `scripts/test-substrate.sh`, `tests/ava-operational-semantics.test.mjs`, `tests/ssh-gateway-session.test.mjs`, and the Epoch 004 records.

New semantic contracts: `AvaOperationalSemanticResult` carries disclosed inputs, derived values, equations, rules, options, alternatives, uncertainties, provenance, explicit unavailable boundaries, read-only authority, and a deterministic digest. It exposes the active `delenda-cognitive-decision` and `ava-temporal-disclosed-projection` identities without reviving the quarantined legacy calculus.

Tests added: deterministic calculus/advice evidence, temporal projection evidence, state-preservation checks, hidden-field checks, and native SSH semantic pass-through checks.

Validation results: typecheck PASS; focused operational corpus 3/3 PASS; native SSH session tests 3/3 PASS; `git diff --check` PASS.

Non-goals preserved: no fuzzy or inferred semantics, second parser, mutation path, RNG/seed/private state, sealed outcome, deployment, push, D1 write, shadow mutation, or HTTP SSH path.

Known limitations: richer advice, pairwise comparisons, relationships, and terminal rendering remain the next authorized nodes.

Next node handoff: NODE-23 / compose typed Ava advice through canonical calculus.

### AVA-SEMANTICS-N23 / Compose typed Ava advice through canonical calculus

Base commit: `42e8f02`

Completed commit: `0656460`

Purpose: Compose a typed, read-only advice result from the active canonical calculus, the persisted situation, and the semantic query’s declared priorities.

Exact procedures executed: bound the recommendation to the disclosed `decision.winnerId` and ranking; exposed objective, target, sector, situation bands, priority axes, visible inputs, alternatives, uncertainties, equations, rules, and unavailable coupled-order evidence; rejected a missing canonical winner; and added deterministic state-preservation and hidden-field assertions.

Changed files: `app/ava/operational-contracts.ts`, `app/ava/operational-calculus.ts`, `tests/ava-operational-semantics.test.mjs`, and the NODE-23 records.

New semantic contracts: `AvaOperationalAdvice.recommendation` is authoritative only as a disclosed compiled winner, while equations and rules remain exact references to the canonical calculus.

Tests added: recommendation authority, objective/priority composition, calculus-reference identity, no-mutation, and hidden-field checks.

Validation results: typecheck PASS; complete substrate corpus 237/237 PASS; `git diff --check` PASS.

Non-goals preserved: no pairwise scoring or winner invention, second parser/calculus, fuzzy or inferred relation, prepared order, mutation route, private/random/sealed state, push, deployment, D1 write, shadow mutation, or HTTP SSH path.

Known limitations: pairwise comparison, relationship projection, and shared rendering are the next authorized nodes.

Next node handoff: NODE-24 / compile typed Ava maneuver comparisons.

### AVA-SEMANTICS-N24 / Compile typed Ava maneuver comparisons

Base commit: `57def89`

Completed commit: `17dac16`

Purpose: Compile a bounded, read-only comparison between two visible current maneuvers using stable identities and existing game/projection authorities.

Exact procedures executed: joined stable maneuver IDs to the current situation and presentation; projected execution confidence through `explainManeuverChance`; compared only actual maneuver fields; reused pure action and envelope projection for disclosed ground movement; retained interval uncertainty and explicit unavailable evidence; and added orientation/no-winner/state-preservation/hidden-field checks.

Changed files: `app/ava/operational-comparison.ts`, `app/ava/operational-semantics.ts`, `tests/ava-operational-semantics.test.mjs`, and the NODE-24 records.

New semantic contracts: `AvaOperationalComparison` exposes stable identities, shared context, seven bounded dimensions, explicit statuses, evidence-shaped verdicts, provenance, limitations, and a digest, with no winner or score field.

Tests added: current-handle comparison, direct reversed identity comparison, dimension-status coverage, no-winner, state-preservation, and hidden/private field checks.

Validation results: typecheck PASS; complete substrate corpus 238/238 PASS; `git diff --check` PASS.

Non-goals preserved: no replacement parser/calculus, inferred relation, pairwise winner, sealed outcome, private resolution ticket/RNG, mutation route, push, deployment, D1 write, shadow mutation, or HTTP SSH path.

Known limitations: compiler-owned relationships and shared rendering remain the next authorized nodes.

Next node handoff: NODE-25 / project typed operational relationships.

### AVA-SEMANTICS-N25 / Project typed Ava operational relationships

Base commit: `6ada48a`

Completed commit: `6275e2d`

Purpose: Project only the repository’s two confirmed operational relationship owners into a bounded, directed, read-only model.

Exact procedures executed: read `CONCEPTS[source].related[]` in source order; joined `campaign-synopsis` to `currentSituation.maneuvers[]` by stable ID; added join keys, visible revision, provenance, explicit bounds, and unavailable evidence; attached the model to read-only `EXPLAIN`; and added direct owner/digest/state-preservation tests.

Changed files: `app/ava/operational-relationships.ts`, `app/ava/operational-semantics.ts`, `tests/ava-operational-semantics.test.mjs`, and the NODE-25 records.

New semantic contracts: `AvaOperationalRelationships` contains only `RELATED_CONCEPT` and `CURRENT_VISIBLE_MANEUVER` edges, with `SOURCE_TO_TARGET` direction, `readOnly: true`, bounds, and a digest.

Tests added: concept-edge ownership, campaign-synopsis maneuver joins, direction/join-key checks, deterministic digest coverage, and no-mutation checks.

Validation results: typecheck PASS; focused operational corpus 5/5 PASS; complete substrate corpus 239/239 PASS; `git diff --check` PASS.

Non-goals preserved: no generic graph, prose/inferred relation, hidden-state relation, second parser, mutation path, push, deployment, D1 write, shadow mutation, or HTTP SSH path.

Known limitations: shared presentation and cross-surface parity are the next authorized nodes.

Next node handoff: NODE-26 / render composed operational semantics.

### AVA-SEMANTICS-N26 / Render composed Ava operational semantics

Base commit: `73dc226`

Completed commit: `d021d9b`

Purpose: Render the composed operational semantic model through one canonical presentation boundary and preserve browser/Nexus, terminal-core, and native SSH parity.

Exact procedures executed: added a typed renderer for advice, forecast, comparison, relationships, limitations, revisions, and digest; appended it after existing realized answers; updated terminal/result presentation fields; and exercised advice, forecast, comparison, and explanation through all three surfaces.

Changed files: `app/ava/operational-render.ts`, `app/ava/nexus.ts`, `app/ava/operational-semantics.ts`, `tests/ava-operational-semantics.test.mjs`, and the NODE-26 records.

New semantic contracts: `renderAvaOperationalSemantics` is the sole text projection for `AvaOperationalSemanticResult`; pairwise output explicitly states no winner and relationship output states declared relations only.

Tests added: renderer coverage, hidden/private field checks, no-winner checks, and browser/terminal/native SSH byte-parity over four read operations.

Validation results: typecheck PASS; focused operational corpus 7/7 PASS; `git diff --check` PASS.

Non-goals preserved: no surface-specific semantic reconstruction, second parser, inferred relation, sealed outcome, mutation route, push, deployment, D1 write, shadow mutation, or HTTP SSH path.

Known limitations: generated proof corpus and final repository seal remain NODE-27.

Next node handoff: NODE-27 / prove composed advice and operational comparison coverage.

### AVA-SEMANTICS-N27 / Prove composed advice and operational comparison coverage

Base commit: `a473e3d3720e3c0dfe0eb3c83db63db2144eab77`

Completed commits: `51863f0` (`Prove composed advice and operational comparison coverage`); `33b30d4` (`Repair composed semantics parity boundaries`)

Purpose: prove the composed operational semantic model across its complete
declared corpus and preserve the disclosure, mutation, and surface-parity
boundaries established by NODE-22 through NODE-26.

Exact procedures executed: generated assertions from every canonical
`CONCEPTS.related[]` owner; generated pairwise comparisons for every distinct
current visible maneuver; generated advice aliases and guarded-neighbor cases;
exercised declared relationship bounds; checked stable identity, seven
dimension IDs, no-winner, no-hidden-field, no-mutation, unavailability, and
browser/Nexus-terminal/native-SSH parity; repaired cognitive reads to project
the disclosed state; excluded generic grammar defaults from authored-evidence
IDs; updated the activation text-digest contract; and ran the full repository
and Cloudflare dry-run gates.

Changed files: the Epoch 004 operational contract, calculus, semantics,
comparison, relationship, and renderer modules; `app/ava/nexus.ts`;
`packages/terminal-core/src/session.ts`;
`packages/ssh-gateway/src/session-core.ts`; `scripts/test-substrate.sh`;
operational and generated semantic tests; the rendered activation contract;
the Epoch 004 node/receipt records; `feature.md`; `SUBSTRATE_DOCTRINE.md`;
and this append-only logbook.

New semantic contracts: every composed result is versioned as
`ava-operational-semantics/v1`, read-only, revision-bound, and SHA-256 sealed.
Advice remains bound to the compiled decision winner; comparison exposes
bounded evidence without a winner; relationships contain only declared concept
edges and current maneuver joins; and exact contextual evidence IDs are
distinct from generic grammar provenance.

Tests added: generated relation-owner, maneuver-pair, advice-alias,
guarded-neighbor, bound-failure, hidden-field, no-mutation, and three-surface
parity coverage, alongside the deterministic renderer and typed/text semantic
identity checks.

Validation results: full `npm test` passes rendered/plumbing 30/30, rule
suites 40+11+6+1+8+6+5, Ava 32/32, and substrate 245/245. Typecheck,
production build, native SSH build, Wrangler types check, Cloudflare dry-run,
and `git diff --check` pass. Lint passes with 0 errors and 23 pre-existing
warnings. The SHA-256 source manifest verifies all listed files.

Non-goals preserved: no second parser or calculus; no generic graph or inferred
relation; no hidden adversary, private RNG, sealed outcome, prepared order, or
mutation exposure; no D1 write, shadow mutation, secret movement, HTTP SSH
path, GitHub push, or Cloudflare deployment.

Known limitations: comparison remains evidence-shaped and does not select a
winner; relationship projection remains limited to the two compiler-owned
sources; and Cloudflare validation is local types/check/dry-run only.

Next node handoff: begin any future epoch with a fresh owner-first preflight;
no further NODE-27 implementation is authorized by this receipt.

## Epoch 009 / NODE-00 — preflight stop (2026-08-03)

Node identity: `docs/epochs/epoch-009-campaign-contentgen-preflight/nodes/NODE-00-preflight.md`

| Command | Result |
|---|---|
| `git cat-file -t fd4b783` | FAIL — `fatal: Not a valid object name fd4b783` |
| `git merge-base --is-ancestor 0e4daf7266cd1e3f365adc47a4983f76779633e5 origin/main` | PASS |
| `npm run test:ava-content-quality` | PASS 4/4 |
| `npm run test:ava-content-quality-epoch-008` | PASS 3/3 |
| `npm run typecheck` | PASS |
| `git diff --check` | PASS |

Stop: specification base `fd4b783` missing (§0.5). Later Epoch 009 nodes not started. Live tips recorded: `origin/main`=`a0c62de`, `origin/codex/epoch-006`=`b950015`. Operator must amend or restore the base before NODE-00 clears. No push, deploy, secret, or D1 change.

## Epoch 009 seal — historical repair and compatibility freeze (2026-08-03)

Node identity: `docs/epochs/epoch-009-campaign-contentgen-preflight/` (NODE-00…06)

Operator clearance: ignore sealed `codex/epoch-006` / `fd4b783` header artifact; execute against live `main` containing Epoch 008 `0e4daf7`.

| Command | Result |
|---|---|
| `npm run test:ava-content-quality` | PASS 4/4 |
| `npm run test:ava-content-quality-epoch-008` | PASS 3/3 |
| `npm run typecheck` | PASS |
| `npm run validate:epoch-009` | PASS (9 epoch-008 files; 30 protected entries) |
| `git diff --check` | PASS |

Exit artifacts: Epoch 008 append-only amendment; immutability manifest; authority map; R01–R41 + §1.2 requirement trace; prose/turnover inventory (automatic client-driven claim/redeem present; no server cron). No runtime source changes. No production deploy.

## Epoch 009 — push / PR delivery (2026-08-03)

| Command / action | Result |
|---|---|
| `git push -u origin cursor/epoch-009-campaign-contentgen-preflight-88d3` | PASS — remote branch tracks seal tip |
| Draft PR #8 vs `main` | https://github.com/andyfunke/Delenda.Quest/pull/8 OPEN (draft) |

Documentation updated to record pushed branch + PR identity. Production deploy still not authorized. Epoch 010 not started.

## Epoch 010 seal — Contentgen doctrine and chord contracts (2026-08-03)

| Command | Result |
|---|---|
| `npm run test:contentgen-contracts` | PASS 9/9 |
| `npx tsc --noEmit` | PASS |
| `git diff --check` | PASS |

Exit: `contentgen-contract/v1` in `packages/contentgen-contracts/`; `SUBSTRATE_DOCTRINE.md` §21; schemas/fixtures under `content-quality/`. No campaign content generated. No second doctrine file.

## Epoch 011 seal — cross-medium enumeration (2026-08-03)

| Command | Result |
|---|---|
| `npm run contentgen:enumerate -- --seed 7` | PASS 68 candidates / 0 failures |
| `npm run validate:contentgen-enumerate` | PASS byteIdentical=true |
| `npm run test:ava-content-quality` | PASS 4/4 |

Inventory fixture names Epoch 009 producers. Ava legacy CLI preserved via adapter.

## Epoch 012 seal — decompiler matrix and hard prisms (2026-08-03)

| Command | Result |
|---|---|
| `npm run contentgen:decompile` | PASS feature matrix + prism verdicts + blast report |
| `npm run contentgen:prisms` | PASS |
| `npm run validate:contentgen-prisms` | PASS 10/10 mutation fixtures |

P0–P4 per §4.4; dual authority lints A/B share no helpers beyond schemas.

## Epoch 013 seal — corpus and deterministic RAG (2026-08-03)

| Command | Result |
|---|---|
| `npm run contentgen:corpus` | PASS versioned corpus + lineage + index |
| `npm run test:contentgen-corpus` | PASS 7/7 |

Epoch 008 IDs preserved; held-out excluded from retrieval; novelty thresholds §4.9.

## Epoch 014 seal — review persistence and admin mutation (2026-08-03)

| Command | Result |
|---|---|
| `npm run test:contentgen-service` | PASS 8/8 |
| `npx tsc --noEmit` | PASS |

Migration `0015_contentgen_review.sql` on existing D1 binding only. Exports use opaque receipt IDs.

## Release — epochs 009–014 to main / Workers Builds (2026-08-03)

| Action | Result |
|---|---|
| Merge `cursor/epoch-010-014-contentgen-88d3` → `main` | PASS (`9bbf606`) |
| `git push origin main` | PASS — triggers Cloudflare Workers Builds (`npm run build` + `npx wrangler deploy`) |
| Direct `wrangler deploy` from this agent | SKIPPED — no Wrangler/Cloudflare API auth in environment |

Production path remains Workers Builds on `main` / `delenda.quest`. Migration `0015_contentgen_review.sql` ships with the Worker; apply to production D1 via the usual Wrangler/migrations path owned by the deploy pipeline.

## Release follow-up — Production contract gate (2026-08-03)

`main` @ `9bbf606`/`363a603` pushed successfully. GitHub Actions:

| Workflow | Result |
|---|---|
| Production contract | FAIL — pre-existing `ava-relevance-engine` expected 14 realizations, live graph has 15 |
| Deploy SSH gateway | FAIL — pre-existing Ava Nexus assertion drift (FIELD NOTE / COMPARE capability) |

Direct `wrangler deploy` unavailable (no auth). Cloudflare Workers Builds remains the hosting deploy path for `main`. Follow-up commit updates realizationCount expectation to 15.

## Epoch 015 seal — Appified Contentgen Lab (2026-08-03)

| Command | Result |
|---|---|
| `npm run test:contentgen-lab` | PASS 6/6 |
| `npx tsc --noEmit` | PASS |
| `git diff --check` | PASS |

Exit: `/admin/contentgen` lab UI + `/api/admin/contentgen` adapters; §4.14 sampler; NONE-mode (no AI provenance); D1 flush/hydrate adapters. No auto-promote. Ordinary accounts fail closed.

## Epoch 016 seal — ContentJudge + curious queue (2026-08-03)

| Command | Result |
|---|---|
| `npm run test:contentgen-judge` | PASS 9/9 |
| `npm run contentgen:judge -- --judge NONE` | PASS |

Exit: provider-neutral judge contracts; frozen Ava checklist; §4.9 queue; NONE mode. Non-NONE not operational (provider gate).

## Epoch 017 seal — deterministic self-training (2026-08-03)

| Command | Result |
|---|---|
| `npm run test:contentgen-train` | PASS 6/6 |
| `npm run contentgen:train` / `contentgen:evaluate` | PASS |

Exit: trainer (§4.5), independent evaluator, PROPOSED prism mining, audit-slot helper.

## Epoch 018 seal — policy promotion verifier (2026-08-03)

| Command | Result |
|---|---|
| `npm run test:contentgen-policy` | PASS 3/3 |
| `npm run contentgen:verify-policy` | PASS on promoted v1 manifest |

Exit: promotion gate (§4.9), Git-versioned `quality-policy.v1.json`, mutation fail-closed.

## Epoch 019 seal — campaign metastratum + pacing tables (2026-08-03)

| Command | Result |
|---|---|
| `npm run campaign:precompute-tables` | PASS |
| `npm run validate:campaign-tables` | PASS |
| `npm run test:campaign-metastratum-contracts` | PASS 5/5 |

Exit: §4.10 types, ContentLink, TerminalRisk registry metadata, three checked-in ppm tables, restore defaults, stableHash consolidation.

## Epoch 020 seal — narrative itinerary / scheduler (2026-08-03)

| Command | Result |
|---|---|
| `npm run test:campaign-metastratum` | PASS |
| `npm run validate:campaign-itineraries -- --seeds 10000` | PASS |

§4.12(i) scheduler; R05 three completed Romantic instances; strict heat alternation.

## Epoch 021 seal — multi-day operations (2026-08-03)

| Command | Result |
|---|---|
| `npm run test:campaign-operations` | PASS 5/5 |

ActiveOperation lifecycle, MainThreadPrompt union, legacy one-day migration path.
