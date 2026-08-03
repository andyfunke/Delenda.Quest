#!/usr/bin/env node
import { readFileSync } from "node:fs";
import {
  assertDeclaredBounds,
  eventOccurs,
  resolveDoomsdayEvent,
} from "../packages/campaign-scheduler/src/doomsday.mjs";

const tables = JSON.parse(
  readFileSync("campaign/tables/v1/pacing-tables.json", "utf8"),
);
const families = JSON.parse(
  readFileSync("app/campaign-content/doomsday/families.v1.json", "utf8"),
).families;

const failures = [];
for (let day = 1; day <= 17; day++) {
  if (tables.doomsday[day - 1].occurrencePpm !== 0) {
    failures.push(`PRE18:${day}`);
  }
}
for (let day = 19; day <= 30; day++) {
  if (
    !(tables.doomsday[day - 1].occurrencePpm > tables.doomsday[day - 2].occurrencePpm)
  ) {
    failures.push(`MONOTONIC:${day}`);
  }
}
for (const row of tables.doomsday) {
  if (row.occurrencePpm > 420_000) failures.push(`CAP:${row.day}`);
}
for (const row of tables.lateRun) {
  if (row.adjustmentPpm !== 0) failures.push(`LATE_RUN:${row.day}`);
}

for (const event of families) {
  try {
    assertDeclaredBounds(event);
  } catch (error) {
    failures.push(error.message);
  }
  if (!event.outcomes.nonterminal) failures.push(`NONTERMINAL:${event.id}`);
}

// Deterministic tickets across reopen
const sample = resolveDoomsdayEvent({
  contentVersion: "campaign-content/v1",
  campaignSeed: 99,
  day: 20,
  event: families[0],
  densityPpm: tables.doomsday[19].occurrencePpm,
  visibleState: { day: 20, front: 1 },
  authorityStateDigest: "digest-1",
  lateRunAdjustmentPpm: 0,
});
const again = resolveDoomsdayEvent({
  contentVersion: "campaign-content/v1",
  campaignSeed: 99,
  day: 20,
  event: families[0],
  densityPpm: tables.doomsday[19].occurrencePpm,
  visibleState: { day: 20, front: 1 },
  authorityStateDigest: "digest-1",
  lateRunAdjustmentPpm: 0,
});
if (JSON.stringify(sample) !== JSON.stringify(again)) failures.push("REROLL");

const occ = eventOccurs("campaign-content/v1", 1, 10, 0);
if (occ.occurs) failures.push("FALSE_OCCURRENCE");

const report = { ok: failures.length === 0, failures, sampleStatus: sample.status };
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
