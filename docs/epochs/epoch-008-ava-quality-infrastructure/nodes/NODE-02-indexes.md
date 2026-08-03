# NODE-02 — deterministic retrieval indexes

| Field | Value |
|---|---|
| Epoch | 008 |
| Node | 02 |
| Title | BM25 / TF-IDF / MinHash indexes |
| Status | historical record (reconstructed from Git; not a live execution receipt) |

## Source of truth

Commit `0e4daf7266cd1e3f365adc47a4983f76779633e5`.

## Owned files introduced / extended by that commit

- `scripts/ava-content-quality.mjs` (index builders)
- `tests/ava-content-quality-epoch-008.test.mjs`

## Procedure (historical)

Implement deterministic BM25 (`k1=1.2`, `b=0.75`), TF-IDF with canonically
sorted terms/document frequencies, and MinHash signatures over the first 16
sorted trigram hashes. No multi-commit chronology is claimed.

## Acceptance evidence present in Git

Focused suite `npm run test:ava-content-quality-epoch-008` asserts index
determinism (receipt `receipts/NODE-08.md`).
