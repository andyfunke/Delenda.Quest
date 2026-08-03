import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildItinerary,
  drawGuaranteedSlots,
  itinerariesEqual,
  oppositeHeat,
  slotsPairwiseDisjoint,
  validateItinerary,
} from "../packages/campaign-scheduler/src/index.mjs";

test("slots are pairwise disjoint with receipts", () => {
  for (const seed of [1, 7, 42, 999]) {
    const slots = drawGuaranteedSlots(seed);
    assert.equal(slotsPairwiseDisjoint(slots), true);
    assert.ok(slots.every((s) => s.drawReceipts.length >= 2));
    assert.ok(slots.every((s) => s.deferralCount <= 1));
  }
});

test("itinerary guarantees three completed romantics and heat alternation", () => {
  const itinerary = buildItinerary(7);
  const report = validateItinerary(itinerary);
  assert.equal(report.ok, true, report.failures.join(","));
  assert.ok(itinerary.completedRomanticIds.length >= 3);
  let prev = null;
  for (const docket of itinerary.dockets) {
    if (prev) assert.equal(docket.heat, oppositeHeat(prev));
    prev = docket.heat;
  }
});

test("reopen is stable", () => {
  const a = buildItinerary(12345);
  const b = buildItinerary(12345);
  assert.equal(itinerariesEqual(a, b), true);
});

test("1000-seed focused sample passes independent validator", () => {
  const failures = [];
  for (let seed = 1; seed <= 1000; seed++) {
    const report = validateItinerary(buildItinerary(seed));
    if (!report.ok) failures.push({ seed, failures: report.failures });
  }
  assert.equal(failures.length, 0, JSON.stringify(failures.slice(0, 3)));
});
