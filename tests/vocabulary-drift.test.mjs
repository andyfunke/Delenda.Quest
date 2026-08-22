import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const vocabulary = await import(process.env.DELENDA_SUBSTRATE_VOCAB_BUNDLE);
const game = await import(process.env.DELENDA_SUBSTRATE_GAME_BUNDLE);
const gameContext = await import(process.env.DELENDA_AVA_CONTEXT_BUNDLE);
const fallbackArcs = await import(
  new URL("../packages/campaign-scheduler/src/fallback-arcs.mjs", import.meta.url)
);

const sortedKey = (values) => [...values].sort().join("|");

test("live campaign phase table is owned by the shared vocabulary", () => {
  const expected = new Map([
    [1, "contact"], [5, "contact"],
    [6, "compression"], [12, "compression"],
    [13, "exhaustion"], [20, "exhaustion"],
    [21, "terminal"], [40, "terminal"],
  ]);
  for (const [day, phase] of expected) {
    assert.equal(vocabulary.phaseIdForDay(day), phase, `day ${day}`);
  }
  assert.deepEqual(vocabulary.CAMPAIGN_PHASES, [
    "contact", "compression", "exhaustion", "terminal",
  ]);
});

test("scheduler arc-pacing phase table divergence is pinned, not silent", () => {
  // Known divergence (offline scheduler is not exercised by the live
  // campaign): 7/15/23 boundaries versus the live 5/12/20 table. The
  // scheduler wiring epoch must reconcile the two; until then, any silent
  // movement of either table fails here.
  assert.equal(fallbackArcs.phaseForDay(7), "contact");
  assert.equal(fallbackArcs.phaseForDay(8), "compression");
  assert.equal(fallbackArcs.phaseForDay(15), "compression");
  assert.equal(fallbackArcs.phaseForDay(16), "exhaustion");
  assert.equal(fallbackArcs.phaseForDay(23), "exhaustion");
  assert.equal(fallbackArcs.phaseForDay(24), "terminal");
  assert.equal(vocabulary.phaseIdForDay(6), "compression");
  assert.notEqual(fallbackArcs.phaseForDay(6), vocabulary.phaseIdForDay(6));
});

test("maneuver identities match the authoritative MANEUVERS catalog", () => {
  assert.deepEqual(
    game.MANEUVERS.map((maneuver) => maneuver.id),
    [...vocabulary.MANEUVER_IDS],
  );
});

test("channels are one set across contracts and vocabulary", () => {
  assert.deepEqual(
    [...vocabulary.CHANNELS],
    ["campaign", "production", "military", "diplomacy", "upgrade", "domestic", "network"],
  );
  // Contracts and gates re-export the vocabulary declarations by
  // construction; pin the re-export so a fork cannot reappear silently.
  const contracts = readFileSync(resolve("app/substrate/contracts.ts"), "utf8");
  assert.match(contracts, /import { CHANNELS, COMMAND_OPERATIONS } from "\.\/vocabulary"/);
  assert.doesNotMatch(contracts, /CHANNELS\s*=\s*\[/);
  const gates = readFileSync(resolve("app/substrate/gates.ts"), "utf8");
  assert.match(gates, /import type { CampaignPhaseId, Channel, Theater } from "\.\/vocabulary"/);
});

test("Ava metric identities match the shared vocabulary", () => {
  assert.deepEqual(
    gameContext.AVA_METRICS.map((metric) => metric.id),
    [...vocabulary.METRIC_IDS],
  );
});

test("scalar gate keys map only onto declared metrics", () => {
  assert.equal(
    sortedKey(Object.keys(vocabulary.SCALAR_TO_METRIC)),
    sortedKey(vocabulary.SCALAR_KEYS),
  );
  for (const [key, metric] of Object.entries(vocabulary.SCALAR_TO_METRIC)) {
    if (metric === null) continue;
    assert.ok(vocabulary.METRIC_IDS.includes(metric), `${key} -> ${metric}`);
  }
});

test("scalar-key declaration sites are re-exports, not forks", () => {
  const campaign = readFileSync(resolve("app/campaign-substrate.ts"), "utf8");
  assert.doesNotMatch(campaign, /type ScalarKey\s*=\s*"/);
  assert.match(campaign, /SCALAR_KEYS,/);
  assert.match(campaign, /type ScalarKey,/);
  // The docket compiler supplies exactly the scalars DOCKET_SCALAR_KEYS
  // declares (source-pinned; the record is built inline).
  const docket = readFileSync(resolve("app/substrate/docket.ts"), "utf8");
  const scalarsBlock = docket.match(/scalars:\s*\{([\s\S]*?)\}/);
  assert.ok(scalarsBlock, "docket scalars record not found");
  const supplied = [...scalarsBlock[1].matchAll(/(\w+):\s*state\.\w+/g)].map(
    (match) => match[1],
  );
  assert.equal(sortedKey(supplied), sortedKey(vocabulary.DOCKET_SCALAR_KEYS));
  assert.ok(vocabulary.METRIC_IDS.includes("treasury"));
});

test("the live typed-request operation gate derives from the vocabulary", () => {
  const requestIr = readFileSync(resolve("app/ava/request-ir.ts"), "utf8");
  assert.match(
    requestIr,
    /new Set<AvaSemanticOperation>\(AVA_SEMANTIC_OPERATIONS\)/,
  );
  assert.match(requestIr, /from "\.\.\/substrate\/substrate-core"/);
});

test("operation mapping is complete and closed", () => {
  assert.equal(
    sortedKey(Object.keys(vocabulary.AVA_OPERATION_TO_COMMAND)),
    sortedKey(vocabulary.AVA_SEMANTIC_OPERATIONS),
  );
  for (const [operation, command] of Object.entries(
    vocabulary.AVA_OPERATION_TO_COMMAND,
  )) {
    if (command === null) continue;
    assert.ok(
      vocabulary.COMMAND_OPERATIONS.includes(command),
      `${operation} -> ${command}`,
    );
  }
  assert.deepEqual([...vocabulary.COMMAND_OPERATIONS], [
    "HELP", "BRIEF", "STATUS", "SHOW_DOCKET", "SHOW_CHOICE", "ASK_AVA",
    "ADVISE", "COMPARE", "RANK", "PREPARE", "CONFIRM", "CANCEL",
    "INTERRUPTS", "MISSIONS", "BATTLE_LOG", "SERVICE_RECORD",
    "RECENT_DISPATCHES", "WHOAMI", "LOGOUT", "QUIT",
  ]);
});

test("tier, heat, escalation, theater, and problem-class sets are frozen", () => {
  assert.deepEqual([...vocabulary.CAMPAIGN_TIERS], ["routine", "romantic", "escalatory"]);
  assert.deepEqual([...vocabulary.PROCEDURE_HEATS], ["hot", "medium"]);
  assert.deepEqual([...vocabulary.ESCALATION_INTENSITIES], ["none", "standard", "maximum"]);
  assert.deepEqual([...vocabulary.THEATERS], ["lowland", "ridge", "industrial", "river"]);
  assert.deepEqual([...vocabulary.PROBLEM_CLASSES], [
    "force-preservation", "logistics", "command", "assault",
    "crossing", "exploitation", "counterstroke", "observation",
  ]);
});

test("pack materializer asserts against the shared vocabulary", () => {
  const source = readFileSync(resolve("scripts/build-campaign-packs.mjs"), "utf8");
  assert.match(source, /from "\.\.\/app\/substrate\/vocabulary\.ts"/);
  for (const label of ["theaters", "problems", "maneuvers", "phases"]) {
    assert.match(source, new RegExp(`assertCanonSet\\("${label}"`));
  }
});
