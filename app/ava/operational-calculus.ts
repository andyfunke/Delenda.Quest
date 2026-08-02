import {
  CONTENT_PACK_VERSION,
  operationalObjectiveForProblemClass,
  operationalTargetForProblemClass,
} from "../campaign-substrate";
import { situationForState, type GameState } from "../game";
import {
  DELENDA_COGNITIVE_DOMAIN,
  type CognitiveDecisionMetricSpec,
} from "./cognitive-domain";
import type {
  AvaCognitiveDecisionGuidance,
  AvaCognitiveForecastGuidance,
} from "./cognitive-nexus";
import { cognitiveDigest, type CognitiveValue } from "./cognitive-types";
import { avaVisibleWorldRevision } from "./world-model";
import type { AvaActionDescriptor, AvaSemanticQuery } from "./schema";
import type {
  AvaOperationalAlternative,
  AvaOperationalCalculus,
  AvaOperationalCoupling,
  AvaOperationalDerivedValue,
  AvaOperationalEquation,
  AvaOperationalOption,
  AvaOperationalObjective,
  AvaOperationalPriorityAxis,
  AvaOperationalProvenance,
  AvaOperationalRule,
  AvaOperationalTypedInput,
  AvaOperationalUncertainty,
  AvaOperationalUnavailableEvidence,
  AvaOperationalAdvice,
  AvaOperationalForecast,
} from "./operational-contracts";

const DOMAIN_PATH = "app/ava/cognitive-domain.ts::DELENDA_COGNITIVE_DOMAIN";
const DECISION_PATH = "app/ava/decision-engine.ts::analyze";
const FORECAST_PATH = "app/ava/cognitive-nexus.ts::projectionArtifactFor";
const PROJECTION_PATH = "app/ava/projection.ts::projectAvaEnvelope";

const provenance = (
  sourcePath: string,
  field: string,
  sourceIds: readonly string[] = [],
  sourceOrder?: number,
): AvaOperationalProvenance => ({
  sourcePath,
  field,
  sourceIds: [...new Set(sourceIds)].sort(),
  ...(sourceOrder === undefined ? {} : { sourceOrder }),
});

const seal = <T extends Record<string, unknown>>(body: T) => ({
  ...body,
  digest: cognitiveDigest(body),
});

const valueForRange = (range: { low: number; high: number }): CognitiveValue =>
  range.low === range.high
    ? range.low
    : { kind: "INTERVAL", low: range.low, high: range.high };

const metricEquation = (
  spec: CognitiveDecisionMetricSpec,
): AvaOperationalEquation => ({
  id: `decision-normalization:${spec.id}`,
  kind: "NORMALIZATION",
  definition: {
    direction: spec.direction,
    normalization: spec.normalization,
  },
  sourcePath: "app/ava/decision-engine.ts::normalize",
  inputIds: [spec.variableId],
  outputIds: [`normalized.${spec.id}`],
});

const decisionUnavailable = (
  id: string,
  reason: string,
  status: "UNAVAILABLE" | "SEALED" | "NOT_PRESENT" = "UNAVAILABLE",
): AvaOperationalUnavailableEvidence => ({
  id,
  reason,
  status,
  provenance: [provenance(DECISION_PATH, id)],
});

const couplingUnavailable = (): AvaOperationalCoupling => ({
  id: "coupled-orders",
  relation: "COUPLED_ORDER",
  status: "UNAVAILABLE",
  reason: "The active campaign decision route exposes individual visible options, not a typed coupled-order relation.",
  provenance: [provenance(DECISION_PATH, "candidates")],
});

const actionOption = (
  descriptor: AvaActionDescriptor | undefined,
  candidateId: string,
  availability: AvaOperationalOption["availability"],
): AvaOperationalOption => ({
  id: candidateId,
  ...(descriptor?.label ? { label: descriptor.label } : {}),
  ...(descriptor?.kind ? { kind: descriptor.kind === "maneuver" ? "maneuver" : descriptor.kind === "directive" ? "directive" : "event" } : {}),
  availability,
  ...(descriptor?.orderCost === undefined ? {} : { orderCost: descriptor.orderCost }),
  provenance: [
    provenance(
      descriptor ? "app/ava/runtime.ts::enumerateAvaActions" : DECISION_PATH,
      descriptor ? "id" : "candidateId",
      [candidateId],
    ),
  ],
});

const decisionRules = (
  guidance: AvaCognitiveDecisionGuidance,
): AvaOperationalRule[] =>
  guidance.decision.proofIds.map((id, order) => ({
    id,
    order,
    fired: true,
    definition:
      id === "worst-case-regret"
        ? "Retain worst-case regret as a derived interval comparison."
        : id === "pareto-replay"
          ? "Replay Pareto-front membership from the disclosed candidate metrics."
          : id === "feasibility-replay"
            ? "Replay the typed feasibility result before ranking."
            : id === "interval-utility"
              ? "Aggregate the declared normalized objective intervals with the compiled model weights."
              : id === "decision-engine-proof"
                ? "Accept only the compiled decision-engine result."
                : id,
    sourcePath: DECISION_PATH,
    provenance: [provenance(DECISION_PATH, "proofIds", [id], order)],
  }));

const decisionEquations = (
  modelId: string,
): AvaOperationalEquation[] => {
  const model = DELENDA_COGNITIVE_DOMAIN.decision.models.get(modelId);
  if (!model) return [];
  const metrics = model.objectives.flatMap((objective) => {
    const metric = DELENDA_COGNITIVE_DOMAIN.decision.metrics.get(objective.metricId);
    return metric ? [metricEquation(metric)] : [];
  });
  return [
    ...metrics,
    {
      id: `decision-utility:${modelId}`,
      kind: "UTILITY",
      definition: {
        kind: "WEIGHTED_INTERVAL_SUM",
        modelId,
        objectives: model.objectives.map((objective) => ({ ...objective })),
      },
      sourcePath: DECISION_PATH,
      inputIds: model.objectives.map((objective) => `normalized.${objective.metricId}`),
      outputIds: ["utility.low", "utility.high"],
    },
    {
      id: "decision-ranking-order",
      kind: "RANKING",
      definition: {
        order: [
          "feasible DESC",
          "hardObjectivesSatisfied DESC",
          "utility.low DESC",
          "worstCaseRegret ASC",
          "candidateId ASC",
        ],
      },
      sourcePath: DECISION_PATH,
      inputIds: ["feasible", "hardObjectivesSatisfied", "utility.low", "worstCaseRegret", "candidateId"],
      outputIds: ["ranking"],
    },
  ];
};

export const decisionCalculusFor = (input: {
  state: GameState;
  query: AvaSemanticQuery;
  guidance: AvaCognitiveDecisionGuidance;
  descriptors: readonly AvaActionDescriptor[];
}): AvaOperationalCalculus => {
  const decision = input.guidance.decision;
  const model = DELENDA_COGNITIVE_DOMAIN.decision.models.get(decision.modelId);
  if (!model)
    throw new Error(`missing compiler-owned decision model ${decision.modelId}`);
  const descriptorById = new Map(
    input.descriptors.map((descriptor) => [descriptor.id, descriptor]),
  );
  const sortedCandidates = [...decision.candidates].sort((a, b) =>
    a.candidateId.localeCompare(b.candidateId),
  );
  const sourceInputs: AvaOperationalTypedInput[] = [];
  const derivedValues: AvaOperationalDerivedValue[] = [];
  for (const candidate of sortedCandidates) {
    for (const metric of [...candidate.metrics].sort((a, b) =>
      a.metricId.localeCompare(b.metricId),
    )) {
      const spec = DELENDA_COGNITIVE_DOMAIN.decision.metrics.get(metric.metricId);
      const variable = spec
        ? DELENDA_COGNITIVE_DOMAIN.variables.get(spec.variableId)
        : undefined;
      sourceInputs.push({
        id: metric.factId,
        value: valueForRange(metric.raw),
        ...(variable?.unit ? { unit: variable.unit } : {}),
        availability: "AVAILABLE",
        provenance: [
          provenance(DECISION_PATH, "metricFactIds", [metric.factId]),
          provenance(DECISION_PATH, "candidateId", [candidate.candidateId]),
        ],
      });
      derivedValues.push(
        {
          id: `${candidate.candidateId}:${metric.metricId}:normalized`,
          value: valueForRange(metric.normalized),
          provenance: [provenance(DECISION_PATH, "normalize", [metric.factId])],
        },
      );
    }
    derivedValues.push(
      {
        id: `${candidate.candidateId}:utility`,
        value: { low: candidate.utility.low, high: candidate.utility.high },
        provenance: [provenance(DECISION_PATH, "utility", [candidate.candidateId])],
      },
      {
        id: `${candidate.candidateId}:worst-case-regret`,
        value: candidate.worstCaseRegret,
        provenance: [provenance(DECISION_PATH, "worstCaseRegret", [candidate.candidateId])],
      },
      {
        id: `${candidate.candidateId}:feasibility`,
        value: {
          outcome: candidate.feasibilityOutcome,
          feasible: candidate.feasible,
          hardObjectivesSatisfied: candidate.hardObjectivesSatisfied,
        },
        provenance: [provenance(DECISION_PATH, "feasibility", [candidate.candidateId])],
      },
    );
  }
  const options = decision.ranking.map((candidateId) => {
    const candidate = decision.candidates.find((item) => item.candidateId === candidateId);
    const availability = candidate?.feasible && candidate.hardObjectivesSatisfied
      ? "AVAILABLE"
      : candidate
        ? "UNAVAILABLE"
        : "NOT_PRESENT";
    return actionOption(descriptorById.get(candidateId), candidateId, availability);
  });
  const alternatives: AvaOperationalAlternative[] = decision.ranking
    .filter((candidateId) => candidateId !== decision.winnerId)
    .map((optionId) => ({
      optionId,
      status: "VISIBLE_ALTERNATIVE",
      reason: "The compiled decision ranking retained this visible option below the authoritative winner.",
      provenance: [provenance(DECISION_PATH, "ranking", [optionId])],
    }));
  const uncertainties: AvaOperationalUncertainty[] = sortedCandidates.flatMap((candidate) =>
    candidate.metrics.flatMap((metric) =>
      metric.raw.low === metric.raw.high
        ? []
        : [{
            id: `${candidate.candidateId}:${metric.metricId}:uncertainty`,
            kind: "INTERVAL" as const,
            value: { low: metric.raw.low, high: metric.raw.high },
            provenance: [provenance(DECISION_PATH, "raw", [metric.factId])],
          }],
    ),
  );
  const unavailableEvidence = [
    couplingUnavailable(),
  ].flatMap(() => [
    decisionUnavailable(
      "coupled-orders",
      "No typed coupled-order relation is emitted by the active campaign decision owner.",
    ),
  ]);
  const calculusBody = {
    kind: "CANONICAL_CALCULUS" as const,
    identity: "delenda-cognitive-decision",
    revision: DELENDA_COGNITIVE_DOMAIN.version,
    sourceInputs,
    derivedValues,
    equations: decisionEquations(decision.modelId),
    rules: decisionRules(input.guidance),
    optionEnvelope: options,
    alternatives,
    uncertainties,
    coupledOrders: [couplingUnavailable()],
    unavailableEvidence,
    provenance: [
      provenance(DOMAIN_PATH, "decision", [decision.modelId]),
      provenance(DECISION_PATH, "digest", [decision.digest]),
      provenance("app/ava/world-model.ts::avaVisibleWorldRevision", "stateRevision", [avaVisibleWorldRevision(input.state)]),
    ],
    boundaries: [
      "READ_ONLY",
      "HIDDEN_INPUTS_EXCLUDED",
      "NO_SEALED_TICKET",
      "NO_RNG_SEED",
      "NO_SEALED_OUTCOME",
      "NO_PREPARED_ORDER",
    ],
  } satisfies Omit<AvaOperationalCalculus, "digest">;
  return seal(calculusBody) as AvaOperationalCalculus;
};

const priorityAxesFor = (
  query: AvaSemanticQuery,
): AvaOperationalPriorityAxis[] =>
  query.criteria.map((criterion) => ({
    id: criterion,
    label: criterion.replaceAll("_", " "),
    source: "SEMANTIC_QUERY",
  }));

export const adviceFor = (input: {
  state: GameState;
  query: AvaSemanticQuery;
  guidance: AvaCognitiveDecisionGuidance;
  descriptors: readonly AvaActionDescriptor[];
  calculus: AvaOperationalCalculus;
}): AvaOperationalAdvice => {
  const situation = situationForState(input.state);
  const objective: AvaOperationalObjective = {
    id: `objective:${situation.problemClass}`,
    label: operationalObjectiveForProblemClass(situation.problemClass),
    question: situation.question,
    target: operationalTargetForProblemClass(situation.problemClass),
    problemClass: situation.problemClass,
    sector: situation.sector,
    provenance: [
      provenance("app/campaign-substrate.ts::CompiledSituation", "problemClass", [situation.problemClass]),
      provenance("app/campaign-substrate.ts::CompiledSituation", "question", [situation.id]),
    ],
  };
  const visibleInputs: AvaOperationalTypedInput[] = [
    {
      id: "situation.id",
      value: situation.id,
      availability: "AVAILABLE",
      provenance: [provenance("app/campaign-substrate.ts::CompiledSituation", "id", [situation.id])],
    },
    {
      id: "situation.problemClass",
      value: situation.problemClass,
      availability: "AVAILABLE",
      provenance: [provenance("app/campaign-substrate.ts::CompiledSituation", "problemClass", [situation.id])],
    },
    {
      id: "situation.bands",
      value: situation.bands as unknown as CognitiveValue,
      availability: "AVAILABLE",
      provenance: [provenance("app/campaign-substrate.ts::CompiledSituation", "bands", [situation.id])],
    },
  ];
  const options = input.calculus.optionEnvelope;
  const body: Omit<AvaOperationalAdvice, "digest"> = {
    kind: "TYPED_ADVICE",
    status: "AVAILABLE",
    objective,
    priorityAxes: priorityAxesFor(input.query),
    operationalContext: {
      situationId: situation.id,
      contentRevision: CONTENT_PACK_VERSION,
      disclosedBands: situation.bands as unknown as CognitiveValue,
      provenance: [provenance("app/campaign-substrate.ts::CompiledSituation", "bands", [situation.id])],
    },
    visibleInputs,
    options,
    alternatives: input.calculus.alternatives,
    uncertainties: input.calculus.uncertainties,
    coupledOrders: input.calculus.coupledOrders,
    limitations: input.calculus.unavailableEvidence,
    calculusDigest: input.calculus.digest,
  };
  void input.guidance;
  void input.descriptors;
  return seal(body) as AvaOperationalAdvice;
};

export const forecastFor = (input: {
  state: GameState;
  guidance: AvaCognitiveForecastGuidance;
}): { calculus: AvaOperationalCalculus; forecast: AvaOperationalForecast } => {
  const { artifact, temporal } = input.guidance;
  const projection = artifact.projection;
  const derivedValues: AvaOperationalDerivedValue[] = artifact.changes.map((change) => ({
    id: `change:${change.metric}`,
    value: { before: change.before, after: change.after },
    provenance: [provenance(FORECAST_PATH, "changes", [artifact.digest])],
  }));
  if (projection)
    derivedValues.push({
      id: "projection:disclosed-day",
      value: projection as unknown as CognitiveValue,
      provenance: [provenance(PROJECTION_PATH, "projection", [artifact.digest])],
    });
  const uncertainties: AvaOperationalUncertainty[] = projection
    ? [
        {
          id: "friendly-loss",
          kind: "INTERVAL",
          value: { low: projection.friendlyLossLow, high: projection.friendlyLossHigh },
          provenance: [provenance(PROJECTION_PATH, "friendlyLossLow/friendlyLossHigh", [artifact.digest])],
        },
        {
          id: "ground-movement",
          kind: "INTERVAL",
          value: { low: projection.groundLow, high: projection.groundHigh },
          unit: "km",
          provenance: [provenance(PROJECTION_PATH, "groundLow/groundHigh", [artifact.digest])],
        },
      ]
    : [];
  const unavailableEvidence = artifact.status === "PROJECTED"
    ? []
    : [
        {
          id: `forecast:${artifact.status.toLowerCase()}`,
          reason: artifact.reason ?? `Forecast is ${artifact.status.toLowerCase()} at the disclosed boundary.`,
          status: artifact.status === "SEALED" ? "SEALED" as const : "UNAVAILABLE" as const,
          provenance: [provenance(FORECAST_PATH, "status", [artifact.digest])],
        },
      ];
  const equations: AvaOperationalEquation[] = artifact.confidence
    ? [
        {
          id: "maneuver-execution-confidence",
          kind: "PROJECTION",
          definition: {
            kind: "AUTHORITY_DECLARED_TERM_SUM",
            clamp: [0.05, 0.95],
            terms: artifact.confidence.terms.map((term) => ({ ...term })),
          },
          sourcePath: "app/game.ts::explainManeuverChance",
          inputIds: artifact.confidence.terms.map((term) => term.label),
          outputIds: ["confidence.result"],
        },
      ]
    : [];
  const rules: AvaOperationalRule[] = temporal.proofIds.map((id, order) => ({
    id,
    order,
    fired: true,
    definition: id,
    sourcePath: "app/ava/temporal-engine.ts::executeTemporalRequest",
    provenance: [provenance("app/ava/temporal-engine.ts::executeTemporalRequest", "proofIds", [id], order)],
  }));
  const sourceInputs: AvaOperationalTypedInput[] = [
    {
      id: "forecast.target",
      value: artifact.targetId,
      availability: artifact.status === "UNAVAILABLE" ? "UNAVAILABLE" : artifact.status === "SEALED" ? "SEALED" : "AVAILABLE",
      provenance: [provenance(FORECAST_PATH, "targetId", [artifact.digest])],
    },
    {
      id: "forecast.horizon",
      value: artifact.horizonId,
      availability: "AVAILABLE",
      provenance: [provenance("app/ava/temporal-engine.ts::TemporalResult", "horizonId", [temporal.digest])],
    },
  ];
  const calculusBody: Omit<AvaOperationalCalculus, "digest"> = {
    kind: "CANONICAL_CALCULUS",
    identity: "ava-temporal-disclosed-projection",
    revision: DELENDA_COGNITIVE_DOMAIN.version,
    sourceInputs,
    derivedValues,
    equations,
    rules,
    optionEnvelope: [
      {
        id: artifact.targetId,
        availability: artifact.status === "PROJECTED" ? "AVAILABLE" : artifact.status,
        provenance: [provenance(FORECAST_PATH, "targetId", [artifact.digest])],
      },
    ],
    alternatives: [],
    uncertainties,
    coupledOrders: [
      {
        id: "coupled-orders",
        relation: "COUPLED_ORDER",
        status: "UNAVAILABLE",
        reason: "The active temporal owner accepts one disclosed projection target; it does not expose coupled-order semantics.",
        provenance: [provenance("app/ava/temporal-engine.ts::TemporalResult", "assumptions", [temporal.digest])],
      },
    ],
    unavailableEvidence,
    provenance: [
      provenance("app/ava/temporal-engine.ts::executeTemporalRequest", "digest", [temporal.digest]),
      provenance(FORECAST_PATH, "digest", [artifact.digest]),
    ],
    boundaries: [
      "READ_ONLY",
      "OUTCOME_SEMANTICS_UNBOUND",
      "NO_SEALED_TICKET",
      "NO_RNG_SEED",
      "NO_HIDDEN_INPUT",
    ],
  };
  const calculus = seal(calculusBody) as AvaOperationalCalculus;
  const forecastBody: Omit<AvaOperationalForecast, "digest"> = {
    kind: "TYPED_FORECAST",
    status: artifact.status === "PROJECTED" ? "AVAILABLE" : artifact.status,
    targetId: artifact.targetId,
    horizonId: artifact.horizonId,
    assumptions: temporal.forecast?.assumptions ?? [],
    ...(projection ? { projection: projection as unknown as CognitiveValue } : {}),
    changes: derivedValues.filter((value) => value.id.startsWith("change:")),
    ...(artifact.confidence
      ? {
          confidence: {
            id: "confidence",
            value: {
              result: artifact.confidence.result,
              terms: artifact.confidence.terms.map((term) => ({ ...term })),
            },
            provenance: [provenance("app/game.ts::explainManeuverChance", "result", [artifact.digest])],
          },
        }
      : {}),
    limitations: unavailableEvidence,
    calculusDigest: calculus.digest,
  };
  return { calculus, forecast: seal(forecastBody) as AvaOperationalForecast };
};
