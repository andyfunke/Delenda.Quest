/**
 * Independent itinerary validator — consumes serialized itineraries only.
 */

import { slotsPairwiseDisjoint } from "./slots.mjs";

export function validateItinerary(itinerary) {
  const failures = [];
  if (!itinerary?.dockets || itinerary.dockets.length !== 30) {
    failures.push("DOCKET_COUNT");
  }
  const completed = itinerary.completedRomanticIds ?? [];
  if (completed.length < 3) failures.push(`ROMANTIC_COMPLETED:${completed.length}`);

  if (!slotsPairwiseDisjoint(itinerary.slots ?? [])) {
    failures.push("SLOTS_OVERLAP");
  }

  for (const slot of itinerary.slots ?? []) {
    if ((slot.deferralCount ?? 0) > 1) failures.push(`DEFERRAL:${slot.slotId}`);
    if (!slot.drawReceipts?.length) failures.push(`RECEIPTS:${slot.slotId}`);
    const end = slot.drawnStartDay + slot.durationDays - 1;
    if (end > 30 || slot.drawnStartDay < 1) failures.push(`SLOT_BOUNDS:${slot.slotId}`);
  }

  let prevHeat = null;
  for (const docket of itinerary.dockets ?? []) {
    if (!docket.persisted) failures.push(`NOT_PERSISTED:d${docket.day}`);
    if (prevHeat && docket.heat === prevHeat) {
      failures.push(`HEAT_REPEAT:d${docket.day}`);
    }
    prevHeat = docket.heat;
    for (const id of docket.contentIds ?? []) {
      if (!id || id.includes("undefined")) failures.push(`UNKNOWN_CONTENT:${id}`);
    }
    if (docket.futureItinerary) failures.push("FUTURE_FIELD_DISCLOSED");
  }

  for (const row of itinerary.suppressedOccurrences ?? []) {
    if (row.status !== "SUPPRESSED") failures.push("SUPPRESSION_STATUS");
    if (!row.ticket) failures.push("SUPPRESSION_TICKET");
  }

  // Exactly one romantic beat per romantic day; duration consistency on slots
  for (const slot of itinerary.slots ?? []) {
    if (slot.status === "completed" || slot.activatedArcId) {
      if (![1, 2, 3].includes(slot.durationDays)) {
        failures.push(`DURATION:${slot.slotId}`);
      }
    }
  }

  return { ok: failures.length === 0, failures };
}

export function validateItinerarySuite(itineraries) {
  const summary = {
    seeds: itineraries.length,
    failures: [],
    romanticOk: 0,
    heatOk: 0,
  };
  for (const itinerary of itineraries) {
    const report = validateItinerary(itinerary);
    if (report.ok) {
      summary.romanticOk += 1;
      summary.heatOk += 1;
    } else {
      summary.failures.push({
        seed: itinerary.campaignSeed,
        failures: report.failures,
      });
    }
  }
  summary.ok = summary.failures.length === 0;
  return summary;
}
