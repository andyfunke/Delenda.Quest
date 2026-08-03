# Ava comparison and flavor repair

Status: plan only. Do not implement without explicit authorization.

## Scope

Repair two defects without changing campaign mechanics, falsification rules,
semantic ownership, or Epoch 007/008 quality tooling:

1. Make comparison instruction shape consistent.
2. Make relevant flavor pass through one shared, idempotent voice assembly path.

## Authorities

Read `AGENTS.md`, `SUBSTRATE_DOCTRINE.md`,
`docs/ava-relevance-graph-proposal.md`, `app/ava/voice.ts`,
`app/ava/compiler.ts`, and `app/ava/nexus.ts` before editing.

Preserve these invariants: compiler owns intent; Nexus owns authoritative
projection; voice owns realization only; flavor cannot create state, outcomes,
commands, or hidden facts; ambiguity fails closed; existing falsification tests
remain authoritative; all surfaces produce the same semantic result.

Do not edit the quality tooling, corpus, or epoch files:
`app/ava/relevance-engine.ts`, `scripts/ava-content-quality.mjs`,
`app/ava/content-quality-manifest.ts`, `content-quality/`,
`docs/epochs/epoch-007-ava-content-quality-decompiler/`, or
`docs/epochs/epoch-008-ava-quality-infrastructure/`.

## Node 0 — preflight

Run `git status --short --branch`, `git rev-parse HEAD`, and:

`rg -n "shouldUseSemanticInstruction|voiceAvaResponse|responseOpening|responseText|voiceCueForInstruction|FIELD NOTE" app/ava tests`

If uncommitted changes overlap `app/ava/` or tests, record ownership and stop
before editing.

## Node 1 — choose and repair the comparison contract

Current evidence: composed natural language returns
`SEMANTIC / operation COMPARE`; explicit `M1 M2` currently returns `SEMANTIC`
in the failing test, which expects legacy `COMPARE`.

Inspect:

- `shouldUseSemanticInstruction()` in `app/ava/compiler.ts`;
- the comparison branch around compiler semantic validation;
- `instructionForSemanticQuery()` in `app/ava/nexus.ts`;
- `projectAvaOperationalSemantics()` and `projectAvaManeuverComparison()`;
- all `COMPARE` tests and docs.

Choose one contract using repository evidence, then document the choice in the
test or repair receipt:

- A: every comparison is `SEMANTIC` with operation `COMPARE`;
- B: explicit handles are `COMPARE`, composed language is `SEMANTIC`;
- C: every complete two-target comparison is `COMPARE`.

Do not change comparison math or create a second handler. If `SEMANTIC` is the
canonical contract, update both forms and tests consistently. If `COMPARE` is
canonical for complete targets, lower it through the existing Nexus route.

Required comparison domain: any valid disclosed field handle may participate.
The implementation must not special-case only military maneuver handles.
Examples of valid handles include `M`, `M1`, `M2`, `P`, `P2`, and `D` when
those handles are present in the current visible docket.

Required matrix:

- `compare M1 P2`: compare two explicit fields;
- `compare M P`: compare two base fields;
- `compare M2 P`: compare a numbered field with a base field;
- `compare M P2`: compare a base field with a numbered field;
- `compare M P D`: compare three fields in the supplied order;
- `compare M1 P2 D`: compare mixed numbered/base fields in supplied order;
- `compare M1 M2 P2 D`: compare all requested valid fields in supplied order;
- `compare reinforce the salient with exploit the gap`: preserve the existing
  natural-language target behavior when those targets are valid;
- `compare M1`: clarification, no execution;
- `compare unknown P2`: missing-target clarification;
- duplicate handle input such as `compare M1 M1`: clarification or the
  existing duplicate-target error, never a fabricated comparison;
- negated comparison: no mutation or selection;
- browser and terminal: identical semantic object.

The tests must generate this matrix from the declared handle families rather
than hand-writing only `M1/M2`. At minimum, exercise every pair of distinct
families and every valid numbered/base combination present in the current
visible docket.

### Module expansion contract

Comparison display is cardinality-sensitive:

- exactly two requested targets are shown together in the initial response;
- three or more requested targets use modulation: the comparison identity
  contains the full ordered target list, but the response reveals one module at
  a time through explicit expansion;
- modulation is presentation only. It must not change the comparison set,
  semantic calculation, or target order.

A comparison response must not dump every module's fields into one answer.

```text
two targets       -> render both together
three+ targets    -> render first module, then one additional module per expansion
next-module       -> expand to exactly one additional module
repeat            -> continue in supplied left-to-right order
```

The next module is selected by explicit user request. If the user provides an
arbitrary left-to-right sequence, preserve that sequence exactly. Do not sort
modules into a canonical order and do not assume a fixed module order.

For a request such as `compare M P D`, the compiler must preserve the semantic
target sequence `[M, P, D]`. Because this has three targets, the renderer
presents the first modulated module initially, together with a truthful
affordance to expand. Expansion
must carry the persisted comparison identity and append only the next requested
module. It must not rerun target resolution, change the comparison set, or
re-roll the order.

Required expansion tests:

- a two-target comparison returns both targets together;
- a three-or-more-target comparison returns the first modulated module;
- `expand P` returns only module `P`;
- then `expand D` returns only module `D`;
- `expand D` first, then `expand P`, preserves that arbitrary order;
- expansion does not change the original target IDs or semantic digest;
- an unavailable module produces structured unavailability, not generic prose;
- asking for all modules is either handled one-at-a-time or clarified; it must
  not expose the full catalog in a single response.

Assert semantic identity, not prose:

`assert.equal(result.semantic.operation, "COMPARE")`

`assert.deepEqual(result.semantic.subject.entityIds, ["salient", "gap"])`

For generated handle cases, assert the exact left-to-right sequence:

`assert.deepEqual(result.semantic.subject.entityIds, expectedHandles)`

## Node 2 — create one shared flavor assembly path

Root cause: `voiceAvaResponse()` currently returns early when text already
starts with `FIELD NOTE`. Nexus/advisory paths often preconstruct that wrapper,
so they bypass `compileAvaRelevantAside()`. Other paths do not pass the raw
player utterance as `cue.utterance`.

Add a pure helper in `app/ava/voice.ts`:

`assembleAvaVoice({ state, text, cue }): string`

Algorithm:

1. If text has the known `FIELD NOTE` wrapper, parse its label and remove only
   that wrapper plus its known opening line.
2. Preserve the remaining canonical answer body byte-for-byte.
3. If `cue.utterance` exists, call
   `compileAvaRelevantAside(cue.utterance, cue.variant)`.
4. Use the aside line when present; otherwise use the existing safe opening or
   `responseOpening()` fallback.
5. Return exactly one `FIELD NOTE / LABEL`, one opening line, two newlines, and
   the untouched canonical body.
6. If parsing is unsafe, do not guess or drop text; stop and add a structured
   response field instead.
7. Make the function idempotent: assembling twice does not duplicate wrapper or
   opening.

Make `voiceAvaResponse()` delegate to this helper, or replace every caller with
the helper. Find all callers with:

`rg -n "voiceAvaResponse\\(" app/ava`

Find prewrapped responses with:

`rg -n "FIELD NOTE" app/ava`

Propagate `request.rawInput` from the canonical Nexus request into
`AvaVoiceCue.utterance`. Keep terminal propagation from
`compilerTrace.rawInput`, but route it through the same helper. Never infer raw
input from semantic output or rendered text. Never pass hidden state, RNG, or
the full corpus. Shell responses remain unwrapped.

## Node 3 — flavor tests

Add shared voice tests and one terminal/Nexus integration test for:

- relevant plain body: aside appears once;
- irrelevant body: fallback opening appears;
- relevant prewrapped body: one wrapper, no duplicate opening;
- authored flavor: explicit preserve/replace policy, never accidental double;
- same utterance twice: byte-identical;
- cursor variation: only declared variation changes;
- terminal and Nexus: raw input reaches the cue;
- shell: no wrapper;
- rejection/mutation: authority behavior unchanged.

Required assertions:

- exactly one `FIELD NOTE /` wrapper;
- relevant aside appears exactly once;
- canonical answer body remains present;
- semantic result and digest are unchanged by adding flavor.

## Node 4 — cross-surface parity

Use one complete comparison input and one relevant flavor input. Exercise
browser/Nexus, terminal, and existing native session-core coverage. Compare
semantic objects first, then prose properties. Require the same aside ID or the
same abstention and one wrapper for non-shell responses. Stop on semantic
divergence; never hide it with prose.

## Validation

Run, in order:

- `npm run test:ava-content-quality`;
- `npm run test:ava-content-quality-epoch-008`;
- `npm run typecheck`;
- `bash scripts/test-ava.sh`;
- `bash scripts/test-substrate.sh`;
- `npm run cloudflare:types`;
- `git diff --check`.

Recheck the two known baseline failures (`playing -> INSPECT`, expected
`EXPLAIN`; comparison -> `SEMANTIC`, expected `COMPARE`). Do not silently
reclassify unrelated failures.

## Stop conditions

Stop and report if comparison authority is unclear, wrapper parsing could drop
content, flavor changes semantic digests or command results, an aside claims a
state/outcome/action, browser and terminal semantics differ, shell receives a
wrapper, any falsification test regresses, or the repair requires mechanics or
hidden-state projection changes.

## Commit

Before commit run `git status --short`, `git diff --check`, and `git diff --stat`.
Commit only repair files/tests with:

`Repair Ava comparison contract and shared flavor assembly`

Do not push or deploy without a separate request.
