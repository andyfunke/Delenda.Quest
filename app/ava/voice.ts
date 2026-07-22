import {
  estimateDay,
  projectDomestic,
  projectForceGeneration,
  projectProduction,
  situationForState,
  type GameState,
} from "../game";
import type { AvaReportTopic } from "./schema";

export type AvaVoiceMode =
  | "identity"
  | "orientation"
  | "grammar"
  | "rejection"
  | "confirmation"
  | "receipt"
  | "plan"
  | "correction"
  | "acknowledgment"
  | "detail";

export type AvaVoiceCue = {
  topic?: AvaReportTopic;
  label?: string;
  mode?: AvaVoiceMode;
};

const recentCombatLosses = (state: GameState, days = 5) =>
  state.resolutionHistory
    .slice(0, days)
    .reduce((sum, record) => sum + record.personnel.combatLosses, 0);

/**
 * Ava is assembled the same way as the war dispatches: authored sentence roles
 * are selected from live state, then the factual report is rendered beneath
 * them. The prose never owns the calculation or the outcome.
 */
export const avaReportOpening = (
  state: GameState,
  topic: AvaReportTopic,
) => {
  const situation = situationForState(state),
    production = projectProduction(state),
    domestic = projectDomestic(state),
    force = projectForceGeneration(state),
    personnel = estimateDay(state),
    losses = recentCombatLosses(state);

  switch (topic) {
    case "losses":
      if (!state.resolutionHistory.length)
        return "The casualty ledger is blank because the guns have not been allowed to write in it yet. Do not confuse that with mercy.";
      if (losses >= 8_000)
        return "The clerks have stopped correcting one another. The total is large enough to remain obscene in either direction.";
      return "The butcher's bill is still small enough to read as individual absences. That privilege will not survive careless tempo.";
    case "personnel":
    case "military":
      return personnel.netDesertion > force.effectiveGraduates
        ? "The army is losing trained bodies faster than the state can make replacements. A formation can die without being attacked."
        : "The replacement stream is keeping pace for the moment. The word moment is doing most of the work.";
    case "retrospective":
    case "decision-ledger":
      return "Orders survive their authors by becoming ledgers. Intent does not.";
    case "production":
    case "resources":
      return production.shortages
        ? "The factories are still making war. The front is consuming it faster."
        : "The arsenals are ahead of the guns. That advantage survives only until command mistakes it for abundance.";
    case "projection":
      return "A projection is the battlefield confessing under controlled pressure. It tells the truth only about the orders already on the table.";
    case "domestic":
      if (domestic.collapseRisk >= 0.3 || state.legitimacy < 35)
        return "The front is not the only line capable of breaking. Civil obedience has merely learned to fail without artillery.";
      return "The population is still carrying the war. That is not consent. It is unused refusal.";
    case "network":
      return state.networkPosture === "dark"
        ? "The network is quiet enough to survive and slow enough to kill an order before it arrives."
        : "Every transmission moves command and teaches the enemy where command lives.";
    case "intelligence":
      return state.intelligence >= 65
        ? "We know enough to be dangerous. Certainty would only make us careless."
        : "The enemy is not hidden. We have simply failed to make its evidence cohere.";
    case "adversary":
      return "The enemy does not need to be brilliant. It only needs to notice what we repeat.";
    case "effects":
      return "A standing policy is an order that learned how to keep killing after everyone stopped looking at it.";
    case "opportunities":
      return "A fleeting target is not an opportunity until command accepts what it must spend before the window closes.";
    case "service-record":
      return state.status === "active"
        ? "The record is still wet. Finish the campaign before asking history to make it clean."
        : "The campaign is closed. The ledger will now pretend the ending was always inevitable.";
    case "diplomacy":
      return "Foreign aid is a weapon whose handle remains in somebody else's hand.";
    case "doctrine":
      return "Doctrine is a mistake made useful enough to repeat on purpose.";
    case "daily-brief":
      return `${situation.headline}. The day will proceed whether command understands it or not.`;
    case "operations":
      return `The line at ${situation.sector} is asking one question in several thousand human voices.`;
    case "overview":
    default:
      return `The position at ${situation.sector} is still survivable. Survivable is not the same as safe.`;
  }
};

const responseOpening = (state: GameState, cue: AvaVoiceCue) => {
  switch (cue.mode) {
    case "identity":
      return {
        label: cue.label ?? "IDENTITY",
        line: "I am the part of command that does not need to believe you. I need the position to leave evidence.",
      };
    case "orientation":
      return {
        label: cue.label ?? "ORIENTATION",
        line: "You called. The war continued while we were silent.",
      };
    case "grammar":
      return {
        label: cue.label ?? "GRAMMAR",
        line: "Do not learn a machine dialect. Name the problem; I will expose the command that reaches it.",
      };
    case "rejection":
      return {
        label: cue.label ?? "REJECTION",
        line: "The war has refused that order. Its reasons are less negotiable than mine.",
      };
    case "confirmation":
      return {
        label: cue.label ?? "CONFIRMATION",
        line: "Orders are promises made with other people's bodies. I have preserved the exact terms.",
      };
    case "receipt":
      return {
        label: cue.label ?? "ORDER",
        line: "The order is no longer language. The field owns it now.",
      };
    case "plan":
      return {
        label: cue.label ?? "PLAN",
        line: "A plan is still innocent while it remains unissued. Inspect it before innocence becomes arithmetic.",
      };
    case "correction":
      return {
        label: cue.label ?? "CORRECTION",
        line: "Then my answer failed. I will reduce the position to one decision or expose the arithmetic until it cannot hide.",
      };
    case "acknowledgment":
      return {
        label: cue.label ?? "ACKNOWLEDGMENT",
        line: "Acknowledged. Legibility has not improved the position, but it has removed one excuse.",
      };
    case "detail":
      return {
        label: cue.label ?? "DISCLOSURE",
        line: "I will change the depth, not the truth. The ledger remains the ledger.",
      };
    default: {
      const topic = cue.topic ?? "overview";
      return {
        label:
          cue.label ?? topic.replaceAll("-", " ").toUpperCase(),
        line: avaReportOpening(state, topic),
      };
    }
  }
};

export const voiceAvaResponse = (
  state: GameState,
  text: string,
  cue: AvaVoiceCue = { topic: "overview" },
) => {
  if (/^FIELD NOTE(?:\s*\/{1,2}|\n)/.test(text.trimStart())) return text;
  const opening = responseOpening(state, cue);
  return `FIELD NOTE / ${opening.label}\n${opening.line}\n\n${text}`;
};
