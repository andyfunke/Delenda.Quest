# Substrate architecture

## Canonical state owner

`GameState` in `app/game.ts` is the authoritative campaign state machine.
Persistence is the D1-backed active campaign record (`db/campaigns.ts`).
Adapters never mutate the database or invent alternate simulations.

## Application services

Surface-neutral services live in `app/substrate/services.ts`:

- `getDailyBrief`, `getCampaignStatus`
- `getVisibleDocket`, `getVisibleChoice`
- `evaluateChoices`, `rankVisibleChoices`
- `prepareOrder`, `confirmOrder`, `cancelPreparedOrder`
- `dispatchCanonicalCommand`

The legacy directive evaluators remain deterministic compatibility/reference
services. Production Ava compiles their authored component vector into the
cognitive decision model and takes ranking authority only from that engine
result. Surfaces may call read-only visibility helpers directly, but all agent
semantics and mutations enter the Nexus.

The cognitive engine bay is `app/ava/cognitive-nexus.ts`. It compiles validated
read and plan-validation requests into closed cognitive programs, executes only
registered adapters, seals the upstream result through the realization engine,
and returns its proof to the canonical Nexus. It cannot mutate or persist
campaign state. Plan-only validation must pass before Nexus can create a
confirmation; only Nexus can confirm or mutate. The active route and
trust-boundary contract is documented in `docs/ava-cognitive-nexus.md`.

## Semantic contracts

`app/substrate/contracts.ts`, `posture.ts`, `gates.ts`, `command-parser.ts`,
`llm-packets.ts`, and `semantic-index.ts` define typed inputs/outputs.
No Zod dependency is present; validation is explicit TypeScript validators.

## Content compiler

- Campaign situations: `app/campaign-substrate.ts` (shared gate evaluator)
- Daily Production/Military/Diplomacy dockets: `app/substrate/docket.ts`
- Directive forest adapter: `app/substrate/content-adapters.ts`
- Diplomacy actor metadata: `app/substrate/actor-metadata.ts`
- Contentgen contracts (offline): `packages/contentgen-contracts`
  (`contentgen-contract/v1`) — chord recipes, canonical JSON/hash idiom,
  taxonomies, trainer/threshold constants. No player-path imports.

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
