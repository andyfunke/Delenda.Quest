# NODE-06 — corpus, retrieval, and redundancy index

Status: planned; depends on NODE-04

## Corpus classes

```text
approved
rejected
adversarial
calibration
pending
```

Every entry has immutable ID, revision, chord, rhetorical shape, image family,
label, rationale, failure class when rejected, reviewer provenance, and corpus
version.

## Procedure

1. Canonicalize corpus entries.
2. Build BM25 and TF-IDF indexes.
3. Build optional MinHash index with recorded parameters.
4. Retrieve neighbors using chord + lexical + shape evidence.
5. Compute novelty independently against approved content.
6. Compute exact duplicate, Jaccard, containment, edit-distance, and
   character-gram evidence.
7. Use short-text thresholds before word 3-gram thresholds.
8. Classify duplicates directionally by corpus class.
9. Emit golden-query rank-stability results.

## Invariant

Novelty is never a neighbor-relevance term. A candidate can be novel and
irrelevant; the report keeps those facts separate.

## Acceptance

- stable golden retrieval rankings;
- padded approved duplicates detected by containment;
- rejected duplicates retain known failure class;
- pending duplicates produce `REVIEW_PENDING_DUPLICATE`.
