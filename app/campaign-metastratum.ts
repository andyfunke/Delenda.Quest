/**
 * Campaign metastratum contracts — types and restore defaults (Epoch 019).
 * Selection/resolution changes arrive in later epochs.
 */

export type CampaignTier = "routine" | "romantic" | "escalatory";
export type EscalationIntensity = "none" | "standard" | "maximum";
export type TerminalRisk = "none" | "doomsday";
export type ProcedureHeat = "hot" | "medium";

export type ContentLink = {
  id: string;
  kind: string;
  targetId: string;
  mechanicIds: readonly string[];
  realizationIds: readonly string[];
  spineIds: readonly string[];
};

export type ActiveOperation = {
  operationId: string;
  maneuverId: string;
  sectorId: string;
  startedDay: number;
  durationDays: 2 | 3;
  stageIndex: number;
  standingIntentId: string;
  mechanicSnapshot: unknown;
  status: "active" | "completed" | "aborted" | "collapsed";
};

export type ActiveNarrativeEpoch = {
  instanceId: string;
  arcId: string;
  startedDay: number;
  durationDays: 1 | 2 | 3;
  beatIndex: number;
  choiceHistory: readonly string[];
  residueIds: readonly string[];
  status: "active" | "completed" | "interrupted";
};

export type NarrativeSlot = {
  slotId: "A" | "B" | "C";
  windowStart: readonly [number, number];
  drawnStartDay: number | null;
  durationDays: 1 | 2 | 3 | null;
  guaranteed: true;
  activatedArcId: string | null;
  status: "pending" | "active" | "completed";
  deferralCount: number;
  drawReceipts: readonly string[];
};

export type CampaignMetastratum = {
  version: string;
  itineraryVersion: string;
  magnitudeTableVersion: string;
  doomsdayTableVersion: string;
  lastResolvedHeat: ProcedureHeat | null;
  activeOperation: ActiveOperation | null;
  activeNarrativeEpoch: ActiveNarrativeEpoch | null;
  narrativeSlots: readonly NarrativeSlot[];
  resolvedNarrativeArcIds: readonly string[];
  exhaustedContentIds: readonly string[];
};

export const METASTRATUM_VERSION = "campaign-metastratum/v1";

export function createDefaultMetastratum(): CampaignMetastratum {
  return {
    version: METASTRATUM_VERSION,
    itineraryVersion: "campaign-itinerary/v1",
    magnitudeTableVersion: "magnitude-table/v1",
    doomsdayTableVersion: "doomsday-table/v1",
    lastResolvedHeat: null,
    activeOperation: null,
    activeNarrativeEpoch: null,
    narrativeSlots: [
      {
        slotId: "A",
        windowStart: [3, 8],
        drawnStartDay: null,
        durationDays: null,
        guaranteed: true,
        activatedArcId: null,
        status: "pending",
        deferralCount: 0,
        drawReceipts: [],
      },
      {
        slotId: "B",
        windowStart: [10, 17],
        drawnStartDay: null,
        durationDays: null,
        guaranteed: true,
        activatedArcId: null,
        status: "pending",
        deferralCount: 0,
        drawReceipts: [],
      },
      {
        slotId: "C",
        windowStart: [19, 27],
        drawnStartDay: null,
        durationDays: null,
        guaranteed: true,
        activatedArcId: null,
        status: "pending",
        deferralCount: 0,
        drawReceipts: [],
      },
    ],
    resolvedNarrativeArcIds: [],
    exhaustedContentIds: [],
  };
}

/** Initialize absent metastratum fields without rerolling dockets. */
export function restoreCampaignSaveWithMetastratum<T extends Record<string, unknown>>(
  save: T,
): T & { metastratum: CampaignMetastratum } {
  const existing = save.metastratum as CampaignMetastratum | undefined;
  return {
    ...save,
    metastratum: existing
      ? {
          ...createDefaultMetastratum(),
          ...existing,
          activeOperation: existing.activeOperation ?? null,
        }
      : createDefaultMetastratum(),
  };
}
