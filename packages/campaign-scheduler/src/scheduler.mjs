/**
 * §4.12(i) main-thread scheduler — exact branch order for v1.
 */

import { rollPpm, stableHash } from "./hash.mjs";
import {
  FALLBACK_ARCS_V1,
  arcsForPhase,
  materializeFallbackArc,
  phaseForDay,
} from "./fallback-arcs.mjs";
import { drawGuaranteedSlots } from "./slots.mjs";

export function oppositeHeat(heat) {
  return heat === "hot" ? "medium" : "hot";
}

export function drawInitialHeat(campaignSeed) {
  const ticket = `${campaignSeed}:0:initial-heat`;
  const heat = rollPpm(ticket) < 500_000 ? "hot" : "medium";
  return { heat, ticket };
}

function selectArcId(campaignSeed, slotId, day, phase, registry) {
  const eligible = arcsForPhase(phase, registry);
  if (!eligible.length) throw new Error(`NO_ELIGIBLE_ARC:${phase}`);
  return [...eligible].sort((a, b) => {
    const sa = stableHash(`${campaignSeed}:${slotId}:${day}:${a.id}`);
    const sb = stableHash(`${campaignSeed}:${slotId}:${day}:${b.id}`);
    return sa - sb || a.id.localeCompare(b.id);
  })[0];
}

export function buildItinerary(campaignSeed, options = {}) {
  const registry = options.arcRegistry ?? FALLBACK_ARCS_V1;
  const doomsdayDensityPpm = options.doomsdayDensityPpm ?? Array(30).fill(0);
  const contentVersion = options.contentVersion ?? "campaign-content/v1";

  const initial = drawInitialHeat(campaignSeed);
  const slots = drawGuaranteedSlots(campaignSeed);
  const suppressed = [];
  const dockets = [];
  const completedRomanticIds = [];

  let lastResolvedHeat = null;
  let activeNarrativeEpoch = null;
  let activeOperation = options.activeOperation ?? null;

  for (let day = 1; day <= 30; day++) {
    const requiredHeat =
      lastResolvedHeat == null ? initial.heat : oppositeHeat(lastResolvedHeat);

    let docket = null;

    if (
      activeNarrativeEpoch &&
      activeNarrativeEpoch.beatIndex < activeNarrativeEpoch.durationDays
    ) {
      const beatIndex = activeNarrativeEpoch.beatIndex;
      docket = {
        day,
        kind: "romantic",
        heat: requiredHeat,
        arcId: activeNarrativeEpoch.arcId,
        beatIndex,
        realizationId: `${activeNarrativeEpoch.arcId}-beat${beatIndex}-${requiredHeat}`,
        continuingOperationId: activeOperation?.operationId ?? null,
        contentIds: [
          activeNarrativeEpoch.arcId,
          `${activeNarrativeEpoch.arcId}-beat${beatIndex}-${requiredHeat}`,
        ],
      };
      const nextBeat = beatIndex + 1;
      if (nextBeat >= activeNarrativeEpoch.durationDays) {
        completedRomanticIds.push(activeNarrativeEpoch.arcId);
        const slot = slots.find((s) => s.slotId === activeNarrativeEpoch.slotId);
        if (slot) slot.status = "completed";
        activeNarrativeEpoch = null;
      } else {
        activeNarrativeEpoch = {
          ...activeNarrativeEpoch,
          beatIndex: nextBeat,
        };
      }
    } else {
      const doom = evaluateDoomsday(day, {
        campaignSeed,
        contentVersion,
        densityPpm: doomsdayDensityPpm[day - 1] ?? 0,
        activeNarrativeEpoch,
        slots,
      });
      if (doom.suppressed) suppressed.push(doom.record);
      if (doom.deferSlot) {
        const slot = slots.find((s) => s.slotId === doom.deferSlot);
        if (slot && slot.deferralCount < 1) {
          slot.drawnStartDay += 1;
          slot.deferralCount = 1;
          slot.drawReceipts = [
            ...slot.drawReceipts,
            `${campaignSeed}:slot:${slot.slotId}:defer:${day}`,
          ];
        }
      }

      if (doom.fire) {
        docket = {
          day,
          kind: "escalatory",
          heat: requiredHeat,
          eventId: doom.eventId,
          continuingOperationId: activeOperation?.operationId ?? null,
          ticket: doom.occurrenceTicket,
          contentIds: [doom.eventId, `${doom.eventId}:${requiredHeat}`],
        };
      } else {
        const starting = slots.find(
          (s) => s.status === "pending" && s.drawnStartDay === day,
        );
        if (starting) {
          const phase = phaseForDay(day);
          const selected = selectArcId(
            campaignSeed,
            starting.slotId,
            day,
            phase,
            registry,
          );
          const arc = materializeFallbackArc(phase, starting.durationDays);
          // Prefer selected id when it matches phase fallback; Epoch 023 may replace.
          const arcId = selected.id;
          const durationDays = starting.durationDays;
          docket = {
            day,
            kind: "romantic",
            heat: requiredHeat,
            arcId,
            beatIndex: 0,
            realizationId: `${arcId}-beat0-${requiredHeat}`,
            continuingOperationId: activeOperation?.operationId ?? null,
            contentIds: [arcId, `${arcId}-beat0-${requiredHeat}`],
          };
          starting.status = "active";
          starting.activatedArcId = arcId;
          if (durationDays === 1) {
            completedRomanticIds.push(arcId);
            starting.status = "completed";
            activeNarrativeEpoch = null;
          } else {
            activeNarrativeEpoch = {
              instanceId: `${campaignSeed}:${starting.slotId}:${arcId}:${day}`,
              arcId,
              slotId: starting.slotId,
              startedDay: day,
              durationDays,
              beatIndex: 1,
              beatCount: durationDays,
              status: "active",
              choiceHistory: [],
              residueIds: [...(arc.residueIds ?? [])],
            };
          }
        } else if (activeOperation?.requiresDecisionBeat) {
          docket = {
            day,
            kind: "operation",
            heat: requiredHeat,
            operationId: activeOperation.operationId,
            stageIndex: activeOperation.stageIndex,
            contentIds: [
              activeOperation.operationId,
              `${activeOperation.maneuverId}:${requiredHeat}`,
            ],
          };
        } else {
          docket = {
            day,
            kind: "routine",
            heat: requiredHeat,
            situationId: `routine-${phaseForDay(day)}-${requiredHeat}`,
            continuingOperationId: activeOperation?.operationId ?? null,
            contentIds: [`routine-${phaseForDay(day)}-${requiredHeat}`],
          };
        }
      }
    }

    dockets.push({ ...docket, persisted: true, seed: campaignSeed });
    lastResolvedHeat = requiredHeat;
  }

  return {
    version: "campaign-itinerary/v1",
    campaignSeed,
    initialHeat: initial.heat,
    initialHeatTicket: initial.ticket,
    slots,
    dockets,
    suppressedOccurrences: suppressed,
    completedRomanticIds,
    metastratum: {
      version: "campaign-metastratum/v1",
      itineraryVersion: "campaign-itinerary/v1",
      lastResolvedHeat,
      activeOperation: null,
      activeNarrativeEpoch: null,
      narrativeSlots: slots.map((s) => ({
        slotId: s.slotId,
        windowStart: s.windowStart,
        drawnStartDay: s.drawnStartDay,
        durationDays: s.durationDays,
        guaranteed: true,
        activatedArcId: s.activatedArcId,
        status: s.status,
        deferralCount: s.deferralCount,
        drawReceipts: s.drawReceipts,
      })),
      resolvedNarrativeArcIds: [...completedRomanticIds],
      exhaustedContentIds: [],
    },
  };
}

function evaluateDoomsday(day, ctx) {
  const occurrenceTicket = `${ctx.contentVersion}:${ctx.campaignSeed}:${day}:doomsday-occurrence`;
  const rolled = rollPpm(occurrenceTicket);
  const occurs = rolled < ctx.densityPpm;

  const activeGuaranteed = Boolean(ctx.activeNarrativeEpoch);
  const pending = ctx.slots.filter((s) => s.status === "pending");
  let blockForFeasible = false;
  let deferSlot = null;
  for (const slot of pending) {
    const lastStart = 31 - slot.durationDays;
    if (day === lastStart) blockForFeasible = true;
    if (
      occurs &&
      slot.drawnStartDay === day &&
      slot.drawnStartDay < lastStart &&
      slot.deferralCount < 1
    ) {
      deferSlot = slot.slotId;
    }
  }

  if (!occurs) return { fire: false, suppressed: false };
  if (activeGuaranteed || blockForFeasible || deferSlot) {
    return {
      fire: false,
      suppressed: true,
      deferSlot,
      record: {
        status: "SUPPRESSED",
        day,
        ticket: occurrenceTicket,
        reason: activeGuaranteed
          ? "active-guaranteed-arc"
          : deferSlot
            ? "slot-deferred"
            : "last-feasible-start",
      },
      occurrenceTicket,
    };
  }
  return {
    fire: true,
    suppressed: false,
    eventId: "doomsday-shell",
    occurrenceTicket,
  };
}

export function itinerariesEqual(a, b) {
  return JSON.stringify(a.dockets) === JSON.stringify(b.dockets);
}
