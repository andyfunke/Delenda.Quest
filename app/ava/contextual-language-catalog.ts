import type { StrategicDimension } from "../substrate/gates";
import type { AvaLanguageEntry } from "./contextual-language";

const entry = (
  value: Omit<AvaLanguageEntry, "source"> & {
    source?: AvaLanguageEntry["source"];
  },
): AvaLanguageEntry => ({
  source: "STATIC_CATALOG",
  ...value,
});

const priority = (
  id: string,
  label: string,
  aliases: string[],
  priorityAxes: StrategicDimension[],
): AvaLanguageEntry =>
  entry({
    id,
    route: "PRIORITY_FOCUS",
    label,
    aliases,
    priorityAxes,
  });

export const AVA_CONTEXTUAL_CATALOG: AvaLanguageEntry[] = [
  priority(
    "priority.territory",
    "Territorial control",
    ["gain territory", "territorial control", "hold territory", "take territory"],
    ["territorial_control"],
  ),
  priority(
    "priority.advance",
    "Advance and initiative",
    ["advance", "press forward", "make an advance", "advance the line"],
    ["initiative", "territorial_control"],
  ),
  entry({
    id: "metric.front-movement",
    route: "METRIC_EXPLANATION",
    label: "Front movement",
    aliases: [
      "front movement",
      "ground movement",
      "kilometers",
      "kilometres",
      "front line",
      "where is the front",
      "current front",
    ],
    entityId: "front",
    facet: "calculus",
  }),
  entry({
    id: "report.adversary",
    route: "REPORT",
    label: "Adversary report",
    aliases: [
      "enemy position",
      "enemy positions",
      "adversary position",
      "enemy report",
      "adversary report",
      "what is the enemy doing",
    ],
    topic: "adversary",
  }),
  entry({
    id: "report.overview",
    route: "REPORT",
    label: "Current situation",
    aliases: [
      "condition",
      "situation",
      "current situation",
      "campaign condition",
      "overview",
    ],
    topic: "overview",
  }),
  entry({
    id: "objective.current",
    route: "OBJECTIVE_EXPLANATION",
    label: "Campaign objective",
    aliases: [
      "objective",
      "campaign objective",
      "mission objective",
      "what is the objective",
    ],
    entityId: "campaign-synopsis",
    facet: "meaning",
  }),
  entry({
    id: "advice.strategy",
    route: "STRATEGIC_ADVICE",
    label: "Strategic advice",
    aliases: ["strategy", "strategic advice", "strategic guidance"],
  }),
  entry({
    id: "report.losses",
    route: "REPORT",
    label: "Losses report",
    aliases: ["losses", "casualties", "attrition", "loss report"],
    topic: "losses",
  }),
  entry({
    id: "metric.supply",
    route: "METRIC_EXPLANATION",
    label: "Supply condition",
    aliases: ["supply", "supply line", "logistics", "supply condition"],
    entityId: "supply",
    facet: "calculus",
  }),
  entry({
    id: "metric.communications",
    route: "METRIC_EXPLANATION",
    label: "Communications",
    aliases: ["communications", "communication", "command network", "network condition"],
    entityId: "network",
    facet: "meaning",
  }),
  entry({
    id: "metric.intelligence",
    route: "METRIC_EXPLANATION",
    label: "Intelligence picture",
    aliases: ["intelligence", "intel", "intelligence picture"],
    entityId: "intelligence",
    facet: "calculus",
  }),
  entry({
    id: "metric.readiness",
    route: "METRIC_EXPLANATION",
    label: "Readiness",
    aliases: ["readiness", "force readiness", "combat readiness"],
    entityId: "readiness",
    facet: "calculus",
  }),
  entry({
    id: "metric.force",
    route: "METRIC_EXPLANATION",
    label: "Present force",
    aliases: ["force", "forces", "armed forces", "present force"],
    entityId: "armed",
    facet: "calculus",
  }),
  entry({
    id: "metric.formation",
    route: "METRIC_EXPLANATION",
    label: "Formation",
    aliases: ["formation", "formations"],
    entityId: "formation",
    facet: "meaning",
  }),
  entry({
    id: "metric.reserve",
    route: "METRIC_EXPLANATION",
    label: "Replacement reserve",
    aliases: ["reserve", "reserves", "replacement reserve"],
    entityId: "reserve",
    facet: "calculus",
  }),
  entry({
    id: "metric.position",
    route: "METRIC_EXPLANATION",
    label: "Current position",
    aliases: ["position", "front position", "current position"],
    entityId: "position",
    facet: "meaning",
  }),
  entry({
    id: "metric.route",
    route: "METRIC_EXPLANATION",
    label: "Route",
    aliases: ["route", "routes", "supply route"],
    entityId: "route",
    facet: "meaning",
  }),
  entry({
    id: "metric.opening",
    route: "METRIC_EXPLANATION",
    label: "Operational opening",
    aliases: ["opening", "the opening", "breakthrough opening"],
    entityId: "opening",
    facet: "meaning",
  }),
  entry({
    id: "metric.pressure",
    route: "METRIC_EXPLANATION",
    label: "Battlefield pressure",
    aliases: ["pressure", "front pressure", "battlefield pressure"],
    entityId: "pressure",
    facet: "meaning",
  }),
];

export const contextualCatalogById = new Map(
  AVA_CONTEXTUAL_CATALOG.map((item) => [item.id, item]),
);
