#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";

function arg(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return fallback;
  return process.argv[idx + 1];
}

const packId = arg("--pack");
if (!packId) {
  console.error("Usage: npm run contentgen:pack-report -- --pack <id>");
  process.exit(2);
}

const root = process.cwd();
const failures = [];
let report = { packId, ok: false, failures };

if (packId === "routine-maneuver-v1") {
  const spines = JSON.parse(
    readFileSync(path.join(root, "app/campaign-content/routine/spines.v1.json"), "utf8"),
  ).spines;
  const frames = JSON.parse(
    readFileSync(path.join(root, "app/campaign-content/maneuvers/frames.v1.json"), "utf8"),
  );
  if (spines.length < 24) failures.push(`ROUTINE_SPINES:${spines.length}`);
  const theaters = new Set(spines.map((s) => s.theater));
  const problems = new Set(spines.map((s) => s.problemClass));
  if (theaters.size < 4) failures.push("THEATER_COVERAGE");
  if (problems.size < 8) failures.push("PROBLEM_COVERAGE");
  const byManeuver = new Map();
  for (const frame of frames.frames) {
    const key = frame.maneuverId;
    const bucket = byManeuver.get(key) ?? { hot: 0, medium: 0, shapes: new Set(), images: new Set() };
    bucket[frame.heat] += 1;
    bucket.shapes.add(frame.rhetoricalShape);
    bucket.images.add(frame.imageFamily);
    byManeuver.set(key, bucket);
  }
  if (frames.maneuverCount !== 7) failures.push(`MANEUVER_COUNT:${frames.maneuverCount}`);
  if (frames.frames.length < frames.frameMinimum) {
    failures.push(`FRAME_MINIMUM:${frames.frames.length}<${frames.frameMinimum}`);
  }
  for (const [id, bucket] of byManeuver) {
    if (bucket.hot < 4 || bucket.medium < 4) failures.push(`HEAT_COVERAGE:${id}`);
    if (bucket.shapes.size < 3) failures.push(`SHAPES:${id}`);
    if (bucket.images.size < 3) failures.push(`IMAGES:${id}`);
    for (const frame of frames.frames.filter((f) => f.maneuverId === id)) {
      if (!frame.continuationLanguage || !frame.aftermathLanguage) {
        failures.push(`MULTIDAY_LANGUAGE:${frame.id}`);
      }
      if (!frame.review?.authenticated) failures.push(`UNAUTHENTICATED:${frame.id}`);
    }
  }
  for (const spine of spines) {
    if (!spine.review?.authenticated) failures.push(`UNAUTHENTICATED:${spine.id}`);
    if (spine.forbiddenClaims?.includes("undeclared-mechanic") === false) {
      failures.push(`FORBIDDEN:${spine.id}`);
    }
  }
  const ids = [...spines, ...frames.frames].map((r) => r.id);
  if (new Set(ids).size !== ids.length) failures.push("DUPLICATE_IDS");
  report = {
    packId,
    ok: failures.length === 0,
    failures,
    inventory: {
      routineSpines: spines.length,
      maneuverFrames: frames.frames.length,
      maneuvers: frames.maneuverCount,
    },
  };
} else if (packId === "romantic-v1") {
  const arcs = JSON.parse(
    readFileSync(path.join(root, "app/campaign-content/romantic/arcs.v1.json"), "utf8"),
  ).arcs;
  const nonFallback = arcs.filter((a) => !a.alwaysEligible);
  if (nonFallback.length < 12) failures.push(`ARC_COUNT:${nonFallback.length}`);
  for (const phase of ["contact", "compression", "exhaustion", "terminal"]) {
    const count = nonFallback.filter((a) => a.gates.phases.includes(phase)).length;
    if (count < 3) failures.push(`PHASE_MINIMUM:${phase}:${count}`);
  }
  for (const arc of arcs) {
    if (arc.durationDays !== arc.beatCount) failures.push(`DURATION_BEATS:${arc.id}`);
    if (![1, 2, 3].includes(arc.durationDays)) failures.push(`DURATION_BOUNDS:${arc.id}`);
    if (!arc.interruptionBehavior) failures.push(`INTERRUPTION:${arc.id}`);
    for (const beat of arc.beats) {
      if (!beat.heatRealizations?.hot || !beat.heatRealizations?.medium) {
        failures.push(`HEAT_BEAT:${arc.id}:${beat.beatIndex}`);
      }
      if ((beat.choices?.length ?? 0) < 3) failures.push(`CHOICES:${arc.id}:${beat.beatIndex}`);
      for (const choice of beat.choices ?? []) {
        if (!choice.tradeoff && !choice.cost) failures.push(`COST:${choice.id}`);
      }
    }
    if (!arc.review?.authenticated) failures.push(`UNAUTHENTICATED:${arc.id}`);
  }
  report = {
    packId,
    ok: failures.length === 0,
    failures,
    inventory: { arcs: arcs.length, nonFallback: nonFallback.length },
  };
} else if (packId === "escalatory-doomsday-v1") {
  const standard = JSON.parse(
    readFileSync(path.join(root, "app/campaign-content/escalatory/standard.v1.json"), "utf8"),
  ).events;
  const maximum = JSON.parse(
    readFileSync(path.join(root, "app/campaign-content/escalatory/maximum.v1.json"), "utf8"),
  ).events;
  const families = JSON.parse(
    readFileSync(path.join(root, "app/campaign-content/doomsday/families.v1.json"), "utf8"),
  ).families;
  if (standard.length < 16) failures.push(`STANDARD:${standard.length}`);
  if (maximum.length < 12) failures.push(`MAXIMUM:${maximum.length}`);
  if (families.length < 6) failures.push(`DOOMSDAY:${families.length}`);
  for (const row of [...standard, ...maximum, ...families]) {
    if (!row.heatPaths?.includes("hot") || !row.heatPaths?.includes("medium")) {
      failures.push(`HEAT:${row.id}`);
    }
    if (!row.review?.authenticated) failures.push(`UNAUTHENTICATED:${row.id}`);
  }
  for (const family of families) {
    if (!family.outcomes?.nonterminal || !family.outcomes?.nearMiss || !family.outcomes?.terminal) {
      failures.push(`OUTCOMES:${family.id}`);
    }
    const { minSum, maxSum } = family.boundProof;
    if (minSum < 50_000 || maxSum > 450_000) failures.push(`BOUNDS:${family.id}`);
    if (family.baseTerminalPpm + family.allowedStatePressure.maxPpm > 450_000) {
      failures.push(`STATIC_BOUND:${family.id}`);
    }
  }
  report = {
    packId,
    ok: failures.length === 0,
    failures,
    inventory: {
      standard: standard.length,
      maximum: maximum.length,
      doomsday: families.length,
    },
  };
} else {
  failures.push("UNKNOWN_PACK");
  report = { packId, ok: false, failures };
}

console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
