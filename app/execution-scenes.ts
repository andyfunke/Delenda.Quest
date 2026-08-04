/**
 * Typed adapter over packages/execution-scenes — Epoch 025 prosecution compiler.
 */

export type ExecutionScene = {
  version: string;
  resolvedDay: number;
  resolutionId: string;
  mainThread: {
    tier: string;
    intensity: string;
    heat: string;
    epochId: string | null;
    operationId: string | null;
    issuedChoiceIds: readonly string[];
    lapsedOrderCount: number;
  };
  operations: {
    operationId: string;
    maneuverId: string;
    sectorId: string;
    stageAdvanced: boolean;
    status: string;
    losses: { personnel: number; materiel: number };
    groundMovementKm: number;
    residueIdsCreated: readonly string[];
  };
  production: {
    outputDeltas: Readonly<Record<string, number>>;
    shortageFlags: readonly string[];
  };
  personnel: {
    casualties: number;
    replacements: number;
    desertions: number;
    readinessDelta: number;
  };
  domestic: {
    stabilityDelta: number;
    moraleDelta: number;
    incidentIds: readonly string[];
  };
  network: {
    networkStateTransitions: readonly {
      sectorId: string;
      from: string;
      to: string;
    }[];
  };
  adversary: {
    posture: string;
    estimateBand: string;
    disclosedEventIds: readonly string[];
  };
  narrative: {
    arcId: string;
    beatIndex: number;
    choiceId: string;
    residueIds: readonly string[];
  } | null;
  doomsday: {
    occurred: boolean;
    eventId: string | null;
    outcomeClass: "nonterminal" | "near-miss" | "terminal" | null;
  } | null;
  residues: readonly {
    residueId: string;
    sourceId: string;
    createdDay: number;
    expiresDay: number | null;
  }[];
  nextDayCondition: {
    projectedPressureMarkers: readonly string[];
    lapsedOrderCount: number;
  };
  realizationId: string;
};

export {
  EXECUTION_SCENE_VERSION,
  FORBIDDEN_DOOMSDAY_KEYS,
  REQUIRED_SUBSUMMARY_FIELDS,
  assertRegisterContract,
  compileExecutionScene,
  renderProsecutionProse,
  requiredClaims,
  sceneDigest,
  schemaForbidsDoomsdayRolls,
  validateExecutionScene,
} from "../packages/execution-scenes/src/index.mjs";
