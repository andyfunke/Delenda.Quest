import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
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

test("Cloudflare shadow config cannot take over the live route", async () => {
  const config = JSON.parse(
    await readFile(new URL("../cloudflare/wrangler.jsonc", import.meta.url)),
  );
  assert.equal(config.name, "delenda-quest-shadow");
  assert.equal(config.workers_dev, true);
  assert.equal(config.routes, undefined);
  assert.equal(config.d1_databases[0].database_name, "delenda-quest-shadow");
  assert.equal(config.d1_databases[0].binding, "DB");
  assert.equal(config.assets.binding, "ASSETS");
  assert.equal(config.images.binding, "IMAGES");
  assert.equal(config.observability.enabled, true);
  assert.equal(config.vars.DELENDA_AUTH_PROVIDER, "cloudflare-access");
  assert.deepEqual(config.secrets.required.sort(), [
    "CF_ACCESS_AUD",
    "CF_ACCESS_TEAM_DOMAIN",
    "DELENDA_ADMIN_EMAILS",
    "DELENDA_REPLICATION_TOKEN",
  ]);
});

test("Cloudflare Access is verified and the Sites identity path remains intact", async () => {
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
  assert.match(replication, /timingSafeEqual/);
  assert.match(replication, /SELECT rowid AS __rowid/);
  assert.doesNotMatch(replication, /\b(?:INSERT|UPDATE|DELETE|DROP|ALTER)\b/);
});

test("snapshot SQL generation requires the literal shadow target", async () => {
  const directory = await mkdtemp(join(tmpdir(), "delenda-shadow-test-"));
  const snapshotPath = join(directory, "source.json");
  const sqlPath = join(directory, "shadow.sql");
  const emptyHash = createHash("sha256").update("[]").digest("hex");
  const snapshot = {
    format: "delenda-d1-snapshot-v1",
    exportedAt: new Date(0).toISOString(),
    source: "https://example.invalid",
    schemaVersion: 11,
    tables: Object.fromEntries(
      TABLES.map((table) => [
        table,
        { count: 0, sha256: emptyHash, rows: [] },
      ]),
    ),
  };
  await writeFile(snapshotPath, JSON.stringify(snapshot));

  const refused = spawnSync(
    process.execPath,
    [
      "scripts/cloudflare-snapshot.mjs",
      "sql",
      "--snapshot",
      snapshotPath,
      "--output",
      sqlPath,
      "--confirm-target-reset",
      "production",
    ],
    { cwd: projectRoot, encoding: "utf8" },
  );
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /Refusing to generate reset SQL/);

  const accepted = spawnSync(
    process.execPath,
    [
      "scripts/cloudflare-snapshot.mjs",
      "sql",
      "--snapshot",
      snapshotPath,
      "--output",
      sqlPath,
      "--confirm-target-reset",
      "delenda-quest-shadow",
    ],
    { cwd: projectRoot, encoding: "utf8" },
  );
  assert.equal(accepted.status, 0, accepted.stderr);
  const sql = await readFile(sqlPath, "utf8");
  assert.match(sql, /resets only delenda-quest-shadow/);
  for (const table of TABLES)
    assert.match(sql, new RegExp(`DELETE FROM "${table}"`));
});
