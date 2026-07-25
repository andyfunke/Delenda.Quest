# DELENDA.QUEST agent contract

## Hosting topology

- The existing ChatGPT Sites deployment and its D1 database are the retained
  production copy.
- `delenda-quest-shadow` is a separate Cloudflare Worker and a separate D1
  database. It is a duplicate and validation target, not a replacement.
- Never delete, overwrite, detach, or repoint the Sites deployment, its custom
  domain, or its database while working on the shadow.
- Never attach `delenda.quest` to the shadow without a verified source/target
  snapshot match and explicit cutover approval.

## Cloudflare agent connections

Use all five official Cloudflare MCP servers:

- `https://mcp.cloudflare.com/mcp`
- `https://docs.mcp.cloudflare.com/mcp`
- `https://bindings.mcp.cloudflare.com/mcp`
- `https://builds.mcp.cloudflare.com/mcp`
- `https://observability.mcp.cloudflare.com/mcp`

Project configurations for Cursor and VS Code are checked in. Codex and other
agents should follow `docs/cloudflare-duplication.md`.

## Validation

Run:

```bash
npm run cloudflare:types
npm run cloudflare:validate
```

The shadow config is `cloudflare/wrangler.jsonc`. Wrangler-generated binding
types live in `worker-configuration.d.ts`.

## Data safety

- Source export is read-only through `/api/admin/replication`.
- The route is disabled unless `DELENDA_REPLICATION_TOKEN` exists and accepts
  only a constant-time-checked bearer token.
- Generated import SQL is guarded to the literal target name
  `delenda-quest-shadow`.
- Snapshot maintenance mode blocks stateful player routes while leaving the
  landing page, public records, and replication export available.
- A cutover is blocked unless every table count and SHA-256 snapshot hash
  matches.
