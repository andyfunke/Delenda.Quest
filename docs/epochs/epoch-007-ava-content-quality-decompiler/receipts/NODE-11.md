# NODE-11 receipt — deterministic core handoff

Status: partial handoff; epoch not sealed

## Base

`2fbfd71` — `Add deterministic Ava relevance graph`

## Implemented boundary

- `scripts/ava-content-quality.mjs`
- `tests/ava-content-quality.test.mjs`
- `package.json` scripts `ava:content-quality` and `test:ava-content-quality`

Implemented: deterministic source enumeration, source/candidate hashes,
multi-projection normalization, decompiler feature extraction, authority-risk
hard gates, local neighbor/duplicate evidence, novelty separation, and report
serialization.

Not implemented in this handoff: calibrated corpus files, BM25/TF-IDF index,
MinHash index, weak-supervision aggregation, watcher delta attribution,
runtime promoted-manifest verification, or LLM adjudication. NODE-09 and
NODE-10 remain parked by design.

## Commands and results

```text
npm run test:ava-content-quality  PASS (4/4)
npm run typecheck                 PASS
git diff --check                  PASS
bash scripts/test-ava.sh          29/31; 2 pre-existing failures
```

The two existing failures are:

```text
tests/ava-compiler.test.mjs:20  playing -> INSPECT, expected EXPLAIN
tests/ava-compiler.test.mjs:290 comparison -> SEMANTIC, expected COMPARE
```

No existing test, parser, falsification rule, or runtime authority was changed
to accommodate the new tooling.

## Determinism evidence

`buildReport()` was executed twice in the focused test and produced the same
`manifestHash`. The generated report is written to a caller-selected output
directory and is not loaded by runtime Ava code.

## Release boundary

No push, deployment, D1 write, model call, secret movement, runtime integration,
or production content promotion occurred in this node.
