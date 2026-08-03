# Epoch 006 — AvaShell field grammar, chromatic semantics, and departmental life

## Status and execution boundary

This document is a local implementation plan only. It is not an authorization to
modify the upstream repository, deploy, push, change production state, or create
new external integrations.

The working directory supplied for this task is empty apart from Git metadata and
has no local checkout of the product. The plan therefore targets the current
`andyfunke/Delenda.Quest` authorities as observed through GitHub, especially:

- `app/ava/grammar.ts`
- `app/ava/request-ir.ts`
- `app/ava/schema.ts`
- `app/ava/compiler.ts`
- `app/ava/operational-semantics.ts`
- `app/ava/terminal.ts`
- `app/ava/completion.ts`
- `app/GameClient.tsx`
- `app/globals.css`
- `docs/substrate/grammar.md`
- `docs/ux-text-hierarchy.md`
- `docs/substrate/assimilation-ledger.md`

The implementation must preserve the existing doctrine: one typed semantic
authority, many projections; no client-owned mechanics; deterministic parsing;
fail-closed mutation; no hidden-state disclosure; and semantic parity between
browser AvaShell, SSH, and any other command adapter.

## User outcome

Make AvaShell feel like the same living strategic instrument as the campaign:

1. Replace the current inconsistent typography with a disciplined, period-war,
   future-oriented visual system. Use one coherent family for headings rather
   than a collection of unrelated decorative faces.
2. Color every token that has categorical semantic meaning, including category,
   command, status, risk, comparison, and executable-choice tokens.
3. Make comparison symmetric across all supported category forms:
   `M1 ↔ P1`, `M ↔ P`, `M1 ↔ P`, and `N ↔ P`, plus every other valid category
   combination. Do not implement this as a list of isolated special cases.
4. Capture the supplied hard words and phrases through the canonical grammar or
   explicit hard-family aliases.
5. Give Production, Military, and Diplomacy daily operational life and make each
   issue open into a deterministic scenario with compliant examples.
6. Bring non-campaign menus up to the same narrative, semantic, and visual
   standard as the campaign surface.

## Non-negotiable design doctrine

### Typography

Use a single primary display/heading family with multiple weights and styles.
The desired direction is WWI staff-map / field-telegraph / early-modernist
future: technical, archival, severe, and readable. It must not become faux
military stencil text, novelty type, or an unreadable retro terminal.

Use the existing type-role model as the authority:

- Heading and answer: same primary family, weight/size variation only.
- Body and Ava voice: same primary family, readable line height.
- Data and executable grammar: existing mono family.
- Labels: mono uppercase, reserved for short labels.
- Display title: primary family at a larger size; do not introduce a second
  ornamental family merely to make a title look dramatic.

The weaker model must first inventory every AvaShell selector and map it to one
of these roles. It must then replace family fragmentation with CSS variables and
role classes. Do not perform a blind global font replacement: check headings,
answers, shell output, player input, labels, notices, modal text, and generated
scenario text separately.

Font acceptance criteria:

- Every heading level in AvaShell uses the same family.
- Weight, size, tracking, case, and spacing establish hierarchy.
- No body copy uses label sizing.
- No text below the existing accessibility floor is introduced.
- Contrast and 200% scaling requirements from `docs/ux-text-hierarchy.md`
  remain satisfied.
- Browser rendering, fallback rendering, and terminal rendering remain usable
  without relying on a remote font fetch.

### Color

Create one semantic token map and use it everywhere. The map must be data-driven,
not a collection of local `color: ...` decisions.

Minimum categories:

| Token family | Meaning | Existing direction |
|---|---|---|
| `category-campaign` | campaign / general theater | neutral off-white or ink |
| `category-production` | production / industry / logistics | amber |
| `category-military` | military / force / front | red |
| `category-diplomacy` | diplomacy / actor relations | cyan or blue |
| `category-network` | intelligence / communications | violet or cyan |
| `action` | executable choice or recommendation | amber |
| `intelligence` | inspectable fact or link | cyan |
| `danger` | loss, rejection, threat, exposure | red |
| `success` | gain, confirmation, completed receipt | green |
| `muted` | non-semantic chrome | muted gray |

Every categorical trigger must render with both a semantic class and a textual
or structural cue. Color alone is never the only carrier of meaning. Add a
marker, prefix, border, icon, label, or accessible text where appropriate.

The renderer must color the whole recognized token, not an arbitrary substring.
For example, `compare production military` should classify and color both
category tokens while leaving the connective grammar readable. Do not color
ordinary prose merely because it contains a word that resembles a category.

## Work breakdown

The implementing model must complete the following bounded nodes in order.

### NODE-01 — Authority and inventory preflight

Read the current files listed at the top of this document. Identify:

- the lexical family tables;
- the parser entry points;
- the request IR category representation;
- the comparison compiler and validator;
- the terminal realization path;
- the Ava text renderer and tokenization path;
- the module page components for Production, Military, and Diplomacy;
- the current issue/scenario data source;
- the daily briefing source and seed/day binding;
- all CSS selectors used by AvaShell and non-campaign module pages.

Record the exact current names before editing. If an authority has moved, port the
plan to the current owner. Do not create a second parser, second grammar, or
second content authority.

### NODE-02 — Canonical vocabulary and hard-family index

Extend the existing canonical vocabulary tables, not ad hoc string checks. Add
the following exact lexical families, with normalization for case and harmless
punctuation:

| Family | Required forms |
|---|---|
| status | `stats`, `status`, `current position`, `what is going on` |
| mission | `mission`, `missions` |
| outcome | `winning`, `losing`, `win`, `lose`, `how are we doing` |
| play | `playing`, `how to play`, `game works`, `what do I do` |
| navigation | `navigate production`, `go to production`, `open production`, and equivalent Military/Diplomacy forms |
| advise | `advise`, `recommend`, `recommendation`, `what should I do` |
| compare | `compare`, `versus`, `vs`, `against` |
| list | `list`, `show`, `options`, `docket` |
| category | `production`, `prod`, `military`, `mil`, `diplomacy`, `diplo`, `network`, `campaign` |

Compile these into canonical operations such as `STATUS`, `MISSIONS`, `HELP`,
`ADVISE`, `COMPARE`, and `SHOW_DOCKET`. Read-only words may use compositional
recovery; mutation-adjacent words must retain exact-target and confirmation
requirements.

Add a table-driven regression fixture for every required phrase and its case,
spacing, punctuation, and polite-framing variants. Include these exact phrase
families as focused fixtures:

- `stats`
- `mission`
- `winning`
- `losing`
- `playing`
- `how to play`
- `navigate production`
- `advise m p`
- `compare m p`
- `list m p`
- `stats m p`
- `m p`

The phrase `m p` must resolve only when the existing grammar defines `M` and `P`
as unambiguous category abbreviations. If it can mean multiple things in the
current authority, return `AMBIGUOUS` with a helpful clarification rather than
guessing.

### NODE-03 — Category algebra and symmetric comparison

Replace pair-specific comparison branches with a canonical category-reference
model.

Define a category reference as:

```text
CategoryRef = {
  family: Campaign | Production | Military | Diplomacy | Network | ...,
  ordinal?: positive integer,
  actor?: canonical actor id,
  source: explicit | discourse | default
}
```

Normalize every supplied reference before comparison. `M`, `M1`, `P`, `P1`, and
`N` are shorthand forms only; they must lower to the same typed representation
used by full names. Preserve ordinal identity and actor identity. Never compare
display labels or reparse rendered text.

Enumerate the valid matrix:

- unnumbered ↔ unnumbered: `M P`, `M vs P`, `production military`;
- numbered ↔ unnumbered: `M1 P`, `M P1`, `N P`;
- numbered ↔ numbered: `M1 P1`;
- same-family comparisons where the domain allows them: `M1 M2`, `P1 P2`;
- actor-bound Diplomacy references against category references where the schema
  permits them;
- discourse-bound ordinals after a docket has been displayed.

For each pair, test normalization, lookup, eligibility, scoring, deterministic
tie-breaking, rendering, and failure behavior. Unsupported pairs must fail with
`NOT_FOUND` or `AMBIGUOUS` for a principled reason, never because the parser only
recognized one ordering.

The comparison operation remains read-only. It must not prepare, confirm, spend
an order, reveal hidden state, or reroll a docket.

### NODE-04 — Token classification and semantic rendering

Introduce or extend a typed token stream between semantic realization and HTML /
terminal rendering. The token stream must preserve the underlying text and mark
recognized spans with categories such as:

```text
Token = Text | Category | Operation | ChoiceId | Status | Risk | Actor | Metric | Link
```

Required behavior:

- every recognized category word receives its category class;
- every categorical operation word receives its operation class;
- choice IDs retain executable-handle styling;
- status words such as `winning`, `losing`, `confirmed`, `rejected`, and
  `ambiguous` receive status styling;
- metrics and values remain data/mono styling;
- ordinary prose remains body styling;
- tokenization is deterministic and does not use an LLM;
- HTML escapes text before wrapping spans;
- terminal output has a compatible ANSI/no-color projection;
- accessibility text exposes the semantic category independently of color.

Add collision rules. Longest and most specific phrase wins before single-word
aliases. A category token inside a quoted story sentence is classified only when
the semantic realization marks it as a trigger; raw prose must not become a
rainbow of accidental colors.

### NODE-05 — Typography and AvaShell visual system

Implement the typography pass only after the token-role map exists.

Enumerate and update these surfaces:

1. Ava header and window controls.
2. State strip.
3. `YOU` input lines.
4. Ava authored response labels.
5. Shell/preformatted output.
6. Grammar examples and command prompts.
7. Warnings, receipts, ambiguity notices, and confirmation notices.
8. Help/manual content.
9. Daily story and scenario prose.
10. Production, Military, and Diplomacy module headers, cards, drawers, and
    issue detail views.

Use one heading family throughout these surfaces. Use mono only where the text
is data, a command, an identifier, a timestamp, or a compact label. Use weight,
size, tracking, rules, and spacing to distinguish heading levels. Do not use
five competing fonts to signal five meanings.

Create a visual regression checklist at desktop, narrow mobile, keyboard focus,
high contrast, and 200% text scale. Check for wrapping, clipping, unreadable
labels, and loss of semantic markers.

### NODE-06 — Department daily-status contract

Create a typed, deterministic daily-status object for each non-campaign module:

```text
DepartmentDailyStatus = {
  day: number,
  department: Production | Military | Diplomacy,
  headline: string,
  dispatch: string,
  facts: Fact[],
  pressure: Pressure,
  linkedIssueIds: IssueId[],
  availableActions: ChoiceId[],
  continuityKey: string
}
```

The status must be derived from disclosed campaign state, day, deterministic
seed, and the department's typed facts. It must not invent hidden facts. The
same object must drive browser rendering, Ava output, and any terminal output.

For each department, enumerate at least:

- 8 headline templates;
- 8 dispatch templates;
- 6 pressure states;
- 6 fact bundles;
- 6 transition/continuity hooks;
- 6 deterministic examples per pressure state.

The generated result should feel like a daily operational dispatch, not a generic
dashboard subtitle. Keep claims bounded by supplied facts, and validate length,
grammar, forbidden claims, and continuity references.

Department guidance:

- Production: factories, rail, fuel, machine tools, repair queues, convoy
  throughput, labor, stockpiles, and bottlenecks.
- Military: frontage, reserves, attrition, readiness, artillery, weather,
  command tempo, defensive depth, and force preservation.
- Diplomacy: actor posture, envoys, concessions, guarantees, dependency,
  intelligence signals, and the cost of autonomy.

### NODE-07 — Issue-to-scenario enumeration

Every issue card must link to a typed scenario object. Do not ask a broad model to
invent a story at render time. Enumerate scenarios from the existing issue
catalog and spinal matrix.

Minimum scenario shape:

```text
IssueScenario = {
  issueId: IssueId,
  department: Department,
  situation: string,
  disclosedFacts: Fact[],
  pressure: Pressure,
  choices: ScenarioChoice[],
  consequences: ConsequencePreview[],
  grammarExamples: string[],
  continuityFacts: string[],
  forbiddenClaims: string[]
}
```

For each existing issue, enumerate:

1. One baseline situation.
2. One low-pressure variant.
3. One high-pressure variant.
4. One recovery or opportunity variant where the mechanics permit it.
5. Three compliant choices mapped to existing choice IDs.
6. One short logistical story for each choice.
7. One consequence preview for each choice, limited to disclosed effects.
8. At least four valid Ava grammar examples using the issue's actual handles.
9. At least two invalid or ambiguous examples proving fail-closed behavior.

Each story must mention concrete logistical context appropriate to its department
and must not change mechanics. The canonical choice ID, cost, eligibility,
effects, and outcome remain authoritative in the existing semantic layer.

### NODE-08 — Non-campaign menu parity

Audit every non-campaign menu as a participant-facing surface rather than a
utility screen. For each module, enumerate:

- opening daily dispatch;
- current pressure and why it matters;
- live metrics with provenance;
- issue cards with scenario hooks;
- choice detail with logistical story;
- deterministic recommendation or comparison path;
- return path to the department docket;
- empty, locked, exhausted, and unavailable states;
- keyboard, screen-reader, and compact-terminal projections.

No menu may display a decorative story that is disconnected from the typed state.
No story may imply that an action occurred before preparation/confirmation.
Every actionable button must expose its canonical choice handle and semantic
category.

### NODE-09 — Tests and parity proof

Add focused tests before broad integration tests.

Grammar tests must cover every required hard phrase, all case/punctuation forms,
all category abbreviations, all comparison orderings, and ambiguous cases.

Category tests must cover normalization, ordinal lookup, actor lookup, same-family
and cross-family pairs, missing entities, duplicate shorthand, and discourse
bindings.

Token tests must cover full-token coloring, overlapping phrases, escaped HTML,
plain-text output, ANSI output, accessibility labels, and non-trigger prose.

Content tests must enumerate every department × pressure state × issue variant
combination and validate facts, handles, claims, length, and continuity.

Parity tests must submit the same semantic request through browser Ava, terminal
Ava, and SSH adapters and compare the semantic result, not merely the rendered
string.

Regression tests must prove:

- read-only words never create mutation intents;
- `m p` does not guess when ambiguous;
- comparison never rerolls or mutates a docket;
- hidden state never appears in a daily story;
- color is not required to understand a response;
- existing canonical daily briefing text remains exact where the grammar
  requires exact realization.

### NODE-10 — Acceptance review

The work is complete only when all of the following are true:

- all headings use one coherent family and hierarchy;
- all categorical triggers are typed and color-coded in every projection;
- every valid category comparison is symmetric and tested;
- every required phrase compiles or returns a deliberate, useful ambiguity;
- each department has a daily status plug with deterministic continuity;
- every issue has scenario enumeration and compliant examples;
- non-campaign menus have narrative, state, choice, and accessibility parity;
- no LLM owns mechanics, token classification, or hidden-state disclosure;
- focused tests pass, then the repository's required full validation gates pass;
- the final diff contains no generated secrets, production mutations, or
  unrelated rewrites.

## Required handoff artifacts

The implementing model must return:

1. A changed-file map grouped by node.
2. The canonical vocabulary additions.
3. The complete category comparison matrix and unsupported-case policy.
4. The semantic token taxonomy and color-token map.
5. Counts of enumerated department templates, pressure states, issue variants,
   choices, and grammar fixtures.
6. Test commands and results.
7. A list of cases intentionally left ambiguous or unimplemented.
8. Explicit confirmation that no deployment, push, production write, secret
   movement, or external activation occurred.

## Explicit non-goals

- Do not rewrite campaign mechanics.
- Do not create a second parser or renderer authority.
- Do not make stories authoritative over state.
- Do not add random prose that can claim undisclosed facts.
- Do not use color as the sole semantic signal.
- Do not silently interpret ambiguous shorthand as an executable order.
- Do not deploy or modify the upstream GitHub repository as part of this epoch
  planning task.
