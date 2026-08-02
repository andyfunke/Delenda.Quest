### AVA-LANGUAGE-N18 / Render expanded Ava operational evidence

Base commit: `2251e34`

Completed commit: `2bec345`

Purpose: Render typed operational concepts and authored maneuver references
without paraphrase, hidden-state leakage, or action affordances.

Exact procedures executed:

- Added truthful `NOT PRESENT IN THE CURRENT DISCLOSED STATE` output for
  owner-confirmed concepts that have no registered scalar.
- Added the existing semantic-category `MANEUVER REFERENCE` presentation with
  exact matched phrase, maneuver ID, owner label, evidence kind, source
  section, exact excerpt, provenance, and `AUTHORED LANGUAGE` status.
- Kept `BRIEFING REFERENCE` for non-maneuver authored prose and preserved the
  existing typed grammar follow-ups.

Changed files: `app/ava/terminal.ts`.

New semantic contracts: maneuver evidence is rendered as a read-only authored
reference, never as an action button or future outcome; unavailable typed
operational values are explicit rather than inferred.

Tests added: exact rendered evidence, status, hidden-field exclusion, and
web/terminal/native-SSH presentation parity are in the epoch corpus.

Validation results: `npm run typecheck` PASS; `bash scripts/test-substrate.sh`
PASS (231/231); `git diff --check` PASS.

Non-goals preserved: no new semantic category, no paraphrase, no hidden
maneuver status, no sealed outcome, no private calculus, no mutation, no
deployment, and no HTTP SSH path.

Known limitations: presentation output exposes only owner-confirmed disclosed
fields; it does not invent a separate presentation title absent from the
current substrate schema.

Next node handoff: prove web, terminal, and native SSH reach the same Nexus
semantics and proof identity for the expanded corpus.

