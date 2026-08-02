# NODE-27 — Prove composed advice and operational comparison coverage

Status: complete; implementation, final gates, and immutable receipt sealed

Implementation commit: `51863f0`

Compatibility correction commit: `33b30d4`

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

Execution result:

- The generated corpus covers every canonical concept relation, every current
  maneuver pair, every advice alias and guarded neighbor, and the declared
  relationship bound. It passes with 245/245 substrate tests.
- The final full gate passes rendered/plumbing 30/30, rule suites
  40+11+6+1+8+6+5, Ava 32/32, and substrate 245/245.
- Typecheck, production build, native SSH build, Wrangler types check, and
  Cloudflare dry-run pass. Lint passes with 0 errors and 23 pre-existing
  warnings. `git diff --check` passes.
- The final compatibility repair binds cognitive operational projection to the
  disclosed state and excludes generic grammar defaults from authored-evidence
  IDs unless an exact contextual catalog route supplied them. Typed and text
  forecast requests therefore retain one semantic digest, and the activation
  golden contract records the new canonical rendered text digests.
- The source manifest is verified with `sha256sum -c`; the final worktree is
  clean and the remote ref remains unchanged.

Release boundary: no GitHub push, Cloudflare deployment, D1 write, shadow mutation, secret movement, HTTP SSH path, or destructive Git recovery.
