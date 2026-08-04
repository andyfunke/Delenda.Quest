/**
 * Independent table validator — MUST NOT import tables-generate.mjs.
 * Recomputes from documented constants only.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const CONSTANTS = {
  magnitudeK: 2.2,
  doomsdayCap: 0.42,
  doomsdayLambda: 0.24,
  doomsdayStartDay: 18,
};

const ANCHORS = {
  magnitudeDoc: {
    1: { curve: 0, routine: 1, romantic: 1, escalatoryStandard: 1.15, escalatoryMaximum: 1.4 },
    5: { curve: 0.0442, routine: 1.015, romantic: 1.035, escalatoryStandard: 1.21, escalatoryMaximum: 1.493 },
    10: { curve: 0.122, routine: 1.043, romantic: 1.098, escalatoryStandard: 1.315, escalatoryMaximum: 1.656 },
    15: { curve: 0.2358, routine: 1.083, romantic: 1.189, escalatoryStandard: 1.468, escalatoryMaximum: 1.895 },
    20: { curve: 0.4021, routine: 1.141, romantic: 1.322, escalatoryStandard: 1.693, escalatoryMaximum: 2.244 },
    25: { curve: 0.645, routine: 1.226, romantic: 1.516, escalatoryStandard: 2.021, escalatoryMaximum: 2.754 },
    30: { curve: 1, routine: 1.35, romantic: 1.8, escalatoryStandard: 2.5, escalatoryMaximum: 3.5 },
  },
  doomsdayDoc: {
    18: 0.09,
    20: 0.216,
    25: 0.358,
    30: 0.401,
  },
};

function roundDoc(value, digits) {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

function recomputeMagnitude(day) {
  const progress = (day - 1) / 29;
  const curve =
    (Math.exp(CONSTANTS.magnitudeK * progress) - 1) /
    (Math.exp(CONSTANTS.magnitudeK) - 1);
  return {
    curvePpm: Math.round(curve * 1_000_000),
    routinePpm: Math.round((1 + 0.35 * curve) * 1_000_000),
    romanticPpm: Math.round((1 + 0.8 * curve) * 1_000_000),
    escalatoryStandardPpm: Math.round((1.15 + 1.35 * curve) * 1_000_000),
    escalatoryMaximumPpm: Math.round((1.4 + 2.1 * curve) * 1_000_000),
    doc: {
      curve: roundDoc(curve, 4),
      routine: roundDoc(1 + 0.35 * curve, 3),
      romantic: roundDoc(1 + 0.8 * curve, 3),
      escalatoryStandard: roundDoc(1.15 + 1.35 * curve, 3),
      escalatoryMaximum: roundDoc(1.4 + 2.1 * curve, 3),
    },
  };
}

function recomputeDoomsday(day) {
  let density = 0;
  if (day >= CONSTANTS.doomsdayStartDay) {
    density =
      CONSTANTS.doomsdayCap *
      (1 - Math.exp(-CONSTANTS.doomsdayLambda * (day - (CONSTANTS.doomsdayStartDay - 1))));
  }
  return {
    occurrencePpm: Math.round(density * 1_000_000),
    docDensity: roundDoc(density, 3),
  };
}

export function validatePacingTables(bundle) {
  const failures = [];
  if (!bundle?.magnitude || bundle.magnitude.length !== 30) {
    failures.push("MAGNITUDE_ROW_COUNT");
  }
  if (!bundle?.doomsday || bundle.doomsday.length !== 30) {
    failures.push("DOOMSDAY_ROW_COUNT");
  }
  if (!bundle?.lateRun || bundle.lateRun.length !== 30) {
    failures.push("LATE_RUN_ROW_COUNT");
  }

  for (let day = 1; day <= 30; day++) {
    const mag = bundle.magnitude[day - 1];
    const expected = recomputeMagnitude(day);
    for (const key of [
      "curvePpm",
      "routinePpm",
      "romanticPpm",
      "escalatoryStandardPpm",
      "escalatoryMaximumPpm",
    ]) {
      if (mag[key] !== expected[key]) failures.push(`MAG_MISMATCH:d${day}:${key}`);
    }
    if (day >= 2) {
      const prev = bundle.magnitude[day - 2];
      if (!(mag.routinePpm >= prev.routinePpm)) {
        failures.push(`MAG_NON_MONOTONIC:d${day}`);
      }
    }

    const doom = bundle.doomsday[day - 1];
    const doomExpected = recomputeDoomsday(day);
    if (doom.occurrencePpm !== doomExpected.occurrencePpm) {
      failures.push(`DOOM_MISMATCH:d${day}`);
    }
    if (doom.occurrencePpm < 0 || doom.occurrencePpm > 420_000) {
      failures.push(`DOOM_PPM_BOUNDS:d${day}`);
    }
    if (day >= 18 && day > 18) {
      const prev = bundle.doomsday[day - 2];
      if (!(doom.occurrencePpm > prev.occurrencePpm)) {
        failures.push(`DOOM_NON_MONOTONIC:d${day}`);
      }
    }
    if (day < 18 && doom.occurrencePpm !== 0) {
      failures.push(`DOOM_PRE_ELIGIBILITY:d${day}`);
    }

    if (bundle.lateRun[day - 1].adjustmentPpm !== 0) {
      failures.push(`LATE_RUN_NONZERO:d${day}`);
    }
  }

  for (const [day, anchor] of Object.entries(ANCHORS.magnitudeDoc)) {
    const row = recomputeMagnitude(Number(day)).doc;
    for (const [key, value] of Object.entries(anchor)) {
      if (row[key] !== value) failures.push(`MAG_ANCHOR:${day}:${key}:${row[key]}!=${value}`);
    }
  }
  for (const [day, value] of Object.entries(ANCHORS.doomsdayDoc)) {
    const doc = recomputeDoomsday(Number(day)).docDensity;
    if (doc !== value) failures.push(`DOOM_ANCHOR:${day}:${doc}!=${value}`);
  }

  const expectedHash = createHash("sha256")
    .update(
      JSON.stringify({
        constants: CONSTANTS,
        magnitude: bundle.magnitude.map((r) => [
          r.day,
          r.routinePpm,
          r.romanticPpm,
          r.escalatoryStandardPpm,
          r.escalatoryMaximumPpm,
        ]),
        doomsday: bundle.doomsday.map((r) => [r.day, r.occurrencePpm]),
        lateRun: bundle.lateRun.map((r) => [r.day, r.adjustmentPpm]),
      }),
    )
    .digest("hex");
  if (bundle.tableHash !== expectedHash) failures.push("TABLE_HASH_MISMATCH");

  return { ok: failures.length === 0, failures, expectedHash };
}

export function validatePacingTablesFile(path) {
  const bundle = JSON.parse(readFileSync(path, "utf8"));
  return validatePacingTables(bundle);
}
