# Ava V1 command substrate

Ava V1 is a deterministic compiler, not a chatbot and not a simulated language model. Player language is normalized and compiled into a typed instruction that must pass the same authoritative state checks as the visible interface.

## Pipeline

1. Normalize case, punctuation, apostrophes, and whitespace.
2. Classify a bounded command intent.
3. Resolve typed entities from the live ontology: module, metric, authorized maneuver, or directive.
4. Emit an `AvaInstruction` intermediate representation.
5. Validate targets, authorization, current state, selection, and mutation preconditions.
6. Execute, stage, navigate, or fail closed.
7. Render a diegetic response from authoritative game calculations.

The stable intermediate representation is the contract for any future LLM. A future model may translate a sentence into the same object, but it cannot mutate game state, invent a target, bypass validation, or calculate a result.

## V1 instructions

`HELP`, `STATUS`, `REPORT`, `EXPLAIN`, `OPEN`, `SELECT`, `FORECAST`, `COMPARE`, `CLEAR`, `COMMIT`, and `RESOLVE_DAY` are the canonical instruction kinds. The in-game Command Manual is generated from the same help catalog used by the compiler schema.

Read commands may accept broad aliases. Commands that mutate state fail closed. The base failure response is: `Command not executed. Please clarify orders.` When the compiler knows the failure class, Ava appends the narrowest useful target or interpretation list.

## Telemetry boundary

Ava records only compiled intent, execution/clarification/rejection outcome, failure class, matched grammar rule, current module, token count, and unresolved-token count. Raw player commands are displayed in the current browser session but are not transmitted or stored by telemetry.

The compiler exports a versioned instruction schema and a pure compilation function. Regression examples cover natural aliases, ambiguity, missing targets, comparisons, and fail-closed mutations.

## Sealed filesystem and completion

The command input is both Ava's programmatically enhanced command-recognition channel and a sealed shell.
Tab completion draws from the compiled utterance corpus, shell commands,
accessible directories, and live virtual files. Full paths, filenames, and
unique extensionless stems resolve to the same file. Text files open inline;
workbook files download as genuine Excel packages.

Dark Net is an unlockable read-only mount at `/darknet`. Its campaign archive
contains the complete authored registry rather than only the current docket:
50 Main situation records, 288 Domestic/Network scene variants, and 100 targets
of opportunity. The state-bound daily docket remains separately available as
`/darknet/campaign/current.txt`. Once mounted, ordinary `ls`, `cd`, `cat`,
`open`, `find`, and literal `grep` operate over the archive. A one-argument
`grep` inside Dark Net defaults to a recursive search of the current directory.
Reading quotation content through `cat`, `open`, direct Tor access, or matching
content with `grep` records the same account-persistent view event as a
quotation encountered in the ordinary interface.

## Pipeable command data

The current report mount includes human-readable reports, workbooks, an
interoperability bundle, and bounded CSV projections:

- `reports/current/action-docket.csv`
- `reports/current/production-data.csv`
- `reports/current/campaign-metrics.csv`
- `reports/current/resolution-history.csv`

`cat` and `grep` can therefore operate on actual live report data. The
declared filters also include `awk`, `sed`, `tr`, `nl`, `sha256sum`,
`csvlook`, `csvcut`, and `csvstat`. Each consumes an in-memory text stream;
none invokes a host binary.

## Coached signals workbench

The canonical incident subsystem is the internal
`packages/intrusion-library` package. It owns the typed family catalogue,
authored vocabulary, deterministic evidence compiler, verifier predicates,
coaching ladder, disclosure report, and content versions. Ava's grammar owns
only the stable command protocol, and `app/ava/hacking.ts` binds one compiled
incident to campaign-visible facts and the sealed shell session.

`hack start` opens a campaign-bound signals incident at
`~/home/signals/current`. Ava teaches the player to identify a compromised
relay by correlating authentication failures and a substituted key with
ordinary commands. `hack hint` progresses from concept, to command shape, to
the complete procedure. A correct `hack submit NODE` unlocks an immutable
one-time intelligence snapshot and SHA-256 receipt inside the virtual mount.

The workbench is informational in this epoch. It cannot spend an order,
change a resource, alter success probability, open a socket, accept an IP or
domain, or touch the host. A later mechanical intrusion system must enter the
Nexus as a typed, costed, confirmed action and achieve graphical parity before
it can change campaign state.
