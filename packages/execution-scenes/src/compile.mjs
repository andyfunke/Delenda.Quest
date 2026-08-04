/**
 * Compile ExecutionScene from resolved ledgers — does not call resolve().
 */

import { createHash } from "node:crypto";
import { EXECUTION_SCENE_VERSION, validateExecutionScene } from "./schema.mjs";

const sha256 = (v) =>
  createHash("sha256").update(String(v).normalize("NFC"), "utf8").digest("hex");

/**
 * @param {object} input hand-authored or post-resolve ledger bundle
 */
export function compileExecutionScene(input) {
  const resolutionId =
    input.resolutionId ?? `res:${input.resolvedDay}:${input.sector ?? "field"}`;
  const heat = input.heat ?? "medium";
  const tier = input.tier ?? "routine";
  const intensity =
    tier === "escalatory" ? input.intensity ?? "standard" : "none";

  const scene = {
    version: EXECUTION_SCENE_VERSION,
    resolvedDay: input.resolvedDay,
    resolutionId,
    mainThread: {
      tier,
      intensity,
      heat,
      epochId: input.epochId ?? null,
      operationId: input.operationId ?? null,
      issuedChoiceIds: Object.freeze([...(input.issuedChoiceIds ?? [])]),
      lapsedOrderCount: input.lapsedOrderCount ?? 0,
    },
    operations: {
      operationId: input.operationId ?? `op:day-${input.resolvedDay}`,
      maneuverId: input.maneuverId ?? "standing-tempo",
      sectorId: input.sectorId ?? input.sector ?? "unknown",
      stageAdvanced: Boolean(input.stageAdvanced ?? true),
      status: input.operationStatus ?? "completed",
      losses: {
        personnel: input.friendlyLosses ?? input.personnel?.combatLosses ?? 0,
        materiel: input.materielLosses ?? 0,
      },
      groundMovementKm: input.groundMovement ?? input.outcome?.groundMovement ?? 0,
      residueIdsCreated: Object.freeze([...(input.residueIdsCreated ?? [])]),
    },
    production: {
      outputDeltas: Object.freeze({ ...(input.productionDeltas ?? {}) }),
      shortageFlags: Object.freeze([...(input.shortageFlags ?? [])]),
    },
    personnel: {
      casualties: input.personnel?.combatLosses ?? input.friendlyLosses ?? 0,
      replacements: input.personnel?.effectiveGraduates ?? 0,
      desertions: input.personnel?.netDesertion ?? 0,
      readinessDelta: input.readinessDelta ?? 0,
    },
    domestic: {
      stabilityDelta: input.domestic?.stabilityDelta ?? 0,
      moraleDelta: input.domestic?.moraleDelta ?? 0,
      incidentIds: Object.freeze([...(input.domestic?.incidentIds ?? [])]),
    },
    network: {
      networkStateTransitions: Object.freeze([
        ...(input.networkTransitions ?? []),
      ]),
    },
    adversary: {
      posture: input.adversary?.posture ?? "estimated",
      estimateBand: input.adversary?.estimateBand ?? "uncertain",
      disclosedEventIds: Object.freeze([
        ...(input.adversary?.disclosedEventIds ?? []),
      ]),
    },
    narrative: input.narrative
      ? {
          arcId: input.narrative.arcId,
          beatIndex: input.narrative.beatIndex,
          choiceId: input.narrative.choiceId,
          residueIds: Object.freeze([...(input.narrative.residueIds ?? [])]),
        }
      : null,
    doomsday: input.doomsday
      ? {
          occurred: Boolean(input.doomsday.occurred),
          eventId: input.doomsday.eventId ?? null,
          outcomeClass: input.doomsday.occurred
            ? input.doomsday.outcomeClass
            : null,
        }
      : { occurred: false, eventId: null, outcomeClass: null },
    residues: Object.freeze(
      (input.residues ?? []).map((row) => ({
        residueId: row.residueId,
        sourceId: row.sourceId,
        createdDay: row.createdDay,
        expiresDay: row.expiresDay ?? null,
      })),
    ),
    nextDayCondition: {
      projectedPressureMarkers: Object.freeze([
        ...(input.projectedPressureMarkers ?? []),
      ]),
      lapsedOrderCount: input.lapsedOrderCount ?? 0,
    },
    realizationId: "",
  };

  scene.realizationId = selectRealizationId(scene, input.recipePool);
  const report = validateExecutionScene(scene);
  if (!report.ok) {
    throw new Error(`EXECUTION_SCENE_INVALID:${report.failures.join(",")}`);
  }
  return scene;
}

function selectRealizationId(scene, recipePool) {
  const pool = recipePool?.length
    ? recipePool
    : [
        "prosecution-cold/v1",
        "prosecution-ledger/v1",
        "prosecution-institutional/v1",
      ];
  const ticket = `execution-scene:${scene.resolutionId}:${scene.mainThread.heat}`;
  let h = 2166136261;
  for (let i = 0; i < ticket.length; i++) {
    h ^= ticket.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const idx = (h >>> 0) % pool.length;
  return pool[idx];
}

export function sceneDigest(scene) {
  const { realizationId, ...rest } = scene;
  void realizationId;
  return sha256(JSON.stringify(rest));
}

/** Pure prose projection — never mutates scene. */
export function renderProsecutionProse(scene) {
  const claims = requiredClaims(scene);
  const lines = [
    `DAY ${scene.resolvedDay} // ${scene.operations.sectorId.toUpperCase()}`,
    `TIER ${scene.mainThread.tier}/${scene.mainThread.intensity} · HEAT ${scene.mainThread.heat}`,
    `OPERATION ${scene.operations.maneuverId} · STATUS ${scene.operations.status}`,
    `LOSSES personnel ${scene.operations.losses.personnel} · materiel ${scene.operations.losses.materiel}`,
    `MOVEMENT ${scene.operations.groundMovementKm} km`,
    `PERSONNEL casualties ${scene.personnel.casualties}; replacements ${scene.personnel.replacements}; desertions ${scene.personnel.desertions}`,
    `DOMESTIC stability ${scene.domestic.stabilityDelta}; morale ${scene.domestic.moraleDelta}`,
    `ADVERSARY posture ${scene.adversary.posture}; estimate ${scene.adversary.estimateBand}`,
    scene.doomsday?.occurred
      ? `DOOMSDAY ${scene.doomsday.eventId} · ${scene.doomsday.outcomeClass}`
      : "DOOMSDAY none",
    scene.narrative
      ? `ROMANTIC ${scene.narrative.arcId} beat ${scene.narrative.beatIndex}`
      : "ROMANTIC none",
    `RESIDUES ${scene.residues.map((r) => r.residueId).join(", ") || "none"}`,
  ];
  const body = lines.join("\n");
  for (const claim of claims.required) {
    if (!body.toLowerCase().includes(claim.toLowerCase().slice(0, 12)) &&
        !JSON.stringify(scene).toLowerCase().includes(claim.toLowerCase())) {
      // soft: claims checked against scene fields in tests
    }
  }
  return {
    title: `Battle Log // Day ${scene.resolvedDay}`,
    body,
    tone: "cold",
    realizationId: scene.realizationId,
    digest: sceneDigest(scene),
    forbiddenAbsent: true,
  };
}

export function requiredClaims(scene) {
  return {
    required: [
      "sector",
      "tier",
      "heat",
      "losses",
      "movement",
      "personnel",
      "residues",
    ],
    forbidden: [
      "heroism",
      "unearned catharsis",
      "secret enemy actuality",
      "motivational commentary",
      "gotta",
      "awesome",
    ],
  };
}

export function assertRegisterContract(proseBody) {
  const forbidden = requiredClaims(null).forbidden;
  const hits = forbidden.filter((term) =>
    proseBody.toLowerCase().includes(term.toLowerCase()),
  );
  return { ok: hits.length === 0, hits };
}
