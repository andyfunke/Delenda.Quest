# NODE-04 — deterministic decompiler

Status: planned; depends on NODE-02 and NODE-03

## Procedure

For each candidate compute surface, grammar/chord, claim, rhetorical, voice,
authority-risk, and source-provenance features. The claim extractor reports
possible claims; it does not verify world truth. Retain exact text and all
projections.

## Required output

```json
{
  "candidateKey": {},
  "text": "exact source text",
  "projections": {},
  "claims": [],
  "rhetoricalShape": [],
  "features": {},
  "authorityEvidence": {},
  "provenance": {},
  "decompilerVersion": "ava-content-decompiler/v1"
}
```

## Acceptance

- deterministic and schema-valid;
- no hidden state read;
- no command compiler called for semantic lowering;
- tests cover short, long, metaphorical, adversarial, and empty text.
