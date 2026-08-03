# NODE-07 — weak supervision and calibration

Status: planned; depends on NODE-05 and NODE-06

## Labeling functions

Each returns `ACCEPT`, `REJECT`, or `ABSTAIN`, a reason, evidence spans, and
its own version:

```text
LF_CHORD_EVIDENCE
LF_AUTHORITY_SAFE
LF_NO_DUPLICATE
LF_SPECIFIC_IMAGE
LF_NOT_GENERIC
LF_SURFACE_RELEVANCE
LF_APPROVED_SHAPE
LF_REPEATED_IMAGE
LF_OVEREXPLAINED
LF_CLICHE
LF_UNSUPPORTED_PSYCHOLOGY
```

## Procedure

1. Run every LF over every candidate, including abstentions.
2. Calculate coverage, abstention, calibration accuracy, and pairwise
   correlation.
3. Downweight correlated LFs as a bloc.
4. Apply hard authority results before aggregate taste results.
5. Aggregate only into `PASS_CANDIDATE`, `REVIEW`, or `REJECT_CANDIDATE`.
6. Preserve every LF result and failure class.
7. Run frozen known-good, known-bad, and known-weird canaries.

## Acceptance

- duplicate LFs do not materially change aggregate verdicts;
- canary flips fail or require explicit recalibration evidence;
- hard safety rejection cannot be outweighed by taste approval;
- correlation and conflict matrices are emitted.
