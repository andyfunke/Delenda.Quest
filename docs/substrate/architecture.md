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

Web, Ava Classic, terminal-core, and future MCP tools call these services.

## Semantic contracts

`app/substrate/contracts.ts`, `posture.ts`, `gates.ts`, `command-parser.ts`,
`llm-packets.ts`, and `semantic-index.ts` define typed inputs/outputs.
No Zod dependency is present; validation is explicit TypeScript validators.

## Content compiler

- Campaign situations: `app/campaign-substrate.ts` (shared gate evaluator)
- Daily Production/Military/Diplomacy dockets: `app/substrate/docket.ts`
- Directive forest adapter: `app/substrate/content-adapters.ts`
- Diplomacy actor metadata: `app/substrate/actor-metadata.ts`

## Adapter boundaries

| Adapter | Path | May do | Must not do |
|---|---|---|---|
| Web | `GameClient.tsx`, `BriefingInterface.tsx` | Render docket facts, call services/`commit` via existing Ava runtime | Filter full catalogs as authority, scrape HTML for other clients |
| Ava Classic | `app/substrate/ava-classic.ts` + existing `app/ava/*` | Compile language to plans/commands | Own mutations or invent mechanics |
| Terminal core | `packages/terminal-core` | Parse Delenda commands, render `SemanticResponse` | Shell out, rank choices, mutate DB |
| SSH server | `packages/ssh-server` | Authenticate, session limits, call terminal-core | Host shell, SCP/SFTP, forwarding |
| MCP seam | `app/substrate/mcp-seam.ts` | Map future tools 1:1 to services | Import web/SSH modules |

## Persistence records

- `GameState.dailyDockets` — presented daily dockets (stable across refresh/orders)
- `GameState.preparedOrders` — prepare/confirm tokens
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
