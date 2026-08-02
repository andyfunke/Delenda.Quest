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
doctrine, feature, and epoch files, excluding the manifest itself and the
append-only logbook. The final commit and tree are reported alongside the
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
