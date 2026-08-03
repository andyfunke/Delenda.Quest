# NODE-00 — preflight and authority seal

Status: planned; no implementation commit

## Inputs

```text
repository checkout
AGENTS.md
SUBSTRATE_DOCTRINE.md
docs/parking-lot/README.md
docs/parking-lot/PL-AVA-001-content-quality-decompiler.md
current git commit and status
```

## Procedure

```bash
git status --short --branch
git rev-parse HEAD
sed -n '1,260p' AGENTS.md
sed -n '1,260p' SUBSTRATE_DOCTRINE.md
```

Record `baseCommit`, `branch`, `dirtyFiles`, `authoritySources`, `excludedFiles`,
`existingFalsificationCommands`, and `releaseBoundary` in the receipt. If an
existing change overlaps Ava, tests, or content files without ownership, stop.

## Stop conditions

- unknown base commit;
- doctrine unavailable;
- overlapping unowned changes;
- request for runtime or production behavior in this offline node.
