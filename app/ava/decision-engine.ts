import type { CompiledCognitiveDomain, CognitiveDecisionMetricSpec } from "./cognitive-domain";
import { evaluateFeasibility, type FeasibilityRequest } from "./constraint-engine";
import { cloneCognitive, cognitiveDigest, type CognitiveValue } from "./cognitive-types";
import type { OperatorAdapter } from "./operator-algebra";
import { compileWorldSnapshot, type CognitiveWorldFact, type CognitiveWorldSnapshot } from "./world-model";

export type DecisionCandidate = {
  id: string;
  scenarioId: string;
  metricFactIds: Readonly<Record<string, string>>;
  feasibilityRequest: FeasibilityRequest;
};

export type DecisionAnalysisRequest = {
  kind: "COMPARE" | "SCORE" | "RANK" | "OPTIMIZE" | "DOMINANCE" | "PARETO";
  id: string;
  expectedWorldRevision: string;
  scenarioId: string;
  modelId: string;
  candidates: readonly DecisionCandidate[];
};

export type DecisionFalsifyRequest = {
  kind: "FALSIFY";
  id: string;
  expectedWorldRevision: string;
  scenarioId: string;
  analysis: DecisionAnalysisRequest;
  claimedWinnerId: string;
};

export type DecisionSensitivityRequest = {
  kind: "SENSITIVITY";
  id: string;
  expectedWorldRevision: string;
  scenarioId: string;
  analysis: DecisionAnalysisRequest;
  alternateModelId: string;
};

export type DecisionRequest = DecisionAnalysisRequest | DecisionFalsifyRequest | DecisionSensitivityRequest;

export type DecisionCandidateResult = {
  candidateId: string;
  feasible: boolean;
  feasibilityOutcome: string;
  hardObjectivesSatisfied: boolean;
  utility: { low: number; high: number };
  worstCaseRegret: number;
  metrics: readonly {
    metricId: string;
    raw: { low: number; high: number };
    normalized: { low: number; high: number };
    factId: string;
  }[];
  dominatedBy: readonly string[];
};

export type DecisionResult = {
  requestId: string;
  kind: DecisionRequest["kind"];
  worldRevision: string;
  scenarioId: string;
  modelId: string;
  status: "ANALYZED" | "FALSIFIED" | "SUSTAINED" | "SENSITIVE" | "ROBUST";
  ranking: readonly string[];
  winnerId?: string;
  paretoFront: readonly string[];
  candidates: readonly DecisionCandidateResult[];
  tradeoffs: readonly string[];
  alternateWinnerId?: string;
  responsibleFactIds: readonly string[];
  proofIds: readonly string[];
  digest: string;
};

const unique = (values: readonly string[]) => [...new Set(values)].sort();
const rounded = (value: number) => Number(value.toFixed(12));

const validateWorld = (world: CognitiveWorldSnapshot, domain: CompiledCognitiveDomain, revision: string) => {
  if (revision !== world.revision) throw new Error("decision request world revision is stale");
  const { digest, ...input } = world;
  if (compileWorldSnapshot(input, domain).digest !== digest) throw new Error("decision world digest is forged");
};

const factRange = (fact: CognitiveWorldFact) => {
  if (typeof fact.value !== "number") throw new Error(`${fact.id}: decision metric evidence is not numeric`);
  if (fact.uncertainty.kind === "INTERVAL") return { low: fact.uncertainty.low, high: fact.uncertainty.high };
  return { low: fact.value, high: fact.value };
};

const normalize = (range: { low: number; high: number }, metric: CognitiveDecisionMetricSpec) => {
  const point = (value: number) => {
    if (metric.normalization.kind === "BOUNDED_LINEAR")
      return Math.max(0, Math.min(1, (value - metric.normalization.minimum) / (metric.normalization.maximum - metric.normalization.minimum)));
    const aboveMinimum = Math.max(0, value - metric.normalization.minimum);
    return aboveMinimum / (aboveMinimum + metric.normalization.scale);
  };
  const low = point(range.low), high = point(range.high);
  return metric.direction === "MAXIMIZE" ? { low, high } : { low: 1 - high, high: 1 - low };
};

const dominates = (left: DecisionCandidateResult, right: DecisionCandidateResult) => {
  if (!left.feasible || !left.hardObjectivesSatisfied) return false;
  if (!right.feasible || !right.hardObjectivesSatisfied) return true;
  let strict = false;
  for (const leftMetric of left.metrics) {
    const rightMetric = right.metrics.find((metric) => metric.metricId === leftMetric.metricId)!;
    if (leftMetric.normalized.low < rightMetric.normalized.high) return false;
    if (leftMetric.normalized.low > rightMetric.normalized.high) strict = true;
  }
  return strict;
};

const analyze = (
  request: DecisionAnalysisRequest,
  world: CognitiveWorldSnapshot,
  domain: CompiledCognitiveDomain,
): Omit<DecisionResult, "digest"> => {
  validateWorld(world, domain, request.expectedWorldRevision);
  if (!request.scenarioId.trim()) throw new Error("decision scenario scope is required");
  const model = domain.decision.models.get(request.modelId);
  if (!model) throw new Error(`decision model ${request.modelId} is not compiler-approved`);
  if (request.candidates.length < 2 || request.candidates.length !== new Set(request.candidates.map((item) => item.id)).size)
    throw new Error("decision candidates must contain at least two unique ids");
  const facts = new Map(world.facts.filter((fact) => fact.visibility !== "HIDDEN").map((fact) => [fact.id, fact]));
  const sourceIds = new Set(world.sources.filter((source) => source.visibility !== "HIDDEN").map((source) => source.id));
  const projectionIds = new Set(request.candidates.flatMap((candidate) => Object.values(candidate.metricFactIds)));
  let changed = true;
  while (changed) {
    changed = false;
    for (const fact of world.facts)
      if (!projectionIds.has(fact.id) && fact.lineage.some((parentId) => projectionIds.has(parentId))) {
        projectionIds.add(fact.id);
        changed = true;
      }
  }
  const feasibilityWorld = compileWorldSnapshot({
    domainId: world.domainId,
    domainVersion: world.domainVersion,
    campaignId: world.campaignId,
    campaignDay: world.campaignDay,
    revision: world.revision,
    sources: world.sources,
    facts: world.facts.filter((fact) => !projectionIds.has(fact.id)),
  }, domain);
  const results: DecisionCandidateResult[] = [];
  for (const candidate of [...request.candidates].sort((a, b) => a.id.localeCompare(b.id))) {
    if (candidate.scenarioId !== request.scenarioId) throw new Error(`${candidate.id}: candidate crosses scenario scope`);
    if (candidate.feasibilityRequest.expectedWorldRevision !== request.expectedWorldRevision)
      throw new Error(`${candidate.id}: feasibility revision mismatch`);
    const feasibility = evaluateFeasibility(candidate.feasibilityRequest, feasibilityWorld, domain);
    const metrics = model.objectives.map((objective) => {
      const metric = domain.decision.metrics.get(objective.metricId)!;
      const factId = candidate.metricFactIds[metric.id];
      const fact = facts.get(factId);
      if (!fact) throw new Error(`${candidate.id}: hidden or absent metric fact ${factId}`);
      if (fact.variableId !== metric.variableId) throw new Error(`${factId}: fact does not implement metric ${metric.id}`);
      if (fact.entityId !== candidate.id)
        throw new Error(`${factId}: projection belongs to ${fact.entityId}, not ${candidate.id}`);
      if (!fact.sourceIds.every((sourceId) => sourceIds.has(sourceId)))
        throw new Error(`${factId}: hidden projection lineage`);
      const raw = factRange(fact);
      return { metricId: metric.id, raw, normalized: normalize(raw, metric), factId };
    });
    if (Object.keys(candidate.metricFactIds).sort().join("|") !== model.objectives.map((item) => item.metricId).sort().join("|"))
      throw new Error(`${candidate.id}: metric set differs from compiled decision model`);
    const utility = model.objectives.reduce((total, objective) => {
      const metric = metrics.find((item) => item.metricId === objective.metricId)!;
      return { low: total.low + metric.normalized.low * objective.weight, high: total.high + metric.normalized.high * objective.weight };
    }, { low: 0, high: 0 });
    const hardObjectivesSatisfied = model.objectives.every((objective) => {
      if (objective.hardMinimum === undefined) return true;
      return metrics.find((item) => item.metricId === objective.metricId)!.raw.low >= objective.hardMinimum;
    });
    results.push({
      candidateId: candidate.id,
      feasible: feasibility.outcome === "FEASIBLE",
      feasibilityOutcome: feasibility.outcome,
      hardObjectivesSatisfied,
      utility: { low: rounded(utility.low), high: rounded(utility.high) },
      worstCaseRegret: 0,
      metrics,
      dominatedBy: [],
    });
  }
  const bestHigh = Math.max(...results.filter((item) => item.feasible && item.hardObjectivesSatisfied).map((item) => item.utility.high), 0);
  for (const candidate of results) {
    candidate.worstCaseRegret = rounded(Math.max(0, bestHigh - candidate.utility.low));
    candidate.dominatedBy = results.filter((other) => other !== candidate && dominates(other, candidate)).map((item) => item.candidateId).sort();
  }
  const ranking = [...results].sort((a, b) =>
    Number(b.feasible && b.hardObjectivesSatisfied) - Number(a.feasible && a.hardObjectivesSatisfied) ||
    b.utility.low - a.utility.low || a.worstCaseRegret - b.worstCaseRegret || a.candidateId.localeCompare(b.candidateId),
  ).map((item) => item.candidateId);
  const paretoFront = results.filter((item) => !item.dominatedBy.length && item.feasible && item.hardObjectivesSatisfied).map((item) => item.candidateId).sort();
  const tradeoffs = model.objectives.flatMap((objective) => {
    const ordered = [...results].sort((a, b) => {
      const av = a.metrics.find((item) => item.metricId === objective.metricId)!.normalized.low;
      const bv = b.metrics.find((item) => item.metricId === objective.metricId)!.normalized.low;
      return bv - av || a.candidateId.localeCompare(b.candidateId);
    });
    return [`${objective.metricId}:${ordered[0].candidateId}>${ordered.at(-1)!.candidateId}`];
  });
  return {
    requestId: request.id, kind: request.kind, worldRevision: world.revision, scenarioId: request.scenarioId,
    modelId: request.modelId, status: "ANALYZED", ranking, winnerId: ranking[0], paretoFront,
    candidates: results, tradeoffs, responsibleFactIds: unique(results.flatMap((item) => item.metrics.map((metric) => metric.factId))),
    proofIds: ["decision-engine-proof", "feasibility-replay", "interval-utility", "worst-case-regret", "pareto-replay"],
  };
};

const seal = (body: Omit<DecisionResult, "digest">): DecisionResult => ({ ...body, digest: cognitiveDigest(body) });

export const executeDecisionRequest = (request: DecisionRequest, world: CognitiveWorldSnapshot, domain: CompiledCognitiveDomain): DecisionResult => {
  validateWorld(world, domain, request.expectedWorldRevision);
  if (request.kind !== "FALSIFY" && request.kind !== "SENSITIVITY") return seal(analyze(request, world, domain));
  if (request.analysis.expectedWorldRevision !== request.expectedWorldRevision || request.analysis.scenarioId !== request.scenarioId)
    throw new Error("decision challenge crosses revision or scenario scope");
  const baseline = analyze(request.analysis, world, domain);
  if (request.kind === "FALSIFY") {
    const falseClaim = baseline.winnerId !== request.claimedWinnerId;
    return seal({ ...baseline, requestId: request.id, kind: request.kind, status: falseClaim ? "FALSIFIED" : "SUSTAINED",
      proofIds: [...baseline.proofIds, "analysis-replay", "winner-claim-test"] });
  }
  if (!domain.decision.models.has(request.alternateModelId)) throw new Error("sensitivity model is not compiler-approved");
  const alternate = analyze({ ...request.analysis, id: `${request.id}:alternate`, modelId: request.alternateModelId }, world, domain);
  return seal({ ...baseline, requestId: request.id, kind: request.kind,
    status: baseline.winnerId === alternate.winnerId ? "ROBUST" : "SENSITIVE", alternateWinnerId: alternate.winnerId,
    proofIds: [...baseline.proofIds, "analysis-replay", "compiled-model-sensitivity"] });
};

export const decisionEngineAdapter: OperatorAdapter = ({ operator, values, world, domain }) => {
  if (!["COMPARE", "SCORE", "RANK", "OPTIMIZE", "DOMINANCE", "PARETO", "FALSIFY", "SENSITIVITY"].includes(operator))
    throw new Error(`decision engine cannot execute ${operator}`);
  const request = cloneCognitive(values.request.value) as unknown as DecisionRequest;
  if (request.kind !== operator) throw new Error(`${operator} received the wrong decision request kind`);
  const result = executeDecisionRequest(request, world, domain);
  return { datum: { kind: "RECORD", value: cloneCognitive(result) as unknown as CognitiveValue,
    sourceIds: result.responsibleFactIds, proofIds: result.proofIds, authority: "READ_ONLY" },
    evidence: ["decision-engine-proof", `operator:${operator.toLowerCase()}`] };
};

export const decisionEngineAdapters = { "decision-engine": decisionEngineAdapter } as const;
