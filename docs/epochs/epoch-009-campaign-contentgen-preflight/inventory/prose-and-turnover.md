# Epoch 009 — prose inventory and day-turnover authority

Frozen for later epochs (especially 025–026). Paths are repository-relative.

## 1. Ava prose

### Authoritative sources
| Path | Role |
|---|---|
| `app/ava/voice.ts` | Report/response openings; `realizeAvaPresentation` |
| `app/ava/campaign-narrative.ts` | Situation paraphrases; daily briefing assembly |
| `app/ava/contextual-language-catalog.ts` | Contextual entry labels/evidence phrases |
| `app/ava/contextual-language-references.ts` | Authored reference declarations |
| `app/ava/man-pages.ts` | Man-page help text |
| `app/ava/grammar.ts` | Capability/command surface copy |
| `app/concepts.ts` | Concept definitions used as explain prose |
| `app/substrate/ava-classic.ts` | Classic register packets / templates |

### Compilers / projectors
`app/ava/reports.ts`, `advisory.ts`, `compiler.ts`, `contextual-language*.ts`,
`operational-render.ts`, `realization-engine.ts`, `terminal.ts`, `nexus.ts`,
`cognitive-nexus.ts`, `filesystem.ts`, `workbook.ts`, `darknet.ts`,
`projection.ts`

### Consumers
`app/GameClient.tsx`, `app/AvaTextRenderer.tsx`, `app/BriefingInterface.tsx`,
`packages/terminal-core/src/{session,renderer}.ts`,
`packages/ssh-gateway/src/{session,session-core}.ts`

## 2. Main-campaign prose

### Authoritative sources
| Path | Role |
|---|---|
| `app/game.ts` | Archetypes, personalities, theaters, phases, events, families, maneuvers, legacy situations, doctrines, opportunity overlays |
| `app/main-situation-content.ts` | Fungible situation templates / standing orders |
| `app/campaign-substrate.ts` | Generic templates, blueprint rules, fact catalog, maneuver grammar/rationales |
| `app/campaign-event-expansion.ts` | Extra event brief/report/quote prose |
| `app/directive-expansion.ts` | Extra directive family/choice prose |
| `app/opportunity-corpus.ts` | Opportunity spine headlines/briefs |
| `app/opportunity-flavor.ts` | Opportunity response flavor |
| `app/epoch-006-content.ts` | Department dispatch headlines/bodies |
| `app/concepts.ts` | Campaign concept glossary |
| `app/war-dispatch.ts` | Morning-report composer |

### Consumers
`app/BriefingInterface.tsx`, `app/GameClient.tsx`, `app/OperationsPacket.tsx`,
`app/CampaignSituationPanel.tsx`, `app/FieldManual.tsx`, Ava brief/darknet/FS

## 3. Manoeuvre presentations

### Authoritative sources
`app/campaign-substrate.ts` (`MANEUVER_ORDER_GRAMMAR`, `MANEUVER_RATIONALES`,
`MANEUVER_ORDER_QUALIFIERS`, `compileManeuverPresentations`);
`app/game.ts` `MANEUVERS` base label/flavor; situation templates declare docket IDs.

### Binders / consumers
`maneuverForSituation` / `maneuversForState` in `app/game.ts`;
Ava world-model / contextual projection / operational comparison;
BriefingInterface, GameClient, FieldManual, Ava terminal.

## 4. Sub-missions

### Authoritative sources
`app/sub-mission-content.ts` (frames + codas);
`app/submission-schema.ts` (compile docket).

### Binders / consumers
`app/game.ts` state fields; `app/convergence.ts`; Ava runtime/reports/darknet;
BriefingInterface secondary fronts; GameClient; FieldManual.

## 5. Reports

| Stratum | Producer | Store / consumers |
|---|---|---|
| Morning / war-dispatch | `app/war-dispatch.ts` via `game.ts::resolve` | `GameState.reports[]` → GameClient, BriefingInterface, Ava narrative/FS |
| Ava analytical cards | `app/ava/reports.ts` + `voice.ts` | terminal, filesystem, workbook, nexus, GameClient |

## 6. Resolution records

| Role | Path |
|---|---|
| Schema + sole producer | `app/game.ts` `DailyResolutionRecord` / `resolve` → `resolutionHistory` |
| Authoritative persistence path | `db/turns.ts::redeemDailyResolution` → Nexus `resolve-day` with `resolutionAuthority:"persisted-redemption"` |
| Consumers | `app/ava/reports.ts`, `voice.ts`, `filesystem.ts`, `workbook.ts`, BriefingInterface history, GameClient post-redemption checks, telemetry/score |

## 7. Day-turnover authority path

```text
UI / Ava confirm / GameClient.advance
  → POST app/api/turn/route.ts
      → db/turns.ts::claimDailyResolution (~L223)
         gates: account day key / nextTurnAt / godMode (app/account-time.ts)
         issues campaign_resolution_grants row
  → PUT app/api/turn/route.ts
      → db/turns.ts::redeemDailyResolution (~L388)
         → runAvaNexusRequest(resolve-day, resolutionAuthority:"persisted-redemption")
         → app/ava/nexus.ts grant validation
         → app/ava/runtime.ts → app/game.ts::resolve
         → persist campaign + consume grant + update account_turn_state
```

Canonical Nexus action: `{kind:"resolve-day"}` (`app/ava/nexus.ts`).

## 8. Automatic (non-manual) turnover — finding for Epoch 026

**Verdict: yes, a non-manual client-driven path exists; no server cron.**

| Exists | Detail |
|---|---|
| `GameClient.advance("automatic")` | Same claim → redeem path as manual |
| Hydration overdue path | If saved `clock.end` is past on load → auto `advance("automatic")` once |
| Clock-expiry effect | When remaining ≤ 0 (active campaign, not godMode/busy) → auto advance |
| Client `setInterval` | Advances `now` so remaining can cross zero while tab is open |

| Absent | Detail |
|---|---|
| Worker cron / scheduled handler | None in `wrangler.jsonc` / worker |
| Server midnight auto-resolve without client | Absent |
| SSH as turnover authority | Absent — Nexus resolve-day requires persisted redemption |

**Distinction:** account midnight unlocks `canResolve`; it does not itself
resolve. Automatic turnover is GameClient auto-invoking the same claim/redeem
authority when the account-day clock is overdue/expired while the session is
open — not an independent background resolver.
