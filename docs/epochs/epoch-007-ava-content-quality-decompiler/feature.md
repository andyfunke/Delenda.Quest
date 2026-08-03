# Epoch 007 compatibility ledger

## Allowed

- Offline enumeration of bounded Ava realization grammar.
- Deterministic normalization, feature extraction, retrieval, duplicate
  detection, and report generation.
- Versioned approved/rejected/adversarial/calibration corpus records.
- Independent evidence-producing authority lint with explicit disagreement.
- Watcher reports and Supergit-style receipts.

## Forbidden

- Parser changes, mutation authority, hidden-state access, runtime model calls,
  automatic prose rewriting, replacement of existing falsification tests,
  quality scores creating semantic intent, or production deployment.

## Compatibility assertions

```text
existingCommandCompilerIsUnchanged()
existingFalsificationTestsRemainAuthoritative()
contentQualityOutputCannotReachMutationHandler()
noQualityScoreCanCreateSemanticIntent()
noCandidateCanExposeHiddenState()
everyRejectedCandidateRetainsFailureClass()
```
