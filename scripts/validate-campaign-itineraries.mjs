#!/usr/bin/env node
import {
  buildItinerary,
  itinerariesEqual,
  validateItinerarySuite,
} from "../packages/campaign-scheduler/src/index.mjs";

function arg(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return fallback;
  return process.argv[idx + 1];
}

const seedCount = Number(arg("--seeds", "10000"));
const itineraries = [];
const t0 = Date.now();
for (let seed = 1; seed <= seedCount; seed++) {
  const once = buildItinerary(seed);
  const twice = buildItinerary(seed);
  if (!itinerariesEqual(once, twice)) {
    console.error(JSON.stringify({ ok: false, error: "RERUN_UNSTABLE", seed }));
    process.exit(1);
  }
  itineraries.push(once);
}
const summary = validateItinerarySuite(itineraries);
summary.ms = Date.now() - t0;
summary.seedCount = seedCount;
console.log(JSON.stringify(summary, null, 2));
process.exit(summary.ok ? 0 : 1);
