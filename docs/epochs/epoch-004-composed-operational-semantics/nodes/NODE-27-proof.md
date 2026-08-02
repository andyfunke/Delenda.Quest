# NODE-27 — Prove composed advice and operational comparison coverage

Status: implementation complete; final gates and immutable receipt pending.

Implementation commit: pending

Proof scope:

- Generate relationship assertions from every canonical `CONCEPTS.related[]` owner.
- Generate pairwise comparison assertions over every distinct pair in the current visible maneuver docket, including stable identity, seven dimension IDs, no-winner, no-hidden-field, and no-mutation checks.
- Generate advice alias and guarded-neighbor checks.
- Exercise declared entity and relationship bounds as structured fail-closed paths.
- Preserve browser/Nexus, terminal-core, and native SSH parity from NODE-26.

Final gate plan:

1. Focused operational and generated corpus.
2. Full `npm test` and substrate corpus.
3. Typecheck, production build, native SSH build, Cloudflare types/check/dry-run, lint, and `git diff --check`.
4. SHA-256 source manifest verification and clean-worktree/commit-chain read-back.

Release boundary: no GitHub push, Cloudflare deployment, D1 write, shadow mutation, secret movement, HTTP SSH path, or destructive Git recovery.
