# NODE-05 — hard authority and falsification gates

Status: planned; depends on NODE-04

## Gate IDs

```text
G01_MISSING_CHORD_EVIDENCE
G02_UNSUPPORTED_OUTCOME
G03_MUTATION_LANGUAGE
G04_EXACT_DUPLICATE
G05_FORBIDDEN_PATTERN
G06_NO_SURFACE_RELEVANCE
G07_MISSING_PROVENANCE
G08_CLAIM_OVERFLOW
G09_AUTHORITY_LINT_DISAGREEMENT
```

## Dual authority lint

Implementation A uses curated patterns/verb frames. Implementation B uses
independent syntactic/dependency evidence. They do not share verdict code.

```text
A PASS and B PASS       -> no authority rejection
A REJECT or B REJECT    -> REJECT, with both evidence records
A != B                  -> REVIEW, with disagreement record
```

Existing falsification tests remain authoritative. New gates add evidence or
reject/review candidates; they never change an existing expected result.

## Acceptance

- fabricated outcomes reject or review;
- mutation-like prose rejects or reviews;
- metaphorical authority-risk text cannot silently pass;
- disagreement is never averaged into PASS;
- every rejection has gate ID and `FailureClass`.
