import { CONCEPTS } from "../concepts";
import type { GameState } from "../game";
import {
  assertIdentifier,
  canonicalJson,
  cloneCognitive,
  cognitiveDigest,
  type CognitiveAuthority,
  type CognitiveValueKind,
  type CognitiveVisibility,
  uniqueStrings,
} from "./cognitive-types";

export type CognitiveVariableSpec = {
  id: string;
  kind: CognitiveValueKind;
  visibility: CognitiveVisibility;
  authority: CognitiveAuthority;
  unit?: string;
  minimum?: number;
  maximum?: number;
  enumValues?: readonly string[];
  freshnessDays?: number;
};

export type CognitiveConceptSpec = {
  id: string;
  label: string;
  aliases: readonly string[];
  kind: "ENTITY" | "VARIABLE" | "ACTION" | "RELATION" | "DOCTRINE";
  variableId?: string;
  related: readonly string[];
};

export type CognitiveArgumentSpec = {
  id: string;
  kind: CognitiveValueKind;
  required: boolean;
  variableId?: string;
};

export type CognitiveActionSpec = {
  id: string;
  label: string;
  authority: Exclude<CognitiveAuthority, "READ_ONLY">;
  arguments: readonly CognitiveArgumentSpec[];
  resourceVariables: readonly string[];
  durationPhases: number;
};

export type CognitiveDomainSpec = {
  id: string;
  version: string;
  variables: readonly CognitiveVariableSpec[];
  concepts: readonly CognitiveConceptSpec[];
  actions: readonly CognitiveActionSpec[];
};

export type CompiledCognitiveDomain = {
  id: string;
  version: string;
  digest: string;
  variables: ReadonlyMap<string, CognitiveVariableSpec>;
  concepts: ReadonlyMap<string, CognitiveConceptSpec>;
  actions: ReadonlyMap<string, CognitiveActionSpec>;
  aliases: ReadonlyMap<string, readonly string[]>;
  manifest: {
    variableIds: readonly string[];
    conceptIds: readonly string[];
    actionIds: readonly string[];
  };
};

const normalizedAlias = (value: string) =>
  value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const validateVariable = (variable: CognitiveVariableSpec) => {
  assertIdentifier(variable.id, "variable");
  if (
    variable.minimum !== undefined &&
    (!Number.isFinite(variable.minimum) || variable.kind !== "NUMBER")
  )
    throw new Error(`${variable.id}: minimum requires a numeric variable`);
  if (
    variable.maximum !== undefined &&
    (!Number.isFinite(variable.maximum) || variable.kind !== "NUMBER")
  )
    throw new Error(`${variable.id}: maximum requires a numeric variable`);
  if (
    variable.minimum !== undefined &&
    variable.maximum !== undefined &&
    variable.minimum > variable.maximum
  )
    throw new Error(`${variable.id}: variable range is inverted`);
  if (variable.kind === "ENUM") {
    if (!variable.enumValues?.length || !uniqueStrings(variable.enumValues))
      throw new Error(`${variable.id}: enum values must be nonempty and unique`);
  } else if (variable.enumValues)
    throw new Error(`${variable.id}: enum values require ENUM kind`);
  if (
    variable.freshnessDays !== undefined &&
    (!Number.isInteger(variable.freshnessDays) || variable.freshnessDays < 0)
  )
    throw new Error(`${variable.id}: freshnessDays must be a nonnegative integer`);
};

export const compileCognitiveDomain = (
  source: CognitiveDomainSpec,
): CompiledCognitiveDomain => {
  assertIdentifier(source.id, "domain");
  if (!source.version.trim()) throw new Error(`${source.id}: version is required`);
  if (!source.variables.length) throw new Error(`${source.id}: no variables declared`);
  const variableIds = source.variables.map((item) => item.id);
  const conceptIds = source.concepts.map((item) => item.id);
  const actionIds = source.actions.map((item) => item.id);
  if (!uniqueStrings(variableIds)) throw new Error(`${source.id}: duplicate variable id`);
  if (!uniqueStrings(conceptIds)) throw new Error(`${source.id}: duplicate concept id`);
  if (!uniqueStrings(actionIds)) throw new Error(`${source.id}: duplicate action id`);
  source.variables.forEach(validateVariable);
  const variableSet = new Set(variableIds);
  const conceptSet = new Set(conceptIds);

  const aliasOwners = new Map<string, string[]>();
  for (const concept of source.concepts) {
    assertIdentifier(concept.id, "concept");
    if (!concept.label.trim()) throw new Error(`${concept.id}: concept label is empty`);
    if (concept.variableId && !variableSet.has(concept.variableId))
      throw new Error(`${concept.id}: unknown variable ${concept.variableId}`);
    if (!uniqueStrings(concept.related))
      throw new Error(`${concept.id}: duplicate related concept`);
    for (const related of concept.related)
      if (!conceptSet.has(related))
        throw new Error(`${concept.id}: unknown related concept ${related}`);
    const aliases = [...new Set(
      [concept.id, concept.label, ...concept.aliases]
        .map(normalizedAlias)
        .filter(Boolean),
    )];
    for (const alias of aliases)
      aliasOwners.set(alias, [...(aliasOwners.get(alias) ?? []), concept.id]);
  }

  for (const action of source.actions) {
    assertIdentifier(action.id, "action");
    if (!action.label.trim()) throw new Error(`${action.id}: action label is empty`);
    if (!Number.isInteger(action.durationPhases) || action.durationPhases < 0)
      throw new Error(`${action.id}: duration must be a nonnegative integer`);
    const argumentIds = action.arguments.map((item) => item.id);
    if (!uniqueStrings(argumentIds)) throw new Error(`${action.id}: duplicate argument`);
    for (const argument of action.arguments) {
      assertIdentifier(argument.id, `${action.id} argument`);
      if (argument.variableId && !variableSet.has(argument.variableId))
        throw new Error(`${action.id}: unknown argument variable ${argument.variableId}`);
    }
    if (!uniqueStrings(action.resourceVariables))
      throw new Error(`${action.id}: duplicate resource variable`);
    for (const variableId of action.resourceVariables)
      if (!variableSet.has(variableId))
        throw new Error(`${action.id}: unknown resource variable ${variableId}`);
  }

  const snapshot = cloneCognitive({
    ...source,
    variables: [...source.variables].sort((a, b) => a.id.localeCompare(b.id)),
    concepts: [...source.concepts].sort((a, b) => a.id.localeCompare(b.id)),
    actions: [...source.actions].sort((a, b) => a.id.localeCompare(b.id)),
  });
  return {
    id: source.id,
    version: source.version,
    digest: cognitiveDigest(snapshot),
    variables: new Map(snapshot.variables.map((item) => [item.id, item])),
    concepts: new Map(snapshot.concepts.map((item) => [item.id, item])),
    actions: new Map(snapshot.actions.map((item) => [item.id, item])),
    aliases: new Map(
      [...aliasOwners].map(([alias, owners]) => [alias, [...owners].sort()]),
    ),
    manifest: {
      variableIds: [...variableIds].sort(),
      conceptIds: [...conceptIds].sort(),
      actionIds: [...actionIds].sort(),
    },
  };
};

const numericStateVariables = [
  "day", "actions", "population", "workforce", "armed", "deployable",
  "voluntary", "forced", "queue", "training", "duration", "quality",
  "reserves", "readiness", "equipment", "materiel", "treasury",
  "legitimacy", "resistance", "dependency", "intelligence", "front",
  "enemy", "doctrine", "doctrineEarned", "atrocityExposure", "reciprocity",
  "desertionPressure", "deserters", "retained", "intercepted",
  "patrolCommitment", "maintenanceDebt",
] as const satisfies readonly (keyof GameState)[];

const percentVariables = new Set([
  "quality", "readiness", "equipment", "materiel", "legitimacy",
  "resistance", "dependency", "intelligence", "atrocityExposure",
  "reciprocity", "desertionPressure",
]);

const baseVariables: CognitiveVariableSpec[] = numericStateVariables.map((id) => ({
  id: `state.${id}`,
  kind: "NUMBER",
  visibility: "AVA_VISIBLE",
  authority: "READ_ONLY",
  ...(percentVariables.has(id) ? { unit: "percent", minimum: 0, maximum: 100 } : {}),
}));

for (const resource of ["munitions", "armor", "flight", "drones"] as const)
  for (const field of ["allocation", "stock", "output", "use"] as const)
    baseVariables.push({
      id: `production.${resource}.${field}`,
      kind: "NUMBER",
      visibility: "AVA_VISIBLE",
      authority: "READ_ONLY",
      minimum: 0,
      ...(field === "allocation" ? { maximum: 100, unit: "percent" } : {}),
    });

const conceptEntries = Object.values(CONCEPTS);
const knownConceptIds = new Set(conceptEntries.map((concept) => concept.id));
const baseConcepts: CognitiveConceptSpec[] = conceptEntries.map((concept) => ({
  id: concept.id,
  label: concept.label,
  aliases: [],
  kind: "ENTITY",
  related: concept.related.filter((id) => knownConceptIds.has(id)),
}));

export const DELENDA_COGNITIVE_DOMAIN_SPEC: CognitiveDomainSpec = {
  id: "delenda-cognitive-domain",
  version: "1.0.0",
  variables: baseVariables,
  concepts: baseConcepts,
  actions: [
    {
      id: "inspect",
      label: "Inspect visible state",
      authority: "PLAN_ONLY",
      arguments: [{ id: "subject", kind: "ENTITY_ID", required: true }],
      resourceVariables: [],
      durationPhases: 0,
    },
    {
      id: "issue-order",
      label: "Prepare an authored campaign order",
      authority: "PREPARE",
      arguments: [{ id: "actionId", kind: "ENTITY_ID", required: true }],
      resourceVariables: ["state.actions"],
      durationPhases: 1,
    },
  ],
};

export const DELENDA_COGNITIVE_DOMAIN = compileCognitiveDomain(
  DELENDA_COGNITIVE_DOMAIN_SPEC,
);

export const cognitiveDomainSignature = (domain: CompiledCognitiveDomain) =>
  canonicalJson({
    id: domain.id,
    version: domain.version,
    digest: domain.digest,
    manifest: domain.manifest,
  });
