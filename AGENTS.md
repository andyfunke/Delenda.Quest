# DELENDA.QUEST agent contract

## Substrate doctrine

Mandatory product law for shared I/O substrate, gate calculus, daily dockets,
Ava Classic, and client adapters lives in `SUBSTRATE_DOCTRINE.md`. Read it
before implementing game channels, parsers, LLM features, or new modalities.
Do not duplicate the doctrine here.

## Hosting topology

- GitHub repository `andyfunke/Delenda.Quest` is the only source of truth.
- Cloudflare Workers Builds deploys `main` using `npm run build` followed by
  `npx wrangler deploy`.
- `wrangler.jsonc` is the production configuration. It publishes the
  `delenda.quest` custom domain and production `workers.dev` URL; preview URLs
  stay disabled.
- Production persistence is the D1 database named `delenda-quest`.
- Public visitors receive private, opaque browser sessions through
  `/api/session`; do not reintroduce a hosting-provider identity dependency.
- Do not add Cloudflare Pages, OpenAI Sites, or another hosting control plane.

## Cloudflare agent connections

Use all five official Cloudflare MCP servers:

- `https://mcp.cloudflare.com/mcp`
- `https://docs.mcp.cloudflare.com/mcp`
- `https://bindings.mcp.cloudflare.com/mcp`
- `https://builds.mcp.cloudflare.com/mcp`
- `https://observability.mcp.cloudflare.com/mcp`

Project configurations for Cursor and VS Code are checked in.

## Validation

Run:

```bash
npm run cloudflare:types
npm run cloudflare:validate
```

The production config is `wrangler.jsonc`. Wrangler-generated binding types
live in `worker-configuration.d.ts`.

## Data safety

- Schema changes require a checked-in migration under `drizzle/`.
- Never replace the production D1 UUID with a placeholder.
- Keep secrets in Cloudflare, never in Git.

## Planning memory

Future and externally blocked plans live in `docs/parking-lot/README.md` and its
append-only epoch files. Read the master index and every overlapping epoch
before proposing or activating deferred work. A `PARKED` plan is durable memory,
not authorization to create accounts, change DNS, add secrets, contact users,
send mail, or deploy. Append dated amendments; never silently overwrite an
earlier epoch decision.

## Intrusion content boundary

Authored hacking incidents and their deterministic evidence compiler live in
`packages/intrusion-library`. Ava grammar owns only the stable command surface;
`app/ava/hacking.ts` is only a campaign-binding, session, and presentation
adapter. Never append incident catalogues, evidence generators, verifier truth,
or coaching libraries to an Ava recovery ledger or natural-language grammar
file. `docs/ava-cognitive-runtime-recovery.md` records historical receipts;
`docs/parking-lot/PL-HACK-001-diegetic-intrusion.md` retains only future work
that has not been authorized.
