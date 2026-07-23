export const CAMPAIGN_MAX_DAY = 30;
export const CAMPAIGN_SCORE_PIVOT_DAY = 28;
export const EARLIEST_MODELED_VICTORY_DAY = 15;
export const FINISH_DAY_MEAN = 29;
export const FINISH_DAY_SIGMA = 2.6;
export const ADVANTAGE_PATH_SURFACE = 1 / 3;
export const LOSS_PATH_SURFACE = 2 / 3;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value));

const hash = (text: string) => {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return (value >>> 0) / 4294967295;
};

const gaussianWeight = (day: number) =>
  Math.exp(-0.5 * ((day - FINISH_DAY_MEAN) / FINISH_DAY_SIGMA) ** 2);

const rawFinishWeights = Array.from(
  { length: CAMPAIGN_MAX_DAY - EARLIEST_MODELED_VICTORY_DAY + 1 },
  (_, index) => {
    const day = EARLIEST_MODELED_VICTORY_DAY + index;
    return { day, weight: gaussianWeight(day) };
  },
);
const finishWeightTotal = rawFinishWeights.reduce(
  (total, entry) => total + entry.weight,
  0,
);

export const CAMPAIGN_FINISH_DISTRIBUTION = rawFinishWeights.map((entry) => ({
  day: entry.day,
  probability: entry.weight / finishWeightTotal,
}));

export const finishByDayProbability = (day: number) =>
  CAMPAIGN_FINISH_DISTRIBUTION.filter((entry) => entry.day <= day).reduce(
    (total, entry) => total + entry.probability,
    0,
  );

export type CampaignBalanceProfile = {
  designHorizonDay: number;
  inertDefeatDay: number;
  advantageSurface: number;
  lossSurface: number;
  pacingPressure: number;
  distributionPercentile: number;
};

export const campaignBalanceProfile = (
  seed: number,
): CampaignBalanceProfile => {
  const distributionPercentile = hash(`${seed}:campaign:finish-horizon`);
  let cumulative = 0;
  let designHorizonDay = CAMPAIGN_MAX_DAY;
  for (const entry of CAMPAIGN_FINISH_DISTRIBUTION) {
    cumulative += entry.probability;
    if (distributionPercentile <= cumulative) {
      designHorizonDay = entry.day;
      break;
    }
  }
  const inertDefeatDay =
    8 + Math.floor(hash(`${seed}:campaign:inert-defeat`) * 3);
  const pacingPressure = clamp(
    (FINISH_DAY_MEAN - designHorizonDay) * 0.035,
    -0.035,
    0.42,
  );
  return {
    designHorizonDay,
    inertDefeatDay,
    advantageSurface: ADVANTAGE_PATH_SURFACE,
    lossSurface: LOSS_PATH_SURFACE,
    pacingPressure,
    distributionPercentile,
  };
};

export type CampaignScoreOutcome = "victory" | "defeat" | "abandoned";

export type CampaignScoreInput = {
  outcome: CampaignScoreOutcome;
  days: number;
  productionMin: number;
  productionMax: number;
  sufferedMin: number;
  sufferedMax: number;
  inflictedMin: number;
  inflictedMax: number;
};

export type CampaignScoreBreakdown = {
  completion: number;
  production: number;
  casualtyControl: number;
  inflictedLosses: number;
  earlyVictory: number;
  total: number;
  days: number;
  formula: string;
};

export const SCORE_FORMULA =
  "completion + production range + casualty control + inflicted losses + early-victory acceleration; clamped 0–10,000";

export const earlyVictoryAcceleration = (
  days: number,
  outcome: CampaignScoreOutcome,
) => {
  if (outcome !== "victory") return 0;
  const daysEarly = clamp(
    CAMPAIGN_SCORE_PIVOT_DAY - days,
    0,
    CAMPAIGN_SCORE_PIVOT_DAY - EARLIEST_MODELED_VICTORY_DAY,
  );
  if (daysEarly <= 0) return 0;
  const span = CAMPAIGN_SCORE_PIVOT_DAY - EARLIEST_MODELED_VICTORY_DAY;
  const numerator = Math.exp(daysEarly / 5.2) - 1;
  const denominator = Math.exp(span / 5.2) - 1;
  return Math.round((numerator / denominator) * 2600);
};

export const calculateCampaignScore = (
  input: CampaignScoreInput,
): CampaignScoreBreakdown => {
  const days = Math.max(1, Math.round(input.days));
  const production = clamp(
    Math.round((input.productionMin + input.productionMax) * 0.012),
    -500,
    1800,
  );
  const casualtyControl = clamp(
    Math.round(
      2600 - (Math.max(0, input.sufferedMin) + Math.max(0, input.sufferedMax)) * 0.018,
    ),
    0,
    2600,
  );
  const inflictedLosses = clamp(
    Math.round(
      (Math.max(0, input.inflictedMin) + Math.max(0, input.inflictedMax)) *
        0.018,
    ),
    0,
    2200,
  );
  const completion =
    input.outcome === "victory"
      ? 3200
      : input.outcome === "defeat"
        ? 1600
        : Math.min(900, days * 35);
  const earlyVictory = earlyVictoryAcceleration(days, input.outcome);
  const total = clamp(
    completion +
      production +
      casualtyControl +
      inflictedLosses +
      earlyVictory,
    0,
    10_000,
  );
  return {
    completion,
    production,
    casualtyControl,
    inflictedLosses,
    earlyVictory,
    total,
    days,
    formula: SCORE_FORMULA,
  };
};

export const scoreBreakdownLines = (score: CampaignScoreBreakdown) => [
  `Completion ${score.completion >= 0 ? "+" : ""}${score.completion.toLocaleString()}`,
  `Production range ${score.production >= 0 ? "+" : ""}${score.production.toLocaleString()}`,
  `Casualty control ${score.casualtyControl >= 0 ? "+" : ""}${score.casualtyControl.toLocaleString()}`,
  `Inflicted losses ${score.inflictedLosses >= 0 ? "+" : ""}${score.inflictedLosses.toLocaleString()}`,
  `Early-victory acceleration ${score.earlyVictory >= 0 ? "+" : ""}${score.earlyVictory.toLocaleString()}`,
  `TOTAL ${score.total.toLocaleString()} // ${score.formula}`,
];
