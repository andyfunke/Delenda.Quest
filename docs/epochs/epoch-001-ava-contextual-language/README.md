# Epoch 001 — Ava contextual language

This folder is the bounded implementation manifest for the attached Ava
contextual-language handoff. It is intentionally split into contracts,
catalog, projection, matching, rendering, tests, and receipts so no single
file becomes the implementation authority.

## Hierarchy

```text
epoch-001-ava-contextual-language/
├── README.md
├── preflight.md
├── nodes/       one demarcated execution record per handoff node
├── receipts/    focused command/result receipts
└── integrity/   generated SHA-256 source manifest at seal
```

## Porting decision

The handoff's base commit and proposed priorities package are not in the live
repository. This epoch therefore ports the behavior onto current `main` at the
base recorded in `feature.md`. The existing OG Ava compiler, typed request IR,
Nexus, disclosed projection, campaign substrate, and native terminal adapters
remain authoritative.

## Module ownership

- `contextual-language.ts`: closed contracts, normalization, validation, digest.
- `contextual-language-catalog.ts`: finite static aliases and route ownership.
- `contextual-language-priorities.ts`: deterministic StrategicDimension lowering.
- `contextual-language-projection.ts`: visible situation and revision projection.
- `contextual-language-references.ts`: exact visible authored evidence indexing.
- `contextual-language-compiler.ts`: exact/longest match and typed lowering.
- `compiler.ts`, `nexus.ts`, `terminal.ts`: integration into existing authority.
- `tests/ava-contextual-language.test.mjs`: cross-surface proof of the seam.

## Seal criteria

The epoch is sealed only when typecheck, build, full tests, SSH build, Cloudflare
local validation/dry run, lint, diff checks, and the SHA-256 manifest pass. The
epoch does not deploy or push. The final commit/tree and manifest digest are
reported in the root logbook and handoff summary.
