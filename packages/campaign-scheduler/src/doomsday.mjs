/**
 * Epoch 024 sealed Doomsday occurrence + terminal resolution.
 */

import { rollPpm, stableHash } from "./hash.mjs";

export function occurrenceTicket(contentVersion, campaignSeed, day) {
  return `${contentVersion}:${campaignSeed}:${day}:doomsday-occurrence`;
}

export function eventOccurs(contentVersion, campaignSeed, day, densityPpm) {
  const ticket = occurrenceTicket(contentVersion, campaignSeed, day);
  return {
    ticket,
    occurs: rollPpm(ticket) < densityPpm,
    rollPpm: rollPpm(ticket),
  };
}

export function stateSeal(visibleState, authorityStateDigest) {
  const payload = JSON.stringify({ visibleState, authorityStateDigest });
  return String(rollPpm(`seal:${payload}`)).padStart(6, "0");
}

export function terminalTicket(contentVersion, campaignSeed, day, eventId, seal) {
  return `${contentVersion}:${campaignSeed}:${day}:${eventId}:${seal}`;
}

export function terminalProbabilityPpm(event, day, lateRunAdjustmentPpm = 0) {
  const pressure = event.allowedStatePressure?.maxPpm ?? 0;
  // Preview uses declared max pressure bound; final resolution uses sealed state.
  const raw =
    event.baseTerminalPpm +
    (event._resolvedPressurePpm ?? 0) +
    lateRunAdjustmentPpm;
  return Math.max(50_000, Math.min(450_000, raw));
}

export function resolveDoomsdayEvent(input) {
  const {
    contentVersion,
    campaignSeed,
    day,
    event,
    densityPpm,
    visibleState,
    authorityStateDigest,
    lateRunAdjustmentPpm = 0,
    suppressed = false,
  } = input;

  const occurrence = eventOccurs(contentVersion, campaignSeed, day, densityPpm);
  if (suppressed) {
    return {
      status: "SUPPRESSED",
      occurrenceTicket: occurrence.ticket,
      terminalTicket: null,
      outcomeClass: null,
    };
  }
  if (!occurrence.occurs) {
    return {
      status: "NO_OCCURRENCE",
      occurrenceTicket: occurrence.ticket,
      terminalTicket: null,
      outcomeClass: null,
    };
  }

  const seal = stateSeal(visibleState, authorityStateDigest);
  const tTicket = terminalTicket(
    contentVersion,
    campaignSeed,
    day,
    event.id,
    seal,
  );
  const pressure = Math.min(
    event.allowedStatePressure.maxPpm,
    Math.floor(stableHash(`${seal}:pressure`) * event.allowedStatePressure.maxPpm),
  );
  const pTerminal = terminalProbabilityPpm(
    { ...event, _resolvedPressurePpm: pressure },
    day,
    lateRunAdjustmentPpm,
  );
  const terminalRoll = rollPpm(tTicket);
  let outcomeClass = "nonterminal";
  if (terminalRoll < pTerminal) outcomeClass = "terminal";
  else if (terminalRoll < pTerminal + 50_000) outcomeClass = "near-miss";

  return {
    status: "OCCURRED",
    occurrenceTicket: occurrence.ticket,
    terminalTicket: tTicket,
    stateSeal: seal,
    terminalProbabilityPpm: pTerminal,
    // Exact roll sealed — not disclosed on player projections.
    _sealedTerminalRollPpm: terminalRoll,
    outcomeClass,
    outcomeId: event.outcomes[outcomeClass === "near-miss" ? "nearMiss" : outcomeClass],
  };
}

export function assertDeclaredBounds(event) {
  const maxAdj = 0;
  const minSum = event.baseTerminalPpm + 0 + 0;
  const maxSum =
    event.baseTerminalPpm + event.allowedStatePressure.maxPpm + maxAdj;
  if (minSum < 50_000 || maxSum > 450_000) {
    throw new Error(`TERMINAL_BOUNDS:${event.id}`);
  }
  return { minSum, maxSum };
}
