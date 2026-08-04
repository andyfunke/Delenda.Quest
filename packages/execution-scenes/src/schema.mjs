/**
 * §4.17 ExecutionScene schema — no numeric roll fields on doomsday.
 */

export const EXECUTION_SCENE_VERSION = "execution-scene/v1";

export const REQUIRED_SUBSUMMARY_FIELDS = Object.freeze({
  operations: [
    "operationId",
    "maneuverId",
    "sectorId",
    "stageAdvanced",
    "status",
    "losses",
    "groundMovementKm",
    "residueIdsCreated",
  ],
  production: ["outputDeltas", "shortageFlags"],
  personnel: ["casualties", "replacements", "desertions", "readinessDelta"],
  domestic: ["stabilityDelta", "moraleDelta", "incidentIds"],
  network: ["networkStateTransitions"],
  adversary: ["posture", "estimateBand", "disclosedEventIds"],
  narrative: ["arcId", "beatIndex", "choiceId", "residueIds"],
  doomsday: ["occurred", "eventId", "outcomeClass"],
  residues: ["residueId", "sourceId", "createdDay", "expiresDay"],
  nextDayCondition: ["projectedPressureMarkers", "lapsedOrderCount"],
});

export const FORBIDDEN_DOOMSDAY_KEYS = Object.freeze([
  "roll",
  "rollPpm",
  "terminalRoll",
  "sealedRoll",
  "_sealedTerminalRollPpm",
  "occurrenceRoll",
]);

export function validateExecutionScene(scene) {
  const failures = [];
  if (!scene || scene.version !== EXECUTION_SCENE_VERSION) {
    failures.push("VERSION");
  }
  for (const key of [
    "resolvedDay",
    "resolutionId",
    "mainThread",
    "operations",
    "production",
    "personnel",
    "domestic",
    "network",
    "adversary",
    "residues",
    "nextDayCondition",
    "realizationId",
  ]) {
    if (scene?.[key] == null) failures.push(`MISSING:${key}`);
  }
  for (const [section, fields] of Object.entries(REQUIRED_SUBSUMMARY_FIELDS)) {
    if (section === "narrative" || section === "doomsday") {
      if (scene[section] == null) continue;
    }
    if (section === "residues") {
      for (const row of scene.residues ?? []) {
        for (const field of fields) {
          // expiresDay may be null (open-ended residue)
          if (field === "expiresDay") {
            if (!("expiresDay" in row)) failures.push(`RESIDUE:${field}`);
            continue;
          }
          if (row[field] == null) failures.push(`RESIDUE:${field}`);
        }
      }
      continue;
    }
    const target = scene[section];
    if (!target) continue;
    for (const field of fields) {
      // doomsday eventId/outcomeClass may be null when occurred=false
      if (section === "doomsday" && (field === "eventId" || field === "outcomeClass")) {
        if (!("occurred" in target)) failures.push(`${section}:${field}`);
        continue;
      }
      if (target[field] == null) failures.push(`${section}:${field}`);
    }
  }
  if (scene.operations?.losses) {
    if (
      scene.operations.losses.personnel == null ||
      scene.operations.losses.materiel == null
    ) {
      failures.push("operations:losses.shape");
    }
  }
  if (scene.doomsday) {
    if (!["nonterminal", "near-miss", "terminal", null].includes(scene.doomsday.outcomeClass) &&
        scene.doomsday.occurred) {
      // outcomeClass required when occurred
    }
    if (scene.doomsday.occurred && !scene.doomsday.outcomeClass) {
      failures.push("doomsday:outcomeClass");
    }
    for (const key of FORBIDDEN_DOOMSDAY_KEYS) {
      if (Object.prototype.hasOwnProperty.call(scene.doomsday, key)) {
        failures.push(`DOOMSDAY_ROLL_LEAK:${key}`);
      }
    }
    // Grep-style: no numeric roll* keys
    for (const key of Object.keys(scene.doomsday)) {
      if (/roll/i.test(key) || /ppm/i.test(key)) {
        failures.push(`DOOMSDAY_NUMERIC_ROLL_FIELD:${key}`);
      }
    }
  }
  if (scene.adversary && "actualForce" in scene.adversary) {
    failures.push("HIDDEN_ADVERSARY");
  }
  return { ok: failures.length === 0, failures };
}

/** Structural proof that schema source forbids roll fields. */
export function schemaForbidsDoomsdayRolls(schemaSource) {
  return (
    schemaSource.includes("FORBIDDEN_DOOMSDAY_KEYS") &&
    !/doomsday:\s*\{[^}]*rollPpm/s.test(schemaSource)
  );
}
