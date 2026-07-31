import type { CompiledCognitiveDomain } from "./cognitive-domain";
import {
  canonicalJson,
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

export type TemporalPoint = { day: number; phase: string };
export type TemporalInterval = {
  start: number;
  end: number;
};
export type TemporalIntervalRelation =
  | "BEFORE"
  | "MEETS"
  | "OVERLAPS"
  | "STARTS"
  | "DURING"
  | "FINISHES"
  | "EQUALS"
  | "FINISHED_BY"
  | "CONTAINS"
  | "STARTED_BY"
  | "OVERLAPPED_BY"
  | "MET_BY"
  | "AFTER";

export type TemporalEventRequest = {
  id: string;
  durationPhases: number;
  dependsOn: readonly string[];
  earliestPhase?: number;
  deadlinePhase?: number;
  exclusiveResource?: string;
};

export type TemporalScheduleRequest = {
  kind: "SCHEDULE";
  id: string;
  expectedWorldRevision: string;
  mode: "SERIAL" | "DEPENDENCY";
  events: readonly TemporalEventRequest[];
};

export type TemporalDelayRequest = {
  kind: "DELAY";
  id: string;
  expectedWorldRevision: string;
  value: CognitiveValue;
  phases: number;
};

export type TemporalForecastRequest = {
  kind: "FORECAST";
  id: string;
  expectedWorldRevision: string;
  scenarioId: string;
  horizonId: string;
  assumptions: readonly string[];
};

export type TemporalRequest =
  | TemporalScheduleRequest
  | TemporalDelayRequest
  | TemporalForecastRequest;

export type TemporalScheduledEvent = {
  id: string;
  interval: TemporalInterval;
  slackPhases?: number;
  dependencies: readonly string[];
  exclusiveResource?: string;
};

export type TemporalResult = {
  requestId: string;
  worldRevision: string;
  status: "SCHEDULED" | "DELAYED" | "FORECAST_ENVELOPE" | "CONFLICT";
  events?: readonly TemporalScheduledEvent[];
  delayed?: { value: CognitiveValue; availableAtPhase: number };
  forecast?: {
    scenarioId: string;
    horizonId: string;
    interval: TemporalInterval;
    assumptions: readonly string[];
    outcomeSemantics: "UNBOUND";
  };
  conflicts: readonly string[];
  proofIds: readonly string[];
  digest: string;
};

export type EvidenceAgeState =
  | "CURRENT"
  | "FRESH"
  | "STALE"
  | "HISTORICAL"
  | "FUTURE";

const unique = (values: readonly string[]) => [...new Set(values)].sort();

export const normalizeTemporalPoint = (
  point: TemporalPoint,
  domain: CompiledCognitiveDomain,
) => {
  if (!Number.isInteger(point.day) || point.day < 1)
    throw new Error("temporal day must be a positive integer");
  const phase = domain.temporal.phaseOrder.indexOf(point.phase);
  if (phase < 0) throw new Error(`unknown temporal phase ${point.phase}`);
  return (point.day - 1) * domain.temporal.phaseOrder.length + phase;
};

export const temporalPointFromPhase = (
  absolutePhase: number,
  domain: CompiledCognitiveDomain,
): TemporalPoint => {
  if (!Number.isInteger(absolutePhase) || absolutePhase < 0)
    throw new Error("absolute phase must be a nonnegative integer");
  const count = domain.temporal.phaseOrder.length;
  return {
    day: Math.floor(absolutePhase / count) + 1,
    phase: domain.temporal.phaseOrder[absolutePhase % count],
  };
};

const validateInterval = (interval: TemporalInterval) => {
  if (
    !Number.isInteger(interval.start) ||
    !Number.isInteger(interval.end) ||
    interval.start < 0 ||
    interval.end <= interval.start
  )
    throw new Error("temporal interval must be a nonempty closed-open interval");
};

export const relateTemporalIntervals = (
  left: TemporalInterval,
  right: TemporalInterval,
): TemporalIntervalRelation => {
  validateInterval(left);
  validateInterval(right);
  if (left.end < right.start) return "BEFORE";
  if (left.end === right.start) return "MEETS";
  if (left.start < right.start && left.end < right.end) return "OVERLAPS";
  if (left.start === right.start && left.end < right.end) return "STARTS";
  if (left.start > right.start && left.end < right.end) return "DURING";
  if (left.start > right.start && left.end === right.end) return "FINISHES";
  if (left.start === right.start && left.end === right.end) return "EQUALS";
  if (left.start < right.start && left.end === right.end) return "FINISHED_BY";
  if (left.start < right.start && left.end > right.end) return "CONTAINS";
  if (left.start === right.start && left.end > right.end) return "STARTED_BY";
  if (left.start > right.start && left.start < right.end && left.end > right.end)
    return "OVERLAPPED_BY";
  if (left.start === right.end) return "MET_BY";
  return "AFTER";
};

const validateWorld = (
  world: CognitiveWorldSnapshot,
  domain: CompiledCognitiveDomain,
  expectedRevision: string,
) => {
  if (expectedRevision !== world.revision)
    throw new Error("temporal request world revision is stale");
  const { digest, ...input } = world;
  if (compileWorldSnapshot(input, domain).digest !== digest)
    throw new Error("temporal world digest is forged");
};

const schedule = (
  request: TemporalScheduleRequest,
  domain: CompiledCognitiveDomain,
): Omit<TemporalResult, "digest"> => {
  if (!request.events.length) throw new Error("temporal schedule has no events");
  const ids = request.events.map((event) => event.id);
  if (ids.length !== new Set(ids).size) throw new Error("duplicate temporal event");
  const events = new Map(request.events.map((event) => [event.id, event]));
  for (const event of request.events) {
    if (!event.id.trim()) throw new Error("temporal event id is empty");
    if (!Number.isInteger(event.durationPhases) || event.durationPhases < 1)
      throw new Error(`${event.id}: duration must be a positive integer`);
    if (event.dependsOn.length !== new Set(event.dependsOn).size)
      throw new Error(`${event.id}: duplicate temporal dependency`);
    for (const dependency of event.dependsOn)
      if (!events.has(dependency)) throw new Error(`${event.id}: unknown dependency ${dependency}`);
    for (const coordinate of [event.earliestPhase, event.deadlinePhase])
      if (coordinate !== undefined && (!Number.isInteger(coordinate) || coordinate < 0))
        throw new Error(`${event.id}: temporal coordinate is invalid`);
  }

  const ordered = [...events.keys()].sort();
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const topological: string[] = [];
  const visit = (id: string) => {
    if (visiting.has(id)) throw new Error(`temporal dependency cycle at ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    [...events.get(id)!.dependsOn].sort().forEach(visit);
    visiting.delete(id);
    visited.add(id);
    topological.push(id);
  };
  ordered.forEach(visit);

  const scheduled = new Map<string, TemporalScheduledEvent>();
  let serialCursor = 0;
  const conflicts: string[] = [];
  for (const id of topological) {
    const event = events.get(id)!;
    const dependencyEnd = event.dependsOn.reduce(
      (latest, dependency) => Math.max(latest, scheduled.get(dependency)!.interval.end),
      0,
    );
    const start = Math.max(
      event.earliestPhase ?? 0,
      dependencyEnd,
      request.mode === "SERIAL" ? serialCursor : 0,
    );
    const end = start + event.durationPhases;
    if (end > domain.temporal.projectionLimitPhases)
      conflicts.push(`${id}: projection limit exceeded`);
    const slack = event.deadlinePhase === undefined ? undefined : event.deadlinePhase - end;
    if (slack !== undefined && slack < 0) conflicts.push(`${id}: deadline missed by ${-slack} phases`);
    const item: TemporalScheduledEvent = {
      id,
      interval: { start, end },
      slackPhases: slack,
      dependencies: [...event.dependsOn].sort(),
      exclusiveResource: event.exclusiveResource,
    };
    scheduled.set(id, item);
    if (request.mode === "SERIAL") serialCursor = end;
  }
  const list = [...scheduled.values()].sort((left, right) =>
    left.interval.start - right.interval.start || left.id.localeCompare(right.id),
  );
  for (let left = 0; left < list.length; left += 1)
    for (let right = left + 1; right < list.length; right += 1) {
      const a = list[left];
      const b = list[right];
      if (
        a.exclusiveResource &&
        a.exclusiveResource === b.exclusiveResource &&
        a.interval.start < b.interval.end &&
        b.interval.start < a.interval.end
      )
        conflicts.push(`${a.id}/${b.id}: exclusive resource ${a.exclusiveResource} overlaps`);
    }
  return {
    requestId: request.id,
    worldRevision: request.expectedWorldRevision,
    status: conflicts.length ? "CONFLICT" : "SCHEDULED",
    events: list,
    conflicts: unique(conflicts),
    proofIds: unique([
      "temporal-engine-proof",
      "closed-open-intervals",
      "dependency-order",
      "projection-limit",
    ]),
  };
};

export const executeTemporalRequest = (
  request: TemporalRequest,
  world: CognitiveWorldSnapshot,
  domain: CompiledCognitiveDomain,
): TemporalResult => {
  validateWorld(world, domain, request.expectedWorldRevision);
  let body: Omit<TemporalResult, "digest">;
  if (request.kind === "SCHEDULE") body = schedule(request, domain);
  else if (request.kind === "DELAY") {
    if (!Number.isInteger(request.phases) || request.phases < 0)
      throw new Error("delay phases must be a nonnegative integer");
    if (request.phases > domain.temporal.projectionLimitPhases)
      throw new Error("delay exceeds the compiled projection limit");
    body = {
      requestId: request.id,
      worldRevision: world.revision,
      status: "DELAYED",
      delayed: { value: cloneCognitive(request.value), availableAtPhase: request.phases },
      conflicts: [],
      proofIds: ["temporal-engine-proof", "compiled-delay"],
    };
  } else {
    if (!request.scenarioId.trim()) throw new Error("forecast requires a scenario id");
    if (request.assumptions.length !== new Set(request.assumptions).size)
      throw new Error("forecast assumptions must be unique");
    const horizon = domain.temporal.horizons.find((item) => item.id === request.horizonId);
    if (!horizon) throw new Error(`undeclared forecast horizon ${request.horizonId}`);
    body = {
      requestId: request.id,
      worldRevision: world.revision,
      status: "FORECAST_ENVELOPE",
      forecast: {
        scenarioId: request.scenarioId,
        horizonId: horizon.id,
        interval: { start: horizon.startPhase, end: horizon.endPhase },
        assumptions: [...request.assumptions].sort(),
        outcomeSemantics: "UNBOUND",
      },
      conflicts: [],
      proofIds: ["temporal-engine-proof", "scenario-bound", "outcomes-unbound"],
    };
  }
  return { ...body, digest: cognitiveDigest(body) };
};

export const assessEvidenceAge = (
  fact: CognitiveWorldFact,
  world: CognitiveWorldSnapshot,
  domain: CompiledCognitiveDomain,
): { state: EvidenceAgeState; ageDays: number; factId: string } => {
  validateWorld(world, domain, world.revision);
  const retained = world.facts.find((candidate) => candidate.id === fact.id);
  if (!retained || retained.visibility === "HIDDEN")
    throw new Error(`hidden or absent temporal evidence ${fact.id}`);
  if (canonicalJson(retained) !== canonicalJson(fact))
    throw new Error(`altered temporal evidence ${fact.id}`);
  const ageDays = world.campaignDay - fact.observedAtDay;
  let state: EvidenceAgeState;
  if (fact.validFromDay > world.campaignDay || fact.observedAtDay > world.campaignDay)
    state = "FUTURE";
  else if (fact.validUntilDay !== undefined && fact.validUntilDay < world.campaignDay)
    state = "HISTORICAL";
  else if (ageDays === 0) state = "CURRENT";
  else {
    const freshness = domain.variables.get(fact.variableId)?.freshnessDays ??
      domain.temporal.defaultFreshnessDays;
    state = ageDays <= freshness ? "FRESH" : "STALE";
  }
  return { state, ageDays, factId: fact.id };
};

export const temporalEngineAdapter: OperatorAdapter = ({
  operator,
  values,
  world,
  domain,
}) => {
  if (operator !== "SEQUENCE" && operator !== "FORECAST" && operator !== "DELAY")
    throw new Error(`temporal engine cannot execute ${operator}`);
  const request = cloneCognitive(values.request.value) as unknown as TemporalRequest;
  if (
    (operator === "SEQUENCE" && request.kind !== "SCHEDULE") ||
    (operator === "FORECAST" && request.kind !== "FORECAST") ||
    (operator === "DELAY" && request.kind !== "DELAY")
  )
    throw new Error(`${operator} received the wrong temporal request kind`);
  const result = executeTemporalRequest(request, world, domain);
  return {
    datum: {
      kind: "RECORD",
      value: cloneCognitive(result) as unknown as CognitiveValue,
      sourceIds: [],
      proofIds: result.proofIds,
      authority: "READ_ONLY",
    },
    evidence: ["temporal-engine-proof", `operator:${operator.toLowerCase()}`],
  };
};

export const temporalEngineAdapters = {
  "temporal-engine": temporalEngineAdapter,
} as const;
