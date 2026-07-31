import type {
  CognitiveCausalEquationSpec,
  CompiledCognitiveDomain,
} from "./cognitive-domain";
import {
  cloneCognitive,
  cognitiveDigest,
  type CognitiveValue,
} from "./cognitive-types";
import type { OperatorAdapter } from "./operator-algebra";
import {
  compileWorldSnapshot,
  type CognitiveWorldFact,
  type CognitiveWorldSnapshot,
} from "./world-model";

export type CausalIntervention = {
  variableId: string;
  value: number;
  role: "TREATMENT" | "CONTROL";
};

export type CausalScenarioRequest = {
  kind: "SCENARIO";
  id: string;
  expectedWorldRevision: string;
  scenarioId: string;
  interventions: readonly CausalIntervention[];
  assumptions: readonly string[];
  horizonPhases: number;
};

export type CausalCounterfactualRequest = {
  kind: "COUNTERFACTUAL";
  id: string;
  expectedWorldRevision: string;
  scenario: CausalScenarioRequest;
};

export type CausalFindCauseRequest = {
  kind: "FIND_CAUSE";
  id: string;
  expectedWorldRevision: string;
  effectVariableId: string;
  scenario?: CausalScenarioRequest | unknown;
  observationalFactIds?: readonly string[];
};

export type CausalRequest =
  | CausalScenarioRequest
  | CausalCounterfactualRequest
  | CausalFindCauseRequest;

export type CausalChange = {
  variableId: string;
  baseline: number;
  counterfactual: number;
  arrivalPhase: number;
  interventionIds: readonly string[];
  sourceFactIds: readonly string[];
  equationId?: string;
};

export type CausalResult = {
  requestId: string;
  worldRevision: string;
  status:
    | "INTERVENTION_PROPAGATED"
    | "COUNTERFACTUAL_COMPUTED"
    | "IDENTIFIED_BY_INTERVENTION"
    | "CANDIDATES_ONLY"
    | "UNEXPLAINED";
  scenarioId?: string;
  changes: readonly CausalChange[];
  causeVariableIds: readonly string[];
  candidateVariableIds: readonly string[];
  assumptions: readonly string[];
  responsibleFactIds: readonly string[];
  proofIds: readonly string[];
  digest: string;
};

type ProjectionDatum = {
  value: number;
  arrivalPhase: number;
  causes: Set<string>;
  sourceFactIds: Set<string>;
  equationId?: string;
};

const unique = (values: readonly string[]) => [...new Set(values)].sort();

const validateWorld = (
  world: CognitiveWorldSnapshot,
  domain: CompiledCognitiveDomain,
  expectedRevision: string,
) => {
  if (expectedRevision !== world.revision)
    throw new Error("causal request world revision is stale");
  const { digest, ...input } = world;
  if (compileWorldSnapshot(input, domain).digest !== digest)
    throw new Error("causal world digest is forged");
};

const visibleNumericFacts = (world: CognitiveWorldSnapshot) => {
  const facts = new Map<string, CognitiveWorldFact>();
  for (const fact of world.facts)
    if (fact.visibility !== "HIDDEN" && typeof fact.value === "number")
      facts.set(fact.variableId, fact);
  return facts;
};

const equationValue = (
  equation: CognitiveCausalEquationSpec,
  values: ReadonlyMap<string, ProjectionDatum>,
) => {
  let value = equation.intercept;
  for (const input of equation.inputs) {
    const datum = values.get(input.variableId);
    if (!datum) throw new Error(`${equation.id}: causal input ${input.variableId} is not Ava-visible numeric state`);
    value += datum.value * input.coefficient;
  }
  if (equation.minimum !== undefined) value = Math.max(equation.minimum, value);
  if (equation.maximum !== undefined) value = Math.min(equation.maximum, value);
  if (!Number.isFinite(value)) throw new Error(`${equation.id}: causal equation produced a nonfinite value`);
  return value;
};

const project = (
  scenarioId: string,
  interventions: readonly CausalIntervention[],
  facts: ReadonlyMap<string, CognitiveWorldFact>,
  domain: CompiledCognitiveDomain,
) => {
  const values = new Map<string, ProjectionDatum>(
    [...facts].map(([variableId, fact]) => [
      variableId,
      {
        value: fact.value as number,
        arrivalPhase: 0,
        causes: new Set<string>(),
        sourceFactIds: new Set([fact.id]),
      },
    ]),
  );
  const interventionTargets = new Set<string>();
  for (const intervention of interventions) {
    const fact = facts.get(intervention.variableId);
    if (!fact) throw new Error(`intervention target ${intervention.variableId} is hidden, absent, or nonnumeric`);
    const variable = domain.variables.get(intervention.variableId);
    if (!variable || variable.kind !== "NUMBER")
      throw new Error(`intervention target ${intervention.variableId} is not a compiled numeric variable`);
    if (!Number.isFinite(intervention.value))
      throw new Error(`intervention ${intervention.variableId} must be finite`);
    if (variable.minimum !== undefined && intervention.value < variable.minimum)
      throw new Error(`intervention ${intervention.variableId} is below its declared minimum`);
    if (variable.maximum !== undefined && intervention.value > variable.maximum)
      throw new Error(`intervention ${intervention.variableId} is above its declared maximum`);
    interventionTargets.add(intervention.variableId);
    values.set(intervention.variableId, {
      value: intervention.value,
      arrivalPhase: 0,
      causes: new Set([intervention.variableId]),
      sourceFactIds: new Set([fact.id, `intervention:${scenarioId}:${intervention.variableId}`]),
    });
  }
  for (const equationId of domain.causal.order) {
    const equation = domain.causal.equations.get(equationId)!;
    if (interventionTargets.has(equation.targetVariableId)) continue;
    const parents = equation.inputs.map((input) => values.get(input.variableId));
    if (parents.some((parent) => !parent))
      throw new Error(`${equation.id}: causal path lacks visible evidence`);
    values.set(equation.targetVariableId, {
      value: equationValue(equation, values),
      arrivalPhase:
        Math.max(...parents.map((parent) => parent!.arrivalPhase)) + equation.delayPhases,
      causes: new Set(parents.flatMap((parent) => [...parent!.causes])),
      sourceFactIds: new Set(parents.flatMap((parent) => [...parent!.sourceFactIds])),
      equationId: equation.id,
    });
  }
  return values;
};

const validateScenario = (
  scenario: CausalScenarioRequest,
  world: CognitiveWorldSnapshot,
  domain: CompiledCognitiveDomain,
) => {
  if (scenario.kind !== "SCENARIO") throw new Error("causal scenario request is malformed");
  validateWorld(world, domain, scenario.expectedWorldRevision);
  if (!scenario.scenarioId.trim()) throw new Error("causal intervention requires a scenario id");
  if (!scenario.interventions.length) throw new Error("causal scenario has no interventions");
  const targets = scenario.interventions.map((intervention) => intervention.variableId);
  if (targets.length !== new Set(targets).size) throw new Error("causal scenario repeats an intervention target");
  if (scenario.assumptions.length !== new Set(scenario.assumptions).size)
    throw new Error("causal scenario assumptions must be unique");
  if (
    !Number.isInteger(scenario.horizonPhases) ||
    scenario.horizonPhases < 0 ||
    scenario.horizonPhases > domain.temporal.projectionLimitPhases
  )
    throw new Error("causal horizon exceeds temporal policy");
  for (const intervention of scenario.interventions)
    if (intervention.role !== "TREATMENT" && intervention.role !== "CONTROL")
      throw new Error(`invalid causal role ${intervention.role}`);
};

const runScenario = (
  scenario: CausalScenarioRequest,
  world: CognitiveWorldSnapshot,
  domain: CompiledCognitiveDomain,
) => {
  validateScenario(scenario, world, domain);
  const facts = visibleNumericFacts(world);
  const baseline = project(`${scenario.scenarioId}:baseline`, [], facts, domain);
  const counterfactual = project(scenario.scenarioId, scenario.interventions, facts, domain);
  const changes: CausalChange[] = [];
  for (const [variableId, counter] of counterfactual) {
    const base = baseline.get(variableId);
    if (!base || base.value === counter.value) continue;
    if (counter.arrivalPhase > scenario.horizonPhases) continue;
    changes.push({
      variableId,
      baseline: base.value,
      counterfactual: counter.value,
      arrivalPhase: counter.arrivalPhase,
      interventionIds: [...counter.causes].sort(),
      sourceFactIds: [...counter.sourceFactIds].sort(),
      equationId: counter.equationId,
    });
  }
  return changes.sort((left, right) =>
    left.arrivalPhase - right.arrivalPhase || left.variableId.localeCompare(right.variableId),
  );
};

const causalAncestors = (variableId: string, domain: CompiledCognitiveDomain) => {
  const byTarget = new Map(
    [...domain.causal.equations.values()].map((equation) => [equation.targetVariableId, equation]),
  );
  const candidates = new Set<string>();
  const visit = (target: string) => {
    const equation = byTarget.get(target);
    if (!equation) return;
    for (const input of equation.inputs) {
      candidates.add(input.variableId);
      visit(input.variableId);
    }
  };
  visit(variableId);
  return [...candidates].sort();
};

const seal = (body: Omit<CausalResult, "digest">): CausalResult => ({
  ...body,
  digest: cognitiveDigest(body),
});

export const executeCausalRequest = (
  request: CausalRequest,
  world: CognitiveWorldSnapshot,
  domain: CompiledCognitiveDomain,
): CausalResult => {
  validateWorld(world, domain, request.expectedWorldRevision);
  if (request.kind === "SCENARIO" || request.kind === "COUNTERFACTUAL") {
    const scenario = request.kind === "SCENARIO" ? request : request.scenario;
    if (scenario.expectedWorldRevision !== request.expectedWorldRevision)
      throw new Error("nested causal scenario revision mismatch");
    const changes = runScenario(scenario, world, domain);
    return seal({
      requestId: request.id,
      worldRevision: world.revision,
      status: request.kind === "SCENARIO" ? "INTERVENTION_PROPAGATED" : "COUNTERFACTUAL_COMPUTED",
      scenarioId: scenario.scenarioId,
      changes,
      causeVariableIds: unique(changes.flatMap((change) => change.interventionIds)),
      candidateVariableIds: [],
      assumptions: [...scenario.assumptions].sort(),
      responsibleFactIds: unique(changes.flatMap((change) => change.sourceFactIds.filter((id) => id.startsWith("fact:")))),
      proofIds: [
        "causal-engine-proof",
        "structural-equation-replay",
        "surgical-intervention",
        request.kind === "COUNTERFACTUAL" ? "baseline-counterfactual-comparison" : "effect-propagation",
      ],
    });
  }

  if (!domain.variables.has(request.effectVariableId))
    throw new Error(`undeclared causal effect ${request.effectVariableId}`);
  const visibleFacts = new Map(
    world.facts.filter((fact) => fact.visibility !== "HIDDEN").map((fact) => [fact.id, fact]),
  );
  for (const factId of request.observationalFactIds ?? [])
    if (!visibleFacts.has(factId)) throw new Error(`hidden or absent observational evidence ${factId}`);
  const candidateVariableIds = causalAncestors(request.effectVariableId, domain);
  for (const factId of request.observationalFactIds ?? []) {
    const variableId = visibleFacts.get(factId)!.variableId;
    if (
      variableId !== request.effectVariableId &&
      !candidateVariableIds.includes(variableId)
    )
      throw new Error(`observational evidence ${factId} is irrelevant to the causal path`);
  }
  const scenario =
    request.scenario &&
    typeof request.scenario === "object" &&
    (request.scenario as { kind?: string }).kind === "SCENARIO"
      ? request.scenario as CausalScenarioRequest
      : undefined;
  if (!scenario)
    return seal({
      requestId: request.id,
      worldRevision: world.revision,
      status: candidateVariableIds.length ? "CANDIDATES_ONLY" : "UNEXPLAINED",
      changes: [],
      causeVariableIds: [],
      candidateVariableIds,
      assumptions: [],
      responsibleFactIds: unique(request.observationalFactIds ?? []),
      proofIds: ["causal-engine-proof", "observation-is-not-identification"],
    });
  if (scenario.expectedWorldRevision !== request.expectedWorldRevision)
    throw new Error("cause scenario revision mismatch");
  const changes = runScenario(scenario, world, domain);
  const effect = changes.find((change) => change.variableId === request.effectVariableId);
  return seal({
    requestId: request.id,
    worldRevision: world.revision,
    status: effect ? "IDENTIFIED_BY_INTERVENTION" : candidateVariableIds.length ? "CANDIDATES_ONLY" : "UNEXPLAINED",
    scenarioId: scenario.scenarioId,
    changes: effect ? [effect] : [],
    causeVariableIds: effect?.interventionIds ?? [],
    candidateVariableIds,
    assumptions: [...scenario.assumptions].sort(),
    responsibleFactIds: unique(effect?.sourceFactIds.filter((id) => id.startsWith("fact:")) ?? []),
    proofIds: ["causal-engine-proof", effect ? "intervention-identification" : "observation-is-not-identification"],
  });
};

export const causalEngineAdapter: OperatorAdapter = ({ operator, values, world, domain }) => {
  if (!["INTERVENE", "COUNTERFACTUAL", "PROPAGATE_EFFECT", "FIND_CAUSE"].includes(operator))
    throw new Error(`causal engine cannot execute ${operator}`);
  const request = cloneCognitive(values.request.value) as unknown as CausalRequest;
  if (
    ((operator === "INTERVENE" || operator === "PROPAGATE_EFFECT") && request.kind !== "SCENARIO") ||
    (operator === "COUNTERFACTUAL" && request.kind !== "COUNTERFACTUAL") ||
    (operator === "FIND_CAUSE" && request.kind !== "FIND_CAUSE")
  )
    throw new Error(`${operator} received the wrong causal request kind`);
  const result = executeCausalRequest(request, world, domain);
  return {
    datum: {
      kind: "RECORD",
      value: cloneCognitive(result) as unknown as CognitiveValue,
      sourceIds: result.responsibleFactIds,
      proofIds: result.proofIds,
      authority: "READ_ONLY",
    },
    evidence: ["causal-engine-proof", `operator:${operator.toLowerCase()}`],
  };
};

export const causalEngineAdapters = { "causal-engine": causalEngineAdapter } as const;
