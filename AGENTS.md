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

## Cursor Cloud specific instructions

Standard commands live in `README.md` ("Diagnostic Commands") and `package.json`
scripts. Dependencies are installed on VM startup via `npm run install:ci`.
Node `>=22.13.0` is required and already present. The notes below are the
non-obvious local-dev caveats.

### Running the app locally

- `npm run dev` starts Vite/Vinext (default port `5173`) and runs the Worker in a
  local Miniflare runtime with an auto-provisioned local D1 (SQLite under
  `.wrangler/state/`). No separate database process is needed. This is a
  long-running process; start it in the background/tmux, not inline.
- Lint/typecheck/build/test: `npm run lint`, `npm run typecheck`,
  `npm run build`, `npm test`. `npm test` runs `build` first. `npm run lint`
  currently reports only warnings (no errors).

### Local D1 starts empty — apply migrations before stateful routes work

The local dev binding config in `vite.config.ts` does NOT declare a
`migrations_dir`, so migrations are never auto-applied locally. Stateful routes
(`/api/account`, `/api/turn`, `/api/campaign*`, `/game`, etc.) throw
`no such table: users` until you apply the Drizzle migrations to the same local
D1 the dev server uses (binding `DB`, database_name `site-creator-d1`,
database_id `00000000-0000-4000-8000-000000000000`). `.wrangler/state/` is
disposable/gitignored, so this must be redone on every fresh VM:

```bash
cat > /tmp/wrangler-local.jsonc <<'JSON'
{
  "name": "delenda-local",
  "main": "worker/index.ts",
  "compatibility_date": "2026-07-25",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [
    { "binding": "DB", "database_name": "site-creator-d1",
      "database_id": "00000000-0000-4000-8000-000000000000",
      "migrations_dir": "/workspace/drizzle" }
  ]
}
JSON
bash scripts/sites-env.sh -- npx wrangler d1 migrations apply DB --local \
  --persist-to "$PWD/.wrangler/state" --config /tmp/wrangler-local.jsonc
```

The dev server picks up the new tables live (no restart needed).

### Auth is dispatch-owned and absent locally

Production identity comes from the ChatGPT Sites dispatch layer, which injects
`oai-authenticated-user-email`. That layer is NOT present locally, so `/game`
redirects to the dispatch-owned `/signin-with-chatgpt` path (which 404s
locally). To exercise authenticated routes locally:

- API/terminal testing: send the header and a valid IANA time-zone bootstrap
  cookie (`delenda_time_zone`), e.g.
  `curl -H 'oai-authenticated-user-email: pilot@delenda.quest' -b 'delenda_time_zone=America/New_York' http://localhost:5173/api/account`.
  Account creation fails with "requires a valid browser time zone" without that
  cookie.
- Browser/GUI testing: put a tiny reverse proxy in front of `:5173` that injects
  `oai-authenticated-user-email`, then point the browser at the proxy. The game
  auto-creates an account (and a starter campaign) on first authenticated load.

### Turn gate and demos

The campaign allows one turn resolution per account-day. To take multiple turns
in a session (e.g. for demos/tests), enable god mode:
`PATCH /api/turn` with body `{"godMode":true}`. A dev-only React hydration
overlay can appear on first `/game` load (time-based rendering); it is a dev
artifact — dismiss it.
