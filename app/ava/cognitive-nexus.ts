import {
  MANEUVERS,
  explainManeuverChance,
  type GameState,
} from "../game";
import { evaluateAvaCampaignChoices } from "./advisory";
import {
  causalEngineAdapters,
  type CausalFindCauseRequest,
  type CausalResult,
} from "./causal-engine";
import {
  constraintEngineAdapters,
  type FeasibilityRequest,
  type FeasibilityResult,
} from "./constraint-engine";
import {
  DELENDA_COGNITIVE_DOMAIN,
  DIRECTIVE_DECISION_COMPONENTS,
  DIRECTIVE_DECISION_MODEL_ID,
  type CompiledCognitiveDomain,
} from "./cognitive-domain";
import {
  canonicalJson,
  cloneCognitive,
  cognitiveDigest,
  type CognitiveAuthority,
  type CognitiveSource,
  type CognitiveValue,
} from "./cognitive-types";
import {
  decisionEngineAdapters,
  type DecisionAnalysisRequest,
  type DecisionCandidate,
  type DecisionResult,
} from "./decision-engine";
import {
  epistemicEngineAdapters,
  type EpistemicBoundRequest,
  type EpistemicResult,
} from "./epistemic-engine";
import {
  COGNITIVE_OPERATOR_REGISTRY,
  executeCognitiveProgram,
  type CognitiveDatum,
  type CognitiveOperator,
  type CognitiveProgram,
  type CognitiveProgramResult,
  type OperatorAdapter,
} from "./operator-algebra";
import {
  planningEngineAdapters,
  type BuildPlanRequest,
  type PlannedActionRequest,
  type PlanningResult,
} from "./planning-engine";
import {
  realizationEngineAdapters,
  validateCognitiveRealizationBinding,
  type CognitiveRealizationBinding,
} from "./realization-engine";
import {
  buildOperatorProofGraph,
  selectProofExplanation,
  validateCanonicalProofGraph,
  type CanonicalProofGraph,
  type ProofExplanation,
} from "./proof-graph";
import {
  projectAvaDisclosedState,
  projectAvaEnvelope,
} from "./projection";
import type {
  AvaCognitiveActivationReceipt,
  AvaInstructionRequestIR,
} from "./request-ir";
import {
  resolveSemanticTree,
  type ResolvedSemanticTree,
  type RuntimeEntityBinding,
} from "./resolved-semantic-tree";
import {
  actionKey,
  buildAvaPlan,
  descriptorForAction,
  executeAvaPlan,
  projectAvaAction,
} from "./runtime";
import type {
  AvaActionRef,
  AvaActionDescriptor,
  AvaDiscourseState,
  AvaEntity,
  AvaSemanticQuery,
} from "./schema";
import { compileSurfaceAst, type SurfaceAst } from "./surface-ast";
import {
  temporalEngineAdapters,
  type TemporalForecastRequest,
  type TemporalResult,
} from "./temporal-engine";
import {
  compileWorldSnapshot,
  avaVisibleWorldRevision,
  projectAvaVisibleWorld,
  worldSnapshotFromGameState,
  type CognitiveWorldFact,
  type CognitiveWorldSnapshot,
} from "./world-model";
import {
  evaluateDirectiveChoices,
  type ChoiceEvaluation,
} from "../substrate/choice-evaluation";
import {
  DEFAULT_STRATEGIC_POSTURE,
  mergePosture,
  type StrategicPosture,
} from "../substrate/posture";
import { visibleDirectiveView } from "../substrate/visible-directives";

export const AVA_COGNITIVE_ENGINE_ADAPTERS: Readonly<
  Record<string, OperatorAdapter>
> = Object.freeze({
  ...constraintEngineAdapters,
  ...temporalEngineAdapters,
  ...causalEngineAdapters,
  ...epistemicEngineAdapters,
  ...decisionEngineAdapters,
  ...planningEngineAdapters,
  ...realizationEngineAdapters,
});

export type AvaCognitiveRoute =
  | "SEMANTIC_BINDING"
  | "CONSTRAINT_CHECK"
  | "TEMPORAL_ENVELOPE"
  | "CAUSAL_DIAGNOSIS"
  | "EVIDENCE_BOUND"
  | "CAMPAIGN_DECISION"
  | "DIRECTIVE_DECISION"
  | "PLAN_VALIDATION";

export type AvaCognitiveNexusInput = {
  request: AvaInstructionRequestIR;
  state: GameState;
  visibleEntities: readonly AvaEntity[];
  discourse: AvaDiscourseState;
  opportunityFraction: number;
  stagedActions?: readonly AvaActionRef[];
};

export type AvaCognitiveForecastArtifact = {
  kind: "DISCLOSED_DAY_PROJECTION";
  targetId: string;
  worldRevision: string;
  horizonId: string;
  status: "PROJECTED" | "SEALED" | "UNAVAILABLE";
  projection?: {
    friendlyLoss: number;
    friendlyLossLow: number;
    friendlyLossHigh: number;
    netDesertion: number;
    groundMovement: number;
    groundLow: number;
    groundHigh: number;
    shortages: number;
    collapseRisk: number;
    disclosure: string;
  };
  changes: readonly {
    metric: string;
    before: number;
    after: number;
  }[];
  confidence?: {
    result: number;
    terms: readonly { label: string; points: number }[];
  };
  reason?: string;
  digest: string;
};

export type AvaCognitiveConstraintArtifact = {
  kind: "ACTION_PRECONDITION";
  targetId: string;
  actionId: "issue-order" | "inspect";
  bindings: Readonly<Record<string, CognitiveValue>>;
  available: boolean;
  rejection?: string;
  worldRevision: string;
  digest: string;
};

export type AvaCognitiveCausalArtifact = {
  kind: "OBSERVATIONAL_CAUSAL_DIAGNOSIS";
  targetId: string;
  variableId: string;
  worldRevision: string;
  observationFactIds: readonly string[];
  identification: "OBSERVATION_ONLY_NO_INTERVENTION";
  digest: string;
};

export type AvaCognitiveEpistemicArtifact = {
  kind: "SINGLE_RECORD_EVIDENCE_BOUND";
  targetId: string;
  variableId: string;
  worldRevision: string;
  factId: string;
  sourceId: string;
  sourceKind: "WORLD";
  sourceReliability: number;
  recordCount: 1;
  interpretation: "EVIDENCE_BOUND_NOT_CORROBORATION";
  digest: string;
};

export type AvaCognitiveDirectiveDecisionArtifact = {
  kind: "COMPILED_DIRECTIVE_DECISION";
  worldRevision: string;
  modelId: typeof DIRECTIVE_DECISION_MODEL_ID;
  binding: {
    channel: "production" | "military" | "diplomacy";
    actorId?: string;
  };
  posture: StrategicPosture;
  evaluations: readonly ChoiceEvaluation[];
  digest: string;
};

export type AvaCognitiveNexusExecution = {
  status: "EXECUTED";
  route: AvaCognitiveRoute;
  result: CognitiveProgramResult;
  proofGraph: CanonicalProofGraph;
  explanation: ProofExplanation;
  cognitiveActivation: AvaCognitiveActivationReceipt;
  constraintArtifact?: AvaCognitiveConstraintArtifact;
  forecastArtifact?: AvaCognitiveForecastArtifact;
  causalArtifact?: AvaCognitiveCausalArtifact;
  epistemicArtifact?: AvaCognitiveEpistemicArtifact;
  directiveDecisionArtifact?: AvaCognitiveDirectiveDecisionArtifact;
  plannedActionIds?: readonly string[];
  /**
   * Trusted-process binding only. This is deliberately omitted from every
   * public receipt and proof graph so opaque action material cannot become a
   * comparison oracle.
   */
  privatePlannedActionBindingDigests?: readonly string[];
};

export type AvaCognitiveNexusRejection = {
  status: "REJECTED";
  code: "COGNITIVE_NEXUS_PIPELINE_REJECTED";
  reason: string;
};

export type AvaCognitiveNexusResult =
  | AvaCognitiveNexusExecution
  | AvaCognitiveNexusRejection;

export type AvaCognitiveDecisionGuidance = {
  executionDigest: string;
  decision: DecisionResult;
  directiveArtifact?: AvaCognitiveDirectiveDecisionArtifact;
};

export type AvaCognitiveConstraintGuidance = {
  executionDigest: string;
  feasibility: FeasibilityResult;
  artifact: AvaCognitiveConstraintArtifact;
};

export type AvaCognitiveForecastGuidance = {
  executionDigest: string;
  temporal: TemporalResult;
  artifact: AvaCognitiveForecastArtifact;
};

export type AvaCognitivePlanningGuidance = {
  executionDigest: string;
  planning: PlanningResult;
  actionIds: readonly string[];
};

export type AvaCognitiveCausalGuidance = {
  executionDigest: string;
  causal: CausalResult;
  artifact: AvaCognitiveCausalArtifact;
};

export type AvaCognitiveEpistemicGuidance = {
  executionDigest: string;
  epistemic: EpistemicResult;
  artifact: AvaCognitiveEpistemicArtifact;
};

export type AvaCognitiveSemanticGuidance = {
  executionDigest: string;
  semantic: AvaSemanticQuery;
};

type CompiledRoute = {
  route: AvaCognitiveRoute;
  world: CognitiveWorldSnapshot;
  semanticTree: ResolvedSemanticTree;
  program: CognitiveProgram;
  constraintArtifact?: AvaCognitiveConstraintArtifact;
  forecastArtifact?: AvaCognitiveForecastArtifact;
  causalArtifact?: AvaCognitiveCausalArtifact;
  epistemicArtifact?: AvaCognitiveEpistemicArtifact;
  directiveDecisionArtifact?: AvaCognitiveDirectiveDecisionArtifact;
  plannedActionIds?: readonly string[];
  privatePlannedActionBindingDigests?: readonly string[];
};

const DESCRIPTOR_KINDS = new Set([
  "report",
  "status",
  "list",
  "module",
  "help",
  "shell",
  "forecast",
  "confirmation",
  "explain",
]);

const isCompilerDescriptor = (value: string) => {
  const separator = value.indexOf(":");
  if (separator < 1 || !DESCRIPTOR_KINDS.has(value.slice(0, separator)))
    return false;
  try {
    const payload = JSON.parse(value.slice(separator + 1));
    return !!payload && typeof payload === "object" && !Array.isArray(payload);
  } catch {
    return false;
  }
};

const queryBindings = (
  query: AvaSemanticQuery,
  entities: readonly AvaEntity[],
  domain: CompiledCognitiveDomain,
): RuntimeEntityBinding[] => {
  const bindings = new Map<string, RuntimeEntityBinding>();
  for (const id of query.subject.entityIds) {
    if (domain.concepts.has(id)) continue;
    const visible = entities.find((entity) => entity.id === id);
    if (!visible && !isCompilerDescriptor(id))
      throw new Error(`semantic entity ${id} is outside the visible runtime ontology`);
    const directVariableId =
      query.subject.type === "METRIC" && domain.variables.has(`state.${id}`)
        ? `state.${id}`
        : undefined;
    bindings.set(id, {
      id,
      kind: visible?.kind ?? "semantic-descriptor",
      ...(directVariableId
        ? { factIds: [`fact:${directVariableId}`] }
        : {}),
    });
  }
  return [...bindings.values()].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
};

const surfaceFor = (
  request: AvaInstructionRequestIR,
  domain: CompiledCognitiveDomain,
): SurfaceAst =>
  compileSurfaceAst(
    request.rawInput.trim() ||
      `${request.semantic.operation} ${request.semantic.subject.type}`,
    request.semantic,
    domain,
    request.trace,
  );

const resolvedTree = (input: {
  surface: SurfaceAst;
  world: CognitiveWorldSnapshot;
  request: AvaInstructionRequestIR;
  entities: readonly AvaEntity[];
  discourse: AvaDiscourseState;
  domain: CompiledCognitiveDomain;
  authorityCeiling?: CognitiveAuthority;
}) =>
  resolveSemanticTree({
    surface: input.surface,
    world: input.world,
    domain: input.domain,
    runtimeEntities: queryBindings(
      input.request.semantic,
      input.entities,
      input.domain,
    ),
    discourse: input.discourse,
    authorityCeiling: input.authorityCeiling ?? "READ_ONLY",
    expectedWorldRevision: input.world.revision,
  });

const literal = (
  value: CognitiveValue,
  sourceIds: readonly string[] = [],
  authority: CognitiveAuthority = "READ_ONLY",
): CognitiveDatum => ({
  kind:
    value === null
      ? "NULL"
      : Array.isArray(value)
        ? "LIST"
        : typeof value === "number"
          ? "NUMBER"
          : typeof value === "boolean"
            ? "BOOLEAN"
            : typeof value === "string"
              ? "STRING"
              : "RECORD",
  value: cloneCognitive(value),
  sourceIds: [...new Set(sourceIds)].sort(),
  proofIds: [],
  authority,
});

const programFor = (input: {
  route: AvaCognitiveRoute;
  operator: CognitiveOperator;
  datum: CognitiveDatum;
  semanticTree: ResolvedSemanticTree;
  world: CognitiveWorldSnapshot;
  authorityCeiling?: CognitiveAuthority;
  realize?: boolean;
}): CognitiveProgram => {
  const engineNode = {
    id: "nexus-cognitive-output",
    operator: input.operator,
    inputs: {
      [input.operator === "IDENTITY" ? "value" : "request"]: {
        kind: "LITERAL" as const,
        datum: input.datum,
      },
    },
  };
  const realizationNode = {
    id: "nexus-cognitive-realization",
    operator: "EXPLAIN" as const,
    inputs: {
      value: {
        kind: "NODE" as const,
        nodeId: engineNode.id,
      },
    },
  };
  return {
    id: `ava-nexus:${input.route.toLowerCase()}:${cognitiveDigest({
      semanticTreeDigest: input.semanticTree.digest,
      worldRevision: input.world.revision,
      operator: input.operator,
      realize: !!input.realize,
    })}`,
    version: "1",
    semanticTreeDigest: input.semanticTree.digest,
    worldRevision: input.world.revision,
    authorityCeiling: input.authorityCeiling ?? "READ_ONLY",
    nodes: input.realize ? [engineNode, realizationNode] : [engineNode],
    outputNodeId: input.realize ? realizationNode.id : engineNode.id,
  };
};

const needsSemanticRealization = (operation: AvaSemanticQuery["operation"]) =>
  ["EXPLAIN", "JUSTIFY", "CHALLENGE", "CORRECT"].includes(operation);

const genericRoute = (input: {
  surface: SurfaceAst;
  world: CognitiveWorldSnapshot;
  request: AvaInstructionRequestIR;
  entities: readonly AvaEntity[];
  discourse: AvaDiscourseState;
  domain: CompiledCognitiveDomain;
}): CompiledRoute => {
  const semanticTree = resolvedTree(input);
  const sourceIds = new Set<string>();
  for (const entity of semanticTree.entities)
    entity.factIds.forEach((factId) => sourceIds.add(factId));
  if (input.request.semantic.metric) {
    const factId = `fact:state.${input.request.semantic.metric}`;
    if (input.world.facts.some((fact) => fact.id === factId)) sourceIds.add(factId);
  }
  return {
    route: "SEMANTIC_BINDING",
    world: input.world,
    semanticTree,
    program: programFor({
      route: "SEMANTIC_BINDING",
      operator: "IDENTITY",
      datum: literal(
        cloneCognitive(input.request.semantic) as unknown as CognitiveValue,
        [...sourceIds],
      ),
      semanticTree,
      world: input.world,
      realize: needsSemanticRealization(input.request.semantic.operation),
    }),
  };
};

const forecastHorizon = (
  timeframe: AvaSemanticQuery["timeframe"],
): TemporalForecastRequest["horizonId"] => {
  if (timeframe === "HISTORICAL")
    throw new Error("historical evidence cannot be compiled as a forecast");
  return "current-day";
};

const forecastScalars = (state: GameState) => ({
  actions: state.actions,
  front: state.front,
  armed: state.armed,
  deployable: state.deployable,
  readiness: state.readiness,
  equipment: state.equipment,
  materiel: state.materiel,
  treasury: state.treasury,
  legitimacy: state.legitimacy,
  resistance: state.resistance,
  dependency: state.dependency,
  intelligence: state.intelligence,
  doctrine: state.doctrine,
});

const forecastChanges = (before: GameState, after: GameState) => {
  const opening = forecastScalars(before);
  const closing = forecastScalars(after);
  return Object.entries(opening).flatMap(([metric, value]) => {
    const next = closing[metric as keyof typeof closing];
    return next === value ? [] : [{ metric, before: value, after: next }];
  });
};

const sealForecastArtifact = (
  body: Omit<AvaCognitiveForecastArtifact, "digest">,
): AvaCognitiveForecastArtifact =>
  Object.freeze({
    ...cloneCognitive(body),
    digest: cognitiveDigest(body),
  });

const projectionArtifactFor = (input: {
  state: GameState;
  request: AvaInstructionRequestIR;
  stagedActions: readonly AvaActionRef[];
  opportunityFraction: number;
  worldRevision: string;
  horizonId: string;
}): AvaCognitiveForecastArtifact => {
  const instruction = input.request.instruction;
  if (instruction.kind !== "FORECAST")
    throw new Error("temporal route requires a typed forecast instruction");
  let targetId = "standing";
  let projectedState: GameState | undefined;
  let reason: string | undefined;
  let status: AvaCognitiveForecastArtifact["status"] = "PROJECTED";
  let confidence: AvaCognitiveForecastArtifact["confidence"];

  if (instruction.plan) {
    targetId = `plan:${input.stagedActions.map(actionKey).join("|") || "empty"}`;
    if (!input.stagedActions.length) {
      status = "UNAVAILABLE";
      reason = "No actions are staged.";
    } else if (
      input.stagedActions.some(
        (action) =>
          action.kind === "resolve-day" ||
          action.kind === "opportunity-response",
      )
    ) {
      status = "SEALED";
      reason = "The staged plan contains a sealed resolution boundary.";
    } else {
      const plan = buildAvaPlan(
        input.state,
        [...input.stagedActions],
        input.opportunityFraction,
      );
      const preview = executeAvaPlan(
        input.state,
        plan,
        input.opportunityFraction,
      );
      if (preview.executed) projectedState = preview.state;
      else {
        status = "UNAVAILABLE";
        reason = preview.rejection ?? "The staged plan could not be projected.";
      }
    }
  } else if (instruction.entity?.action) {
    const action = instruction.entity.action;
    targetId = actionKey(action);
    const descriptor = descriptorForAction(
      input.state,
      action,
      input.opportunityFraction,
    );
    if (!descriptor) {
      status = "UNAVAILABLE";
      reason = "The referenced action is outside the disclosed docket.";
    } else if (
      action.kind === "resolve-day" ||
      action.kind === "opportunity-response"
    ) {
      status = "SEALED";
      reason = "The action crosses a sealed resolution boundary.";
    } else {
      const preview = projectAvaAction(
        input.state,
        action,
        input.opportunityFraction,
      );
      if (preview.executed) projectedState = preview.state;
      else {
        status = "UNAVAILABLE";
        reason = preview.rejection ?? "The action could not be projected.";
      }
      if (action.kind === "maneuver") {
        const maneuver = MANEUVERS.find((item) => item.id === action.maneuverId);
        if (maneuver) {
          const assessed = explainManeuverChance(input.state, maneuver);
          confidence = {
            result: assessed.result,
            terms: assessed.terms.map(({ label, points }) => ({ label, points })),
          };
        }
      }
    }
  }

  const projection =
    status === "PROJECTED"
      ? projectAvaEnvelope(projectedState ?? input.state)
      : undefined;
  return sealForecastArtifact({
    kind: "DISCLOSED_DAY_PROJECTION",
    targetId,
    worldRevision: input.worldRevision,
    horizonId: input.horizonId,
    status,
    ...(projection
      ? {
          projection: {
            friendlyLoss: projection.friendlyLoss,
            friendlyLossLow: projection.friendlyLossLow,
            friendlyLossHigh: projection.friendlyLossHigh,
            netDesertion: projection.personnel.netDesertion,
            groundMovement: projection.groundMovement,
            groundLow: projection.groundLow,
            groundHigh: projection.groundHigh,
            shortages: projection.production.shortages,
            collapseRisk: projection.domestic.collapseRisk,
            disclosure: projection.disclosure,
          },
        }
      : {}),
    changes: projectedState
      ? forecastChanges(input.state, projectedState)
      : [],
    ...(confidence ? { confidence } : {}),
    ...(reason ? { reason } : {}),
  });
};

const temporalRoute = (input: {
  surface: SurfaceAst;
  world: CognitiveWorldSnapshot;
  request: AvaInstructionRequestIR;
  entities: readonly AvaEntity[];
  discourse: AvaDiscourseState;
  domain: CompiledCognitiveDomain;
  state: GameState;
  stagedActions: readonly AvaActionRef[];
  opportunityFraction: number;
}): CompiledRoute => {
  const semanticTree = resolvedTree(input);
  const horizonId = forecastHorizon(input.request.semantic.timeframe);
  const forecastArtifact = projectionArtifactFor({
    state: input.state,
    request: input.request,
    stagedActions: input.stagedActions,
    opportunityFraction: input.opportunityFraction,
    worldRevision: input.world.revision,
    horizonId,
  });
  const request: TemporalForecastRequest = {
    kind: "FORECAST",
    id: `forecast:${input.surface.digest}`,
    expectedWorldRevision: input.world.revision,
    scenarioId: `scenario:${cognitiveDigest({
      worldRevision: input.world.revision,
      targetId: forecastArtifact.targetId,
      horizonId,
    })}`,
    horizonId,
    assumptions: [
      ...new Set(
        [
          ...input.request.semantic.overlays.map((overlay) =>
            canonicalJson(overlay),
          ),
          `projection:${forecastArtifact.digest}`,
        ],
      ),
    ].sort(),
  };
  return {
    route: "TEMPORAL_ENVELOPE",
    world: input.world,
    semanticTree,
    program: programFor({
      route: "TEMPORAL_ENVELOPE",
      operator: "FORECAST",
      datum: literal(cloneCognitive(request) as unknown as CognitiveValue),
      semanticTree,
      world: input.world,
      realize: true,
    }),
    forecastArtifact,
  };
};

const normalizedDiagnosticInput = (rawInput: string) =>
  rawInput
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, " ")
    .trim();

const singleNumericMetricVariable = (
  request: AvaInstructionRequestIR,
  domain: CompiledCognitiveDomain,
) => {
  if (request.semantic.subject.type !== "METRIC") return undefined;
  const ids = [
    request.semantic.metric,
    ...(request.semantic.metricOperands ?? []),
    ...request.semantic.subject.entityIds,
  ].flatMap((id) => (typeof id === "string" ? [id] : []));
  const candidates = [
    ...new Set(
      ids
        .map((id) => (id.startsWith("state.") ? id : `state.${id}`))
        .filter((id) => domain.variables.get(id)?.kind === "NUMBER")
        .filter((id) => domain.variables.get(id)?.visibility !== "HIDDEN"),
    ),
  ];
  return candidates.length === 1 ? candidates[0] : undefined;
};

const exactCausalDiagnosticVariable = (
  request: AvaInstructionRequestIR,
  domain: CompiledCognitiveDomain,
) => {
  const input = normalizedDiagnosticInput(request.rawInput);
  if (
    !/^(?:what (?:caused|causes|is causing)|diagnose|causal diagnosis (?:of|for)|why did)\b/.test(
      input,
    )
  )
    return undefined;
  const variableId = singleNumericMetricVariable(request, domain);
  if (!variableId) return undefined;
  const hasCompiledCause = [...domain.causal.equations.values()].some(
    (equation) => equation.targetVariableId === variableId,
  );
  return hasCompiledCause ? variableId : undefined;
};

const exactEpistemicBoundVariable = (
  request: AvaInstructionRequestIR,
  domain: CompiledCognitiveDomain,
) => {
  const input = normalizedDiagnosticInput(request.rawInput);
  if (
    !/^(?:how certain is|estimate|bound|confidence (?:in|of|for)|confidence bound (?:for|of))\b/.test(
      input,
    )
  )
    return undefined;
  return singleNumericMetricVariable(request, domain);
};

const sealCausalArtifact = (
  body: Omit<AvaCognitiveCausalArtifact, "digest">,
): AvaCognitiveCausalArtifact =>
  Object.freeze({
    ...cloneCognitive(body),
    observationFactIds: Object.freeze([...body.observationFactIds]),
    digest: cognitiveDigest(body),
  });

const causalObservationFactIds = (
  variableId: string,
  world: CognitiveWorldSnapshot,
  domain: CompiledCognitiveDomain,
) => {
  const byTarget = new Map(
    [...domain.causal.equations.values()].map((equation) => [
      equation.targetVariableId,
      equation,
    ]),
  );
  const variables = new Set([variableId]);
  const visit = (target: string) => {
    const equation = byTarget.get(target);
    if (!equation) return;
    for (const input of equation.inputs) {
      if (variables.has(input.variableId)) continue;
      variables.add(input.variableId);
      visit(input.variableId);
    }
  };
  visit(variableId);
  const visibleFactIds = new Set(
    world.facts
      .filter((fact) => fact.visibility !== "HIDDEN")
      .map((fact) => fact.id),
  );
  return [...variables]
    .map((id) => `fact:${id}`)
    .filter((id) => visibleFactIds.has(id))
    .sort();
};

const causalRoute = (input: {
  surface: SurfaceAst;
  world: CognitiveWorldSnapshot;
  request: AvaInstructionRequestIR;
  entities: readonly AvaEntity[];
  discourse: AvaDiscourseState;
  domain: CompiledCognitiveDomain;
  variableId: string;
}): CompiledRoute => {
  const semanticTree = resolvedTree(input);
  const observationFactIds = causalObservationFactIds(
    input.variableId,
    input.world,
    input.domain,
  );
  const causalArtifact = sealCausalArtifact({
    kind: "OBSERVATIONAL_CAUSAL_DIAGNOSIS",
    targetId: input.variableId.slice("state.".length),
    variableId: input.variableId,
    worldRevision: input.world.revision,
    observationFactIds,
    identification: "OBSERVATION_ONLY_NO_INTERVENTION",
  });
  const request: CausalFindCauseRequest = {
    kind: "FIND_CAUSE",
    id: `cause:${causalArtifact.digest}`,
    expectedWorldRevision: input.world.revision,
    effectVariableId: input.variableId,
    observationalFactIds: observationFactIds,
  };
  return {
    route: "CAUSAL_DIAGNOSIS",
    world: input.world,
    semanticTree,
    program: programFor({
      route: "CAUSAL_DIAGNOSIS",
      operator: "FIND_CAUSE",
      datum: literal(
        cloneCognitive(request) as unknown as CognitiveValue,
        observationFactIds,
      ),
      semanticTree,
      world: input.world,
      realize: true,
    }),
    causalArtifact,
  };
};

const sealEpistemicArtifact = (
  body: Omit<AvaCognitiveEpistemicArtifact, "digest">,
): AvaCognitiveEpistemicArtifact =>
  Object.freeze({
    ...cloneCognitive(body),
    digest: cognitiveDigest(body),
  });

const epistemicRoute = (input: {
  surface: SurfaceAst;
  world: CognitiveWorldSnapshot;
  request: AvaInstructionRequestIR;
  entities: readonly AvaEntity[];
  discourse: AvaDiscourseState;
  domain: CompiledCognitiveDomain;
  variableId: string;
}): CompiledRoute => {
  const semanticTree = resolvedTree(input);
  const fact = input.world.facts.find(
    (candidate) =>
      candidate.variableId === input.variableId &&
      candidate.entityId === "campaign" &&
      candidate.visibility !== "HIDDEN" &&
      typeof candidate.value === "number",
  );
  if (!fact || fact.sourceIds.length !== 1)
    throw new Error("epistemic bound requires one exact visible evidence record");
  const source = input.world.sources.find(
    (candidate) => candidate.id === fact.sourceIds[0],
  );
  if (
    !source ||
    source.visibility === "HIDDEN" ||
    source.kind !== "WORLD" ||
    source.reliability !== 1
  )
    throw new Error(
      "epistemic bound requires one authoritative world source",
    );
  const epistemicArtifact = sealEpistemicArtifact({
    kind: "SINGLE_RECORD_EVIDENCE_BOUND",
    targetId: input.variableId.slice("state.".length),
    variableId: input.variableId,
    worldRevision: input.world.revision,
    factId: fact.id,
    sourceId: source.id,
    sourceKind: "WORLD",
    sourceReliability: source.reliability,
    recordCount: 1,
    interpretation: "EVIDENCE_BOUND_NOT_CORROBORATION",
  });
  const estimate = {
    kind: "ESTIMATE" as const,
    id: `estimate:${epistemicArtifact.digest}`,
    expectedWorldRevision: input.world.revision,
    actorId: "ava",
    scenarioId: `scenario:evidence:${epistemicArtifact.digest}`,
    variableId: input.variableId,
    factIds: [fact.id],
  };
  const request: EpistemicBoundRequest = {
    kind: "BOUND",
    id: `bound:${epistemicArtifact.digest}`,
    expectedWorldRevision: input.world.revision,
    actorId: estimate.actorId,
    scenarioId: estimate.scenarioId,
    estimate,
  };
  return {
    route: "EVIDENCE_BOUND",
    world: input.world,
    semanticTree,
    program: programFor({
      route: "EVIDENCE_BOUND",
      operator: "BOUND",
      datum: literal(
        cloneCognitive(request) as unknown as CognitiveValue,
        [fact.id],
      ),
      semanticTree,
      world: input.world,
      realize: true,
    }),
    epistemicArtifact,
  };
};

const decisionOperator = (
  operation: AvaSemanticQuery["operation"],
): DecisionAnalysisRequest["kind"] =>
  operation === "COMPARE"
    ? "COMPARE"
    : operation === "RANK"
      ? "RANK"
      : "OPTIMIZE";

export const directivePostureForSemantic = (
  query: AvaSemanticQuery,
): StrategicPosture => {
  let posture = DEFAULT_STRATEGIC_POSTURE;
  const criteria = new Set(query.criteria);
  if (criteria.has("PRODUCTION"))
    posture = mergePosture(posture, {
      objective: "preserve_industrial_capacity",
      priorities: { production_integrity: "critical" },
      confirmation: "inferred",
    });
  if (criteria.has("FRONT") || criteria.has("STRONGEST"))
    posture = mergePosture(posture, {
      objective: "stabilize_front",
      priorities: { territorial_control: "high", initiative: "high" },
      confirmation: "inferred",
    });
  if (criteria.has("LONG_TERM") || criteria.has("SUSTAINABILITY"))
    posture = mergePosture(posture, {
      objective: "build_long_term_capacity",
      horizon: "long",
      priorities: { long_term_capacity: "critical" },
      confirmation: "inferred",
    });
  if (criteria.has("IMMEDIATE"))
    posture = mergePosture(posture, {
      horizon: "immediate",
      confirmation: "inferred",
    });
  if (criteria.has("LOWEST_RISK"))
    posture = mergePosture(posture, {
      priorities: { force_preservation: "critical" },
      tolerances: {
        short_term_exposure: "low",
        veteran_attrition: "low",
      },
      confirmation: "inferred",
    });
  if (criteria.has("CHEAPEST") || criteria.has("LOWEST_MATERIEL_COST"))
    posture = mergePosture(posture, {
      priorities: { treasury_preservation: "critical" },
      tolerances: { treasury_expenditure: "low" },
      confirmation: "inferred",
    });
  return posture;
};

const projectionFact = (input: {
  id: string;
  variableId: string;
  entityId: string;
  value: number;
  sourceId: string;
  parentId: string;
  world: CognitiveWorldSnapshot;
  interval?: { low: number; high: number };
}): CognitiveWorldFact => ({
  id: input.id,
  variableId: input.variableId,
  entityId: input.entityId,
  value: input.value,
  visibility: "AVA_VISIBLE",
  sourceIds: [input.sourceId],
  lineage: ["fact:decision.projection-context", input.parentId],
  validFromDay: input.world.campaignDay,
  observedAtDay: input.world.campaignDay,
  uncertainty: input.interval
    ? { kind: "INTERVAL", ...input.interval }
    : { kind: "EXACT" },
});

const directiveModule = (
  channel: "production" | "military" | "diplomacy",
) =>
  channel === "production"
    ? "national" as const
    : channel === "military"
      ? "military" as const
      : "diplomacy" as const;

const directiveDecisionRoute = (input: {
  surface: SurfaceAst;
  baseWorld: CognitiveWorldSnapshot;
  request: AvaInstructionRequestIR;
  state: GameState;
  entities: readonly AvaEntity[];
  discourse: AvaDiscourseState;
  opportunityFraction: number;
  domain: CompiledCognitiveDomain;
}): CompiledRoute => {
  const binding = input.request.semantic.directive;
  if (!binding)
    throw new Error("directive decision requires a compiled channel binding");
  if (input.request.semantic.overlays.length)
    throw new Error("directive decision overlays are not compiler-owned");
  if (
    binding.channel === "diplomacy" &&
    !binding.actorId
  )
    throw new Error("diplomacy directive decision requires one actor");

  const view = visibleDirectiveView(
    input.state,
    directiveModule(binding.channel),
    binding.channel === "diplomacy" ? binding.actorId : undefined,
  );
  const posture = directivePostureForSemantic(input.request.semantic);
  const choiceById = new Map(
    view.fact.choices.map((choice) => [choice.choiceId, choice]),
  );
  const evaluations = evaluateDirectiveChoices(
    input.state,
    view.fact.choiceIds,
    posture,
  ).map((evaluation): ChoiceEvaluation => {
    const choice = choiceById.get(evaluation.choiceId);
    if (!choice)
      throw new Error(
        `directive ${evaluation.choiceId} escaped its visible docket`,
      );
    const descriptor = descriptorForAction(
      input.state,
      {
        kind: "directive",
        familyId: choice.familyId,
        choiceId: choice.choiceId,
      },
      input.opportunityFraction,
    );
    const legal = evaluation.legal && descriptor?.available === true;
    return {
      ...evaluation,
      legal,
      disqualifiers: legal
        ? []
        : [
            ...new Set([
              ...evaluation.disqualifiers,
              ...(descriptor?.available === true
                ? []
                : ["runtime-unavailable"]),
            ]),
          ].sort(),
    };
  });
  if (evaluations.length < 2)
    throw new Error(
      "directive decision requires at least two visible authored choices",
    );

  const artifactBody: Omit<
    AvaCognitiveDirectiveDecisionArtifact,
    "digest"
  > = {
    kind: "COMPILED_DIRECTIVE_DECISION",
    worldRevision: input.baseWorld.revision,
    modelId: DIRECTIVE_DECISION_MODEL_ID,
    binding: {
      channel: binding.channel,
      ...(binding.actorId ? { actorId: binding.actorId } : {}),
    },
    posture: cloneCognitive(posture) as unknown as StrategicPosture,
    evaluations: cloneCognitive(
      evaluations,
    ) as unknown as ChoiceEvaluation[],
  };
  const directiveDecisionArtifact = Object.freeze({
    ...artifactBody,
    digest: cognitiveDigest(artifactBody),
  });
  const contextFactId = `fact:directive:posture-context:${directiveDecisionArtifact.digest}`;
  const source: CognitiveSource = {
    id: `engine:directive-decision:${directiveDecisionArtifact.digest}`,
    kind: "ENGINE",
    label: "Compiler-owned directive decision projection",
    visibility: "AVA_VISIBLE",
    reliability: 1,
    independentGroup: `directive-decision:${input.baseWorld.revision}`,
  };
  const projectionFacts: CognitiveWorldFact[] = [
    {
      id: contextFactId,
      variableId: "directive.posture-context",
      entityId: binding.actorId ?? binding.channel,
      value: cloneCognitive(
        directiveDecisionArtifact,
      ) as unknown as CognitiveValue,
      visibility: "AVA_VISIBLE",
      sourceIds: [source.id],
      lineage: ["fact:decision.projection-context"],
      validFromDay: input.baseWorld.campaignDay,
      observedAtDay: input.baseWorld.campaignDay,
      uncertainty: { kind: "EXACT" },
    },
  ];
  const candidates: DecisionCandidate[] = evaluations.map(
    (evaluation, index) => {
      const factPrefix = `fact:z-directive:${String(index).padStart(3, "0")}`;
      const metricFactIds: Record<string, string> = {};
      const legalFactId = `${factPrefix}:legal`;
      metricFactIds["directive-legal"] = legalFactId;
      projectionFacts.push(
        projectionFact({
          id: legalFactId,
          variableId: "directive.legal",
          entityId: evaluation.choiceId,
          value: evaluation.legal ? 1 : 0,
          sourceId: source.id,
          parentId: contextFactId,
          world: input.baseWorld,
        }),
      );
      for (const component of DIRECTIVE_DECISION_COMPONENTS) {
        const factId = `${factPrefix}:${component.key}`;
        metricFactIds[component.metricId] = factId;
        projectionFacts.push(
          projectionFact({
            id: factId,
            variableId: component.variableId,
            entityId: evaluation.choiceId,
            value: evaluation.components[component.key],
            sourceId: source.id,
            parentId: contextFactId,
            world: input.baseWorld,
          }),
        );
      }
      return {
        id: evaluation.choiceId,
        scenarioId: `scenario:directive:${directiveDecisionArtifact.digest}`,
        metricFactIds,
        feasibilityRequest: {
          id: `directive-inspection:${evaluation.choiceId}`,
          expectedWorldRevision: input.baseWorld.revision,
          actionId: "inspect",
          bindings: { subject: evaluation.choiceId },
        },
      };
    },
  );
  const world = compileWorldSnapshot(
    {
      domainId: input.baseWorld.domainId,
      domainVersion: input.baseWorld.domainVersion,
      campaignId: input.baseWorld.campaignId,
      campaignDay: input.baseWorld.campaignDay,
      revision: input.baseWorld.revision,
      sources: [...input.baseWorld.sources, source],
      facts: [...input.baseWorld.facts, ...projectionFacts],
    },
    input.domain,
  );
  const semanticTree = resolvedTree({
    surface: input.surface,
    world,
    request: input.request,
    entities: input.entities,
    discourse: input.discourse,
    domain: input.domain,
  });
  const request: DecisionAnalysisRequest = {
    kind: decisionOperator(input.request.semantic.operation),
    id: `directive-decision:${directiveDecisionArtifact.digest}`,
    expectedWorldRevision: world.revision,
    scenarioId: `scenario:directive:${directiveDecisionArtifact.digest}`,
    modelId: DIRECTIVE_DECISION_MODEL_ID,
    candidates,
  };
  return {
    route: "DIRECTIVE_DECISION",
    world,
    semanticTree,
    program: programFor({
      route: "DIRECTIVE_DECISION",
      operator: request.kind,
      datum: literal(cloneCognitive(request) as unknown as CognitiveValue),
      semanticTree,
      world,
      realize: true,
    }),
    directiveDecisionArtifact,
  };
};

const decisionRoute = (input: {
  surface: SurfaceAst;
  baseWorld: CognitiveWorldSnapshot;
  request: AvaInstructionRequestIR;
  state: GameState;
  entities: readonly AvaEntity[];
  discourse: AvaDiscourseState;
  opportunityFraction: number;
  domain: CompiledCognitiveDomain;
}): CompiledRoute | null => {
  const criterion = input.request.semantic.criteria[0] ?? "OVERALL_VALUE";
  const requestedDomains = input.request.semantic.scope.domains;
  const adviceFullySuppressed =
    requestedDomains.length > 0 &&
    requestedDomains.every((domain) =>
      input.discourse.suppressedAdviceScopes.includes(domain),
    );
  if (
    input.request.semantic.overlays.length ||
    adviceFullySuppressed ||
    (criterion !== "OVERALL_VALUE" && criterion !== "FRONT")
  )
    return null;
  let evaluated = evaluateAvaCampaignChoices(
    input.state,
    input.request.semantic,
    input.opportunityFraction,
  );
  if (
    input.request.semantic.reference?.type === "OTHER_ENTITY" &&
    input.discourse.lastRecommended
  ) {
    const alternatives = evaluated.filter(
      (candidate) =>
        candidate.descriptor.id !== input.discourse.lastRecommended,
    );
    if (alternatives.length) evaluated = alternatives;
  }
  const candidates: DecisionCandidate[] = [];
  const projectionFacts: CognitiveWorldFact[] = [];
  const source: CognitiveSource = {
    id: `engine:ava-decision:${input.baseWorld.revision}`,
    kind: "ENGINE",
    label: "Ava disclosed action projection",
    visibility: "AVA_VISIBLE",
    reliability: 1,
    independentGroup: `ava-decision:${input.baseWorld.revision}`,
  };
  for (const [index, evaluation] of evaluated.entries()) {
    const preview = projectAvaAction(
      input.state,
      evaluation.descriptor.action,
      input.opportunityFraction,
    );
    if (!preview.executed) continue;
    const projection = projectAvaEnvelope(preview.state);
    const prefix = `fact:z-decision:${String(index).padStart(3, "0")}`;
    const readinessId = `${prefix}:readiness`;
    const frontId = `${prefix}:front`;
    const treasuryId = `${prefix}:treasury`;
    const frontLow = preview.state.front + projection.groundLow;
    const frontHigh = preview.state.front + projection.groundHigh;
    projectionFacts.push(
      projectionFact({
        id: readinessId,
        variableId: "state.readiness",
        entityId: evaluation.descriptor.id,
        value: preview.state.readiness,
        sourceId: source.id,
        parentId: "fact:state.readiness",
        world: input.baseWorld,
      }),
      projectionFact({
        id: frontId,
        variableId: "state.front",
        entityId: evaluation.descriptor.id,
        value: (frontLow + frontHigh) / 2,
        sourceId: source.id,
        parentId: "fact:state.front",
        world: input.baseWorld,
        interval: { low: frontLow, high: frontHigh },
      }),
      projectionFact({
        id: treasuryId,
        variableId: "state.treasury",
        entityId: evaluation.descriptor.id,
        value: preview.state.treasury,
        sourceId: source.id,
        parentId: "fact:state.treasury",
        world: input.baseWorld,
      }),
    );
    const scenarioId = `scenario:${input.surface.digest}`;
    candidates.push({
      id: evaluation.descriptor.id,
      scenarioId,
      metricFactIds: {
        readiness: readinessId,
        front: frontId,
        treasury: treasuryId,
      },
      feasibilityRequest: {
        id: `feasibility:${evaluation.descriptor.id}`,
        expectedWorldRevision: input.baseWorld.revision,
        actionId: "issue-order",
        bindings: {
          actionId: evaluation.descriptor.id,
          amount: evaluation.descriptor.orderCost,
        },
      },
    });
  }
  if (candidates.length < 2) return null;
  const world = compileWorldSnapshot(
    {
      domainId: input.baseWorld.domainId,
      domainVersion: input.baseWorld.domainVersion,
      campaignId: input.baseWorld.campaignId,
      campaignDay: input.baseWorld.campaignDay,
      revision: input.baseWorld.revision,
      sources: [...input.baseWorld.sources, source],
      facts: [...input.baseWorld.facts, ...projectionFacts],
    },
    input.domain,
  );
  const semanticTree = resolvedTree({
    surface: input.surface,
    world,
    request: input.request,
    entities: input.entities,
    discourse: input.discourse,
    domain: input.domain,
  });
  const request: DecisionAnalysisRequest = {
    kind: decisionOperator(input.request.semantic.operation),
    id: `decision:${input.surface.digest}`,
    expectedWorldRevision: world.revision,
    scenarioId: `scenario:${input.surface.digest}`,
    modelId: criterion === "FRONT" ? "front-priority" : "strategic-balance",
    candidates,
  };
  return {
    route: "CAMPAIGN_DECISION",
    world,
    semanticTree,
    program: programFor({
      route: "CAMPAIGN_DECISION",
      operator: request.kind,
      datum: literal(cloneCognitive(request) as unknown as CognitiveValue),
      semanticTree,
      world,
      realize: true,
    }),
  };
};

const cognitiveActionBindingForDescriptor = (
  descriptor: AvaActionDescriptor,
): {
  actionId: "issue-order" | "inspect";
  bindings: Readonly<Record<string, CognitiveValue>>;
} =>
  descriptor.orderCost
    ? {
        actionId: "issue-order",
        bindings: {
          actionId: descriptor.id,
          amount: descriptor.orderCost,
        },
      }
    : {
        actionId: "inspect",
        bindings: { subject: descriptor.id },
      };

const explicitConstraintTarget = (
  request: AvaInstructionRequestIR,
  entities: readonly AvaEntity[],
) => {
  if (
    request.semantic.subject.type !== "CAMPAIGN_CHOICE" ||
    request.semantic.subject.entityIds.length !== 1 ||
    !/\b(?:viable|viability|feasible|feasibility|preconditions?|prerequisites?)\b/i.test(
      request.rawInput,
    )
  )
    return undefined;
  const targetId = request.semantic.subject.entityIds[0];
  const entity = entities.find((candidate) => candidate.id === targetId);
  return entity?.action ? entity : undefined;
};

const sealConstraintArtifact = (
  body: Omit<AvaCognitiveConstraintArtifact, "digest">,
): AvaCognitiveConstraintArtifact =>
  Object.freeze({
    ...cloneCognitive(body),
    digest: cognitiveDigest(body),
  });

const constraintRoute = (input: {
  surface: SurfaceAst;
  world: CognitiveWorldSnapshot;
  request: AvaInstructionRequestIR;
  state: GameState;
  entity: AvaEntity;
  entities: readonly AvaEntity[];
  discourse: AvaDiscourseState;
  opportunityFraction: number;
  domain: CompiledCognitiveDomain;
}): CompiledRoute => {
  if (!input.entity.action)
    throw new Error("constraint target has no compiler-resolved action");
  const descriptor = descriptorForAction(
    input.state,
    input.entity.action,
    input.opportunityFraction,
  );
  if (!descriptor)
    throw new Error("constraint target left the disclosed action docket");
  const binding = cognitiveActionBindingForDescriptor(descriptor);
  const constraintArtifact = sealConstraintArtifact({
    kind: "ACTION_PRECONDITION",
    targetId: descriptor.id,
    actionId: binding.actionId,
    bindings: binding.bindings,
    available: descriptor.available,
    ...(descriptor.rejection ? { rejection: descriptor.rejection } : {}),
    worldRevision: input.world.revision,
  });
  const request: FeasibilityRequest = {
    id: `precondition:${constraintArtifact.digest}`,
    expectedWorldRevision: input.world.revision,
    actionId: binding.actionId,
    bindings: binding.bindings,
  };
  const semanticTree = resolvedTree(input);
  return {
    route: "CONSTRAINT_CHECK",
    world: input.world,
    semanticTree,
    program: programFor({
      route: "CONSTRAINT_CHECK",
      operator: "CHECK_PRECONDITION",
      datum: literal(cloneCognitive(request) as unknown as CognitiveValue),
      semanticTree,
      world: input.world,
      realize: true,
    }),
    constraintArtifact,
  };
};

const planningRoute = (input: {
  surface: SurfaceAst;
  world: CognitiveWorldSnapshot;
  request: AvaInstructionRequestIR;
  state: GameState;
  stagedActions: readonly AvaActionRef[];
  entities: readonly AvaEntity[];
  discourse: AvaDiscourseState;
  opportunityFraction: number;
  domain: CompiledCognitiveDomain;
}): CompiledRoute => {
  const semanticTree = resolvedTree({
    ...input,
    authorityCeiling: "PLAN_ONLY",
  });
  const actionIds: string[] = [];
  const privateActionBindingDigests: string[] = [];
  const actions: BuildPlanRequest["actions"] = input.stagedActions.map(
    (action, index): PlannedActionRequest => {
      const descriptor = descriptorForAction(
        input.state,
        action,
        input.opportunityFraction,
      );
      if (!descriptor?.available)
        throw new Error(
          descriptor?.rejection ?? "staged action left the disclosed docket",
        );
      if (canonicalJson(descriptor.action) !== canonicalJson(action))
        throw new Error(
          "staged action payload is stale or differs from the disclosed docket",
        );
      actionIds.push(descriptor.id);
      privateActionBindingDigests.push(
        cognitiveDigest({
          binding: "AVA_PRIVATE_PLANNED_ACTION_V1",
          action,
        }),
      );
      const id = `staged-${String(index + 1).padStart(3, "0")}`;
      const binding = cognitiveActionBindingForDescriptor(descriptor);
      return {
        id,
        ...binding,
        dependsOn: index ? [`staged-${String(index).padStart(3, "0")}`] : [],
      };
    },
  );
  const request: BuildPlanRequest = {
    kind: "BUILD_PLAN",
    id: `plan:${cognitiveDigest({
      worldRevision: input.world.revision,
      actionIds,
    })}`,
    expectedWorldRevision: input.world.revision,
    scenarioId: `scenario:plan:${cognitiveDigest(actionIds)}`,
    actions,
  };
  return {
    route: "PLAN_VALIDATION",
    world: input.world,
    semanticTree,
    program: programFor({
      route: "PLAN_VALIDATION",
      operator: "BUILD_PLAN",
      datum: literal(
        cloneCognitive(request) as unknown as CognitiveValue,
        [],
        "PLAN_ONLY",
      ),
      semanticTree,
      world: input.world,
      authorityCeiling: "PLAN_ONLY",
      realize: true,
    }),
    plannedActionIds: actionIds,
    privatePlannedActionBindingDigests: privateActionBindingDigests,
  };
};

const compileRoute = (
  input: AvaCognitiveNexusInput,
  domain = DELENDA_COGNITIVE_DOMAIN,
): CompiledRoute => {
  const surface = surfaceFor(input.request, domain);
  const disclosedState = projectAvaDisclosedState(input.state);
  const baseWorld = projectAvaVisibleWorld(
    worldSnapshotFromGameState(
      input.state,
      avaVisibleWorldRevision(input.state, domain),
      domain,
    ),
    domain,
  );
  const common = {
    surface,
    world: baseWorld,
    request: input.request,
    entities: input.visibleEntities,
    discourse: input.discourse,
    domain,
    state: disclosedState,
    stagedActions: input.stagedActions ?? [],
    opportunityFraction: input.opportunityFraction,
  };
  const causalVariableId = exactCausalDiagnosticVariable(
    input.request,
    domain,
  );
  if (causalVariableId)
    return causalRoute({
      ...common,
      variableId: causalVariableId,
    });
  const epistemicVariableId = exactEpistemicBoundVariable(
    input.request,
    domain,
  );
  if (epistemicVariableId)
    return epistemicRoute({
      ...common,
      variableId: epistemicVariableId,
    });
  const constraintTarget = explicitConstraintTarget(
    input.request,
    input.visibleEntities,
  );
  if (constraintTarget)
    return constraintRoute({ ...common, entity: constraintTarget });
  if (
    [
      "SHOW_PLAN",
      "ISSUE",
      "ISSUE_PLAN",
      "SELECT",
      "STAGE",
      "RESOLVE_DAY",
    ].includes(
      input.request.instruction.kind,
    ) &&
    (input.stagedActions?.length ?? 0) > 0
  )
    return planningRoute(common);
  if (
    input.request.semantic.operation === "PREDICT" &&
    input.request.semantic.subject.type === "CAMPAIGN_CHOICE"
  )
    return temporalRoute(common);
  if (
    ["ADVISE", "RANK", "RECOMMEND"].includes(
      input.request.semantic.operation,
    ) &&
    input.request.semantic.subject.type === "DIRECTIVE"
  )
    return directiveDecisionRoute({
      ...common,
      baseWorld,
    });
  if (
    ["ADVISE", "COMPARE", "RANK", "RECOMMEND"].includes(
      input.request.semantic.operation,
    ) &&
    input.request.semantic.subject.type === "CAMPAIGN_CHOICE"
  ) {
    const decision = decisionRoute({
      ...common,
      baseWorld,
    });
    if (decision) return decision;
  }
  return genericRoute(common);
};

const activationReceipt = (
  result: CognitiveProgramResult,
  program: CognitiveProgram,
  domain: CompiledCognitiveDomain,
): AvaCognitiveActivationReceipt => {
  const operatorFamilies = [
    ...new Set(
      result.executions.map((execution) => {
        const specification = COGNITIVE_OPERATOR_REGISTRY.get(
          execution.operator,
        );
        if (!specification)
          throw new Error(`operator ${execution.operator} left the registry`);
        return specification.category;
      }),
    ),
  ].sort();
  const body: Omit<AvaCognitiveActivationReceipt, "digest"> = {
    runtime: "AVA_COGNITIVE_NEXUS",
    version: "1",
    status: result.status,
    authority: program.authorityCeiling,
    operatorFamilies,
    domainId: domain.id,
    domainVersion: domain.version,
    domainDigest: domain.digest,
  };
  return Object.freeze({
    ...body,
    operatorFamilies: Object.freeze([...operatorFamilies]),
    digest: cognitiveDigest(body),
  });
};

export const runAvaCognitiveNexus = (
  input: AvaCognitiveNexusInput,
): AvaCognitiveNexusResult => {
  try {
    const compiled = compileRoute(input);
    const result = executeCognitiveProgram(compiled.program, {
      domain: DELENDA_COGNITIVE_DOMAIN,
      world: compiled.world,
      semanticTree: compiled.semanticTree,
      adapters: AVA_COGNITIVE_ENGINE_ADAPTERS,
    });
    if (result.status !== "COMPLETED")
      throw new Error(result.blocker ?? `cognitive program ${result.status}`);
    const proofGraph = buildOperatorProofGraph({
      program: compiled.program,
      result,
      world: compiled.world,
    });
    const validation = validateCanonicalProofGraph(proofGraph);
    if (!validation.ok)
      throw new Error(`invalid cognitive proof: ${validation.issues.join("; ")}`);
    return {
      status: "EXECUTED",
      route: compiled.route,
      result,
      proofGraph,
      explanation: selectProofExplanation(proofGraph, "OPERATIONAL"),
      cognitiveActivation: activationReceipt(
        result,
        compiled.program,
        DELENDA_COGNITIVE_DOMAIN,
      ),
      ...(compiled.constraintArtifact
        ? { constraintArtifact: compiled.constraintArtifact }
        : {}),
      ...(compiled.forecastArtifact
        ? { forecastArtifact: compiled.forecastArtifact }
        : {}),
      ...(compiled.causalArtifact
        ? { causalArtifact: compiled.causalArtifact }
        : {}),
      ...(compiled.epistemicArtifact
        ? { epistemicArtifact: compiled.epistemicArtifact }
        : {}),
      ...(compiled.directiveDecisionArtifact
        ? {
            directiveDecisionArtifact:
              compiled.directiveDecisionArtifact,
          }
        : {}),
      ...(compiled.plannedActionIds
        ? { plannedActionIds: Object.freeze([...compiled.plannedActionIds]) }
        : {}),
      ...(compiled.privatePlannedActionBindingDigests
        ? {
            privatePlannedActionBindingDigests: Object.freeze([
              ...compiled.privatePlannedActionBindingDigests,
            ]),
          }
        : {}),
    };
  } catch (error) {
    return {
      status: "REJECTED",
      code: "COGNITIVE_NEXUS_PIPELINE_REJECTED",
      reason: error instanceof Error ? error.message : String(error),
    };
  }
};

const realizedValueFor = (
  execution: AvaCognitiveNexusExecution,
): CognitiveValue | undefined => {
  if (execution.result.output?.kind !== "RECORD")
    return execution.result.output?.value;
  const candidate = execution.result.output.value;
  if (
    !candidate ||
    typeof candidate !== "object" ||
    Array.isArray(candidate) ||
    candidate.kind !== "AVA_RESULT_BINDING"
  )
    return candidate;
  const binding = cloneCognitive(
    candidate,
  ) as unknown as CognitiveRealizationBinding;
  const source = execution.result.executions.find(
    (item) => item.nodeId === "nexus-cognitive-output",
  )?.datum;
  if (!source)
    throw new Error("cognitive realization omitted its upstream execution");
  validateCognitiveRealizationBinding({
    binding,
    source,
    worldRevision: execution.result.worldRevision,
    semanticTreeDigest: execution.proofGraph.semanticDigest,
  });
  return cloneCognitive(binding.value);
};

export const cognitiveConstraintGuidanceFor = (
  execution: AvaCognitiveNexusExecution,
): AvaCognitiveConstraintGuidance | undefined => {
  if (
    execution.route !== "CONSTRAINT_CHECK" ||
    !execution.constraintArtifact
  )
    return undefined;
  const { digest: artifactDigest, ...artifactBody } =
    execution.constraintArtifact;
  if (artifactDigest !== cognitiveDigest(artifactBody))
    throw new Error("cognitive constraint artifact digest is invalid");
  const boundTarget = String(
    execution.constraintArtifact.bindings.actionId ??
      execution.constraintArtifact.bindings.subject ??
      "",
  );
  if (boundTarget !== execution.constraintArtifact.targetId)
    throw new Error("cognitive constraint target is not bound to its action");
  const feasibility = cloneCognitive(
    realizedValueFor(execution),
  ) as unknown as FeasibilityResult;
  const { digest, ...body } = feasibility;
  if (digest !== cognitiveDigest(body))
    throw new Error("cognitive constraint guidance digest is invalid");
  const engineExecution = execution.result.executions.find(
    (item) => item.nodeId === "nexus-cognitive-output",
  );
  if (
    engineExecution?.operator !== "CHECK_PRECONDITION" ||
    engineExecution.status !== "COMPLETED" ||
    feasibility.requestId !==
      `precondition:${execution.constraintArtifact.digest}` ||
    feasibility.worldRevision !== execution.result.worldRevision ||
    feasibility.worldRevision !== execution.constraintArtifact.worldRevision ||
    execution.result.output?.authority !== "READ_ONLY"
  )
    throw new Error(
      "cognitive constraint result is not bound to its precondition request",
    );
  return Object.freeze({
    executionDigest: execution.result.digest,
    feasibility: Object.freeze(feasibility),
    artifact: execution.constraintArtifact,
  });
};

export const cognitiveDecisionGuidanceFor = (
  execution: AvaCognitiveNexusExecution,
): AvaCognitiveDecisionGuidance | undefined => {
  if (
    execution.route !== "CAMPAIGN_DECISION" &&
    execution.route !== "DIRECTIVE_DECISION"
  )
    return undefined;
  const decision = cloneCognitive(
    realizedValueFor(execution),
  ) as unknown as DecisionResult;
  const { digest, ...body } = decision;
  if (digest !== cognitiveDigest(body))
    throw new Error("cognitive decision guidance digest is invalid");
  if (!decision.winnerId || decision.ranking[0] !== decision.winnerId)
    throw new Error("cognitive decision guidance has no canonical winner");
  const winner = decision.candidates.find(
    (candidate) => candidate.candidateId === decision.winnerId,
  );
  const directiveArtifact = execution.directiveDecisionArtifact
    ? cloneCognitive(
        execution.directiveDecisionArtifact,
      ) as unknown as AvaCognitiveDirectiveDecisionArtifact
    : undefined;
  if (execution.route === "DIRECTIVE_DECISION") {
    if (!directiveArtifact)
      throw new Error("cognitive directive decision omitted its artifact");
    const { digest: artifactDigest, ...artifactBody } = directiveArtifact;
    if (artifactDigest !== cognitiveDigest(artifactBody))
      throw new Error("cognitive directive decision artifact digest is invalid");
    if (
      directiveArtifact.modelId !== DIRECTIVE_DECISION_MODEL_ID ||
      directiveArtifact.worldRevision !== decision.worldRevision ||
      decision.modelId !== directiveArtifact.modelId ||
      decision.scenarioId !==
        `scenario:directive:${directiveArtifact.digest}`
    )
      throw new Error("cognitive directive decision crossed its compiled scope");
    const evaluations = new Map(
      directiveArtifact.evaluations.map((evaluation) => [
        evaluation.choiceId,
        evaluation,
      ]),
    );
    if (
      evaluations.size !== directiveArtifact.evaluations.length ||
      canonicalJson([...evaluations.keys()].sort()) !==
        canonicalJson([...decision.ranking].sort())
    )
      throw new Error("cognitive directive decision changed its visible docket");
    for (const candidate of decision.candidates) {
      const evaluation = evaluations.get(candidate.candidateId);
      if (
        !evaluation ||
        !candidate.feasible ||
        candidate.hardObjectivesSatisfied !== evaluation.legal
      )
        throw new Error(
          "cognitive directive decision changed candidate eligibility",
        );
      const rawMetric = (metricId: string) => {
        const metric = candidate.metrics.find(
          (item) => item.metricId === metricId,
        );
        if (!metric || metric.raw.low !== metric.raw.high)
          throw new Error(
            `cognitive directive metric ${metricId} is not exact`,
          );
        return metric.raw.low;
      };
      if (rawMetric("directive-legal") !== (evaluation.legal ? 1 : 0))
        throw new Error("cognitive directive legal metric was forged");
      for (const component of DIRECTIVE_DECISION_COMPONENTS)
        if (
          rawMetric(component.metricId) !==
          evaluation.components[component.key]
        )
          throw new Error(
            `cognitive directive metric ${component.metricId} was forged`,
          );
    }
    const legalCandidates = decision.candidates.filter(
      (candidate) => candidate.feasible && candidate.hardObjectivesSatisfied,
    );
    if (legalCandidates.length && !winner?.hardObjectivesSatisfied)
      throw new Error("cognitive directive decision ignored a legal candidate");
  } else if (!winner?.feasible || !winner.hardObjectivesSatisfied)
    throw new Error("cognitive decision guidance has no feasible winner");
  return Object.freeze({
    executionDigest: execution.result.digest,
    decision: Object.freeze(decision),
    ...(directiveArtifact
      ? { directiveArtifact: Object.freeze(directiveArtifact) }
      : {}),
  });
};

export const cognitiveForecastGuidanceFor = (
  execution: AvaCognitiveNexusExecution,
): AvaCognitiveForecastGuidance | undefined => {
  if (
    execution.route !== "TEMPORAL_ENVELOPE" ||
    !execution.forecastArtifact
  )
    return undefined;
  const temporal = cloneCognitive(
    realizedValueFor(execution),
  ) as unknown as TemporalResult;
  const { digest: temporalDigest, ...temporalBody } = temporal;
  if (temporalDigest !== cognitiveDigest(temporalBody))
    throw new Error("cognitive temporal guidance digest is invalid");
  const { digest: artifactDigest, ...artifactBody } =
    execution.forecastArtifact;
  if (artifactDigest !== cognitiveDigest(artifactBody))
    throw new Error("cognitive forecast artifact digest is invalid");
  if (
    temporal.status !== "FORECAST_ENVELOPE" ||
    !temporal.forecast ||
    temporal.worldRevision !== execution.forecastArtifact.worldRevision ||
    temporal.forecast.horizonId !== execution.forecastArtifact.horizonId ||
    !temporal.forecast.assumptions.includes(
      `projection:${execution.forecastArtifact.digest}`,
    )
  )
    throw new Error("cognitive forecast is not bound to its disclosed projection");
  return Object.freeze({
    executionDigest: execution.result.digest,
    temporal: Object.freeze(temporal),
    artifact: execution.forecastArtifact,
  });
};

export const cognitiveCausalGuidanceFor = (
  execution: AvaCognitiveNexusExecution,
): AvaCognitiveCausalGuidance | undefined => {
  if (execution.route !== "CAUSAL_DIAGNOSIS" || !execution.causalArtifact)
    return undefined;
  const { digest: artifactDigest, ...artifactBody } = execution.causalArtifact;
  if (artifactDigest !== cognitiveDigest(artifactBody))
    throw new Error("cognitive causal artifact digest is invalid");
  const causal = cloneCognitive(
    realizedValueFor(execution),
  ) as unknown as CausalResult;
  const { digest, ...body } = causal;
  if (digest !== cognitiveDigest(body))
    throw new Error("cognitive causal guidance digest is invalid");
  const engineExecution = execution.result.executions.find(
    (item) => item.nodeId === "nexus-cognitive-output",
  );
  if (
    engineExecution?.operator !== "FIND_CAUSE" ||
    engineExecution.status !== "COMPLETED" ||
    causal.requestId !== `cause:${execution.causalArtifact.digest}` ||
    causal.worldRevision !== execution.result.worldRevision ||
    causal.worldRevision !== execution.causalArtifact.worldRevision ||
    (causal.status !== "CANDIDATES_ONLY" && causal.status !== "UNEXPLAINED") ||
    causal.causeVariableIds.length !== 0 ||
    causal.changes.length !== 0 ||
    canonicalJson(causal.responsibleFactIds) !==
      canonicalJson(execution.causalArtifact.observationFactIds) ||
    !causal.proofIds.includes("observation-is-not-identification") ||
    execution.causalArtifact.identification !==
      "OBSERVATION_ONLY_NO_INTERVENTION" ||
    execution.result.output?.authority !== "READ_ONLY"
  )
    throw new Error(
      "cognitive causal result is not bound to an observational diagnosis",
    );
  return Object.freeze({
    executionDigest: execution.result.digest,
    causal: Object.freeze(causal),
    artifact: execution.causalArtifact,
  });
};

export const cognitiveEpistemicGuidanceFor = (
  execution: AvaCognitiveNexusExecution,
): AvaCognitiveEpistemicGuidance | undefined => {
  if (execution.route !== "EVIDENCE_BOUND" || !execution.epistemicArtifact)
    return undefined;
  const { digest: artifactDigest, ...artifactBody } =
    execution.epistemicArtifact;
  if (artifactDigest !== cognitiveDigest(artifactBody))
    throw new Error("cognitive epistemic artifact digest is invalid");
  const epistemic = cloneCognitive(
    realizedValueFor(execution),
  ) as unknown as EpistemicResult;
  const { digest, ...body } = epistemic;
  if (digest !== cognitiveDigest(body))
    throw new Error("cognitive epistemic guidance digest is invalid");
  const engineExecution = execution.result.executions.find(
    (item) => item.nodeId === "nexus-cognitive-output",
  );
  const oneRecord = [execution.epistemicArtifact.factId];
  if (
    engineExecution?.operator !== "BOUND" ||
    engineExecution.status !== "COMPLETED" ||
    epistemic.requestId !== `bound:${execution.epistemicArtifact.digest}` ||
    epistemic.kind !== "BOUND" ||
    epistemic.status !== "BOUNDED" ||
    epistemic.variableId !== execution.epistemicArtifact.variableId ||
    epistemic.worldRevision !== execution.result.worldRevision ||
    epistemic.worldRevision !== execution.epistemicArtifact.worldRevision ||
    canonicalJson(epistemic.supportFactIds) !== canonicalJson(oneRecord) ||
    canonicalJson(epistemic.independentRecordIds) !== canonicalJson(oneRecord) ||
    canonicalJson(epistemic.responsibleFactIds) !== canonicalJson(oneRecord) ||
    epistemic.refutationFactIds.length !== 0 ||
    epistemic.confidence !== execution.epistemicArtifact.sourceReliability ||
    !epistemic.interval ||
    typeof epistemic.value !== "number" ||
    epistemic.value < epistemic.interval.low ||
    epistemic.value > epistemic.interval.high ||
    !epistemic.proofIds.includes("estimate-replay") ||
    !epistemic.proofIds.includes("evidence-bound") ||
    execution.epistemicArtifact.recordCount !== 1 ||
    execution.epistemicArtifact.interpretation !==
      "EVIDENCE_BOUND_NOT_CORROBORATION" ||
    execution.result.output?.authority !== "READ_ONLY"
  )
    throw new Error(
      "cognitive epistemic result is not bound to one authoritative record",
    );
  return Object.freeze({
    executionDigest: execution.result.digest,
    epistemic: Object.freeze(epistemic),
    artifact: execution.epistemicArtifact,
  });
};

export const cognitivePlanningGuidanceFor = (
  execution: AvaCognitiveNexusExecution,
  expected?: {
    actionIds: readonly string[];
    worldRevision: string;
    actions?: readonly AvaActionRef[];
  },
): AvaCognitivePlanningGuidance | undefined => {
  if (
    execution.route !== "PLAN_VALIDATION" ||
    !execution.plannedActionIds
  )
    return undefined;
  const planning = cloneCognitive(
    realizedValueFor(execution),
  ) as unknown as PlanningResult;
  const { digest, ...body } = planning;
  if (digest !== cognitiveDigest(body))
    throw new Error("cognitive planning guidance digest is invalid");
  const plannedActionIds = planning.actions.map((action) =>
    String(action.bindings.actionId ?? action.bindings.subject ?? ""),
  );
  if (
    planning.authority !== "PLAN_ONLY_NO_MUTATION" ||
    planning.worldRevision !== execution.result.worldRevision ||
    execution.result.output?.authority !== "PLAN_ONLY" ||
    (planning.status !== "PLANNED" && planning.status !== "BLOCKED") ||
    (planning.status === "PLANNED" && planning.blockers.length > 0) ||
    (planning.status === "BLOCKED" && planning.blockers.length === 0) ||
    canonicalJson(plannedActionIds) !== canonicalJson(execution.plannedActionIds)
  )
    throw new Error("cognitive plan is not bound to the staged action graph");
  if (
    expected &&
    (planning.worldRevision !== expected.worldRevision ||
      canonicalJson(plannedActionIds) !== canonicalJson(expected.actionIds))
  )
    throw new Error("cognitive plan is stale or bound to different actions");
  if (expected?.actions) {
    const expectedBindingDigests = expected.actions.map((action) =>
      cognitiveDigest({
        binding: "AVA_PRIVATE_PLANNED_ACTION_V1",
        action,
      }),
    );
    if (
      !execution.privatePlannedActionBindingDigests ||
      canonicalJson(execution.privatePlannedActionBindingDigests) !==
        canonicalJson(expectedBindingDigests)
    )
      throw new Error(
        "cognitive plan is stale or bound to different action payloads",
      );
  }
  return Object.freeze({
    executionDigest: execution.result.digest,
    planning: Object.freeze(planning),
    actionIds: Object.freeze([...execution.plannedActionIds]),
  });
};

export const cognitiveSemanticGuidanceFor = (
  execution: AvaCognitiveNexusExecution,
): AvaCognitiveSemanticGuidance | undefined => {
  if (execution.route !== "SEMANTIC_BINDING") return undefined;
  const realized = execution.result.executions.some(
    (item) =>
      item.nodeId === "nexus-cognitive-realization" &&
      item.operator === "EXPLAIN" &&
      item.status === "COMPLETED",
  );
  if (!realized) return undefined;
  const semantic = cloneCognitive(
    realizedValueFor(execution),
  ) as unknown as AvaSemanticQuery;
  return Object.freeze({
    executionDigest: execution.result.digest,
    semantic: Object.freeze(semantic),
  });
};
