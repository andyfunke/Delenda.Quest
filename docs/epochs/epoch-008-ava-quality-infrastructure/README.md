# Epoch 008 — Ava quality infrastructure

Status: implemented locally; not pushed or deployed

Base: `c46e0e6` (`Execute Ava content quality compiler epoch`)

## Scope

This epoch implements the deterministic follow-up left after Epoch 007:

```text
calibrated corpus
BM25/TF-IDF/MinHash indexes
weak-supervision aggregation
watcher delta attribution
promoted-manifest verification
```

It does not implement LLM judging, automatic rewriting, command parsing,
campaign mechanics, live runtime integration, or deployment.

## Node contracts

| Node | Input | Output | Gate |
|---|---|---|---|
| 008-01 corpus | JSONL entries | approved/rejected/calibration corpus | immutable IDs and failure classes |
| 008-02 indexes | corpus/candidates | versioned BM25/TF-IDF/MinHash index | deterministic ranking |
| 008-03 weak labels | candidate + gate evidence | label lineage and aggregate verdict | hard rejection dominates |
| 008-04 watcher | prior/current headers | changed-layer attribution | >1 changed layer is unattributable |
| 008-05 manifest | promoted candidates | verified/invalid result | invalid hash/candidate fails closed |
| 008-06 proof | all outputs | receipt | focused tests and typecheck pass |

## Authorities preserved

- Existing command compiler and falsification tests remain authoritative.
- Quality labels cannot create semantic intent.
- Retrieval evidence is not truth.
- Hard authority evidence cannot be outvoted.
- The manifest verifier is pure and is not imported into the live response path
  by this epoch.

## Exact commands

```bash
npm run test:ava-content-quality
npm run test:ava-content-quality-epoch-008
npm run typecheck
npm run ava:content-quality -- .tmp/ava-content-quality-epoch-008
git diff --check
```

## Release boundary

No GitHub push, Cloudflare deployment, D1 write, secret movement, model call,
or production manifest promotion is authorized by this epoch.
