# NODE-01 — canonical schemas and manifest contract

Status: planned; depends on NODE-00

## Procedure

1. Define the shared types in one module.
2. Implement canonical JSON serialization.
3. Normalize hash inputs to NFC.
4. Hash source files and the grammar source set in canonical path order.
5. Exclude `generatedAt` from `manifestHash`, `candidateHash`, and `reportHash`.
6. Reject NaN, Infinity, undefined, cycles, invalid domains, and unknown fields.
7. Add round-trip and invalid-input tests.

## Required functions

```text
canonicalJson(value) -> string
nfc(value) -> string
sha256(value) -> lowercase hex
hashGrammarSourceSet(files) -> grammarVersion
hashCandidate(candidate) -> contentHash
hashManifest(manifest) -> manifestHash
```

## Acceptance

```text
canonicalJson({b:1,a:2}) == canonicalJson({a:2,b:1})
hashManifest(reportAtT1) == hashManifest(reportAtT2)
  when only generatedAt differs
source edit changes grammarVersion
invalid number/value rejects
```
