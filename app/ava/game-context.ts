import { GameState, situationForState } from "../game";
import { compileConvergence } from "../convergence";
import type { AvaEntity } from "./schema";
import { enumerateAvaActions } from "./runtime";

const metric = (
  id: string,
  label: string,
  aliases: string[] = [],
): AvaEntity => ({ id, kind: "metric", label, aliases });

export const AVA_METRICS: AvaEntity[] = [
  metric("population", "Population", ["people", "civil population"]),
  metric("armed", "Armed Forces", ["army", "total force", "soldiers"]),
  metric("enlistment", "Enlistment", ["recruitment", "intake"]),
  metric("training", "Training Pipeline", [
    "training queue",
    "graduates",
    "training capacity",
  ]),
  metric("readiness", "Readiness", ["soldier readiness", "combat readiness"]),
  metric("equipment", "Equipment Coverage", [
    "equipment",
    "serviceable equipment",
  ]),
  metric("materiel", "Materiel Condition", ["maintenance condition"]),
  metric("industrial-condition", "Industrial Condition", [
    "factory condition",
    "industrial health",
    "maintenance debt",
  ]),
  metric("treasury", "Treasury", ["money", "fiscal capacity"]),
  metric("legitimacy", "Legitimacy", ["public support", "governability"]),
  metric("resistance", "Resistance", ["domestic resistance", "noncompliance"]),
  metric("front", "Campaign Front", ["front line", "ground movement"]),
  metric("desertion", "Desertion", ["net flight", "deserters"]),
  metric("doctrine", "Doctrine", ["insight", "insight points"]),
  metric("intelligence", "Intelligence", [
    "classification",
    "enemy intelligence",
  ]),
  metric("execution-confidence", "Execution Confidence", [
    "confidence",
    "confidence contribution",
    "maneuver confidence",
    "success chance",
    "order confidence",
  ]),
  metric("supply", "Supply", [
    "supply access",
    "coverage",
    "munitions coverage",
    "munitions",
    "ammunition",
    "ammo",
    "stockpile",
  ]),
  metric("terrain", "Terrain", ["terrain type"]),
  metric("ground", "Ground", ["ground state", "ground condition"]),
  metric("network", "Network", ["communications", "command network"]),
];

const actionKind = (
  kind: ReturnType<typeof enumerateAvaActions>[number]["kind"],
): AvaEntity["kind"] =>
  kind === "maneuver"
    ? "maneuver"
    : kind === "directive"
      ? "directive"
      : kind === "sub-mission"
        ? "sub-mission-option"
        : kind === "opportunity-response"
          ? "opportunity-response"
          : kind === "doctrine-stage"
            ? "doctrine-stage"
            : "event";

export const avaEntitiesForState = (
  state: GameState,
  opportunityFraction = 0,
): AvaEntity[] => {
  const situation = situationForState(state),
    packet = compileConvergence(state),
    actions = enumerateAvaActions(state, opportunityFraction);
  const actionEntities = actions.map<AvaEntity>((descriptor) => ({
    id: descriptor.id,
    kind: actionKind(descriptor.kind),
    label: descriptor.label,
    aliases: [descriptor.handle, ...descriptor.aliases],
    parentId: descriptor.parentLabel,
    handle: descriptor.handle,
    action: descriptor.action,
  }));
  const modules: AvaEntity[] = [
    "campaign",
    "national",
    "military",
    "diplomacy",
    "doctrine",
    "account",
    "wiki",
  ].map((id) => ({
    id,
    kind: "module",
    label: id[0].toUpperCase() + id.slice(1),
  }));
  const missions: AvaEntity[] = [packet.domestic, packet.network]
    .filter((prompt) => packet.activeDomains.includes(prompt.domain))
    .map((prompt) => ({
      id: prompt.id,
      kind: "mission",
      label: prompt.title,
      aliases: [prompt.archetypeId, prompt.frameId, ...prompt.aliases],
      parentId: prompt.domain,
    }));
  const actors = state.actors.map<AvaEntity>((actor) => ({
    id: actor.id,
    kind: "foreign-actor",
    label: actor.name,
    aliases: [actor.role, actor.interest],
  }));
  const resources = Object.keys(state.production).map<AvaEntity>((id) => ({
    id,
    kind: "resource",
    label: id[0].toUpperCase() + id.slice(1),
  }));
  const sectors = state.theaterSectors
    .filter((sector) => sector.theater === state.theater)
    .map<AvaEntity>((sector) => ({
      id: sector.id,
      kind: "sector",
      label: sector.name,
      aliases: [sector.terrain],
    }));
  const facts = state.operationalFacts.map<AvaEntity>((fact) => ({
    id: fact.id,
    kind: "operational-fact",
    label: fact.id.replaceAll("_", " "),
    parentId: fact.sectorId ?? undefined,
  }));
  return [
    ...AVA_METRICS,
    ...modules,
    ...missions,
    ...actors,
    ...resources,
    ...sectors,
    ...facts,
    {
      id: situation.blueprintId,
      kind: "mission",
      label: situation.headline,
      aliases: [situation.sector, situation.problemClass],
      parentId: "main",
    },
    ...actionEntities,
  ];
};
