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
