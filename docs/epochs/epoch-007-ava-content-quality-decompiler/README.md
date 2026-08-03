# Epoch 007 — Ava content quality decompiler

Status: deterministic core implemented; NODE-09/NODE-10 parked; epoch not sealed

Base commit: `2fbfd71` (`Add deterministic Ava relevance graph`)

This epoch converts Ava's grammar-generated prose into a deterministic,
inspectable content corpus. It does not change command interpretation, campaign
state, operational semantics, falsification rules, or runtime authority.

## Objective

For every bounded, reachable Ava realization:

```text
enumerate -> canonicalize -> decompile -> hard-gate -> retrieve evidence
          -> detect redundancy -> aggregate weak labels -> report
```

The output is a machine-readable report answering what the grammar can say,
why it can say it, which chord and surface evidence support it, whether it
leaks authority, whether it is redundant, and what changed between reports.

## Release boundary

This plan does not push GitHub, deploy Cloudflare, write D1, add secrets,
make live model calls, change runtime selection, change command parsing, weaken
existing falsification tests, add a third gate voter, or rewrite rejected text.
It may be activated only by an explicit user request naming Epoch 007 and its
node boundary.

## Authority map

| Authority | Exact source | May decide | May not decide |
|---|---|---|---|
| Campaign mechanics | existing application/game contracts | state, legal transitions, outcomes | prose quality |
| Ava command compiler | `app/ava/compiler.ts`, Nexus routes, typed owners | canonical intent and command result | content promotion |
| Ava realization | `app/ava/voice.ts`, `app/ava/relevance-engine.ts` | bounded presentation text | mechanics, state, hidden facts |
| Existing falsification suite | `tests/`, `scripts/test-*.sh` | regression/failure evidence | approval by omission |
| Content decompiler | Epoch 007 artifacts | feature extraction and evidence | command intent, campaign truth |
| Hard authority gates | NODE-05 dual implementations | reject/review unsafe prose | override existing doctrine |
| Corpus review | approved/rejected/adversarial labels | taste evidence | mechanics or hidden state |
| Optional LLM judge | NODE-09 only | bounded checklist evidence | hard-gate override, runtime behavior |
| Deployment | explicit release operation | production publication | epoch activation by implication |

## Semantic invariants

```text
I01 candidate text never becomes a command
I02 candidate text never changes campaign state
I03 candidate text never asserts hidden state or sealed outcome
I04 every candidate has stable production provenance
I05 every candidate has exactly one grammar/contract version
I06 same snapshot + same seed => byte-identical deterministic report
I07 generatedAt never contributes to a content hash
I08 hard authority failure cannot become ACCEPT by voting
I09 independent gate disagreement => REVIEW, never silent PASS
I10 grammar miss abstains; it does not invent content
I11 retrieval evidence does not establish truth or quality by itself
I12 novelty is separate from neighbor relevance
I13 rejected content remains preserved with its failure class
I14 every report delta names its changed input layer
I15 optional model output is evidence with hashes and provenance
I16 no report exposes hidden corpus/exhaustion state to a player
```

## Node sequence

| Node | Name | Depends on | Output | Status |
|---|---|---|---|---|
| NODE-00 | preflight and authority seal | none | preflight receipt | complete |
| NODE-01 | canonical schemas and manifest | NODE-00 | schema + manifest contract | complete |
| NODE-02 | complete bounded enumeration | NODE-01 | candidate JSONL | complete |
| NODE-03 | multi-projection normalization | NODE-01 | normalized evidence | complete |
| NODE-04 | deterministic decompiler | NODE-02, NODE-03 | decompiled JSONL | complete |
| NODE-05 | hard authority/falsification gates | NODE-04 | gate verdicts | complete; single-pass core |
| NODE-06 | corpus/retrieval/redundancy index | NODE-04 | index + neighbors | complete; local core |
| NODE-07 | weak supervision/calibration | NODE-05, NODE-06 | labels + lineage | planned |
| NODE-08 | watcher report/attributable diff | NODE-02–07 | quality report | planned |
| NODE-09 | optional constrained adjudication | NODE-08 | judge evidence | parked; separate authority |
| NODE-10 | promoted-manifest runtime verification | NODE-08 + promotion | runtime load gate | parked; later release |
| NODE-11 | epoch proof and seal | NODE-00–08 | receipt + source manifest | planned |

Nodes are bounded execution units. A node may not silently absorb a later
node's responsibilities.

## File ownership boundary

Expected implementation boundary after activation:

```text
app/ava/content-quality/{schema,canonical,enumerate,normalize,decompile,gates,
  corpus,retrieval,duplicate,weak-supervision,report,index}.ts
content-quality/{contracts,corpus,generated,index}/
tests/ava-content-quality-*.test.mjs
scripts/test-ava-content-quality.sh
scripts/ava-content-quality-*.mjs
```

Do not place this tooling in command parsers, `app/ava/hacking.ts`, or the
intrusion library. The first implementation is offline tooling.

## Shared contracts

All persisted JSON uses UTF-8/LF, NFC text, Unicode codepoint key ordering,
explicit array ordering, finite JSON numbers, canonical JSON (RFC 8785 or a
checked-in equivalent), and no BOM. `generatedAt` is report metadata only and
is excluded from all content hashes.

```ts
type CandidateKey = {
  productionId: string;
  parameters: Record<string, string | number | boolean>;
  seed: number;
};

type Candidate = CandidateKey & {
  text: string;
  chord: string;
  realizationId: string | null;
  sourceFile: string;
  sourceFileHash: string;
  sourceLine: number | null;
  grammarVersion: string;
  contractVersion: string;
  contentHash: string;
};

type Verdict = "PASS" | "REVIEW" | "REJECT";
type FailureClass = "IRRELEVANT" | "GENERIC" | "INCOHERENT" | "UNSAFE"
  | "DUPLICATE" | "AUTHORITY_LEAK" | "VOICE_DRIFT" | "CLAIM_OVERFLOW"
  | "CLASS_COVERAGE_GAP" | "RETRIEVAL_FRAGILITY";

type ReportIdentity = {
  reportSchemaVersion: string;
  grammarVersion: string;
  contractVersion: string;
  corpusVersion: string;
  indexVersion: string;
  decompilerVersion: string;
  normalizerVersion: string;
  seed: number;
  nodeToolchain: string;
  gitCommit: string;
};
```

## Deterministic pipeline

```text
runEpoch(snapshot):
  assertPreflight(snapshot)
  identity = makeReportIdentity(snapshot)
  manifest = enumerate(snapshot.grammar, snapshot.domains, identity.seed)
  normalized = normalizeAll(manifest.candidates)
  decompiled = decompileAll(manifest, normalized, snapshot.contracts)
  gated = applyHardGates(decompiled, snapshot.contracts, snapshot.priorCorpus)
  indexed = retrieveAndDetectRedundancy(gated, snapshot.corpus)
  labels = aggregateWeakLabels(indexed, snapshot.calibration)
  report = buildReport(identity, manifest, normalized, decompiled, gated,
                       indexed, labels)
  assertReportInvariants(report)
  return canonicalWrite(report)
```

NODE-01 through NODE-08 are pure with respect to serialized inputs and forbid
network access.

## Activation and stop procedure

1. User names Epoch 007 and the first node.
2. Read this README, `AGENTS.md`, doctrine, and the overlapping parking-lot
   plan.
3. Record commit and dirty-tree state in NODE-00.
4. Declare ownership for every overlapping file.
5. Implement one node only.
6. Run focused tests and record a receipt.
7. Stop on any invariant failure.
8. Do not continue without accepting the previous receipt boundary.
9. Keep production deployment outside this epoch.

## Completion condition

NODE-11 may seal the deterministic portion only when NODE-00 through NODE-08
pass, the report reproduces twice, all hard-gate tests pass, existing Ava and
falsification tests remain authoritative and passing, and the source manifest
is recorded. NODE-09 and NODE-10 remain separately authorized work.

## Current implementation boundary

The committed deterministic core provides source enumeration, stable source and
candidate hashes, NFC/projection normalization, decompilation features,
authority-risk hard gates, local neighbor comparison, duplicate evidence, a
canonical report writer, and focused tests. It does not claim that the full
weak-supervision, watcher-attribution, runtime-manifest, or LLM-adjudication
design is implemented. Those nodes remain explicit follow-up work.
