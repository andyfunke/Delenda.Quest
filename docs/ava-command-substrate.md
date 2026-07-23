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

The command input is both Ava's natural-language channel and a sealed shell.
Tab completion draws from the compiled utterance corpus, shell commands,
accessible directories, and live virtual files. Full paths, filenames, and
unique extensionless stems resolve to the same file. Text files open inline;
workbook files download as genuine Excel packages.

Dark Net is an unlockable read-only mount at `/darknet`. Its campaign archive
contains the complete authored registry rather than only the current docket:
15 Main situation records, 288 Domestic/Network scene variants, and 100 targets
of opportunity. The state-bound daily docket remains separately available as
`/darknet/campaign/current.txt`. Once mounted, ordinary `ls`, `cd`, `cat`,
`open`, `find`, and literal `grep` operate over the archive. A one-argument
`grep` inside Dark Net defaults to a recursive search of the current directory.
Reading quotation content through `cat`, `open`, direct Tor access, or matching
content with `grep` records the same account-persistent view event as a
quotation encountered in the ordinary interface.
