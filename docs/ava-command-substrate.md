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
