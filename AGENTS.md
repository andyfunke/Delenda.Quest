# DELENDA.QUEST agent contract

## Hosting topology

- GitHub repository `andyfunke/Delenda.Quest` is the only source of truth.
- Cloudflare Workers Builds deploys `main` using `npm run build` followed by
  `npx wrangler deploy`.
- `wrangler.jsonc` is the production configuration. It publishes only the
  `delenda.quest` custom domain; `workers.dev` and preview URLs stay disabled.
- Production persistence is the D1 database named `delenda-quest`.
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
