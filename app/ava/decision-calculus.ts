import {
  FAMILIES,
  MANEUVERS,
  coverage,
  directorForState,
  estimateDay,
  fmt,
  maneuverChance,
  projectForceGeneration,
  projectOperations,
  projectOutcomeBands,
  projectProduction,
  situationForState,
  type GameState,
  type Maneuver,
  type OutcomeBand,
} from "../game";

export type CalculusRule = {
  id: string;
  condition: string;
  effect: number;
  explanation: string;
};

export type ManeuverCalculus = {
  maneuver: Maneuver;
  score: number;
  relayUptime: number;
  roadThroughput: number;
  enemyFires: number;
  corridorViability: number;
  sustainmentFloor: number;
  sustainmentDays: number;
  confidence: number;
  intelligenceConfidence: number;
  forceRatio: number;
  committed: number;
  expectedLosses: number;
  replacementBalance: number;
  groundMovement: number;
  outcomeEnvelope: {
    best: { band: OutcomeBand; movement: number; losses: number };
    worst: { band: OutcomeBand; movement: number; losses: number };
  };
  rules: CalculusRule[];
};

export type DecisionCalculusPacket = {
  situation: ReturnType<typeof situationForState>;
  generatedForDay: number;
  formulas: {
    corridor: string;
    replacement: string;
    optionScore: string;
  };
  options: ManeuverCalculus[];
  recommendation: ManeuverCalculus;
  alternative: ManeuverCalculus | null;
  coupledOrder: string | null;
  uncertainty: string;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const intelligenceFromSituation = (text: string, fallback: number) => {
  const parsed = Number(text.match(/(\d+(?:\.\d+)?)%/)?.[1]);
  return Number.isFinite(parsed) ? parsed / 100 : clamp(fallback / 100, 0.05, 0.95);
};

const bandEntry = (
  band: OutcomeBand,
  projection: ReturnType<typeof projectOperations>,
) => ({ band, movement: projection.groundMovement, losses: projection.friendlyLosses });

const optionRules = (
  state: GameState,
  maneuver: Maneuver,
  values: Omit<ManeuverCalculus, "maneuver" | "score" | "rules">,
): CalculusRule[] => {
  const situation = situationForState(state);
  const rules: CalculusRule[] = [];
  const add = (
    id: string,
    condition: boolean,
    effect: number,
    explanation: string,
    statement: string,
  ) => {
    if (condition && effect !== 0) {
      rules.push({ id, condition: statement, effect, explanation });
    }
  };

  add(
    "corridor-below-floor",
    values.corridorViability < values.sustainmentFloor,
    maneuver.id === "reinforce" ? -8 : maneuver.id === "route" || maneuver.id === "network" ? 11 : 0,
    maneuver.id === "reinforce"
      ? "Reinforcement enters a corridor that cannot sustain its own current traffic."
      : "The order directly repairs or bypasses the failed sustainment corridor.",
    `${values.corridorViability.toFixed(2)} viability < ${values.sustainmentFloor.toFixed(2)} sustainment floor`,
  );
  add(
    "salient-preservation",
    /salient|corridor/i.test(`${situation.headline} ${situation.briefing}`),
    maneuver.id === "reinforce" ? 17 : maneuver.id === "abandon" ? -12 : 0,
    maneuver.id === "reinforce"
      ? "The maneuver preserves the exposed formation while another order repairs the rate behind it."
      : "Withdrawal concedes ground already identified as the campaign's immediate operational obligation.",
    "The current problem is an exposed salient or corridor",
  );
  add(
    "replacement-deficit",
    values.replacementBalance < 0,
    maneuver.id === "reinforce" ? -4 : maneuver.id === "abandon" ? 8 : -2,
    "Projected personnel expenditure exceeds deployable replacement assignment.",
    `${fmt(Math.abs(values.replacementBalance), true)} more deployable personnel leave than arrive`,
  );
  add(
    "local-force-disadvantage",
    values.forceRatio < 0.9,
    maneuver.id === "reinforce" ? 9 : maneuver.id === "abandon" ? 5 : maneuver.id === "exploit" ? -8 : 0,
    "The local force ratio does not support an exploitation order without another source of advantage.",
    `${values.forceRatio.toFixed(2)} local effective-force ratio < 0.90`,
  );
  add(
    "weak-intelligence",
    values.intelligenceConfidence < 0.65,
    maneuver.id === "network" ? 12 : maneuver.id === "interdict" || maneuver.id === "exploit" ? -7 : 0,
    "The order either improves classification or depends upon an unverified target.",
    `${Math.round(values.intelligenceConfidence * 100)}% intelligence confidence < 65%`,
  );
  add(
    "network-degradation",
    values.relayUptime < 0.8,
    maneuver.id === "network" ? 14 : maneuver.id === "reinforce" ? -4 : 0,
    "Command conversion is below the reliable relay band.",
    `${values.relayUptime.toFixed(2)} relay uptime < 0.80`,
  );
  add(
    "frontage-congestion",
    projectOperations(state, maneuver).frontageSaturation > 1.35,
    maneuver.id === "reinforce" ? -9 : maneuver.id === "abandon" ? 5 : 0,
    "Additional bodies exceed useful frontage and lose conversion efficiency.",
    `${projectOperations(state, maneuver).frontageSaturation.toFixed(2)} frontage saturation > 1.35`,
  );
  add(
    "munitions-critical",
    coverage(state, "munitions") < 2,
    maneuver.id === "interdict" || maneuver.id === "breach" ? -10 : maneuver.id === "abandon" ? 6 : 0,
    "The order is exposed to a critical munitions coverage constraint.",
    `${coverage(state, "munitions").toFixed(1)} days munitions coverage < 2.0`,
  );
  add(
    "route-remedy",
    values.roadThroughput < 0.62,
    maneuver.id === "route" ? 13 : 0,
    "The order attacks the measured road-throughput bottleneck directly.",
    `${values.roadThroughput.toFixed(2)} road throughput < 0.62`,
  );
  add(
    "withdrawal-expenditure",
    maneuver.id === "abandon",
    values.groundMovement < -1 ? -9 : -4,
    "Withdrawal preserves part of the formation by writing paid ground off immediately.",
    `Projected movement is ${values.groundMovement.toFixed(2)} km`,
  );
  return rules;
};

export const compileDecisionCalculus = (state: GameState): DecisionCalculusPacket => {
  const situation = situationForState(state);
  const force = projectForceGeneration(state);
  const personnel = estimateDay(state);
  const production = projectProduction(state);
  const director = directorForState(state);
  const intelligenceConfidence = intelligenceFromSituation(
    situation.intelligence,
    state.intelligence,
  );
  const available = situation.maneuvers
    .map((id) => MANEUVERS.find((candidate) => candidate.id === id))
    .filter((candidate): candidate is Maneuver => !!candidate);

  const options = available.map((maneuver) => {
    const projection = projectOperations(state, maneuver);
    const bands = projectOutcomeBands(state, maneuver);
    const relayUptime = clamp(projection.networkFactor, 0.05, 1.2);
    const roadThroughput = clamp(
      projection.supplyFactor * Math.sqrt(Math.max(0.2, projection.groundFactor)),
      0.05,
      1.2,
    );
    const enemyCoverage =
      state.adversary.munitions / Math.max(1, state.adversary.munitionsUse);
    const enemyFires = clamp(
      0.28 +
        Math.min(0.34, enemyCoverage / 18) +
        Math.max(0, director.modifiers.enemyPressure) * 0.38 +
        Math.max(0, (state.adversaryLedger?.pressure ?? 0.35) - 0.35) * 0.22,
      0.18,
      0.95,
    );
    const corridorViability = (relayUptime * roadThroughput) / enemyFires;
    const sustainmentFloor = /corridor|crossing|route/i.test(
      `${situation.terrain} ${situation.headline}`,
    )
      ? 0.4
      : 0.48;
    const replacementBalance =
      force.deployableAssigned - projection.friendlyLosses - personnel.netDesertion;
    const sustainmentDays = clamp(
      (coverage(state, "munitions") *
        Math.max(0.2, projection.forceRatio) *
        Math.max(0.15, corridorViability)) /
        Math.max(0.65, maneuver.supply),
      0.1,
      14,
    );
    const values: Omit<ManeuverCalculus, "maneuver" | "score" | "rules"> = {
      relayUptime,
      roadThroughput,
      enemyFires,
      corridorViability,
      sustainmentFloor,
      sustainmentDays,
      confidence: maneuverChance(state, maneuver),
      intelligenceConfidence,
      forceRatio: projection.forceRatio,
      committed: projection.committed,
      expectedLosses: projection.friendlyLosses,
      replacementBalance,
      groundMovement: projection.groundMovement,
      outcomeEnvelope: {
        best: bandEntry("clean", bands.clean),
        worst: bandEntry("collapse", bands.collapse),
      },
    };
    const rules = optionRules(state, maneuver, values);
    const score =
      projection.groundMovement * 24 +
      values.confidence * 26 +
      clamp(values.forceRatio, 0, 1.5) * 14 +
      clamp(values.corridorViability, 0, 1.5) * 10 -
      projection.friendlyLosses / 1150 +
      values.replacementBalance / 2200 -
      production.shortages * 3 +
      rules.reduce((total, rule) => total + rule.effect, 0);
    return { maneuver, score, rules, ...values };
  }).sort((a, b) => b.score - a.score || a.maneuver.id.localeCompare(b.maneuver.id));

  const recommendation = options[0];
  if (!recommendation) throw new Error("No maneuver calculus could be compiled.");
  const coupledOrder =
    recommendation.replacementBalance < 0
      ? FAMILIES.find((family) => family.id === "service")?.choices.find(
          (choice) => choice.id === "selective",
        )?.label ?? "Increase the call-up"
      : recommendation.corridorViability < recommendation.sustainmentFloor
        ? recommendation.maneuver.id === "network"
          ? null
          : "Restore the command and transport corridor"
        : null;
  const uncertainty =
    recommendation.intelligenceConfidence < 0.65
      ? `${Math.round(recommendation.intelligenceConfidence * 100)}% intelligence. The target or disposition remains unverified.`
      : `${Math.round(recommendation.intelligenceConfidence * 100)}% intelligence. The estimate is bounded but not certain.`;

  return {
    situation,
    generatedForDay: state.day,
    formulas: {
      corridor: "corridor viability = (relay uptime × road throughput) ÷ enemy fires",
      replacement:
        "replacement balance = deployable assignments − expected combat losses − net flight",
      optionScore:
        "option score = ground + confidence + local force + corridor support − losses + replacement balance + fired deterministic rules",
    },
    options,
    recommendation,
    alternative: options[1] ?? null,
    coupledOrder,
    uncertainty,
  };
};

const signed = (value: number, digits = 2) =>
  `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(digits)}`;

export const renderManeuverCalculus = (
  option: ManeuverCalculus,
  handle?: string,
) => [
  `${handle ? `[${handle}] ` : ""}${option.maneuver.label.toUpperCase()}`,
  `corridor viability = (${option.relayUptime.toFixed(2)} relay uptime × ${option.roadThroughput.toFixed(2)} road throughput) ÷ ${option.enemyFires.toFixed(2)} enemy fires = ${option.corridorViability.toFixed(2)} // floor ${option.sustainmentFloor.toFixed(2)}`,
  `sustainment: ${option.sustainmentDays.toFixed(1)} days at current expenditure`,
  `local force ratio: ${option.forceRatio.toFixed(2)} · confidence: ${Math.round(option.confidence * 100)}% · intelligence: ${Math.round(option.intelligenceConfidence * 100)}%`,
  `committed: ${fmt(option.committed, true)} · expected loss: ${fmt(option.expectedLosses, true)} · replacement balance: ${signed(option.replacementBalance, 0)}`,
  `ground: ${signed(option.groundMovement)} km`,
  `outcome envelope: ${option.outcomeEnvelope.best.band.toUpperCase()} ${signed(option.outcomeEnvelope.best.movement)} km / ${fmt(option.outcomeEnvelope.best.losses, true)} losses → ${option.outcomeEnvelope.worst.band.toUpperCase()} ${signed(option.outcomeEnvelope.worst.movement)} km / ${fmt(option.outcomeEnvelope.worst.losses, true)} losses`,
  `score: ${option.score.toFixed(2)}`,
  `rules fired:\n${option.rules.length ? option.rules.map((rule) => `${rule.effect >= 0 ? "+" : ""}${rule.effect.toFixed(1)} // ${rule.condition} // ${rule.explanation}`).join("\n") : "No conditional adjustment fired."}`,
].join("\n");

export const renderDecisionCalculus = (
  packet: DecisionCalculusPacket,
  handles = new Map<string, string>(),
) => {
  const primary = packet.recommendation;
  const alternative = packet.alternative;
  const primaryHandle = handles.get(primary.maneuver.id);
  const alternativeHandle = alternative
    ? handles.get(alternative.maneuver.id)
    : undefined;
  return [
    `CURRENT CONDITION\n${packet.formulas.corridor}\n= (${primary.relayUptime.toFixed(2)} × ${primary.roadThroughput.toFixed(2)}) ÷ ${primary.enemyFires.toFixed(2)} = ${primary.corridorViability.toFixed(2)} // ${primary.corridorViability < primary.sustainmentFloor ? "BELOW" : "ABOVE"} ${primary.sustainmentFloor.toFixed(2)} SUSTAINMENT FLOOR`,
    `REPLACEMENT RATE\n${packet.formulas.replacement}\n= ${fmt(projectForceGenerationForRender(primary), true)} // ${signed(primary.replacementBalance, 0)} net after expected expenditure`,
    `RECOMMENDED OPTION\n${renderManeuverCalculus(primary, primaryHandle)}`,
    alternative
      ? `NEAREST ALTERNATIVE\n${renderManeuverCalculus(alternative, alternativeHandle)}`
      : "NEAREST ALTERNATIVE\nNo second legal maneuver exists.",
    `PRINCIPAL UNCERTAINTY\n${packet.uncertainty}`,
    `DERIVATIVE RECOMMENDATION\n${primaryHandle ? `Stage [${primaryHandle}] ` : ""}${primary.maneuver.label}${packet.coupledOrder ? ` and pair it with ${packet.coupledOrder}` : ""}. ${primary.replacementBalance < 0 ? "You are spending deployable soldiers faster than the state is replacing them." : "The replacement stream covers the disclosed expenditure."}`,
  ].join("\n\n");
};

// Rendering needs the positive side of the balance without carrying the full state.
const projectForceGenerationForRender = (option: ManeuverCalculus) =>
  option.replacementBalance + option.expectedLosses;
/**
 * @deprecated Quarantined legacy calculator. Ava's runtime does not import this
 * module; deterministic counsel is compiled through advisory.ts and
 * projection.ts.
 */
