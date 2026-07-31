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
