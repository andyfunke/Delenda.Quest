import {
  maneuversForState,
  situationForState,
  type GameState,
} from "../game";
import type { AvaActionDescriptor } from "./schema";

const sentence = (value: string) =>
  /[.!?]$/.test(value.trim()) ? value.trim() : `${value.trim()}.`;

const lowerLead = (value: string) =>
  value.length ? `${value[0].toLowerCase()}${value.slice(1)}` : value;

const problemSentence = (state: GameState) => {
  const situation = situationForState(state);
  const conditions = `${situation.supply.toLowerCase()} supply, ${situation.network.toLowerCase()} communications, and ${situation.ground.toLowerCase()} ground`;
  switch (situation.problemClass) {
    case "force-preservation":
      return `At ${situation.sector}, the formation is being asked to carry more obligations than its present condition can sustain. It must shed one burden before attrition makes the decision itself.`;
    case "logistics":
      return `At ${situation.sector}, movement and supply have become the same problem. The route must be made useful before the force it serves becomes fixed in place.`;
    case "command":
      return `At ${situation.sector}, the order picture is failing before the formations do. Command must restore enough certainty to make one consequential movement intelligible.`;
    case "assault":
      return `At ${situation.sector}, the enemy position is still coherent and the approach is not. The next order must decide which protection is broken before another formation is committed to it.`;
    case "crossing":
      return `At ${situation.sector}, access to the far side exists only as a temporary advantage. The crossing must be converted into movement before exposure converts it into loss.`;
    case "exploitation":
      return `At ${situation.sector}, the opening is real but not durable. The choice is how much force to place inside it before the enemy can give it a different meaning.`;
    case "counterstroke":
      return `At ${situation.sector}, the enemy concentration is dangerous because it is still becoming itself. Command can disrupt the movement now or receive the completed blow later.`;
    case "observation":
      return `At ${situation.sector}, uncertainty is consuming the same command authority as contact. The next move must either classify the enemy or act honestly within what remains unknown.`;
    default:
      return `At ${situation.sector}, ${conditions} define the immediate command problem.`;
  }
};

/**
 * A deterministic paraphrase of the compiled situation. It uses typed campaign
 * conditions and never rewrites or replaces the authored source record.
 */
export const summarizeCampaignSituation = (state: GameState, variant = 0) => {
  const situation = situationForState(state);
  const condition = `Supply is ${situation.supply.toLowerCase()}, communications are ${situation.network.toLowerCase()}, and intelligence is ${lowerLead(situation.intelligence)}`;
  const question = sentence(situation.question);
  if (Math.abs(variant) % 3 === 1)
    return `${problemSentence(state)} ${condition}. The decision before command is simple to state and difficult to pay for: ${lowerLead(question)}`;
  if (Math.abs(variant) % 3 === 2)
    return `${condition}. ${problemSentence(state)} In practical terms, ${lowerLead(question)}`;
  return `${problemSentence(state)} ${condition}. ${question}`;
};

export const canonicalDailyBriefing = (state: GameState) => {
  const situation = situationForState(state);
  const maneuvers = maneuversForState(state);
  return [
    `DAILY BRIEFING / DAY ${state.day}`,
    situation.headline,
    situation.briefing,
    `COMMAND QUESTION\n${situation.question}`,
    `DECLARANT OPTIONS\n${maneuvers
      .map(
        (maneuver, index) =>
          `[M${index + 1}] ${maneuver.label}\n${maneuver.flavor}`,
      )
      .join("\n\n")}`,
  ].join("\n\n");
};

export const summarizedDailyBriefing = (state: GameState, variant = 0) => {
  const maneuvers = maneuversForState(state);
  return [
    `AVA / DAILY BRIEFING / DAY ${state.day}`,
    summarizeCampaignSituation(state, variant),
    `Three courses are declared for this module. ${maneuvers
      .map(
        (maneuver, index) =>
          `M${index + 1}, ${maneuver.label}, ${lowerLead(sentence(maneuver.flavor))}`,
      )
      .join(" ")}`,
    `${state.actions} of 3 orders remain. Say "daily briefing" for the authored text verbatim, or name one course for its calculus.`,
  ].join("\n\n");
};

export const narratedCampaignRecommendation = (input: {
  state: GameState;
  candidates: AvaActionDescriptor[];
  winner: AvaActionDescriptor;
  reason: string;
  tradeoff: string;
  variant?: number;
}) => {
  const { state, candidates, winner, reason, tradeoff, variant = 0 } = input;
  const choices = [...candidates]
    .sort((left, right) =>
      left.handle.localeCompare(right.handle, undefined, { numeric: true }),
    )
    .slice(0, 3)
    .map((candidate) => {
      const marker = candidate.id === winner.id ? " My preference." : "";
      return `${candidate.handle} declares ${candidate.label}. ${sentence(candidate.summary)}${marker}`;
    })
    .join("\n\n");
  return [
    "FIELD NOTE / JUDGMENT\nI am keeping the other dockets outside this answer. One module is enough for one decision.",
    `AVA / CAMPAIGN / DAY ${state.day}`,
    summarizeCampaignSituation(state, variant),
    `My recommendation is ${winner.handle}, ${winner.label}. ${sentence(reason)} ${sentence(tradeoff)}`,
    `The three declarant options are these:\n\n${choices}`,
    `Nothing has been issued. Say "daily briefing" for the original authored brief, or "forecast ${winner.handle}" to inspect this recommendation without spending an order.`,
  ].join("\n\n");
};
