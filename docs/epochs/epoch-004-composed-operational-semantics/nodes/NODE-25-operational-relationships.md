# NODE-25 — Project typed Ava operational relationships

Status: implementation complete; immutable receipt follows the implementation commit.

Implementation commit: `6275e2d`

Contract:

- Concept edges are emitted only from `CONCEPTS[source].related[]`, preserving direction and source order.
- Current maneuver edges are emitted only from `currentSituation.maneuvers[]` through the stable `campaign-synopsis` source.
- Every edge carries a stable join key, provenance, current visible revision, and `readOnly: true`.
- Unknown relation targets, stale identities, entity bounds, and relationship bounds produce explicit unavailable evidence; no silent truncation or prose inference is allowed.
- The relation projection is attached to read-only `EXPLAIN` semantic results and shares the same state/content authority as the other operational projections.

Acceptance evidence:

- `formation` exposes its declared concept relationships with `SOURCE_TO_TARGET` direction;
- `campaign-synopsis` exposes both declared concept relationships and the exact current maneuver docket joins;
- relation digests are deterministic and state remains unchanged;
- over-bound requests fail closed with a structured limitation.

Next handoff: NODE-26 / render all composed semantic sections from one model.
