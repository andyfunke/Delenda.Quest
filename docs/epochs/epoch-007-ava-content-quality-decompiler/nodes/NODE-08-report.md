# NODE-08 — watcher report and attributable diff

Status: planned; depends on NODE-02 through NODE-07

## Required report sections

```text
identity and hashes
candidate counts
failure counts by class and gate
chord/shape/image-family coverage
duplicate clusters
retrieval stability
LF coverage/correlation/conflict
canary results
performance timings
prior-report diff
```

## Diff attribution

Every changed verdict maps to exactly one changed layer:

```text
grammarSourceHash | contractVersion | corpusVersion | indexVersion
decompilerVersion | normalizerVersion | seed | toolchainVersion
```

If multiple layers changed, emit `UNATTRIBUTABLE_DIFF` and fail the node.

## Procedure

1. Load prior passing report.
2. Run current deterministic pipeline twice.
3. Assert byte identity.
4. Compare IDs, verdicts, coverage, gates, and metrics.
5. Attribute every change.
6. Fail on new hard safety failures, exact duplicates, or coverage regression.
7. Emit canonical report and diff.

## Acceptance

- same snapshot twice is identical;
- every change names its layer;
- unattributable changes fail;
- existing tests remain final semantic authority.
