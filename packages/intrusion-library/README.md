# Intrusion Library

This package is the canonical home for Delenda Quest's authored intrusion
families and their deterministic evidence compiler.

It is deliberately not part of Ava's natural-language grammar. Ava owns the
command protocol (`hack start`, `hack hint`, `hack submit`). This package owns
what an incident is: its mechanical spine, authored vocabulary, evidence
realization, verifier, coaching ladder, disclosure boundary, and content
version.

## Ownership

| Layer | Canonical owner |
|---|---|
| Shell syntax and command validation | `app/ava/grammar.ts` |
| Ava session, virtual mount, and response rendering | `app/ava/hacking.ts` |
| Incident schemas and compiled semantic objects | `src/schema.ts` |
| Pure deterministic evidence compilation | `src/compiler.ts` |
| Authored incident families and vocabulary | `src/catalog/` |
| Future campaign-changing effects | Nexus action descriptors, currently parked in `docs/parking-lot/PL-HACK-001-diegetic-intrusion.md` |
| Historical implementation receipts | `docs/ava-cognitive-runtime-recovery.md` |

## Package boundary

The library receives an explicit, player-safe campaign binding. It cannot read
`GameState`, Ava session state, a browser, the virtual filesystem, a host
filesystem, or the network. Hashing primitives are injected so the compiler
remains runtime-neutral and does not import the application.

Compilation produces a typed `CompiledIntrusionIncident` containing:

- stable family, schema, and content versions;
- a day-bound incident identity;
- virtual evidence artifacts;
- a declared simulated scan target;
- verifier predicates and accepted claims;
- progressive coaching;
- a bounded disclosure report;
- a reproducible proof receipt.

Presentation adapters may render that object. They may not reconstruct puzzle
truth from prose or create a second verifier.

## Adding content

New authored content belongs in `src/catalog/`. A family definition must pass
`validateIntrusionCatalog`, compile deterministically, and prove at least one
evidence-backed solution before Ava or another surface may expose it.

An incident family is content plus finite rules, not a freeform story prompt.
Mechanical spines are reusable; vocabulary and realization templates are
independently versioned so non-repetition can be audited without confusing copy
with campaign law.
