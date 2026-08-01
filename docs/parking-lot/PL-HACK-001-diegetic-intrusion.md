# PL-HACK-001 — Diegetic intrusion operations

- Captured: 2026-08-01
- State: `PARKED`
- Depends on: Ava sealed shell, virtual filesystem, typed pipelines, Nexus
  action authority, shared graphical action descriptors
- Current foundation: one informational coached signals incident implemented
  locally; no mechanical campaign mutation is authorized by this plan

## Objective

Make terminal literacy itself part of Delenda Quest without turning the game
into a real shell, a trivia quiz, or a hidden console cheat. The player should
feel that they investigated and exploited a military information system by
using composable commands over evidence generated from the live campaign.

The target experience is Zachtronics-like in structure:

- a small set of stable operations;
- a large space of valid compositions;
- evidence that can be inspected from several angles;
- a verifier that judges the result, not the exact keystrokes;
- multiple legible solution paths where the evidence permits them;
- consequences that return to the main game rather than living in a separate
  puzzle economy.

## Preserved decisions

- Every target is a declared in-world simulation. No host path, process,
  socket, device, credential, DNS resolver, URL, arbitrary binary, or external
  network is reachable.
- Ava is a coach. A lay player can ask what a command means, request a command
  skeleton, and finally request the complete procedure.
- Hacking is evidence work. The player must inspect, filter, transform,
  correlate, verify, and submit a claim. `hack exploit` alone is never a
  solution.
- The first local slice awards only a one-time intelligence snapshot and proof
  receipt. It does not change GameState.
- Any future mechanical effect must be a typed Nexus action with declared
  cost, visibility, preparation, confirmation, idempotency, audit, and parity.
- A terminal user may discover a solution through commands, but a graphical
  player must be able to inspect the same semantic evidence and issue the same
  resulting action. The terminal is not a privileged second game.
- Hidden variables are disclosed only by an authored visibility policy. A
  command cannot become a general hidden-state oracle.

## Current implemented foundation

The implemented foundation is now owned by `packages/intrusion-library`, not
the Ava cognitive-runtime ledger or natural-language grammar. The package
contains the typed family schema, authored authentication-drift catalogue,
pure deterministic evidence compiler, verifier predicates, coaching ladder,
disclosure report, and versioned compiled incident object. `app/ava/hacking.ts`
is a thin adapter over that object.

The first workbench is a campaign-bound relay-authentication incident:

```text
hack start
cat mission.txt
nmap relay-grid
cat auth.log | grep AUTH=FAIL | cut -d " " -f 3 | sort | uniq -c
diff authorized-keys.csv observed-keys.csv
hack submit relay-…
cat intrusion-report.txt
```

The player correlates repeated authentication failures with a substituted key.
Wrong submissions are harmless. `hack hint` has three disclosure levels. A
correct claim unlocks a captured signal report and SHA-256 receipt in the
virtual filesystem. The workspace persists in the Ava archive for the current
campaign day and becomes stale when that day advances.

## Puzzle compiler

Future incidents should compile from four independently versioned layers.

### 1. Mechanical spine

A spine declares the reasoning operation, not the prose:

| Spine | Evidence operation | Example result |
|---|---|---|
| Authentication drift | frequency plus key mismatch | compromised relay |
| Route poisoning | join expected and observed routes | injected waypoint |
| Traffic analysis | group bursts by time and sender | command node |
| Supply fraud | reconcile manifest, issue, and receipt | diversion point |
| Sensor spoofing | compare sources and time windows | false target stream |
| Cipher reuse | detect repeated nonce/key material | recoverable message set |
| Industrial sabotage | correlate failure codes and batches | contaminated lot |
| Payroll ghosting | join rosters, pay, and movement | fictitious formation |
| Fire-plan compromise | trace coordinate provenance | poisoned grid source |
| Courier network | construct an edge list and shortest chain | controlling handler |

Each spine specifies required facts, permitted transforms, verifier predicates,
minimum evidence, false-positive controls, disclosure reward, and optional
mechanical action bindings.

### 2. Campaign bindings

The compiler binds only versioned campaign facts:

- current sector and theater;
- visible formations and institutions;
- current production lines and shortages;
- current Network and Domestic dockets;
- authored opportunity actors;
- disclosed uncertainty bands;
- prior player-visible decisions and resolved history.

The binding layer must never import unreached narrative records or the sealed
resolution branch.

### 3. Evidence realization

One semantic evidence graph may render as logs, CSV, JSON, manifests, routing
tables, key files, hexadecimal fragments, process snapshots, or intercepted
messages. The evidence graph owns the truth. Files are presentations of that
graph, so changing formatting cannot change the answer.

Decoys must be mechanically explainable. A decoy may satisfy one predicate but
not the full proof rule; it cannot exist merely to trick the player with
arbitrary noise.

### 4. Voice and coaching

Ava explains the procedure at four depths:

1. objective only;
2. concept and relevant files;
3. command skeleton with blanks;
4. complete reproducible procedure.

Hints should record disclosure depth for retrospective/certification purposes
but must not reduce campaign strength. The game teaches rather than punishes
someone for learning Unix vocabulary.

## Command surface

### Stable workbench verbs

- `hack list` — visible, eligible incidents only
- `hack start [ID]` — mount one persisted evidence workspace
- `hack status` — objective, progress, hint depth, submissions
- `hack hint` / `hack coach` — advance deterministic coaching
- `hack submit <claim>` — validate a typed claim against the evidence graph
- `hack explain` — after solution, show why the proof converges
- `hack abort` — close presentation state without erasing evidence or history
- `hack prepare <effect>` — future only; create a Nexus proposal
- `confirm <token>` — future mechanical execution through existing authority

### Safe universal tools

The useful expansion set is grouped by what the player can do with it:

- inspect: `cat`, `less`, `head`, `tail`, `nl`, `file`, `stat`, `tree`,
  `find`;
- select: `grep`, bounded `sed`, bounded `awk`, `cut`, `csvcut`, `jq`;
- normalize: `sort`, `uniq`, `tr`, `column`, `csvlook`;
- compare: `diff`, future `comm`, future `join`, future `paste`;
- measure: `wc`, `csvstat`, `sha256sum`;
- decode: future bounded `base64`, `xxd`, `strings` over virtual artifacts;
- inspect systems: `ps`, `top`, `systemctl`, `crontab`, `ss`, `nmap` over
  declared targets only;
- preserve work: commander notes, report snapshots, proof receipts, and export
  bundles.

Explicitly excluded: redirects to arbitrary paths, command substitution,
shell chaining, arbitrary regular-expression execution, `eval`, executable
downloads, package code, host `ssh`, `curl`, `wget`, real DNS, port scanning,
SCP/SFTP, forwarding, device access, and unrestricted SQL.

## Mechanical integration

A solved evidence claim may eventually mint an `IntrusionProof` semantic
object containing:

- campaign ID, day, incident ID, schema/content versions;
- evidence graph digest and submitted claim;
- verifier predicates satisfied;
- public proof digest;
- disclosure scope and expiration;
- available follow-on actions.

The proof itself does not mutate state. It may make one or more declared
actions eligible:

- reveal an exact value for a bounded duration;
- narrow a forecast interval;
- add a response to the current Target of Opportunity;
- improve one declared Network action branch;
- prepare deception, disruption, or exploitation as an order-bearing action;
- preserve the access instead of spending it immediately.

Every follow-on must state its strategic-order cost, intelligence cost,
resource commitments, success branches, detection exposure, duration, and
opportunity cost. A free terminal bonus is prohibited.

## Lay-player presentation

The graphical workbench should show a two-pane evidence desk: files and
topology on the left, Ava transcript and command line on the right. Selecting
an Ava suggestion should fill, not automatically run, the command. Every
command response should explain its output the first time it appears.

The player may toggle annotations:

- `grep` highlights why lines survived;
- `cut` labels the selected field;
- `sort` shows grouping;
- `uniq -c` explains the count;
- `diff` identifies old and new records;
- a pipeline breadcrumb shows the record count after each stage.

This creates terminal literacy without requiring prior command-line knowledge.

## Content and non-repetition

The tutorial authentication incident is one foundation, not the production
content strategy. Before mechanical activation, the compiler needs enough
spines, evidence realizations, role vocabularies, node-name systems, and
campaign bindings that a campaign does not repeat an incident identity or
verbatim evidence set. Exhaustion is account-aware where appropriate.

Procedure repetition may be pedagogically intentional, but scenario,
evidence, culprit, consequence, and prose repetition are independently
tracked. A familiar command should solve a new military problem, not replay the
same puzzle with a recolored hostname.

## Internal implementation plan

1. Define `IntrusionIncident`, `EvidenceGraph`, `EvidenceArtifact`,
   `VerifierPredicate`, `IntrusionProof`, and `IntrusionActionBinding` schemas.
2. Compile at least eight mechanical spines and prove each generated instance
   has one or more valid evidence-backed solutions.
3. Persist incident identity and evidence digest in authoritative campaign
   state; persist commander notes and presentation history separately.
4. Add one player-visible projection used by browser, SSH, CLI, MCP, and future
   graphical workbench.
5. Add `prepare` and `confirm` adapters only after Nexus descriptors expose the
   exact mechanical consequence.
6. Add graphical parity before any proof grants a campaign advantage.
7. Add proof/certification records with hint depth, solution operations, and
   verifier version, without storing raw private prompts.

## Acceptance gates

- Same campaign, incident version, and seed compile the same evidence graph.
- Every generated incident has a verified solution; decoys cannot satisfy all
  proof predicates.
- A correct claim is accepted regardless of command history or solution path.
- A guessed claim may succeed only if it is correct; the report explains the
  missing evidentiary process but does not invent command use.
- Wrong claims never change GameState or consume an order.
- Hints never reveal unreached content or hidden resolution branches.
- No input can escape the virtual filesystem or declared target registry.
- Web and SSH return the same files, verifier result, proof digest, and Nexus
  proposal for the same state.
- Graphical and terminal players can reach the same mechanical action.
- Confirm replay is idempotent and stale proofs fail closed.
- Campaign and account no-repeat ledgers prevent incident identity reuse under
  the declared exhaustion policy.

## Activation sequence

1. Promote the informational tutorial and verify it in production.
2. Build the typed evidence compiler and content audit without mechanical
   effects.
3. Add the graphical evidence desk and parity tests.
4. Enable one low-impact information-only `IntrusionProof` in a sandbox.
5. Add one costed Nexus action behind explicit preparation and confirmation.
6. Run balance, abuse, replay, hidden-state, and cross-surface acceptance.
7. Activate mechanical incidents gradually with versioned rollback.

## Rollback

Disable mechanical action bindings while retaining solved proof records and
read-only workspaces. A rollback must never erase commander notes, reports, or
proof receipts. Incidents opened under a retired version remain inspectable but
cannot mint new proposals.

## Completion condition

This epoch becomes `ACTIVE` only when a non-repeating compiled incident can be
solved through both terminal and graphical evidence surfaces, mint the same
proof, prepare the same declared Nexus action, confirm it idempotently, and
pass production live acceptance without any host or network capability.

## History

- 2026-08-01: Parked the mechanical diegetic-hacking expansion. The first
  coached signals incident remains informational and does not authorize a
  campaign mutation.
- 2026-08-01: Corrected the implementation boundary. The existing tutorial
  content and compiler moved into `packages/intrusion-library`; Ava grammar now
  owns syntax only and the recovery ledger owns historical receipts only. This
  does not activate additional families or mechanical campaign effects.
