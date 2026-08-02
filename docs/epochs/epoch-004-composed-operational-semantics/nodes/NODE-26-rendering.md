# NODE-26 — Render composed Ava operational semantics

Status: implementation complete; immutable receipt follows the implementation commit.

Implementation commit: `d021d9b`

Contract:

- One renderer consumes `AvaOperationalSemanticResult`; surface adapters do not reconstruct semantics from `GameState`.
- Advice, forecast, comparison, and relationship sections use stable headings, typed values, explicit limitations, provenance-owned digests, and read-only boundaries.
- The renderer never prints a winner for pairwise maneuver comparison, a sealed outcome, a mutation instruction, or hidden/private state.
- Browser/Nexus, terminal-core, and native SSH receive the same semantic text and model through the existing direct Nexus path.

Acceptance evidence:

- every composed semantic operation has a visible section and semantic receipt;
- all three surfaces preserve the same semantic digest and rendered text;
- ordinary legacy commands retain their existing text and proof behavior when no operational model is present;
- renderer output is derived only from the typed semantic model.

Next handoff: NODE-27 / generated corpus, doctrine/feature records, full gates, manifest, and epoch seal.
