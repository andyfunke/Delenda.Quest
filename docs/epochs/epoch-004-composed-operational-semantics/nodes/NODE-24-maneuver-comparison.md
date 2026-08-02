# NODE-24 — Compile typed Ava maneuver comparisons

Status: implementation complete; immutable receipt follows the implementation commit.

Implementation commit: `17dac16`

Contract:

- Pairwise comparison binds two stable `maneuver:<id>` identities from the current visible docket.
- Dimensions are bounded and typed: execution confidence, commitment, casualty factor, supply burden, success pressure, failure pressure, and disclosed projected ground movement.
- Every dimension carries one of `COMPARABLE`, `NOT_COMPARABLE`, `UNAVAILABLE`, or `AMBIGUOUS`; missing projections become structured limitations.
- Verdicts describe evidence shape (`TRADEOFF`, `BALANCED`, `INSUFFICIENT_EVIDENCE`, or `NOT_COMPARABLE`) and never select or issue a winner.
- The current game chance authority and read-only action/envelope projection are reused; no hidden resolution ticket or private outcome is copied.

Acceptance evidence:

- current `M1`/`M2` requests resolve to stable maneuver identities rather than handles in the semantic result;
- reversing a direct typed query reverses the identity/value sides while preserving dimension order;
- the projection is digest-sealed and leaves `GameState` unchanged;
- unavailable or absent identities remain explicit and fail closed.

Next handoff: NODE-25 / project only compiler-owned operational relationships.
