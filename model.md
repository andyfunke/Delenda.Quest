# Model — comparison capability repair

Status: execution model only. Do not edit code until this model is authorized.

## 1. Authorities

Read `AGENTS.md`, `SUBSTRATE_DOCTRINE.md`, `app/ava/compiler.ts`,
`app/ava/grammar.ts`, `app/ava/request-ir.ts`, `app/ava/nexus.ts`,
`app/ava/operational-semantics.ts`, `app/ava/operational-comparison.ts`, and
the comparison tests before editing.

The patch must preserve: one campaign authority; typed semantic objects before
presentation; finite deterministic grammar; fail-closed ambiguity; no LLM
creation of mechanics or state; separate mechanics and realization; semantic
parity across clients; hidden-state exclusion; and quality/flavor output that
cannot create semantic intent.

## 2. Scope

Allowed code: compiler, grammar, request IR, Nexus, operational semantics,
operational comparison, operational contracts, and their tests.

Forbidden: campaign mechanics, falsification rules, relevance corpus/tooling,
deployment, hidden-state projection, runtime mutation, or a new parser.

Run `git status --short --branch` and `git rev-parse HEAD`. Stop if overlapping
uncommitted Ava/test changes lack an owner.

## 3. Failure to repair

Current failures are capability-dispatch failures:

`compare m` becomes `COMPARE + UNKNOWN` and reaches an absent handler.

`compare m1 p1` becomes `COMPARE + METRIC` and reaches an absent handler.

Never allow UNKNOWN to reach capability lookup. Never silently convert METRIC
to CAMPAIGN_CHOICE.

## 4. Required policy

1. Fewer than two valid targets: structured clarification.
2. Unknown target: structured clarification before capability lookup.
3. Two metric operands: typed read-only metric comparison owner.
4. Two maneuver targets: existing pairwise maneuver comparison owner.
5. Three through twenty valid targets: ordered read-only modulation envelope.
6. Duplicate targets: structured clarification or existing duplicate error.
7. Negation: no selection and no mutation.
8. Preserve exact left-to-right target order.
9. No quality score or flavor line may alter semantic IDs or digest.

## 5. Find the metric owner

Run `rg -n "metricOperands|METRIC_EXPLANATION|metric.*compare|COMPARE" app/ava tests`.

Choose an existing typed read-only metric route. If none exists, add one typed
owner with status AVAILABLE/AMBIGUOUS/UNAVAILABLE, operand IDs, disclosed
values only, limitations, provenance, and digest. Do not invent numeric values.

## 6. Classifier pseudocode

Implement or extract this logic before capability lookup:

```text
classifyCompare(query, visibleEntities):
  ids = query.subject.entityIds
  if query.subject.type == UNKNOWN:
    return CLARIFY(COMPARE_TARGET_UNRESOLVED)
  if ids.length < 2:
    return CLARIFY(COMPARE_REQUIRES_TWO_TARGETS)
  if ids.length > 20:
    return CLARIFY(COMPARE_TARGET_LIMIT)
  if duplicate(ids):
    return CLARIFY(COMPARE_DUPLICATE_TARGET)
  if query.subject.type == METRIC:
    return METRIC_COMPARISON(ids, preserveOrder=true)
  if query.subject.type == CAMPAIGN_CHOICE:
    return MANEUVER_COMPARISON(ids, preserveOrder=true)
  return CLARIFY(COMPARE_UNSUPPORTED_SUBJECT)
```

Then dispatch:

```text
classified = classifyCompare(query, visibleEntities)
if classified is CLARIFY: return structured clarification
capability = registry.resolve(COMPARE, classified.subjectType)
if capability absent: return structured clarification, never generic crash text
result = capability.handler(classified)
assert result is read-only and provenance-bound
return result
```

Register only `COMPARE/METRIC` and `COMPARE/CAMPAIGN_CHOICE` if both owners
exist. Do not register `COMPARE/UNKNOWN`.

## 7. Preserve field order

Never sort target arrays. Sets may detect duplicates but may not become output.
For input `M P D`, the semantic IDs must be exactly `[M, P, D]`.

Generate tests from the fixture's actual visible handles. Test every ordered
pair of distinct handle families, every base/numbered combination, and every
available ordered triple.

## 8. Two-target presentation

For exactly two targets, set presentation mode `PAIR`, reveal both targets,
and preserve the current pairwise dimensions, verdict, provenance, and no-
winner rule. Do not duplicate comparison arithmetic.

## 9. Three-or-more modulation

For 3–20 targets, add a typed read-only envelope, not a parser shortcut:

```text
mode = MODULATED
orderedTargetIds = original input order
revealedIndex = 0
revealedTargetIds = current one-module segment
remainingTargetIds = unrevealed IDs
```

The initial response reveals one module. Each explicit expansion advances one
module. Expansion never reruns target recognition, sorts IDs, changes the
comparison set, changes its digest, selects a winner, or mutates state. If no
existing typed expansion owner exists, stop and report the missing owner rather
than inventing a natural-language expansion parser.

## 10. Required tests

Add tests for: `compare m` clarification; `compare m1 p1` metric success;
reversed `p1 m1` order; every declared handle-family pair; `M P D` ordered
modulation; one-module expansion; arbitrary explicit expansion order; duplicate,
unknown, and negated inputs; existing pairwise dimensions; browser/terminal/
native semantic parity; and flavor at most once without digest change.

## 11. Validation

Run: `npm run test:ava-content-quality`,
`npm run test:ava-content-quality-epoch-008`, `npm run typecheck`,
`bash scripts/test-ava.sh`, `bash scripts/test-substrate.sh`,
`npm run cloudflare:types`, and `git diff --check`.

Report the known unrelated `playing -> INSPECT` versus expected `EXPLAIN`
failure separately.

## 12. Stop conditions

Stop if metric ownership is unclear, values would be invented, UNKNOWN reaches
capability lookup, target order changes, modulation becomes an untyped parser,
modulation mutates/selects, flavor changes semantic output, pairwise evidence
changes unexpectedly, or any falsification/parity test regresses.

## 13. Commit

After passing validation or recording a failure ledger, commit only the repair
and tests with message:

`Repair field-agnostic comparison capability and modulation`

Do not push or deploy without separate authorization.
