# Ava cognitive Nexus

The production Ava runtime has one coordinator: `app/ava/nexus.ts`. The
cognitive pipeline in `app/ava/cognitive-nexus.ts` is an internal engine bay of
that coordinator, not a second Ava, parser, state machine, or mutation path.

## Request and result flow

1. Web, Terminal, or SSH submits text or typed request IR to the Ava Nexus.
2. The existing grammar compiler resolves one complete semantic query against
   the current visible ontology.
3. The cognitive Nexus projects an Ava-visible world snapshot and compiles the
   semantic query into a typed cognitive program.
4. The closed adapter registry executes the selected engine graph.
5. A realization operator seals the exact upstream result used by the response.
6. The response proof is explicitly bound to the cognitive execution digest,
   then both proofs compose into one sealed graph.
7. Nexus returns one response envelope and retains sole prepare, confirm,
   cancel, idempotency, audit, and mutation authority.

The engine pipeline is read-only or plan-only. It never writes `GameState` and
never persists campaign state.

## Active production routes

| Production request | Cognitive graph | Answer authority |
|---|---|---|
| Main/Domestic/Network advice, recommendation, ranking, and overall/front comparison | Decision, including feasibility replay, then realization | Robust projected-action ranking and winner |
| Production/Military/Diplomacy directive advice or ranking | Closed 10-component directive model, hard legality, decision, then realization | Exact visible channel/actor docket ranking; the legacy service no longer selects the winner |
| Forecast action, standing posture, or staged plan | Temporal forecast envelope, then realization | Sealed disclosed projection with `UNBOUND` outcome semantics |
| Check one action's viability or preconditions | Constraint replay, then realization | One of the eight typed feasibility outcomes with responsible facts and repairs |
| Diagnose readiness or front causes | Causal replay, then realization | Observational candidates only; no intervention means no causal identification claim |
| Estimate or bound evidence for readiness, intelligence, legitimacy, or equipment | Epistemic replay, then realization | Explicit one-record evidence estimate/bound, never fabricated corroboration |
| Show or issue a nonempty staged plan | Planning, including feasibility, dependency scheduling, cumulative reservations, and realization | Exact action IDs and world revision under `PLAN_ONLY_NO_MUTATION` |
| Prepare or execute a typed action or plan | Exact planning replay before proposal or mutation | Plan validation only; Ava Nexus retains all execution authority |
| Explain, justify, correct, or challenge | Typed semantic binding, then realization | Compiler-resolved semantic request and deterministic renderer |
| Status, help, report, list, and other ordinary reads | Typed relational binding | Existing authoritative read service or renderer |
| Confirm, cancel, clear, or resolve | No cognitive authority | Ava Nexus mutation boundary only |

Constraint execution is active inside decision and planning. Temporal
scheduling is active inside planning as well as the direct forecast route.
Causal and epistemic routes are deliberately narrow: the former reports only
compiled observational candidates for the domain's current readiness and front
equations unless an intervention is available, and the latter labels its
current single-record evidence scope. Registry presence alone is never reported
as production activation.

## Trust boundaries

- World identity contains only disclosed projection inputs. Hidden adversary
  actuality, private resolution tickets, invisible operational facts, and raw
  campaign state seals cannot affect public proof identity.
- Decision projection facts belong to exactly one candidate and retain both
  their base-metric and disclosed-context lineage.
- Directive decisions compile the authored integer evaluation vector into ten
  bounded metrics. Range-proportional weights preserve its exact ordering,
  while a zero-weight hard legality objective prevents an unavailable order
  from becoming a recommendation. The compiled channel, diplomacy actor,
  posture, and exact visible docket are digest-bound to the decision scenario.
- Forecast prose is rendered from the digest-sealed projection artifact bound
  into the temporal assumptions.
- Planning guidance must reproduce the exact actions, action IDs, and current
  visible world revision, retain `PLAN_ONLY_NO_MUTATION` authority, and return
  `PLANNED` before Nexus may create a confirmation or execute a new typed
  request. Confirmation, idempotent replay, audit, and execution remain
  Nexus-only concerns.
- Realization must validate the exact upstream datum, world revision, semantic
  tree, authority, and digest before a response can use it.
- Every response proof must satisfy an explicit cognitive-execution binding
  obligation before it can compose with the engine proof.
- Public activation receipts contain only runtime, status, authority, engine
  families, and domain identity. They omit campaign, semantic, execution, and
  proof identifiers.

## Surface attestation

Web and Terminal-core paths expose the same safe activation receipt and proof
identity for a fixed authenticated probe. The production OpenSSH gateway calls
the canonical Nexus directly. Its internal structured cognitive evidence retains
only the closed activation receipt and composed proof digest. This object is
validated inside the gateway and is not emitted as JSON or metadata to an SSH
client; interactive and one-shot SSH sessions render only the canonical Ava
response text. The gateway keeps authoritative state internally for its existing
persistence path, but the internal attestation object never contains the proof
graph, world snapshot, campaign state, or raw failure text.

`/api/ava/activation?adapter=ssh` is a Terminal-core transport probe. It is not
a native SSH handshake attestation and must remain labeled `terminal-core`.
Internal SSH attestation construction and failure redaction are covered by the
gateway's in-process contract. Relevant `main` pushes run that substrate suite
and a containerized native SSH handshake before deploying the gateway, then
verify the live port 22 listener. The native handshake asserts canonical Ava
text, not transport of the internal attestation object. This HTTP probe does not
claim a live native handshake.
MCP remains a compile-time seam and is explicitly rejected by the production
attestation route because no public MCP server exists yet.

The live HTTP acceptance gate verifies this versioned contract and the exact
fixed result digests for all seven probes, including directive advice. It is compatibility evidence, not a
commit-SHA deployment attestation.
