# NODE-02 — complete bounded enumeration

Status: planned; depends on NODE-01

## Procedure

1. Register every content production with stable `productionId`.
2. Register every finite parameter domain in canonical order.
3. For unbounded language, declare representative, membership predicate,
   cardinality, and deterministic sample count.
4. Derive `productionSeed = H(globalSeed, productionId)`.
5. Enumerate the Cartesian product in production/domain order.
6. Record successes and structured failures separately.
7. Sample every equivalence class deterministically.
8. Compare sampled chord and gate-profile behavior with the representative.
9. Emit `CLASS_COVERAGE_GAP` on mismatch.
10. Fail if registered production count differs from sealed inventory.

## Output

```text
manifest.json
candidates.jsonl
enumeration-failures.jsonl
equivalence-attestation.json
```

## Acceptance

- Two runs are byte-identical.
- Every candidate has one stable key.
- Every failure has reason and production ID.
- Adding a production does not change existing production seeds.
- Class mismatch fails the node.
