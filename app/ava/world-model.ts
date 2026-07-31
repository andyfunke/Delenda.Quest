import type { GameState } from "../game";
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
      ...snapshot,
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

const gameValue = (state: GameState, variableId: string): CognitiveValue => {
  const [namespace, first, second] = variableId.split(".");
  if (namespace === "state")
    return state[first as keyof GameState] as CognitiveValue;
  if (namespace === "production")
    return state.production[first as keyof GameState["production"]][
      second as keyof GameState["production"]["munitions"]
    ];
  throw new Error(`no authoritative GameState projection for ${variableId}`);
};

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
      facts: domain.manifest.variableIds.map((variableId) => ({
        id: `fact:${variableId}`,
        variableId,
        entityId: "campaign",
        value: gameValue(state, variableId),
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
