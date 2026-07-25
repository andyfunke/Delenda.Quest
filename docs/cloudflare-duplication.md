# Cloudflare duplication plan

This is a duplication project. The current ChatGPT Sites application, source
remote, custom domain, environment, and D1 database remain intact. The
Cloudflare target is deliberately named `delenda-quest-shadow`.

## What is already portable

- Next.js is compiled by Vinext to a Cloudflare Worker entry point.
- Static assets use a Workers Assets binding.
- Image optimization uses a Cloudflare Images binding.
- All durable application state lives in the `DB` D1 binding.
- The complete D1 schema is versioned in `drizzle/`.
- The Worker has structured Cloudflare logs and traces enabled.
- Authentication accepts the existing ChatGPT identity headers or a
  cryptographically verified Cloudflare Access application token.

## Hard safety rules

1. Do not change `delenda.quest` DNS during shadow construction.
2. Do not remove the Sites custom domain.
3. Do not delete or write to the Sites D1 database during transfer.
4. Use a distinct D1 database named `delenda-quest-shadow`.
5. Keep the shadow on `workers.dev` or `shadow.delenda.quest` until verification.
6. Block cutover if a table count or SHA-256 snapshot hash differs.
7. After cutover, retain Sites as a read-only standby until a separate decision
   explicitly retires it.

## Agent setup

Cloudflare's official agent prompt is:

`https://developers.cloudflare.com/agent-setup/prompt.md`

It specifies five MCP servers:

| Capability | URL |
| --- | --- |
| Account and API | `https://mcp.cloudflare.com/mcp` |
| Documentation | `https://docs.mcp.cloudflare.com/mcp` |
| Bindings | `https://bindings.mcp.cloudflare.com/mcp` |
| Builds | `https://builds.mcp.cloudflare.com/mcp` |
| Observability | `https://observability.mcp.cloudflare.com/mcp` |

Cursor and VS Code configurations are committed in `.cursor/mcp.json` and
`.vscode/mcp.json`. For Codex:

```bash
scripts/install-cloudflare-agent.sh
```

OAuth begins on the first protected server use. Restart the agent after
installation. An environment that mounts its global agent configuration
read-only cannot complete this installation from inside that session.

## Shadow provisioning

Authenticate Wrangler through OAuth or provide a scoped
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Set these four values in the
process environment without writing them to the repository:

```text
CF_ACCESS_TEAM_DOMAIN
CF_ACCESS_AUD
DELENDA_ADMIN_EMAILS
DELENDA_REPLICATION_TOKEN
```

`DELENDA_REPLICATION_TOKEN` must be a cryptographically random value and must
also be set as a secret on the Sites deployment for the export window.

Then run:

```bash
scripts/cloudflare-provision-shadow.sh \
  --confirm-create-shadow delenda-quest-shadow
```

The command:

1. verifies Cloudflare authentication;
2. reuses or creates only `delenda-quest-shadow`;
3. binds its UUID in `cloudflare/wrangler.jsonc`;
4. applies all D1 migrations;
5. stores the four values as Worker secrets;
6. builds and performs a strict Wrangler dry run;
7. deploys only the isolated shadow Worker.

It does not create a custom-domain route and cannot touch the Sites database.

## Cloudflare Access

Create a self-hosted Access application for the shadow Worker. During the soak
period, protect the entire Worker by name, including previews. Configure:

- a human `Allow` policy for players and administrators;
- the desired Access session duration;
- a `Service Auth` policy with distinct service tokens for non-human agents;
- `CF_ACCESS_TEAM_DOMAIN` as the exact `https://<team>.cloudflareaccess.com`
  origin;
- `CF_ACCESS_AUD` as the application's audience tag.

The app validates `Cf-Access-Jwt-Assertion` against the rotating JWK set,
issuer, audience, and verified email claim. A header without a valid signature
is not accepted. Human sessions remain active until Access expiry or an
explicit visit to `/cdn-cgi/access/logout`.

Before a public cutover, split Access protection by application path so the
splash page can remain public while `/game*`, `/account*`, `/admin*`, and
stateful `/api/*` routes remain protected.

## Read-only data duplication

The export endpoint is inert unless `DELENDA_REPLICATION_TOKEN` exists. It pages
through an allowlisted set of application tables and never executes a write.

Export the Sites source:

```bash
DELENDA_REPLICATION_TOKEN=... \
node scripts/cloudflare-snapshot.mjs export \
  --source https://delenda.quest \
  --output /secure/path/sites-source.json
```

Generate guarded target-reset SQL:

```bash
node scripts/cloudflare-snapshot.mjs sql \
  --snapshot /secure/path/sites-source.json \
  --output /secure/path/shadow-import.sql \
  --confirm-target-reset delenda-quest-shadow
```

Apply it only to the shadow:

```bash
scripts/cloudflare-import-shadow.sh \
  delenda-quest-shadow \
  /secure/path/shadow-import.sql
```

Export the shadow through its own replication endpoint, then compare:

```bash
DELENDA_REPLICATION_TOKEN=... \
CF_ACCESS_CLIENT_ID=... \
CF_ACCESS_CLIENT_SECRET=... \
node scripts/cloudflare-snapshot.mjs export \
  --source https://<shadow-worker-host> \
  --output /secure/path/cloudflare-shadow.json

node scripts/cloudflare-snapshot.mjs compare \
  --left /secure/path/sites-source.json \
  --right /secure/path/cloudflare-shadow.json
```

Snapshots are written with mode `0600`. They contain private account data and
must not be committed. `CF_ACCESS_CLIENT_ID` and
`CF_ACCESS_CLIENT_SECRET` are required only when the source hostname is behind
a Cloudflare Access Service Auth policy.

## Final consistency pass

The first copy is a rehearsal. For the final pass:

1. set `DELENDA_MAINTENANCE_MODE=snapshot` on Sites and redeploy the current
   version;
2. confirm player and API writes return `503`;
3. export Sites again;
4. reset and import only the shadow database;
5. export the shadow and compare all counts and hashes;
6. unblock the Cloudflare shadow;
7. attach `shadow.delenda.quest` and soak;
8. obtain explicit cutover approval before changing `delenda.quest`;
9. keep Sites in snapshot mode as the read-only standby.

This creates a clean recovery point and prevents split-brain writes.

## Source and builds duplication

The current Sites Git remote remains `origin`. Create a private mirror in a Git
provider supported by Cloudflare Workers Builds, add it as a second remote, and
push without replacing `origin`:

```bash
git remote add cloudflare-source <private-mirror-url>
git push cloudflare-source main
```

In Workers Builds, connect the private mirror and use:

- production branch: `main`;
- build command: `npm ci && npm run cloudflare:validate`;
- deploy command: `npx wrangler deploy --config cloudflare/wrangler.jsonc`;
- root directory: repository root;
- Node.js: `22.13.0` or newer.

Keep automatic custom-domain changes disabled. Builds may update the shadow,
but production routing remains a separate, approved operation.

## Rollback

- Before cutover: rollback means ignoring or deleting only the shadow. Sites
  never stopped serving production.
- After cutover: point the public route back to the retained Sites target and
  disable shadow writes.
- Worker code can roll back by deployment version. D1 state is not part of a
  Worker version, so restore/fork D1 using Time Travel or re-import a verified
  snapshot.

Relevant Cloudflare references:

- https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- https://developers.cloudflare.com/d1/best-practices/import-export-data/
- https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/
- https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/service-tokens/
- https://developers.cloudflare.com/agents/model-context-protocol/cloudflare/servers-for-cloudflare/
- https://developers.cloudflare.com/workers/versions-and-deployments/
