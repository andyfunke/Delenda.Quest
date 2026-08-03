import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  assertDeclaredBounds,
  resolveDoomsdayEvent,
} from "../packages/campaign-scheduler/src/doomsday.mjs";

test("routine/maneuver pack minima", () => {
  const spines = JSON.parse(
    readFileSync("app/campaign-content/routine/spines.v1.json", "utf8"),
  ).spines;
  const frames = JSON.parse(
    readFileSync("app/campaign-content/maneuvers/frames.v1.json", "utf8"),
  );
  assert.ok(spines.length >= 24);
  assert.equal(frames.maneuverCount, 7);
  assert.ok(frames.frames.length >= 56);
  assert.ok(spines.every((s) => s.review.authenticated));
});

test("romantic pack phase gates and both heats", () => {
  const arcs = JSON.parse(
    readFileSync("app/campaign-content/romantic/arcs.v1.json", "utf8"),
  ).arcs;
  const nonFallback = arcs.filter((a) => !a.alwaysEligible);
  assert.ok(nonFallback.length >= 12);
  for (const phase of ["contact", "compression", "exhaustion", "terminal"]) {
    assert.ok(
      nonFallback.filter((a) => a.gates.phases.includes(phase)).length >= 3,
    );
  }
  for (const arc of arcs) {
    assert.equal(arc.durationDays, arc.beatCount);
    for (const beat of arc.beats) {
      assert.ok(beat.heatRealizations.hot);
      assert.ok(beat.heatRealizations.medium);
      assert.ok(beat.choices.length >= 3);
    }
  }
});

test("doomsday bounds and sealed idempotent resolution", () => {
  const families = JSON.parse(
    readFileSync("app/campaign-content/doomsday/families.v1.json", "utf8"),
  ).families;
  assert.equal(families.length, 6);
  for (const event of families) {
    const bounds = assertDeclaredBounds(event);
    assert.ok(bounds.minSum >= 50_000);
    assert.ok(bounds.maxSum <= 450_000);
  }
  const a = resolveDoomsdayEvent({
    contentVersion: "campaign-content/v1",
    campaignSeed: 3,
    day: 25,
    event: families[0],
    densityPpm: 350_000,
    visibleState: { day: 25 },
    authorityStateDigest: "x",
  });
  const b = resolveDoomsdayEvent({
    contentVersion: "campaign-content/v1",
    campaignSeed: 3,
    day: 25,
    event: families[0],
    densityPpm: 350_000,
    visibleState: { day: 25 },
    authorityStateDigest: "x",
  });
  assert.deepEqual(a, b);
});

test("promoted manifests require human signature and auth counts", () => {
  for (const file of [
    "content-quality/packs/routine-maneuver.promoted.json",
    "content-quality/packs/romantic.promoted.json",
    "content-quality/packs/escalatory-doomsday.promoted.json",
  ]) {
    const manifest = JSON.parse(readFileSync(file, "utf8"));
    assert.equal(manifest.status, "PROMOTED");
    assert.equal(manifest.humanSigned, true);
    assert.ok(manifest.authenticatedCount > 0);
  }
});
