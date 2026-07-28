# Substrate implementation map

Reuse boundary for the I/O substrate, gate calculus, daily dockets, Ava Classic,
and SSH adapter work. Exact existing files and what must not be duplicated.

## Existing systems reused

| Concern | Authoritative path | Reuse boundary |
|---|---|---|
| Campaign Gate AST / evaluator | `app/campaign-substrate.ts` | Extract shared ops into `app/substrate/gates.ts`; campaign keeps situation compilation and re-exports compatibility types |
| Situation blueprints / tickets | `app/campaign-substrate.ts`, `app/main-situation-content.ts` | Unchanged campaign situation engine; docket compiler is a sibling compiler, not a second campaign engine |
| Domestic/Network dockets | `app/submission-schema.ts` | Pattern reference for seeded tickets; do not merge into Production/Military/Diplomacy dockets |
| Directive families / choices | `app/game.ts` (`FAMILIES`), `app/directive-expansion.ts` | Adapt into substrate nodes; `commit()` remains the authoritative mutation |
| Diplomatic actors | `app/game.ts` initial actors, `app/circuits.ts` (`DiplomaticActor`) | Add explicit actor clade metadata; do not invent a second faction system |
| Ava parser / compiler | `app/ava/compiler.ts`, `app/ava/grammar.ts`, `app/ava/schema.ts` | Extend toward `CanonicalCommand` and response plans; no second Ava parser |
| Decision calculus | `app/ava/decision-calculus.ts`, `app/ava/advisory.ts` | Preserve superior extant maneuver calculus; add choice-evaluation vectors for directives |
| Ava runtime / confirmation | `app/ava/runtime.ts`, `app/ava/terminal.ts` | Mutations continue through authoritative game APIs; prepare/confirm wraps `commit` |
| Campaign persistence | `db/schema.ts`, `db/campaigns.ts`, campaign JSON state | Docket records persist inside campaign state (and D1 schema when needed); adapters never mutate DB |
| Auth / opaque sessions | `app/auth.ts`, `app/api/session/route.ts` | SSH credentials are additional account material; never reintroduce hosting-provider identity |
| Web surfaces | `app/GameClient.tsx`, `app/BriefingInterface.tsx` | Consume `getVisibleDocket()`; preserve visual language |
| Tests / runners | `scripts/test-rules.sh`, `scripts/test-ava.sh`, `tests/*.test.mjs` | Add substrate/SSH suites via the same esbuild + `node --test` pattern |

## New modules

| Module | Path | Responsibility |
|---|---|---|
| Doctrine | `SUBSTRATE_DOCTRINE.md` | Product law |
| Shared gates | `app/substrate/gates.ts` | Recursive gate grammar + pure evaluator |
| Contracts | `app/substrate/contracts.ts` | Channels, nodes, commands, responses, posture |
| Posture | `app/substrate/posture.ts` | Strategic posture validation / conflicts |
| Content adapters | `app/substrate/content-adapters.ts` | FAMILIES → SubstrateNode |
| Actor metadata | `app/substrate/actor-metadata.ts` | Four-faction diplomacy constraints |
| Docket compiler | `app/substrate/docket.ts` | Daily constrained dockets + persistence helpers |
| Application services | `app/substrate/services.ts` | Surface-neutral reads/advice/mutations |
| Semantic index | `app/substrate/semantic-index.ts` | Generated grammar index |
| Ava Classic plans | `app/substrate/ava-classic.ts` | Response plans, discourse, realization clauses |
| LLM packets | `app/substrate/llm-packets.ts` | Realization / deliberation packets + validators |
| MCP seam | `app/substrate/mcp-seam.ts` | Compile-time future tool → service mapping |
| Terminal core | `packages/terminal-core` | Parser + SemanticResponse renderer (runtime-neutral) |
| SSH server | `packages/ssh-server` | Auth, session, disabled subsystems, limits |

## Forbidden directions

- SSH / terminal → web components or HTML scraping
- Adapters → database mutation or duplicated simulation
- Content copy → mechanic lookup by displayed string
- Second campaign engine, second Ava parser, SSH-only game logic
