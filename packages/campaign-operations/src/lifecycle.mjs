/**
 * ActiveOperation lifecycle — start/continue/redirect/abort/complete.
 * Exactly one stage advances per authorized day. Replay is idempotent.
 */

export const OPERATION_TRANSITIONS = Object.freeze({
  start: ["active"],
  continue: ["active"],
  romanticOverlay: ["active"],
  redirect: ["active"],
  abort: ["aborted"],
  complete: ["completed"],
  collapse: ["collapsed"],
  duplicateResolution: ["active", "completed", "aborted", "collapsed"],
});

export function startOperation(input) {
  const durationDays = input.durationDays;
  if (durationDays !== 2 && durationDays !== 3) {
    throw new Error("OPERATION_DURATION_INVALID");
  }
  if (!input.maneuverId || !input.sectorId || !input.standingIntentId) {
    throw new Error("OPERATION_FIELDS_REQUIRED");
  }
  return {
    operationId: input.operationId ?? `op:${input.maneuverId}:${input.startedDay}`,
    maneuverId: input.maneuverId,
    sectorId: input.sectorId,
    startedDay: input.startedDay,
    durationDays,
    stageIndex: 0,
    standingIntentId: input.standingIntentId,
    mechanicSnapshot: Object.freeze({ ...(input.mechanicSnapshot ?? {}) }),
    status: "active",
    requiresDecisionBeat: Boolean(input.requiresDecisionBeat),
    resolutionIds: [],
  };
}

export function advanceOperationDay(operation, input) {
  if (!operation) throw new Error("NO_ACTIVE_OPERATION");
  if (operation.status !== "active") {
    // Idempotent replay of a closed operation day.
    if (input.resolutionId && operation.resolutionIds.includes(input.resolutionId)) {
      return operation;
    }
    throw new Error("OPERATION_NOT_ACTIVE");
  }
  if (input.resolutionId && operation.resolutionIds.includes(input.resolutionId)) {
    return operation; // idempotent
  }

  const action = input.action ?? "continue";
  if (action === "romanticOverlay") {
    // Standing intent continues; stage still advances for the day.
  }
  if (action === "abort") {
    return close(operation, "aborted", input, {
      residueIds: [`${operation.operationId}:abort-residue`],
    });
  }
  if (action === "collapse") {
    return close(operation, "collapsed", input, {
      residueIds: [`${operation.operationId}:collapse-residue`],
    });
  }
  if (action === "redirect") {
    if (!input.redirectMechanicId) throw new Error("REDIRECT_MECHANIC_REQUIRED");
    // Redirect lowers into declared mechanic; stage advances once.
  }

  const nextStage = operation.stageIndex + 1;
  if (nextStage >= operation.durationDays || action === "complete") {
    return close(operation, "completed", input, {
      residueIds: [`${operation.operationId}:complete-residue`],
      stageIndex: Math.min(nextStage, operation.durationDays),
    });
  }

  return {
    ...operation,
    stageIndex: nextStage,
    maneuverId:
      action === "redirect" ? input.redirectMechanicId : operation.maneuverId,
    resolutionIds: [...operation.resolutionIds, input.resolutionId].filter(Boolean),
    requiresDecisionBeat: false,
  };
}

function close(operation, status, input, extra = {}) {
  return {
    ...operation,
    status,
    stageIndex: extra.stageIndex ?? operation.stageIndex + 1,
    resolutionIds: [...operation.resolutionIds, input.resolutionId].filter(Boolean),
    residueIds: extra.residueIds ?? [],
    requiresDecisionBeat: false,
  };
}

/**
 * Legacy one-day manoeuvre — never creates ActiveOperation (§4.10 / Epoch 021.6).
 */
export function resolveLegacyOneDayManeuver(save, maneuverId, resolutionId) {
  if (save.metastratum?.activeOperation) {
    throw new Error("LEGACY_PATH_BLOCKED_BY_ACTIVE_OPERATION");
  }
  if (save._legacyResolvedIds?.includes(resolutionId)) {
    return save; // idempotent — execute once
  }
  return {
    ...save,
    maneuver: null,
    _legacyResolvedIds: [...(save._legacyResolvedIds ?? []), resolutionId],
    lastLegacyManeuverId: maneuverId,
  };
}

export function migratePreMetastratumSave(save) {
  return {
    ...save,
    metastratum: {
      ...(save.metastratum ?? {}),
      activeOperation: null,
      version: save.metastratum?.version ?? "campaign-metastratum/v1",
    },
    // Docket / day fields untouched — no reroll.
  };
}

export function mainThreadPrompt(input) {
  const continuing = input.continuingOperation
    ? {
        operationId: input.continuingOperation.operationId,
        maneuverId: input.continuingOperation.maneuverId,
        stageIndex: input.continuingOperation.stageIndex,
        status: input.continuingOperation.status,
      }
    : null;

  switch (input.kind) {
    case "routine":
      return {
        kind: "routine",
        situation: input.situation,
        continuingOperation: continuing,
      };
    case "operation":
      return { kind: "operation", operation: input.operation };
    case "romantic":
      return {
        kind: "romantic",
        arc: input.arc,
        continuingOperation: continuing,
      };
    case "escalatory":
      return {
        kind: "escalatory",
        event: input.event,
        continuingOperation: continuing,
      };
    default:
      throw new Error(`UNKNOWN_MAIN_THREAD_KIND:${input.kind}`);
  }
}

/** Semantic ID equality helper for surface parity tests. */
export function semanticIdsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
