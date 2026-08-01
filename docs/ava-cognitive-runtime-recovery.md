# Ava cognitive runtime recovery ledger

This file is the durable, append-only recovery ledger for the Ava cognitive
runtime. GitHub branch `agent/ava-cognitive-runtime` is the authoritative
reconstruction branch. A module is not preserved merely because a local commit
was reported: each completed epoch must be committed and pushed to this branch
before the next epoch begins.

## Savepoint 0 — surviving base

- Date: 2026-07-31
- Surviving commit: `4f2bded9b0e309e67bc0dae90692955065e088eb`
- Commit subject: `Merge Ava Nexus and semantic grammar compiler (#6)`
- Remote base: `origin/main`
- Recovery branch: `agent/ava-cognitive-runtime`
- State: durable branch anchor created from the last surviving compiler/Nexus
  checkpoint
- Production deployment: not part of this savepoint

The former branch with the same name existed only in a pruned local workspace.
Its commit objects are absent from the live repository and all remote refs. The
hashes below are historical epoch identifiers recorded by the work log, not
reachable Git objects and not evidence that their source has been recovered.

## Lost epoch inventory

| Historical checkpoint | Recorded module | Recorded verification |
|---|---|---|
| `345fdfe` | Dependencies 1–3; cognitive-runtime base above the surviving compiler/Nexus substrate | Complete production gate reported green |
| `c1df6cf` | Canonical Resolved Semantic Tree and legacy lowering boundary | 104 substrate tests; 4,800 whole-IR equality proof; full text campaign |
| `aecf0ca` | Typed primitive cognitive operator algebra for all 55 operators | 111 substrate tests; full production and Cloudflare gates |
| `b84c1ae` | Canonical proof and explanation graph across operators, advisory, Nexus, Terminal, SSH, and MCP | 117 substrate tests; cross-surface proof identity and adversarial proof checks |
| `bb0256f` | Closed constraint and feasibility engine | 124 substrate tests; repair replay and all feasibility outcomes |
| `da50c45` | Temporal engine | 132 substrate tests; interval, schedule, deadline, freshness, and forecast-envelope proofs |
| `f041cb8` | Causal and counterfactual engine | 141 substrate tests; structural intervention and counterfactual replay proofs |
| `e223479` | Epistemic engine | 153 substrate tests; evidence, belief revision, estimation, and uncertainty proofs |
| `5dbbfdc` | Decision and tradeoff engine | 163 substrate tests; feasibility replay, utility, regret, Pareto, falsification, and sensitivity proofs |
| `d6179c8` | Planning and resource-allocation engine | 171 substrate tests; dependency scheduling, reservations, repairs, contingencies, and no-mutation boundary |

All ten historical checkpoints were reported as passing TypeScript, production
build, lint with zero errors, Cloudflare type/configuration validation, and a
Wrangler dry run preserving the production `delenda-quest` D1 binding. Those
reports define reconstruction acceptance targets. They do not replace rerunning
the gates against recovered source.

## Reconstruction order

1. Recover and explicitly enumerate dependencies 1–3 from the surviving
   compiler/Nexus substrate and retained work record.
2. Rebuild semantic resolution.
3. Rebuild the primitive operator algebra.
4. Rebuild the proof and explanation graph.
5. Rebuild constraints and feasibility.
6. Rebuild temporal reasoning.
7. Rebuild causal and counterfactual reasoning.
8. Rebuild epistemic reasoning.
9. Rebuild decision and tradeoff reasoning.
10. Rebuild planning and resource allocation.
11. Continue with the actor, faction, and adversary-model engine only after the
    recovered stack is present and verified.

Each reconstruction epoch must preserve the existing OG Ava, native SSH,
campaign authority, D1 binding, legacy language behavior, and the finite
compiler-declared mechanics doctrine. No historical checkpoint is to be marked
recovered until its code and current-source acceptance gates exist on this
branch.

## Durability protocol

For every subsequent epoch:

1. Start from the last pushed commit on `origin/agent/ava-cognitive-runtime`.
2. Keep the module diff bounded and record its acceptance contract here.
3. Run the relevant focused tests plus the complete production and Cloudflare
   gates.
4. Commit the exact passing source.
5. Push the commit before beginning the next module.
6. Verify the remote branch resolves to the committed object.
7. Append the new savepoint below; never rewrite an older entry to make later
   work appear complete.

## Savepoint 1 — dependencies 1–3 reconstructed

- Date: 2026-07-31
- Historical checkpoint represented: `345fdfe`
- State: reconstructed and verified from the surviving compiler/Nexus base
- Scope:
  - closed, versioned cognitive domain compiler and manifest
  - typed campaign world snapshots with revision, provenance, uncertainty,
    lineage, visibility, and authoritative GameState projection
  - canonical Surface AST with lexeme spans, clause ownership, deterministic
    concept activation, and compiler-bounded suggestion validation
- Acceptance:
  - complete production suite passed
  - all 4,800 whole-IR language equality proofs passed
  - complete Ava text-only campaign passed
  - 78/78 substrate contracts passed
  - TypeScript and production build passed
  - lint passed with zero errors and no new warnings
  - Cloudflare types and Wrangler dry run passed with production D1 preserved
- Production deployment: blocked pending restoration of Cloudflare
  authentication; source is safe to deploy without configuration changes

### Production promotion note

- Savepoint 1 was subsequently fast-forwarded to `main` at remote commit
  `7ef9897` through the connected GitHub authority.
- Cloudflare production remained healthy across all four live-entry contracts.
- The repository-owned Cloudflare Build path is the production promotion
  authority for subsequent reconstruction epochs.

## Savepoint 2 — canonical semantic resolution reconstructed

- Date: 2026-07-31
- Historical checkpoint represented: `c1df6cf`
- State: reconstructed and verified atop Savepoint 1
- Scope:
  - canonical Resolved Semantic Tree with typed nodes for every query field
  - compiler, source-clause, discourse, and visible-world provenance ownership
  - closed dynamic campaign-entity bindings without widening the domain spec
  - exact lowering back to the complete legacy `AvaSemanticQuery`
  - fail-closed source/world/tree digests, hidden facts, open concepts, and stale
    world revisions
- Acceptance:
  - complete production suite passed
  - all 4,800 whole-IR language equality proofs passed
  - complete Ava text-only campaign passed
  - 85/85 substrate contracts passed
  - TypeScript, production build, lint, Cloudflare types, and Wrangler dry run
    passed with the production D1 binding preserved

## Savepoint 3 — typed cognitive operator algebra reconstructed

- Date: 2026-07-31
- Historical checkpoint represented: `aecf0ca`
- State: reconstructed and verified atop Savepoint 2
- Scope:
  - closed registry and exactly one typed dispatch route for all 55 cognitive
    primitives
  - executable intrinsic kernels for domain-independent primitives and named,
    fail-closed adapters for authored domain engines
  - typed program graphs with exact input/output slots, dependency validation,
    deterministic ordering, and cycle rejection
  - proof obligations, visible-world evidence, provenance, and authority ceilings
    enforced before results escape execution
  - deterministic program/result digests for replay and later proof-graph binding
- Acceptance:
  - complete production suite passed
  - all 4,800 whole-IR language equality proofs passed
  - complete Ava text-only campaign passed
  - 91/91 substrate contracts passed
  - TypeScript and production build passed
  - lint passed with zero errors and no new warnings
  - Cloudflare types and Wrangler dry run passed with production D1 preserved

## Savepoint 4 — canonical proof and explanation graph reconstructed

- Date: 2026-07-31
- Historical checkpoint represented: `b84c1ae`
- State: reconstructed and verified atop Savepoint 3
- Scope:
  - one immutable, digest-sealed proof graph for advisory, operator execution,
    Terminal, and Nexus response envelopes
  - completed and blocked execution retention for evidence, provenance,
    assumptions, operator lineage, obligations, authority, and blockers
  - concise, operational, full-proof, counterfactual, diagnostic, and receipt
    selectors that can emit only graph-backed claims
  - replay verification for execution digests and fail-closed forged, dangling,
    orphaned, altered, or hidden proof material
  - surface-independent graph identity across equivalent web, SSH, and MCP
    requests
- Acceptance:
  - complete production suite passed
  - all 4,800 whole-IR language equality proofs passed
  - complete Ava text-only campaign passed
  - 99/99 substrate contracts passed
  - TypeScript and production build passed
  - lint passed with zero errors and no new warnings
  - Cloudflare types and Wrangler dry run passed with production D1 preserved

## Savepoint 5 — constraint and feasibility engine reconstructed

- Date: 2026-07-31
- Historical checkpoint represented: `bb0256f`
- State: reconstructed and verified atop Savepoint 4
- Scope:
  - compiler-closed predicate, quantifier, precondition, invariant, doctrine,
    resource, failure, and repair language
  - eight distinct outcomes: feasible, prerequisite-bound, resource-bound,
    impossible, forbidden, underspecified, uncertain, and dominated
  - Ava-visible responsible facts, prerequisites, smallest replayable repair,
    closest feasible alternative, and Pareto domination
  - action bindings, quantity ranges, authority ceilings, world revisions,
    world digests, alternatives, and repairs validated fail-closed
  - proof-bearing authored adapters for `SATISFY` and `CHECK_PRECONDITION`
- Acceptance:
  - complete production suite passed
  - all 4,800 whole-IR language equality proofs passed
  - complete Ava text-only campaign passed
  - 106/106 substrate contracts passed
  - TypeScript and production build passed
  - lint passed with zero errors and no new warnings
  - Cloudflare types and Wrangler dry run passed with production D1 preserved

## Savepoint 6 — temporal engine reconstructed

- Date: 2026-07-31
- Historical checkpoint represented: `da50c45`
- State: reconstructed and verified atop Savepoint 5
- Scope:
  - compiled campaign phase order, closed-open intervals, contiguous named
    horizons, projection limits, and evidence freshness policy
  - all thirteen interval relations plus serial and dependency scheduling
  - deadlines, slack, exclusive resources, cycles, and cumulative projection
    conflicts
  - five evidence-age states without confusing historical records with stale
    evidence
  - scenario-bound forecast envelopes whose outcome semantics remain explicitly
    `UNBOUND`
  - proof-bearing authored adapters for `SEQUENCE`, `FORECAST`, and `DELAY`
- Acceptance:
  - complete production suite passed
  - all 4,800 whole-IR language equality proofs passed
  - complete Ava text-only campaign passed
  - 114/114 substrate contracts passed
  - TypeScript and production build passed
  - lint passed with zero errors and no new warnings
  - Cloudflare types and Wrangler dry run passed with production D1 preserved

## Savepoint 7 — causal and counterfactual engine reconstructed

- Date: 2026-07-31
- Historical checkpoint represented: `f041cb8`
- State: reconstructed and verified atop Savepoint 6
- Scope:
  - compiler-approved acyclic structural equations with bounded delays,
    coefficients, clamps, and deterministic topological evaluation
  - surgical, scenario-scoped interventions that sever incoming equations for
    intervened variables
  - baseline-versus-counterfactual propagation with explicit causal lineage,
    assumptions, source facts, and temporal delays
  - cause identification only by replaying an original intervention request;
    observational evidence remains candidates-only
  - hidden, stale, irrelevant, contradictory, malformed, or fabricated causal
    evidence rejected fail-closed
  - proof-bearing authored adapters for `INTERVENE`, `COUNTERFACTUAL`,
    `PROPAGATE_EFFECT`, and `FIND_CAUSE`
- Acceptance:
  - complete production suite passed
  - all 4,800 whole-IR language equality proofs passed
  - complete Ava text-only campaign passed
  - 121/121 substrate contracts passed
  - TypeScript and production build passed
  - lint passed with zero errors and no new warnings
  - Cloudflare types and Wrangler dry run passed with production D1 preserved

## Savepoint 8 — epistemic engine reconstructed

- Date: 2026-07-31
- Historical checkpoint represented: `e223479`
- State: reconstructed and verified atop Savepoint 7
- Scope:
  - compiler-owned reliability, independence, freshness, contradiction,
    estimation, downweighting, actor, and marginalization policy
  - actor/scenario-scoped assumptions and belief assessments with immutable
    support and refutation sets
  - lineage-aware independent-record selection without duplicate confidence
    inflation
  - authored reliability-weighted median estimates and replay-derived bounds
  - evidence-backed downweight reasons and explicit finite hypothesis summation
  - proof-bearing authored adapters for all seven epistemic primitives
- Acceptance:
  - complete production suite passed
  - all 4,800 whole-IR language equality proofs passed
  - complete Ava text-only campaign passed
  - 129/129 substrate contracts passed
  - TypeScript and production build passed
  - lint passed with zero errors and no new warnings
  - Cloudflare types and Wrangler dry run passed with production D1 preserved

## Savepoint 9 — decision and tradeoff engine reconstructed

- Date: 2026-07-31
- Historical checkpoint represented: `5dbbfdc`
- State: reconstructed and verified atop Savepoint 8
- Scope:
  - compiler-approved metrics, normalization ranges, objective weights, hard
    objectives, and sensitivity models
  - feasibility replay against authoritative state with scenario projections
    isolated from mutation authority
  - interval-aware utility, robust ranking, worst-case regret, tradeoffs, and
    metric-wise Pareto dominance
  - replayed falsification and compiler-bounded sensitivity instead of
    caller-supplied analysis or weights
  - permissive intrinsic comparison, scoring, and ranking kernels removed
  - proof-bearing authored adapters for all eight decision primitives
- Acceptance:
  - complete production suite passed
  - all 4,800 whole-IR language equality proofs passed
  - complete Ava text-only campaign passed
  - 137/137 substrate contracts passed
  - TypeScript and production build passed
  - lint passed with zero errors and no new warnings
  - Cloudflare types and Wrangler dry run passed with production D1 preserved

## Savepoint 10 — planning and resource-allocation engine reconstructed

- Date: 2026-07-31
- Historical checkpoint represented: `d6179c8`
- State: reconstructed and verified atop Savepoint 9
- Scope:
  - compiler-closed action, duration, resource, branch, termination, and plan
    limits with exactly one planning policy per action
  - action expansion and feasibility replay across dependency-ordered graphs
  - temporal scheduling, cumulative reservations, and double-spend prevention
  - deterministic, replayable feasibility and allocation repair proposals
  - compiler-approved branches and termination conditions with stale/forged
    request rejection
  - all seven planning primitives emit `PLAN_ONLY_NO_MUTATION` artifacts and
    cannot execute campaign mutations
- Acceptance:
  - complete production suite passed
  - all 4,800 whole-IR language equality proofs passed
  - complete Ava text-only campaign passed
  - 146/146 substrate contracts passed
  - TypeScript and production build passed
  - lint passed with zero errors and no new warnings
  - Cloudflare types and Wrangler dry run passed with production D1 preserved

## Production repair epoch — turnover schema and bounded notices

- Date: 2026-07-31
- State: verified atop Savepoint 10 and ready for production promotion
- Scope:
  - idempotent compatibility application and D1 migration-ledger recording for
    checked-in resolution-authority migration `0014`
  - public campaign and turnover routes no longer return raw database or query
    exceptions
  - browser campaign errors reject D1, SQLite, Drizzle, query, parameter, and
    oversized payloads before rendering
  - system notices are viewport-bounded and wrap unbroken content
  - browser and SSH campaign persistence retain the same public-safe error
    boundary
- Acceptance:
  - complete production suite passed
  - all 4,800 whole-IR language equality proofs passed
  - complete Ava text-only campaign passed
  - 146/146 substrate contracts passed
  - TypeScript, production build, and lint passed
  - Cloudflare types and Wrangler dry run passed with production D1 preserved

## Integration epoch — cognitive Nexus installed in Ava's production request path

- Date: 2026-07-31
- State: verified atop the production repair epoch and ready for production
  promotion
- Scope:
  - one internal cognitive Nexus compiles canonical Ava semantic requests into
    closed cognitive programs and dispatches the constraint, temporal, causal,
    epistemic, decision, planning, and realization engines
  - advice, explicit comparison, forecasting, viability, observational causal
    diagnosis, single-record evidence bounds, staged plans, and typed action or
    plan requests are controlled or validated by their engine results
  - Production, Military, and actor-scoped Diplomacy advice compiles the exact
    visible directive docket and authored ten-component evaluation vector into
    the closed `directive-strategic-posture` model; cognitive output now owns
    ranking and prose while full runtime legality is a hard objective
  - typed preparation and execution require exact `PLAN_ONLY_NO_MUTATION`
    replay before the canonical Nexus may create a proposal or mutate state
  - response proofs explicitly bind the exact cognitive program/result
    topology and recursively exclude private authority, ticket, state-seal,
    idempotency, and transport fields
  - seven authenticated web and Terminal-core probes, including directive
    advice, seal fixed engine-result text, activation, and proof identities;
    native SSH seals the same activation and proof receipt as internal
    structured gateway evidence while emitting only canonical Ava response
    text to the SSH client
  - the canonical Ava Nexus remains the only prepare, confirm, cancel,
    idempotency, audit, persistence, and campaign-mutation authority
- Acceptance:
  - complete production suite passed
  - all 4,800 whole-IR language equality proofs passed
  - complete Ava text-only campaign passed
  - 195/195 substrate contracts passed
  - TypeScript, production build, and lint passed with zero errors and no new
    warnings
  - native SSH gateway typecheck, build, and in-process session contracts passed
  - Cloudflare types and Wrangler dry run passed with production D1 preserved

## Command-environment epoch — typed tools, archival broker, and auditable exports

- Date: 2026-08-01
- State: implementation complete; production promotion remains a separate approval
- Scope:
  - typed, read-only pipelines with bounded `grep`, `head`, `tail`, `sort`,
    `uniq`, `wc`, `cut`, `column`, `jq`, and `less` filters
  - abridged manual pages for every implemented system command, with upstream
    manual provenance recorded under `docs/third-party/man-sources.md`
  - one campaign-day quotation shared by Ava and `fortune`
  - commander-owned notes plus bounded Vim and Nano state machines
  - declared Homebrew-style capability registry with no executable downloads
  - read-only campaign Git, SQLite, process, service, schedule, and diagnostic
    metaphors
  - Library of Congress catalog broker carried through browser and native SSH
    adapters without granting arbitrary network or host-shell access
  - Markdown chat export with message time, identity, surface, module,
    operation, status, handles, cognitive families, and proof-receipt metadata
  - workbook formula registry, player-intervention provenance, sensitivity
    analysis, provenance colors, and a CSV-plus-manifest interoperability bundle
  - separate Email Nexus contract and source-grounded architecture plan; no
    provider account, DNS record, outbound message, or email mutation endpoint
    was created in this epoch
- Acceptance:
  - complete production suite passed
  - TypeScript passed
  - all 4,800 whole-IR grammar proofs passed
  - Ava focused suite passed after explicit shell-language collision repairs
  - 209/209 Nexus/Substrate contracts passed
  - native SSH gateway built and its in-process contracts passed
  - production build, Cloudflare types, and Wrangler dry run passed with D1,
    Images, and Assets bindings preserved
  - lint passed with zero errors and the existing 22 warnings

## Adjacent public-control foundation epoch

- Date: 2026-08-01
- State: tested foundation only; cross-menu comparison and directive shorthand
  remain explicitly outside this epoch
- Scope:
  - random Daily missions are structurally sealed on Day 1, including the
    authenticated force-open path
  - `generate social post` returns the already-assigned daily quotation and the
    canonical `https://delenda.quest` browser, SSH, and CLI link
  - public advice replaces raw internal directive scores with a bounded,
    percentile-shaped 1–100 rating while preserving raw calculus in the
    workbook
  - campaign outcomes have larger direct battlefield conversion in both the
    success and failure branches, so an operational collapse can be worse than
    accepting the standing loss
  - completed public campaign records expose a versioned simulation credential
    payload and SHA-256 digest; the artifact explicitly disclaims licensure,
    accreditation, and identity verification
  - Email Nexus defines the sole typed contract for future authentication,
    notification, certification, and play-by-email transport; it performs no
    provider call in this epoch
- Explicit exclusions:
  - directive menus do not yet mint player-facing `P1`, `P2`, and equivalent
    per-docket handles
  - `compare production`, within-directive comparison, and Campaign-versus-
    directive comparison do not yet share a handler
  - the current public rating distributions are presentation mappings inside
    separate score families; they are not yet a cross-family comparable utility
    model
  - no email provider, DNS record, authentication endpoint, inbound route, or
    outbound send is created
- Acceptance: covered by the command-environment epoch's complete gate above.

## Parking Lot foundation epoch — durable future-plan registry

- Date: 2026-08-01
- State: documentation complete; every recorded external action remains parked
- Scope:
  - established `docs/parking-lot/README.md` as the permanent master registry
    for future Delenda Quest plans
  - defined append-only retrieval, lifecycle, authorization, activation, and
    rollback contracts so a documented plan cannot be mistaken for approval
  - separated all known externally dependent email work into six epochs:
    provider/domain foundation, account identity and Google sign-in, reciprocal
    friend invitations, play by email, certificate/LinkedIn delivery, and mail
    operations
  - preserved the current Resend-first provider preference, later Cloudflare
    consolidation option, Email Nexus authority, magic-link design, Google auth
    requirement, earlier password requirement, private reciprocal friend graph,
    opaque campaign reply aliases, confirmation-before-mutation rule,
    simulation-only certificate language, and suppression/consent boundaries
  - connected `AGENTS.md` and `docs/email/architecture.md` to the master registry
- Explicit exclusions:
  - no provider account, OAuth application, LinkedIn Page, DNS record, webhook,
    secret, recipient import, outbound message, inbound route, schema migration,
    deployment, or production configuration was created or changed
  - parked epochs are not implementation or activation authority
