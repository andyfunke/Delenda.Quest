import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { compileExecutionScene } from "../packages/execution-scenes/src/index.mjs";
import {
  OUT_OF_CAMPAIGN_NOTICE,
  SURFACE_SUPPORT,
  battleLogEntries,
  focusAfterManualResolve,
  outOfCampaignBattleLogNotice,
  semanticIdsForSurfaces,
} from "../packages/battle-log/src/index.mjs";
const root = path.resolve(import.meta.dirname, "..");
const fixture = JSON.parse(
  readFileSync(
    path.join(root, "content-quality/execution-scenes/fixtures/day-7.ledger.json"),
    "utf8",
  ),
);

function fakeResolveOnce(priorHistory) {
  const scene = compileExecutionScene(fixture);
  const record = {
    schemaVersion: 1,
    resolvedDay: scene.resolvedDay,
    sector: "Kesh Corridor",
    outcome: { outcomeBand: "contested", groundMovement: -1.5 },
    personnel: { combatLosses: 1200 },
    executionScene: scene,
    realizationId: scene.realizationId,
  };
  return {
    resolutionHistory: [record, ...priorHistory],
    resolvedDay: scene.resolvedDay,
    sceneCountDelta: 1,
  };
}

test("one authorized redemption yields exactly one new scene and focus", () => {
  const prior = [];
  const first = fakeResolveOnce(prior);
  assert.equal(first.sceneCountDelta, 1);
  assert.equal(first.resolutionHistory.length, 1);
  const focus = focusAfterManualResolve({
    source: "manual",
    resolvedDay: first.resolvedDay,
    priorFocus: "brief",
  });
  assert.equal(focus.surface, "battle-log");
  assert.equal(focus.focusDay, 7);
  assert.equal(focus.unreadDay, null);
  // No second resolution on reopen — same persisted scene
  const reopen = battleLogEntries(first.resolutionHistory);
  assert.equal(reopen.length, 1);
  assert.equal(reopen[0].semanticId, first.resolutionHistory[0].executionScene.resolutionId);
});

test("automatic turnover does not steal focus; unread affordance only", () => {
  const focus = focusAfterManualResolve({
    source: "automatic",
    resolvedDay: 7,
    priorFocus: "brief",
  });
  assert.equal(focus.surface, "brief");
  assert.equal(focus.focusDay, null);
  assert.equal(focus.unreadDay, 7);
});

test("aliases and out-of-campaign notice", () => {
  const parserSrc = readFileSync(
    path.join(root, "app/substrate/command-parser.ts"),
    "utf8",
  );
  assert.match(parserSrc, /battle log/);
  assert.match(parserSrc, /service record\|record/);
  assert.match(parserSrc, /BATTLE_LOG/);
  const servicesSrc = readFileSync(
    path.join(root, "app/substrate/services.ts"),
    "utf8",
  );
  assert.match(servicesSrc, /No active campaign; completed campaigns live under Account/);
  assert.equal(outOfCampaignBattleLogNotice(false), OUT_OF_CAMPAIGN_NOTICE);
  assert.equal(outOfCampaignBattleLogNotice(true), null);
});

test("cross-surface semantic ID parity and §4.15 absence cells", () => {
  const scene = compileExecutionScene(fixture);
  const entries = battleLogEntries([
    {
      resolvedDay: 7,
      sector: "Kesh Corridor",
      outcome: { outcomeBand: "contested", groundMovement: -1.5 },
      personnel: { combatLosses: 1200 },
      executionScene: scene,
      realizationId: scene.realizationId,
    },
  ]);
  const ids = semanticIdsForSurfaces(entries[0]);
  assert.equal(ids.web, ids["ava-nexus"]);
  assert.equal(ids.web, ids["terminal-core"]);
  assert.equal(ids.web, ids["native-ssh"]);
  assert.equal(ids["contentgen-lab"], null);
  assert.equal(ids["account-campaign-records"], null);
  assert.equal(SURFACE_SUPPORT["contentgen-lab"]["ava-nexus"], false);
  assert.equal(SURFACE_SUPPORT["account-campaign-records"].web, "account-page");
});

test("Account Campaign Records name preserved in AccountPage source", () => {
  const account = readFileSync(path.join(root, "app/AccountPage.tsx"), "utf8");
  assert.match(account, /Campaign Records/);
  assert.doesNotMatch(account, /Battle Log/);
});
