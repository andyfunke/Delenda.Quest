/** §4.10 campaign metastratum types + ContentLink (Epoch 019). */

export const METASTRATUM_VERSION = "campaign-metastratum/v1";
export const ITINERARY_VERSION = "campaign-itinerary/v1";
export const MAGNITUDE_TABLE_VERSION = "magnitude-table/v1";
export const DOOMSDAY_TABLE_VERSION = "doomsday-table/v1";
export const LATE_RUN_TABLE_VERSION = "late-run-adjustment/v1";

export const CAMPAIGN_TIERS = ["routine", "romantic", "escalatory"];
export const ESCALATION_INTENSITIES = ["none", "standard", "maximum"];
export const TERMINAL_RISKS = ["none", "doomsday"];
export const PROCEDURE_HEATS = ["hot", "medium"];

/** Tier/intensity legality §4.12(a). */
export function assertTierIntensityLegal(tier, intensity) {
  if (tier === "routine" && intensity === "none") return true;
  if (tier === "romantic" && intensity === "none") return true;
  if (tier === "escalatory" && (intensity === "standard" || intensity === "maximum")) {
    return true;
  }
  throw new Error(`ILLEGAL_TIER_INTENSITY:${tier}:${intensity}`);
}

/**
 * ContentLink — points to mechanic IDs and realization/spine IDs.
 * Never a filesystem symlink (R02).
 */
export function contentLink(input) {
  if (!input?.id || !input?.kind || !input?.targetId) {
    throw new Error("CONTENT_LINK_INVALID");
  }
  if (String(input.targetId).includes("/") || String(input.targetId).includes("\\")) {
    // Allow namespaced ids with `/`? Spec says no filesystem symlinks — reject path-like.
    if (String(input.targetId).includes("..")) throw new Error("CONTENT_LINK_PATH_FORBIDDEN");
  }
  return {
    id: input.id,
    kind: input.kind,
    targetId: input.targetId,
    mechanicIds: Object.freeze([...(input.mechanicIds ?? [])]),
    realizationIds: Object.freeze([...(input.realizationIds ?? [])]),
    spineIds: Object.freeze([...(input.spineIds ?? [])]),
  };
}

export function emptyMetastratum() {
  return {
    version: METASTRATUM_VERSION,
    itineraryVersion: ITINERARY_VERSION,
    magnitudeTableVersion: MAGNITUDE_TABLE_VERSION,
    doomsdayTableVersion: DOOMSDAY_TABLE_VERSION,
    lastResolvedHeat: null,
    activeOperation: null,
    activeNarrativeEpoch: null,
    narrativeSlots: [
      slotTemplate("A", [3, 8]),
      slotTemplate("B", [10, 17]),
      slotTemplate("C", [19, 27]),
    ],
    resolvedNarrativeArcIds: [],
    exhaustedContentIds: [],
  };
}

function slotTemplate(slotId, windowStart) {
  return {
    slotId,
    windowStart,
    drawnStartDay: null,
    durationDays: null,
    guaranteed: true,
    activatedArcId: null,
    status: "pending",
    deferralCount: 0,
    drawReceipts: [],
  };
}

/** Restore defaults for pre-metastratum saves — no docket reroll. */
export function restoreMetastratum(save) {
  const next = { ...save };
  if (!next.metastratum) {
    next.metastratum = emptyMetastratum();
  } else {
    next.metastratum = {
      ...emptyMetastratum(),
      ...next.metastratum,
      activeOperation: next.metastratum.activeOperation ?? null,
    };
  }
  return next;
}
