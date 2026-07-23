import {
  calculateCampaignScore,
  type CampaignScoreOutcome,
} from "./campaign-balance";
import type { GameState } from "./game";

const range = (values: number[]) => ({
  min: values.length ? Math.min(...values) : 0,
  max: values.length ? Math.max(...values) : 0,
});

export const campaignScoreInputForState = (
  state: GameState,
  outcome: CampaignScoreOutcome =
    state.status === "active" ? "abandoned" : state.status,
) => {
  const production = state.resolutionHistory.map((day) =>
    day.production.lines.reduce((sum, line) => sum + line.net, 0),
  );
  const suffered = state.resolutionHistory.map(
    (day) => day.personnel.combatLosses,
  );
  const inflicted = state.resolutionHistory.map(
    (day) => day.operations.enemyLosses,
  );
  const productionRange = range(production);
  const sufferedRange = range(suffered);
  const inflictedRange = range(inflicted);
  return {
    outcome,
    days: Math.max(1, state.day - 1),
    productionMin: productionRange.min,
    productionMax: productionRange.max,
    sufferedMin: sufferedRange.min,
    sufferedMax: sufferedRange.max,
    inflictedMin: inflictedRange.min,
    inflictedMax: inflictedRange.max,
  };
};

export const campaignScoreForState = (
  state: GameState,
  outcome?: CampaignScoreOutcome,
) => calculateCampaignScore(campaignScoreInputForState(state, outcome));
