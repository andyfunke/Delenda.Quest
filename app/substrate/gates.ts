/**
 * Shared recursive gate calculus.
 * Campaign situation gates and channel dockets evaluate through this module.
 */

export type Comparator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte";

export type CampaignPhaseId = "contact" | "compression" | "exhaustion" | "terminal";
export type Theater = "lowland" | "ridge" | "industrial" | "river";

export type StrategicDimension =
  | "production_integrity"
  | "supply_integrity"
  | "veteran_preservation"
  | "force_preservation"
  | "territorial_control"
  | "civil_stability"
  | "treasury_preservation"
  | "diplomatic_autonomy"
  | "intelligence_advantage"
  | "infrastructure_preservation"
  | "initiative"
  | "long_term_capacity";

export type ToleranceDimension =
  | "territorial_loss"
  | "conscript_attrition"
  | "veteran_attrition"
  | "civil_unrest"
  | "dependency"
  | "treasury_expenditure"
  | "supply_disruption"
  | "short_term_exposure";

export type StrategicWeight = "ignore" | "low" | "moderate" | "high" | "critical";
export type ToleranceLevel = "none" | "low" | "moderate" | "high" | "unrestricted";

export type SurfaceId = "web" | "ava" | "ssh" | "mcp" | "internal";

export type Channel =
  | "campaign"
  | "production"
  | "military"
  | "diplomacy"
  | "upgrade"
  | "domestic"
  | "network";

export type ScalarCompare = Comparator | "between" | "outside";

/** Full substrate gate grammar, including campaign-compatible operators. */
export type SubstrateGate =
  | { op: "always" }
  | { op: "all"; gates: SubstrateGate[] }
  | { op: "any"; gates: SubstrateGate[] }
  | { op: "none"; gates: SubstrateGate[] }
  | { op: "not"; gate: SubstrateGate }
  | { op: "fact"; id: string; present?: boolean; sector?: "target" | "any" }
  | { op: "band"; key: string; values: string[] }
  | {
      op: "scalar";
      key: string;
      compare: ScalarCompare;
      value: number | [number, number];
    }
  | { op: "phase"; values: string[] }
  | { op: "theater"; values: string[] }
  | {
      op: "history";
      eventId?: string;
      blueprintId?: string;
      factId?: string;
      withinDays?: number;
      present?: boolean;
    }
  | { op: "module"; values: Channel[] }
  | { op: "actor"; values: string[] }
  | { op: "clade"; values: string[] }
  | { op: "active"; nodeId: string; present: boolean }
  | { op: "used"; nodeId: string; compare: Comparator; value: number }
  | { op: "seen"; realizationId: string; present: boolean }
  | { op: "cooldown"; nodeId: string; elapsedDays: number }
  | { op: "orders"; compare: Comparator; value: number }
  | { op: "priority"; dimension: StrategicDimension; values: StrategicWeight[] }
  | { op: "tolerance"; dimension: ToleranceDimension; values: ToleranceLevel[] }
  | {
      op: "relationship";
      actorId: string;
      key: string;
      compare: Comparator;
      value: number;
    }
  | {
      op: "dependency";
      nodeId: string;
      state: "owned" | "active" | "completed";
    }
  | { op: "exclusion"; nodeId: string }
  | { op: "campaignAge"; compare: Comparator; day: number }
  | { op: "surface"; values: SurfaceId[] };

export type GateEvaluationStatus = "ok" | "missing-input" | "invalid";

export type GateTrace = {
  path: string;
  op: string;
  result: boolean;
  status: GateEvaluationStatus;
  operands?: Record<string, string | number | boolean | null>;
};

export type GateEvaluationResult = {
  result: boolean;
  status: GateEvaluationStatus;
  traces: GateTrace[];
};

export type GateContext = {
  phase?: string;
  theater?: string;
  bands?: Record<string, string>;
  scalars?: Record<string, number | undefined>;
  facts?: Array<{ id: string; sectorId?: string | null; createdDay?: number }>;
  targetSectorId?: string;
  history?: Array<{
    day: number;
    eventId?: string;
    blueprintId?: string;
    factId?: string;
  }>;
  day?: number;
  module?: Channel;
  actorId?: string;
  cladeId?: string;
  activeNodeIds?: string[];
  usedCounts?: Record<string, number>;
  seenRealizationIds?: string[];
  cooldownElapsed?: Record<string, number>;
  ordersRemaining?: number;
  priorities?: Partial<Record<StrategicDimension, StrategicWeight>>;
  tolerances?: Partial<Record<ToleranceDimension, ToleranceLevel>>;
  relationships?: Record<string, Record<string, number | undefined>>;
  dependencyStates?: Record<string, "owned" | "active" | "completed" | undefined>;
  excludedNodeIds?: string[];
  campaignDay?: number;
  surface?: SurfaceId;
};

const GATE_OPS = new Set([
  "always",
  "all",
  "any",
  "none",
  "not",
  "fact",
  "band",
  "scalar",
  "phase",
  "theater",
  "history",
  "module",
  "actor",
  "clade",
  "active",
  "used",
  "seen",
  "cooldown",
  "orders",
  "priority",
  "tolerance",
  "relationship",
  "dependency",
  "exclusion",
  "campaignAge",
  "surface",
]);

const COMPARATORS = new Set<ScalarCompare>([
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "between",
  "outside",
]);

export const validateGate = (gate: unknown, path = "$"): string[] => {
  const issues: string[] = [];
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    return [`${path}: gate must be an object`];
  }
  const op = (gate as { op?: unknown }).op;
  if (typeof op !== "string" || !GATE_OPS.has(op)) {
    return [`${path}: unknown operator ${String(op)}`];
  }
  const g = gate as SubstrateGate;
  if (g.op === "all" || g.op === "any" || g.op === "none") {
    if (!Array.isArray(g.gates)) issues.push(`${path}.gates must be an array`);
    else g.gates.forEach((child, i) => issues.push(...validateGate(child, `${path}.gates[${i}]`)));
  } else if (g.op === "not") {
    issues.push(...validateGate(g.gate, `${path}.gate`));
  } else if (g.op === "scalar") {
    if (!COMPARATORS.has(g.compare)) issues.push(`${path}.compare invalid`);
  }
  return issues;
};

const compareNumber = (
  actual: number,
  operator: ScalarCompare,
  expected: number | [number, number],
): boolean => {
  if (operator === "between" || operator === "outside") {
    const [low, high] = expected as [number, number];
    const inside = actual >= low && actual <= high;
    return operator === "between" ? inside : !inside;
  }
  const value = expected as number;
  if (operator === "eq") return actual === value;
  if (operator === "neq") return actual !== value;
  if (operator === "gt") return actual > value;
  if (operator === "gte") return actual >= value;
  if (operator === "lt") return actual < value;
  return actual <= value;
};

const missing = (result: boolean): GateEvaluationResult => ({
  result,
  status: "missing-input",
  traces: [],
});

const evalInner = (
  gate: SubstrateGate,
  context: GateContext,
  path: string,
  traces: GateTrace[],
  missingPolicy: "false" | "missing-input",
): GateEvaluationResult => {
  const push = (
    result: boolean,
    status: GateEvaluationStatus = "ok",
    operands?: GateTrace["operands"],
  ) => {
    traces.push({ path, op: gate.op, result, status, operands });
    return { result, status, traces };
  };

  if (gate.op === "always") return push(true);

  if (gate.op === "all") {
    if (!gate.gates.length) return push(true);
    let status: GateEvaluationStatus = "ok";
    for (let i = 0; i < gate.gates.length; i++) {
      const child = evalInner(gate.gates[i], context, `${path}/all[${i}]`, traces, missingPolicy);
      if (child.status === "missing-input") status = "missing-input";
      if (!child.result) return push(false, status);
    }
    return push(true, status);
  }

  if (gate.op === "any") {
    if (!gate.gates.length) return push(false);
    let status: GateEvaluationStatus = "ok";
    let any = false;
    for (let i = 0; i < gate.gates.length; i++) {
      const child = evalInner(gate.gates[i], context, `${path}/any[${i}]`, traces, missingPolicy);
      if (child.status === "missing-input") status = "missing-input";
      if (child.result) any = true;
    }
    return push(any, status);
  }

  if (gate.op === "none") {
    if (!gate.gates.length) return push(true);
    let status: GateEvaluationStatus = "ok";
    for (let i = 0; i < gate.gates.length; i++) {
      const child = evalInner(gate.gates[i], context, `${path}/none[${i}]`, traces, missingPolicy);
      if (child.status === "missing-input") status = "missing-input";
      if (child.result) return push(false, status);
    }
    return push(true, status);
  }

  if (gate.op === "not") {
    const child = evalInner(gate.gate, context, `${path}/not`, traces, missingPolicy);
    return push(!child.result, child.status);
  }

  if (gate.op === "phase") {
    if (context.phase === undefined) {
      return missingPolicy === "missing-input"
        ? push(false, "missing-input")
        : push(false, "missing-input");
    }
    return push(gate.values.includes(context.phase), "ok", { phase: context.phase });
  }

  if (gate.op === "theater") {
    if (context.theater === undefined) return push(false, "missing-input");
    return push(gate.values.includes(context.theater), "ok", { theater: context.theater });
  }

  if (gate.op === "band") {
    const actual = context.bands?.[gate.key];
    if (actual === undefined) return push(false, "missing-input", { key: gate.key });
    return push(gate.values.includes(actual), "ok", { key: gate.key, actual });
  }

  if (gate.op === "scalar") {
    const actual = context.scalars?.[gate.key];
    if (actual === undefined || Number.isNaN(actual)) {
      return push(false, "missing-input", { key: gate.key });
    }
    return push(compareNumber(actual, gate.compare, gate.value), "ok", {
      key: gate.key,
      actual,
    });
  }

  if (gate.op === "fact") {
    const facts = context.facts ?? [];
    const present = facts.some((fact) => {
      if (fact.id !== gate.id) return false;
      if (gate.sector === "any" || !gate.sector) return true;
      return fact.sectorId === context.targetSectorId || fact.sectorId == null;
    });
    const expected = gate.present !== false;
    return push(present === expected, "ok", { present });
  }

  if (gate.op === "history") {
    const day = context.day ?? 0;
    const within = gate.withinDays ?? Number.POSITIVE_INFINITY;
    const since = day - within;
    const present = (context.history ?? []).some((record) => {
      if (record.day < since) return false;
      if (gate.eventId && record.eventId !== gate.eventId) return false;
      if (gate.blueprintId && record.blueprintId !== gate.blueprintId) return false;
      if (gate.factId && record.factId !== gate.factId) return false;
      return true;
    }) ||
      (gate.factId
        ? (context.facts ?? []).some(
            (fact) => fact.id === gate.factId && (fact.createdDay ?? 0) >= since,
          )
        : false);
    const expected = gate.present !== false;
    return push(present === expected, "ok", { present });
  }

  if (gate.op === "module") {
    if (!context.module) return push(false, "missing-input");
    return push(gate.values.includes(context.module), "ok", { module: context.module });
  }

  if (gate.op === "actor") {
    if (!context.actorId) return push(false, "missing-input");
    return push(gate.values.includes(context.actorId), "ok", { actorId: context.actorId });
  }

  if (gate.op === "clade") {
    if (!context.cladeId) return push(false, "missing-input");
    return push(gate.values.includes(context.cladeId), "ok", { cladeId: context.cladeId });
  }

  if (gate.op === "active") {
    const present = (context.activeNodeIds ?? []).includes(gate.nodeId);
    return push(present === gate.present, "ok", { present });
  }

  if (gate.op === "used") {
    const count = context.usedCounts?.[gate.nodeId];
    if (count === undefined) return push(false, "missing-input");
    return push(compareNumber(count, gate.compare, gate.value), "ok", { count });
  }

  if (gate.op === "seen") {
    const present = (context.seenRealizationIds ?? []).includes(gate.realizationId);
    return push(present === gate.present, "ok", { present });
  }

  if (gate.op === "cooldown") {
    const elapsed = context.cooldownElapsed?.[gate.nodeId];
    if (elapsed === undefined) return push(false, "missing-input");
    return push(elapsed >= gate.elapsedDays, "ok", { elapsed });
  }

  if (gate.op === "orders") {
    if (context.ordersRemaining === undefined) return push(false, "missing-input");
    return push(
      compareNumber(context.ordersRemaining, gate.compare, gate.value),
      "ok",
      { ordersRemaining: context.ordersRemaining },
    );
  }

  if (gate.op === "priority") {
    const value = context.priorities?.[gate.dimension];
    if (value === undefined) return push(false, "missing-input");
    return push(gate.values.includes(value), "ok", { value });
  }

  if (gate.op === "tolerance") {
    const value = context.tolerances?.[gate.dimension];
    if (value === undefined) return push(false, "missing-input");
    return push(gate.values.includes(value), "ok", { value });
  }

  if (gate.op === "relationship") {
    const value = context.relationships?.[gate.actorId]?.[gate.key];
    if (value === undefined) return push(false, "missing-input");
    return push(compareNumber(value, gate.compare, gate.value), "ok", { value });
  }

  if (gate.op === "dependency") {
    const state = context.dependencyStates?.[gate.nodeId];
    if (state === undefined) return push(false, "missing-input");
    return push(state === gate.state, "ok", { state });
  }

  if (gate.op === "exclusion") {
    const excluded = (context.excludedNodeIds ?? []).includes(gate.nodeId);
    return push(!excluded, "ok", { excluded });
  }

  if (gate.op === "campaignAge") {
    if (context.campaignDay === undefined) return push(false, "missing-input");
    return push(
      compareNumber(context.campaignDay, gate.compare, gate.day),
      "ok",
      { campaignDay: context.campaignDay },
    );
  }

  if (gate.op === "surface") {
    if (!context.surface) return push(false, "missing-input");
    return push(gate.values.includes(context.surface), "ok", { surface: context.surface });
  }

  return push(false, "invalid");
};

/** Pure boolean evaluation (campaign-compatible). Missing inputs are false. */
export const evaluateGate = (gate: SubstrateGate, context: GateContext): boolean =>
  evaluateGateDetailed(gate, context, { missingPolicy: "false", trace: false }).result;

export const evaluateGateDetailed = (
  gate: SubstrateGate,
  context: GateContext,
  options: { missingPolicy?: "false" | "missing-input"; trace?: boolean } = {},
): GateEvaluationResult => {
  const issues = validateGate(gate);
  if (issues.length) {
    return { result: false, status: "invalid", traces: [{ path: "$", op: "invalid", result: false, status: "invalid" }] };
  }
  const traces: GateTrace[] = [];
  const result = evalInner(
    gate,
    context,
    "$",
    options.trace === false ? [] : traces,
    options.missingPolicy ?? "false",
  );
  if (options.trace === false) result.traces = [];
  return result;
};

/** Legacy campaign Gate alias — same grammar subset used by situations. */
export type Gate = SubstrateGate;
