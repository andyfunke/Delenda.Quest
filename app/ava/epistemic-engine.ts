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

type EpistemicBase = {
  id: string;
  expectedWorldRevision: string;
  actorId: string;
  scenarioId: string;
};

export type EpistemicEvidenceRequest = EpistemicBase & {
  kind: "CORROBORATE" | "DISPUTE";
  variableId: string;
  proposition: CognitiveValue;
  factIds: readonly string[];
};

export type EpistemicAssumptionRequest = EpistemicBase & {
  kind: "ASSUME";
  premiseId: string;
  variableId: string;
  value: CognitiveValue;
};

export type EpistemicEstimateRequest = EpistemicBase & {
  kind: "ESTIMATE";
  variableId: string;
  factIds: readonly string[];
};

export type EpistemicBoundRequest = EpistemicBase & {
  kind: "BOUND";
  estimate: EpistemicEstimateRequest;
};

export type EpistemicDownweightRequest = EpistemicBase & {
  kind: "DOWNWEIGHT";
  factIds: readonly string[];
  reason: "DEPENDENT" | "AGED";
};

export type EpistemicMarginalizeRequest = EpistemicBase & {
  kind: "MARGINALIZE";
  modelId: "FINITE_HYPOTHESIS_SUM";
  hypotheses: readonly {
    id: string;
    priorWeight: number;
    likelihood: number;
    value?: number;
  }[];
};

export type EpistemicRequest =
  | EpistemicEvidenceRequest
  | EpistemicAssumptionRequest
  | EpistemicEstimateRequest
  | EpistemicBoundRequest
  | EpistemicDownweightRequest
  | EpistemicMarginalizeRequest;

export type EpistemicResult = {
  requestId: string;
  kind: EpistemicRequest["kind"];
  worldRevision: string;
  actorId: string;
  scenarioId: string;
  status:
    | "SUPPORTED"
    | "REFUTED"
    | "MIXED"
    | "INSUFFICIENT"
    | "ASSUMED"
    | "ESTIMATED"
    | "BOUNDED"
    | "DOWNWEIGHTED"
    | "MARGINALIZED";
  variableId?: string;
  value?: CognitiveValue;
  confidence?: number;
  interval?: { low: number; high: number };
  supportFactIds: readonly string[];
  refutationFactIds: readonly string[];
  independentRecordIds: readonly string[];
  weights?: Readonly<Record<string, number>>;
  posterior?: readonly { id: string; weight: number }[];
  assumptions: readonly string[];
  responsibleFactIds: readonly string[];
  proofIds: readonly string[];
  digest: string;
};

type EvidenceRecord = {
  fact: CognitiveWorldFact;
  reliability: number;
  independenceKey: string;
  ageDays: number;
};

const unique = (values: readonly string[]) => [...new Set(values)].sort();
const rounded = (value: number) => Number(value.toFixed(12));

const validateWorld = (
  world: CognitiveWorldSnapshot,
  domain: CompiledCognitiveDomain,
  expectedRevision: string,
) => {
  if (expectedRevision !== world.revision)
    throw new Error("epistemic request world revision is stale");
  const { digest, ...input } = world;
  if (compileWorldSnapshot(input, domain).digest !== digest)
    throw new Error("epistemic world digest is forged");
};

const validateScope = (request: EpistemicBase, domain: CompiledCognitiveDomain) => {
  if (!domain.epistemic.actorIds.includes(request.actorId))
    throw new Error(`epistemic actor ${request.actorId} is not compiler-approved`);
  if (!request.scenarioId.trim()) throw new Error("epistemic scenario scope is required");
};

const visibleRecords = (
  request: EpistemicBase & { factIds: readonly string[] },
  world: CognitiveWorldSnapshot,
  domain: CompiledCognitiveDomain,
  variableId?: string,
) => {
  if (!request.factIds.length || request.factIds.length !== new Set(request.factIds).size)
    throw new Error("epistemic evidence ids must be nonempty and unique");
  const facts = new Map(
    world.facts.filter((fact) => fact.visibility !== "HIDDEN").map((fact) => [fact.id, fact]),
  );
  const sources = new Map(
    world.sources.filter((source) => source.visibility !== "HIDDEN").map((source) => [source.id, source]),
  );
  return request.factIds.map((factId): EvidenceRecord => {
    const fact = facts.get(factId);
    if (!fact) throw new Error(`hidden or absent epistemic fact ${factId}`);
    if (variableId && fact.variableId !== variableId)
      throw new Error(`${factId}: evidence does not concern ${variableId}`);
    const factSources = fact.sourceIds.map((sourceId) => sources.get(sourceId));
    if (factSources.some((source) => !source))
      throw new Error(`${factId}: evidence has hidden or absent source lineage`);
    const reliability = Math.min(...factSources.map((source) => source!.reliability));
    if (reliability < domain.epistemic.minimumSourceReliability)
      throw new Error(`${factId}: source reliability is below compiled policy`);
    const ageDays = world.campaignDay - fact.observedAtDay;
    if (ageDays < 0) throw new Error(`${factId}: evidence is from the future`);
    if (ageDays > domain.epistemic.maximumEvidenceAgeDays)
      throw new Error(`${factId}: evidence has aged out of compiled policy`);
    const groups = unique(factSources.map((source) => source!.independentGroup));
    const roots = fact.lineage.length ? unique(fact.lineage) : [fact.id];
    return {
      fact,
      reliability,
      ageDays,
      independenceKey: canonicalJson({ groups, roots }),
    };
  });
};

const independent = (records: readonly EvidenceRecord[]) => {
  const selected = new Map<string, EvidenceRecord>();
  for (const record of records) {
    const previous = selected.get(record.independenceKey);
    if (
      !previous ||
      record.reliability > previous.reliability ||
      (record.reliability === previous.reliability && record.fact.id < previous.fact.id)
    ) selected.set(record.independenceKey, record);
  }
  return [...selected.values()].sort((a, b) => a.fact.id.localeCompare(b.fact.id));
};

const weightedMedian = (records: readonly EvidenceRecord[]) => {
  const values = records.map((record) => {
    if (typeof record.fact.value !== "number")
      throw new Error(`${record.fact.id}: numeric estimate requires numeric evidence`);
    const uncertainty = record.fact.uncertainty;
    const point = uncertainty.kind === "INTERVAL"
      ? (uncertainty.low + uncertainty.high) / 2
      : record.fact.value;
    return { point, weight: record.reliability, id: record.fact.id };
  }).sort((a, b) => a.point - b.point || a.id.localeCompare(b.id));
  const total = values.reduce((sum, item) => sum + item.weight, 0);
  let running = 0;
  for (const item of values) {
    running += item.weight;
    if (running >= total / 2) return item.point;
  }
  throw new Error("numeric estimate has no weighted evidence");
};

const recordBounds = (record: EvidenceRecord) => {
  if (typeof record.fact.value !== "number")
    throw new Error(`${record.fact.id}: numeric bound requires numeric evidence`);
  return record.fact.uncertainty.kind === "INTERVAL"
    ? { low: record.fact.uncertainty.low, high: record.fact.uncertainty.high }
    : { low: record.fact.value, high: record.fact.value };
};

const validatePremiseValue = (
  variableId: string,
  value: CognitiveValue,
  domain: CompiledCognitiveDomain,
) => {
  const variable = domain.variables.get(variableId);
  if (!variable) throw new Error(`undeclared assumption variable ${variableId}`);
  if (variable.kind === "NUMBER") {
    if (typeof value !== "number" || !Number.isFinite(value))
      throw new Error("numeric assumption has invalid value");
    if (variable.minimum !== undefined && value < variable.minimum)
      throw new Error("numeric assumption is below its declared minimum");
    if (variable.maximum !== undefined && value > variable.maximum)
      throw new Error("numeric assumption is above its declared maximum");
  } else if (variable.kind === "BOOLEAN" && typeof value !== "boolean")
    throw new Error("boolean assumption has invalid value");
  else if ((variable.kind === "STRING" || variable.kind === "ENTITY_ID") && typeof value !== "string")
    throw new Error("string assumption has invalid value");
  else if (variable.kind === "ENUM" && (typeof value !== "string" || !variable.enumValues?.includes(value)))
    throw new Error("enum assumption is outside its declared values");
  else if (variable.kind === "NUMBER_SET" && (!Array.isArray(value) || value.some((item) => typeof item !== "number" || !Number.isFinite(item))))
    throw new Error("number-set assumption has invalid value");
  else if (variable.kind === "STRING_SET" && (!Array.isArray(value) || value.some((item) => typeof item !== "string")))
    throw new Error("string-set assumption has invalid value");
  else if (variable.kind === "RECORD" && (!value || typeof value !== "object" || Array.isArray(value)))
    throw new Error("record assumption has invalid value");
};

const seal = (body: Omit<EpistemicResult, "digest">): EpistemicResult => ({
  ...body,
  digest: cognitiveDigest(body),
});

const baseResult = (request: EpistemicRequest, world: CognitiveWorldSnapshot) => ({
  requestId: request.id,
  kind: request.kind,
  worldRevision: world.revision,
  actorId: request.actorId,
  scenarioId: request.scenarioId,
});

export const executeEpistemicRequest = (
  request: EpistemicRequest,
  world: CognitiveWorldSnapshot,
  domain: CompiledCognitiveDomain,
): EpistemicResult => {
  validateWorld(world, domain, request.expectedWorldRevision);
  validateScope(request, domain);

  if (request.kind === "CORROBORATE" || request.kind === "DISPUTE") {
    if (!domain.variables.has(request.variableId))
      throw new Error(`undeclared epistemic variable ${request.variableId}`);
    const records = independent(visibleRecords(request, world, domain, request.variableId));
    const support = records.filter((record) => canonicalJson(record.fact.value) === canonicalJson(request.proposition));
    const refutation = records.filter((record) => canonicalJson(record.fact.value) !== canonicalJson(request.proposition));
    const confidence = support.length
      ? rounded(support.reduce((sum, record) => sum + record.reliability, 0) / support.length)
      : 0;
    return seal({
      ...baseResult(request, world),
      status: support.length && refutation.length ? "MIXED" : support.length ? "SUPPORTED" : refutation.length ? "REFUTED" : "INSUFFICIENT",
      variableId: request.variableId,
      value: cloneCognitive(request.proposition),
      confidence,
      supportFactIds: support.map((record) => record.fact.id),
      refutationFactIds: refutation.map((record) => record.fact.id),
      independentRecordIds: records.map((record) => record.fact.id),
      assumptions: [],
      responsibleFactIds: records.map((record) => record.fact.id),
      proofIds: ["epistemic-engine-proof", "independence-replay", "support-refutation-separation"],
    });
  }

  if (request.kind === "ASSUME") {
    if (!request.premiseId.trim()) throw new Error("assumption premise id is required");
    validatePremiseValue(request.variableId, request.value, domain);
    return seal({
      ...baseResult(request, world), status: "ASSUMED", variableId: request.variableId,
      value: cloneCognitive(request.value), supportFactIds: [], refutationFactIds: [],
      independentRecordIds: [], assumptions: [request.premiseId], responsibleFactIds: [],
      proofIds: ["epistemic-engine-proof", `policy:${domain.epistemic.id}`, `premise:${request.premiseId}`],
    });
  }

  if (request.kind === "ESTIMATE") {
    if (domain.variables.get(request.variableId)?.kind !== "NUMBER")
      throw new Error(`estimate variable ${request.variableId} is not compiled numeric state`);
    const records = independent(visibleRecords(request, world, domain, request.variableId));
    return seal({
      ...baseResult(request, world), status: "ESTIMATED", variableId: request.variableId,
      value: weightedMedian(records), confidence: rounded(records.reduce((sum, record) => sum + record.reliability, 0) / records.length),
      supportFactIds: records.map((record) => record.fact.id), refutationFactIds: [],
      independentRecordIds: records.map((record) => record.fact.id), assumptions: [],
      responsibleFactIds: records.map((record) => record.fact.id),
      proofIds: ["epistemic-engine-proof", "reliability-weighted-median", "independence-replay"],
    });
  }

  if (request.kind === "BOUND") {
    if (request.estimate.actorId !== request.actorId || request.estimate.scenarioId !== request.scenarioId)
      throw new Error("bound request crosses actor or scenario scope");
    if (request.estimate.expectedWorldRevision !== request.expectedWorldRevision)
      throw new Error("bound request estimate revision mismatch");
    const estimate = executeEpistemicRequest(request.estimate, world, domain);
    const records = independent(visibleRecords(request.estimate, world, domain, request.estimate.variableId));
    const bounds = records.map(recordBounds);
    return seal({
      ...baseResult(request, world), status: "BOUNDED", variableId: request.estimate.variableId,
      value: estimate.value, confidence: estimate.confidence,
      interval: { low: Math.min(...bounds.map((item) => item.low)), high: Math.max(...bounds.map((item) => item.high)) },
      supportFactIds: estimate.supportFactIds, refutationFactIds: [], independentRecordIds: estimate.independentRecordIds,
      assumptions: [], responsibleFactIds: estimate.responsibleFactIds,
      proofIds: ["epistemic-engine-proof", "estimate-replay", "evidence-bound"],
    });
  }

  if (request.kind === "DOWNWEIGHT") {
    const records = visibleRecords(request, world, domain);
    if (request.reason === "DEPENDENT") {
      const keys = records.map((record) => record.independenceKey);
      if (keys.length === new Set(keys).size)
        throw new Error("dependent downweight has no shared record or lineage");
    } else if (!records.some((record) => record.ageDays > domain.temporal.defaultFreshnessDays))
      throw new Error("aged downweight has no aged evidence");
    const factor = domain.epistemic.downweightFactors[request.reason];
    const weights = Object.fromEntries(records.map((record) => [record.fact.id, rounded(record.reliability * factor)]));
    return seal({
      ...baseResult(request, world), status: "DOWNWEIGHTED", supportFactIds: [], refutationFactIds: [],
      independentRecordIds: independent(records).map((record) => record.fact.id), weights, assumptions: [],
      responsibleFactIds: records.map((record) => record.fact.id),
      proofIds: ["epistemic-engine-proof", `compiled-downweight:${request.reason.toLowerCase()}`],
    });
  }

  if (request.kind !== "MARGINALIZE") throw new Error("unknown epistemic request kind");
  if (request.modelId !== domain.epistemic.marginalizationModelId)
    throw new Error("marginalization model is not compiler-approved");
  if (!request.hypotheses.length || request.hypotheses.length !== new Set(request.hypotheses.map((item) => item.id)).size)
    throw new Error("finite hypothesis model must be nonempty and unique");
  let priorTotal = 0;
  for (const hypothesis of request.hypotheses) {
    if (!hypothesis.id.trim() || !Number.isFinite(hypothesis.priorWeight) || hypothesis.priorWeight < 0)
      throw new Error("hypothesis prior is invalid");
    if (!Number.isFinite(hypothesis.likelihood) || hypothesis.likelihood < 0 || hypothesis.likelihood > 1)
      throw new Error("hypothesis likelihood is outside [0,1]");
    if (hypothesis.value !== undefined && !Number.isFinite(hypothesis.value))
      throw new Error("hypothesis value is nonfinite");
    priorTotal += hypothesis.priorWeight;
  }
  if (Math.abs(priorTotal - 1) > 1e-9) throw new Error("hypothesis priors must sum to one");
  const normalization = request.hypotheses.reduce((sum, item) => sum + item.priorWeight * item.likelihood, 0);
  if (normalization <= 0) throw new Error("hypothesis evidence has zero support");
  const posterior = request.hypotheses.map((item) => ({
    id: item.id,
    weight: rounded(item.priorWeight * item.likelihood / normalization),
  })).sort((a, b) => a.id.localeCompare(b.id));
  const withValues = request.hypotheses.every((item) => item.value !== undefined);
  const value = withValues
    ? rounded(request.hypotheses.reduce((sum, item) => sum + (item.value as number) * item.priorWeight * item.likelihood / normalization, 0))
    : undefined;
  return seal({
    ...baseResult(request, world), status: "MARGINALIZED", ...(value === undefined ? {} : { value }),
    supportFactIds: [], refutationFactIds: [], independentRecordIds: [], posterior,
    assumptions: request.hypotheses.map((item) => `hypothesis:${item.id}`).sort(), responsibleFactIds: [],
    proofIds: ["epistemic-engine-proof", `policy:${domain.epistemic.id}`, "finite-hypothesis-sum"],
  });
};

export const epistemicEngineAdapter: OperatorAdapter = ({ operator, values, world, domain }) => {
  if (!["CORROBORATE", "DISPUTE", "ASSUME", "ESTIMATE", "BOUND", "DOWNWEIGHT", "MARGINALIZE"].includes(operator))
    throw new Error(`epistemic engine cannot execute ${operator}`);
  const request = cloneCognitive(values.request.value) as unknown as EpistemicRequest;
  if (request.kind !== operator) throw new Error(`${operator} received the wrong epistemic request kind`);
  const result = executeEpistemicRequest(request, world, domain);
  const retainedSources = result.responsibleFactIds.length
    ? result.responsibleFactIds
    : [`policy:${domain.epistemic.id}`, ...result.assumptions];
  return {
    datum: {
      kind: "RECORD",
      value: cloneCognitive(result) as unknown as CognitiveValue,
      sourceIds: unique(retainedSources),
      proofIds: result.proofIds,
      authority: "READ_ONLY",
    },
    evidence: ["epistemic-engine-proof", `operator:${operator.toLowerCase()}`],
  };
};

export const epistemicEngineAdapters = { "epistemic-engine": epistemicEngineAdapter } as const;
