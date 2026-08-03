# NODE-10 — promoted-manifest runtime verification

Status: parked; later release boundary

This node begins only after a passing NODE-08 report and explicit promotion.

## Required behavior

```text
runtime loads only promoted manifest
manifest hash and corpus version are verified
tampered content fails build/boot under a tested policy
runtime interpolation matches an enumerated CandidateKey
unknown tuple abstains
```

It may not add a second parser, mutation authority, hidden-state reader, or
online quality judge.
