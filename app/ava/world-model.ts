import {
  directorForState,
  situationForState,
  type GameState,
} from "../game";
import { CAMPAIGN_EVENT_CALCULUS } from "../campaign-event-expansion";
import { compileConvergence } from "../convergence";
import {
  disclosedAdversaryAssessment,
  projectAvaDisclosedState,
} from "./projection";
import type { CompiledCognitiveDomain } from "./cognitive-domain";
import { DELENDA_COGNITIVE_DOMAIN } from "./cognitive-domain";
import {
  canonicalJson,
  cloneCognitive,
  cognitiveDigest,
  type CognitiveSource,
  type CognitiveUncertainty,
  type CognitiveValue,
  type CognitiveVisibility,
  validateUncertainty,
} from "./cognitive-types";

export type CognitiveWorldFact = {
  id: string;
  variableId: string;
  entityId: string;
  value: CognitiveValue;
  visibility: CognitiveVisibility;
  sourceIds: readonly string[];
  lineage: readonly string[];
  validFromDay: number;
  validUntilDay?: number;
  observedAtDay: number;
  uncertainty: CognitiveUncertainty;
};

export type CognitiveWorldSnapshot = {
  domainId: string;
  domainVersion: string;
  campaignId: string;
  campaignDay: number;
  revision: string;
  sources: readonly CognitiveSource[];
  facts: readonly CognitiveWorldFact[];
  digest: string;
};

const validateValue = (
  fact: CognitiveWorldFact,
  domain: CompiledCognitiveDomain,
) => {
  const variable = domain.variables.get(fact.variableId);
  if (!variable) throw new Error(`${fact.id}: undeclared variable ${fact.variableId}`);
  const value = fact.value;
  if (variable.kind === "NUMBER") {
    if (typeof value !== "number" || !Number.isFinite(value))
      throw new Error(`${fact.id}: expected finite number`);
    if (variable.minimum !== undefined && value < variable.minimum)
      throw new Error(`${fact.id}: value below declared minimum`);
    if (variable.maximum !== undefined && value > variable.maximum)
      throw new Error(`${fact.id}: value above declared maximum`);
  } else if (variable.kind === "STRING" || variable.kind === "ENTITY_ID") {
    if (typeof value !== "string") throw new Error(`${fact.id}: expected string`);
  } else if (variable.kind === "BOOLEAN") {
    if (typeof value !== "boolean") throw new Error(`${fact.id}: expected boolean`);
  } else if (variable.kind === "ENUM") {
    if (typeof value !== "string" || !variable.enumValues?.includes(value))
      throw new Error(`${fact.id}: value is outside declared enum`);
  } else if (variable.kind === "NUMBER_SET") {
    if (!Array.isArray(value) || value.some((item) => typeof item !== "number"))
      throw new Error(`${fact.id}: expected number set`);
  } else if (variable.kind === "STRING_SET") {
    if (!Array.isArray(value) || value.some((item) => typeof item !== "string"))
      throw new Error(`${fact.id}: expected string set`);
  } else if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${fact.id}: expected record`);
  validateUncertainty(fact.uncertainty);
};

export const compileWorldSnapshot = (
  input: Omit<CognitiveWorldSnapshot, "digest">,
  domain: CompiledCognitiveDomain,
): CognitiveWorldSnapshot => {
  if (input.domainId !== domain.id || input.domainVersion !== domain.version)
    throw new Error("world snapshot domain does not match compiler");
  if (!input.campaignId.trim() || !input.revision.trim())
    throw new Error("world snapshot identity is incomplete");
  if (!Number.isInteger(input.campaignDay) || input.campaignDay < 1)
    throw new Error("campaign day must be a positive integer");
  const sourceIds = new Set<string>();
  for (const source of input.sources) {
    if (sourceIds.has(source.id)) throw new Error(`duplicate source ${source.id}`);
    sourceIds.add(source.id);
    if (!Number.isFinite(source.reliability) || source.reliability < 0 || source.reliability > 1)
      throw new Error(`${source.id}: reliability is outside [0,1]`);
  }
  const factIds = new Set<string>();
  for (const fact of input.facts) {
    if (factIds.has(fact.id)) throw new Error(`duplicate fact ${fact.id}`);
    factIds.add(fact.id);
    if (!fact.entityId.trim()) throw new Error(`${fact.id}: entity id is empty`);
    if (!Number.isInteger(fact.validFromDay) || !Number.isInteger(fact.observedAtDay))
      throw new Error(`${fact.id}: temporal coordinates must be integers`);
    if (fact.validUntilDay !== undefined && fact.validUntilDay < fact.validFromDay)
      throw new Error(`${fact.id}: validity interval is inverted`);
    for (const sourceId of fact.sourceIds)
      if (!sourceIds.has(sourceId)) throw new Error(`${fact.id}: unknown source ${sourceId}`);
    for (const parentId of fact.lineage)
      if (!factIds.has(parentId))
        throw new Error(`${fact.id}: lineage must reference an earlier fact ${parentId}`);
    validateValue(fact, domain);
  }
  const stable = cloneCognitive({
    ...input,
    sources: [...input.sources].sort((a, b) => a.id.localeCompare(b.id)),
    facts: [...input.facts].sort((a, b) => a.id.localeCompare(b.id)),
  });
  return { ...stable, digest: cognitiveDigest(stable) };
};

export const projectAvaVisibleWorld = (
  snapshot: CognitiveWorldSnapshot,
  domain: CompiledCognitiveDomain,
) => {
  const visibleSources = new Set(
    snapshot.sources
      .filter((source) => source.visibility !== "HIDDEN")
      .map((source) => source.id),
  );
  return compileWorldSnapshot(
    {
      domainId: snapshot.domainId,
      domainVersion: snapshot.domainVersion,
      campaignId: snapshot.campaignId,
      campaignDay: snapshot.campaignDay,
      revision: snapshot.revision,
      sources: snapshot.sources.filter((source) => visibleSources.has(source.id)),
      facts: snapshot.facts.filter(
        (fact) =>
          fact.visibility !== "HIDDEN" &&
          fact.sourceIds.every((sourceId) => visibleSources.has(sourceId)),
      ),
    },
    domain,
  );
};

const gameValue = (
  state: GameState,
  variableId: string,
  domain = DELENDA_COGNITIVE_DOMAIN,
): CognitiveValue => {
  const [namespace, first, second] = variableId.split(".");
  if (namespace === "state")
    return state[first as keyof GameState] as CognitiveValue;
  if (namespace === "production")
    return state.production[first as keyof GameState["production"]][
      second as keyof GameState["production"]["munitions"]
    ];
  if (namespace === "decision" && first === "projection-context")
    return avaVisibleDecisionContext(state, domain);
  throw new Error(`no authoritative GameState projection for ${variableId}`);
};

/**
 * Canonical input identity for every disclosed projection Ava may use.
 *
 * The cognitive domain's scalar facts are not the complete input to the game
 * projection circuits. Tempo, current posture, doctrine, production lines,
 * docket geometry, and active policies can all change a projected answer. We
 * therefore retain the complete disclosed projection context, not the raw
 * campaign object or its private tickets and hidden ledgers.
 */
const publicSituation = (state: GameState) => {
  const situation = situationForState(state);
  return {
    id: situation.id,
    day: situation.day,
    blueprintId: situation.blueprintId,
    calculusBlueprintId: situation.calculusBlueprintId,
    problemClass: situation.problemClass,
    sectorId: situation.sectorId,
    sector: situation.sector,
    headline: situation.headline,
    briefing: situation.briefing,
    question: situation.question,
    theater: situation.theater,
    terrain: situation.terrain,
    ground: situation.ground,
    network: situation.network,
    supply: situation.supply,
    intelligence: situation.intelligence,
    windowHours: situation.windowHours,
    maneuvers: [...situation.maneuvers],
    bands: situation.bands,
    standingOrder: situation.standingOrder,
    maneuverPresentations: situation.maneuverPresentations,
    contentPackVersion: situation.contentPackVersion,
  };
};

const publicPrompt = (
  prompt: ReturnType<typeof compileConvergence>["domestic"],
) => ({
  id: prompt.id,
  archetypeId: prompt.archetypeId,
  frameId: prompt.frameId,
  realizationId: prompt.realizationId,
  domain: prompt.domain,
  category: prompt.category,
  title: prompt.title,
  brief: prompt.brief,
  question: prompt.question,
  authority: prompt.authority,
  aliases: [...prompt.aliases],
  pressureBand: prompt.pressureBand,
  options: prompt.options.map((option) => ({
    id: option.id,
    familyId: option.family.id,
    choiceId: option.choice.id,
  })),
  matrixVersion: prompt.matrixVersion,
  evidence: [...prompt.evidence],
  operationalAnchor: prompt.operationalAnchor,
  convergence: prompt.convergence,
});

const publicDirectorHistory = (state: GameState) => {
  const latest = state.eventHistory[0];
  return {
    lastCalculusId: latest
      ? latest.calculusId ??
        CAMPAIGN_EVENT_CALCULUS[latest.eventId] ??
        latest.eventId
      : null,
    seenEventIds: [
      ...new Set(state.eventHistory.map((record) => record.eventId)),
    ].sort(),
  };
};

export const avaVisibleDecisionContext = (
  state: GameState,
  domain = DELENDA_COGNITIVE_DOMAIN,
): CognitiveValue => {
  const safe = projectAvaDisclosedState(state);
  const packet = compileConvergence(safe);
  const director = directorForState(safe);
  const adversaryObservation = disclosedAdversaryAssessment(safe);
  return cloneCognitive({
    domainId: domain.id,
    domainVersion: domain.version,
    campaignId: safe.campaignId,
    contentPackVersion: safe.contentPackVersion,
    projectionSeedPolicy: "AVA_DISCLOSED_PROJECTION_SEED_V1",
    theater: safe.theater,
    facts: domain.manifest.variableIds
      .filter(
        (variableId) => !domain.variables.get(variableId)?.projectionOnly,
      )
      .filter((variableId) => variableId !== "decision.projection-context")
      .filter(
        (variableId) =>
          domain.variables.get(variableId)?.visibility !== "HIDDEN",
      )
      .map((variableId) => [variableId, gameValue(safe, variableId, domain)]),
    policy: {
      status: safe.status,
      actions: safe.actions,
      target: safe.target,
      pendingTarget: safe.pendingTarget,
      tempo: safe.tempo,
      networkPosture: safe.networkPosture,
      maneuver: safe.maneuver,
      active: safe.active,
      locks: safe.locks,
      unlocked: [...safe.unlocked].sort(),
      affinityProofs: safe.affinityProofs,
      currentDayDecisions: safe.decisions
        .filter((decision) => decision.day === safe.day)
        .map((decision) => ({
          day: decision.day,
          family: decision.family,
          choice: decision.choice,
          familyId: decision.familyId ?? null,
          choiceId: decision.choiceId ?? null,
          domain: decision.domain ?? null,
          missionId: decision.missionId ?? null,
        })),
    },
    situation: publicSituation(safe),
    convergence: {
      activeDomains: [...packet.activeDomains].sort(),
      domestic: publicPrompt(packet.domestic),
      network: publicPrompt(packet.network),
    },
    director: {
      phaseId: director.phase.id,
      eventId: director.event.id,
      calculusId: director.event.calculusId ?? director.event.id,
      modifiers: director.modifiers,
      history: publicDirectorHistory(safe),
    },
    opportunityPressure:
      safe.opportunityHistory.find((record) => record.day === safe.day)
        ?.friendlyPressure ?? 0,
    theaterSectors: safe.theaterSectors
      .filter((sector) => sector.theater === safe.theater)
      .sort((left, right) => left.id.localeCompare(right.id)),
    operationalFacts: safe.operationalFacts
      .filter(
        (fact) =>
          fact.visible &&
          fact.createdDay <= safe.day &&
          (fact.expiresDay === null || fact.expiresDay >= safe.day),
      )
      .sort((left, right) => left.id.localeCompare(right.id)),
    adversaryObservation,
  } as unknown as CognitiveValue);
};

/**
 * Public-safe identity for Ava-visible cognitive state. Hidden campaign fields
 * must never influence proof identity or become a comparison oracle.
 */
export const avaVisibleWorldRevision = (
  state: GameState,
  domain = DELENDA_COGNITIVE_DOMAIN,
) =>
  `AVA-${cognitiveDigest({
    domainId: domain.id,
    domainVersion: domain.version,
    state: avaVisibleDecisionContext(state, domain),
  })}`;

export const worldSnapshotFromGameState = (
  state: GameState,
  revision: string,
  domain = DELENDA_COGNITIVE_DOMAIN,
): CognitiveWorldSnapshot => {
  const source: CognitiveSource = {
    id: `campaign:${state.campaignId}:revision:${revision}`,
    kind: "WORLD",
    label: "Authoritative campaign state",
    visibility: "AVA_VISIBLE",
    reliability: 1,
    independentGroup: `campaign:${state.campaignId}`,
  };
  return compileWorldSnapshot(
    {
      domainId: domain.id,
      domainVersion: domain.version,
      campaignId: state.campaignId,
      campaignDay: state.day,
      revision,
      sources: [source],
      facts: domain.manifest.variableIds
        .filter(
          (variableId) => !domain.variables.get(variableId)?.projectionOnly,
        )
        .map((variableId) => ({
        id: `fact:${variableId}`,
        variableId,
        entityId: "campaign",
        value: gameValue(state, variableId, domain),
        visibility: domain.variables.get(variableId)!.visibility,
        sourceIds: [source.id],
        lineage: [],
        validFromDay: state.day,
        observedAtDay: state.day,
        uncertainty: { kind: "EXACT" },
      })),
    },
    domain,
  );
};

export const worldFact = (
  snapshot: CognitiveWorldSnapshot,
  variableId: string,
  entityId = "campaign",
) => snapshot.facts.find((fact) => fact.variableId === variableId && fact.entityId === entityId) ?? null;

export const worldSnapshotSignature = (snapshot: CognitiveWorldSnapshot) =>
  canonicalJson({
    domainId: snapshot.domainId,
    campaignId: snapshot.campaignId,
    campaignDay: snapshot.campaignDay,
    revision: snapshot.revision,
    digest: snapshot.digest,
  });
