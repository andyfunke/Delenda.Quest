# Substrate architecture

## Canonical state owner

`GameState` in `app/game.ts` is the authoritative campaign state machine.
Persistence is the D1-backed active campaign record (`db/campaigns.ts`).
Adapters never mutate the database or invent alternate simulations.

## Application services

Surface-neutral services live in `app/substrate/services.ts`. The canonical
Nexus (`app/ava/nexus.ts`) is the one coordinator that wires the live ones:

- Live, Nexus-wired: `getVisibleDocket`, `prepareOrder`, `confirmOrder`,
  `cancelPreparedOrder` (plus `getVisibleChoice` as the sanctioned web
  read seam).
- Reference-only (marked `SERVICES_DISPATCH_REFERENCE_ONLY`):
  `dispatchCanonicalCommand` and the unconsumed reads `getDailyBrief`,
  `getCampaignStatus`, `evaluateChoices` (Ava Classic differential only),
  `rankVisibleChoices`, `listDirectiveFamilyCatalog`. They stay as
  deterministic parity oracles; no production surface may call them
  (enforced by `tests/substrate-architecture.test.mjs`).

The legacy directive evaluators remain deterministic compatibility/reference
services. Production Ava compiles their authored component vector into the
cognitive decision model and takes ranking authority only from that engine
result. Surfaces may call the sanctioned read-only visibility helpers
directly, but all agent semantics and mutations enter the Nexus.

The cognitive engine bay is `app/ava/cognitive-nexus.ts`. It compiles validated
read and plan-validation requests into closed cognitive programs, executes only
registered adapters, seals the upstream result through the realization engine,
and returns its proof to the canonical Nexus. It cannot mutate or persist
campaign state. Plan-only validation must pass before Nexus can create a
confirmation; only Nexus can confirm or mutate. The active route and
trust-boundary contract is documented in `docs/ava-cognitive-nexus.md`.

## The shared substrate

`app/substrate/substrate-core.ts` is the named owner of the three layers
that inform both the canonical Nexus (Ava) and the campaign deck/draw
compilers, and the only sanctioned route to them from either side:

- Gate calculus (`app/substrate/gates.ts`) — situation eligibility, daily
  dockets, and Ava visibility evaluate the same recursive gate grammar.
- Draw idiom (`app/substrate/hash.ts`) — the canonical FNV-1a seeded-ticket
  hash behind every deterministic draw; no inline copies in app code.
- Vocabulary (`app/substrate/vocabulary.ts`) — the typed identifier sets
  both sides speak: channels, theaters, campaign phases and the live
  phase-boundary table, problem classes, maneuver ids, tiers, heats,
  metric ids, scalar-to-metric ownership, and the Ava-semantic-operation to
  command-operation mapping. Legacy declaration sites re-export it;
  `tests/vocabulary-drift.test.mjs` locks the rest (including the offline
  scheduler's divergent arc-pacing phase table, pinned until its wiring
  epoch).

## Semantic contracts

`app/substrate/contracts.ts`, `posture.ts`, `gates.ts`, `command-parser.ts`,
`llm-packets.ts`, and `semantic-index.ts` define typed inputs/outputs.
No Zod dependency is present; validation is explicit TypeScript validators.
`command-parser.ts` is a reference interpreter
(`COMMAND_PARSER_REFERENCE_ONLY`): production language authority is the Ava
grammar compiler behind the Nexus, and the parser's one live export is the
SSH lexical kill switch `isConsequentialCommandAttempt`. `semantic-index.ts`
(`SEMANTIC_INDEX_REFERENCE_ONLY`) and `llm-packets.ts`
(`LLM_PACKETS_FUTURE_SEAM_ONLY`) are likewise reference/seam artifacts.

## Content compiler

- Campaign situations: `app/campaign-substrate.ts` (shared gate evaluator)
- Daily Production/Military/Diplomacy dockets: `app/substrate/docket.ts`
- Directive forest adapter: `app/substrate/content-adapters.ts`
- Diplomacy actor metadata: `app/substrate/actor-metadata.ts`
- Contentgen contracts (offline): `packages/contentgen-contracts`
  (`contentgen-contract/v1`) — chord recipes, canonical JSON/hash idiom,
  taxonomies, trainer/threshold constants. No player-path imports.
- Promoted execution-scene recipes: `app/execution-scene-recipes.ts`
  verifies the Git-versioned manifest
  `app/campaign-content/execution-scenes/recipes.v1.json` fail-closed and
  supplies the realization pool for the execution-scene draw in
  `app/game.ts` — the one runtime bridge from a promoted chord-metagrammar
  manifest into a live campaign draw (doctrine §22). The other authored
  packs under `app/campaign-content/` remain offline until their own
  wiring epochs.

## Adapter boundaries

| Adapter | Path | May do | Must not do |
|---|---|---|---|
| Web | `GameClient.tsx`, `BriefingInterface.tsx` | Submit text or typed IR to the Nexus; render the canonical response | Execute actions directly, filter full catalogs as authority |
| Ava Nexus | `app/ava/nexus.ts`, `app/ava/cognitive-nexus.ts` | Compile, validate, dispatch cognitive reads, authorize effects, and return one proof-bearing response envelope | Invent mechanics, create a second coordinator, or bypass prepared effects |
| Ava Classic differential reference | `app/substrate/ava-classic.ts` | Independently realize read-only semantic plans for differential tests | Dispatch mutations or serve as a production adapter |
| Terminal core | `packages/terminal-core` | Submit text to the Nexus and render its canonical response | Shell out, rank choices, mutate DB |
| SSH server | `packages/ssh-server`, `packages/ssh-gateway` | Authenticate, enforce session limits, call the Nexus | Host shell, SCP/SFTP, forwarding |
| MCP seam | `app/substrate/mcp-seam.ts` | Map future tools 1:1 to Nexus application services | Import web/SSH modules or create a second runtime |

## Persistence records

- `GameState.dailyDockets` — presented daily dockets (stable across refresh/orders)
- `GameState.preparedOrders` — prepare/confirm tokens
- `GameState.avaExecutions` — durable idempotency receipts for typed effects
- `campaign_resolution_grants` — private, one-use resolution authority
- `ssh_credentials`, `ssh_session_audits` — D1 tables for SSH key material and audits

## Versioning

- Campaign content pack: `CONTENT_PACK_VERSION` in `campaign-substrate.ts`
- Directive substrate: `CONTENT_VERSION` in `contracts.ts`
- Docket records store `contentVersion` and `compiledAtRevision`

## Forbidden imports / dependencies

- SSH → web components / browser APIs
- Adapters → drizzle/DB mutation helpers
- Adapters → duplicated simulation circuits
- Content copy string → mechanic identity
- LLM → mutation without prepare/confirm
