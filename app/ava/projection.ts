import {
  directorForState,
  maneuverById,
  maneuverChance,
  projectProduction,
  situationForState,
  type GameState,
  type Maneuver,
} from "../game";
import {
  domesticCircuit,
  executeCircuit,
  operationsCircuit,
} from "../circuits";
import { campaignBalanceProfile } from "../campaign-balance";
import { cognitiveDigest } from "./cognitive-types";

const midpoint = (left: number, right: number) => (left + right) / 2;
const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value));

/**
 * Projection circuits need deterministic seed material, but the campaign RNG
 * seed is private discovery state. Ava derives a projection-only seed from the
 * already disclosed campaign identifier so forecasts cannot become a raw-seed
 * equality oracle.
 */
export const avaDisclosedProjectionSeed = (campaignId: string) =>
  Number.parseInt(
    cognitiveDigest({
      policy: "AVA_DISCLOSED_PROJECTION_SEED_V1",
      campaignId,
    }).slice(0, 8),
    16,
  );
const tempoProfile = {
  hold: { casualty: 0.55, supply: 0.65, pressure: -0.25 },
  methodical: { casualty: 1, supply: 1, pressure: 0.35 },
  surge: { casualty: 1.35, supply: 1.4, pressure: 0.85 },
  "human-wave": { casualty: 2.1, supply: 1.2, pressure: 1.25 },
} satisfies Record<
  GameState["tempo"],
  { casualty: number; supply: number; pressure: number }
>;

const disclosedAdversaryLedger = (
  state: GameState,
): GameState["adversaryLedger"] => {
  const ledger = state.adversaryLedger;
  if (!ledger) return null;
  const intelConfidence = clamp(state.intelligence, 10, 95);
  const estimatedForce = Math.max(1, state.enemy);
  const uncertainty = (100 - intelConfidence) / 160;
  const estimateLow = Math.round(estimatedForce * (1 - uncertainty));
  const estimateHigh = Math.round(estimatedForce * (1 + uncertainty));
  const deploymentShare = 0.48;
  const observedOrders = [...ledger.observedOrders];
  const operation =
    observedOrders.find((order) => order.startsWith("OPERATIONS")) ?? "";
  const pressure = operation.includes("Concentrated Assault")
    ? 1.05
    : operation.includes("Exploit")
      ? 0.85
      : operation.includes("Counterstroke")
        ? 0.7
        : operation.includes("Reconstitute")
          ? 0.05
          : 0.35;
  const networkInterference = observedOrders.some((order) =>
    order.includes("Attack Relay Custody"),
  )
    ? 0.15
    : 0;
  return {
    day: ledger.day,
    objective: state.currentSituation?.sector ?? "Unclassified",
    posture: "Disclosed estimate",
    productionTarget: "Unclassified",
    countermeasure: "Unclassified",
    orders: observedOrders,
    observedOrders,
    hiddenOrders: ledger.hiddenOrders,
    pressure,
    powerFactor: 1,
    networkInterference,
    deceptionPenalty: 0,
    friendlyLossFactor: 1,
    reinforcement: 0,
    munitionsOpening: 0,
    munitionsOutput: 0,
    munitionsUse: 0,
    munitionsClosing: 0,
    doctrineGain: 0,
    actualForce: estimatedForce,
    estimatedForce,
    estimateLow,
    estimateHigh,
    deploymentShare,
    deployedEstimate: Math.round(estimatedForce * deploymentShare),
    deployedLow: Math.round(estimateLow * deploymentShare),
    deployedHigh: Math.round(estimateHigh * deploymentShare),
    intelConfidence,
    adaptation: {},
    signals: [...ledger.signals],
  };
};

/**
 * Removes adversary actuality before any read-only projection or cognitive
 * evaluation. Cached visible docket artifacts remain available, but a missing
 * cache can only be regenerated from disclosed assumptions.
 */
export const projectAvaDisclosedState = (state: GameState): GameState => ({
  ...state,
  campaignSeed: avaDisclosedProjectionSeed(state.campaignId),
  adversary: {
    force: Math.max(1, state.enemy),
    readiness: 65,
    equipment: 65,
    munitions: 0,
    munitionsOutput: 0,
    munitionsUse: 0,
    doctrine: 0,
    objective: "Unclassified",
    posture: "Methodical Pressure",
    productionTarget: "Unclassified",
    countermeasure: "Unclassified",
    maneuverCounts: {},
    adaptation: {},
    lastOrders: [],
    estimateBias: 1,
  },
  adversaryLedger: disclosedAdversaryLedger(state),
  operationalFacts: state.operationalFacts.filter((fact) => fact.visible),
});

const disclosedOperation = (
  state: GameState,
  maneuver: Maneuver | null,
  roll: number,
) => {
  const projected = projectAvaDisclosedState(state);
  const situation = situationForState(projected);
  const director = directorForState(projected);
  const balance = campaignBalanceProfile(projected.campaignSeed);
  const tempo = tempoProfile[projected.tempo];
  const shortages = Object.values(projected.production).filter(
    (line) => line.stock < line.use * 2,
  ).length;
  const opportunityPressure =
    projected.opportunityHistory.find(
      (record) => record.day === projected.day,
    )?.friendlyPressure ?? 0;
  return executeCircuit(operationsCircuit, projected, {
    situation,
    maneuver,
    roll,
    confidence: maneuver ? maneuverChance(projected, maneuver) : 1,
    tempoCasualty: tempo.casualty,
    tempoSupply: tempo.supply * (maneuver?.supply ?? 1),
    tempoPressure: tempo.pressure,
    shortages,
    directorCasualty: director.modifiers.casualty,
    directorFriendlyPressure:
      director.modifiers.friendlyPressure +
      opportunityPressure +
      (maneuver ? balance.pacingPressure : 0),
    directorEnemyPressure: director.modifiers.enemyPressure,
    directorSupplyConversion: director.modifiers.supplyConversion,
  }).ledger;
};

const disclosedPersonnel = (
  state: GameState,
  maneuver: Maneuver | null,
  casualty: number,
) => {
  const director = directorForState(state);
  const desertion = Math.round(
    (260 + state.desertionPressure * 31 + state.forced * 0.018) *
      (state.reciprocity < 45 ? 1.25 : 1) *
      director.modifiers.desertion,
  );
  const retentionRate =
    state.active.desertion === "rations"
      ? 0.35
      : state.active.desertion === "amnesty"
        ? 0.22
        : state.active.desertion === "stations"
          ? 0.12
          : 0;
  const patrolRate = Math.min(0.65, state.patrolCommitment / 7200);
  const retained = Math.min(
    desertion,
    Math.round(desertion * retentionRate),
  );
  const intercepted = Math.min(
    desertion - retained,
    Math.round(desertion * patrolRate),
  );
  return {
    casualty,
    desertion,
    retained,
    intercepted,
    netDesertion: Math.max(0, desertion - retained - intercepted),
    retentionRate,
    patrolRate,
    supply:
      tempoProfile[state.tempo].supply *
      (maneuver?.supply ?? 1) *
      director.modifiers.supplyUse,
  };
};

/**
 * Ava never forecasts a maneuver with the sealed resolution ticket. The
 * disclosed envelope uses controlled success and disruption points from the
 * authoritative operations circuit and keeps both bounds inspectable.
 */
export const projectAvaEnvelope = (
  state: GameState,
  requestedManeuver?: Maneuver | null,
) => {
  const maneuver =
    requestedManeuver === undefined
      ? maneuverById(state.maneuver)
      : requestedManeuver;
  const disclosed = projectAvaDisclosedState(state);
  const confidence = maneuver
    ? maneuverChance(disclosed, maneuver)
    : 1;
  const standing = maneuver
    ? null
    : disclosedOperation(disclosed, null, 0);
  const range = maneuver
    ? {
        success: disclosedOperation(
          disclosed,
          maneuver,
          confidence - 0.1,
        ),
        failure: disclosedOperation(
          disclosed,
          maneuver,
          confidence + 0.1,
        ),
      }
    : null;
  const low = range?.success ?? standing!;
  const high = range?.failure ?? standing!;
  const friendlyLossLow = Math.min(
    low.friendlyLosses,
    high.friendlyLosses,
  );
  const friendlyLossHigh = Math.max(
    low.friendlyLosses,
    high.friendlyLosses,
  );
  const friendlyLoss = Math.round(
    midpoint(friendlyLossLow, friendlyLossHigh),
  );
  const groundLow = Math.min(low.groundMovement, high.groundMovement);
  const groundHigh = Math.max(low.groundMovement, high.groundMovement);
  const groundMovement = midpoint(groundLow, groundHigh);
  const forceRatio = midpoint(low.forceRatio, high.forceRatio);
  const personnel = disclosedPersonnel(
    disclosed,
    maneuver ?? null,
    friendlyLoss,
  );
  const production = projectProduction(disclosed);
  const director = directorForState(disclosed);
  const shortages = Object.values(disclosed.production).filter(
    (line) => line.stock < line.use * 2,
  ).length;
  const domestic = executeCircuit(domesticCircuit, disclosed, {
    friendlyLosses: friendlyLoss,
    shortages,
    directorLegitimacy: director.modifiers.legitimacy,
    directorResistance: director.modifiers.resistance,
  }).ledger;
  return {
    maneuver: low.maneuver,
    maneuverLabel: low.maneuver,
    operationallyAvailable: midpoint(
      low.operationallyAvailable,
      high.operationallyAvailable,
    ),
    nominalCommitment: midpoint(
      low.nominalCommitment,
      high.nominalCommitment,
    ),
    committed: midpoint(low.committed, high.committed),
    packageEfficiency: midpoint(
      low.packageEfficiency,
      high.packageEfficiency,
    ),
    combatEquivalent: midpoint(
      low.combatEquivalent,
      high.combatEquivalent,
    ),
    frontageDemand: midpoint(low.frontageDemand, high.frontageDemand),
    frontageSaturation: midpoint(
      low.frontageSaturation,
      high.frontageSaturation,
    ),
    friendlyPower: midpoint(low.friendlyPower, high.friendlyPower),
    networkFactor: midpoint(low.networkFactor, high.networkFactor),
    intelligenceFactor: midpoint(
      low.intelligenceFactor,
      high.intelligenceFactor,
    ),
    enemyCommitted: midpoint(low.enemyCommitted, high.enemyCommitted),
    enemyCommittedLow: Math.min(
      low.enemyCommittedLow,
      high.enemyCommittedLow,
    ),
    enemyCommittedHigh: Math.max(
      low.enemyCommittedHigh,
      high.enemyCommittedHigh,
    ),
    assessedEnemyPower: midpoint(low.enemyPower, high.enemyPower),
    enemyPower: midpoint(low.enemyPower, high.enemyPower),
    forceRatio,
    boundedForceRatio: clamp(forceRatio, 0.35, 1.8),
    executionConfidence: confidence,
    friendlyLosses: friendlyLoss,
    friendlyLoss,
    friendlyLossLow,
    friendlyLossHigh,
    groundMovement,
    groundLow,
    groundHigh,
    production,
    personnel,
    domestic,
    disclosure:
      maneuver
        ? "Forecast uses the disclosed enemy-force estimate, a standard 65/65 condition assumption, a 48% forward-share assumption, and controlled success/disruption branches. The unresolved outcome is excluded."
        : "Standing-tempo forecast uses the disclosed enemy-force estimate, a standard 65/65 condition assumption, and a 48% forward-share assumption.",
  };
};

export const disclosedAdversaryAssessment = (state: GameState) => {
  const confidence = clamp(state.intelligence, 10, 95);
  const estimatedForce = Math.max(1, state.enemy);
  const uncertainty = (100 - confidence) / 160;
  const estimateLow = Math.round(estimatedForce * (1 - uncertainty));
  const estimateHigh = Math.round(estimatedForce * (1 + uncertainty));
  const deploymentShare = 0.48;
  const observedOrders = [
    ...(state.adversaryLedger?.observedOrders ?? []),
  ];
  const operation =
    observedOrders.find((order) => order.startsWith("OPERATIONS")) ?? "";
  const pressure = operation.includes("Concentrated Assault")
    ? 1.05
    : operation.includes("Exploit")
      ? 0.85
      : operation.includes("Counterstroke")
        ? 0.7
        : operation.includes("Reconstitute")
          ? 0.05
          : 0.35;
  return {
    objective: situationForState(state).sector,
    estimatedForce,
    estimateLow,
    estimateHigh,
    deploymentShare,
    deployedEstimate: Math.round(estimatedForce * deploymentShare),
    deployedLow: Math.round(estimateLow * deploymentShare),
    deployedHigh: Math.round(estimateHigh * deploymentShare),
    intelConfidence: confidence,
    observedOrders,
    hiddenOrders: Math.max(0, 3 - observedOrders.length),
    pressure,
    networkInterference: observedOrders.some((order) =>
      order.includes("Attack Relay Custody"),
    )
      ? 0.15
      : 0,
    signals: [...(state.adversaryLedger?.signals ?? [])],
  };
};
