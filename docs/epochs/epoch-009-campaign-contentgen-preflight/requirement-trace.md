# Epoch 009 — requirement ledger and §1.2 baseline freeze

Every R01–R41 requirement is recorded here as the compatibility ledger for the
superepoch. Primary implementing epochs cite Part 8; this file freezes the
ledger text at Epoch 009 so later preflights can re-verify without rewriting
requirements.

## §1.2 Frozen repository baseline

| Baseline fact | Value | Evidence at Epoch 009 |
|---|---|---|
| Manoeuvre mechanics | **7**: `reinforce`, `interdict`, `route`, `abandon`, `exploit`, `breach`, `network` | `MANEUVERS` in `app/game.ts`; `MANEUVER_AFTERMATH` in `app/campaign-substrate.ts` |
| Theaters | **4**: `industrial` (6 templates in substrate), `lowland` (9), `ridge` (6), `river` (6) | `app/campaign-substrate.ts` `theater:"…"` counts; `THEATERS` in `app/game.ts` |
| Campaign phases | **4**: `contact` [1,5], `compression` [6,12], `exhaustion` [13,20], `terminal` [21,30] | `CAMPAIGN_PHASES` in `app/game.ts` |
| Problem classes | **8**: `assault`, `command`, `counterstroke`, `crossing`, `exploitation`, `force-preservation`, `logistics`, `observation` | `PROBLEM_TARGETS` / templates in `app/campaign-substrate.ts` |
| Day-resolution authority | `claimDailyResolution` / `redeemDailyResolution` via `app/api/turn/route.ts` | `db/turns.ts` (~223, ~388) |
| Canonical resolve-day action | Nexus `{kind:"resolve-day"}` | `app/ava/nexus.ts` |
| Gate calculus / dockets | `dailyManeuverDocket` | `app/campaign-substrate.ts` |
| Legacy `service record` command | present | Ava modules + `app/substrate/command-parser.ts` + `app/AccountPage.tsx` |
| Hash idiom | `stableHash(text) = hashInt(text)/4294967295`; duplicated body | `app/substrate/hash.ts`, `app/campaign-substrate.ts` |
| Balance simulator | `scripts/simulate-campaign-balance.sh` (`npm run simulate:balance`) | `package.json` |
| Corpus foundation | `content-quality/corpus/` (Epoch 008) | verified |
| SSH/terminal surfaces | `packages/{ssh-gateway,ssh-server,terminal-core}` | verified |
| Node doctrine exemplar | `docs/epochs/epoch-007-ava-content-quality-decompiler/nodes/` | verified |

## R01–R41 ledger

| ID | Title | Epoch 009 disposition |
|---|---|---|
| R01 | Existing-library immutability | **Frozen** — `integrity/immutability-manifest.json` |
| R02 | Semantic linking | Recorded; packs later (019, 022–024) |
| R03 | Exactly three primary tiers | Recorded; law §4.12(a); epochs 019–024 |
| R04 | Main-thread Romantic epochs | Recorded; §4.12(d); epochs 020/023 |
| R05 | Narrative coverage guarantee | Recorded; §4.12(d)(e); epochs 020/023/027 |
| R06 | Operational continuity | Recorded; epoch 021 |
| R07 | More manoeuvre content | Recorded; mechanic registry frozen at 7; epoch 022 expands frames only |
| R08 | Dramatic contrast | Recorded; epoch 022 |
| R09 | Heat alternation | Recorded; §4.12(f); epochs 020/022–024 |
| R10 | Slow exponential magnitude | Recorded; §4.11; epoch 019 |
| R11 | Doomsday density | Recorded; §4.11/§4.12; epochs 019/024 |
| R12 | Daily prosecution | Recorded; §4.17; epoch 025 |
| R13 | Battle Log | Recorded; §4.15; epoch 026 — uses NODE-03 automatic-turnover finding |
| R14 | Permanent records preserved | Recorded; epoch 026 alias behavior |
| R15 | Register | Recorded; epochs 012/022–025 |
| R16 | Canonical Contentgen doctrine | Recorded; epoch 010 appends to `SUBSTRATE_DOCTRINE.md` |
| R17 | Shared chord core | Recorded; §4.4; epoch 010 |
| R18 | Problem-set conformance | Recorded; §4.5; epochs 010–013/018 |
| R19 | Precomputation | Recorded; epochs 010–013/018 |
| R20 | Appified internal workflow | Recorded; epoch 015 |
| R21 | Compliant grammar lists | Recorded; epoch 011 |
| R22 | Complete authenticated disposition | Recorded; §4.7; epochs 014–015 |
| R23 | `#failures` and `#curious` | Recorded; §4.9; epoch 016 |
| R24 | Alive and dead corpus | Recorded; epoch 013 |
| R25 | Manual reductions | Recorded; §4.7(a); epochs 014–015 |
| R26 | AI pre-score | Recorded; §4.9; epoch 016 (`NONE` mode ungated) |
| R27 | Actual compiler training | Recorded; §4.5/§4.9; epochs 017–018 |
| R28 | Exclusion prisms | Recorded; §4.6; epochs 012/017 |
| R29 | Three-layer repair | Recorded; epochs 012/017–018 |
| R30 | Deterministic RAG ledger | Recorded; epoch 013 |
| R31 | Cross-medium transfer | Recorded; §4.5; epoch 018 |
| R32 | No automatic rewriting or publication | Recorded; epochs 010/016–018 |
| R33 | Independent validation | **Exercised** — `validate:epoch-009` imports no app source |
| R34 | Non-tautological evidence | Recorded; every epoch; final in 027 |
| R35 | Determinism and provenance | Recorded; serialization/hash law §4.2–§4.3 |
| R36 | Persistence and idempotency | Recorded; epochs 014/019–027 |
| R37 | Discovery protection | Recorded; seals §4.2; epochs 019–027 |
| R38 | Surface parity | Recorded; §4.15; epochs 019–027 |
| R39 | No live-model dependency | Recorded; player path remains model-free |
| R40 | Cloudflare topology preserved | Recorded; no Pages/Sites/second D1 |
| R41 | Effective abundance | Recorded; §4.13; epochs 011/022–024/027 |

## Requirement → primary epoch (Part 8 snapshot)

| Requirement | Primary epoch(s) |
|---|---|
| R01–R02 | 009, 019, 022–024, 027 |
| R03–R11 | 019–024, 027 |
| R12–R15 | 025–026, 027 |
| R16–R19 | 010–013, 018 |
| R20–R26 | 014–016 |
| R27–R31 | 017–018 |
| R32 | 010, 016–018 |
| R33–R35 | every epoch; final proof in 027 |
| R36–R40 | 014, 019–027 |
| R41 | 011, 022–024, 027 |
