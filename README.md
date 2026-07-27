# DELENDA.QUEST

A full-stack campaign game compiled by
[Vinext](https://github.com/cloudflare/vinext) for Cloudflare Workers, with D1
and Drizzle persistence.

## Prerequisites

- Node.js `>=22.13.0`
- Linux with `flock`, `curl`, and GNU `timeout`

## Deployment

GitHub repository `andyfunke/Delenda.Quest` is the source of truth. A push to
`main` triggers Cloudflare Workers Builds, which runs `npm run build` and
`npx wrangler deploy`.

Production configuration is in `wrangler.jsonc`. The Worker serves only
`https://delenda.quest`; `workers.dev` and preview URLs are disabled. The `DB`
binding points to the production D1 database named `delenda-quest`.

`install:ci` is intentionally a single, non-retrying `npm ci`. It refuses a concurrent install for the same project, consumes a matching image-seeded npm cache with `--prefer-offline` while retaining registry fallback for a missing cache object, otherwise downloads and verifies the complete vinext tarball recorded in `package-lock.json`, limits npm to one socket, and terminates a stalled install. `build` applies a short timeout and then validates the Worker artifact. These helpers target Linux and use GNU `timeout`; they are not native macOS scripts.

Scripts that need writable project-scoped home, npm, XDG, and temporary paths use `scripts/sites-env.sh`. The `dev` and `start` scripts honor the caller's runtime environment and keep Wrangler logs inside the checkout. The generated `.sites-runtime/` directory is disposable and ignored by Git.

## Included Shape

- edit site code under `app/`
- `app/chatgpt-auth.ts` supports dispatch-owned ChatGPT identity and verified
  Cloudflare Access JWTs without weakening either path
- `wrangler.jsonc` declares the production Worker, custom domain, and bindings
- `vite.config.ts` loads the same Wrangler configuration for local development
- `db/index.ts` reads the D1 binding from the Cloudflare Worker environment
- `db/schema.ts` contains the player, campaign, social, telemetry, and support
  ledgers
- `app/api/admin/replication/route.ts` exposes a disabled-by-default,
  secret-gated read-only snapshot surface
- `drizzle.config.ts` supports local migration generation when needed

## Authentication

Production uses Cloudflare Access. The auth module verifies the
`Cf-Access-Jwt-Assertion` signature against Cloudflare's rotating JWK set, plus
the configured issuer and audience, before accepting the email claim. Required
Access values belong in Cloudflare, never in source.

## Diagnostic Commands

- `npm run install:ci`: perform the one bounded lockfile install
- `npm run dev`: start the Vite/Vinext development server
- `npm run build`: build and validate the deployable Worker artifact
- `npm run start`: start the built Vinext application
- `npm test`: build, validate, and verify the rendered development-preview metadata
- `npm run validate:artifact`: recheck an existing artifact's manifest and ESM `default.fetch` export
- `npm run db:generate`: generate Drizzle migrations after schema changes
- `npm run cloudflare:types`: regenerate Worker binding types from the production config
- `npm run cloudflare:validate`: typecheck, build, verify generated types, and perform a strict Wrangler dry run

Use build and validation commands for targeted diagnosis after a remote failure, not as part of the normal checkpoint path.

The timeout defaults can be overridden for a controlled canary with `SITES_INSTALL_TIMEOUT`, `SITES_INSTALL_KILL_AFTER`, `SITES_BUILD_TIMEOUT`, and `SITES_BUILD_KILL_AFTER`. A timeout fails the command; the helpers never retry an unchanged install or build.

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
