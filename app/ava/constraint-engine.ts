import type {
  CognitiveConstraintExpression,
  CognitiveConstraintOperand,
  CognitiveConstraintRepairSpec,
  CognitiveConstraintSpec,
  CompiledCognitiveDomain,
} from "./cognitive-domain";
import {
  canonicalJson,
  cloneCognitive,
  cognitiveDigest,
  type CognitiveAuthority,
  type CognitiveUncertainty,
  type CognitiveValue,
} from "./cognitive-types";
import type { OperatorAdapter } from "./operator-algebra";
import {
  compileWorldSnapshot,
  type CognitiveWorldFact,
  type CognitiveWorldSnapshot,
} from "./world-model";

export type FeasibilityOutcome =
  | "FEASIBLE"
  | "PREREQUISITE_BOUND"
  | "RESOURCE_BOUND"
  | "IMPOSSIBLE"
  | "FORBIDDEN"
  | "UNDERSPECIFIED"
  | "UNCERTAIN"
  | "DOMINATED";

export type FeasibilityRequest = {
  id: string;
  expectedWorldRevision: string;
  actionId?: string;
  constraintIds?: readonly string[];
  bindings?: Readonly<Record<string, CognitiveValue>>;
  authorityCeiling?: CognitiveAuthority;
  costs?: Readonly<Record<string, number>>;
  alternatives?: readonly {
    id: string;
    request: Omit<FeasibilityRequest, "alternatives">;
  }[];
};

export type FeasibilityRepair = {
  id: string;
  constraintId: string;
  changes: readonly { bindingId: string; value: CognitiveValue }[];
};

export type FeasibilityConstraintResult = {
  constraintId: string;
  status: "SATISFIED" | "VIOLATED" | "UNKNOWN" | "UNDERSPECIFIED";
  failure: CognitiveConstraintSpec["failure"];
  responsibleFactIds: readonly string[];
  missingBindings: readonly string[];
  repairIds: readonly string[];
};

export type FeasibilityResult = {
  requestId: string;
  worldRevision: string;
  outcome: FeasibilityOutcome;
  constraints: readonly FeasibilityConstraintResult[];
  responsibleFactIds: readonly string[];
  prerequisites: readonly string[];
  repairs: readonly FeasibilityRepair[];
  smallestRepair?: FeasibilityRepair;
  closestFeasibleAlternative?: string;
  dominatedBy?: string;
  proofIds: readonly string[];
  digest: string;
};

type Truth = "TRUE" | "FALSE" | "UNKNOWN" | "MISSING";
type ResolvedOperand = {
  value?: CognitiveValue;
  factId?: string;
  uncertainty?: CognitiveUncertainty;
  missingBinding?: string;
};

const authorityRank: Record<CognitiveAuthority, number> = {
  READ_ONLY: 0,
  PLAN_ONLY: 1,
  PREPARE: 2,
  MUTATE: 3,
};
const unique = (values: readonly string[]) => [...new Set(values)].sort();
const numericRange = (operand: ResolvedOperand): [number, number] | null => {
  if (typeof operand.value !== "number") return null;
  if (operand.uncertainty?.kind === "INTERVAL")
    return [operand.uncertainty.low, operand.uncertainty.high];
  return [operand.value, operand.value];
};

const compare = (
  left: ResolvedOperand,
  operator: "EQ" | "NE" | "LT" | "LTE" | "GT" | "GTE" | "IN",
  right: ResolvedOperand,
): Truth => {
  if (left.missingBinding || right.missingBinding) return "MISSING";
  const leftRange = numericRange(left);
  const rightRange = numericRange(right);
  if (leftRange && rightRange) {
    const [low, high] = leftRange;
    const [rightLow, rightHigh] = rightRange;
    if (operator === "GTE") return low >= rightHigh ? "TRUE" : high < rightLow ? "FALSE" : "UNKNOWN";
    if (operator === "GT") return low > rightHigh ? "TRUE" : high <= rightLow ? "FALSE" : "UNKNOWN";
    if (operator === "LTE") return high <= rightLow ? "TRUE" : low > rightHigh ? "FALSE" : "UNKNOWN";
    if (operator === "LT") return high < rightLow ? "TRUE" : low >= rightHigh ? "FALSE" : "UNKNOWN";
    if (operator === "EQ")
      return low === high && rightLow === rightHigh && low === rightLow
        ? "TRUE"
        : high < rightLow || low > rightHigh
          ? "FALSE"
          : "UNKNOWN";
    if (operator === "NE") {
      const equality = compare(left, "EQ", right);
      return equality === "TRUE" ? "FALSE" : equality === "FALSE" ? "TRUE" : equality;
    }
  }
  if (operator === "IN") {
    if (!Array.isArray(right.value)) throw new Error("IN requires a set on the right");
    return right.value.some((value) => canonicalJson(value) === canonicalJson(left.value))
      ? "TRUE"
      : "FALSE";
  }
  if (operator === "EQ") return canonicalJson(left.value) === canonicalJson(right.value) ? "TRUE" : "FALSE";
  if (operator === "NE") return canonicalJson(left.value) !== canonicalJson(right.value) ? "TRUE" : "FALSE";
  throw new Error(`${operator} requires comparable numeric operands`);
};

const resolveOperand = (
  operand: CognitiveConstraintOperand,
  facts: ReadonlyMap<string, CognitiveWorldFact>,
  bindings: Readonly<Record<string, CognitiveValue>>,
): ResolvedOperand => {
  if (operand.kind === "LITERAL") return { value: operand.value };
  if (operand.kind === "BINDING")
    return Object.hasOwn(bindings, operand.bindingId)
      ? { value: bindings[operand.bindingId] }
      : { missingBinding: operand.bindingId };
  const fact = facts.get(operand.variableId);
  if (!fact) throw new Error(`visible world lacks ${operand.variableId}`);
  return { value: fact.value, factId: fact.id, uncertainty: fact.uncertainty };
};

const evaluateExpression = (
  expression: CognitiveConstraintExpression,
  facts: ReadonlyMap<string, CognitiveWorldFact>,
  bindings: Readonly<Record<string, CognitiveValue>>,
): { truth: Truth; factIds: string[]; missingBindings: string[] } => {
  const merge = (items: ReturnType<typeof evaluateExpression>[]) => ({
    factIds: unique(items.flatMap((item) => item.factIds)),
    missingBindings: unique(items.flatMap((item) => item.missingBindings)),
  });
  if (expression.kind === "COMPARE") {
    const left = resolveOperand(expression.left, facts, bindings);
    const right = resolveOperand(expression.right, facts, bindings);
    return {
      truth: compare(left, expression.operator, right),
      factIds: unique([left.factId, right.factId].filter((value): value is string => !!value)),
      missingBindings: unique([left.missingBinding, right.missingBinding].filter((value): value is string => !!value)),
    };
  }
  if (expression.kind === "NOT") {
    const child = evaluateExpression(expression.expression, facts, bindings);
    return {
      ...child,
      truth: child.truth === "TRUE" ? "FALSE" : child.truth === "FALSE" ? "TRUE" : child.truth,
    };
  }
  if ("expressions" in expression) {
    const children = expression.expressions.map((child) => evaluateExpression(child, facts, bindings));
    const combined = merge(children);
    if (children.some((child) => child.truth === "MISSING")) return { truth: "MISSING", ...combined };
    if (expression.kind === "ALL")
      return {
        truth: children.some((child) => child.truth === "FALSE")
          ? "FALSE"
          : children.some((child) => child.truth === "UNKNOWN")
            ? "UNKNOWN"
            : "TRUE",
        ...combined,
      };
    return {
      truth: children.some((child) => child.truth === "TRUE")
        ? "TRUE"
        : children.some((child) => child.truth === "UNKNOWN")
          ? "UNKNOWN"
          : "FALSE",
      ...combined,
    };
  }
  const values = resolveOperand(expression.values, facts, bindings);
  const right = resolveOperand(expression.right, facts, bindings);
  const factIds = unique([values.factId, right.factId].filter((value): value is string => !!value));
  const missingBindings = unique([values.missingBinding, right.missingBinding].filter((value): value is string => !!value));
  if (missingBindings.length) return { truth: "MISSING", factIds, missingBindings };
  if (!Array.isArray(values.value)) throw new Error("QUANTIFY requires a set operand");
  const comparisons = values.value.map((value) => compare({ value }, expression.operator, right));
  const truth = expression.quantifier === "EVERY"
    ? comparisons.every((item) => item === "TRUE") ? "TRUE" : comparisons.some((item) => item === "FALSE") ? "FALSE" : "UNKNOWN"
    : expression.quantifier === "SOME"
      ? comparisons.some((item) => item === "TRUE") ? "TRUE" : comparisons.some((item) => item === "UNKNOWN") ? "UNKNOWN" : "FALSE"
      : comparisons.every((item) => item === "FALSE") ? "TRUE" : comparisons.some((item) => item === "TRUE") ? "FALSE" : "UNKNOWN";
  return { truth, factIds, missingBindings };
};

const repairFromSpec = (
  constraintId: string,
  repair: CognitiveConstraintRepairSpec,
  facts: ReadonlyMap<string, CognitiveWorldFact>,
  bindings: Readonly<Record<string, CognitiveValue>>,
): FeasibilityRepair => {
  const resolved = resolveOperand(repair.value, facts, bindings);
  if (resolved.missingBinding || resolved.value === undefined)
    throw new Error(`${repair.id}: repair value is unavailable`);
  return {
    id: repair.id,
    constraintId,
    changes: [{ bindingId: repair.target.bindingId, value: cloneCognitive(resolved.value) }],
  };
};

const validateBindings = (
  request: FeasibilityRequest,
  domain: CompiledCognitiveDomain,
): string[] => {
  if (!request.actionId) return [];
  const action = domain.actions.get(request.actionId);
  if (!action) throw new Error(`undeclared action ${request.actionId}`);
  const bindings = request.bindings ?? {};
  const supplied = Object.keys(bindings);
  for (const bindingId of supplied)
    if (!action.arguments.some((argument) => argument.id === bindingId))
      throw new Error(`${request.actionId}: undeclared binding ${bindingId}`);
  for (const argument of action.arguments) {
    if (argument.required && !Object.hasOwn(bindings, argument.id)) continue;
    if (!Object.hasOwn(bindings, argument.id)) continue;
    const value = bindings[argument.id];
    if (argument.kind === "NUMBER") {
      if (typeof value !== "number" || !Number.isFinite(value))
        throw new Error(`${argument.id}: expected a finite number`);
      const variable = argument.variableId ? domain.variables.get(argument.variableId) : undefined;
      if (variable?.minimum !== undefined && value < variable.minimum)
        throw new Error(`${argument.id}: value below declared minimum`);
      if (variable?.maximum !== undefined && value > variable.maximum)
        throw new Error(`${argument.id}: value above declared maximum`);
    } else if (
      argument.kind === "ENTITY_ID" &&
      (typeof value !== "string" || !value.trim())
    )
      throw new Error(`${argument.id}: expected a nonempty entity id`);
  }
  return action.arguments
    .filter((argument) => argument.required && !Object.hasOwn(bindings, argument.id))
    .map((argument) => argument.id)
    .sort();
};

const constraintIdsFor = (
  request: FeasibilityRequest,
  domain: CompiledCognitiveDomain,
) => {
  const globalActionConstraints = request.actionId
    ? [...domain.constraints.values()]
        .filter((constraint) =>
          constraint.scope === "INVARIANT" || constraint.scope === "DOCTRINE",
        )
        .map((constraint) => constraint.id)
    : [];
  const ids = request.constraintIds
    ? [
        ...request.constraintIds,
        ...(request.actionId
          ? domain.actions.get(request.actionId)?.constraintIds ?? []
          : []),
        ...globalActionConstraints,
      ]
    : request.actionId
      ? [
          ...(domain.actions.get(request.actionId)?.constraintIds ?? []),
          ...globalActionConstraints,
        ]
      : [];
  const uniqueIds = unique(ids);
  if (!uniqueIds.length) throw new Error("feasibility request names no compiled constraints");
  for (const id of uniqueIds) {
    const constraint = domain.constraints.get(id);
    if (!constraint) throw new Error(`undeclared constraint ${id}`);
    if (constraint.actionId && constraint.actionId !== request.actionId)
      throw new Error(`${id}: constraint belongs to ${constraint.actionId}`);
  }
  return uniqueIds;
};

const outcomeFor = (results: readonly FeasibilityConstraintResult[]): FeasibilityOutcome => {
  if (results.some((item) => item.status === "UNDERSPECIFIED")) return "UNDERSPECIFIED";
  if (results.some((item) => item.status === "UNKNOWN")) return "UNCERTAIN";
  const failures = results.filter((item) => item.status === "VIOLATED").map((item) => item.failure);
  if (failures.includes("FORBIDDEN")) return "FORBIDDEN";
  if (failures.includes("IMPOSSIBLE")) return "IMPOSSIBLE";
  if (failures.includes("RESOURCE_BOUND")) return "RESOURCE_BOUND";
  if (failures.includes("PREREQUISITE_BOUND")) return "PREREQUISITE_BOUND";
  return "FEASIBLE";
};

const seal = (result: Omit<FeasibilityResult, "digest">): FeasibilityResult => ({
  ...result,
  digest: cognitiveDigest(result),
});

const evaluateSingle = (
  request: FeasibilityRequest,
  world: CognitiveWorldSnapshot,
  domain: CompiledCognitiveDomain,
): FeasibilityResult => {
  if (request.expectedWorldRevision !== world.revision)
    throw new Error("feasibility request world revision is stale");
  const { digest: worldDigest, ...worldInput } = world;
  if (compileWorldSnapshot(worldInput, domain).digest !== worldDigest)
    throw new Error("feasibility world digest is forged");
  if (world.domainId !== domain.id || world.domainVersion !== domain.version)
    throw new Error("feasibility world does not match compiled domain");
  const missingRequiredBindings = validateBindings(request, domain);
  const action = request.actionId ? domain.actions.get(request.actionId) : undefined;
  if (
    request.authorityCeiling !== undefined &&
    !Object.hasOwn(authorityRank, request.authorityCeiling)
  )
    throw new Error(`invalid authority ceiling ${request.authorityCeiling}`);
  if (
    action &&
    request.authorityCeiling &&
    authorityRank[action.authority] > authorityRank[request.authorityCeiling]
  ) {
    return seal({
      requestId: request.id,
      worldRevision: world.revision,
      outcome: "FORBIDDEN",
      constraints: [], responsibleFactIds: [], prerequisites: [], repairs: [],
      proofIds: ["constraint-engine-proof", "authority-ceiling"],
    });
  }
  const facts = new Map(
    world.facts
      .filter((fact) => fact.visibility !== "HIDDEN")
      .map((fact) => [fact.variableId, fact]),
  );
  const bindings = request.bindings ?? {};
  const results: FeasibilityConstraintResult[] = [];
  const repairs: FeasibilityRepair[] = [];
  for (const id of constraintIdsFor(request, domain)) {
    const constraint = domain.constraints.get(id)!;
    const evaluated = evaluateExpression(constraint.expression, facts, bindings);
    const status = evaluated.truth === "TRUE"
      ? "SATISFIED"
      : evaluated.truth === "FALSE"
        ? "VIOLATED"
        : evaluated.truth === "UNKNOWN"
          ? "UNKNOWN"
          : "UNDERSPECIFIED";
    const constraintRepairs = status === "VIOLATED"
      ? constraint.repairs.map((repair) => repairFromSpec(id, repair, facts, bindings))
      : [];
    repairs.push(...constraintRepairs);
    results.push({
      constraintId: id,
      status,
      failure: constraint.failure,
      responsibleFactIds: evaluated.factIds,
      missingBindings: evaluated.missingBindings,
      repairIds: constraintRepairs.map((repair) => repair.id),
    });
  }
  if (missingRequiredBindings.length)
    results.unshift({
      constraintId: `action:${request.actionId}:bindings`,
      status: "UNDERSPECIFIED",
      failure: "PREREQUISITE_BOUND",
      responsibleFactIds: [],
      missingBindings: missingRequiredBindings,
      repairIds: [],
    });
  const outcome = outcomeFor(results);
  const orderedRepairs = [...repairs].sort(
    (left, right) => left.changes.length - right.changes.length || left.id.localeCompare(right.id),
  );
  return seal({
    requestId: request.id,
    worldRevision: world.revision,
    outcome,
    constraints: results,
    responsibleFactIds: unique(results.flatMap((item) => item.responsibleFactIds)),
    prerequisites: results
      .filter((item) => item.status !== "SATISFIED")
      .map((item) => item.constraintId)
      .sort(),
    repairs: orderedRepairs,
    smallestRepair: orderedRepairs[0],
    proofIds: unique([
      "constraint-engine-proof",
      "compiler-approved-constraints",
      "visible-world-evidence",
      ...results.map((item) => `constraint:${item.constraintId}`),
    ]),
  });
};

const costDominates = (
  left: Readonly<Record<string, number>> | undefined,
  right: Readonly<Record<string, number>> | undefined,
) => {
  if (!left || !right) return false;
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  if (canonicalJson(leftKeys) !== canonicalJson(rightKeys) || !leftKeys.length) return false;
  for (const key of leftKeys)
    if (!Number.isFinite(left[key]) || !Number.isFinite(right[key]))
      throw new Error(`cost metric ${key} must be finite`);
  return leftKeys.every((key) => left[key] <= right[key]) &&
    leftKeys.some((key) => left[key] < right[key]);
};

const bindingDistance = (left: FeasibilityRequest, right: FeasibilityRequest) => {
  const keys = unique([...Object.keys(left.bindings ?? {}), ...Object.keys(right.bindings ?? {})]);
  return keys.filter(
    (key) => canonicalJson(left.bindings?.[key]) !== canonicalJson(right.bindings?.[key]),
  ).length;
};

const validateCostVector = (costs: Readonly<Record<string, number>> | undefined) => {
  for (const [key, value] of Object.entries(costs ?? {}))
    if (!Number.isFinite(value) || value < 0)
      throw new Error(`cost metric ${key} must be a nonnegative finite number`);
};

export const evaluateFeasibility = (
  request: FeasibilityRequest,
  world: CognitiveWorldSnapshot,
  domain: CompiledCognitiveDomain,
): FeasibilityResult => {
  validateCostVector(request.costs);
  const base = evaluateSingle(request, world, domain);
  const alternatives = request.alternatives ?? [];
  const ids = alternatives.map((alternative) => alternative.id);
  if (ids.length !== new Set(ids).size) throw new Error("duplicate feasibility alternative");
  const evaluated = alternatives.map((alternative) => ({
    ...alternative,
    result: (() => {
      validateCostVector(alternative.request.costs);
      return evaluateSingle(alternative.request, world, domain);
    })(),
  }));
  const feasible = evaluated.filter((alternative) => alternative.result.outcome === "FEASIBLE");
  const dominator = base.outcome === "FEASIBLE"
    ? feasible.find((alternative) => costDominates(alternative.request.costs, request.costs))
    : undefined;
  const closest = [...feasible].sort((left, right) => {
    const distance = bindingDistance(request, left.request) - bindingDistance(request, right.request);
    if (distance) return distance;
    const leftKeys = Object.keys(left.request.costs ?? {}).sort();
    const rightKeys = Object.keys(right.request.costs ?? {}).sort();
    if (canonicalJson(leftKeys) === canonicalJson(rightKeys)) {
      const leftCost = Object.values(left.request.costs ?? {}).reduce((sum, value) => sum + value, 0);
      const rightCost = Object.values(right.request.costs ?? {}).reduce((sum, value) => sum + value, 0);
      if (leftCost !== rightCost) return leftCost - rightCost;
    }
    return left.id.localeCompare(right.id);
  })[0];
  if (!dominator && !closest) return base;
  const { digest: _baseDigest, ...body } = base;
  void _baseDigest;
  return seal({
    ...body,
    outcome: dominator ? "DOMINATED" : base.outcome,
    dominatedBy: dominator?.id,
    closestFeasibleAlternative: closest?.id,
    proofIds: unique([...base.proofIds, "alternative-replay"]),
  });
};

export const applyFeasibilityRepair = (
  request: FeasibilityRequest,
  repair: FeasibilityRepair,
  domain: CompiledCognitiveDomain,
): FeasibilityRequest => ({
  ...(() => {
    const constraint = domain.constraints.get(repair.constraintId);
    const declared = constraint?.repairs.find((candidate) => candidate.id === repair.id);
    if (!declared) throw new Error(`undeclared feasibility repair ${repair.id}`);
    if (
      repair.changes.length !== 1 ||
      repair.changes[0].bindingId !== declared.target.bindingId
    )
      throw new Error(`forged feasibility repair ${repair.id}`);
    return cloneCognitive(request);
  })(),
  alternatives: undefined,
  bindings: {
    ...(request.bindings ?? {}),
    ...Object.fromEntries(repair.changes.map((change) => [change.bindingId, change.value])),
  },
});

export const constraintEngineAdapter: OperatorAdapter = ({
  operator,
  values,
  domain,
  world,
}) => {
  if (operator !== "SATISFY" && operator !== "CHECK_PRECONDITION")
    throw new Error(`constraint engine cannot execute ${operator}`);
  const request = cloneCognitive(values.request.value) as unknown as FeasibilityRequest;
  const result = evaluateFeasibility(request, world, domain);
  return {
    datum: {
      kind: "RECORD",
      value: cloneCognitive(result) as unknown as CognitiveValue,
      sourceIds: result.responsibleFactIds,
      proofIds: result.proofIds,
      authority: "READ_ONLY",
    },
    evidence: [
      "constraint-engine-proof",
      operator === "SATISFY" ? "operator:satisfy" : "operator:check_precondition",
    ],
  };
};

export const constraintEngineAdapters = {
  "constraint-engine": constraintEngineAdapter,
} as const;
