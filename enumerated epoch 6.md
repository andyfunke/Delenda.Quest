# Epoch 006 — Executable AvaShell patch recipe

## 0. Contract

This is a deterministic construction recipe, not an annotated design. Execute sections in order. Do not infer missing behavior.

This task is local-only: do not push, commit, deploy, mutate production, move secrets, change bindings, or modify external services.

Authority order: user request; repository instructions; `SUBSTRATE_DOCTRINE.md`; current typed application authority; `docs/substrate/grammar.md`; `docs/ux-text-hierarchy.md`; this file.

The current local directory has no product checkout. Before applying this recipe to product code, obtain the checkout and run Section 1.

The companion file `epoch 6 data tables.tsv` is normative input. Do not invent or silently omit rows.

## 1. Preflight

Run:

```sh
git status --short --branch
rg --files -g 'AGENTS.md' -g 'SUBSTRATE_DOCTRINE.md' -g 'app/ava/**' -g 'app/GameClient.tsx' -g 'app/globals.css' -g 'tests/**'
```

Read the current versions of:

```text
AGENTS.md
SUBSTRATE_DOCTRINE.md
app/ava/grammar.ts
app/ava/request-ir.ts
app/ava/schema.ts
app/ava/compiler.ts
app/ava/terminal.ts
app/ava/completion.ts
app/GameClient.tsx
app/globals.css
docs/substrate/grammar.md
docs/ux-text-hierarchy.md
docs/substrate/assimilation-ledger.md
```

Record the actual exported symbol/path for each role:

```text
LEXER_OWNER
GRAMMAR_OWNER
IR_OWNER
CATEGORY_REF_OWNER
COMPARE_OWNER
HTML_RENDER_OWNER
TERMINAL_RENDER_OWNER
MODULE_DATA_OWNER
ISSUE_DATA_OWNER
DAILY_STATUS_OWNER
TEST_OWNER
```

If a role has two owners, stop. If a named path moved, use its current owner and record the move. Never create a second authority.

## 2. Parse the normative tables

Parse TSV with exactly nine columns:

```text
table, id, family, alias, canonicalOperation, canonicalDepartment,
readOnly, ambiguityRule, notes
```

Reject any row with a different column count. Required tables:

```text
GRAMMAR_PRODUCTION
LEXICON
CATEGORY_ALIAS
COMPARE_CASE
COLOR_TOKEN
CONTENT_REQUIREMENT
```

Generate code/tests from rows; do not hand-copy individual cases.

## 3. Install normalization

Add this function to the existing lexer/normalizer, or adapt the existing function to identical behavior:

```ts
function normalizeAvaInput(raw: string): string {
  return raw.normalize("NFKC").toLowerCase()
    .replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}
```

Do not stem, fuzzy-match, delete digits, or infer omitted targets.

## 4. Install grammar rows

For each `GRAMMAR_PRODUCTION` row, create one production in the existing grammar representation:

```text
productionId = row.id
lhs = row.lhs
rhs = row.rhs
operation = row.canonicalOperation
scopeRule = row.scopeRule
targetCount = row.targetCount
readOnly = row.readOnly
precedence = row.precedence
```

If the source representation differs, translate the row into the existing parser. Do not add a regex parser beside it.

Minimum IR shapes (map names to the current repository equivalents):

```ts
HELP(scope: Scope | null)
STATUS(targets: CategoryRef[])
MISSIONS(scope: Scope | null)
SHOW_DOCKET(targets: CategoryRef[])
ADVISE(targets: CategoryRef[])
COMPARE(targets: [CategoryRef, CategoryRef])
```

Required results:

```text
stats               -> STATUS []
mission             -> MISSIONS []
winning             -> STATUS []
losing              -> STATUS []
playing             -> HELP []
how to play         -> HELP []
navigate production -> navigation to PRODUCTION
advise m p          -> ADVISE [MILITARY, PRODUCTION]
compare m p         -> COMPARE [MILITARY, PRODUCTION]
list m p            -> SHOW_DOCKET [MILITARY, PRODUCTION]
stats m p           -> STATUS [MILITARY, PRODUCTION]
m p                 -> AMBIGUOUS unless M/P are unique in current schema
```

Generate each lexicon row in lowercase, uppercase, mixed case, leading/trailing whitespace, repeated internal whitespace, and terminal `.`, `,`, `?`, `!` forms. Strip terminal punctuation only after complete recognition.

For every new production assert:

```ts
assert(operation !== "PREPARE");
assert(operation !== "CONFIRM");
assert(operation !== "EXECUTE");
assert(operation !== "RESOLVE_DAY");
```

## 5. Install category references

Use the existing category-reference owner. Map the TSV `CATEGORY_ALIAS` rows to the current type. Minimum shape:

```ts
type CategoryRef = {
  family: Department;
  ordinal: number | null;
  actorId: string | null;
  source: "EXPLICIT" | "DISCOURSE" | "DEFAULT";
  originalText: string;
};
```

Implement this algorithm:

```ts
function parseCategoryRef(words, discourse, schema) {
  const match = longestTableMatch("CATEGORY_ALIAS", words);
  if (!match) return NOT_FOUND("category");
  if (match.ordinal !== null && match.ordinal < 1)
    return NOT_FOUND("ordinal must be positive");
  const ref = {
    family: match.family, ordinal: match.ordinal ?? null,
    actorId: match.actorId ?? null, source: "EXPLICIT",
    originalText: match.text
  };
  if (!schema.categoryExists(ref)) return NOT_FOUND("category target");
  return ref;
}
```

Resolve discourse ordinals only against the last displayed docket. Never use catalog order.

## 6. Install symmetric comparison

For each `COMPARE_CASE` row, generate forward and reverse tests:

```ts
for (const row of rows("COMPARE_CASE")) {
  expect(parse(row.forward)).toEqual(row.expectedForward);
  expect(parse(row.reverse)).toEqual(row.expectedReverse);
}
```

Required families include `M P`, `M1 P`, `M P1`, `M1 P1`, `N P`, `N1 P`, `N P1`, `N1 P1`, their reverses, `M1 M2`, `M2 M1`, `P1 P2`, and `P2 P1`.

All pairs must use one path:

```ts
function compareTargets(leftInput, rightInput, state, discourse) {
  const left = parseCategoryRef(leftInput, discourse, state.schema);
  const right = parseCategoryRef(rightInput, discourse, state.schema);
  if (isError(left)) return left;
  if (isError(right)) return right;
  const before = stableStateDigest(state);
  const result = evaluateComparison(buildReadOnlyPlan(left, right, state), state);
  assert(stableStateDigest(state) === before);
  return result;
}
```

Do not add pair-specific branches. A reverse pair may differ in presentation order, but must not fail because parser order differs. Comparison must not reroll, spend, prepare, confirm, or reveal hidden state.

## 7. Install semantic tokens

Extend the existing semantic renderer, not a second renderer:

```ts
type AvaToken = {
  kind: "TEXT" | "CATEGORY" | "OPERATION" | "CHOICE_ID" | "STATUS" |
    "RISK" | "ACTOR" | "METRIC" | "LINK" | "GRAMMAR";
  text: string;
  semanticId: string | null;
  className: string | null;
  accessibleLabel: string | null;
};
```

Use semantic marks from the canonical response object:

```ts
function classifyResponse(text, marks) {
  const accepted = removeOverlaps(marks, [
    "CHOICE_ID", "CATEGORY", "OPERATION", "STATUS", "RISK",
    "ACTOR", "METRIC", "LINK", "GRAMMAR"
  ]);
  return spliceText(text, sortByStart(accepted));
}
```

For each `COLOR_TOKEN` row, emit the table class, accessible label, and marker. HTML must escape text. Plain text must equal the original text. ANSI and no-color output must preserve the same token boundaries.

Required non-color cues:

```text
PRODUCTION -> amber + [P]
MILITARY   -> red + [M]
DIPLOMACY  -> cyan + [D]
NETWORK    -> violet/cyan + [N]
```

Unmarked category words in story prose remain `TEXT`. Color alone must never carry meaning.

## 8. Install typography

Inventory every selector matching `.ava`, `.ava-*`, `.messages`, `.message-body`, `.ava-shell-output`, headings, labels, buttons, inputs, and module pages. Assign one role:

```text
DISPLAY | HEADING | ANSWER | BODY | AVA_VOICE | DATA | GRAMMAR | LABEL | CONTROL
```

Add once at root scope:

```css
--font-field-primary: <readable local-fallback field/modernist family>, sans-serif;
--font-field-mono: var(--font-geist-mono), "IBM Plex Mono", monospace;
```

Choose a readable WWI field-telegraph / future-modernist family. Reject stencil, distressed, novelty, and decorative display fonts. Apply primary to DISPLAY/HEADING/ANSWER/BODY/AVA_VOICE/CONTROL. Apply mono to DATA/GRAMMAR/LABEL. Use weight, size, tracking, line-height, and rules—not font-family changes—for hierarchy.

Render normal width, narrow width, keyboard focus, and 200% text scale. Fail on clipping, hidden focus, inconsistent heading family, or meaning conveyed only by color.

## 9. Install deterministic daily department status

For each of PRODUCTION, MILITARY, DIPLOMACY, create at least the exact minimums from `CONTENT_REQUIREMENT`:

```text
8 headlines
8 dispatches
6 pressure states
6 fact bundles
6 continuity hooks
36 examples (6 pressure states × 6 examples)
```

Implement in the existing daily-status owner:

```ts
function selectDepartmentStatus(state, department) {
  const facts = disclosedFacts(state, department);
  const seed = hash(state.campaignSeed, state.day, department);
  const pressure = classifyPressure(facts);
  const result = {
    day: state.day, department, facts, pressure,
    headline: choose(headlines[department], seed, 0),
    dispatch: choose(dispatches[department], seed, 1),
    linkedIssueIds: linkedIssues(state, department),
    availableActions: availableChoices(state, department),
    continuityKey: choose(continuityHooks[department], seed, 2)
  };
  validateDepartmentStatus(result);
  return result;
}
```

The function must be pure and fact-bounded. Browser, Ava, and terminal consume this object; they do not recalculate it.

Content diction is mandatory: Production uses factory/rail/fuel/repair/stockpile logistics; Military uses frontage/reserves/attrition/readiness/artillery/weather; Diplomacy uses actor posture/envoys/concessions/guarantees/dependency/autonomy.

## 10. Install issue scenarios

For every existing issue, create variants `BASELINE`, `LOW_PRESSURE`, `HIGH_PRESSURE`, and `RECOVERY_OR_OPPORTUNITY` only when the issue schema permits it.

Each variant must have:

```text
issueId, department, variantId, situation, disclosedFacts, pressure
at least 3 existing choice IDs
one logistical story per choice
one disclosed consequence preview per choice
at least 4 valid grammar examples
at least 2 invalid/ambiguous examples
continuityFacts, forbiddenClaims
```

Validate with:

```ts
function validateScenario(s, state) {
  assert(issueCatalog.has(s.issueId));
  assert(s.department === issueCatalog.department(s.issueId));
  assert(s.choices.length >= 3);
  for (const choice of s.choices) assert(choiceCatalog.has(choice.id));
  assert(s.grammarExamples.length >= 4);
  assert(s.invalidExamples.length >= 2);
  assert(allEffectsAreDisclosed(s.consequences, state));
  assert(noForbiddenClaim(s, s.forbiddenClaims));
  for (const x of s.grammarExamples) assert(isReadOnlyOrDisplay(parse(x)));
  for (const x of s.invalidExamples)
    assert(isAmbiguousOrNotFound(parse(x)));
}
```

Stories describe possible consequences only. They never claim preparation, confirmation, or execution.

## 11. Replace page composition

Each Production, Military, and Diplomacy page must call shared authorities and render:

```text
DepartmentHeader(status.department)
DailyStatus(status.headline, status.dispatch)
FactList(status.facts)
Pressure(status.pressure)
IssueList(status.linkedIssueIds)
ScenarioDrawer(selectedIssueId)
ChoiceList(scenario.choices)
ReadOnlyRoutes([ADVISE, COMPARE, SHOW_DOCKET])
TerminalState(empty/locked/exhausted/unavailable)
```

Every control carries canonical operation/choice ID, department class, accessible name, keyboard focus, and mutation state. Pages must not compute eligibility, scores, costs, effects, or narrative facts.

## 12. Generate tests and run gates

Generate tests directly from TSV:

```ts
for (const row of rows("LEXICON")) testAllNormalizationVariants(row);
for (const row of rows("GRAMMAR_PRODUCTION")) testProduction(row);
for (const row of rows("COMPARE_CASE")) {
  test(row.forward, row.expectedForward);
  test(row.reverse, row.expectedReverse);
  testStatePreserving(row.forward);
  testStatePreserving(row.reverse);
}
for (const row of rows("COLOR_TOKEN")) testHTMLPlainAnsiA11y(row);
```

Mandatory negative tests:

```text
unknown category -> NOT_FOUND
ordinal 0 or negative -> NOT_FOUND
ambiguous M/P -> AMBIGUOUS
missing compare target -> AMBIGUOUS
unknown compare target -> NOT_FOUND
read-only phrase plus mutation word -> fail closed
HTML metacharacters -> escaped
unmarked story category word -> TEXT
```

Run focused tests, then available equivalents of:

```sh
npm test
npm run typecheck
npm run lint
npm run build:ssh-gateway
npm run cloudflare:types
npm run cloudflare:validate
git diff --check
```

Record each as PASS, FAIL, or ENVIRONMENT-LIMITED with the exact command/error.

## 13. Completion output

Return `PASS` only if every TSV row is installed, every generated test passes, every content minimum is met, every department page consumes shared typed objects, semantic parity passes, and `externalActions == []`.

Otherwise return `BLOCKED` with the first failing row ID, source location, observed result, and correction. Never report partial completion as complete.
