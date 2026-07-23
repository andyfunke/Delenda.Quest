import type {
  AdversaryLedger,
  DiplomacyLedger,
  DomesticLedger,
  ForceGenerationLedger,
  ProductionLedger,
} from "./circuits";
import type { FactDefinition, OutcomeBand } from "./campaign-substrate";

export type DispatchTone = "good" | "warn" | "bad";

export type WarDispatchContext = {
  sector: string;
  maneuverLabel: string | null;
  conditionBrief: string;
  outcomeBand: OutcomeBand;
  movement: number;
  friendlyLosses: number;
  enemyLosses: number;
  committed: number;
  forceRatio: number;
  adversary: AdversaryLedger;
  diplomacy: DiplomacyLedger;
  domestic: DomesticLedger;
  production: ProductionLedger;
  forceGeneration: ForceGenerationLedger;
  desertionAttempted: number;
  doctrineGain: number;
  aftermath: FactDefinition[];
  opportunityOutcome?: "exploited" | "missed" | null;
};

export type WarDispatch = {
  title: string;
  body: string;
  tone: DispatchTone;
};

const firstSentence = (text: string) => text.trim().match(/^.*?[.!?](?:\s|$)/)?.[0].trim() ?? text.trim();

const dispatchTitle = ({ sector, maneuverLabel, outcomeBand, movement }: WarDispatchContext) => {
  if (!maneuverLabel) {
    if (movement > 0.05) return `The Line Advanced at ${sector}`;
    if (movement < -0.05) return `The Line Gave Ground at ${sector}`;
    return `The Line Held at ${sector}`;
  }
  if (outcomeBand === "clean") return `${maneuverLabel} Broke Open ${sector}`;
  if (outcomeBand === "executed") return movement > 0.05
    ? `A Lodgment Was Secured at ${sector}`
    : `${maneuverLabel} Held Its Ground at ${sector}`;
  if (outcomeBand === "disrupted") return movement < -0.05
    ? `${maneuverLabel} Was Thrown Back at ${sector}`
    : `${maneuverLabel} Culminated at ${sector}`;
  return `Procedures Broke Down at ${sector}`;
};

const battlefieldSentence = (context: WarDispatchContext) => {
  const { sector, maneuverLabel, outcomeBand, movement, forceRatio } = context;
  if (!maneuverLabel) {
    if (movement > 0.05) return `Standing formations advanced through ${sector} and forced the enemy out of its forward works.`;
    if (movement < -0.05) return `Standing formations traded ground at ${sector} for enough cohesion to keep the withdrawal from becoming a rout.`;
    if (forceRatio > 1.15) return `At ${sector}, local superiority was spent against a defense that refused to rupture; the armies finished on their start lines.`;
    if (forceRatio < 0.9) return `At ${sector}, the line absorbed a stronger enemy concentration and held it short of a decision.`;
    return `At ${sector}, the armies remained locked on their start lines; neither headquarters converted pressure into ground.`;
  }
  if (outcomeBand === "clean") return `At ${sector}, ${maneuverLabel} ruptured the enemy position and carried the tactical initiative beyond the first objective.`;
  if (outcomeBand === "executed") return `At ${sector}, ${maneuverLabel} survived contact and established a lodgment, though resistance held the operation short of a clean breach.`;
  if (outcomeBand === "disrupted") return `At ${sector}, ${maneuverLabel} lost cohesion under pressure and culminated before it could carry the position.`;
  return `At ${sector}, the plan lost integrity under concentrated fire; local reserves were committed to arrest the recoil.`;
};

const casualtySentence = ({ friendlyLosses, enemyLosses, committed, movement }: WarDispatchContext) => {
  const lossRate = friendlyLosses / Math.max(1, committed);
  const scale = friendlyLosses >= 3_500 || lossRate >= 0.025
    ? "cut through several battalions"
    : friendlyLosses >= 800 || lossRate >= 0.007
      ? "was battalion-scale"
      : "remained local to the engaged formations";
  const exchange = enemyLosses > friendlyLosses * 1.25
    ? "The enemy paid more heavily, but the exchange did not by itself decide the ground."
    : enemyLosses < friendlyLosses * 0.75
      ? "The enemy kept the better exchange and retained the initiative."
      : Math.abs(movement) <= 0.05
        ? "Both armies paid for no operational decision."
        : "Neither army escaped the exchange intact.";
  return `The butcher's bill ${scale}. ${exchange}`;
};

const enemySentence = ({ adversary, sector }: WarDispatchContext) => {
  const posture = adversary.posture === "Reconstitute Behind the Line"
    ? "withdrew battered formations behind the line to reconstitute"
    : adversary.posture === "Local Counterstroke"
      ? "committed a local counterstroke"
      : adversary.posture === "Exploit the Withdrawal"
        ? "pressed the withdrawal before the line could settle"
        : adversary.posture === "Concentrated Assault"
          ? "massed for a concentrated assault"
          : "maintained methodical pressure";
  const rear = adversary.productionTarget === "Munitions Recovery"
    ? "ammunition trains are rebuilding its fires"
    : adversary.productionTarget === "Signal Denial"
      ? "signal detachments are preparing to blind the next operation"
      : "replacement equipment and fresh columns continue toward the sector";
  return `Enemy command ${posture} at ${sector}; ${rear}.`;
};

const sustainmentSentence = ({ diplomacy, production, forceGeneration }: WarDispatchContext) => {
  const arrivals: string[] = [];
  if (diplomacy.totalMunitions > 0) arrivals.push("Foreign ammunition reached the railheads");
  if (forceGeneration.deployableAssigned > 0) arrivals.push("fresh drafts joined the order of battle");
  const arrivalSentence = arrivals.length ? `${arrivals.join(", and ")}.` : "";
  const arsenalSentence = production.shortages > 0
    ? "Critical shortages opened in the arsenals."
    : production.maintenanceDebtAfter > production.maintenanceDebtBefore + 0.25
      ? "The arsenals met the day's expenditure, but maintenance arrears deepened."
      : "The arsenals sustained the field army without opening a critical shortage.";
  return [arrivalSentence, arsenalSentence].filter(Boolean).join(" ");
};

const homeFrontSentence = ({ domestic, desertionAttempted }: WarDispatchContext) => {
  const clauses: string[] = [];
  if (desertionAttempted > 0) clauses.push("rear-area discipline continued to fray");
  if (domestic.strikeRisk >= 0.5) clauses.push("a general stoppage began forming in the industrial districts");
  else if (domestic.strikeRisk >= 0.3) clauses.push("labor unrest spread through the industrial districts");
  else if (domestic.resistanceChange > 0.5) clauses.push("organized resistance gained ground behind the front");
  if (domestic.legitimacyChange < -0.5) clauses.push("the casualty lists cost the government further authority");
  if (!clauses.length) return "The home front absorbed the day's losses without an immediate political rupture.";
  const [first, ...rest] = clauses;
  return `Behind the front, ${first}${rest.length ? `, and ${rest.join(", while ")}` : ""}.`;
};

const aftermathNarrative: Record<string, string> = {
  salient_reinforced: "The salient is reinforced, for now.",
  reserve_available: "A reserve remains available for follow-on operations.",
  reserve_exposed: "The committed reserve is now exposed to enemy observation and fires.",
  enemy_fires_displaced: "Enemy batteries have been forced off their registered positions.",
  targeting_data_recovered: "The fires staff recovered targeting data for the next engagement.",
  batteries_unlocated: "The enemy batteries remain unlocated and free to resume interdiction.",
  alternate_route_open: "Engineers opened an alternate line of communication into the sector.",
  engineers_spent: "The engineer detachment is spent and no second route is ready.",
  sector_abandoned: "The sector has been abandoned, preserving the formation at the cost of the ground.",
  enemy_dislocated: "The enemy is dislocated and briefly vulnerable to exploitation.",
  breakthrough_window: "A narrow breakthrough window is open before the enemy reconstitutes.",
  mobile_reserve_spent: "The mobile reserve is spent and cannot answer a counterstroke.",
  obstacle_breached: "The obstacle belt is breached and follow-on forces have a passage.",
  assault_observed: "The enemy has recorded the failed assault sequence and its geometry.",
  command_net_restored: "The command net is restored across the engaged formations.",
  relay_compromised: "The relay package is compromised and the enemy knows where to listen.",
  formation_exhausted: "The formation remains in the line, but it is operationally exhausted.",
};

const closingParagraph = ({ aftermath, doctrineGain, opportunityOutcome }: WarDispatchContext) => {
  const sentences = aftermath.slice(0, 2).map((fact) => aftermathNarrative[fact.id] ?? `${fact.label} now governs the next operation.`);
  if (opportunityOutcome === "exploited") sentences.push("A fleeting target was struck before it could leave the battlespace.");
  if (opportunityOutcome === "missed") sentences.push("A target of opportunity escaped before fires could be brought to bear.");
  sentences.push(doctrineGain > 0
    ? "Staff accepted the action as a verified success and entered its lessons into doctrine."
    : "The action yielded no doctrine worth preserving.");
  return sentences.join(" ");
};

export const composeWarDispatch = (context: WarDispatchContext): WarDispatch => {
  const battlefield = [firstSentence(context.conditionBrief), battlefieldSentence(context), casualtySentence(context)].join(" ");
  const theater = [enemySentence(context), sustainmentSentence(context), homeFrontSentence(context)].join(" ");
  return {
    title: dispatchTitle(context),
    body: [battlefield, theater, closingParagraph(context)].join("\n\n"),
    tone: context.outcomeBand === "clean" || context.movement > 0.6
      ? "good"
      : context.outcomeBand === "collapse" || context.movement < -0.4
        ? "bad"
        : "warn",
  };
};
