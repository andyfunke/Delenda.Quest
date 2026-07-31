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
  constraintIds: readonly string[];
};

export type CognitiveConstraintOperand =
  | { kind: "VARIABLE"; variableId: string }
  | { kind: "BINDING"; bindingId: string }
  | { kind: "LITERAL"; value: string | number | boolean | null };

export type CognitiveConstraintExpression =
  | {
      kind: "COMPARE";
      left: CognitiveConstraintOperand;
      operator: "EQ" | "NE" | "LT" | "LTE" | "GT" | "GTE" | "IN";
      right: CognitiveConstraintOperand;
    }
  | { kind: "ALL" | "ANY"; expressions: readonly CognitiveConstraintExpression[] }
  | { kind: "NOT"; expression: CognitiveConstraintExpression }
  | {
      kind: "QUANTIFY";
      values: CognitiveConstraintOperand;
      quantifier: "EVERY" | "SOME" | "NONE";
      operator: "EQ" | "NE" | "LT" | "LTE" | "GT" | "GTE";
      right: CognitiveConstraintOperand;
    };

export type CognitiveConstraintFailure =
  | "PREREQUISITE_BOUND"
  | "RESOURCE_BOUND"
  | "IMPOSSIBLE"
  | "FORBIDDEN";

export type CognitiveConstraintRepairSpec = {
  id: string;
  target: { kind: "BINDING"; bindingId: string };
  value: CognitiveConstraintOperand;
};

export type CognitiveConstraintSpec = {
  id: string;
  label: string;
  scope: "PRECONDITION" | "INVARIANT" | "DOCTRINE" | "RESOURCE";
  actionId?: string;
  expression: CognitiveConstraintExpression;
  failure: CognitiveConstraintFailure;
  repairs: readonly CognitiveConstraintRepairSpec[];
};

export type CognitiveTemporalPolicySpec = {
  phaseOrder: readonly string[];
  projectionLimitPhases: number;
  defaultFreshnessDays: number;
  intervalSemantics: "CLOSED_OPEN";
  horizons: readonly {
    id: string;
    startPhase: number;
    endPhase: number;
  }[];
};

export type CognitiveCausalEquationSpec = {
  id: string;
  targetVariableId: string;
  inputs: readonly { variableId: string; coefficient: number }[];
  intercept: number;
  minimum?: number;
  maximum?: number;
  delayPhases: number;
};

export type CognitiveCausalPolicySpec = {
  equations: readonly CognitiveCausalEquationSpec[];
};

export type CognitiveEpistemicPolicySpec = {
  id: string;
  actorIds: readonly string[];
  minimumSourceReliability: number;
  maximumEvidenceAgeDays: number;
  corroborationRule: "INDEPENDENT_RELIABILITY_MEAN";
  numericEstimationRule: "RELIABILITY_WEIGHTED_MEDIAN";
  contradictionRule: "PRESERVE_SUPPORT_AND_REFUTATION";
  marginalizationModelId: "FINITE_HYPOTHESIS_SUM";
  downweightFactors: Readonly<Record<"DEPENDENT" | "AGED", number>>;
};

export type CognitiveDecisionMetricSpec = {
  id: string;
  variableId: string;
  direction: "MAXIMIZE" | "MINIMIZE";
  minimum: number;
  maximum: number;
};

export type CognitiveDecisionModelSpec = {
  id: string;
  objectives: readonly {
    metricId: string;
    weight: number;
    hardMinimum?: number;
  }[];
};

export type CognitiveDecisionPolicySpec = {
  metrics: readonly CognitiveDecisionMetricSpec[];
  models: readonly CognitiveDecisionModelSpec[];
};

export type CognitivePlanningPolicySpec = {
  maxActions: number;
  actionIds: readonly string[];
  branches: readonly {
    id: string;
    constraintId: string;
    whenSatisfiedActionId: string;
    whenViolatedActionId: string;
  }[];
  terminations: readonly { id: string; constraintId: string }[];
};

export type CognitiveDomainSpec = {
  id: string;
  version: string;
  variables: readonly CognitiveVariableSpec[];
  concepts: readonly CognitiveConceptSpec[];
  actions: readonly CognitiveActionSpec[];
  constraints: readonly CognitiveConstraintSpec[];
  temporal: CognitiveTemporalPolicySpec;
  causal: CognitiveCausalPolicySpec;
  epistemic: CognitiveEpistemicPolicySpec;
  decision: CognitiveDecisionPolicySpec;
  planning: CognitivePlanningPolicySpec;
};

export type CompiledCognitiveDomain = {
  id: string;
  version: string;
  digest: string;
  variables: ReadonlyMap<string, CognitiveVariableSpec>;
  concepts: ReadonlyMap<string, CognitiveConceptSpec>;
  actions: ReadonlyMap<string, CognitiveActionSpec>;
  constraints: ReadonlyMap<string, CognitiveConstraintSpec>;
  temporal: CognitiveTemporalPolicySpec;
  causal: {
    equations: ReadonlyMap<string, CognitiveCausalEquationSpec>;
    order: readonly string[];
  };
  epistemic: CognitiveEpistemicPolicySpec;
  decision: {
    metrics: ReadonlyMap<string, CognitiveDecisionMetricSpec>;
    models: ReadonlyMap<string, CognitiveDecisionModelSpec>;
  };
  planning: CognitivePlanningPolicySpec;
  aliases: ReadonlyMap<string, readonly string[]>;
  manifest: {
    variableIds: readonly string[];
    conceptIds: readonly string[];
    actionIds: readonly string[];
    constraintIds: readonly string[];
    causalEquationIds: readonly string[];
    epistemicPolicyId: string;
    decisionMetricIds: readonly string[];
    decisionModelIds: readonly string[];
    planningActionIds: readonly string[];
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
  const constraintIds = source.constraints.map((item) => item.id);
  if (!uniqueStrings(variableIds)) throw new Error(`${source.id}: duplicate variable id`);
  if (!uniqueStrings(conceptIds)) throw new Error(`${source.id}: duplicate concept id`);
  if (!uniqueStrings(actionIds)) throw new Error(`${source.id}: duplicate action id`);
  if (!uniqueStrings(constraintIds)) throw new Error(`${source.id}: duplicate constraint id`);
  source.variables.forEach(validateVariable);
  const variableSet = new Set(variableIds);
  const conceptSet = new Set(conceptIds);
  const actionSet = new Set(actionIds);
  const constraintSet = new Set(constraintIds);

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
    if (!uniqueStrings(action.constraintIds))
      throw new Error(`${action.id}: duplicate constraint reference`);
    for (const constraintId of action.constraintIds)
      if (!constraintSet.has(constraintId))
        throw new Error(`${action.id}: unknown constraint ${constraintId}`);
  }

  const validateOperand = (
    operand: CognitiveConstraintOperand,
    constraint: CognitiveConstraintSpec,
  ) => {
    if (operand.kind === "VARIABLE") {
      if (!variableSet.has(operand.variableId))
        throw new Error(`${constraint.id}: unknown constraint variable ${operand.variableId}`);
      return;
    }
    if (operand.kind === "BINDING") {
      const action = constraint.actionId
        ? source.actions.find((item) => item.id === constraint.actionId)
        : undefined;
      if (!action?.arguments.some((argument) => argument.id === operand.bindingId))
        throw new Error(`${constraint.id}: unknown constraint binding ${operand.bindingId}`);
    }
  };
  const validateExpression = (
    expression: CognitiveConstraintExpression,
    constraint: CognitiveConstraintSpec,
  ): void => {
    if (expression.kind === "COMPARE") {
      validateOperand(expression.left, constraint);
      validateOperand(expression.right, constraint);
      return;
    }
    if (expression.kind === "NOT") {
      validateExpression(expression.expression, constraint);
      return;
    }
    if ("expressions" in expression) {
      if (!expression.expressions.length)
        throw new Error(`${constraint.id}: logical constraint cannot be empty`);
      expression.expressions.forEach((child) => validateExpression(child, constraint));
      return;
    }
    validateOperand(expression.values, constraint);
    validateOperand(expression.right, constraint);
  };
  for (const constraint of source.constraints) {
    assertIdentifier(constraint.id, "constraint");
    if (!constraint.label.trim()) throw new Error(`${constraint.id}: constraint label is empty`);
    if (constraint.actionId && !actionSet.has(constraint.actionId))
      throw new Error(`${constraint.id}: unknown constraint action ${constraint.actionId}`);
    validateExpression(constraint.expression, constraint);
    const repairIds = constraint.repairs.map((repair) => repair.id);
    if (!uniqueStrings(repairIds)) throw new Error(`${constraint.id}: duplicate repair id`);
    for (const repair of constraint.repairs) {
      assertIdentifier(repair.id, `${constraint.id} repair`);
      validateOperand(repair.target, constraint);
      validateOperand(repair.value, constraint);
    }
  }
  if (!source.temporal.phaseOrder.length || !uniqueStrings(source.temporal.phaseOrder))
    throw new Error(`${source.id}: temporal phase order must be nonempty and unique`);
  if (
    !Number.isInteger(source.temporal.projectionLimitPhases) ||
    source.temporal.projectionLimitPhases < 1
  )
    throw new Error(`${source.id}: temporal projection limit must be positive`);
  if (
    !Number.isInteger(source.temporal.defaultFreshnessDays) ||
    source.temporal.defaultFreshnessDays < 0
  )
    throw new Error(`${source.id}: temporal freshness must be nonnegative`);
  const horizonIds = source.temporal.horizons.map((horizon) => horizon.id);
  if (!source.temporal.horizons.length || !uniqueStrings(horizonIds))
    throw new Error(`${source.id}: temporal horizons must be nonempty and unique`);
  let nextPhase = 0;
  for (const horizon of source.temporal.horizons) {
    assertIdentifier(horizon.id, "temporal horizon");
    if (
      !Number.isInteger(horizon.startPhase) ||
      !Number.isInteger(horizon.endPhase) ||
      horizon.startPhase !== nextPhase ||
      horizon.endPhase <= horizon.startPhase
    )
      throw new Error(`${source.id}: temporal horizons overlap or contain a gap`);
    nextPhase = horizon.endPhase;
  }
  if (nextPhase !== source.temporal.projectionLimitPhases)
    throw new Error(`${source.id}: temporal horizons must cover the projection limit`);

  const equationIds = source.causal.equations.map((equation) => equation.id);
  if (!uniqueStrings(equationIds)) throw new Error(`${source.id}: duplicate causal equation id`);
  const targetOwners = new Map<string, string>();
  for (const equation of source.causal.equations) {
    assertIdentifier(equation.id, "causal equation");
    if (!variableSet.has(equation.targetVariableId))
      throw new Error(`${equation.id}: unknown causal target ${equation.targetVariableId}`);
    if (targetOwners.has(equation.targetVariableId))
      throw new Error(`${equation.id}: duplicate causal target ${equation.targetVariableId}`);
    targetOwners.set(equation.targetVariableId, equation.id);
    if (!equation.inputs.length || !uniqueStrings(equation.inputs.map((input) => input.variableId)))
      throw new Error(`${equation.id}: causal inputs must be nonempty and unique`);
    for (const input of equation.inputs) {
      if (!variableSet.has(input.variableId))
        throw new Error(`${equation.id}: unknown causal input ${input.variableId}`);
      if (!Number.isFinite(input.coefficient))
        throw new Error(`${equation.id}: causal coefficient must be finite`);
    }
    if (!Number.isFinite(equation.intercept))
      throw new Error(`${equation.id}: causal intercept must be finite`);
    if (
      equation.minimum !== undefined &&
      equation.maximum !== undefined &&
      equation.minimum > equation.maximum
    )
      throw new Error(`${equation.id}: causal range is inverted`);
    if (
      !Number.isInteger(equation.delayPhases) ||
      equation.delayPhases < 0 ||
      equation.delayPhases > source.temporal.projectionLimitPhases
    )
      throw new Error(`${equation.id}: causal delay exceeds temporal policy`);
  }
  const equationByTarget = new Map(
    source.causal.equations.map((equation) => [equation.targetVariableId, equation]),
  );
  const equationOrder: string[] = [];
  const equationVisiting = new Set<string>();
  const equationVisited = new Set<string>();
  const visitEquation = (equation: CognitiveCausalEquationSpec) => {
    if (equationVisiting.has(equation.id))
      throw new Error(`${source.id}: causal graph contains a cycle at ${equation.id}`);
    if (equationVisited.has(equation.id)) return;
    equationVisiting.add(equation.id);
    for (const input of equation.inputs) {
      const parent = equationByTarget.get(input.variableId);
      if (parent) visitEquation(parent);
    }
    equationVisiting.delete(equation.id);
    equationVisited.add(equation.id);
    equationOrder.push(equation.id);
  };
  [...source.causal.equations]
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach(visitEquation);

  assertIdentifier(source.epistemic.id, "epistemic policy");
  if (!source.epistemic.actorIds.length || !uniqueStrings(source.epistemic.actorIds))
    throw new Error(`${source.epistemic.id}: epistemic actors must be nonempty and unique`);
  source.epistemic.actorIds.forEach((actorId) => assertIdentifier(actorId, "epistemic actor"));
  if (
    !Number.isFinite(source.epistemic.minimumSourceReliability) ||
    source.epistemic.minimumSourceReliability < 0 ||
    source.epistemic.minimumSourceReliability > 1
  ) throw new Error(`${source.epistemic.id}: minimum source reliability is outside [0,1]`);
  if (
    !Number.isInteger(source.epistemic.maximumEvidenceAgeDays) ||
    source.epistemic.maximumEvidenceAgeDays < 0
  ) throw new Error(`${source.epistemic.id}: evidence age must be a nonnegative integer`);
  if (source.epistemic.corroborationRule !== "INDEPENDENT_RELIABILITY_MEAN")
    throw new Error(`${source.epistemic.id}: unknown corroboration rule`);
  if (source.epistemic.numericEstimationRule !== "RELIABILITY_WEIGHTED_MEDIAN")
    throw new Error(`${source.epistemic.id}: unknown estimation rule`);
  if (source.epistemic.contradictionRule !== "PRESERVE_SUPPORT_AND_REFUTATION")
    throw new Error(`${source.epistemic.id}: unknown contradiction rule`);
  if (source.epistemic.marginalizationModelId !== "FINITE_HYPOTHESIS_SUM")
    throw new Error(`${source.epistemic.id}: unknown marginalization model`);
  if (!Object.hasOwn(source.epistemic.downweightFactors, "DEPENDENT") ||
      !Object.hasOwn(source.epistemic.downweightFactors, "AGED"))
    throw new Error(`${source.epistemic.id}: downweight factors are incomplete`);
  for (const [reason, factor] of Object.entries(source.epistemic.downweightFactors))
    if (!Number.isFinite(factor) || factor <= 0 || factor > 1)
      throw new Error(`${source.epistemic.id}: ${reason} downweight is outside (0,1]`);

  const decisionMetricIds = source.decision.metrics.map((metric) => metric.id);
  const decisionModelIds = source.decision.models.map((model) => model.id);
  if (!decisionMetricIds.length || !uniqueStrings(decisionMetricIds))
    throw new Error(`${source.id}: decision metrics must be nonempty and unique`);
  if (!decisionModelIds.length || !uniqueStrings(decisionModelIds))
    throw new Error(`${source.id}: decision models must be nonempty and unique`);
  const metricSet = new Set(decisionMetricIds);
  for (const metric of source.decision.metrics) {
    assertIdentifier(metric.id, "decision metric");
    if (source.variables.find((variable) => variable.id === metric.variableId)?.kind !== "NUMBER")
      throw new Error(`${metric.id}: decision metric requires a compiled numeric variable`);
    if (!Number.isFinite(metric.minimum) || !Number.isFinite(metric.maximum) || metric.maximum <= metric.minimum)
      throw new Error(`${metric.id}: decision normalization range is invalid`);
  }
  for (const model of source.decision.models) {
    assertIdentifier(model.id, "decision model");
    const objectiveIds = model.objectives.map((objective) => objective.metricId);
    if (!objectiveIds.length || !uniqueStrings(objectiveIds))
      throw new Error(`${model.id}: decision objectives must be nonempty and unique`);
    let weight = 0;
    for (const objective of model.objectives) {
      if (!metricSet.has(objective.metricId)) throw new Error(`${model.id}: unknown metric ${objective.metricId}`);
      if (!Number.isFinite(objective.weight) || objective.weight < 0)
        throw new Error(`${model.id}: objective weight is invalid`);
      if (objective.hardMinimum !== undefined && !Number.isFinite(objective.hardMinimum))
        throw new Error(`${model.id}: hard objective is invalid`);
      weight += objective.weight;
    }
    if (Math.abs(weight - 1) > 1e-9) throw new Error(`${model.id}: objective weights must sum to one`);
  }

  if (!Number.isInteger(source.planning.maxActions) || source.planning.maxActions < 1)
    throw new Error(`${source.id}: planning action limit is invalid`);
  if (!uniqueStrings(source.planning.actionIds) ||
      [...source.planning.actionIds].sort().join("|") !== [...actionIds].sort().join("|"))
    throw new Error(`${source.id}: every compiled action requires exactly one planning policy`);
  const branchIds = source.planning.branches.map((branch) => branch.id);
  const terminationIds = source.planning.terminations.map((item) => item.id);
  if (!uniqueStrings(branchIds) || !uniqueStrings(terminationIds))
    throw new Error(`${source.id}: duplicate planning branch or termination`);
  for (const branch of source.planning.branches) {
    assertIdentifier(branch.id, "planning branch");
    if (!constraintSet.has(branch.constraintId) || !actionSet.has(branch.whenSatisfiedActionId) || !actionSet.has(branch.whenViolatedActionId))
      throw new Error(`${branch.id}: planning branch has an open reference`);
  }
  for (const termination of source.planning.terminations) {
    assertIdentifier(termination.id, "planning termination");
    if (!constraintSet.has(termination.constraintId)) throw new Error(`${termination.id}: planning termination has an open reference`);
  }

  const snapshot = cloneCognitive({
    ...source,
    variables: [...source.variables].sort((a, b) => a.id.localeCompare(b.id)),
    concepts: [...source.concepts].sort((a, b) => a.id.localeCompare(b.id)),
    actions: [...source.actions].sort((a, b) => a.id.localeCompare(b.id)),
    constraints: [...source.constraints].sort((a, b) => a.id.localeCompare(b.id)),
    causal: {
      equations: [...source.causal.equations].sort((a, b) => a.id.localeCompare(b.id)),
    },
    epistemic: source.epistemic,
    decision: {
      metrics: [...source.decision.metrics].sort((a, b) => a.id.localeCompare(b.id)),
      models: [...source.decision.models].sort((a, b) => a.id.localeCompare(b.id)),
    },
    planning: source.planning,
  });
  return {
    id: source.id,
    version: source.version,
    digest: cognitiveDigest(snapshot),
    variables: new Map(snapshot.variables.map((item) => [item.id, item])),
    concepts: new Map(snapshot.concepts.map((item) => [item.id, item])),
    actions: new Map(snapshot.actions.map((item) => [item.id, item])),
    constraints: new Map(snapshot.constraints.map((item) => [item.id, item])),
    temporal: snapshot.temporal,
    causal: {
      equations: new Map(snapshot.causal.equations.map((item) => [item.id, item])),
      order: equationOrder,
    },
    epistemic: snapshot.epistemic,
    decision: {
      metrics: new Map(snapshot.decision.metrics.map((item) => [item.id, item])),
      models: new Map(snapshot.decision.models.map((item) => [item.id, item])),
    },
    planning: snapshot.planning,
    aliases: new Map(
      [...aliasOwners].map(([alias, owners]) => [alias, [...owners].sort()]),
    ),
    manifest: {
      variableIds: [...variableIds].sort(),
      conceptIds: [...conceptIds].sort(),
      actionIds: [...actionIds].sort(),
      constraintIds: [...constraintIds].sort(),
      causalEquationIds: [...equationIds].sort(),
      epistemicPolicyId: snapshot.epistemic.id,
      decisionMetricIds: [...decisionMetricIds].sort(),
      decisionModelIds: [...decisionModelIds].sort(),
      planningActionIds: [...snapshot.planning.actionIds].sort(),
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

const nonnegativeStateVariables = new Set([
  "day", "actions", "population", "workforce", "armed", "deployable",
  "voluntary", "forced", "queue", "training", "duration", "reserves",
  "equipment", "materiel", "treasury", "intelligence", "enemy", "doctrine",
  "doctrineEarned", "deserters", "retained", "intercepted",
  "patrolCommitment", "maintenanceDebt",
]);

const baseVariables: CognitiveVariableSpec[] = numericStateVariables.map((id) => ({
  id: `state.${id}`,
  kind: "NUMBER",
  visibility: "AVA_VISIBLE",
  authority: "READ_ONLY",
  ...(nonnegativeStateVariables.has(id) ? { minimum: 0 } : {}),
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
      constraintIds: [],
    },
    {
      id: "issue-order",
      label: "Prepare an authored campaign order",
      authority: "PREPARE",
      arguments: [
        { id: "actionId", kind: "ENTITY_ID", required: true },
        { id: "amount", kind: "NUMBER", required: true, variableId: "state.actions" },
      ],
      resourceVariables: ["state.actions"],
      durationPhases: 1,
      constraintIds: ["campaign-has-orders", "issue-order-capacity"],
    },
  ],
  constraints: [
    {
      id: "campaign-has-orders",
      label: "At least one strategic order remains",
      scope: "PRECONDITION",
      actionId: "issue-order",
      expression: {
        kind: "COMPARE",
        left: { kind: "VARIABLE", variableId: "state.actions" },
        operator: "GTE",
        right: { kind: "LITERAL", value: 1 },
      },
      failure: "PREREQUISITE_BOUND",
      repairs: [],
    },
    {
      id: "issue-order-capacity",
      label: "Requested orders do not exceed the visible order budget",
      scope: "RESOURCE",
      actionId: "issue-order",
      expression: {
        kind: "COMPARE",
        left: { kind: "VARIABLE", variableId: "state.actions" },
        operator: "GTE",
        right: { kind: "BINDING", bindingId: "amount" },
      },
      failure: "RESOURCE_BOUND",
      repairs: [
        {
          id: "cap-order-amount",
          target: { kind: "BINDING", bindingId: "amount" },
          value: { kind: "VARIABLE", variableId: "state.actions" },
        },
      ],
    },
    {
      id: "front-survivable",
      label: "The front remains above the declared loss line",
      scope: "INVARIANT",
      expression: {
        kind: "COMPARE",
        left: { kind: "VARIABLE", variableId: "state.front" },
        operator: "GT",
        right: { kind: "LITERAL", value: -12 },
      },
      failure: "IMPOSSIBLE",
      repairs: [],
    },
    {
      id: "atrocity-doctrine-limit",
      label: "Atrocity exposure remains within command doctrine",
      scope: "DOCTRINE",
      expression: {
        kind: "COMPARE",
        left: { kind: "VARIABLE", variableId: "state.atrocityExposure" },
        operator: "LTE",
        right: { kind: "LITERAL", value: 90 },
      },
      failure: "FORBIDDEN",
      repairs: [],
    },
  ],
  temporal: {
    phaseOrder: ["DAWN", "COMMAND", "ACTION", "RESOLUTION"],
    projectionLimitPhases: 16,
    defaultFreshnessDays: 1,
    intervalSemantics: "CLOSED_OPEN",
    horizons: [
      { id: "immediate", startPhase: 0, endPhase: 1 },
      { id: "current-day", startPhase: 1, endPhase: 4 },
      { id: "near", startPhase: 4, endPhase: 8 },
      { id: "operational", startPhase: 8, endPhase: 16 },
    ],
  },
  causal: {
    equations: [
      {
        id: "readiness-from-support",
        targetVariableId: "state.readiness",
        inputs: [
          { variableId: "state.materiel", coefficient: 0.5 },
          { variableId: "state.equipment", coefficient: 0.5 },
        ],
        intercept: 0,
        minimum: 0,
        maximum: 100,
        delayPhases: 1,
      },
      {
        id: "front-from-readiness",
        targetVariableId: "state.front",
        inputs: [{ variableId: "state.readiness", coefficient: 0.1 }],
        intercept: -5,
        delayPhases: 1,
      },
    ],
  },
  epistemic: {
    id: "delenda-evidence-policy",
    actorIds: ["ava", "command", "player"],
    minimumSourceReliability: 0.1,
    maximumEvidenceAgeDays: 3,
    corroborationRule: "INDEPENDENT_RELIABILITY_MEAN",
    numericEstimationRule: "RELIABILITY_WEIGHTED_MEDIAN",
    contradictionRule: "PRESERVE_SUPPORT_AND_REFUTATION",
    marginalizationModelId: "FINITE_HYPOTHESIS_SUM",
    downweightFactors: { DEPENDENT: 0.5, AGED: 0.5 },
  },
  decision: {
    metrics: [
      { id: "readiness", variableId: "state.readiness", direction: "MAXIMIZE", minimum: 0, maximum: 100 },
      { id: "front", variableId: "state.front", direction: "MAXIMIZE", minimum: -12, maximum: 12 },
      { id: "treasury", variableId: "state.treasury", direction: "MAXIMIZE", minimum: 0, maximum: 100 },
    ],
    models: [
      {
        id: "strategic-balance",
        objectives: [
          { metricId: "readiness", weight: 0.4 },
          { metricId: "front", weight: 0.4, hardMinimum: -12 },
          { metricId: "treasury", weight: 0.2 },
        ],
      },
      {
        id: "front-priority",
        objectives: [
          { metricId: "readiness", weight: 0.2 },
          { metricId: "front", weight: 0.7, hardMinimum: -12 },
          { metricId: "treasury", weight: 0.1 },
        ],
      },
    ],
  },
  planning: {
    maxActions: 8,
    actionIds: ["inspect", "issue-order"],
    branches: [
      { id: "orders-available", constraintId: "campaign-has-orders", whenSatisfiedActionId: "issue-order", whenViolatedActionId: "inspect" },
    ],
    terminations: [
      { id: "front-loss-line", constraintId: "front-survivable" },
    ],
  },
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
