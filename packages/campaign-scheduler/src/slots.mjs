/**
 * §4.12(d) guaranteed narrative slots — rejection stream, pairwise disjoint.
 */

import { uniformInt } from "./hash.mjs";

export const SLOT_WINDOWS = Object.freeze({
  A: Object.freeze([3, 8]),
  B: Object.freeze([10, 17]),
  C: Object.freeze([19, 27]),
});

function intervalsOverlap(a, b) {
  return !(a[1] < b[0] || b[1] < a[0]);
}

export function drawGuaranteedSlots(campaignSeed) {
  const accepted = [];
  const slots = [];
  for (const slotId of ["A", "B", "C"]) {
    const [windowLo, windowHi] = SLOT_WINDOWS[slotId];
    const drawReceipts = [];
    let deferralCount = 0;
    let drawn = null;
    for (let k = 0; k < 10_000; k++) {
      const startTicket = `${campaignSeed}:slot:${slotId}:${k}`;
      const durTicket = `${campaignSeed}:slot:${slotId}:${k}:dur`;
      const start = uniformInt(windowLo, windowHi, startTicket);
      const duration = uniformInt(1, 3, durTicket);
      const interval = [start, start + duration - 1];
      drawReceipts.push(startTicket, durTicket);
      const fits = interval[0] >= 1 && interval[1] <= 30;
      const disjoint = accepted.every((other) => !intervalsOverlap(interval, other));
      if (fits && disjoint) {
        drawn = { start, duration, interval, k };
        break;
      }
    }
    if (!drawn) throw new Error(`SLOT_DRAW_FAILED:${slotId}`);
    accepted.push(drawn.interval);
    slots.push({
      slotId,
      windowStart: [windowLo, windowHi],
      drawnStartDay: drawn.start,
      durationDays: drawn.duration,
      guaranteed: true,
      activatedArcId: null,
      status: "pending",
      deferralCount,
      drawReceipts,
      interval: drawn.interval,
    });
  }
  return slots;
}

export function slotsPairwiseDisjoint(slots) {
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = [
        slots[i].drawnStartDay,
        slots[i].drawnStartDay + slots[i].durationDays - 1,
      ];
      const b = [
        slots[j].drawnStartDay,
        slots[j].drawnStartDay + slots[j].durationDays - 1,
      ];
      if (intervalsOverlap(a, b)) return false;
    }
  }
  return true;
}
