import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const authority=await import(process.env.DELENDA_RESOLUTION_AUTHORITY_BUNDLE);

const grant=(overrides={})=>({
  id:"grant-aaaaaaaaaaaaaaaa",
  ownerEmail:"commander@example.com",
  accountDayKey:"2026-07-30",
  expiresAt:2_000,
  consumedAt:null,
  invalidatedAt:null,
  ...overrides,
});

test("forged, cross-owner, cross-day, expired, and replayed grants fail closed",()=>{
  const input={
    grantId:"grant-aaaaaaaaaaaaaaaa",
    ownerEmail:"commander@example.com",
    accountDayKey:"2026-07-30",
    now:1_000,
  };
  assert.equal(authority.persistedResolutionGrantId("short"),"");
  assert.equal(authority.resolutionGrantAuthorityIssue(null,input),"GRANT_ABSENT");
  assert.equal(
    authority.resolutionGrantAuthorityIssue(
      grant({ownerEmail:"observer@example.com"}),
      input,
    ),
    "GRANT_OWNER_MISMATCH",
  );
  assert.equal(
    authority.resolutionGrantAuthorityIssue(
      grant({accountDayKey:"2026-07-29"}),
      input,
    ),
    "GRANT_DAY_MISMATCH",
  );
  assert.equal(
    authority.resolutionGrantAuthorityIssue(grant({consumedAt:900}),input),
    "GRANT_REPLAYED",
  );
  assert.equal(
    authority.resolutionGrantAuthorityIssue(grant({invalidatedAt:900}),input),
    "GRANT_INVALIDATED",
  );
  assert.equal(
    authority.resolutionGrantAuthorityIssue(grant({expiresAt:1_000}),input),
    "GRANT_EXPIRED",
  );
  assert.equal(authority.resolutionGrantAuthorityIssue(grant(),input),null);
});

test("an R+1 campaign belongs only to the exact grant that wrote it",()=>{
  const campaign={
    campaignId:"campaign-a",
    revision:6,
    lastResolutionGrantMarker:"resolution-redemption:marker-a",
  };
  assert.equal(
    authority.resolutionAdvanceBelongsToGrant(campaign,{
      marker:"resolution-redemption:marker-a",
      campaignId:"campaign-a",
      campaignRevision:5,
    }),
    true,
  );
  assert.equal(
    authority.resolutionAdvanceBelongsToGrant(campaign,{
      marker:"resolution-redemption:marker-b",
      campaignId:"campaign-a",
      campaignRevision:5,
    }),
    false,
  );
});

const raceDatabase=()=>{
  const db=new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE active_campaigns (
      owner_email TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      revision INTEGER NOT NULL,
      last_resolution_grant_marker TEXT
    );
    CREATE TABLE account_turn_state (
      owner_email TEXT PRIMARY KEY,
      god_mode INTEGER NOT NULL,
      last_resolved_day_key TEXT
    );
    CREATE TABLE campaign_resolution_grants (
      id TEXT PRIMARY KEY,
      owner_email TEXT NOT NULL,
      account_day_key TEXT NOT NULL,
      campaign_id TEXT NOT NULL,
      campaign_revision INTEGER NOT NULL,
      consumed_at INTEGER,
      invalidated_at INTEGER
    );
    INSERT INTO active_campaigns VALUES
      ('commander@example.com','campaign-a',5,NULL);
    INSERT INTO account_turn_state VALUES
      ('commander@example.com',1,NULL);
    INSERT INTO campaign_resolution_grants VALUES
      ('grant-aaaaaaaaaaaaaaaa','commander@example.com','2026-07-30','campaign-a',5,NULL,NULL),
      ('grant-bbbbbbbbbbbbbbbb','commander@example.com','2026-07-30','campaign-a',5,NULL,NULL);
  `);
  return db;
};

const simulatedRedemptionBatch=(db,grantId)=>{
  const marker=`resolution-redemption:${grantId.endsWith("a")?"marker-a":"marker-b"}`;
  const campaign=db.prepare(`
    UPDATE active_campaigns
    SET revision=6,last_resolution_grant_marker=?
    WHERE owner_email='commander@example.com'
      AND campaign_id='campaign-a'
      AND revision=5
      AND EXISTS (
        SELECT 1 FROM campaign_resolution_grants
        WHERE id=? AND consumed_at IS NULL AND invalidated_at IS NULL
      )
  `).run(marker,grantId).changes;
  const turn=db.prepare(`
    UPDATE account_turn_state
    SET last_resolved_day_key='winner-ran'
    WHERE owner_email='commander@example.com'
      AND EXISTS (
        SELECT 1 FROM active_campaigns
        WHERE owner_email='commander@example.com'
          AND revision=6
          AND last_resolution_grant_marker=?
      )
      AND EXISTS (
        SELECT 1 FROM campaign_resolution_grants
        WHERE id=? AND consumed_at IS NULL AND invalidated_at IS NULL
      )
  `).run(marker,grantId).changes;
  const consumed=db.prepare(`
    UPDATE campaign_resolution_grants
    SET consumed_at=1000
    WHERE id=?
      AND consumed_at IS NULL
      AND invalidated_at IS NULL
      AND EXISTS (
        SELECT 1 FROM active_campaigns
        WHERE owner_email='commander@example.com'
          AND revision=6
          AND last_resolution_grant_marker=?
      )
  `).run(grantId,marker).changes;
  return[campaign,turn,consumed];
};

test("a losing concurrent godmode grant produces 0/0/0, not a partial redemption",()=>{
  const db=raceDatabase();
  assert.deepEqual(
    simulatedRedemptionBatch(db,"grant-aaaaaaaaaaaaaaaa"),
    [1,1,1],
  );
  assert.deepEqual(
    simulatedRedemptionBatch(db,"grant-bbbbbbbbbbbbbbbb"),
    [0,0,0],
  );
  const active=db.prepare(
    "SELECT last_resolution_grant_marker FROM active_campaigns WHERE owner_email='commander@example.com'",
  ).get();
  assert.notEqual(
    active.last_resolution_grant_marker,
    "grant-aaaaaaaaaaaaaaaa",
  );
  assert.equal(
    db.prepare(
      "SELECT consumed_at FROM campaign_resolution_grants WHERE id='grant-bbbbbbbbbbbbbbbb'",
    ).get().consumed_at,
    null,
  );
  db.close();
});

test("an intervening ordinary R+1 save cannot consume a grant or account day",()=>{
  const db=raceDatabase();
  db.exec(`
    UPDATE active_campaigns
    SET revision=6,last_resolution_grant_marker=NULL
    WHERE owner_email='commander@example.com' AND revision=5;
  `);
  assert.deepEqual(
    simulatedRedemptionBatch(db,"grant-aaaaaaaaaaaaaaaa"),
    [0,0,0],
  );
  assert.equal(
    db.prepare(
      "SELECT last_resolved_day_key FROM account_turn_state WHERE owner_email='commander@example.com'",
    ).get().last_resolved_day_key,
    null,
  );
  db.close();
});

test("production redemption carries exact-grant proof and never persists the bearer token",async()=>{
  const[source,schema,migration]=await Promise.all([
    readFile(new URL("../db/turns.ts",import.meta.url),"utf8"),
    readFile(new URL("../db/schema.ts",import.meta.url),"utf8"),
    readFile(
      new URL("../drizzle/0014_campaign_resolution_grants.sql",import.meta.url),
      "utf8",
    ),
  ]);
  assert.match(schema,/lastResolutionGrantMarker:text\("last_resolution_grant_marker"\)/);
  assert.match(migration,/ALTER TABLE `active_campaigns` ADD `last_resolution_grant_marker` text/);
  assert.match(source,/lastResolutionGrantMarker:executionKey/);
  assert.match(
    source,
    /eq\(activeCampaigns\.lastResolutionGrantMarker,executionKey\)/,
  );
  assert.match(source,/crypto\.subtle\.digest\(\s*"SHA-256"/);
  assert.doesNotMatch(
    source,
    /idempotencyKey:`resolution-redemption:\$\{grant\.id\}`/,
  );
  const returned=source.slice(source.lastIndexOf("return{"));
  assert.doesNotMatch(returned,/resolutionGrant,/);
});
