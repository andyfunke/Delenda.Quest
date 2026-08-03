# NODE-11 — epoch proof and seal

Status: planned; depends on NODE-00 through NODE-08

## Procedure

1. Confirm all deterministic node receipts exist.
2. Run focused Ava tests.
3. Run existing falsification and substrate suites.
4. Run deterministic content pipeline twice.
5. Run `git diff --check`.
6. Generate SHA-256 source manifest for epoch-owned files.
7. Record base/implementation commits, tree identity, test outputs, report
   hash, and source-manifest hash.
8. Mark deterministic work complete only if every invariant passes.
9. Keep NODE-09 and NODE-10 parked unless separately activated.

Sealing does not authorize GitHub push, Cloudflare deployment, D1 writes,
production promotion, or model/provider activation.
