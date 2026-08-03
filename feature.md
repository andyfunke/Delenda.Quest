# Delenda Quest feature ledger

This is the append-oriented compatibility ledger for patch epochs. It records
what already exists, what a proposal assumes, and which current authority owns
the implementation. The canonical product law remains
`SUBSTRATE_DOCTRINE.md`.

## Live baseline

| Field | Value |
|---|---|
| Repository | `andyfunke/Delenda.Quest` |
| Branch | `main` |
| Base commit | `a54fe7e75e8cb51f6e7bf8064133b7351c449e36` |
| Handoff commit | `9973b8e` (not present in reachable live history) |
| Worker config | `wrangler.jsonc`, compatibility date `2026-07-27` |
| State authority | `app/game.ts` + substrate circuits/services |
| Ava authority | `app/ava/nexus.ts` + `app/ava/compiler.ts` |
| Disclosure boundary | `app/ava/projection.ts` |
| Public revision | `app/ava/world-model.ts::avaVisibleWorldRevision` |
| Content authority | `app/campaign-substrate.ts` / `CONTENT_PACK_VERSION` |
| Doctrine | `SUBSTRATE_DOCTRINE.md` |

## Recent features accounted for

The live baseline already contains the following features that the attached
epoch must preserve:

- The cognitive runtime and Nexus proof path, including surface-neutral web,
  terminal, and SSH attestations.
- The closed Ava semantic grammar, request IR validator, typed instruction
  handlers, and existing OG Ava legacy command surface.
- Disclosed-state projection for hidden adversary data and a public world
  revision bound to that projection.
- Persisted campaign situations, maneuver presentations, shared gate calculus,
  current docket services, and existing report/explanation renderers.
- Native terminal and SSH adapters over `runAvaNexusLine`, with Cloudflare
  Worker/D1 production configuration owned by `wrangler.jsonc`.

## Handoff reconciliation

| Handoff proposal | Live finding | Compatibility decision |
|---|---|---|
| Base `9973b8e` | Stale or unreachable | Port the proposal onto current `main`; do not rewind. |
| `feature.md` already exists | No tracked or reachable `feature.md` | Create this ledger as the patch record. |
| `packages/priorities-library` | No such package | Use the authoritative `StrategicDimension` union in `app/substrate/gates.ts`; add only a small lowering helper. |
| A second contextual parser | OG Ava compiler already owns normalization and lowering | Add a pure catalog/matcher layer that runs after shell, unsafe-syntax, and negated-consequential guards. |
| New typed instruction kinds | Existing `ADVISE`, `REPORT`, and `EXPLAIN` handlers are sufficient | Carry a validated, read-only contextual binding on those existing kinds. |
| Briefing state projection | `projectAvaDisclosedState` and `avaVisibleWorldRevision` already exist | Reuse them; never expose raw adversary actuality or private seed material. |
| New target table | `PROBLEM_TARGETS` is authoritative in `app/campaign-substrate.ts` | Export a read-only accessor instead of duplicating the mapping. |
| Production install/deploy | Current environment has no usable Cloudflare auth connector; handoff forbids deploy | Run local type/build/dry-run validation only; do not deploy or touch D1. |

## Adapted epoch map

| Node | Scope | Current status |
|---|---|---|
| PRE-00 | Base, branch, safety, baseline gates | complete |
| E1 | Contextual language contracts | complete |
| E2 | NFKD normalization and deterministic validation | complete |
| E3 | Static contextual catalog | complete |
| E4 | Strategic-dimension priority lowering | complete |
| E5 | Campaign target accessor and grounded concepts | complete |
| E6 | Disclosed current-situation projection | complete |
| E7 | Visible authored-brief reference indexing | complete |
| E8 | Nexus language injection | complete |
| E9 | Exact/longest contextual matcher | complete |
| E10 | Existing typed-instruction lowering | complete |
| E11 | Mutation and negation integration guards | complete |
| E12 | Read-only contextual renderings | complete |
| E13 | Live corpus and hidden-state tests | complete |
| E14 | Web/native terminal/SSH parity | complete |
| E15 | Full gates, documentation, and SHA-256 manifest | complete |

## Compatibility rules for future amendments

1. Static aliases must have one owner after normalization. Ambiguous readings
   clarify; they never choose a mutation.
2. Authored phrases are indexed only from visible current situation text and
   retain exact section/excerpt evidence. An absent phrase is not a feature.
3. `gain territory` and `advance` are read-only priority questions. `stage
   advance`, `prepare gain territory`, `issue advance`, and `do not advance`
   remain existing guarded command/clarification paths.
4. Every contextual read returns through the existing request IR, cognitive
   proof, and renderer. No web/terminal/SSH parser may fork this path.
5. Generated source files remain small and ownership-specific. New modules
   belong under `app/ava/contextual-language-*.ts`; execution evidence belongs
   under the epoch folder and logbook.

## Integrity convention

The epoch source manifest uses SHA-256 over tracked implementation, test,
doctrine, feature, epoch, and append-only logbook files, excluding the
manifest itself. The final commit and tree are reported alongside the
manifest digest in the seal receipt.

## Epoch 002 execution — contextual language hardening

The attached next-batch packet was executed against the sealed current
baseline, not its stale `9973b8e` assumption. The live repository has no
`packages/priorities-library`; the implementation therefore remains split
across the existing contextual modules and lowers into the current
`StrategicDimension`, `campaign-synopsis`, typed request IR, and Nexus owners.

| Node | Implementation commit | Receipt commit | Result |
|---|---|---|---|
| NODE-01 | `2feb3af` | `98d23f6` | contract validation and NFKC surface normalization |
| NODE-02 | `c1c87cf` | `088714e` | deterministic contextual aliases and ownership map |
| NODE-03 | `a897139` | `be52368` | bounded strategic-dimension priority lowering |
| NODE-04 | `551f625` | `319bf6e` | disclosed, non-actionable objective projection |
| NODE-05 | `5d98669` | `da80778` | exact matcher, typed route lowering, stable traces |
| NODE-06 | `3617a1a` | `18cbf41` | live Nexus corpus and mutation safeguards |

The complete corpus is exact after normalization and routes through existing
`ADVISE`, `REPORT`, and `EXPLAIN` instructions. The focused substrate gate is
226/226 and includes web/native terminal/SSH parity, hidden-field exclusion,
unavailable-destination clarification, and consequential/negated neighbor
guards. The full repository gate, typecheck, build, SSH build, Cloudflare
types/dry run, and lint also pass.

Epoch 002 retains the release boundary: no GitHub push, Cloudflare deploy,
D1 write, shadow mutation, or HTTP SSH path was performed. Its complete
execution evidence is under `docs/epochs/epoch-002-contextual-language-hardening/`
and the root logbook.

## Epoch 003 execution — typed operational Ava language

Epoch 003 ports the attached NODE-14 through NODE-20 specification onto the
verified current head `3d04095961a40c72363adfa2d546ff2ec0187b79`. It keeps the
existing `StrategicDimension`, `campaign-synopsis`, `NARRATIVE_REFERENCE`,
`EXPLAIN`, Nexus, terminal, and native SSH authorities. It does not create the
stale priorities package, a second parser, a new instruction kind, or a second
mutation path.

| Node | Implementation commit | Receipt commit | Result |
|---|---|---|---|
| NODE-14 | — | — | owner/maneuver preflight complete; no implementation commit |
| NODE-15 | `16ad7c0` | `18e37ea` | confirmed typed owners and static operational vocabulary |
| NODE-16 | `4a5a063` | `cb72599` | stable current maneuver evidence projection |
| NODE-17 | `ede0075` | `2251e34` | bounded exact authored-reference indexing and lowering |
| NODE-18 | `2bec345` | `2b0a547` | typed evidence and truthful availability rendering |
| NODE-19 | `f10f465` | `85cfe3b` | web, terminal, and native SSH parity proof |
| NODE-20 | `c41dc9b` | `786da93` | exhaustive generated proof, doctrine, gates, manifest, and receipt |

The owner map confirms formation, reserve, route, and opening as typed,
non-action entities. No concept is deferred in this epoch. Reserve retains only
its existing disclosed scalar/calculation authority; the other three concepts
render an explicit unavailable scalar boundary. Current maneuver evidence is
joined by stable ID and preserves exact source text, section, order, and
provenance. Static aliases retain precedence; authored collisions clarify;
declared absent references clarify as unavailable; and all authored reads lower
through existing `NARRATIVE_REFERENCE`/`EXPLAIN` semantics.

The generated NODE-20 corpus covers every projected static alias and every
accepted maneuver evidence entry across exact, uppercase, punctuation,
hyphenation, whitespace normalization, collisions, ambiguity, availability,
action-prefix, negation, hidden-state, rendering, and mutation boundaries.
The focused substrate suite is green at 234/234 after the generated proof is
included. Full repository gates and the SHA-256 manifest are recorded in the
NODE-20 seal receipt. The manifest was verified after the final documentation
seal update.

Epoch 003 retains the release boundary: no GitHub push, Cloudflare deployment,
D1 write, shadow mutation, HTTP SSH path, secret movement, or destructive Git
recovery is permitted within the epoch.

## Epoch 004 execution — composed operational Ava semantics

Epoch 004 ports the attached NODE-21 through NODE-27 handoff onto the verified
Epoch 003 remote head `a473e3d`. The stale `9973b8e` base, quarantined legacy
calculus, second parser, generic graph, hidden state, private RNG, sealed
outcomes, and mutation routes remain excluded.

| Node | Implementation commit | Receipt commit | Result |
|---|---|---|---|
| NODE-21 | — | — | owner preflight and boundary map |
| NODE-22 | `04927d6` | `42e8f02` | canonical disclosed calculus evidence |
| NODE-23 | `0656460` | `57def89` | typed advice composed through canonical calculus |
| NODE-24 | `17dac16` | `6ada48a` | bounded pairwise maneuver comparison |
| NODE-25 | `6275e2d` | `73dc226` | compiler-owned operational relationships |
| NODE-26 | `d021d9b` | `a6c3d12` | one semantic renderer and three-surface parity |
| NODE-27 | `51863f0` + `33b30d4` | final local seal | generated proof, parity correction, final gates, manifest, and epoch seal |

NODE-22 exposes the active disclosed decision and temporal authorities. NODE-23
composes the winner, objective, priorities, alternatives, equations, rules,
uncertainties, and limitations. NODE-24 compares stable current maneuver IDs
without selecting a winner. NODE-25 emits only `CONCEPTS.related[]` and
`currentSituation.maneuvers[]` joins. NODE-26 renders all of those typed models
through the existing Nexus for browser, terminal, and native SSH parity.

The generated proof covers every canonical concept relation, every current
maneuver pair, advice aliases, guarded action-like neighbors, unavailable
relationship bounds, hidden-field exclusion, no-mutation behavior, and
surface-parity contracts. It passes with 245/245 substrate tests. The full
repository gate passes rendered/plumbing 30/30, rule suites 40+11+6+1+8+6+5,
Ava 32/32, and the substrate corpus 245/245. Typecheck, production build,
native SSH build, Wrangler types check, Cloudflare dry-run, lint (0 errors;
23 pre-existing warnings), `git diff --check`, and the SHA-256 manifest
verification all pass. The final local worktree is clean and `origin/main`
remains unchanged; no push or deployment was performed.

## Epoch 009 stop — missing authority referent

| Field | Value |
|---|---|
| Session | Cursor kickoff Epoch 009–027 superepoch, one-epoch rule |
| Intended epoch | `009` — Historical repair, preflight, and compatibility freeze |
| Status | **STOPPED** before any epoch node execution |
| Stop kind | Missing referent (kickoff hard rule) |
| Missing authority | `updated_epoch.md` (Parts 0–7; Part 6 for Epoch 009) |
| Workspace facts | File absent from `/workspace`, Git history, and `origin/main` tree |
| Dependency present | `docs/epochs/epoch-008-ava-quality-infrastructure/` (local; not pushed) |
| Files changed for this stop | This ledger append only |
| Runtime / owned-file work | None — owned-files boundary unknown without Part 6 |
| Push / deploy / secrets / D1 | Not performed (kickoff forbids) |
| Successor agent | Not deployed — Epoch 009 Exit criteria unmet; no create-agent tool available |

### Reading-order attempt

1. `AGENTS.md` — present
2. `SUBSTRATE_DOCTRINE.md` — present
3. `updated_epoch.md` — **absent**; cannot read Parts 0–5, Epoch 009 Part 6, or Part 7
4. `docs/parking-lot/README.md` — present; no Epoch 009/contentgen parking-lot overlap authorized for activation
5. Epoch 009 dependency receipts — Epoch 008 receipts present locally; cannot verify against Part 6 dependency list without the spec

### Halt decision

Per kickoff: do not improvise pinned values, owned-files, nodes, or validators.
Operator must place the authoritative `updated_epoch.md` in the repository (or
attach it to a fresh session) before Epoch 009 can be rerun. Do not advance to
Epoch 010 until Epoch 009 Exit criteria pass.

## Epoch 009 execution — campaign/Contentgen preflight

Operator cleared the spurious `fd4b783` / sealed epoch-6 base stop. Epoch 009
completed locally under `docs/epochs/epoch-009-campaign-contentgen-preflight/`
with an append-only Epoch 008 pushed-state amendment, 30-entry immutability
manifest, authority map, R01–R41 ledger, prose/turnover inventory, and
`npm run validate:epoch-009`. Focused gates PASS. No runtime `app/**` edits.

Epoch 009 delivery: branch
`cursor/epoch-009-campaign-contentgen-preflight-88d3` pushed; draft PR #8
https://github.com/andyfunke/Delenda.Quest/pull/8. Not production deployed.

## Epoch 010 — Contentgen contracts

Added `packages/contentgen-contracts` (`contentgen-contract/v1`), doctrine §21,
substrate grammar/architecture notes, and `npm run test:contentgen-contracts`
(9/9). Quality layer cannot own intent or mechanics.

## Epoch 011 — cross-medium enumeration

Added `packages/contentgen` enumerator, explicit production inventory, CLI
`contentgen:enumerate`, and independent byte-identity validator. 68 candidates
at seed 7; Ava content-quality adapter preserved.
