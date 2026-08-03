# PL-AVA-001 — Ava content quality decompiler

| Field | Value |
|---|---|
| ID | `PL-AVA-001` |
| Captured | 2026-08-02 |
| State | `PARKED` |
| Depends on | Existing Ava relevance graph; existing voice realization path; repository test harness |
| External dependency | None for deterministic phases; optional model provider for adjudication phase |
| Owner boundary | Content tooling may recommend or reject text; it may not own command interpretation, game state, campaign outcomes, or player authority |

## Objective

Create a repository-backed content-quality compiler for Ava's finite and
parameterized grammar. The compiler must enumerate what the grammar can say,
decompile each output into inspectable semantic and rhetorical evidence, compare
it with a versioned approved/rejected corpus, and produce deterministic quality
reports before content is allowed into the runtime corpus.

The target is not an automatic oracle for artistic merit. The target is a
content system in which unexamined prose cannot silently ship. The system must
make relevance, novelty, voice, authority safety, and reviewer disagreement
visible and reproducible.

## Preserved decisions

1. The canonical command compiler remains the only owner of intent and state.
2. Ava content is a realization layer and cannot manufacture outcomes.
3. A grammar miss abstains; it must not invent a clever line.
4. A quality score is never sufficient by itself. Hard safety gates precede
   soft quality ranking.
5. Every generated candidate is identified by a stable production ID, parameter
   tuple, corpus version, feature schema version, and content hash.
6. LLM judgments are evidence with provenance, not truth. They cannot override
   deterministic authority or safety gates.
7. Human taste labels are required to create and periodically recalibrate the
   approved and rejected boundaries.
8. All promoted content is versioned in Git and can be rebuilt from a clean
   checkout.

## Explicit non-goals

- No live model call on the player request path.
- No cloud vector database requirement.
- No production D1 schema change for the first seven epochs.
- No automatic rewriting of authored lines.
- No automatic deletion of rejected lines; rejections are training evidence.
- No claim that embeddings, LLM judges, or a scalar metric can prove taste.
- No content-quality module in `app/ava/hacking.ts` or the intrusion library.
- No migration of the relevance graph into a second command grammar.

## Dependency graph

```text
E0 current-state contract and manifest schema
  |
  +--> E1 grammar enumeration and content snapshot
  |      |
  |      +--> E2 deterministic decompiler and feature vector
  |             |
  |             +--> E3 hard gates, claims, and authority lint
  |             |      |
  |             |      +--> E6 CI/watchers and epoch diffs
  |             |
  |             +--> E4 corpus retrieval, duplicate detection, and chord coverage
  |                    |
  |                    +--> E5 weak supervision and taste boundary
  |                           |
  |                           +--> E7 constrained LLM adjudication
  |                                  |
  |                                  +--> E8 optimization, reports, and promotion policy
  ```

The order is intentionally conservative. E0–E4 provide value without an LLM.
E5 makes taste explicit before an LLM is asked to imitate it. E7 is optional
and cannot be activated merely because this plan exists.

## Shared vocabulary

### Candidate

One concrete utterance produced by one grammar production and one complete
parameter tuple.

### Chord

The semantic tension the line is allowed to illuminate, such as `delay`,
`trust`, or `loss`. A chord is not merely a keyword category.

### Rhetorical shape

The compact structure of a line, for example:

```text
concession -> reversal -> consequence
observation -> contrast -> image
question -> omitted premise -> inference
```

### Content contract

The machine-readable rules for one chord: triggers, latent tension, allowed
rhetorical moves, forbidden moves, image families, voice temperature, claim
budget, and novelty requirements.

### Decompilation

The reverse analysis of a candidate into chord evidence, claims, rhetorical
shape, voice features, corpus neighbors, and verdict evidence.

## Epoch E0 — Contract, ownership, and schema freeze

### Purpose

Define the content-quality intermediate representation before writing scoring
logic. This prevents a quality tool from becoming an untyped pile of heuristics.

### Exact procedure

1. Inspect all current content producers and consumers:

   ```bash
   rg -n "REALIZATIONS|compileAva|AvaVoiceCue|relevance|voice" app tests scripts docs
   ```

2. Record each source of authored text and classify it as:

   - canonical command result;
   - realization-only aside;
   - informational campaign text;
   - intrusion-library content;
   - test fixture.

3. Reject any plan to make the decompiler own a source outside the content
   boundary.

4. Add a schema module under `app/ava/content-quality/` or an equivalent
   package boundary. Keep the first schema dependency-free and serializable.

5. Add a schema version constant. Any incompatible field change increments it.

### Canonical manifest types

```ts
type ContentQualityVersion = "ava-content-quality/v1";

type CandidateKey = {
  productionId: string;
  parameters: Record<string, string | number | boolean>;
  seed: number;
};

type Candidate = CandidateKey & {
  text: string;
  chord: string;
  sourceFile: string;
  sourceLine?: number;
  realizationId?: string;
};

type ContentManifest = {
  version: ContentQualityVersion;
  grammarVersion: string;
  corpusVersion: string;
  generatedAt: string;
  candidateCount: number;
  candidates: Candidate[];
  manifestHash: string;
};
```

### Acceptance tests

- The schema can round-trip through JSON without losing IDs.
- Missing production ID, chord, text, or grammar version is rejected.
- The manifest hash changes when text, parameters, or grammar version changes.
- The schema contains no player account, secret, or campaign mutation field.

### Exit artifact

`docs/parking-lot/PL-AVA-001-content-quality-decompiler.md` remains parked;
implementation is not authorized until this named epoch is explicitly
activated.

## Epoch E1 — Complete grammar enumeration

### Purpose

Turn the reachable grammar into a finite, inspectable corpus. If a grammar has
an unbounded input surface, enumerate bounded equivalence classes rather than
pretending to enumerate infinity.

### Exact procedure

1. Identify every production function and its parameter domains.
2. Define a bounded domain for each free parameter.
3. Define a canonical ordering for domains. Never depend on object-key order or
   filesystem traversal order.
4. Compile the Cartesian product in canonical order.
5. Catch and record rejected/incomplete productions rather than stopping the
   entire enumeration.
6. De-duplicate only after recording the original production keys.
7. Hash each candidate using normalized text plus its production identity.
8. Write a JSONL manifest and a summary report.

### Pseudocode

```text
function enumerateGrammar(grammar, domains, options):
    candidates = []
    failures = []

    for production in sortById(grammar.productions):
        domain = canonicalizeDomains(production, domains)
        for parameters in cartesianProduct(domain):
            key = {
                productionId: production.id,
                parameters: parameters,
                seed: options.seed
            }
            try:
                output = production.compile(parameters, options.seed)
                if output.kind == "abstain":
                    failures.append({ key, reason: output.reason })
                    continue
                candidate = makeCandidate(key, output)
                candidate.contentHash = sha256(normalize(candidate.text))
                candidates.push(candidate)
            catch error:
                failures.append({ key, reason: serializeError(error) })

    return {
        version: "ava-content-quality/v1",
        candidates: stableSort(candidates, candidateOrder),
        failures: stableSort(failures, failureOrder),
        manifestHash: sha256(canonicalJson(candidates))
    }
```

### Bounded-equivalence rule

When a player-language grammar is unbounded, define equivalence classes using
the semantic atoms already authorized by the command compiler. For example,
`wait`, `later`, and `not yet` may be separate surfaces but share the same
bounded delay class. The enumerator must record the representative and the
reason the class is complete enough for this test.

### Acceptance tests

- Running twice with the same checkout and seed produces byte-identical JSONL.
- Every reachable realization has one production key.
- Every failure has a reason and source location.
- A new production increases or intentionally changes the manifest diff.
- The enumerator never invokes network access or a model.

## Epoch E2 — Deterministic decompiler and feature extraction

### Purpose

Convert every candidate into evidence that a human and a later adjudicator can
inspect. This is the low-level classical layer: transparent, cheap, and
watcher-friendly.

### Feature groups

#### Surface features

```text
character_count
token_count
sentence_count
clause_count
average_clause_length
unique_token_ratio
word_ngram_set
character_ngram_set
punctuation_profile
```

#### Grammar features

```text
declared_chord
matched_trigger_atoms
matched_trigger_weights
forbidden_atom_hits
production_id
realization_id
parameter_count
```

#### Syntactic features

```text
pos_histogram
verb_density
concrete_noun_proxy
abstract_noun_proxy
modal_count
imperative_count
question_count
negation_count
second_person_count
```

#### Rhetorical features

```text
contrast_marker_count
causal_marker_count
concession_marker_count
reversal_marker_count
image_candidate_count
parallelism_signature
ending_clause_signature
```

#### Authority features

```text
outcome_verb_hits
mutation_verb_hits
hidden_state_claim_hits
psychological_diagnosis_hits
imperative_action_hits
```

### Pseudocode

```text
function decompile(candidate, contract, corpusIndex):
    normalized = normalize(candidate.text)
    tokens = tokenize(normalized)
    sentences = splitSentences(candidate.text)

    claims = extractClaims(candidate.text)
    rhetoricalShape = inferRhetoricalShape(candidate.text)
    voice = measureVoice(candidate.text, contract.voiceProfile)
    authority = scanAuthority(candidate.text)
    neighbors = corpusIndex.retrieve(candidate.text, candidate.chord, limit=8)

    return {
        candidate,
        normalized,
        claims,
        rhetoricalShape,
        features: extractAllFeatures(candidate, tokens, sentences, contract),
        voice,
        authority,
        neighbors,
        decompilerVersion: "ava-content-decompiler/v1"
    }
```

### Important constraint

The claim extractor is an evidence extractor, not a truth engine. It may say
“this line appears to assert X.” It may not say that X happened in the game.

### Acceptance tests

- Feature extraction is deterministic and JSON-stable.
- Every feature has a documented interpretation and unit.
- The decompiler preserves the original text exactly alongside normalized text.
- The same line produces the same rhetorical and authority signatures.
- Feature extraction does not call a model.

## Epoch E3 — Hard gates and authority lint

### Purpose

Make certain classes of bad content impossible to promote regardless of its
style or LLM score.

### Hard-gate rules

```text
G1 missing chord evidence                 -> REJECT
G2 unsupported state/outcome claim        -> REJECT
G3 mutation or command-like imperative     -> REJECT
G4 exact duplicate                         -> REJECT
G5 near duplicate above threshold          -> REJECT or REVIEW
G6 forbidden phrase or image              -> REJECT
G7 no player-surface relevance             -> REJECT
G8 malformed/empty output                  -> REJECT
G9 exceeds claim budget                    -> REVIEW or REJECT
G10 source provenance missing             -> REJECT
```

### Pseudocode

```text
function hardGate(decompiled, contract, index):
    reasons = []

    if not chordEvidence(decompiled, contract):
        reasons.push("G1_MISSING_CHORD_EVIDENCE")
    if decompiled.authority.outcomeClaims > 0:
        reasons.push("G2_UNSUPPORTED_OUTCOME")
    if decompiled.authority.mutationClaims > 0:
        reasons.push("G3_MUTATION_LANGUAGE")
    if index.exactText.has(decompiled.normalized):
        reasons.push("G4_EXACT_DUPLICATE")
    if contract.forbiddenPatterns.matches(decompiled.normalized):
        reasons.push("G6_FORBIDDEN_PATTERN")
    if not decompiled.features.matchedTriggerAtoms.length:
        reasons.push("G7_NO_SURFACE_RELEVANCE")
    if not decompiled.candidate.sourceFile:
        reasons.push("G10_MISSING_PROVENANCE")

    return reasons.length == 0
        ? { verdict: "PASS", reasons: [] }
        : { verdict: "REJECT", reasons: stableSort(reasons) }
```

### Exact implementation procedure

1. Start with explicit pattern lists, not a trained classifier.
2. Put every pattern in a versioned contract file with a rationale.
3. Add one positive and one negative test per pattern.
4. Run the entire enumerated corpus.
5. Inspect false positives manually.
6. Change thresholds only through a reviewed commit.
7. Store the prior report so the watcher can show newly rejected and newly
   accepted candidates.

### Acceptance tests

- A line with a fabricated campaign result is rejected even if it is elegant.
- A line with a command imperative is rejected from realization content.
- A line with no declared or inferred chord abstains/rejects.
- Every rejection has at least one stable machine-readable reason.

## Epoch E4 — Corpus, retrieval, duplication, and chord coverage

### Purpose

Create the training/evaluation substrate and retrieve useful analogues without
turning the runtime into a remote RAG dependency.

### Corpus layout

```text
content-quality/
  contracts/
    chords.json
    voice-profile.json
    forbidden-patterns.json
  corpus/
    approved.jsonl
    rejected.jsonl
    adversarial.jsonl
    calibration.jsonl
  generated/
    manifests/
    decompiled/
    reports/
  index/
    tfidf.json
    bm25.json
    minhash.json
```

Each corpus entry must include:

```json
{
  "id": "delay-delegation-v1",
  "text": "Delay is still a choice...",
  "label": "approved",
  "chord": "delay",
  "rhetoricalShape": ["reframe", "consequence"],
  "imageFamily": "delegation",
  "failureReasons": [],
  "rationale": "Reframes delay as agency transfer without claiming an outcome.",
  "review": { "reviewer": "human", "date": "2026-08-02" },
  "corpusVersion": "ava-taste/v1"
}
```

### Retrieval stack

Use deterministic hybrid retrieval:

```text
lexical = BM25(candidate, corpus)
tfidf = cosine(TFIDF(candidate), TFIDF(corpus))
shape = exactOrWeightedShapeMatch(candidate, corpus)
chord = sameChord(candidate, corpus)
semantic = optionalEmbeddingSimilarity(candidate, corpus)

rank = 0.30 * chord
     + 0.25 * lexical
     + 0.15 * tfidf
     + 0.15 * shape
     + 0.10 * novelty
     + 0.05 * semantic
```

The semantic term is optional and must never be the only relevance signal.
Weights and index versions are part of the report hash.

### Duplicate detection

Run exact normalized matching first. Then use word 3-grams and character
5-grams for Jaccard similarity. MinHash can accelerate larger corpora, but the
exact threshold decision must be rerun on the candidate pair before rejection.

```text
function duplicateClass(candidate, corpus):
    if exactNormalizedMatch(candidate, corpus):
        return "EXACT"

    neighbors = minhashBuckets(candidate)
    for neighbor in neighbors:
        wordJaccard = jaccard(words3(candidate), words3(neighbor))
        charJaccard = jaccard(chars5(candidate), chars5(neighbor))
        if max(wordJaccard, charJaccard) >= DUPLICATE_THRESHOLD:
            return "NEAR_DUPLICATE"

    return "UNIQUE"
```

### Chord coverage report

For each chord, report:

```text
reachable candidates
hard rejects
review candidates
approved candidates
unique rhetorical shapes
unique image families
duplicate clusters
average feature vector
nearest approved distance
uncovered trigger classes
```

### Acceptance tests

- Corpus entries are immutable by ID; corrections append a revision.
- Exact duplicates are found without MinHash.
- Near duplicates produce a pairwise evidence record.
- Every chord has at least one approved or explicitly parked gap.
- Retrieval is stable under repeated runs.

## Epoch E5 — Weak supervision and taste boundary

### Purpose

Combine imperfect deterministic signals without pretending any one heuristic
defines quality. This is the closest analogue to the project's watcher and
Supergit style: small declarative rules, lineage, conflict visibility, and
versioned outputs.

### Labeling-function contract

```ts
type Label = "ACCEPT" | "REJECT" | "ABSTAIN";

type LabelingFunctionResult = {
  id: string;
  label: Label;
  reason: string;
  evidence: string[];
  version: string;
};
```

### Initial labeling functions

```text
LF_CHORD_EVIDENCE
LF_AUTHORITY_SAFE
LF_NO_DUPLICATE
LF_HAS_SPECIFIC_IMAGE
LF_IS_NOT_GENERIC
LF_HAS_RELEVANT_SURFACE_EDGE
LF_MATCHES_APPROVED_SHAPE
LF_REPEATS_IMAGE_FAMILY
LF_OVERLONG_OR_EXPLAINED
LF_CLICHE_PATTERN
LF_UNSUPPORTED_PSYCHOLOGY
```

### Procedure

1. Run every labeling function over the entire manifest.
2. Store every result, including abstains.
3. Produce a conflict matrix by labeling-function pair.
4. Hand-review a stratified sample of unanimous accepts, unanimous rejects,
   and conflicts.
5. Add labels to `calibration.jsonl`.
6. Fit or configure an aggregation policy from those labels.
7. Keep the aggregate verdict separate from each source verdict.

### Pseudocode

```text
function aggregateLabels(candidate, labelers, calibration):
    results = labelers.map(fn => fn(candidate))
    hardReject = results.some(r => r.id == "LF_AUTHORITY_SAFE" && r.label == "REJECT")
    if hardReject:
        return verdict("REJECT", results, "authority gate")

    weighted = weightedVote(results, calibration.weights)
    if weighted.accept >= calibration.acceptThreshold
       and weighted.reject < calibration.rejectThreshold:
        return verdict("ACCEPT_CANDIDATE", results, "weighted agreement")

    if weighted.reject >= calibration.rejectThreshold:
        return verdict("REJECT_CANDIDATE", results, "weighted disagreement")

    return verdict("REVIEW", results, "insufficient agreement")
```

### Boundary principle

The system must preserve “beautiful but irrelevant,” “relevant but boring,” and
“novel but incoherent” as separate failure classes. Do not collapse them into
one negative label; those distinctions tell us which grammar contract needs
repair.

### Acceptance tests

- Labeling-function outputs are independently replayable.
- Conflicts are visible rather than silently averaged away.
- Hard authority rejection cannot be outweighed by style votes.
- Aggregate labels include complete lineage.

## Epoch E6 — Watcher, CI, and Supergit-style epoch diffs

### Purpose

Make content quality change reviewable as a repository event, not a manual
inspection ritual.

### Required commands

```bash
npm run ava:content:enumerate
npm run ava:content:decompile
npm run ava:content:lint
npm run ava:content:index
npm run ava:content:report
npm run ava:content:test
```

The exact script names may be finalized during activation, but each command must
be bounded, deterministic, and usable independently.

### Report contract

Every report includes:

```text
git commit
grammar version
contract version
corpus version
index version
model/judge version or NONE
seed
candidate count
verdict counts
chord coverage
new rejects
new accepts
new duplicate clusters
new unresolved reviews
```

### Watcher diff procedure

```text
old = loadLastPassingReport()
new = runAllDeterministicPhases()

diff = {
  addedCandidates: new.ids - old.ids,
  removedCandidates: old.ids - new.ids,
  verdictChanges: compareVerdicts(old, new),
  coverageChanges: compareChordCoverage(old, new),
  newSafetyFailures: new.safetyFailures - old.safetyFailures
}

if diff.newSafetyFailures not empty:
    fail("content safety regression")
if requiredChordCoverageDrops(diff):
    fail("coverage regression")
if unresolvedReviewRateExceeds(diff):
    warn("taste boundary expanded")
emit(diff)
```

### Promotion gate

The default gate is:

```text
no hard safety failures
no new exact duplicates
no unexplained chord coverage regression
all new candidates have manifests and provenance
all changed approved lines have review evidence
```

An approved line may still be held for human review if the rhetorical shape or
image-family distribution changes materially.

## Epoch E7 — Constrained LLM adjudication

### Purpose

Use a model to resolve the narrow uncertain set after deterministic retrieval
and hard gates. This epoch is optional and must remain offline from the player
request path.

### Activation prerequisites

- E0–E6 pass in a clean checkout.
- Approved, rejected, and adversarial corpora exist.
- A held-out calibration set exists and is not supplied as direct prompt text.
- Provider/model, retention policy, and cost ceiling are explicitly approved.
- No secrets are placed in the repository or plan file.

### Judge input

```json
{
  "candidate": "...",
  "playerSurface": "...",
  "chordContract": { "...": "..." },
  "nearestApproved": ["..."],
  "nearestRejected": ["..."],
  "deterministicEvidence": { "...": "..." },
  "checklist": [
    "Is the candidate relevant to the exact player surface?",
    "Does it express the declared chord?",
    "Does it add a specific insight rather than a keyword echo?",
    "Is it free of unsupported outcome and authority claims?",
    "Is it non-duplicative in premise, image, and cadence?",
    "Does it sound like Ava's declared voice profile?"
  ]
}
```

### Judge output

Require strict JSON:

```json
{
  "checklist": {
    "relevant": true,
    "chordFaithful": true,
    "specific": false,
    "authoritySafe": true,
    "novel": true,
    "voiceConsistent": true
  },
  "verdict": "REVIEW",
  "evidence": ["..."],
  "uncertainties": ["..."],
  "promptHash": "...",
  "modelId": "..."
}
```

### Exact adjudication procedure

1. Select only candidates whose deterministic verdict is `REVIEW`.
2. Freeze the manifest, corpus, prompt template, and model ID.
3. Hash all frozen inputs.
4. Submit candidates in a randomized order, but preserve candidate IDs outside
   the text shown to the judge when performing blind comparisons.
5. Ask for binary checklist decisions, not an overall 1–10 quality score.
6. Repeat only unstable or high-impact judgments, using a fixed retry budget.
7. Compare model decisions with the calibration labels.
8. Store raw response, parsed response, hashes, and failure reason.
9. Never promote solely because the judge said `ACCEPT`.
10. Promote only when hard gates pass and the configured adjudication policy
    accepts the result or routes it to a human.

### Pairwise review

When replacing an incumbent line, ask the judge to compare candidate A and B
for the same chord. Run both A/B and B/A orderings. If the verdict changes with
position, mark the comparison unstable and require human review.

## Epoch E8 — Optimization, grammar repair, and promotion

### Purpose

Use reports to improve the grammar contracts rather than endlessly adding more
quotes.

### Optimization targets

Optimize a chord for a profile, not a universal score:

```text
maximize:
  relevant candidates
  approved rhetorical-shape coverage
  image-family coverage
  semantic novelty
  voice consistency

minimize:
  hard rejects
  near duplicates
  generic lines
  keyword-only relevance
  unsupported claims
  unresolved review rate
```

### Chord contract template

```json
{
  "chord": "delay",
  "triggerAtoms": ["wait", "later", "not yet"],
  "latentTension": "delay is a choice that transfers agency",
  "allowedMoves": ["reframe", "contrast", "delegationImage"],
  "forbiddenMoves": ["genericClock", "directCommand", "fakeOutcome"],
  "imageFamilies": ["delegation", "drift", "momentum"],
  "voiceTemperature": "cool-alert",
  "claimBudget": 2,
  "minimumShapeCount": 3,
  "minimumApprovedCount": 4,
  "noveltyPolicy": "no repeated image family in adjacent variants"
}
```

### Exact repair loop

1. Run the full manifest report.
2. Sort failures by count and by player-facing impact.
3. Inspect the top failure cluster, not the most entertaining individual line.
4. Decide whether the fault belongs to:

   - trigger mapping;
   - chord contract;
   - grammar production;
   - authored realization;
   - retrieval index;
   - quality rule;
   - corpus boundary.

5. Change one layer only.
6. Re-enumerate the complete bounded universe.
7. Compare report deltas against the prior passing report.
8. Add or update an adversarial test for the discovered failure mode.
9. Require blind pairwise review for any replacement line.
10. Commit the contract, content, tests, and report together.

### Idiomatic potential ranking

The most likely high-value innovations, in order, are:

1. `ContentManifest` as a first-class compiler artifact.
2. Chord contracts with explicit latent tensions and forbidden moves.
3. Decompiler evidence reports that expose why a line was selected.
4. Rejection corpus with named failure reasons.
5. Watcher diffs for content-quality regressions.
6. Rhetorical-shape and image-family coverage metrics.
7. Weak-supervision labeling functions.
8. Rocchio-style feedback from approved/rejected examples.
9. Optional LLM adjudication for only the uncertain tail.
10. Runtime retrieval or online model judgment, which should remain out of
    scope unless a later plan proves that offline compilation is insufficient.

## Activation procedure

This plan is `PARKED`. It authorizes no implementation, provider account,
secret, model call, production content promotion, or deployment.

To activate the deterministic foundation:

1. Explicitly name `PL-AVA-001`, including the desired epoch boundary, in a
   user request.
2. Re-read this file and the current repository state.
3. Append a dated history amendment changing only the state and activation
   note; never rewrite the original plan.
4. Implement E0 and E1 on a branch.
5. Run the acceptance tests and inspect the generated manifest.
6. Continue through E2–E6 only if each prior epoch's exit criteria pass.
7. Request separate explicit authorization before activating E7 or any
   provider/model integration.
8. Deploy only after the repository's normal validation and content promotion
   gates pass.

## Rollback procedure

1. Stop content promotion at the last passing manifest hash.
2. Revert the content-quality activation commit, not unrelated game changes.
3. Restore the last passing approved corpus and contract versions.
4. Re-run enumeration, decompilation, hard gates, and report generation.
5. Confirm that runtime content returns to the last passing corpus hash.
6. Append the incident and rollback reason to this epoch's history.

## Completion condition

PL-AVA-001 may be marked `ACTIVE` only when the named deterministic epochs are
implemented, their acceptance reports are checked in, runtime content is built
from a passing manifest, and the user explicitly authorizes production
activation. E7 additionally requires recorded model/provider approval and a
repeatable held-out calibration result.

## History

- 2026-08-02: Created as `PARKED` after research into deterministic IR,
  relevance feedback, weak supervision, RAG evaluation, duplicate detection,
  diversity metrics, and constrained LLM judging. No implementation or
  external action authorized.

## Amendment A — Kimi hardening review integration

| Field | Value |
|---|---|
| Amendment date | 2026-08-02 |
| Input | `/Users/andyfunke/Documents/kimi/workspace/PL-AVA-001-hardening-review.md` |
| Review disposition | Integrated as compatible hardening; no original epoch boundary removed |
| Authority | This repository's `AGENTS.md`, `SUBSTRATE_DOCTRINE.md`, existing Ava implementation, and existing falsification tests remain authoritative |

### Declarants

This amendment declares every source that may influence the plan and the
authority of each source:

1. **Product authority:** the user request authorizes research integration and
   planning, but does not authorize production deployment, provider accounts,
   model secrets, or runtime mutation.
2. **Repository authority:** `andyfunke/Delenda.Quest` and this checkout are
   the source of truth for code, tests, schemas, manifests, and receipts.
3. **Doctrine authority:** `AGENTS.md` and `SUBSTRATE_DOCTRINE.md` govern
   authority boundaries, deterministic compilation, semantic ownership,
   fail-closed input, content versioning, parity, and epoch receipts.
4. **Existing implementation authority:** the current Ava Nexus/compiler,
   relevance graph, realization path, operational semantics, and falsification
   tests cannot be weakened or bypassed by quality tooling.
5. **Kimi review authority:** Kimi's document is advisory design input only.
   Its compatible hardening ideas are incorporated below; its assumptions do
   not override repository evidence or doctrine.
6. **Corpus authority:** approved, rejected, adversarial, and calibration
   corpus entries become evidence only after versioning, provenance, and the
   applicable review gates are established.
7. **Model authority:** an optional LLM judge may provide bounded evidence for
   uncertain candidates; it may not define truth, mechanics, hidden state,
   execution, or promotion by itself.
8. **Deployment authority:** Cloudflare deployment remains a separate explicit
   release operation. A parked epoch, a passing report, or a Kimi suggestion
   never authorizes deployment.

### Compatibility verdict

Kimi's central conclusion is accepted: the architecture is sound, but
determinism, evasion resistance, redundancy, equivalence-class verification,
retrieval calibration, judge controls, and runtime manifest verification need
to be specified before activation.

The existing falsification model remains intact:

```text
authority safety is a hard gate
false positives become REVIEW where possible
undercounting claims is more dangerous than overcounting
disagreement is evidence, never silently averaged away
LLM judgments are evidence, never authority
```

No hardening item may convert a falsification failure into an approval merely
because another signal votes positively.

## Integrated hardening ledger

### H1 — Canonical determinism contract — accepted

Attach to E0, E1, and E6.

Required changes to the implementation plan:

- Use RFC 8785 JSON Canonicalization Scheme or a documented equivalent.
- Normalize source/text hashing with NFC and record the normalization version.
- Sort by Unicode codepoint order, never locale collation.
- Exclude `generatedAt` from content hashes.
- Compute `grammarVersion` from the hash of the grammar source file set.
- Derive per-production seeds as `H(globalSeed, productionId)` so adding a
  production does not reshuffle prior candidates.
- Record Node, package-lock, toolchain, and schema versions in every report.
- Run deterministic phases twice and require byte identity.

Pseudocode:

```text
function manifestHash(manifest):
    hashInput = copy(manifest)
    delete hashInput.generatedAt
    return sha256(jcs(nfc(hashInput)))

function productionSeed(globalSeed, productionId):
    return uint32(sha256(globalSeed + "\0" + productionId)[0:8])
```

Acceptance additions:

```text
run(report) twice -> exact byte equality
change generatedAt only -> identical manifestHash
change source file -> grammarVersion changes
add production -> existing production seeds remain stable
```

### H2 — Multi-projection normalization — accepted with safety scope

Attach to E2 and E3. Keep the original normalized projection. Add parallel
projections for safety lint only:

```text
P0 = NFC + case-fold
P1 = P0 with zero-width/format characters removed
P2 = confusable skeleton of P0
P3 = whitespace/punctuation collapsed
P4 = conservative leetspeak fold for forbidden-pattern scanning
```

Authority, mutation, forbidden-pattern, and instruction-like-content checks
run against every projection. The original text is retained for rendering and
the projection that triggered a result is recorded as evidence.

Safety constraints:

- P2 and P4 may cause `REVIEW` or hard rejection for authority-risk patterns;
  they may not rewrite player text or alter command semantics.
- Do not use aggressive transliteration for ordinary chord selection; that
  would create false semantic matches and could contradict fail-closed input.
- Every projection has a version and adversarial fixtures.

### H3 — Dual independent authority lint — accepted

Attach to E3 for the highest-risk gates only: unsupported outcomes, mutation
language, and claim-budget undercounting.

Implementation A is the curated pattern/verb-frame list. Implementation B is
an independently coded syntactic/dependency heuristic. The outcome is:

```text
A PASS, B PASS       -> PASS
A REJECT or B REJECT -> REJECT
A != B               -> REVIEW with both evidence records
```

The system must bias toward recall. False positives cost review time; false
negatives can leak fabricated authority. Add disagreement rate and overturn-on-
review rate to gate health.

Do not add a third voting implementation. Three-way majority would contradict
the existing rule that disagreement must remain visible.

### H4 — Equivalence-class attestation — accepted

Attach to E1. Every bounded equivalence class must declare:

```text
representative
membership rule
declared cardinality
expansion ratio
behavior class
deterministic sample seed
```

For each class, deterministically sample non-representative members and assert
that their chord, production behavior, and hard-gate profile match the
representative. A mismatch emits `CLASS_COVERAGE_GAP` and fails the epoch until
the class boundary or grammar is repaired.

Add an inventory attestation: the enumerator's production count must match a
checked-in inventory manifest generated during E0. Newly discovered trigger
atoms outside all classes are warnings at first and failures once the class
inventory is sealed.

### H5 — Retrieval/novelty separation and directional redundancy — accepted

Attach to E4.

Retrieval finds relevant evidence. Novelty is computed separately against the
approved corpus. Do not add novelty to the neighbor-ranking score.

```text
neighborRank = chord + BM25 + TFIDF + rhetoricalShape + optionalSemantic
noveltyScore = distance(candidate, approvedCorpus)
```

Run a weighted ranker and Reciprocal Rank Fusion in parallel and record rank
correlation. Large divergence produces `RETRIEVAL_FRAGILITY` review evidence;
it does not silently choose a winner.

Duplicate verdicts are corpus-directional:

```text
candidate duplicates approved  -> REJECT / replacement review
candidate duplicates rejected  -> REJECT_DUPLICATE_KNOWN_FAILURE
candidate duplicates pending    -> REVIEW_PENDING_DUPLICATE
```

Add containment ratio alongside Jaccard. For short text, use normalized edit
distance and character-gram containment with length-aware thresholds. Record
MinHash parameters in the index version.

### H6 — Weak-supervision analytics — accepted

Attach to E5. Every labeling function reports coverage, abstention, calibration
accuracy, version, and pairwise correlation. Highly correlated labeling
functions are downweighted as a bloc so repeated logic cannot manufacture
confidence.

Add a frozen canary set containing known-good, known-bad, and known-weird lines.
Canary flips trigger recalibration review. Every rejection uses a stable enum:

```text
IRRELEVANT
GENERIC
INCOHERENT
UNSAFE
DUPLICATE
AUTHORITY_LEAK
VOICE_DRIFT
CLAIM_OVERFLOW
CLASS_COVERAGE_GAP
RETRIEVAL_FRAGILITY
```

Failure classes remain distinct. No aggregate label may erase the underlying
class or labeling-function lineage.

### H7 — Judge controls and injection hardening — accepted only for E7

Attach to E7 and do not activate during deterministic epochs.

- Candidate prose is data inside delimiters, never instructions.
- Instruction-like candidate text is flagged before adjudication.
- Judge output is parsed under a schema and retry count is bounded.
- Every batch includes hidden calibration controls, evaluated after parsing and
  not exposed as prompt exemplars.
- Control failure invalidates the batch.
- Borderline candidates use a fixed small number of repeated judgments;
  disagreement becomes `REVIEW`.
- Pairwise replacement ranking may use Bradley–Terry only as a report metric;
  it cannot override hard gates.
- Call and cost ceilings stop adjudication while preserving deterministic
  reports.

The original plan's prohibition on model-driven rewriting remains unchanged.

### H8 — Attributable watcher diffs — accepted

Attach to E6. Every verdict change must identify exactly one changed input
layer, such as:

```text
grammarSourceHash
contractVersion
corpusVersion
indexVersion
decompilerVersion
seed
toolchainVersion
```

An unattributable diff fails reproducibility checks. Source provenance binds to
source-file hash and commit in addition to source line; moved lines produce a
warning rather than a false provenance match. Report schemas are versioned and
old reports remain parseable. Add performance budgets so the watcher remains a
bounded build step.

### H9 — Runtime promoted-manifest verification — accepted as a later E8 gate

Attach to E8's first promotion implementation, not to the current runtime and
not to E0–E7.

Runtime may load realization content only from a promoted manifest whose hash
and corpus version verify at build/boot. Tampering fails the build or falls
back to the last passing manifest according to an explicit, tested policy. Any
runtime interpolation must use an enumerated parameter tuple or abstain.

This is compatible with the doctrine's content-versioning and fail-closed
rules, but it is intentionally deferred because the current quality tooling is
not yet implemented.

### H10 — Measurement layer — accepted

Attach to E6 and E8 reports:

```text
human inter-annotator agreement per chord
judge-vs-human agreement per checklist item
approved/rejected centroid distance by corpus version
gate fire rate
gate disagreement rate
overturn-on-review rate
canary flip count
unresolved review rate
```

Metrics are diagnostic. They must not become an unexamined scalar promotion
oracle.

## Rejected, deferred, or constrained suggestions

No Kimi suggestion is rejected because it is unhelpful; the following are
explicitly rejected or constrained because they conflict with doctrine,
falsification semantics, or current scope:

1. **Replacing deterministic safety with embeddings:** rejected. Embeddings may
   be an optional retrieval signal only. They may not own a safety gate,
   command interpretation, or authority decision.
2. **Generative rewriting of rejected lines:** rejected. The existing plan
   explicitly forbids automatic rewriting, and rewriting would blur authorship,
   provenance, and falsification evidence.
3. **A third independent hard-gate implementation:** rejected for now. Three-
   way majority would conceal disagreement and contradict the existing
   `REVIEW` semantics. Two implementations plus explicit disagreement is the
   current boundary.
4. **Putting hidden controls into the judge prompt as exemplars:** rejected.
   Controls may be included as post-parse batch assertions, but must not become
   prompt text that contaminates the candidate evaluation.
5. **Runtime retrieval or online LLM judgment:** deferred/rejected from this
   plan. It would violate precompute-before-inference and introduce a player-
   path nondeterminism dependency.
6. **Automatic runtime fallback without a tested policy:** deferred. H9 is
   accepted as a design requirement, but the exact last-passing-manifest
   fallback behavior requires implementation and failure-mode tests first.
7. **Rocchio or learned weight fitting as an early gate:** deferred to E8.
   It may rank candidates after calibration data exists, but cannot replace
   hard gates or the explicit relevance contract.

## Revised activation order

```text
E0 + H1  determinism contract
E1 + H1 + H4  complete enumeration and class attestation
E2 + H2  multi-projection decompiler
E3 + H2 + H3  fail-closed hard gates and dual authority lint
E4 + H5  retrieval, duplicate directionality, and chord coverage
E5 + H6  weak supervision, correlation, canaries, and failure taxonomy
E6 + H8 + H10  watcher attribution and quality measurement
E7 + H7  optional constrained judge
E8 + H9  promoted-manifest runtime verification
```

At every boundary, the earlier falsification rule wins: if the new hardening
layer disagrees with an existing safety test, stop and repair the new layer;
do not weaken the existing test.

## Amendment history

- 2026-08-02: Integrated Kimi's hardening review as Amendment A. Accepted H1–H8
  and H10, accepted H9 as a later E8 gate, and recorded seven rejected,
  deferred, or constrained proposals. Existing doctrine, falsification gates,
  relevance implementation, and parked-state authority remain unchanged.
