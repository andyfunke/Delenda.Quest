import type { CompiledCognitiveDomain } from "./cognitive-domain";
import { evaluateFeasibility, type FeasibilityResult } from "./constraint-engine";
import { cloneCognitive, cognitiveDigest, type CognitiveValue } from "./cognitive-types";
import type { OperatorAdapter } from "./operator-algebra";
import { executeTemporalRequest } from "./temporal-engine";
import { compileWorldSnapshot, type CognitiveWorldSnapshot } from "./world-model";

export type PlannedActionRequest = {
  id: string;
  actionId: string;
  bindings: Readonly<Record<string, CognitiveValue>>;
  dependsOn: readonly string[];
  deadlinePhase?: number;
};

export type BuildPlanRequest = {
  kind: "BUILD_PLAN";
  id: string;
  expectedWorldRevision: string;
  scenarioId: string;
  actions: readonly PlannedActionRequest[];
};

export type PlanningRequest =
  | BuildPlanRequest
  | { kind: "EXPAND_ACTION"; id: string; expectedWorldRevision: string; scenarioId: string; action: PlannedActionRequest }
  | { kind: "ALLOCATE" | "RESERVE"; id: string; expectedWorldRevision: string; scenarioId: string; resourceVariableId: string; amount: number; priorReservations: readonly { id: string; amount: number }[] }
  | { kind: "REPAIR"; id: string; expectedWorldRevision: string; scenarioId: string; planRequest: BuildPlanRequest }
  | { kind: "BRANCH"; id: string; expectedWorldRevision: string; scenarioId: string; branchId: string; bindings: Readonly<Record<string, CognitiveValue>> }
  | { kind: "TERMINATE"; id: string; expectedWorldRevision: string; scenarioId: string; terminationId: string };

export type PlanningRepair = {
  id: string;
  actionId?: string;
  changes: readonly { bindingId: string; value: CognitiveValue }[];
  reason: string;
};

export type PlanningResult = {
  requestId: string;
  kind: PlanningRequest["kind"];
  worldRevision: string;
  scenarioId: string;
  status: "PLANNED" | "BLOCKED" | "ALLOCATED" | "BRANCHED" | "TERMINATED" | "CONTINUE";
  authority: "PLAN_ONLY_NO_MUTATION";
  actions: readonly {
    id: string;
    actionId: string;
    bindings: Readonly<Record<string, CognitiveValue>>;
    dependsOn: readonly string[];
    interval?: { start: number; end: number };
    feasibilityOutcome: string;
  }[];
  reservations: readonly { actionId: string; resourceVariableId: string; amount: number }[];
  repairs: readonly PlanningRepair[];
  selectedActionId?: string;
  terminationSatisfied?: boolean;
  blockers: readonly string[];
  responsibleFactIds: readonly string[];
  proofIds: readonly string[];
  digest: string;
};

const unique = (values: readonly string[]) => [...new Set(values)].sort();

const validate = (request: PlanningRequest, world: CognitiveWorldSnapshot, domain: CompiledCognitiveDomain) => {
  if (request.expectedWorldRevision !== world.revision) throw new Error("planning request world revision is stale");
  if (!request.scenarioId.trim()) throw new Error("planning scenario scope is required");
  const { digest, ...input } = world;
  if (compileWorldSnapshot(input, domain).digest !== digest) throw new Error("planning world digest is forged");
};

const seal = (body: Omit<PlanningResult, "digest">): PlanningResult => ({ ...body, digest: cognitiveDigest(body) });

const amountBinding = (actionId: string, resourceVariableId: string, bindings: Readonly<Record<string, CognitiveValue>>, domain: CompiledCognitiveDomain) => {
  const action = domain.actions.get(actionId)!;
  const argument = action.arguments.find((item) => item.variableId === resourceVariableId);
  if (!argument) throw new Error(`${actionId}: resource ${resourceVariableId} has no declared amount binding`);
  const value = bindings[argument.id];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0)
    throw new Error(`${actionId}: resource amount ${argument.id} is invalid`);
  return { bindingId: argument.id, amount: value };
};

const build = (request: BuildPlanRequest, world: CognitiveWorldSnapshot, domain: CompiledCognitiveDomain): Omit<PlanningResult, "digest"> => {
  if (!request.actions.length || request.actions.length > domain.planning.maxActions)
    throw new Error("plan action count is outside compiled policy");
  if (request.actions.length !== new Set(request.actions.map((item) => item.id)).size)
    throw new Error("plan action instance ids must be unique");
  const actions = [...request.actions].sort((a, b) => a.id.localeCompare(b.id));
  const ids = new Set(actions.map((item) => item.id));
  const byId = new Map(actions.map((item) => [item.id, item]));
  const visiting = new Set<string>(), visited = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id)) throw new Error(`planning dependency cycle at ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of byId.get(id)!.dependsOn) {
      if (!ids.has(dependency)) throw new Error(`${id}: unknown dependency ${dependency}`);
      visit(dependency);
    }
    visiting.delete(id); visited.add(id);
  };
  actions.forEach((item) => visit(item.id));
  const results: Array<{ request: PlannedActionRequest; feasibility: FeasibilityResult }> = [];
  const blockers: string[] = [];
  const repairs: PlanningRepair[] = [];
  const responsibleFactIds: string[] = [];
  for (const item of actions) {
    if (!domain.planning.actionIds.includes(item.actionId)) throw new Error(`action ${item.actionId} is not compiler-approved for planning`);
    if (item.dependsOn.length !== new Set(item.dependsOn).size) throw new Error(`${item.id}: duplicate dependency`);
    for (const dependency of item.dependsOn) if (!ids.has(dependency)) throw new Error(`${item.id}: unknown dependency ${dependency}`);
    const feasibility = evaluateFeasibility({
      id: `plan:${request.id}:${item.id}`, expectedWorldRevision: world.revision,
      actionId: item.actionId, bindings: item.bindings,
    }, world, domain);
    results.push({ request: item, feasibility });
    responsibleFactIds.push(...feasibility.responsibleFactIds);
    if (feasibility.outcome !== "FEASIBLE") {
      blockers.push(`${item.id}:${feasibility.outcome}`);
      if (feasibility.smallestRepair) repairs.push({
        id: `repair:${item.id}:${feasibility.smallestRepair.id}`, actionId: item.id,
        changes: feasibility.smallestRepair.changes, reason: feasibility.outcome,
      });
    }
  }
  const reservations: Array<{ actionId: string; resourceVariableId: string; amount: number }> = [];
  const totals = new Map<string, number>();
  const visibleFacts = new Map(world.facts.filter((fact) => fact.visibility !== "HIDDEN" && fact.entityId === "campaign").map((fact) => [fact.variableId, fact]));
  for (const { request: item } of results) {
    const action = domain.actions.get(item.actionId)!;
    for (const resourceVariableId of action.resourceVariables) {
      const { bindingId, amount } = amountBinding(item.actionId, resourceVariableId, item.bindings, domain);
      const fact = visibleFacts.get(resourceVariableId);
      if (!fact || typeof fact.value !== "number") throw new Error(`visible inventory lacks ${resourceVariableId}`);
      const before = totals.get(resourceVariableId) ?? 0;
      const after = before + amount;
      totals.set(resourceVariableId, after);
      reservations.push({ actionId: item.id, resourceVariableId, amount });
      responsibleFactIds.push(fact.id);
      if (after > fact.value) {
        blockers.push(`${item.id}:RESOURCE_OVERSUBSCRIBED:${resourceVariableId}`);
        repairs.push({ id: `repair:${item.id}:cap-${bindingId}`, actionId: item.id,
          changes: [{ bindingId, value: Math.max(0, fact.value - before) }], reason: "RESOURCE_OVERSUBSCRIBED" });
      }
    }
  }
  const positive = results.filter(({ request: item }) => domain.actions.get(item.actionId)!.durationPhases > 0);
  const temporal = positive.length ? executeTemporalRequest({
    kind: "SCHEDULE", id: `schedule:${request.id}`, expectedWorldRevision: world.revision, mode: "DEPENDENCY",
    events: positive.map(({ request: item }) => ({ id: item.id, durationPhases: domain.actions.get(item.actionId)!.durationPhases,
      dependsOn: item.dependsOn, deadlinePhase: item.deadlinePhase,
      exclusiveResource: domain.actions.get(item.actionId)!.resourceVariables[0] })),
  }, world, domain) : undefined;
  if (temporal?.status === "CONFLICT") blockers.push(...temporal.conflicts);
  const intervals = new Map(temporal?.events?.map((event) => [event.id, event.interval]) ?? []);
  return {
    requestId: request.id, kind: request.kind, worldRevision: world.revision, scenarioId: request.scenarioId,
    status: blockers.length ? "BLOCKED" : "PLANNED", authority: "PLAN_ONLY_NO_MUTATION",
    actions: results.map(({ request: item, feasibility }) => ({ id: item.id, actionId: item.actionId,
      bindings: cloneCognitive(item.bindings), dependsOn: [...item.dependsOn].sort(), interval: intervals.get(item.id),
      feasibilityOutcome: feasibility.outcome })),
    reservations: [...reservations].sort((a, b) => a.actionId.localeCompare(b.actionId) || a.resourceVariableId.localeCompare(b.resourceVariableId)),
    repairs: [...repairs].sort((a, b) => a.changes.length - b.changes.length || a.id.localeCompare(b.id)),
    blockers: unique(blockers), responsibleFactIds: unique(responsibleFactIds),
    proofIds: ["planning-engine-proof", "feasibility-replay", "temporal-schedule-replay", "cumulative-reservation", "plan-only-no-mutation"],
  };
};

export const executePlanningRequest = (request: PlanningRequest, world: CognitiveWorldSnapshot, domain: CompiledCognitiveDomain): PlanningResult => {
  validate(request, world, domain);
  if (request.kind === "BUILD_PLAN") return seal(build(request, world, domain));
  if (request.kind === "EXPAND_ACTION") return seal({ ...build({ kind: "BUILD_PLAN", id: request.id, expectedWorldRevision: request.expectedWorldRevision, scenarioId: request.scenarioId, actions: [request.action] }, world, domain), kind: request.kind });
  if (request.kind === "REPAIR") {
    if (request.planRequest.expectedWorldRevision !== request.expectedWorldRevision || request.planRequest.scenarioId !== request.scenarioId)
      throw new Error("repair request crosses revision or scenario scope");
    return seal({ ...build(request.planRequest, world, domain), requestId: request.id, kind: request.kind });
  }
  if (request.kind === "ALLOCATE" || request.kind === "RESERVE") {
    const declared = new Set([...domain.actions.values()].flatMap((action) => action.resourceVariables));
    if (!declared.has(request.resourceVariableId)) throw new Error("allocation resource is not compiler-declared");
    if (!Number.isFinite(request.amount) || request.amount < 0) throw new Error("allocation amount is invalid");
    if (request.priorReservations.length !== new Set(request.priorReservations.map((item) => item.id)).size)
      throw new Error("prior reservations must be unique");
    const fact = world.facts.find((item) => item.variableId === request.resourceVariableId && item.entityId === "campaign" && item.visibility !== "HIDDEN");
    if (!fact || typeof fact.value !== "number") throw new Error("allocation inventory is unavailable");
    const prior = request.priorReservations.reduce((sum, item) => {
      if (!Number.isFinite(item.amount) || item.amount < 0) throw new Error("prior reservation amount is invalid");
      return sum + item.amount;
    }, 0);
    const available = Math.max(0, fact.value - prior);
    const blocked = request.amount > available;
    return seal({ requestId: request.id, kind: request.kind, worldRevision: world.revision, scenarioId: request.scenarioId,
      status: blocked ? "BLOCKED" : "ALLOCATED", authority: "PLAN_ONLY_NO_MUTATION", actions: [],
      reservations: blocked ? [] : [{ actionId: request.id, resourceVariableId: request.resourceVariableId, amount: request.amount }],
      repairs: blocked ? [{ id: `repair:${request.id}:cap-allocation`, changes: [{ bindingId: "amount", value: available }], reason: "RESOURCE_OVERSUBSCRIBED" }] : [],
      blockers: blocked ? ["RESOURCE_OVERSUBSCRIBED"] : [], responsibleFactIds: [fact.id],
      proofIds: ["planning-engine-proof", "compiled-resource", "cumulative-reservation", "plan-only-no-mutation"] });
  }
  if (request.kind === "BRANCH") {
    const branch = domain.planning.branches.find((item) => item.id === request.branchId);
    if (!branch) throw new Error("planning branch is not compiler-approved");
    const feasibility = evaluateFeasibility({ id: request.id, expectedWorldRevision: world.revision,
      actionId: branch.whenSatisfiedActionId, bindings: request.bindings }, world, domain);
    const constraint = feasibility.constraints.find((item) => item.constraintId === branch.constraintId);
    if (!constraint) throw new Error("planning branch constraint was not replayed");
    const selectedActionId = constraint.status === "SATISFIED" ? branch.whenSatisfiedActionId : branch.whenViolatedActionId;
    return seal({ requestId: request.id, kind: request.kind, worldRevision: world.revision, scenarioId: request.scenarioId,
      status: "BRANCHED", authority: "PLAN_ONLY_NO_MUTATION", actions: [], reservations: [], repairs: [], selectedActionId,
      blockers: [], responsibleFactIds: feasibility.responsibleFactIds,
      proofIds: ["planning-engine-proof", "compiled-branch", "feasibility-replay", "plan-only-no-mutation"] });
  }
  if (request.kind !== "TERMINATE") throw new Error("unknown planning request kind");
  const termination = domain.planning.terminations.find((item) => item.id === request.terminationId);
  if (!termination) throw new Error("planning termination is not compiler-approved");
  const feasibility = evaluateFeasibility({ id: request.id, expectedWorldRevision: world.revision, constraintIds: [termination.constraintId] }, world, domain);
  const terminationSatisfied = feasibility.outcome !== "FEASIBLE";
  return seal({ requestId: request.id, kind: request.kind, worldRevision: world.revision, scenarioId: request.scenarioId,
    status: terminationSatisfied ? "TERMINATED" : "CONTINUE", authority: "PLAN_ONLY_NO_MUTATION", actions: [], reservations: [], repairs: [],
    terminationSatisfied, blockers: [], responsibleFactIds: feasibility.responsibleFactIds,
    proofIds: ["planning-engine-proof", "compiled-termination", "feasibility-replay", "plan-only-no-mutation"] });
};

export const planningEngineAdapter: OperatorAdapter = ({ operator, values, world, domain }) => {
  if (!["BUILD_PLAN", "ALLOCATE", "REPAIR", "EXPAND_ACTION", "BRANCH", "RESERVE", "TERMINATE"].includes(operator))
    throw new Error(`planning engine cannot execute ${operator}`);
  const request = cloneCognitive(values.request.value) as unknown as PlanningRequest;
  if (request.kind !== operator) throw new Error(`${operator} received the wrong planning request kind`);
  const result = executePlanningRequest(request, world, domain);
  return { datum: { kind: "RECORD", value: cloneCognitive(result) as unknown as CognitiveValue,
    sourceIds: result.responsibleFactIds, proofIds: result.proofIds, authority: "PLAN_ONLY" },
    evidence: ["planning-engine-proof", `operator:${operator.toLowerCase()}`] };
};

export const planningEngineAdapters = { "planning-engine": planningEngineAdapter } as const;
