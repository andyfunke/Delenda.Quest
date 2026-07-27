import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const TABLES = [
  "users",
  "account_turn_state",
  "active_campaigns",
  "campaign_records",
  "friendships",
  "friend_invites",
  "campaign_packs",
  "telemetry_counters",
  "bug_reports",
  "campaign_outcomes",
  "account_rotation_ledger",
];

test("production deploys only the delenda.quest custom domain", async () => {
  const [config,workflow] = await Promise.all([
    readFile(new URL("../wrangler.jsonc", import.meta.url),"utf8").then(JSON.parse),
    readFile(new URL("../.github/workflows/cloudflare-shadow.yml", import.meta.url),"utf8"),
  ]);
  assert.equal(config.name, "delenda-quest");
  assert.equal(config.workers_dev, false);
  assert.equal(config.preview_urls, false);
  assert.deepEqual(config.routes, [{
    pattern: "delenda.quest",
    custom_domain: true,
    enabled: true,
    previews_enabled: false,
  }]);
  assert.equal(config.d1_databases[0].database_name, "delenda-quest");
  assert.equal(config.d1_databases[0].database_id, "a2d8a23e-f038-48a6-801a-46a30d58f1ba");
  assert.equal(config.d1_databases[0].binding, "DB");
  assert.equal(config.assets.binding, "ASSETS");
  assert.equal(config.images.binding, "IMAGES");
  assert.equal(config.observability.enabled, true);
  assert.equal(config.vars.DELENDA_AUTH_PROVIDER, "self-hosted");
  assert.match(workflow,/name: Production contract/);
  assert.match(workflow,/github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow,/live-production-acceptance/);
  assert.match(workflow,/Prove delenda\.quest serves the deployed contract/);
  assert.match(workflow,/npm run test:live/);
  assert.doesNotMatch(
    workflow,
    /workflow_dispatch|wrangler-action|CLOUDFLARE_API_TOKEN|workers\/domains|deploy --config/,
  );
});

test("Cloudflare Access JWTs are verified", async () => {
  const [auth, game, command, briefing] = await Promise.all([
    readFile(new URL("../app/chatgpt-auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/game/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/GameClient.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/BriefingInterface.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(auth, /createRemoteJWKSet/);
  assert.match(auth, /jwtVerify\(token, jwks/);
  assert.match(auth, /audience/);
  assert.match(auth, /issuer/);
  assert.match(auth, /provider: "chatgpt"/);
  assert.match(auth, /provider: "cloudflare-access"/);
  assert.match(auth, /provider: "self-hosted"/);
  assert.match(auth, /verifySession/);
  assert.match(auth, /\/cdn-cgi\/access\/logout/);
  assert.match(game, /authenticatedSignOutPath\(user\)/);
  assert.match(command, /href=\{logoutPath\}/);
  assert.match(briefing, /href=\{logoutPath\}/);
});

test("replication export is read-only, allowlisted, and secret gated", async () => {
  const replication = await readFile(
    new URL("../app/api/admin/replication/route.ts", import.meta.url),
    "utf8",
  );
  for (const table of TABLES) assert.match(replication, new RegExp(`"${table}"`));
  assert.match(replication, /DELENDA_REPLICATION_TOKEN/);
  assert.match(replication, /schemaVersion:\s*12/);
  assert.match(replication, /timingSafeEqual/);
  assert.match(replication, /SELECT rowid AS __rowid/);
  assert.doesNotMatch(replication, /\b(?:INSERT|UPDATE|DELETE|DROP|ALTER)\b/);
});
