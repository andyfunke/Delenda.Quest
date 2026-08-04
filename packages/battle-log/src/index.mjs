/**
 * Battle Log semantic helpers — Epoch 026.
 * Pure projections over persisted ExecutionScene records.
 */

export const OUT_OF_CAMPAIGN_NOTICE =
  "No active campaign; completed campaigns live under Account → Campaign Records.";

export const SURFACE_SUPPORT = Object.freeze({
  "resolve-day": {
    web: true,
    "ava-nexus": true,
    "terminal-core": true,
    "native-ssh": true,
  },
  "battle-log-read": {
    web: true,
    "ava-nexus": true,
    "terminal-core": true,
    "native-ssh": true,
  },
  "battle-log-auto-open-focus": {
    web: true,
    "ava-nexus": "unread-affordance",
    "terminal-core": "unread-affordance",
    "native-ssh": "unread-affordance",
  },
  "contentgen-lab": {
    web: "admin-only",
    "ava-nexus": false,
    "terminal-core": false,
    "native-ssh": false,
  },
  "account-campaign-records": {
    web: "account-page",
    "ava-nexus": false,
    "terminal-core": false,
    "native-ssh": false,
  },
});

export function battleLogEntryFromRecord(record) {
  const scene = record.executionScene;
  return {
    day: record.resolvedDay,
    sector: record.sector,
    tier: scene?.mainThread?.tier ?? "routine",
    intensity: scene?.mainThread?.intensity ?? "none",
    heat: scene?.mainThread?.heat ?? null,
    romanticEpoch: scene?.narrative?.arcId ?? null,
    continuingOperation: scene?.operations?.operationId ?? null,
    outcome: record.outcome?.outcomeBand ?? null,
    losses: scene?.operations?.losses ?? {
      personnel: record.personnel?.combatLosses ?? 0,
      materiel: 0,
    },
    movement: scene?.operations?.groundMovementKm ?? record.outcome?.groundMovement ?? 0,
    doomsdayStatus: scene?.doomsday?.occurred
      ? scene.doomsday.outcomeClass
      : "none",
    residues: scene?.residues ?? [],
    realizationId: record.realizationId ?? scene?.realizationId ?? null,
    resolutionId: scene?.resolutionId ?? `res:${record.resolvedDay}`,
    semanticId: scene?.resolutionId ?? `res:${record.resolvedDay}`,
  };
}

export function battleLogEntries(resolutionHistory) {
  return (resolutionHistory ?? []).map(battleLogEntryFromRecord);
}

export function semanticIdsForSurfaces(entry) {
  const id = entry.semanticId;
  return {
    web: id,
    "ava-nexus": id,
    "terminal-core": id,
    "native-ssh": id,
    "contentgen-lab": null,
    "account-campaign-records": null,
  };
}

export function outOfCampaignBattleLogNotice(hasActiveCampaign) {
  if (hasActiveCampaign) return null;
  return OUT_OF_CAMPAIGN_NOTICE;
}

export function focusAfterManualResolve({ source, resolvedDay, priorFocus }) {
  if (source === "manual") {
    return { surface: "battle-log", focusDay: resolvedDay, unreadDay: null };
  }
  // Automatic: do not steal focus; unread affordance only (§4.15)
  return {
    surface: priorFocus ?? null,
    focusDay: null,
    unreadDay: resolvedDay,
  };
}
