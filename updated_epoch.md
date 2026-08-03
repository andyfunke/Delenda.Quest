# Epoch 009–027 Unified Specification — campaign metastrata and the trainable Contentgen compiler

Status: **UNIFIED SPECIFICATION; implementation is not activated by this document**

Prepared: 2026-08-03

Specification base: `fd4b783` — the sealed tip of `codex/epoch-006` (verified
clean except the untracked proposal file itself). **`codex/epoch-006` is
sealed: it receives no new commits.** Superepoch work happens on
`epoch-009-027` (branched from `fd4b783`) or its recorded successors.

Production source of truth: `andyfunke/Delenda.Quest`

Provenance: this document is the validated, consolidated rewrite of
`epoch.md` ("Epoch 009–027 proposal", ChatGPT, 2026-08-03) merged with its
validation corrigendum (`epoch_corrigendum.md`). Every factual claim in the
original proposal was checked against the live repository and every formula
independently recomputed (Part 1 and Appendix A/B). Every change relative to
the original proposal is enumerated in Appendix C. There are no silent edits.

## How this document is organized

- **Part 0** — interpretation and execution contract. Read first.
- **Part 1** — validation provenance and the frozen repository baseline.
- **Part 2** — the non-negotiable requirement ledger (R01–R41).
- **Part 3** — the governing authority map.
- **Part 4** — frozen global law: contracts, idioms, tables, taxonomies, and
  determinate rules that epochs implement and reuse. *Nothing in Part 4 may be
  reinvented inside an epoch; epochs reference these sections.*
- **Part 5** — the complete command contract registry.
- **Part 6** — the epoch sequence, 009–027, each fully specified.
- **Part 7** — dependency graph.
- **Part 8** — requirement-to-epoch trace.
- **Part 9** — completion definition.
- **Appendices** — validation evidence (A), mathematical verification (B),
  change provenance vs. the original proposal (C).

### Demarcation decisions (what changed structurally, and why)

Epoch numbering **009–027 is retained** for continuity with repository
history (`docs/epochs/epoch-001…008`), the parking lot, and existing receipts.
Boundaries were adjusted as follows:

1. All reusable idioms (deterministic hash/ticket/roll idiom, canonical
   serialization, trainer configuration, quality thresholds, taxonomies,
   scheduler determinism, batch data flow, surface matrix, node doctrine) were
   promoted from individual epochs into **Part 4 frozen law**, so the
   recursive machinery is defined once, before its first consumer.
2. The command registry (Part 5) is completed up front — including
   `validate:epoch-009`, `contentgen:corpus`, and the `--judge NONE` spelling —
   so no later agent invents overlapping CLIs.
3. The curation pipeline idiom (enumerate → decompile → batch → authenticate →
   reduce → train → promote → resample) is defined once in §4.14 and invoked
   by reference in content epochs 022–024.
4. The undefined `precomputedLateRunAdjustment` table is now a first-class
   checked-in table (v1 = zeros) owned by Epoch 019 (§4.11).
5. Epoch 016→017 is annotated as a soft data-flow edge, not a gate (§7).

---

# PART 0 — INTERPRETATION AND EXECUTION CONTRACT

## 0.1 Interpretation

This is the dependency-ordered superepoch for the campaign-variety, daily
prosecution, Battle Log, cross-medium chord grammar, and self-learning
Contentgen work. It contains nineteen bounded repository epochs, numbered 009
through 027. Each epoch must be materialized under `docs/epochs/<epoch>/`,
with its own `feature.md`, node files, receipts, and integrity evidence,
before that epoch is implemented.

This specification does not itself authorize a model provider, secret,
production D1 mutation, content promotion, GitHub push, Cloudflare deployment,
or live campaign migration. Those remain separate execution or release
operations.

The word **train** has one precise meaning here. The command compiler and the
campaign state machine remain deterministic authorities. Authenticated human
curation trains a versioned, deterministic quality policy that ranks grammar
candidates, identifies informative failures, proposes exclusion prisms, and
allocates future samples. A learned policy cannot create semantic intent,
mechanics, state, actors, outcomes, or commands.

The word **Romantic** means elevated human narrative: loyalty, attachment,
honor, memory, sacrifice, private obligation, institutional affection, and the
cost of treating persons as instruments. It does not require a dating or
sexual plot.

## 0.2 Normative language

- **MUST / SHALL / NEVER** — absolute; deviation is a stop condition.
- **MUST NOT GUESS** — where this specification pins a value, an executor
  never substitutes its own value.
- **Stop condition** — the executing agent halts the current node, records
  the failure in the epoch's receipts (append-only), and does not proceed to
  later nodes or epochs.

## 0.3 Reading order for every implementing agent

1. `AGENTS.md` (hosting topology, data safety, planning-memory rule).
2. `SUBSTRATE_DOCTRINE.md` (product law; §19 defines the epoch/node receipt
   doctrine this document uses).
3. This document, Parts 0–5 in full, plus the sections of Part 6 covering the
   assigned epoch and its dependencies.
4. Every dependency epoch's receipts.
5. `docs/parking-lot/README.md` and every overlapping parking-lot epoch
   (AGENTS.md planning-memory rule).

An executor needs no other specification. The original proposal and its
corrigendum were consolidated into this document and then removed from the
repository; **this document is the only authority** (Appendix C records every
difference from the original proposal).

## 0.4 Ratification of pinned values

Values marked **(ratify@NNN)** are binding v1 contract values. They may be
changed only at epoch NNN with a human-signed receipt that restates the old
and new value. Absent that receipt, the pinned value is law. Values without a
ratification tag are final within this superepoch.

## 0.5 New-ambiguity rule

If any instruction here is ambiguous, contradictory, or refers to a thing that
does not exist, that is a **stop condition**, not an invitation to improvise.
Record the ambiguity in the epoch's `feature.md` and halt the node.

## 0.6 Receipt integrity

All receipts are append-only per `SUBSTRATE_DOCTRINE.md` §19. Failed commands
stay in the record with their output; corrections are appended, never
rewritten. Every node command/result is appended to
`DELENDA_QUEST_UBERDOC.md`.

---

# PART 1 — VALIDATION PROVENANCE AND FROZEN BASELINE

## 1.1 What was validated (2026-08-03, against the live repository)

- **Epoch 008 authentication (original §1): fully confirmed.** Commit
  `0e4daf7266cd1e3f365adc47a4983f76779633e5` exists and is contained in
  `origin/main`; `npm run test:ava-content-quality` passes 4/4;
  `npm run test:ava-content-quality-epoch-008` passes 3/3; `npm run typecheck`
  exits 0 — all re-executed live during validation. The commit adds the
  declared approved, rejected, and calibration corpora; deterministic BM25,
  TF-IDF, and MinHash retrieval; weak-label aggregation; watcher attribution;
  promoted-manifest verification; and focused tests. Epoch 008's two
  documentation defects are confirmed real (§6, Epoch 009): its README line 3
  reads "Status: implemented locally; not pushed or deployed" although the
  commit is pushed, and the epoch directory contains `README.md` + `receipts/`
  but no bounded node files. Epoch 008 remains limited: no LLM judge, no
  human curation application, no self-training, no narrative grammar, no
  campaign law, no runtime promotion.
- **Mathematics (original §4.6/§4.7): fully confirmed.** All 35 magnitude
  anchor cells and all 4 Doomsday anchors recompute within documented
  rounding; density is exactly zero for days 1–17 and strictly increasing
  thereafter; the ppm clamp `[50_000, 450_000]` equals `[0.05, 0.45]`.
  Method and full output: Appendix B.
- **Repository anchors for every authority claim:** confirmed (Appendix A).

## 1.2 Frozen repository baseline (re-verified at every owning epoch's preflight)

These facts were verified on 2026-08-03 and are the baseline for all sizing
and inventory rules. A preflight mismatch is a **stop condition with a
recorded diff**, never permission to improvise (§6, Epoch 022 shows the
recount idiom).

| Baseline fact | Value | Evidence |
|---|---|---|
| Manoeuvre mechanics | **7**: `reinforce`, `interdict`, `route`, `abandon`, `exploit`, `breach`, `network` | `MANEUVERS`, `app/game.ts:496`; `MANEUVER_AFTERMATH`, `app/campaign-substrate.ts:414` |
| Theaters | **4**: `industrial` (6 templates), `lowland` (9), `ridge` (6), `river` (6) | `app/campaign-substrate.ts` |
| Campaign phases | **4**: `contact` [1,5], `compression` [6,12], `exhaustion` [13,20], `terminal` [21,30] | `app/game.ts:179,208` |
| Problem classes | **8**: `assault`(3), `command`(1), `counterstroke`(1), `crossing`(2), `exploitation`(1), `force-preservation`(4), `logistics`(2), `observation`(1) | `app/campaign-substrate.ts` |
| Day-resolution authority | `claimDailyResolution` / `redeemDailyResolution` via `app/api/turn/route.ts` | `db/turns.ts:223,388` |
| Canonical resolve-day action | Nexus `{kind:"resolve-day"}` | `app/ava/nexus.ts:866` |
| Gate calculus / dockets | `dailyManeuverDocket` | `app/campaign-substrate.ts:115` |
| Legacy `service record` command | present in `app/ava/{schema,reports,nexus,voice,request-ir,filesystem,terminal,compiler}.ts`, `app/substrate/command-parser.ts`, `app/AccountPage.tsx` | grep-verified |
| Hash idiom | `stableHash(text) = hashInt(text)/4294967295`; duplicated body at `app/substrate/hash.ts:10` and `app/campaign-substrate.ts:113` | grep-verified |
| Balance simulator | `scripts/simulate-campaign-balance.sh` (`npm run simulate:balance`) — Epoch 027 extends it; no second simulator | `package.json` |
| Corpus foundation | `content-quality/corpus/` (Epoch 008) | verified |
| SSH/terminal surfaces | `packages/{ssh-gateway,ssh-server,terminal-core}` | verified |
| Node doctrine exemplar | `docs/epochs/epoch-007-ava-content-quality-decompiler/nodes/NODE-00…09` | verified |

## 1.3 Claims deferred to runtime gates

`npm run build`, `npm run cloudflare:types`, `npm run cloudflare:validate`
were not re-executed during validation (environment-bound). They are executed
by Epoch 009 step 1 where relevant and by the Epoch 027 final gates (Part 5).

---

# PART 2 — NON-NEGOTIABLE REQUIREMENT LEDGER

Every implementation receipt must cite the requirement IDs it satisfies.
Epoch 027 fails if any requirement lacks passing evidence. Bracketed
references point at the frozen law that operationalizes the requirement.

### Campaign and content requirements

- **R01 — Existing-library immutability.** Existing main-campaign and
  subcampaign authored libraries remain byte-identical. New content is stored
  in additive packs. [Immutability manifest: §6 Epoch 009 step 5.]
- **R02 — Semantic linking.** New packs connect to existing mechanics and
  grammar through stable typed IDs. Filesystem symbolic links are not used;
  semantic links provide the intended metastratum without deployment and
  platform fragility. [`ContentLink`: §6 Epoch 019 step 2.]
- **R03 — Exactly three primary tiers.** Main campaign content uses `routine`,
  `romantic`, or `escalatory`. Escalatory content declares `standard` or
  `maximum` intensity. Doomsday is a terminal-risk class on escalatory content,
  not a fourth ordinary tier. [Tier/intensity legality: §4.12(a).]
- **R04 — Main-thread Romantic epochs.** Romantic choices occupy the main
  campaign thread for one to three resolved days rather than appearing as a
  decorative Domestic or Network side panel. [Beat = day: §4.12(d).]
- **R05 — Narrative coverage guarantee.** Every campaign that reaches the end
  of day 30 resolves at least three distinct Romantic epochs. [Completion
  counting and the construction guarantee: §4.12(d)(e).]
- **R06 — Operational continuity.** An issued operation may persist for
  multiple days. It continues under standing intent while a Romantic epoch
  occupies the main thread. [§4.12(e) note; §6 Epoch 021.]
- **R07 — More manoeuvre content.** New procedure frames and realizations
  substantially expand the existing finite manoeuvre mechanics without
  silently inventing new mechanics. [Mechanic registry freeze: §1.2; §6
  Epoch 022.]
- **R08 — Dramatic contrast.** Procedure frames include materially different
  operational geometries, stakes, institutions, costs, and consequences.
- **R09 — Heat alternation.** Every resolved main-thread beat alternates
  strictly between `hot` and `medium`. Registries fail validation if an
  eligible transition cannot provide the required opposite heat. [Both-heat
  mandate: §4.12(f); initial heat: §4.12(c).]
- **R10 — Slow exponential magnitude.** Costs and results rise on a bounded,
  versioned 30-day curve, with larger late-run event scale. [Tables: §4.11.]
- **R11 — Doomsday density.** Eligible Doomsday occurrences become denser
  toward day 30 using a precomputed asymptotic schedule. Each occurrence owns
  a separate sealed roll that may end the campaign. [Eligibility mask and
  suppression: §4.12(e); tickets: §4.2.]
- **R12 — Daily prosecution.** Every resolved day persists a semantic
  execution scene that prosecutes issued orders, continuing operations,
  domestic/network consequences, losses, movement, and residues. [Scene
  contract: §4.17; §6 Epoch 025.]
- **R13 — Battle Log.** The in-campaign Service Record becomes Battle Log and
  opens on the just-resolved execution after a manual Resolve Day transition.
  [Surface matrix: §4.15; §6 Epoch 026.]
- **R14 — Permanent records preserved.** Account-level completed Campaign
  Records retain their current purpose. The legacy `service record` command
  may remain as a compatibility alias but resolves to Battle Log only in an
  active campaign context. [Alias behavior: §6 Epoch 026 step 6.]
- **R15 — Register.** New briefs and execution prose remain cold, ruthless,
  authoritative, compressed, concrete, and doctrinal. They may demand
  inference from the reader but may not become obscure, generic, sentimental,
  slangy, omniscient, or mechanically vague. [Register features/gates: §6
  Epoch 012; reason codes: §4.8.]

### Contentgen and learning requirements

- **R16 — Canonical doctrine.** Contentgen law is appended to
  `SUBSTRATE_DOCTRINE.md`. No duplicate `Doctrine.md` is created.
- **R17 — Shared chord core.** Ava and narrative generation use one shared
  chord feature vocabulary where the problem is genuinely shared. [§4.4.]
- **R18 — Problem-set conformance.** Ava, campaign briefs, Romantic arcs,
  manoeuvre procedures, and execution scenes retain separate projections,
  gates, weights, and promotion manifests. [§4.5.]
- **R19 — Precomputation.** Enumerate, normalize, index, gate, score, and
  promote offline. The player request path performs verified lookup,
  deterministic binding, and rendering only.
- **R20 — Appified internal workflow.** An admin-only Contentgen Lab behaves
  like a first-class product surface while remaining a development tool.
- **R21 — Compliant grammar lists.** A seeded batch generates an ordered list
  of bounded grammar recipes and records whether each recipe compiles.
- **R22 — Complete authenticated disposition.** A batch cannot close until
  every emitted candidate has one authenticated disposition. A compliant
  candidate requires `QUALITY_MET` or `QUALITY_NOT_MET`; a hard failure
  requires `FAILURE_CONFIRMED` or `GATE_FALSE_POSITIVE`. [Closure rules:
  §4.7.]
- **R23 — `#failures` and `#curious`.** Deterministic gates own absolute
  failure tags. The optional AI judge prioritizes those failures and identifies
  informative, novel, uncertain, or cross-medium-disputed candidates as
  `#curious`. [Queue law: §4.9.]
- **R24 — Alive and dead corpus.** Approved, rejected, adversarial, curious,
  and revised candidates persist across sessions with full lineage. Rejected
  "corpses" are never discarded merely because their immediate use is unknown.
- **R25 — Manual reductions.** An operator may reduce or spot-edit a candidate.
  The original remains immutable; the edit creates a child candidate with a
  recorded transformation and feature delta. [Identity rules: §4.7(a).]
- **R26 — AI pre-score.** The optional judge receives frozen contracts,
  deterministic evidence, and bounded high-quality/failed analogues. Its
  output is checklist evidence and review priority, never authority.
  [Analogue bound: §4.9.]
- **R27 — Actual compiler training.** Authenticated labels fit a deterministic,
  versioned quality policy. The policy changes sampling and ranking only after
  independent held-out evaluation and explicit promotion. [Trainer: §4.5;
  promotion: §4.9.]
- **R28 — Exclusion prisms.** Hard exclusions are explicit predicates. Learned
  failure clusters may propose new prisms, but a proposal must report its full
  blast radius and cannot activate automatically. [§4.6.]
- **R29 — Three-layer repair.** Review evidence can identify the source
  grammar, exclusion prism, or learned ranker as the faulty layer. One repair
  changes one layer per epoch receipt.
- **R30 — Deterministic RAG ledger.** Retrieval over approved and rejected
  examples is local, versioned, deterministic, and evidence-only. [Novelty:
  §4.9.]
- **R31 — Cross-medium transfer.** Shared weights transfer only shared features.
  Medium-specific residual weights and gates prevent Ava safety or narrative
  taste from being flattened into one score. [§4.5.]
- **R32 — No automatic rewriting or publication.** AI and learned policies do
  not rewrite failed prose or publish candidates into runtime manifests.

### Verification and operations requirements

- **R33 — Independent validation.** Artifact validators do not import
  generator, scheduler, scorer, or renderer implementations. [Neutral-schema
  exception: §6 Epoch 027 validator separation rule.]
- **R34 — Non-tautological evidence.** Hand-authored oracles, mutation
  fixtures, metamorphic properties, held-out labels, and cross-surface semantic
  comparisons validate outputs independently of their producers.
- **R35 — Determinism and provenance.** Same source, versions, policy, seed,
  and visible state produce byte-identical artifacts; every change identifies
  its changed input layer. [Serialization: §4.3; hash idiom: §4.2.]
- **R36 — Persistence and idempotency.** Review writes and game mutations use
  stable IDs, optimistic revisions, idempotency keys, and append-only audit
  records.
- **R37 — Discovery protection.** Players and ordinary APIs cannot inspect the
  latent content catalog, future itinerary, quality corpus, labels, model
  evidence, seeds, or terminal tickets. [Seals: §4.2 item 6.]
- **R38 — Surface parity.** Web, Ava/Nexus, terminal-core, and native SSH render
  the same disclosed semantic result where each surface supports the operation.
  [Support matrix: §4.15.]
- **R39 — No live-model dependency.** No player request, day resolution, docket
  selection, Battle Log read, or Ava Classic route depends on a live model.
- **R40 — Cloudflare topology preserved.** No Pages, Sites, alternate identity,
  second D1, or additional hosting control plane is introduced.
- **R41 — Effective abundance.** The latent Labyrinth is finite and
  exhaustively describable but combinatorially large. Capacity, eligible
  capacity, distribution entropy, collision rate, and 30-day repetition are
  measured; "limitless" is never asserted from raw template count alone.
  [Calculus: §4.13.]

---

# PART 3 — GOVERNING AUTHORITY MAP

| Concern | Authority | Permitted extension | Forbidden extension |
|---|---|---|---|
| Campaign state and outcomes | `app/game.ts`, circuits, canonical Nexus action route | typed metastratum state and declared mechanics | client-owned calculation or prose-owned outcome |
| Day-resolution authorization | `db/turns.ts`, persisted resolution grants, Nexus `resolve-day` | semantic resolution output persisted in the same transition | second resolver or post-hoc reroll |
| Campaign selection | shared gate calculus and persisted dockets | deterministic main-thread scheduler | client reroll or hidden catalog disclosure |
| Existing campaign prose | current authored libraries | read-only import by stable ID | interpolation into or mutation of existing files |
| Ava intent | Ava compiler and Nexus | read-only projection of new semantic objects | learned intent, learned commands, or quality-driven execution |
| Chord grammar | versioned shared metagrammar plus medium projections | shared evidence and medium-specific constraints | treating one medium's style as another medium's semantics |
| Content quality | deterministic gates, authenticated labels, promoted policy | ranking, sampling, proposed rules | game law, hidden truth, or automatic publication |
| Human review workflow | admin-authenticated Contentgen service | append-only adjudication and reduction lineage | anonymous promotion or client-only mutation |
| Optional AI judge | constrained offline evidence adapter | priority and checklist evidence | hard-gate override, rewriting, or promotion |
| Runtime content | Git-versioned promoted manifests | verified lookup and deterministic composition | direct use of unreviewed D1 rows or model output |
| Presentation | Briefing, Ava, terminal, SSH adapters | render canonical semantic objects | duplicate mechanics or inferred hidden state |

---

# PART 4 — FROZEN GLOBAL LAW

Everything in this part is contract. Epochs implement and reference these
sections; no epoch may redefine, duplicate, or locally override them. Where a
value carries **(ratify@NNN)**, §0.4 governs.

## 4.1 Glossary

| Term | Binding meaning |
|---|---|
| **phase** | `CampaignPhaseId`: `contact` [1,5], `compression` [6,12], `exhaustion` [13,20], `terminal` [21,30] (`app/game.ts:179,208`). The word "era" in any prior text means phase; new text says "phase" only. |
| **theater** | One of `industrial`, `lowland`, `ridge`, `river` (§1.2). |
| **problem class** | One of `assault`, `command`, `counterstroke`, `crossing`, `exploitation`, `force-preservation`, `logistics`, `observation` (§1.2). |
| **manoeuvre mechanic** | An entry of the `MANEUVERS` registry (`app/game.ts:496`); currently seven (§1.2). |
| **beat** | The unit of a Romantic arc; exactly one per resolved day (§4.12(d)). |
| **guaranteed slot** | One of the three precomputed hidden narrative slot envelopes (A/B/C, §4.12(d)). |
| **suppressed occurrence** | A Doomsday occurrence ticket whose roll succeeded on a day masked by §4.12(e); recorded sealed, never rerolled, never disclosed. |
| **corpse** | A rejected candidate retained forever in the dead corpus (R24). |
| **canary** | A known-good / known-bad / known-weird stability fixture (Epoch 013 partition). |
| **ticket** | A canonical colon-joined hash input string (§4.2). |
| **rollPpm** | Integer in `[0, 999999]` derived from a ticket (§4.2). |
| **terminal disposition** | One of `QUALITY_MET`, `QUALITY_NOT_MET`, `FAILURE_CONFIRMED`, `GATE_FALSE_POSITIVE` (§4.7). `REVISE` is not terminal. |
| **terminal risk** | A class on escalatory content (`none` or `doomsday`); never a fourth tier (R03). |

## 4.2 Deterministic hash and roll contract (ratify@010)

1. **Hash.** `stableHash(text) = hashInt(text) / 4294967295 ∈ [0, 1]`, the
   repository's existing convention (`app/substrate/hash.ts:10`). Input
   encoding: UTF-8, NFC. Ticket strings join components with a single colon
   (`:`); no component may itself contain a colon (IDs are slug-safe by
   contract).
2. **Roll.** `rollPpm(ticket) = min(999_999, floor(stableHash(ticket) ×
   1_000_000))`. The `min` clamp is mandatory: `stableHash` can return exactly
   `1.0`, and an unclamped roll of `1_000_000` would break ppm comparisons and
   fixed tables. Event tests are strict: an event occurs iff
   `rollPpm(ticket) < densityPpm[day]`.
3. **Uniform integer in `[lo, hi]`.** `lo + min(hi - lo,
   floor(stableHash(ticket) × (hi - lo + 1)))` — same boundary-clamp reason.
4. **Canonical ticket grammars.** Any use outside this table requires a
   contract-version bump:

   | Purpose | Ticket grammar |
   |---|---|
   | Enumeration local seed | `"${globalSeed}:${medium}:${productionId}"` |
   | Attestation sample | `"${globalSeed}:attest:${recipeId}:${classId}:${attempt}"` |
   | Initial heat | `"${campaignSeed}:0:initial-heat"` |
   | Slot start draw | `"${campaignSeed}:slot:${slotId}:${attempt}"` |
   | Slot duration draw | `"${campaignSeed}:slot:${slotId}:${attempt}:dur"` |
   | Arc selection score | `"${campaignSeed}:${slotId}:${day}:${arcId}"` |
   | Doomsday occurrence | `"${contentVersion}:${campaignSeed}:${day}:doomsday-occurrence"` |
   | Doomsday terminal | `"${contentVersion}:${campaignSeed}:${day}:${eventId}:${stateSeal}"` |
   | Audit sampler | `"${batchSeed}:audit:${k}"` |
   | Weighted sampler | `"${batchSeed}:weighted:${k}"` |
   | Group split | `"${corpusVersion}:group-split:${groupKey}"` |

   The audit and weighted sampler streams are disjoint by construction, so
   audit draws never depend on learned state.
5. **Seed derivation idiom (recursive reuse).** Every deterministic stream in
   this superepoch — enumeration, attestation, slot draws, sampling, split
   assignment, arc selection, occurrence, terminal rolls — is a row in the
   table above, derived from one campaign/batch/corpus seed plus fixed
   purpose strings. New purposes extend the table; they never invent a second
   derivation scheme.
6. **State seal.** `canonicalVisibleAndAuthorityStateSeal` =
   `String(rollPpm("seal:" + canonicalJSON({visibleState, authorityStateDigest})))`
   where `canonicalJSON` is the §4.3 serialization and `authorityStateDigest`
   is the digest of the authority-side state fields the campaign authority
   declares seal-relevant. The seal commits the roll to the state without
   disclosing hidden fields: only the 6-digit seal string is persisted with
   the ticket.
7. **Consolidation.** The duplicated `stableHash` body at
   `app/campaign-substrate.ts:113` is deleted by Epoch 019 in favor of the
   single shared import; no third copy may be created anywhere.

## 4.3 Canonical serialization (ratify@010)

Defined once by Epoch 010 and imported everywhere: canonical JSON with UTF-8
NFC text, object keys ordered by Unicode codepoint, no insignificant
whitespace, fixed number rendering, and an explicit hash-exclusion list
(fields such as `generatedAt` that never participate in identity hashes).
Artifact identity hashes exclude timestamps; content hashes include
everything else. Version-bump rules for every contract/schema live here.

## 4.4 Grammar recipe and candidate boundary

A **grammar recipe** is the reviewable unit. It declares a finite composition
pattern and legal typed bindings. A **bound realization** is a deterministic
instance of a promoted recipe. Human reviewers authenticate every recipe in a
batch; equivalence-class attestation (below) and hard gates prove that legal
bindings preserve the recipe's semantic and safety profile. This boundary
permits a very large Labyrinth without pretending a human can review millions
of trivial sector-name substitutions.

```ts
type ContentMedium =
  | "ava"
  | "campaign-brief"
  | "maneuver-procedure"
  | "romantic-arc"
  | "execution-scene";

type SharedChord = {
  tensionId: string;
  intentClass: "inspect" | "compare" | "decide" | "witness";
  actorRoles: readonly string[];
  temporalShape: "instant" | "continuation" | "delay" | "closure";
  pressureShape: "scarcity" | "exposure" | "obligation" | "irreversibility";
  evidenceShape: "observed" | "estimated" | "declared" | "unavailable";
  consequenceShape: "cost" | "exchange" | "residue" | "terminal-risk";
};

type GrammarRecipe = {
  id: string;
  version: string;
  medium: ContentMedium;
  chord: SharedChord;
  spineId: string;
  mechanicRefs: readonly string[];
  slots: readonly SlotContract[];
  requiredClaims: readonly string[];
  forbiddenClaims: readonly string[];
  registerProfileId: string;
  equivalenceClasses: readonly BindingClass[];
};

type GrammarCandidate = {
  candidateId: string;
  recipe: GrammarRecipe;
  representativeBindings: Record<string, string | number | boolean>;
  semanticPlan: unknown;
  text: string;
  provenance: CandidateProvenance;
  parentCandidateId: string | null;
};
```

**Attestation rule (ratify@011).** Per equivalence class: attest every
canonical representative plus a seeded sample of `min(8, |class|)` additional
distinct bindings drawn by the §4.2 attestation stream. A binding outside
every attested class abstains; abstentions are emitted to the failure JSONL
with reason `UNATTESTED_BINDING`.

**Normalization projections P0–P4 (ratify@012).** The decompiler's five
projections are defined exactly: **P0** raw bytes preserved; **P1** NFC
normalized; **P2** NFC + case-folded; **P3** whitespace/punctuation-collapsed
token stream; **P4** rhetorical-shape skeleton. Every feature records which
projection evidenced it.

## 4.5 Shared and medium-specific quality model (trainer config ratify@010, frozen by Epoch 017)

The trainable score has a shared term and a medium residual. It never replaces
hard gates.

```text
logit(candidate, medium) =
    intercept[medium]
  + dot(sharedWeights, sharedFeatures(candidate))
  + dot(mediumWeights[medium], mediumFeatures(candidate))

qualityProbability = sigmoid(logit)
```

The deterministic trainer minimizes grouped, L2-regularized logistic loss.
Sibling realizations from one recipe, chord family, or edit lineage remain in
the same train or held-out group.

Shared features may include compression, claim count, concrete/abstract ratio,
causal structure, continuity evidence, and duplicate distance. Ava-only
features include intent lowering, clarification safety, and action/read
separation. Narrative-only features include dramatic pressure, consequence
closure, image-family exhaustion, and progression shape.

**Trainer configuration v1** (the only source of hyperparameters; deviation
requires human ratification per §0.4):

| Parameter | v1 value |
|---|---|
| Feature order | codepoint-ascending feature IDs, fixed in contract |
| Weight initialization | all zeros (shared and medium residuals) |
| Iterations | 500, fixed |
| Learning rate | `lr(t) = 0.2 / (1 + 0.01·t)`, `t` = 1-based iteration |
| L2 penalty λ | 1e-4 (shared and medium weights alike) |
| Group key | `recipeLineage \| chordFamily \| productionFamily` |
| Split | 70% train / 15% calibration / 15% held-out, by ascending `stableHash("${corpusVersion}:group-split:${groupKey}")` rank of group key |
| Train order | codepoint-ascending candidate IDs within each iteration |
| Arithmetic | IEEE-754 doubles, accumulation in stream order, no parallelism-dependent reduction |
| Threshold calibration | per medium, on calibration groups only: maximize Youden's J subject to false-negative rate ≤ ceiling (§4.9) |
| Policy identity | hash of {config, corpus version, feature order, weights}; excludes timestamps |

## 4.6 Prism and blast-radius model

An exclusion prism is a named, versioned predicate over decompiled evidence.

```ts
type ExclusionPrism = {
  id: string;
  version: string;
  applicableMedia: readonly ContentMedium[];
  predicate: PredicateAst;
  failureClass: string;              // closed enum §4.8(b)
  rationale: string;
  fixtures: readonly string[];
};

type BlastRadius = {
  prismId: string;
  affectedCandidateIds: readonly string[];
  affectedApprovedCanaries: readonly string[];
  byMedium: Record<string, number>;
  byChord: Record<string, number>;
  confirmedFailureRate: number | null;
  falsePositiveRate: number | null;
};
```

**Rate definitions.** Over the prism's affected set restricted to
authenticated candidates: `confirmedFailureRate = |FAILURE_CONFIRMED| /
|authenticated|`; `falsePositiveRate = |QUALITY_MET| / |authenticated|`. If
`|authenticated| = 0`, both rates are `null` and the proposal is ineligible
for review until evidence exists. `byMedium`/`byChord` counts cover the full
affected set regardless of authentication.

**Proposal precision.** In meta-rule mining, `precision =
confirmedFailureRate` computed over training groups only (never calibration or
held-out). Proposal retention thresholds: support ≥ 12 authenticated failures,
precision ≥ 0.95, evidence spanning ≥ 2 review sessions, zero affected
approved canaries. Proposals emit `PROPOSED`, never `ACTIVE`; they activate
only through human review of the predicate, its complete blast radius,
independent mutation fixtures, and canary results.

## 4.7 Review lifecycle and closure

```text
DRAFT
  -> COMPILED | HARD_FAILURE
  -> QUEUED
  -> AUTHENTICATED
  -> PROMOTION_CANDIDATE | DEAD_CORPUS | REVISION_REQUESTED
  -> PROMOTED only through a Git-versioned manifest epoch
```

**(a) Disposition closure (ratify@014).** `QUALITY_MET` →
`PROMOTION_CANDIDATE`; `QUALITY_NOT_MET` → `DEAD_CORPUS`;
`FAILURE_CONFIRMED` → `DEAD_CORPUS` with its §4.8(b) failure class.
`REVISE` → parent enters `REVISION_REQUESTED` and a child candidate (new
`candidateId`, `parentCandidateId` = parent, recorded transformation and
feature delta per R25) is appended to the **same** batch; the parent counts as
resolved only once the child exists in the batch. `GATE_FALSE_POSITIVE` →
opens a prism-repair issue; the candidate is terminal for its batch, persists
immutably in the dead corpus linked to the issue, and any later recompilation
under a newer prism version is a **new** candidate (new `candidateId`,
lineage parent = original) in a **future** batch. Reviews are append-only; no
disposition overwrites a prior review row. A hard gate cannot be overridden
in place.

**(b) Batch closure (ratify@014).** A batch closes iff every candidate it
contains — including revision children admitted during review — has a terminal
disposition (§4.8(d)). `unresolvedCandidateCount` counts children from
admission, not from batch creation.

## 4.8 Closed taxonomies v1 (ratify@010)

**(a) Review reason codes (14 + escape):** `REGISTER_BREAK`,
`MECHANIC_MISMATCH`, `HIDDEN_STATE_RISK`, `UNSUPPORTED_CLAIM`,
`CONTINUITY_BREAK`, `DUPLICATE_IMAGE`, `GENERIC_ABSTRACTION`,
`SENTIMENTALITY`, `SLANG_REGISTER`, `OMNISCIENCE`, `UNEXPLAINED_JARGON`,
`CHORD_MISMATCH`, `WEAK_CONSEQUENCE`, `CLAIM_BUDGET_BREACH`,
`OTHER_WITH_NOTE` (requires a free-text note).

**(b) Failure classes (13):** `HIDDEN_OUTCOME`, `IMPERATIVE_ORDER`,
`ACTOR_SWAP`, `TEMPORAL_CONTRADICTION`, `GENERIC_ABSTRACTION`,
`SENTIMENTALITY`, `DUPLICATE_IMAGE`, `UNSUPPORTED_RESOURCE`,
`CONFUSABLE_SPELLING`, `FALSE_MECHANIC_CLAIM`, `BEAUTIFUL_BUT_IRRELEVANT`,
`RELEVANT_BUT_DEAD`, `NOVEL_BUT_INCOHERENT`. The three quality classes are
distinct from gate classes and are never collapsed into one another.

**(c) Priority bands:** `P0 ≥ 0.85`, `P1 ≥ 0.65`, `P2 ≥ 0.45`, `P3 < 0.45`
over normalized priority.

**(d) Disposition legality matrix:**

| Compile status | Legal dispositions | Terminal? |
|---|---|---|
| `COMPILED` | `QUALITY_MET`, `QUALITY_NOT_MET`, `REVISE` | yes, yes, no |
| `HARD_FAILURE` | `FAILURE_CONFIRMED`, `GATE_FALSE_POSITIVE` | yes, yes |

Every disposition carries one or more §4.8(a) reason codes.

---

## 4.9 Quality thresholds, queue law, novelty, and analogues (ratify@010; promotion values ratify@018)

**Promotion gate values.** Held-out log-loss noninferiority margin
Δ = 0.005 vs. the last promoted policy; per-medium false-negative
ceiling = 0.10; balanced accuracy must not regress vs. the promoted baseline;
zero canary flips tolerated on a policy swap; every weight must have a
declared feature and medium scope.

**Queue law (Epoch 016 implements exactly this):**

```text
if compileStatus == HARD_FAILURE:
  lane = "#failures"                 // deterministic ownership
  priority = failureSeverity + judgeInformationValue
else:
  entropy = binaryEntropy(learnedOrWeakQualityProbability)
  curiosity = weighted(
    entropy,                          // weight 0.35
    novelty,                          // weight 0.20
    judgeDeterministicDisagreement,   // weight 0.20
    crossMediumTransferDisagreement,  // weight 0.15
    chordCoverageDeficit              // weight 0.10
  )
  lane = curiosity >= 0.65 ? "#curious" : "compliant"

stableSort by lanePriority, priority desc, candidateId asc
```

- **Probability fallback chain** (per candidate, source recorded on the queue
  row): latest promoted policy → Epoch 008 weak-label aggregate → constant
  0.5 (maximum entropy).
- **`judgeId = NONE` mode:** `judgeInformationValue = 0` and
  `judgeDeterministicDisagreement = 0`; curiosity is computed from the
  remaining terms with the same weights; the queue stays deterministic; no UI
  element may display AI provenance; the batch manifest records
  `judgeId: "NONE"`.
- **Novelty (ratify@013):** `novelty(candidate) = 1 − max(sim(candidate, n))`
  over corpus neighbors `n`, where `sim` is the elementwise maximum of
  normalized BM25 score, TF-IDF cosine, and rhetorical-shape match.
  Directional duplicate thresholds: approved 0.92, rejected 0.90,
  pending 0.94. Changing them is a corpus version bump.
- **Analogues (ratify@016):** judge input carries 4 nearest approved + 4
  nearest rejected analogues, ranked by retrieval score descending, ties by
  `candidateId` codepoint ascending, from the alive/dead corpus only (never
  held-out).
- **Audit slots (ratify@017):** audit slots = `max(1, floor(batchSize ×
  0.2))`, drawn first by the uniform seeded sampler over the complete eligible
  recipe inventory (§4.14); remaining slots follow the curiosity-weighted
  sampler.

## 4.10 Campaign metastratum types

```ts
type CampaignTier = "routine" | "romantic" | "escalatory";
type EscalationIntensity = "none" | "standard" | "maximum";
type TerminalRisk = "none" | "doomsday";
type ProcedureHeat = "hot" | "medium";

type ActiveOperation = {
  operationId: string;
  maneuverId: string;
  sectorId: string;
  startedDay: number;
  durationDays: 2 | 3;
  stageIndex: number;
  standingIntentId: string;
  mechanicSnapshot: unknown;
  status: "active" | "completed" | "aborted" | "collapsed";
};

type ActiveNarrativeEpoch = {
  instanceId: string;
  arcId: string;
  startedDay: number;
  durationDays: 1 | 2 | 3;
  beatIndex: number;
  choiceHistory: readonly string[];
  residueIds: readonly string[];
  status: "active" | "completed" | "interrupted";
};

type NarrativeSlot = {
  slotId: "A" | "B" | "C";
  windowStart: readonly [number, number];   // A:[3,8] B:[10,17] C:[19,27]
  drawnStartDay: number;                    // after §4.12(d) shifts
  durationDays: 1 | 2 | 3;
  guaranteed: true;
  activatedArcId: string | null;
  status: "pending" | "active" | "completed";
  deferralCount: number;                    // 0 or 1 in v1
  drawReceipts: readonly string[];          // every ticket used, in order
};

type CampaignMetastratum = {
  version: string;
  itineraryVersion: string;
  magnitudeTableVersion: string;
  doomsdayTableVersion: string;
  lastResolvedHeat: ProcedureHeat | null;   // null only before day-1 init (§4.12(c))
  activeOperation: ActiveOperation | null;
  activeNarrativeEpoch: ActiveNarrativeEpoch | null;
  narrativeSlots: readonly NarrativeSlot[];
  resolvedNarrativeArcIds: readonly string[];
  exhaustedContentIds: readonly string[];
};
```

Placement and migration law:

- `TerminalRisk` lives on escalatory registry metadata (Epoch 019) and on
  Doomsday event records (Epoch 024); it is intentionally **not** part of
  `CampaignMetastratum`.
- Legacy one-day manoeuvres never create `ActiveOperation`; they complete
  within their resolution day through the existing one-day path. Migration
  initializes the metastratum with `activeOperation: null` for every
  pre-metastratum save; an in-flight legacy manoeuvre on a migrated save
  resolves once through the legacy path and is never replayed into an
  `ActiveOperation` (Epoch 021 step 6).

## 4.11 Precomputed 30-day pacing tables

Three checked-in tables, all integer parts-per-million, all 30 rows, all
generated offline by Epoch 019 and recomputed by an independent validator that
never imports the generator. Runtime code MUST read these tables; it must not
call `Math.exp` to decide campaign effects (enforced by Epoch 027 import
scan).

**(a) Magnitude table.** v1 source formula:

```text
progress(day) = (day - 1) / 29
curve(day) = (exp(2.2 * progress(day)) - 1) / (exp(2.2) - 1)

routine(day)             = 1.00 + 0.35 * curve(day)
romantic(day)            = 1.00 + 0.80 * curve(day)
escalatoryStandard(day)  = 1.15 + 1.35 * curve(day)
escalatoryMaximum(day)   = 1.40 + 2.10 * curve(day)
```

Hand-checked anchors, rounded for documentation (independently recomputed and
verified 2026-08-03; Appendix B):

| Day | Curve | Routine | Romantic | Escalatory standard | Escalatory maximum |
|---:|---:|---:|---:|---:|---:|
| 1 | 0.0000 | 1.000 | 1.000 | 1.150 | 1.400 |
| 5 | 0.0442 | 1.015 | 1.035 | 1.210 | 1.493 |
| 10 | 0.1220 | 1.043 | 1.098 | 1.315 | 1.656 |
| 15 | 0.2358 | 1.083 | 1.189 | 1.468 | 1.895 |
| 20 | 0.4021 | 1.141 | 1.322 | 1.693 | 2.244 |
| 25 | 0.6450 | 1.226 | 1.516 | 2.021 | 2.754 |
| 30 | 1.0000 | 1.350 | 1.800 | 2.500 | 3.500 |

Every scalable mechanic declares its scalable axes, rounding rule, and caps.
Copy never controls scaling.

**(b) Doomsday occurrence table.** v1 occurrence density is zero before day 18
and approaches a 42% daily cap thereafter:

```text
doomsdayOccurrence(day) =
  0                                           when day < 18
  0.42 * (1 - exp(-0.24 * (day - 17)))       otherwise
```

Anchors (verified): 0.090 on day 18, 0.216 on day 20, 0.358 on day 25, 0.401
on day 30 after rounding. Occurrence is not game termination. A selected
Doomsday event owns a separate declared terminal-risk envelope, bounded to
`[0.05, 0.45]` = `[50_000, 450_000]` ppm, and a sealed deterministic
resolution roll (§4.2).

**(c) Late-run terminal adjustment table.** `lateRunAdjustmentPpm[30]`: per-day
terminal-probability adjustment consumed by the Epoch 024 terminal formula.
**v1 is thirty rows of integer 0.** It may take non-zero values only in a
later table version justified by Epoch 027 balance evidence; the independent
table validator asserts all zeros in v1.

Balance simulation in Epoch 027 may reject these v1 constants and require a
new table version; it may not tune them silently.

## 4.12 Campaign scheduler determinate rules

**(a) Tier/intensity legality and magnitude rows.** Legal pairings:
`routine → none`; `romantic → none`; `escalatory → standard | maximum`.
Validators reject any other pairing. Magnitude row selection: routine tier →
`routine(day)`; romantic tier → `romantic(day)`; escalatory+standard →
`escalatoryStandard(day)`; escalatory+maximum → `escalatoryMaximum(day)`.
Doomsday events use the escalatory row of their declared intensity.

**(b) Main-thread prompt contract:**

```ts
type MainThreadPrompt =
  | { kind: "routine"; situation: RoutinePrompt; continuingOperation: OperationSummary | null }
  | { kind: "operation"; operation: OperationPrompt }
  | { kind: "romantic"; arc: NarrativePrompt; continuingOperation: OperationSummary | null }
  | { kind: "escalatory"; event: EscalatoryPrompt; continuingOperation: OperationSummary | null };
```

Doomsday beats travel in the `escalatory` variant (R03).

**(c) Initial heat.** At campaign initialization, draw
`ticket = "${campaignSeed}:0:initial-heat"`; `rollPpm(ticket) < 500_000` →
`"hot"`, else `"medium"`. Persist as the day-1 docket's heat before
presentation. Thereafter `lastResolvedHeat` is never null on an active
campaign.

**(d) Beats, slots, and the R05 construction guarantee.** Exactly one beat
per resolved day; `arc.durationDays === arc.beatCount`; a day never contains
two beats of one arc. Campaign initialization precomputes the three
guaranteed hidden slots with this deterministic rejection stream (slots A, B,
C in order; attempt counter `k = 0, 1, 2, …`):

```text
loop:
  start    = uniformInt(windowLo, windowHi, "${campaignSeed}:slot:${slotId}:${k}")
  duration = uniformInt(1, 3,               "${campaignSeed}:slot:${slotId}:${k}:dur")
  interval = [start, start + duration - 1]
  accept iff interval ⊆ [1, 30] and interval ∩ every accepted slot interval = ∅
  else k += 1
```

Rejection history is part of `drawReceipts`; pairwise disjointness is a
construction property, not a post-hoc rejection. Fit-by-30 holds by window
construction (max occupancy day 29) and is asserted anyway. Only arcs with
`status == "completed"` count toward R05; §4.12(e) makes three completions a
construction guarantee for every campaign reaching day 30, and validators
assert completion, not activation.

**(e) Doomsday eligibility mask and suppression.** `eligibleDoomsdayInterrupt(state)`
returns false when (i) any guaranteed slot arc is active, or (ii) today is any
pending guaranteed slot's last feasible start day (`31 − durationDays`), or
(iii) the occurrence roll fails. A roll that succeeds while (i) or (ii) holds
is a **suppressed occurrence**: recorded in the sealed itinerary as
`SUPPRESSED` with its ticket, never disclosed, never rerolled. The scheduler
evaluates the Doomsday branch before the continuation branch **only** when the
active arc is optional; in v1 (h) the continuation-first order stands
unchanged. If the Doomsday branch fires on a pending slot's drawn start day
and `drawnStartDay < 31 − durationDays`, the slot's `drawnStartDay` increments
by one (persisted; `deferralCount` becomes 1); on the last feasible start day
the slot activates and the occurrence is suppressed instead. "Suspended
continuity" applies to `ActiveOperation` standing intent only: the
operation's continuation is noted across the interrupt day and resumes without
a new order (R06).

**(f) Heat alternation.** Every resolved main-thread beat alternates strictly
(R09). Every Romantic arc MUST declare both hot and medium realizations for
every beat; every Escalatory and Doomsday family MUST declare legal hot and
medium realization paths; the always-eligible fallback arc in every phase
must support both heats unconditionally. Registry validators fail any pack
that cannot provide the required opposite heat for an eligible transition.

**(g) Arc selection.** Among eligible arcs for an activating slot, compute
`score(arcId) = stableHash("${campaignSeed}:${slotId}:${day}:${arcId}")`;
select the lowest score; remaining ties break by `arcId` codepoint ascending.
Selection is a pure function of persisted state and re-derives identically on
reopen. Every phase contains an always-eligible fallback arc so the R05
guarantee cannot fail.

**(h) Optional Romantic arcs.** v1 ships **zero** optional arcs: the optional
count is the constant 0, not a draw. The scheduler branch and the
`interrupted` arc status remain as forward-compatible contract surface,
exercised only by validator fixtures, never by v1 runtime. Enabling optional
arcs requires a new itinerary version with its own validator suite; it is not
reachable by configuration.

**(i) Main-thread scheduling algorithm (Epoch 020 implements exactly this):**

```text
scheduleMainThread(state):
  if state.status != active: return noDocket
  requiredHeat = opposite(state.metastratum.lastResolvedHeat)

  if activeNarrativeEpoch has next beat:            // v1: always continuation-first
    return persistedContinuationBeat(requiredHeat)

  if eligibleDoomsdayInterrupt(state):              // masked per §4.12(e)
    return selectDoomsdayBeat(requiredHeat)

  if narrativeSlotStartsToday(state):               // after §4.12(e) deferral
    return activateEligibleNarrativeArc(requiredHeat)

  if activeOperation requires a decision beat:
    return operationDecisionBeat(requiredHeat)

  return selectOperationalBeat(requiredHeat)
```

Every selected docket is persisted before presentation.

## 4.13 Effective-abundance calculus

Every promoted recipe declares finite binding domains and exclusions. The
enumerator reports exact capacity rather than estimating it from prose volume:

```text
rawCapacity(recipe) = product(cardinality(slotDomain) for every slot)
legalCapacity(recipe) = count(bindings that satisfy every declared constraint)
packCapacity = sum(legalCapacity(recipe) for every promoted recipe)
```

Capacity is diagnostic, not a quality score. Acceptance targets (v1):

- at least 100,000 legal bound realizations across the new campaign packs;
- no exact bound-realization repeat within one 30-day campaign;
- no spine repeat inside its declared cooldown;
- exact-realization collision probability below 0.5% (point estimate) across
  the simulation suite;
- per-tier and per-medium effective sample size reported, so a huge unused
  tail cannot disguise repetitive visible selection.

**Simulation suite (ratify@027):** 10,000 seeded 30-day campaign simulations,
extended through the existing `scripts/simulate-campaign-balance.sh` harness
(never a second simulator), reporting collision rates with 95% confidence
intervals.

**Effective sample size:** per tier and per medium, `ESS = (Σᵢ wᵢ)² / Σᵢ wᵢ²`
(Kish), where `wᵢ` is the realized selection count of bound realization `i`
across the suite. ESS is diagnostic in v1 with no numeric floor, but a tier
whose ESS < 3× its 30-day visible draw count must be flagged in the Epoch 027
balance report for the next table/mechanic epoch.

Human authentication applies to grammar recipes. Binding-class attestation
(§4.4), hard gates, and deterministic sampling prove the legal instance
space. Any binding that falls outside an attested class abstains.

## 4.14 The reusable curation pipeline and batch data flow

**The curation pipeline idiom (defined once; invoked by reference in Epochs
022–024 and any later content work):**

```text
declare semantics (spine, mechanic links, heat, required/forbidden claims,
  register, effect envelopes) BEFORE prose
-> enumerate bounded grammar recipes (Epoch 011)
-> decompile + apply prisms (Epoch 012)
-> create a Contentgen batch from the frozen manifest (this section)
-> authenticate every emitted candidate in the lab (Epoch 015)
-> apply reductions as child candidates; preserve dead variants (§4.7)
-> train/evaluate policy evidence (Epoch 017)
-> promote only recipes passing Epoch 018 policy and human manifest review
-> register promoted IDs without editing old content (R01)
```

**Batch data flow (ratify@015):**

1. Enumeration artifacts are produced only by `npm run contentgen:enumerate`
   or by an admin-only server job invoking the same module with byte-identical
   output; both land in staging.
2. The lab creation form's `(medium, sourceVersion, seed)` selects one frozen
   manifest by identity hash; `samplePolicy` and `batchSize` drive a
   deterministic subset sampler over that manifest (§4.2 audit and weighted
   streams).
3. Batch creation persists the manifest hash, sampler config, and resulting
   candidate ID list; the browser never enumerates, never rerolls, and never
   sees candidates outside the persisted list.
4. Any artifact whose recomputed hash differs from the persisted manifest
   hash fails closed at batch load.

## 4.15 Surface-support matrix (R38; ratify@019)

| Operation | Web | Ava/Nexus | terminal-core | native SSH |
|---|---|---|---|---|
| Resolve Day (claim/redeem) | ✓ | ✓ | ✓ | ✓ |
| Battle Log read | ✓ | ✓ | ✓ | ✓ |
| Battle Log auto-open focus | ✓ | unread affordance | unread affordance | unread affordance |
| Contentgen Lab | ✓ (admin only) | — | — | — |
| Account Campaign Records | ✓ (account page) | — | — | — |

Parity tests assert semantic-ID equality on every cell marked supported and
absence on every cell marked "—". Text styling is tested separately from
semantic parity.

## 4.16 Epoch directory and node-file doctrine

Every epoch `NNN` materializes (doctrine: `SUBSTRATE_DOCTRINE.md` §19;
exemplar: `docs/epochs/epoch-007-ava-content-quality-decompiler/`):

```text
docs/epochs/epoch-NNN-<slug>/
  feature.md                  # compatibility ledger (created BEFORE implementation)
  nodes/
    NODE-00-preflight.md      # always first: branch, base commit, dirty-tree,
                              # Node version, lockfile hash, owned files
    NODE-NN-<slug>.md         # one file per bounded execution unit
  receipts/                   # command/result pairs, append-only
```

Each node file carries, in order: **node identity** (epoch, node number,
title); **depends-on nodes**; **owned files** (exact paths or globs — no node
may write outside its list); **procedure**; **focused commands** (Part 5);
**acceptance**; **stop conditions hit** (or "none"); **receipt** (appended
command/result pairs; failures preserved, corrections appended — never
rewritten). No node may create an unbounded implementation file or a second
parser (doctrine §19).

## 4.17 Execution scene contract

```ts
type ExecutionScene = {
  version: string;
  resolvedDay: number;
  resolutionId: string;
  mainThread: {
    tier: CampaignTier;
    intensity: EscalationIntensity;
    heat: ProcedureHeat;
    epochId: string | null;
    operationId: string | null;
    issuedChoiceIds: readonly string[];
    lapsedOrderCount: number;
  };
  operations: OperationExecutionSummary;
  production: ProductionExecutionSummary;
  personnel: PersonnelExecutionSummary;
  domestic: DomesticExecutionSummary;
  network: NetworkExecutionSummary;
  adversary: DisclosedAdversaryExecutionSummary;
  narrative: NarrativeProgressSummary | null;
  doomsday: DisclosedDoomsdayResult | null;
  residues: readonly ResidueSummary[];
  nextDayCondition: NextDayConditionSummary;
  realizationId: string;
};
```

**Sub-summary minimum fields (ratify@025).** Renderers read only the
persisted scene; fields are additive-versioned (removing or retyping a field
is a schema version bump).

| Sub-summary | Minimum fields |
|---|---|
| `OperationExecutionSummary` | `operationId`, `maneuverId`, `sectorId`, `stageAdvanced`, `status`, `losses{personnel,materiel}`, `groundMovementKm`, `residueIdsCreated` |
| `ProductionExecutionSummary` | `outputDeltas` (by stock), `shortageFlags` |
| `PersonnelExecutionSummary` | `casualties`, `replacements`, `desertions`, `readinessDelta` |
| `DomesticExecutionSummary` | `stabilityDelta`, `moraleDelta`, `incidentIds` |
| `NetworkExecutionSummary` | `networkStateTransitions[]` (`sectorId`, `from`, `to`) |
| `DisclosedAdversaryExecutionSummary` | `posture`, `estimateBand`, `disclosedEventIds` — never hidden actuality |
| `NarrativeProgressSummary` | `arcId`, `beatIndex`, `choiceId`, `residueIds` |
| `DisclosedDoomsdayResult` | `occurred`, `eventId`, `outcomeClass ∈ {nonterminal, near-miss, terminal}` — never the roll |
| `ResidueSummary` | `residueId`, `sourceId`, `createdDay`, `expiresDay` |
| `NextDayConditionSummary` | `projectedPressureMarkers`, `lapsedOrderCount` |

The `doomsday` field must be provably incapable of carrying the sealed roll:
the schema excludes numeric roll fields, and the Epoch 025 validator greps
the schema to prove it (R37).

---

# PART 5 — COMMAND CONTRACT REGISTRY

These names and output roles are fixed by this specification so later agents
do not invent overlapping CLIs. An owning epoch may add flags but may not
change the semantic output without a contract-version bump.

| Owning epoch | Command | Required output |
|---|---|---|
| 009 | `npm run validate:epoch-009` | independent ancestry/immutability-manifest verdicts (wraps a bash validator; imports no application source) |
| 010 | `npm run test:contentgen-contracts` | schema and projection fixture verdicts |
| 011 | `npm run contentgen:enumerate -- --seed <n> --out <dir>` | candidate/failure JSONL, inventory and capacity manifests |
| 012 | `npm run contentgen:decompile -- --manifest <file> --out <dir>` | feature matrix and prism verdicts |
| 012 | `npm run contentgen:prisms -- --matrix <file> --out <dir>` | per-prism blast-radius report |
| 013 | `npm run contentgen:corpus -- --corpus <dir> --out <dir>` | versioned alive/dead corpus build and lineage report |
| 013 | `npm run contentgen:index -- --corpus <dir> --out <dir>` | versioned deterministic retrieval indexes |
| 014 | `npm run test:contentgen-service` | auth, persistence, revision, and idempotency verdicts |
| 015 | `npm run test:contentgen-lab` | route/UI workflow verdicts |
| 016 | `npm run contentgen:judge -- --batch <id> --judge <id\|NONE>` | parsed evidence batch or explicit `NONE` result |
| 017 | `npm run contentgen:train -- --corpus <version> --out <dir>` | policy candidate, group split, training receipt |
| 017 | `npm run contentgen:evaluate -- --policy <file> --held-out <file>` | independent evaluation report |
| 018 | `npm run contentgen:verify-policy -- --manifest <file>` | promotion eligibility and tamper verdict |
| 019 | `npm run campaign:precompute-tables -- --out <dir>` | three 30-row tables: magnitude, Doomsday occurrence, late-run adjustment |
| 020 | `npm run test:campaign-metastratum` | itinerary/scheduler focused tests |
| 020 | `npm run validate:campaign-itineraries -- --seeds 10000` | independent serialized-invariant report |
| 021 | `npm run test:campaign-operations` | operation state-machine and parity verdicts |
| 022–024 | `npm run contentgen:pack-report -- --pack <id>` | inventory, capacity, review, heat, and reference report |
| 025 | `npm run test:execution-scenes` | semantic prosecution and renderer verdicts |
| 026 | `npm run test:battle-log` | activation, persistence, aliases, and parity verdicts |
| 027 | `npm run validate:epoch-009-027` | independent aggregate proof report |

**Canonical final gate order (Epoch 027):** all focused epoch commands →
`test:ava-content-quality` → `test:ava-content-quality-epoch-008` →
`test:substrate` → `typecheck` → `build` → `cloudflare:types` →
`cloudflare:validate` → `validate:epoch-009-027` → `git diff --check`.
(`cloudflare:validate` internally re-runs typecheck/build/types-check/dry-run;
the earlier explicit steps exist for fast failure. The redundancy is
intentional.)

---

# PART 6 — EPOCH SEQUENCE

Every epoch below follows the execution protocol: read §0.3's list; record
preflight in `NODE-00-preflight.md`; create `feature.md` before
implementation; split work into bounded node files (§4.16); add generator
tests and independent artifact validators in separate files; run the focused
gate after each node and append a receipt; run `git diff --check` before every
epoch receipt; stop on any invariant, ownership, determinism, disclosure, or
authority failure; append every node command/result to
`DELENDA_QUEST_UBERDOC.md`; never push or deploy without a separate release
instruction. **Contracts consumed** lists the Part 4 law the epoch implements
or depends on — re-reading it is part of the epoch.

## Epoch 009 — Historical repair, preflight, and compatibility freeze

**Depends on:** Epochs 007 and 008 as implemented (validated §1.1).

**Objective:** Correct Epoch 008's historical declaration, freeze the complete
requirement and authority map, and prove that the new work starts from a
clean, known substrate.

**Contracts consumed:** §4.16 (node doctrine).

**Owned files:**

- append-only amendment under
  `docs/epochs/epoch-008-ava-quality-infrastructure/`;
- `docs/epochs/epoch-009-campaign-contentgen-preflight/`;
- no runtime source files.

**Procedure:**

1. Re-run the Epoch 008 ancestry, artifact, focused-test, and typecheck
   checks. (Baseline expectation, validated 2026-08-03: commit
   `0e4daf7266cd1e3f365adc47a4983f76779633e5` contained in `origin/main`;
   `test:ava-content-quality` 4/4; `test:ava-content-quality-epoch-008` 3/3;
   `typecheck` exit 0.)
2. Add bounded historical node records describing the actual files introduced
   by `0e4daf7`; do not fabricate execution chronology not present in Git.
3. Append an amendment stating that Epoch 008 is contained in `origin/main`
   and that "not pushed" is stale. The amendment must not rewrite or conceal
   the original receipt; it records the historical implementation map, the
   pushed-state correction, and the exact tests above.
4. Inventory all current producers and consumers of Ava prose, main-campaign
   prose, manoeuvre presentations, sub-missions, reports, and resolution
   records. The inventory MUST additionally identify the day-turnover
   authority path (`app/api/turn/route.ts` → `claimDailyResolution` /
   `redeemDailyResolution`, `db/turns.ts:223,388`) and record whether an
   automatic (non-manual) turnover path exists — Epoch 026 behavior 3 depends
   on this finding.
5. Hash the existing authored libraries that R01 protects. Use whole-file
   hashes for dedicated content files and canonical AST-initializer hashes for
   authored exports inside mixed code/mechanics files such as `app/game.ts`,
   so later type or resolution work cannot be mistaken for permission to
   rewrite the embedded library. The immutability manifest MUST enumerate
   every protected file with its hash type (`whole-file` or
   `ast-initializer`), including the authored exports inside `app/game.ts`
   (prose-bearing definitions confirmed at lines 56, 172–181, 208+),
   `app/campaign-substrate.ts` situation templates (e.g., lines 382–384),
   `app/epoch-006-content.ts`, `app/sub-mission-content.ts`, and
   `app/concepts.ts`.
6. Record each R01–R41 requirement in Epoch 009's compatibility ledger, and
   record the §1.2 frozen baseline (7 mechanics, 4 theaters, 4 phases, 8
   problem classes, plus the verified anchors) as the reference point later
   epochs re-verify at preflight.

**Independent acceptance:** A shell validator (`npm run validate:epoch-009`)
reads Git objects and protected file hashes directly. It must not import
application source. It fails if the documented Epoch 008 files differ from
the commit diff or if any protected library is omitted from the immutability
manifest.

**Focused commands:**

```bash
npm run test:ava-content-quality
npm run test:ava-content-quality-epoch-008
npm run typecheck
npm run validate:epoch-009
git diff --check
```

**Stop conditions:** Epoch 008 cannot be reproduced; ownership overlaps an
uncommitted user change; or the canonical campaign/day authority cannot be
identified.

**Exit:** An authenticated historical amendment, protected-library manifest,
authority map, and complete requirement trace.

## Epoch 010 — Contentgen doctrine and shared chord metagrammar

**Depends on:** Epoch 009.

**Objective:** Add product law for Contentgen and define the shared chord core
plus medium-specific projections before generators or learning code exist.

**Contracts consumed:** §4.1–§4.9 (this epoch freezes them as code), §4.16.

**Owned files:**

- append to `SUBSTRATE_DOCTRINE.md`;
- update `docs/substrate/grammar.md` and architecture documentation;
- new dependency-free contracts under `packages/contentgen-contracts/`
  (this is the binding location; no `app/` alternative exists);
- JSON Schemas under `content-quality/contracts/`.

**Procedure:**

1. Append one canonical Contentgen doctrine section covering enumeration,
   semantic-before-prose, hard gates, authenticated labels, learning limits,
   cross-medium transfer, promotion, and discovery protection.
2. Define `SharedChord`, `GrammarRecipe`, `ContentMedium`, provenance,
   equivalence class, required/forbidden claim, register profile, and review
   enums (§4.4 types verbatim).
3. Define separate projection contracts for Ava, campaign briefs, manoeuvre
   procedures, Romantic arcs, and execution scenes.
4. Declare which features are shared and which are forbidden from transfer
   (§4.5 feature families).
5. Define canonical JSON, NFC, Unicode codepoint ordering, hash exclusions,
   and version-bump rules exactly once (§4.3); every later epoch imports them.
6. Embed the §4.2 ticket grammars, the §4.5 trainer configuration, the §4.9
   threshold values, and the §4.8 taxonomy enums as **versioned constants in
   code**, not prose.
7. Add contract examples but no generated campaign content.

**Independent acceptance:** A schema conformance test (`npm run
test:contentgen-contracts`) loads hand-authored valid and invalid JSON
fixtures. Invalid fixtures independently exercise missing medium, undeclared
mechanic references, contradictory required/forbidden claims, and illegal
cross-medium fields.

**Stop conditions:** Any contract assigns intent or mechanics to the quality
layer; one projection requires scraping another surface; or a second doctrine
file would become authoritative.

**Exit:** Versioned `contentgen-contract/v1` and a doctrine amendment.

## Epoch 011 — Cross-medium inventory and bounded grammar enumeration

**Depends on:** Epoch 010.

**Objective:** Generalize Epoch 007's Ava-only enumerator into a deterministic,
bounded compiler inventory for all declared media while preserving the old
CLI contract.

**Contracts consumed:** §4.2 (seed tickets), §4.3, §4.4 (types + attestation),
§4.13 (capacity formulas).

**Owned files:**

- `packages/contentgen/` enumeration modules;
- adapters for existing Ava and narrative producers;
- `scripts/contentgen-enumerate.mjs`;
- inventory and equivalence-class manifests under `content-quality/`;
- focused tests and independent inventory validator.

**Algorithm:**

```text
enumerate(snapshot, globalSeed):
  assert versions and source hashes
  for medium in codepointSort(snapshot.media):
    for production in codepointSort(inventory[medium]):
      localSeed = H(globalSeed, medium, production.id)   // §4.2 grammar
      for recipe in production.enumerateRecipes(localSeed):
        validate recipe against neutral JSON Schema
        representatives = canonicalRepresentatives(recipe.equivalenceClasses)
        emit candidate(recipe, representatives, provenance)
      record every abstention and compile failure
  stableSort candidates by medium, productionId, recipeId, candidateId
  return canonical manifest excluding generatedAt from identity hash
```

**Procedure:**

1. Inventory every production source explicitly; no regex-only discovery is
   accepted as complete inventory. The inventory fixture MUST name the
   verified producers — Ava prose, `app/game.ts` libraries,
   `app/campaign-substrate.ts` templates, manoeuvre presentations,
   sub-missions (`app/sub-mission-content.ts`), reports, and resolution
   records — matching the Epoch 009 step 4 inventory.
2. Keep Epoch 007's `ava:content-quality` command working through an adapter.
3. Define finite slot domains and equivalence-class attestations per §4.4.
4. Derive per-production seeds per §4.2 so a new production does not reshuffle
   old candidates.
5. Write JSONL candidates, failures, source hashes, capacity (§4.13), and
   coverage reports.
6. Run twice and require byte identity.

**Independent acceptance:** The validator compares output production IDs with
a separately maintained inventory fixture, mutates one source hash, inserts a
duplicate ID, removes an equivalence representative, and verifies each fault
is caught. A small hand-calculated Cartesian product asserts exact candidate
count without importing the enumerator.

**Stop conditions:** Unbounded free text reaches enumeration; a source lacks
a typed owner; or a grammar miss fabricates a candidate.

**Exit:** Reproducible multi-medium candidate and failure manifests.

## Epoch 012 — Decompiler matrix, hard prisms, and blast-zone reports

**Depends on:** Epoch 011.

**Objective:** Decompile every candidate into a shared/medium feature matrix,
apply fail-closed exclusion prisms, and make each prism's affected area
inspectable.

**Contracts consumed:** §4.4 (P0–P4), §4.6 (prism model + rates), §4.8(b)
(failure-class enum), §4.3.

**Owned files:**

- `packages/contentgen/decompile/`;
- `packages/contentgen/prisms/`;
- versioned prism contracts under `content-quality/contracts/`;
- `scripts/contentgen-decompile.mjs` and `scripts/contentgen-prisms.mjs`;
- independent mutation fixtures.

**Feature families:**

- exact surface statistics and normalized projections P0–P4 (§4.4);
- declared chord, mechanic, spine, and slot evidence;
- claims, modality, imperative/action language, and hidden-state risk;
- rhetorical shape, causal structure, reversal, cadence, and endings;
- register: abstraction, institutional noun, concrete cost, slang, sentiment,
  omniscience, and unexplained jargon;
- continuity: actor, temporal, residue, and prior-choice references;
- medium-specific legality and semantic-owner evidence.

**Algorithm:**

```text
decompile(candidate):
  preserve exact bytes
  projections = normalizeP0ThroughP4(candidate.text)
  shared = extractSharedFeatures(candidate, projections)
  medium = mediumExtractor[candidate.medium](candidate, projections)
  claims = extractEvidenceOnlyClaims(candidate)
  return versionedFeatureRow(shared, medium, claims, provenance)

applyPrisms(row, corpus):
  verdicts = every applicable prism evaluated independently
  hardFailure = any verdict with hard severity
  blastRadius = for each prism, enumerate every affected candidate and canary
  return {compileStatus, verdicts, blastRadius}
```

**Procedure:**

1. Port existing authority gates without weakening them.
2. Add medium-specific register, continuity, and mechanic/prose mismatch
   gates.
3. Preserve failure classes separately per §4.8(b); never collapse
   `BEAUTIFUL_BUT_IRRELEVANT`, `RELEVANT_BUT_DEAD`, and `NOVEL_BUT_INCOHERENT`.
4. Record the triggering projection and evidence span.
5. Generate a complete blast-radius report for each prism (§4.6 rate
   definitions).
6. Require dual independent authority lint for unsupported outcomes, mutation
   language, and claim-budget undercounting: two separately authored lint
   implementations, in separate modules sharing nothing beyond neutral
   schemas; agreement on failure → hard failure; disagreement → candidate
   tagged `#curious` with the disagreement recorded. A shared helper beyond
   schema types voids independence and is a stop condition.

**Independent acceptance:** A validator injects hand-authored mutations into
otherwise valid candidates — one mutation per §4.8(b) gate class: hidden
outcome, imperative order, actor swap, temporal contradiction, generic
abstraction, sentimentality, duplicate image, unsupported resource,
confusable spelling, false mechanic claim — each with an expected stable
failure class. Canary lines must survive. Validator code cannot import prism
predicates.

**Stop conditions:** A prism rewrites text, changes intent, has an unreported
blast radius, or removes an approved canary without a hard authority reason.

**Exit:** Versioned feature matrix, prism verdicts, and blast-zone report.

## Epoch 013 — Persistent corpus, deterministic RAG, and lineage ledger

**Depends on:** Epoch 012 and Epoch 008 retrieval foundations.

**Objective:** Build the inter-session alive/dead evidence substrate and
deterministic retrieval used by humans, the optional judge, and later
training.

**Contracts consumed:** §4.9 (novelty + duplicate thresholds), §4.3, §4.7
(lineage identity).

**Owned files:**

- versioned corpus schemas and JSONL stores;
- deterministic indexes under generated output;
- lineage and retrieval modules in `packages/contentgen/`;
- corpus CLI (`npm run contentgen:corpus`) and independent retrieval tests.

**Corpus partitions:**

```text
approved       authenticated quality threshold met
rejected       authenticated quality threshold not met
adversarial    deliberately malformed or dangerous
curious        informative unresolved or unusual cases
revisions      immutable parent/child reductions and edits
calibration    frozen human labels for fitting
held-out       group-isolated labels unavailable to fit or judge prompts
canaries       known-good, known-bad, and known-weird stability set
```

**Procedure:**

1. Extend, rather than replace, Epoch 008 corpus IDs and indexes
   (`content-quality/corpus/`).
2. Store exact source, recipe, features, prism evidence, review rationale,
   lineage, and version hashes.
3. Separate retrieval relevance from novelty per §4.9.
4. Use BM25, TF-IDF, rhetorical-shape matching, and optional precomputed
   semantic vectors; no remote vector database.
5. Use directional duplicate classes for approved, rejected, and pending
   neighbors at the §4.9 thresholds (approved 0.92, rejected 0.90,
   pending 0.94).
6. Export private reviewer identity only as an opaque review receipt ID.

**Independent acceptance:** Hand-authored query/corpus fixtures assert
expected top-k membership rather than implementation-specific exact floating
scores. Metamorphic tests prove duplicated documents do not increase semantic
truth, rejected neighbors remain labeled rejected, and adding an unrelated
document does not reorder an exact-match first result.

**Stop conditions:** Retrieval becomes a truth gate; rejected rows are
deleted; or held-out labels enter training or prompts.

**Exit:** Versioned corpus and deterministic evidence index.

---

## Epoch 014 — Contentgen review persistence and admin mutation authority

**Depends on:** Epoch 013.

**Objective:** Add durable, authenticated, idempotent workflow state for the
internal lab without making D1 the production content source of truth.

**Contracts consumed:** §4.7 (lifecycle closure — ratification point),
§4.8(a)/(d) (reason codes, legality matrix).

**Owned files:**

- next available checked-in migration under `drizzle/`;
- `db/schema.ts` additions and `db/contentgen.ts`;
- admin-only application service contracts;
- database-focused tests.

**D1 tables:**

- `contentgen_batches`: identity, source/policy versions, seed, manifest hash,
  status, creator, timestamps;
- `contentgen_candidates`: immutable candidate payload/hash, compile status,
  tags, queue rank, optimistic revision; the schema MUST distinguish terminal
  vs. non-terminal dispositions exactly as §4.8(d);
- `contentgen_reviews`: append-only authenticated dispositions, reason codes
  (§4.8(a) enum enforced), notes, idempotency key, superseded-review link;
- `contentgen_ai_evidence`: optional parsed checklist, prompt/response hashes,
  provider/model ID, no secret;
- `contentgen_policy_runs`: training inputs, output hash, evaluation status;
- `contentgen_exports`: exported Git corpus/policy hash and private-identity
  redaction receipt.

**Mutation contract:**

```text
review(candidateId, expectedRevision, idempotencyKey, disposition):
  require authenticated administrator
  require candidate belongs to open batch
  require expected revision
  validate disposition against compile status per §4.8(d)
  append review row; never update prior review text
  advance candidate revision exactly once
  batch closes only when unresolvedCandidateCount == 0   // §4.7(b) semantics
```

**Procedure:**

1. Reuse `getAuthenticatedUser()` and `isAdmin()`.
2. Do not expose reviewer emails in admin snapshots, exports, telemetry, or
   candidate payloads returned outside the service.
3. Make batch creation consume a frozen generated manifest per §4.14; the
   browser never generates candidates.
4. Make reductions create child candidates per §4.7(a); never mutate parent
   text.
5. Export reviewed evidence to a staging artifact, not directly into promoted
   runtime content.

**Independent acceptance:** Database tests (`npm run test:contentgen-service`)
attempt anonymous access, non-admin access, duplicate idempotency keys, stale
revisions, illegal hard-failure approval, premature batch close (including a
batch containing an unreviewed revision child), parent mutation, and private
identity export. All fail closed.

**Stop conditions:** A client can write labels directly; a review overwrites
history; or implementing the lab requires a second identity provider or D1.

**Exit:** Durable authenticated review service and migration.

## Epoch 015 — Appified Contentgen Lab

**Depends on:** Epoch 014.

**Objective:** Build the internal product surface through which the operator
generates batches, reviews complete grammar lists, confirms failures, judges
quality, and creates reductions.

**Contracts consumed:** §4.14 (batch data flow — ratification point),
§4.7, §4.8, §4.9 (NONE-mode provenance rule).

**Owned files:**

- `/admin/contentgen` page and client components;
- `/api/admin/contentgen/` route adapters;
- Contentgen Lab styles;
- UI integration and accessibility tests.

**Required surfaces:**

1. Batch creation form: medium, source version, seed, sample policy, batch
   size. The `(medium, sourceVersion, seed)` triple selects an already-frozen
   enumeration manifest by identity hash; `samplePolicy` and `batchSize` drive
   the §4.14 deterministic subset sampler. The browser never runs enumeration.
   An admin-only server job may invoke the same enumerator module
   server-side, but its output artifact must be byte-identical to the CLI
   artifact for the same inputs and is written to staging before the form can
   reference it. There is no third generation path.
2. Queue summary: unresolved (§4.7(b) semantics), `#failures`, `#curious`,
   compliant, revised, and authenticated counts.
3. Candidate review card displaying exact text, semantic plan, shared chord,
   medium projection, mechanic references, prism evidence, feature deltas,
   nearest alive/dead neighbors, provenance, and prior lineage.
4. Required disposition controls per §4.8(d):
   - compliant: `QUALITY_MET`, `QUALITY_NOT_MET`, `REVISE`;
   - hard failure: `FAILURE_CONFIRMED`, `GATE_FALSE_POSITIVE`;
   - all dispositions require one or more §4.8(a) reason codes.
5. Reduction editor that shows immutable parent and proposed child side by
   side.
6. Batch completion and export screen; completion remains disabled while any
   candidate — including a revision child — lacks authenticated disposition.

The UI must never expose private reviewer identity, provider secrets, future
campaign content to ordinary users, or an "auto-promote" control — and no
control may bypass §4.7 closure. With `judgeId = NONE`, no UI element may
display AI provenance (§4.9).

**Independent acceptance:** Route-level tests (`npm run test:contentgen-lab`)
use authenticated admin and ordinary-user fixtures. Browser tests assert that
every compile status exposes only legal dispositions, unresolved count
controls completion, stale writes surface conflict, and page reload preserves
the queue from D1. Accessibility tests cover keyboard review and status
announcements.

**Stop conditions:** Any quality calculation occurs only in React; a UI
action can promote runtime content; or ordinary account access reveals the
lab.

**Exit:** A complete internal curation workflow without AI dependency.

## Epoch 016 — Constrained AI pre-score and `#curious` prioritization

**Depends on:** Epoch 015, frozen calibration/held-out corpora, and explicit
provider/model/retention/cost authorization. (Externally gated: provider-neutral
contracts and replay tests may be implemented without that authorization, but
the epoch cannot be declared operational with `judgeId != NONE` until the gate
is satisfied — §7.)

**Objective:** Concentrate human attention using bounded model evidence while
preserving complete authenticated review.

**Contracts consumed:** §4.9 (queue law, analogues, NONE mode — ratification
points), §4.8(c) (priority bands), §4.2.

**Owned files:**

- provider-neutral `ContentJudge` interface;
- offline batch runner and strict schemas;
- prompt contracts and replay fixtures;
- admin evidence projection;
- no player-path imports.

**Judge input:** Candidate data is delimited as untrusted data. Input contains
the medium contract, deterministic features, prism results, 4 nearest
approved + 4 nearest rejected analogues (§4.9), and a binary checklist.
Hidden held-out labels are not included.

**Checklist freeze:** checklist items are the deterministic feature families
computed by Epoch 012, rendered as yes/no questions per medium. The exact
per-medium item list is frozen in this epoch's prompt contracts **before the
runner is implemented**, and replay fixtures assert the frozen list. No
checklist item may ask for a judgment the deterministic features do not
evidence.

**Judge output:** Strict JSON contains checklist booleans, evidence spans,
uncertainties, proposed `#curious` reasons, priority band (§4.8(c)), prompt
hash, response hash, model ID, and schema version. It contains no rewritten
candidate.

**Queue logic:** §4.9 verbatim, including the probability fallback chain and
NONE-mode semantics.

**Procedure:**

1. Freeze batch, prompt, contracts, analogues, model ID, and call budget —
   the cost ceiling and call budget are recorded in the frozen batch
   manifest; exceeding them invalidates the run rather than extending it.
2. Include 6 hidden post-parse calibration controls per batch (3 known-good,
   3 known-bad), positions seeded in the batch manifest.
3. Invalidate the entire model-evidence batch if any control fails.
4. Use fixed retry ceilings: ≤ 2 retries (≤ 3 total attempts) per call with
   fixed 1 s/5 s backoff; disagreement after exhaustion becomes `#curious`.
5. Persist evidence but require human disposition for every candidate.
6. Permit `--judge NONE` deterministic mode for tests and provider outages;
   the lab remains usable, but no output is misrepresented as AI priority.

**Independent acceptance:** Replay fixtures test schema parsing, prompt
injection candidates, order reversal, control failure, retry exhaustion,
every §4.8(c) band boundary, and cost ceiling. Held-out human labels measure
checklist agreement after the run. No acceptance test calls a live provider.

**Stop conditions:** Provider authorization is absent; raw model output
enters the UI without parsing; a model changes a hard-gate verdict; or model
failure blocks deterministic review.

**Exit:** Optional AI evidence and stable `#curious` queue ordering.

## Epoch 017 — Deterministic self-training and meta-rule proposal

**Depends on:** Epoch 015 and a completed, exported corpus (Epochs 013/014)
are sufficient for deterministic training. Epoch 016 is a data-flow
preference, not a gate (§7): AI evidence columns are optional features in the
training schema, and a policy trained without them must still reproduce
byte-identically from its receipt.

**Objective:** Train the compiler-adjacent quality policy from authenticated
sampling curation and propose, but never auto-activate, high-value exclusion
rules.

**Contracts consumed:** §4.5 (trainer config — the only hyperparameter
source), §4.6 (proposal precision), §4.9 (audit slots), §4.2 (split tickets).

**Owned files:**

- deterministic feature-vector builder and trainer;
- group split and policy schema;
- prism proposal miner;
- policy reports and independent evaluator.

**Training data:** Only completed, exported, authenticated review receipts
from approved corpus versions. AI verdicts are features/evidence, never
labels.

**Fit algorithm (hyperparameters from §4.5 trainer config, nowhere else):**

```text
train(rows, config):
  assert all rows have authenticated binary quality labels
  groups = groupBy(recipeLineage, chordFamily, productionFamily)
  split groups deterministically into train, calibration, heldOut   // §4.5
  fit feature normalization on train only
  initialize shared and medium weights to zero
  for iteration in 1..fixedIterationCount:                          // 500
    for row in stableTrainOrder:                                    // §4.5
      gradient = logisticGradient(row, weights) + l2Penalty(weights)
      weights = weights - fixedLearningRate(iteration) * gradient   // §4.5
  calibrate thresholds on calibration groups                        // §4.5
  emit policy candidate with all data/version hashes
```

The training receipt records the full §4.5 config hash; any deviation from
§4.5 values is a contract change requiring human ratification per §0.4, not
a code edit.

**Meta-rule mining:**

```text
minePrismProposals(confirmedFailures):
  enumerate conjunctions of 1..3 discrete feature predicates
  retain proposal only when:
    support >= 12 authenticated failures
    precision >= 0.95 on training groups        // §4.6 definition
    evidence spans >= 2 review sessions
    affectedApprovedCanaries == 0
  compute full corpus blast radius              // §4.6 rates
  emit PROPOSED, never ACTIVE
```

**Sampling feedback:** The next batch reserves `max(1, floor(batchSize ×
0.2))` slots for a uniform, seeded audit over the complete eligible recipe
inventory (§4.2 audit stream, drawn first). The remaining 80% increases
coverage for high uncertainty, high disagreement, underrepresented chords,
unseen rhetorical shapes, and suspected prism boundaries (weighted stream).
The learner therefore cannot hide blind spots by sampling only what it
already understands.

**Independent acceptance:** The evaluator (`npm run contentgen:evaluate`) is
a separate executable that reads policy JSON and held-out JSONL only. It
cannot import trainer code. It checks held-out log loss, balanced accuracy,
false-negative rate by medium, calibration error, canary stability, and
subgroup sample counts. A mutation suite flips labels, leaks sibling groups,
perturbs feature order, and changes one weight; each must be detected.

**Stop conditions:** Held-out rows entered training; a policy cannot
reproduce byte-identically; a proposed prism affects an approved canary; or
training changes a hard gate.

**Exit:** A reproducible policy candidate, sample-allocation proposal, and
human-reviewable prism proposals.

## Epoch 018 — Policy promotion and cross-medium compiler application

**Depends on:** Epoch 017.

**Objective:** Promote only independently improved quality policies and apply
shared learning to each medium through explicit residual contracts.

**Contracts consumed:** §4.9 (promotion gate values — ratification point),
§4.5, §4.8(c).

**Owned files:**

- promoted quality-policy manifests;
- verifier extensions based on Epoch 008;
- per-medium scoring and sampling adapters;
- watcher diff reports and promotion tests.

**Promotion gate:**

```text
eligible(policy) only if:
  manifest and corpus hashes verify
  heldOutLogLoss improves or remains within 0.005 of the last promoted policy
  no medium exceeds its 0.10 false-negative ceiling
  balanced accuracy does not regress vs. the promoted baseline
  no hard-gate or canary regression exists (zero canary flips tolerated)
  every weight has a declared feature and medium scope
  all proposed prisms remain separately reviewed
  authenticated human signs the promotion receipt
```

The promotion receipt cites the measured values one line each: held-out
log-loss delta, per-medium false-negative rates, balanced-accuracy delta,
canary-flip count.

**Cross-medium rule:** Shared weights may influence review priority for all
media. Each medium's residual weights and hard gates remain separate. Ava
command interpretation, campaign mechanics, and outcome calculation do not
import the quality policy.

**Procedure:**

1. Compare the candidate against the last passing policy and a zero/heuristic
   baseline.
2. Publish a complete changed-feature and changed-sample report.
3. Require explicit human promotion through a repository change.
4. Verify the promoted manifest at CLI startup/build time.
5. Feed the policy into Epoch 011 sampling/ranking, closing the self-learning
   loop for the next curation batch.

**Independent acceptance:** Start from the same corpus with old and new
policies, compare held-out results in a separate process, tamper with hashes,
remove a medium residual, and inject an undeclared feature. Promotion must
fail for every mutation (`npm run contentgen:verify-policy`).

**Stop conditions:** D1 labels directly alter runtime behavior; a single
scalar erases failure lineage; or shared weights create semantic intent.

**Exit:** First complete train-review-evaluate-promote-resample compiler
loop.

---

## Epoch 019 — Campaign metastratum contracts and precomputed pacing tables

**Depends on:** Epoch 018 contracts and quality tooling; existing campaign and
gate authorities.

**Objective:** Add typed campaign metastratum law, migration defaults,
semantic content links, and static day tables before changing selection or
resolution.

**Contracts consumed:** §4.10 (types), §4.11 (three tables), §4.12(a)
(tier/intensity legality), §4.2 item 7 (hash consolidation), §4.15 (surface
matrix — ratification point).

**Owned files:**

- new campaign-metastratum contract modules;
- additive content registries containing metadata only (including the
  `TerminalRisk` field on escalatory entries);
- checked-in 30-day magnitude, Doomsday occurrence, and late-run adjustment
  tables;
- restore/migration defaults for saved campaign JSON;
- independent table validator and contract tests.

**Procedure:**

1. Implement the types in §4.10 and version constants.
2. Define `ContentLink` records that point to existing mechanic IDs and new
   realization/spine IDs. Do not use filesystem symlinks (R02).
3. Generate all three static integer tables from §4.11 into staging — the
   late-run adjustment table is thirty rows of integer 0 in v1.
4. Review and check in the tables with source-formula/version receipts.
5. Add state restoration that initializes absent metastratum fields without
   rerolling existing campaign dockets (§4.10 migration law).
6. Define scalable effect envelopes, integer rounding, and state caps per
   §4.11(a) ("every scalable mechanic declares its scalable axes, rounding
   rule, and caps").
7. Consolidate `stableHash`: delete the duplicate body at
   `app/campaign-substrate.ts:113` in favor of the single shared import
   (`app/substrate/hash.ts`); create no third copy.
8. Add no authored prose in this epoch.

**Independent acceptance:** A separate table validator recomputes all 30 rows
of all three tables from documented constants, checks anchor values (§4.11),
strict monotonicity after the eligibility boundary, ppm bounds, all-zero
adjustment rows in v1, and table hashes. It does not import the runtime table
generator. Restore tests use hand-authored old-save fixtures.

**Stop conditions:** Runtime uses floating exponential decisions; prose
controls a mechanic; or old saves cannot restore deterministically.

**Exit:** Typed metastratum and verified static pacing tables.

## Epoch 020 — Narrative itinerary and main-thread scheduler

**Depends on:** Epoch 019.

**Objective:** Produce a deterministic, persisted 30-day main-thread
itinerary that guarantees three Romantic epochs and strict heat alternation
while protecting discovery.

**Contracts consumed:** §4.12 in full (this epoch implements exactly §4.12;
nothing here is re-derived), §4.2, §4.10.

**Owned files:**

- pure scheduler and itinerary modules;
- state initialization/restore integration;
- main-thread semantic docket contract (§4.12(b));
- scheduler tests and independent invariant validator.

**Narrative slots:** §4.12(d) rejection stream with pairwise disjointness by
construction; draw receipts persisted. Every phase contains an
always-eligible fallback arc (§4.12(g)) so the R05 guarantee cannot fail.
Optional additional arcs: constant zero in v1 (§4.12(h)).

**Scheduling algorithm:** §4.12(i) verbatim. Every selected docket is
persisted before presentation. Suppressed occurrences are recorded sealed
(§4.12(e)). Initial heat per §4.12(c). Arc selection per §4.12(g).

**Independent acceptance:** A standalone validator
(`npm run validate:campaign-itineraries -- --seeds 10000`) consumes
serialized itineraries/dockets only. Across at least 10,000 seeds and
representative state bands it asserts:

1. three **completed** (not merely activated) Romantic instances by day 30 on
   every seed reaching day 30 (R05);
2. one-to-three-day durations and exactly one beat per resolved day;
3. slot intervals pairwise disjoint on every seed;
4. `deferralCount ≤ 1` per slot, and every deferral/shift/suppression carries
   its ticket in `drawReceipts`;
5. strict adjacent heat alternation across all resolved main-thread beats;
6. no unknown content IDs, stable reruns, and no future itinerary fields in
   disclosed projections;
7. every suppressed occurrence recorded sealed and never rerolled.

**Stop conditions:** Any seed lacks three guaranteed arcs; heat requires a
fallback to the same value; or reopening a day changes its docket.

**Exit:** Persisted main-thread itinerary and docket scheduler.

## Epoch 021 — Multi-day operations and main-thread convergence

**Depends on:** Epoch 020.

**Objective:** Allow operations to last two or three days, continue under
standing intent during Romantic arcs, and expose one canonical main-thread
union to clients and Ava.

**Contracts consumed:** §4.12(b) (`MainThreadPrompt` — implemented
verbatim), §4.10 (legacy one-day cutover), §4.12(a).

**Owned files:**

- operation lifecycle application service;
- additions to `GameState` restoration and daily resolution integration;
- convergence packet/commit changes;
- semantic adapters and parity tests;
- no new authored pack content.

**Main-thread contract:** §4.12(b) — four variants (`routine`, `operation`,
`romantic`, `escalatory`); Doomsday beats travel in `escalatory`.

**Lifecycle:**

1. Starting a declared multi-day manoeuvre creates `ActiveOperation` with a
   declared two- or three-day procedure plan and immutable mechanic snapshot.
2. Each day resolution advances exactly one stage.
3. A Romantic or escalatory main-thread choice does not require a new
   manoeuvre order; the active operation continues under `standingIntentId`
   (R06).
4. Declared decision beats may permit continue, redirect, or abort. Redirect
   and abort lower into existing typed mechanics or a new explicitly declared
   mechanic; prose never implies them.
5. Completion, collapse, and abort create typed residues and close the
   active record.
6. The current one-day `maneuver` field remains a migration input until all
   adapters consume `ActiveOperation`; it cannot become a second authority.
   Legacy one-day manoeuvres never create `ActiveOperation`: they complete
   within their resolution day through the existing one-day path. Migration
   initializes the metastratum with `activeOperation: null`; an in-flight
   legacy manoeuvre on a migrated save resolves once through the legacy path
   and is not replayed (§4.10).

**Independent acceptance:** State-machine transition tables are hand-authored
for start, continue, Romantic overlay, redirect, abort, complete, and
duplicate resolution. The validator checks exactly one stage advances per
authorized day and replay is idempotent. Browser, Nexus, terminal, and SSH
compare semantic IDs, not prose. Migration fixtures cover a save with an
in-flight legacy one-day manoeuvre (resolves once via legacy path) and a
mid-campaign pre-metastratum save (no reroll).

**Stop conditions:** A client advances operation state; active operations
disappear under Romantic content; or an old save executes twice during
migration.

**Exit:** Canonical multi-day operational continuity.

## Epoch 022 — Additive Routine and dramatic manoeuvre content pack

**Depends on:** Epoch 021 and the functioning Contentgen Lab/promotion loop.

**Objective:** Expand operational variety through new additive procedure and
situation packs bound to existing mechanics.

**Contracts consumed:** §4.14 (curation pipeline — executed verbatim), §4.12(f)
(heat coverage), §4.13 (capacity), §1.2 (frozen baseline).

**Owned files:**

- new files under `app/campaign-content/routine/` and
  `app/campaign-content/maneuvers/` or an equivalent isolated package;
- registry additions only;
- no edits to protected existing authored libraries.

**Minimum first-pack inventory:**

- 24 new Routine situation spines distributed across all four theaters
  (`industrial`, `lowland`, `ridge`, `river`) and the current problem classes
  (`assault`, `command`, `counterstroke`, `crossing`, `exploitation`,
  `force-preservation`, `logistics`, `observation`) — §1.2 baseline,
  re-verified at this epoch's preflight;
- for every existing manoeuvre mechanic, at least four `hot` and four
  `medium` procedure frames. **Recount idiom:** preflight re-counts
  `MANEUVERS` (`app/game.ts:496`); the frame minimum is `8 × count` (≥ 4 hot
  + ≥ 4 medium per mechanic). At validation time the count is 7 → 56 frames
  minimum; if the registry changed, `feature.md` records the new count and
  the recomputed minimum before any authoring;
- at least three distinct rhetorical shapes and three image families per
  mechanic;
- explicit continuation and aftermath language for every multi-day frame.

Content geometries must include crossings, reserve release, command rupture,
supply sacrifice, exposed recovery, counterstroke, deliberate abandonment,
and terminal concentration where mechanically legal.

**Authoring procedure:** the §4.14 curation pipeline, verbatim:

1. Declare semantic spine, mechanic link, heat, required claims, forbidden
   claims, register, and effect envelope before prose.
2. Generate bounded grammar recipes through Epoch 011.
3. Run decompilation/prisms and create a Contentgen batch per §4.14.
4. Authenticate every emitted candidate in the lab.
5. Apply reductions as child candidates; preserve dead variants (§4.7).
6. Promote only recipes passing Epoch 018 policy and human manifest review.
7. Register promoted IDs without editing old content (R01).

**Independent acceptance:** Protected-library hashes from Epoch 009 must
match. A registry validator (`npm run contentgen:pack-report -- --pack <id>`)
checks inventory minima, every mechanic's opposite-heat coverage (§4.12(f)),
declared effects, unique IDs, no unknown references, and no prose-to-mechanic
parsing. Seed simulation checks repetition/cooldown separately from the
scheduler implementation (§4.13).

**Stop conditions:** Inventory cannot sustain strict heat alternation; a line
requires an undeclared mechanic; or a candidate lacks authenticated review.

**Exit:** Promoted Routine/manoeuvre pack with substantial combinatorial
coverage and preserved rejected corpus.

## Epoch 023 — Romantic narrative epoch pack

**Depends on:** Epoch 022 and the narrative scheduler/lifecycle contracts.

**Objective:** Add main-thread, one-to-three-day Romantic arcs with material
strategic costs, operational entanglement, interruption, closure, and
residue.

**Contracts consumed:** §4.14 (pipeline), §4.12(d)/(f)/(h) (beats, heat,
interruption surface), §4.10, §1.2 (four phases).

**Owned files:**

- new files under `app/campaign-content/romantic/`;
- Romantic arc registry and mechanic-link manifests;
- no edits to Domestic, Network, or existing main-situation libraries.

**Minimum first-pack inventory:**

- 12 distinct Romantic arc spines;
- at least three viable arcs for each of the four campaign phases
  (`contact`, `compression`, `exhaustion`, `terminal`); a cross-phase arc
  counts toward a phase's minimum only when its declared gates genuinely
  admit activation in that phase, and the arc registry validator must prove
  the per-phase minimum from gate metadata alone, without rendering prose;
- each arc has one, two, or three beats — exactly one beat per resolved day,
  `durationDays === beatCount` (§4.12(d)) — and at least three mechanically
  distinct choices at each decision beat;
- each arc declares setup, pressure, choice, immediate cost, operational
  interaction, interruption behavior, closure, and carried residue. (In v1
  runtime, interruption of arcs is unreachable — §4.12(e)/(h); the
  declaration remains required contract surface exercised by validator
  fixtures.);
- every arc declares both hot and medium realizations for every beat; the
  registry validator fails the pack if any arc lacks a realization of either
  heat for any beat, and the always-eligible fallback arc in every phase must
  support both heats unconditionally (§4.12(f)).

The pack should emphasize persons and institutions under command pressure:
private obligations becoming public liabilities, loyalties conflicting with
force preservation, memory competing with tempo, rescue competing with
classification, and intimacy exposing command truth. No arc may be merely a
flavor interlude.

**Authoring and curation:** the §4.14 pipeline verbatim. Narrative candidates
use narrative residual weights and gates, not Ava's final scorer (§4.5).

**Independent acceptance:** A semantic arc validator walks every choice path
without rendering prose and asserts legal effects, reachable closure, no
orphaned residue, declared interruption behavior, one-to-three-day bounds,
the per-phase minimum from gate metadata, both-heats-per-beat coverage, and
at least one meaningful cost/tradeoff per choice. A separate register review
samples rendered paths without access to hidden outcomes.

**Stop conditions:** An arc lacks real consequence, creates an actor from
prose, cannot resume/close after interruption, or displaces Domestic/Network
authority.

**Exit:** Promoted Romantic pack capable of satisfying every guaranteed slot.

---

## Epoch 024 — Escalatory Standard/Maximum and Doomsday events

**Depends on:** Epoch 023, pacing tables, and canonical resolution tickets.

**Objective:** Add escalating late-run magnitude and explicit terminal-risk
events without turning ominous language into game law.

**Contracts consumed:** §4.11 (tables, incl. zero adjustment), §4.2
(occurrence/terminal tickets, state seal), §4.12(a)/(e)/(f), §4.14.

**Owned files:**

- new standard/max/doomsday packs;
- declared effect and terminal-risk mechanics;
- scheduler/resolution integration for sealed occurrence and terminal
  tickets;
- independent probability and terminal-transition validators.

**Minimum first-pack inventory:**

- 16 Escalatory Standard event spines;
- 12 Escalatory Maximum event spines;
- six Doomsday mechanic families, each with legal hot and medium realization
  paths (§4.12(f));
- explicit nonterminal, near-miss, and terminal outcomes for every Doomsday
  family.

**Occurrence and resolution (§4.2 grammars):**

```text
occurrenceTicket = "${contentVersion}:${campaignSeed}:${day}:doomsday-occurrence"
eventOccurs = rollPpm(occurrenceTicket) < precomputedDensityPpm[day]

terminalTicket = "${contentVersion}:${campaignSeed}:${day}:${eventId}:${stateSeal}"
// stateSeal per §4.2 item 6

terminalProbabilityPpm = clamp(
  event.baseTerminalPpm
  + event.allowedStatePressure(state)
  + lateRunAdjustmentPpm[day],          // v1: all zeros (§4.11(c))
  50_000,
  450_000
)
```

`event.allowedStatePressure(state)` must be a declared per-event function
with declared bounds such that `baseTerminalPpm + maxPressure +
maxAdjustment ≤ 450_000` and the minimum sum ≥ 50_000 — provable statically.
The probability validator checks the declared-bounds arithmetic, not just
clamp behavior.

Tickets are persisted before presentation. The event record declares whether
a terminal result means victory, defeat, or a typed scenario-specific
closure. The same ticket drives preview bounds and final resolution; the
exact roll remains sealed. Suppressed occurrences (§4.12(e)) are not
occurrences: simulations report suppression counts alongside realized
density.

**Independent acceptance:** A probability validator reads static tables and
serialized event records only. It checks zero pre-day-18 occurrence,
monotonic density, caps, deterministic tickets, separate
occurrence/termination rolls, declared-bounds arithmetic, near-miss
reachability, terminal idempotency, and absence of terminal claims in
nonterminal prose. Large seed simulations report confidence intervals rather
than asserting the generator's own expected values.

**Stop conditions:** Copy matching controls termination; a reload rerolls;
terminal probability escapes declared bounds; or a Doomsday event lacks a
nonterminal path.

**Exit:** Promoted escalatory and Doomsday packs with sealed mechanics.

## Epoch 025 — Semantic end-of-day prosecution compiler

**Depends on:** Epoch 024 and the existing authoritative `resolve-day` route.

**Objective:** Persist a complete semantic execution record in the same
authorized day transition, then realize the cold prosecution scene from that
record.

**Contracts consumed:** §4.17 (scene contract — ratification point for
sub-summary fields), §4.12(a), §4.3.

**Owned files:**

- `DailyResolutionRecord` schema/version extension;
- execution-scene semantic compiler and realization pack;
- restore compatibility;
- resolution integration and tests;
- no new resolver.

**Semantic output:** §4.17's `ExecutionScene` verbatim, with sub-summary
minimum fields per the §4.17 table.

**Procedure:**

1. Resolve mechanics through the existing Nexus/`resolve()` authority
   (`db/turns.ts` grant path; no second resolver).
2. Build `ExecutionScene` from resulting ledgers before incremented-day
   dockets are exposed.
3. Validate required and forbidden claims against semantic fields, covering
   every sub-summary row of the §4.17 table.
4. Select a promoted execution recipe deterministically (§4.2 idiom).
5. Persist semantic scene and realization identity in `resolutionHistory`.
6. Render prose as a pure projection. Reopening reads persisted data.
7. Preserve existing war dispatches as compatible report projections until
   all consumers migrate.

**Register contract:** Prosecution prose names institutions, actions, costs,
exchanges, failures, and residues. It avoids motivational commentary,
unearned catharsis, generic heroism, colloquialism, and secret enemy
actuality.

**Independent acceptance:** Construct hand-authored semantic resolution
fixtures and expected required/forbidden claim sets. The validator checks the
scene without importing `resolve()` or the renderer (`npm run
test:execution-scenes`). Renderer tests assert all required claims appear and
forbidden claims do not, while semantic digest stays identical across
web/Ava/terminal renderers. The doomsday field is proven incapable of
carrying the sealed roll: the validator greps the schema for numeric roll
fields and fails if any exist (§4.17).

**Stop conditions:** Scene prose is generated before mechanics; a scene can
change state; hidden adversary data leaks; or existing resolution
idempotency changes.

**Exit:** Every day has a persisted, replayable prosecution scene.

## Epoch 026 — Battle Log and cross-surface prosecution adapters

**Depends on:** Epoch 025.

**Objective:** Replace the in-campaign Service Record with Battle Log, open
it on manual resolution, and expose the same disclosed semantic history
through supported adapters.

**Contracts consumed:** §4.15 (surface matrix), §4.17, Epoch 009 step 4's
turnover-path finding.

**Owned files:**

- `BriefingInterface.tsx` Battle Log surface;
- `GameClient.tsx` post-redemption presentation state;
- navigation, glossary, command grammar, Ava/Nexus report projection,
  terminal and SSH renderers;
- styles and parity tests.

**Behavior:**

1. Manual Resolve Day redemption returns the authoritative next state with
   the newly persisted execution scene (`db/turns.ts`
   claim/redeem path).
2. The client opens Battle Log focused on `resolvedDay`; it does not
   reconstruct the scene from pre-resolution state.
3. Automatic turnover behavior implements exactly what Epoch 009 step 4
   recorded: the scene is recorded by the same authorized transition; no
   surface forcibly steals focus; the next opening displays an unread-log
   affordance per §4.15.
4. Battle Log lists day, sector, tier, intensity, heat, active Romantic
   epoch, continuing operation, outcome, losses, movement, Doomsday status,
   and residues.
5. Opening an entry renders its persisted prosecution scene.
6. `battle log` becomes the canonical command. `service record` and `record`
   remain compatibility aliases in active campaigns. Outside an active
   campaign, the aliases produce the canonical notice "No active campaign;
   completed campaigns live under Account → Campaign Records." Account-level
   completed Campaign Records keep their existing name, route, and UI (R14).
7. Ava Classic receives Battle Log semantic entries through Nexus; no
   renderer scrapes the web surface.

**Independent acceptance:** An integration fixture (`npm run test:battle-log`)
performs one authorized day redemption and verifies exactly one new scene,
Battle Log focus on the resolved day, stable reload, no second resolution,
and identical semantic IDs through browser/Nexus/terminal/native SSH — and
absence on §4.15's "—" cells. Text styling is tested separately from
semantic parity.

**Stop conditions:** The account Campaign Record is renamed, focus requires
a second resolution call, automatic turnover traps the user in a modal, or
any surface computes a result independently.

**Exit:** Battle Log is the canonical in-campaign prosecution history.

## Epoch 027 — Independent campaign validation, balance proof, promotion, and seal

**Depends on:** Epochs 009–026.

**Objective:** Validate the complete system with independent oracles, prove
the 30-day experience and learning loop, promote only reviewed content, and
seal the superepoch without deployment.

**Contracts consumed:** all of Part 4; §4.13 (suite, ESS — ratification
point); Part 5 (gate order).

**Owned files:**

- standalone validators under `validation/` or `scripts/validate-*` that do
  not import producer implementations;
- hand-authored fixtures and mutation corpus;
- simulation reports and final receipts;
- integrity manifests.

**Validator separation rule:** Generators may emit JSON against neutral
schemas. Validators may consume those schemas and serialized JSON, but may
not import enumeration, decompilation, prism, ranking, scheduler, resolution,
or renderer implementation modules. A dependency-boundary test enforces
this.

**Required validation suites:**

1. **Protected library:** source hashes from Epoch 009 remain identical.
2. **Deterministic Contentgen:** repeated enumeration/decompilation/indexing
   is byte-identical; changed layers are attributable.
3. **Mutation gates:** every authority, continuity, register, mechanic, and
   confusable mutation has the expected independent §4.8(b) failure class.
4. **Review completeness:** no batch closes with unresolved candidates
   (§4.7(b)); every promoted recipe has authenticated review and valid
   lineage.
5. **Learning:** group-isolated held-out evaluation against §4.9 values,
   baseline comparison, canary stability, medium-specific false-negative
   ceilings, and reproducible policy bytes.
6. **Prism blast radius:** every active prism has reviewed affected sets and
   no unexplained approved-canary loss (§4.6 rates).
7. **Cross-medium:** shared features transfer; medium gates/residuals remain
   separate; Ava intent and campaign mechanics are unchanged by policy swaps.
8. **Itinerary:** at least 10,000 seeds reaching day 30 complete three or
   more **distinct completed** one-to-three-day Romantic epochs; slot
   intervals pairwise disjoint on every seed (§4.12(d)).
9. **Heat:** every adjacent resolved main-thread beat alternates hot/medium;
   registry coverage makes same-heat fallback impossible (§4.12(f)).
10. **Operations:** multi-day stages advance once, continue under Romantic
    overlays, and close deterministically.
11. **Magnitude:** exact static table use, monotonic bounded increase,
    declared caps, and no runtime exponential decisions — enforced by an
    import scan proving no `Math.exp` in campaign effect paths.
12. **Doomsday:** occurrence density rises after day 17, occurrence and
    termination are separate, terminal rates include confidence intervals,
    tickets never reroll, and suppressed occurrences are counted and sealed
    (§4.12(e)).
13. **Prosecution:** every resolution has one semantic execution scene with
    required claims, no hidden claims, and stable reopening.
14. **Battle Log:** manual resolve focus, automatic unread affordance,
    legacy aliases (including the §6-Epoch-026-step-6 out-of-campaign
    notice), permanent Campaign Record preservation, and cross-surface
    parity per §4.15.
15. **Save compatibility:** hand-authored saves from before the metastratum
    restore, resolve once, and migrate deterministically.
16. **Security/discovery:** ordinary users cannot reach Contentgen routes or
    latent catalogs; exports contain no reviewer email, secret, hidden seed,
    terminal roll, or future itinerary.
17. **Cloudflare:** required types, build, typecheck, and dry-run
    validations pass without alternate hosting configuration.
18. **Effective abundance:** exact legal capacity ≥ 100,000, no 30-day run
    repeats a bound realization, spine cooldowns hold, simulated
    exact-realization collision remains below 0.5% (point estimate, 95% CI
    reported), and ESS per §4.13 shows each declared tier contributes
    visible variety.
19. **Sealed-ticket replay:** any persisted ticket re-derives the identical
    ppm from its recorded inputs (§4.2).

**Balance evidence:** Report distributions by theater, archetype, adversary,
and seed for Romantic coverage, content repetition, event tier by day,
operation duration, casualties, movement, campaign length, Doomsday
occurrence (including suppression counts), and terminal outcome — extended
through the existing `scripts/simulate-campaign-balance.sh` harness; a
second simulator entry point is a stop condition. Compare observed confidence
intervals to declared design ranges. A failing range produces a new
versioned table or mechanic epoch; it is not fixed by changing prose or
weakening the validator.

**Independent acceptance:** The aggregate validator
(`npm run validate:epoch-009-027`) runs as a separate executable over
serialized artifacts, fixtures, and public semantic outputs. Its
import-boundary test fails if it imports any artifact generator, scheduler,
trainer, resolver, or renderer implementation.

**Final commands (canonical order, Part 5):**

```bash
# every focused Contentgen, campaign-metastratum, scheduler, execution,
# Battle Log, and independent-validation command created by prior epochs
npm run test:ava-content-quality
npm run test:ava-content-quality-epoch-008
npm run test:substrate
npm run typecheck
npm run build
npm run cloudflare:types
npm run cloudflare:validate
npm run validate:epoch-009-027
git diff --check
```

**Seal:** Record exact base and completed commits, tree identity, toolchain,
content/policy/table/manifest hashes, all node receipts, simulation report,
SHA-256 source manifest, and the SHA-256 of this specification document.
Append every execution result to `DELENDA_QUEST_UBERDOC.md`.

**Stop conditions:** Any required suite fails; independent validators import
artifact producers; a promoted candidate lacks authenticated review; observed
balance contradicts declared bounds; or sealing would require deployment.

**Exit:** A sealed, local, doctrine-compliant implementation ready for a
separate release decision.

---

# PART 7 — DEPENDENCY GRAPH

```text
008 authenticated existing infrastructure (validated §1.1)
  -> 009 historical repair and compatibility freeze
  -> 010 Contentgen doctrine + shared chord contracts (freezes §4.1–§4.9)
  -> 011 cross-medium enumeration
  -> 012 decompiler matrix + hard prisms
  -> 013 alive/dead corpus + deterministic RAG
  -> 014 durable authenticated review service
  -> 015 appified Contentgen Lab
  -> 016 optional AI priority evidence          (externally gated, see below)
  -> 017 deterministic self-training + prism proposals
  -> 018 policy promotion + cross-medium application
  -> 019 campaign metastratum + static pacing tables
  -> 020 itinerary + main-thread scheduler      (implements §4.12)
  -> 021 multi-day operations + convergence
  -> 022 Routine/dramatic manoeuvre pack        (§4.14 pipeline)
  -> 023 Romantic epoch pack                    (§4.14 pipeline)
  -> 024 Escalatory/Maximum/Doomsday pack       (§4.14 pipeline)
  -> 025 semantic daily prosecution
  -> 026 Battle Log + adapters
  -> 027 independent proof, promotion, and seal
```

Epoch 016 is externally gated because a real model call requires provider,
retention, cost, and secret authorization. Its provider-neutral contracts and
replay tests may be implemented without that authorization, but it cannot be
declared operational with `judgeId != NONE` until the gate is satisfied.

The 016→017 edge is a **data-flow preference, not a hard gate**: Epoch 017
may start once Epoch 015 and a completed, exported corpus (Epochs 013/014)
exist. AI evidence columns are optional features in the training schema; a
policy trained without them must reproduce byte-identically from its
receipt.

---

# PART 8 — REQUIREMENT-TO-EPOCH TRACE

| Requirement | Primary epoch(s) | Frozen law |
|---|---|---|
| R01–R02 | 009, 019, 022–024, 027 | §4.10, §6-009 step 5 |
| R03–R11 | 019–024, 027 | §4.10–§4.12 |
| R12–R15 | 025–026, 027 | §4.15, §4.17 |
| R16–R19 | 010–013, 018 | §4.3–§4.5 |
| R20–R26 | 014–016 | §4.7–§4.9, §4.14 |
| R27–R31 | 017–018 | §4.5, §4.6, §4.9 |
| R32 | 010, 016–018 | §4.7 |
| R33–R35 | every epoch; final proof in 027 | §4.2, §4.3, §4.16 |
| R36–R40 | 014, 019–027 | §4.2, §4.15 |
| R41 | 011, 022–024, 027 | §4.13 |

---

# PART 9 — COMPLETION DEFINITION

This superepoch is complete only when:

1. Epochs 009 through 027 each have doctrine-compliant directories (§4.16),
   bounded nodes, receipts, and passing focused gates.
2. Epoch 008's historical documentation is corrected append-only.
3. The Contentgen Lab can generate a seeded list, show deterministic failures
   and AI-prioritized curious cases, require authenticated disposition for
   every candidate (§4.7), preserve reductions and corpses, train a
   reproducible policy (§4.5), evaluate it independently, and feed a promoted
   policy into the next sample cycle (§4.14).
4. Ava and narrative media share learned evidence only through declared
   shared features and retain separate semantic owners and validators (§4.5).
5. A 30-day campaign demonstrably contains three or more completed
   one-to-three-day Romantic epochs, multi-day operations, strict hot/medium
   alternation, increasing event magnitude, and denser late-run Doomsday risk
   (§4.11, §4.12).
6. Every resolved day produces one persisted execution scene and Battle Log
   presents it from the canonical semantic record (§4.15, §4.17).
7. Existing authored libraries remain unchanged and all new content is
   reviewed through additive promoted manifests (R01, §4.14).
8. Independent validators, full repository gates, Cloudflare validation, and
   source-manifest sealing pass (Part 5).
9. Every Appendix C change entry is shown applied; every Part 4 contract is
   traceable to code or schema; this document's SHA-256 is recorded in the
   Epoch 027 seal.
10. No production deployment or external activation is inferred from the
    seal.

---

# APPENDIX A — VALIDATION EVIDENCE (2026-08-03, live repository)

| # | Claim verified | Evidence | Verdict |
|---|---|---|---|
| 1 | Epoch 008 commit exists, ancestor of `origin/main` | `git cat-file -t` → commit; `git branch -a --contains 0e4daf7…` lists `origin/main` | PASS |
| 2 | Proposal base `fd4b783` on `codex/epoch-006` | `git log --oneline -1`; `git branch --show-current` | PASS |
| 3 | `test:ava-content-quality` 4/4 | executed live: pass 4, fail 0 | PASS |
| 4 | `test:ava-content-quality-epoch-008` 3/3 | executed live: pass 3, fail 0 | PASS |
| 5 | `typecheck` passes | executed live: `tsc --noEmit` exit 0 | PASS |
| 6 | Epoch 008 "not pushed" defect | `docs/epochs/epoch-008-ava-quality-infrastructure/README.md:3` | PASS (defect real) |
| 7 | Epoch 008 missing node files | dir contains README + receipts only; Epoch 007 exemplar has `nodes/NODE-00…09` | PASS (defect real) |
| 8 | Seven manoeuvre mechanics | `app/game.ts:496`; `app/campaign-substrate.ts:414` | PASS |
| 9 | Four theaters | `app/campaign-substrate.ts`: industrial 6, lowland 9, ridge 6, river 6 | PASS |
| 10 | Eight problem classes | `app/campaign-substrate.ts` | PASS |
| 11 | Four campaign phases | `app/game.ts:179,208` | PASS |
| 12 | Nexus `resolve-day` action | `app/ava/nexus.ts:866` (+986, 1279, 2609) | PASS |
| 13 | Resolution grants | `db/turns.ts:54,223,388`; `app/api/turn/route.ts` | PASS |
| 14 | Legacy `service record` command | 9 Ava files + `app/substrate/command-parser.ts` + `app/AccountPage.tsx` | PASS |
| 15 | Gate calculus / persisted dockets | `app/campaign-substrate.ts:115,251,534` | PASS |
| 16 | Node-file doctrine | `SUBSTRATE_DOCTRINE.md` §19 | PASS |
| 17 | `DELENDA_QUEST_UBERDOC.md` logbook | present, append-only per doctrine | PASS |
| 18 | Parking-lot rule | `AGENTS.md` planning memory; `docs/parking-lot/` | PASS |
| 19 | Epoch 008 corpus foundation | `content-quality/corpus/` | PASS |
| 20 | SSH/terminal surfaces | `packages/{ssh-gateway,ssh-server,terminal-core}` | PASS |
| 21 | Hash idiom + duplicate | `app/substrate/hash.ts:10`; `app/campaign-substrate.ts:113` | PASS |
| 22 | Cloudflare topology/scripts | `wrangler.jsonc`, `cloudflare:types`, `cloudflare:validate` | PASS |
| 23 | Epoch count 009–027 = 19 | arithmetic | PASS |

Deferred to runtime gates (§1.3): `build`, `cloudflare:types`,
`cloudflare:validate`.

# APPENDIX B — MATHEMATICAL VERIFICATION

Method: independent recomputation from the documented source formulas in
managed Python (`math.exp`), no repository code imported (satisfying R33 for
the check). Reproducible via `verify_epoch_math.py` (workspace).

Results:

- **Magnitude table (§4.11(a)): all 35 anchor cells PASS** — days
  {1, 5, 10, 15, 20, 25, 30} × {curve, routine, romantic, escalatory-standard,
  escalatory-maximum}, matched within documented rounding (curve 4 dp, others
  3 dp). Day-30 values exact by construction (1.35 / 1.80 / 2.50 / 3.50).
- **Doomsday occurrence (§4.11(b)): all 4 anchors PASS** — day 18 = 0.089616 →
  0.090; day 20 = 0.215564 → 0.216; day 25 = 0.358425 → 0.358; day 30 =
  0.401454 → 0.401. Exactly zero for days 1–17; strictly increasing 18–30;
  ≤ 0.42 cap throughout.
- **Terminal clamp:** `[50_000, 450_000]` ppm = `[0.05, 0.45]` ✓.
- **Slot fit:** latest slot-C start (27) + max duration (3) occupies days
  27–29, fits by day 30 ✓.
- **Slot overlap hazard (fixed in §4.12(d)):** documented windows admitted
  A-occupancy through day 10 = B's earliest start, and B-occupancy through
  day 19 = C's earliest start; the §4.12(d) rejection stream makes overlap
  impossible by construction.

# APPENDIX C — CHANGE PROVENANCE VS. THE ORIGINAL PROPOSAL

Every difference between this specification and `epoch.md` is listed here.
Categories: **ERR** = original text was wrong or contradictory (evidence
cited); **PIN** = original was silent; value pinned for determinism;
**CLAR** = original was ambiguous between readings; one reading made binding.
Ratification points per §0.4 in parentheses.

**Errata (10):**

1. **ERR — Epoch 023 "both phases".** The game has four phases
   (`app/game.ts:179,208`). Now: per-phase minimum across all four, proven
   from gate metadata (§6 Epoch 023).
2. **ERR — slot overlap.** Windows admitted disjointness violations; now
   impossible by construction via the §4.12(d) rejection stream (Appendix B).
3. **ERR — "era".** Undefined; mapped to `CampaignPhase`; "phase" only
   (§4.1).
4. **ERR — `MainThreadPrompt` missing routine.** Four-variant union now
   (§4.12(b)).
5. **ERR — undefined `precomputedLateRunAdjustment`.** Now a first-class
   table, v1 = zeros (§4.11(c)).
6. **ERR — batch form vs. frozen manifest.** Single data flow pinned
   (§4.14).
7. **ERR — command registry gaps.** Added `validate:epoch-009`,
   `contentgen:corpus`, `--judge NONE` spelling; canonical gate order; no
   second simulator (Part 5).
8. **ERR — Epoch 023 heat qualifier.** Deleted; both heats mandatory for
   every arc and beat (§4.12(f)).
9. **ERR — interruption vs. R05.** Guaranteed arcs Doomsday-immune;
   suppression sealed; suspension applies to standing intent only; optional
   arcs (the only interruptible kind) ship as constant zero in v1
   (§4.12(e)/(h)).
10. **ERR — `durationDays` excludes 1.** Legacy one-day cutover pinned
    (§4.10).

**Pinned values (17):** hash/roll contract incl. boundary clamps and ticket
grammars (§4.2, ratify@010); initial heat draw (§4.12(c)); slot draw +
deferral + last-feasible-start (§4.12(d)(e), ratify@020); attestation sample
size 8 (§4.4, ratify@011); trainer hyperparameters (§4.5, ratify@017 via
010 contract); promotion thresholds Δ = 0.005, FN ceiling 0.10, zero canary
flips (§4.9, ratify@018); curiosity weights + τ = 0.65 (§4.9); analogues
k = 4+4 (§4.9, ratify@016); judge retries ≤ 2, controls 6/batch (§6 Epoch
016, ratify@016); reason-code enum (§4.8(a), ratify@010); failure-class enum
(§4.8(b), ratify@010); priority bands P0–P3 (§4.8(c), ratify@016);
contracts location `packages/contentgen-contracts/` (§6 Epoch 010);
novelty metric + duplicate thresholds (§4.9, ratify@013); simulation suite
10,000 seeds + ESS formula + flag rule (§4.13, ratify@027); arc-selection
tie-break (§4.12(g), ratify@020); optional arcs = 0 (§4.12(h), ratify@020).

**Clarifications (15):** R05 counts completed arcs only (§4.12(d));
beat = day equality (§4.12(d)); BlastRadius rate denominators + null rule
(§4.6); proposal precision definition (§4.6); probability fallback chain
(§4.9); NONE-mode judge terms (§4.9); "dual independent lint" definition
(§6 Epoch 012); P0–P4 definitions (§4.4, ratify@012); judge checklist freeze
(§6 Epoch 016); TerminalRisk placement + tier/intensity/magnitude wiring
(§4.10, §4.12(a)); ExecutionScene sub-summary minimums (§4.17,
ratify@025); NarrativeSlot type (§4.10, ratify@020); legacy alias behavior
outside campaigns (§6 Epoch 026); audit-slot rounding max(1, floor(20%))
(§4.9); 016→017 soft edge (§7).

*End of unified specification.*
