# DELENDA QUEST UBERDOC / EXECUTION LOGBOOK

Append-only execution receipts for adapted patch epochs. Product law remains in
`SUBSTRATE_DOCTRINE.md`; feature compatibility remains in `feature.md`.

## Epoch identity

- Epoch: `AVA-LANGUAGE-EPOCH-001`
- Handoff: `Epoch 1.md` / `AVA-LANGUAGE-E1..E15`
- Live base: `a54fe7e75e8cb51f6e7bf8064133b7351c449e36`
- Handoff base not found: `9973b8e`
- Branch: `main`
- Deployment policy: local validation only; no push, deploy, shadow mutation,
  D1 replacement, or secret movement
- Receipt mode: one demarcated node entry, then one seal entry

## PRE-EPOCH-00 / preflight receipt

```text
NODE: PRE-EPOCH-00
BASE: a54fe7e75e8cb51f6e7bf8064133b7351c449e36
WORKTREE: clean at start
REPOSITORY: andyfunke/Delenda.Quest
AUTHORITY: current main, existing Ava compiler/Nexus, disclosed projection
RESULT: PASS
EVIDENCE: npm ci; npm test; npm run typecheck; npm run build:ssh-gateway;
          npm run cloudflare:validate; npm run lint; git diff --check
NON-GOALS: no reset, checkout, clean, push, wrangler deploy, or production write
```

## Node receipts

### E1 — contracts

```text
NODE: AVA-LANGUAGE-E1
OUTPUT: app/ava/contextual-language.ts; schema contextual binding/context
RESULT: PASS
BOUNDARY: versioned route/source/facet/evidence contract; no parser or mutation
```

### E2 — normalization and validation

```text
NODE: AVA-LANGUAGE-E2
OUTPUT: NFKD normalized aliases, collision checks, SHA-256 digest sealing,
        request-IR runtime binding validation
RESULT: PASS
```

### E3 — static catalog

```text
NODE: AVA-LANGUAGE-E3
OUTPUT: app/ava/contextual-language-catalog.ts
RESULT: PASS
OWNERS: priority, report, metric, objective routes are explicit and finite
```

### E4 — priority lowering

```text
NODE: AVA-LANGUAGE-E4
OUTPUT: app/ava/contextual-language-priorities.ts
RESULT: PASS
AUTHORITY: StrategicDimension in app/substrate/gates.ts
```

### E5 — campaign target and concepts

```text
NODE: AVA-LANGUAGE-E5
OUTPUT: read-only operational target accessor; grounded concept entries; live
        metric/synopsis entities
RESULT: PASS
```

### E6 — disclosed projection

```text
NODE: AVA-LANGUAGE-E6
OUTPUT: app/ava/contextual-language-projection.ts
RESULT: PASS
BOUNDARY: projectAvaDisclosedState + avaVisibleWorldRevision + content pack
```

### E7 — authored references

```text
NODE: AVA-LANGUAGE-E7
OUTPUT: app/ava/contextual-language-references.ts
RESULT: PASS
BOUNDARY: visible briefing sections only; exact excerpt capped at 280 chars
```

### E8 — Nexus injection

```text
NODE: AVA-LANGUAGE-E8
OUTPUT: visible Nexus context carries the sealed language projection
RESULT: PASS
```

### E9 — exact matcher

```text
NODE: AVA-LANGUAGE-E9
OUTPUT: app/ava/contextual-language-compiler.ts
RESULT: PASS
RULE: normalized exact phrase containment, longest alias wins, ambiguity clarifies
```

### E10 — typed lowering

```text
NODE: AVA-LANGUAGE-E10
OUTPUT: contextual routes lower to existing ADVISE/REPORT/EXPLAIN instructions
RESULT: PASS
```

### E11 — mutation guards

```text
NODE: AVA-LANGUAGE-E11
OUTPUT: contextual compiler placement after unsafe/negated guards; explicit
        protection for stage/prepare/issue/resolve and negated advance language
RESULT: PASS
```

### E12 — renderings

```text
NODE: AVA-LANGUAGE-E12
OUTPUT: contextual priority, report, objective, metric, and authored-reference
        renderings in the existing terminal realization
RESULT: PASS
```

### E13 — live corpus

```text
NODE: AVA-LANGUAGE-E13
OUTPUT: tests/ava-contextual-language.test.mjs
RESULT: PASS
EVIDENCE: 5 contextual tests plus existing substrate suite
```

### E14 — parity

```text
NODE: AVA-LANGUAGE-E14
OUTPUT: web/native terminal/SSH surface parity assertion for contextual read
RESULT: PASS
```

### E15 — proof and documentation

```text
NODE: AVA-LANGUAGE-E15
OUTPUT: feature ledger, epoch nodes, doctrine protocol, source manifest
RESULT: PASS; sealed by the local implementation commit below
```

## Seal receipt

This section is completed after the final local commit. The source manifest
intentionally excludes this append-only logbook and its own file, preventing a
self-referential hash cycle.

```text
EPOCH_COMMIT: 79181aef440c279f57e76f42ad346f7736f8cda2
TREE: 675e7f70aa402deb3cab0f6ff4e183793549c4bd
SOURCE_MANIFEST_SHA256: 52b13a53d752cf5e308ac548c2b8da96423649916e0cddad695a08146815a851
FULL_GATES: PASS
CLOUDFLARE_RELEASE: not run by policy and unavailable in this environment
```

### AVA-LANGUAGE-002-N01 / contextual contract hardening

Base commit: `adfeebb02c22089b2f916e546f53567b6adacbba`

Completed commit: `2feb3af42b4f0960b978b0f791843dd425ddd5d2`

Purpose: Port the packet's contract and normalization boundary onto the
current-main contextual-language authority without introducing the stale
priorities package or a second parser.

Exact procedures executed:

- Reconciled the unreachable `9973b8e` handoff against current `main`.
- Added NFKC contextual surface normalization with punctuation separation and
  preserved internal apostrophes.
- Added provenance-aware route validation, language validation, digest
  validation, and compiler re-exports.
- Added normalization and fail-closed validator regression tests.

Changed files: `app/ava/contextual-language.ts`, `app/ava/compiler.ts`,
`tests/ava-contextual-language.test.mjs`, and the Epoch 002 manifest/preflight
records.

New semantic contracts: contextual entries must have valid route-specific
destinations, non-empty provenance, and a digest matching their visible
state/content revisions.

Tests added: contextual surface normalization and runtime validation.

Validation results: `npm run typecheck` PASS; `bash scripts/test-substrate.sh`
PASS (221/221); `git diff --check` PASS.

Non-goals preserved: no deployment, no D1 or shadow mutation, no GitHub push,
no HTTP SSH substitute, no hidden-state exposure, no second parser.

Known limitations: the packet's `surfaces` and `PriorityAxis` names remain
represented by the live repository's `aliases` and `StrategicDimension`
authorities.

Next node handoff: extend the declared catalog with the packet's missing
read-only aliases and verify collision-free deterministic ownership.
