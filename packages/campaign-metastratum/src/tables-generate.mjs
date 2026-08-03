/**
 * Offline generator for §4.11 pacing tables (integer ppm).
 * Magnitude multipliers stored as ppm where 1.0 = 1_000_000.
 */

import { createHash } from "node:crypto";

export const TABLE_CONSTANTS = {
  magnitudeK: 2.2,
  doomsdayCap: 0.42,
  doomsdayLambda: 0.24,
  doomsdayStartDay: 18,
};

function roundDoc(value, digits) {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

export function magnitudeRow(day) {
  const progress = (day - 1) / 29;
  const curve =
    (Math.exp(TABLE_CONSTANTS.magnitudeK * progress) - 1) /
    (Math.exp(TABLE_CONSTANTS.magnitudeK) - 1);
  const routine = 1.0 + 0.35 * curve;
  const romantic = 1.0 + 0.8 * curve;
  const escalatoryStandard = 1.15 + 1.35 * curve;
  const escalatoryMaximum = 1.4 + 2.1 * curve;
  return {
    day,
    curvePpm: Math.round(curve * 1_000_000),
    routinePpm: Math.round(routine * 1_000_000),
    romanticPpm: Math.round(romantic * 1_000_000),
    escalatoryStandardPpm: Math.round(escalatoryStandard * 1_000_000),
    escalatoryMaximumPpm: Math.round(escalatoryMaximum * 1_000_000),
    // Documentation rounding helpers (not runtime authority).
    doc: {
      curve: roundDoc(curve, 4),
      routine: roundDoc(routine, 3),
      romantic: roundDoc(romantic, 3),
      escalatoryStandard: roundDoc(escalatoryStandard, 3),
      escalatoryMaximum: roundDoc(escalatoryMaximum, 3),
    },
  };
}

export function doomsdayRow(day) {
  let density = 0;
  if (day >= TABLE_CONSTANTS.doomsdayStartDay) {
    density =
      TABLE_CONSTANTS.doomsdayCap *
      (1 -
        Math.exp(
          -TABLE_CONSTANTS.doomsdayLambda *
            (day - (TABLE_CONSTANTS.doomsdayStartDay - 1)),
        ));
  }
  return {
    day,
    occurrencePpm: Math.round(density * 1_000_000),
    docDensity: roundDoc(density, 3),
  };
}

export function lateRunRow(day) {
  return { day, adjustmentPpm: 0 };
}

export function generateAllTables() {
  const magnitude = [];
  const doomsday = [];
  const lateRun = [];
  for (let day = 1; day <= 30; day++) {
    magnitude.push(magnitudeRow(day));
    doomsday.push(doomsdayRow(day));
    lateRun.push(lateRunRow(day));
  }
  const bundle = {
    version: "campaign-pacing-tables/v1",
    constants: TABLE_CONSTANTS,
    magnitude,
    doomsday,
    lateRun,
  };
  bundle.tableHash = createHash("sha256")
    .update(JSON.stringify({
      constants: bundle.constants,
      magnitude: magnitude.map((r) => [
        r.day,
        r.routinePpm,
        r.romanticPpm,
        r.escalatoryStandardPpm,
        r.escalatoryMaximumPpm,
      ]),
      doomsday: doomsday.map((r) => [r.day, r.occurrencePpm]),
      lateRun: lateRun.map((r) => [r.day, r.adjustmentPpm]),
    }))
    .digest("hex");
  return bundle;
}
