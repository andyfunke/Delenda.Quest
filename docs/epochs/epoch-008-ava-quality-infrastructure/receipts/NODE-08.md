# Epoch 008 receipt

Status: complete local implementation; release boundary not crossed

## Implemented files

- `content-quality/corpus/approved.jsonl`
- `content-quality/corpus/rejected.jsonl`
- `content-quality/corpus/calibration.jsonl`
- `scripts/ava-content-quality.mjs`
- `app/ava/content-quality-manifest.ts`
- `tests/ava-content-quality-epoch-008.test.mjs`
- `package.json`

## Deterministic behavior

- BM25 uses fixed `k1=1.2` and `b=0.75`.
- TF-IDF document frequencies and terms are canonically sorted.
- MinHash signatures use the first 16 sorted trigram hashes.
- Weak labels retain every source result and apply hard authority rejection
  before threshold aggregation.
- Watcher attribution allows zero or one changed layer and emits
  `UNATTRIBUTABLE_DIFF` for multiple changed layers.
- Manifest verification hashes version, corpus version, and candidates using
  the same stable serializer as the verifier.

## Validation

```text
npm run test:ava-content-quality             PASS (4/4)
npm run test:ava-content-quality-epoch-008  PASS (3/3)
npm run typecheck                            PASS
git diff --check                             PASS
```

The existing Ava suite was not changed or used as a quality override. Its two
known baseline failures remain documented in Epoch 007 NODE-11.

## Explicit non-implementation

The calibrated corpus is a minimal checked-in seed, not a claim of completed
human taste calibration. LLM adjudication and live runtime manifest loading
remain separate authorized work.
