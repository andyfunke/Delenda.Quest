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

test("production deploys the custom domain and production Worker URL", async () => {
  const [config,workflow] = await Promise.all([
    readFile(new URL("../wrangler.jsonc", import.meta.url),"utf8").then(JSON.parse),
    readFile(new URL("../.github/workflows/cloudflare-shadow.yml", import.meta.url),"utf8"),
  ]);
  assert.equal(config.name, "delenda-quest");
  assert.equal(config.workers_dev, true);
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
  assert.equal(config.assets.directory, "dist/client");
  assert.equal(config.assets.not_found_handling, "none");
  assert.equal(config.assets.run_worker_first, undefined);
  assert.equal(config.images.binding, "IMAGES");
  assert.equal(config.observability.enabled, true);
  assert.match(workflow,/name: Production contract/);
  assert.match(workflow,/github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow,/live-production-acceptance/);
  assert.match(workflow,/Prove delenda\.quest serves the compatible production contract/);
  assert.match(workflow,/npm run test:live/);
  assert.match(workflow,/Run cognitive Nexus and adapter contracts/);
  assert.match(workflow,/bash scripts\/test-substrate\.sh/);
  assert.match(workflow,/group: production-contract-\$\{\{ github\.event\.pull_request\.number \|\| github\.ref \}\}/);
  assert.match(workflow,/cancel-in-progress: true/);
  assert.doesNotMatch(
    workflow,
    /workflow_dispatch|wrangler-action|CLOUDFLARE_API_TOKEN|workers\/domains|deploy --config/,
  );
});

test("private guest sessions gate account state", async () => {
  const [auth, game, command, briefing] = await Promise.all([
    readFile(new URL("../app/auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/game/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/GameClient.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/BriefingInterface.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(auth, /GUEST_SESSION_COOKIE/);
  assert.match(auth, /provider: "guest"/);
  assert.match(auth, /guest-\$\{sessionId\}@guest\.delenda\.quest/);
  assert.match(auth, /\/api\/session/);
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
  assert.doesNotMatch(replication, /"campaign_resolution_grants"/);
  assert.match(replication, /DELENDA_REPLICATION_TOKEN/);
  assert.match(replication, /REPLICATION_SCHEMA_VERSION = 13/);
  assert.match(replication, /schemaVersion:\s*REPLICATION_SCHEMA_VERSION/);
  assert.match(replication, /timingSafeEqual/);
  assert.match(replication, /SELECT rowid AS __rowid/);
  assert.doesNotMatch(replication, /\b(?:INSERT|UPDATE|DELETE|DROP|ALTER)\b/);
});

test("resolution authority migration is journaled but its bearer table is not exported",async()=>{
  const[journal,migration,schema,replication]=await Promise.all([
    readFile(new URL("../drizzle/meta/_journal.json",import.meta.url),"utf8"),
    readFile(
      new URL("../drizzle/0014_campaign_resolution_grants.sql",import.meta.url),
      "utf8",
    ),
    readFile(new URL("../db/schema.ts",import.meta.url),"utf8"),
    readFile(
      new URL("../app/api/admin/replication/route.ts",import.meta.url),
      "utf8",
    ),
  ]);
  assert.match(journal,/"idx": 14[\s\S]{0,160}"tag": "0014_campaign_resolution_grants"/);
  assert.match(migration,/CREATE TABLE `campaign_resolution_grants`/);
  assert.match(migration,/ADD `last_resolution_grant_marker` text/);
  assert.match(schema,/campaignResolutionGrants=sqliteTable\("campaign_resolution_grants"/);
  assert.doesNotMatch(replication,/"campaign_resolution_grants"/);
});

test("browser and SSH campaign persistence use one revision contract", async () => {
  const [store, browserRoute, gatewayRoute, remoteStore, sshSession] =
    await Promise.all([
      readFile(new URL("../db/campaigns.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/api/campaign/route.ts", import.meta.url), "utf8"),
      readFile(
        new URL("../app/api/ssh/gateway/campaign/route.ts", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../packages/ssh-gateway/src/remote-store.ts", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../packages/ssh-gateway/src/session.ts", import.meta.url),
        "utf8",
      ),
    ]);
  assert.match(store, /eq\(activeCampaigns\.revision,prepared\.expectedRevision\)/);
  assert.match(store, /ActiveCampaignConflictError/);
  assert.match(browserRoute, /status:409/);
  assert.match(gatewayRoute, /status:409/);
  assert.match(remoteStore, /expectedRevision/);
  assert.match(remoteStore, /GatewayRequestError/);
  assert.match(sshSession, /CONCURRENT CAMPAIGN REVISION WON/);
  assert.match(sshSession, /winner=restoreCampaignState/);
});

test("relevant main pushes validate and deploy the native SSH gateway", async () => {
  const workflow = await readFile(
    new URL("../.github/workflows/deploy-ssh-gateway.yml", import.meta.url),
    "utf8",
  );
  assert.match(workflow, /push:[\s\S]*?branches:[\s\S]*?- main/);
  assert.match(workflow, /environment: ssh-production/);
  assert.match(workflow, /npm run typecheck && npm run build:ssh-gateway/);
  assert.match(workflow, /Run cognitive Nexus and SSH attestation contracts/);
  assert.match(workflow, /bash scripts\/test-substrate\.sh/);
  assert.match(workflow, /scripts\/test-native-ssh-gateway\.sh/);
  assert.match(
    workflow,
    /superfly\/flyctl-actions\/setup-flyctl@ed8efb33836e8b2096c7fd3ba1c8afe303ebbff1/,
  );
  assert.doesNotMatch(workflow, /setup-flyctl@master/);
  assert.match(workflow, /flyctl deploy --remote-only/);
  assert.match(workflow, /ssh-keyscan -p 22 ssh\.delenda\.quest/);
});

test("Fly deploys only the native SSH gateway", async () => {
  const manifests = await Promise.all([
    readFile(new URL("../fly.toml", import.meta.url), "utf8"),
    readFile(new URL("../packages/ssh-gateway/fly.toml", import.meta.url), "utf8"),
  ]);

  for (const manifest of manifests) {
    assert.match(manifest, /^app = "delenda-quest"$/m);
    assert.match(manifest, /dockerfile = "packages\/ssh-gateway\/Dockerfile"/);
    assert.match(manifest, /internal_port = 2222/);
    assert.match(manifest, /port = 22/);
    assert.doesNotMatch(manifest, /internal_port = 8080/);
  }
});
