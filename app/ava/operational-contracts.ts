import type { AvaCompilerTrace, AvaEntity, AvaInstruction, AvaSemanticQuery } from "./schema";
import type { CognitiveValue } from "./cognitive-types";

export const AVA_OPERATIONAL_SEMANTICS_VERSION =
  "ava-operational-semantics/v1" as const;

export type AvaOperationalStatus =
  | "AVAILABLE"
  | "PARTIAL"
  | "UNAVAILABLE"
  | "AMBIGUOUS";

export type AvaOperationalAvailability =
  | "AVAILABLE"
  | "UNAVAILABLE"
  | "SEALED"
  | "AMBIGUOUS"
  | "NOT_PRESENT";

export type AvaOperationalProvenance = {
  sourcePath: string;
  field: string;
  sourceIds: readonly string[];
  sourceOrder?: number;
};

export type AvaOperationalTypedInput = {
  id: string;
  value: CognitiveValue;
  unit?: string;
  availability: AvaOperationalAvailability;
  provenance: readonly AvaOperationalProvenance[];
};

export type AvaOperationalDerivedValue = {
  id: string;
  value: CognitiveValue;
  unit?: string;
  provenance: readonly AvaOperationalProvenance[];
};

export type AvaOperationalEquation = {
  id: string;
  kind: "NORMALIZATION" | "UTILITY" | "RANKING" | "PROJECTION";
  definition: CognitiveValue;
  sourcePath: string;
  inputIds: readonly string[];
  outputIds: readonly string[];
};

export type AvaOperationalRule = {
  id: string;
  order: number;
  fired: boolean;
  definition: string;
  sourcePath: string;
  provenance: readonly AvaOperationalProvenance[];
};

export type AvaOperationalOption = {
  id: string;
  label?: string;
  kind?: AvaEntity["kind"];
  availability: AvaOperationalAvailability;
  orderCost?: number;
  provenance: readonly AvaOperationalProvenance[];
};

export type AvaOperationalAlternative = {
  optionId: string;
  status: "VISIBLE_ALTERNATIVE";
  reason: string;
  provenance: readonly AvaOperationalProvenance[];
};

export type AvaOperationalUncertainty = {
  id: string;
  kind: "INTERVAL" | "CATEGORICAL" | "UNAVAILABLE";
  value: CognitiveValue;
  unit?: string;
  provenance: readonly AvaOperationalProvenance[];
};

export type AvaOperationalUnavailableEvidence = {
  id: string;
  reason: string;
  status: "UNAVAILABLE" | "SEALED" | "NOT_PRESENT";
  provenance?: readonly AvaOperationalProvenance[];
};

export type AvaOperationalCoupling = {
  id: string;
  sourceId?: string;
  targetId?: string;
  relation: "COUPLED_ORDER";
  status: "AVAILABLE" | "UNAVAILABLE";
  provenance: readonly AvaOperationalProvenance[];
  reason?: string;
};

export type AvaOperationalCalculus = {
  kind: "CANONICAL_CALCULUS";
  identity: string;
  revision: string;
  sourceInputs: readonly AvaOperationalTypedInput[];
  derivedValues: readonly AvaOperationalDerivedValue[];
  equations: readonly AvaOperationalEquation[];
  rules: readonly AvaOperationalRule[];
  optionEnvelope: readonly AvaOperationalOption[];
  alternatives: readonly AvaOperationalAlternative[];
  uncertainties: readonly AvaOperationalUncertainty[];
  coupledOrders: readonly AvaOperationalCoupling[];
  unavailableEvidence: readonly AvaOperationalUnavailableEvidence[];
  provenance: readonly AvaOperationalProvenance[];
  boundaries: readonly string[];
  digest: string;
};

export type AvaOperationalObjective = {
  id: string;
  label: string;
  question: string;
  target: string;
  problemClass: string;
  sector: string;
  provenance: readonly AvaOperationalProvenance[];
};

export type AvaOperationalPriorityAxis = {
  id: string;
  label: string;
  source: "SEMANTIC_QUERY" | "CONTEXTUAL_CATALOG";
};

export type AvaOperationalRecommendation = {
  optionId: string;
  label?: string;
  authority: "COMPILED_DECISION_WINNER";
  provenance: readonly AvaOperationalProvenance[];
};

export type AvaOperationalAdvice = {
  kind: "TYPED_ADVICE";
  status: "AVAILABLE" | "PARTIAL" | "UNAVAILABLE";
  objective: AvaOperationalObjective;
  priorityAxes: readonly AvaOperationalPriorityAxis[];
  recommendation: AvaOperationalRecommendation;
  operationalContext: {
    situationId: string;
    contentRevision: string;
    disclosedBands: CognitiveValue;
    provenance: readonly AvaOperationalProvenance[];
  };
  visibleInputs: readonly AvaOperationalTypedInput[];
  options: readonly AvaOperationalOption[];
  alternatives: readonly AvaOperationalAlternative[];
  uncertainties: readonly AvaOperationalUncertainty[];
  coupledOrders: readonly AvaOperationalCoupling[];
  equations: readonly AvaOperationalEquation[];
  rules: readonly AvaOperationalRule[];
  limitations: readonly AvaOperationalUnavailableEvidence[];
  calculusDigest?: string;
  digest: string;
};

export type AvaOperationalForecast = {
  kind: "TYPED_FORECAST";
  status: AvaOperationalAvailability;
  targetId: string;
  horizonId: string;
  assumptions: readonly string[];
  projection?: CognitiveValue;
  changes: readonly AvaOperationalDerivedValue[];
  confidence?: AvaOperationalDerivedValue;
  limitations: readonly AvaOperationalUnavailableEvidence[];
  calculusDigest: string;
  digest: string;
};

export type AvaComparisonDimensionStatus =
  | "COMPARABLE"
  | "NOT_COMPARABLE"
  | "UNAVAILABLE"
  | "AMBIGUOUS";

export type AvaOperationalManeuverIdentity = {
  id: string;
  label: string;
  rationale?: string;
  presentationId?: string;
  sourceOrder?: number;
  provenance: readonly AvaOperationalProvenance[];
};

export type AvaOperationalComparisonValue = {
  value?: CognitiveValue;
  unit?: string;
  provenance: readonly AvaOperationalProvenance[];
};

export type AvaOperationalComparisonDimension = {
  id: string;
  status: AvaComparisonDimensionStatus;
  semanticDomain: string;
  unit?: string;
  direction:
    | "HIGHER_IS_BETTER"
    | "LOWER_IS_BETTER"
    | "CONTEXT_DEPENDENT"
    | "UNSPECIFIED";
  left: AvaOperationalComparisonValue;
  right: AvaOperationalComparisonValue;
  ruleId?: string;
  sourcePath?: string;
  note?: string;
};

export type AvaOperationalComparison = {
  kind: "PAIRWISE_MANEUVER_COMPARISON";
  status: "AVAILABLE" | "UNAVAILABLE" | "AMBIGUOUS" | "NOT_COMPARABLE";
  left: AvaOperationalManeuverIdentity;
  right: AvaOperationalManeuverIdentity;
  sharedContext: {
    situationId: string;
    sector: string;
    stateRevision: string;
    contentRevision: string;
    calculusRevision: string;
  };
  dimensions: readonly AvaOperationalComparisonDimension[];
  verdict?: "TRADEOFF" | "BALANCED" | "INSUFFICIENT_EVIDENCE" | "NOT_COMPARABLE";
  winner?: never;
  authoredEvidence: readonly string[];
  limitations: readonly AvaOperationalUnavailableEvidence[];
  digest: string;
};

export type AvaOperationalRelationship = {
  sourceId: string;
  targetId: string;
  relation: "RELATED_CONCEPT" | "CURRENT_VISIBLE_MANEUVER";
  direction: "SOURCE_TO_TARGET";
  joinKey: string;
  sourceOrder?: number;
  evidence: readonly AvaOperationalProvenance[];
  currentRevision: string;
  readOnly: true;
};

export type AvaOperationalRelationships = {
  kind: "TYPED_OPERATIONAL_RELATIONSHIPS";
  status: "AVAILABLE" | "NOT_PRESENT" | "AMBIGUOUS" | "UNAVAILABLE";
  entityIds: readonly string[];
  relationships: readonly AvaOperationalRelationship[];
  limitations: readonly AvaOperationalUnavailableEvidence[];
  bounds: {
    maxEntities: number;
    maxRelationships: number;
    maxEvidenceFragmentsPerRelationship: number;
  };
  digest: string;
};

export type AvaOperationalSemanticResult = {
  version: typeof AVA_OPERATIONAL_SEMANTICS_VERSION;
  status: AvaOperationalStatus;
  operation: AvaSemanticQuery["operation"];
  subject: AvaSemanticQuery["subject"];
  instructionKind: AvaInstruction["kind"];
  stateRevision: string;
  contentRevision: string;
  authority: "READ_ONLY";
  mutation: false;
  calculus?: AvaOperationalCalculus;
  advice?: AvaOperationalAdvice;
  forecast?: AvaOperationalForecast;
  comparison?: AvaOperationalComparison;
  relationships?: AvaOperationalRelationships;
  authoredEvidenceIds: readonly string[];
  unavailableEvidence: readonly AvaOperationalUnavailableEvidence[];
  digest: string;
};

export type AvaOperationalProjectionInput = {
  state: import("../game").GameState;
  opportunityFraction?: number;
  query: AvaSemanticQuery;
  instruction: AvaInstruction;
  trace?: AvaCompilerTrace;
  cognitiveGuidance?: import("./cognitive-nexus").AvaCognitiveDecisionGuidance;
  cognitiveForecast?: import("./cognitive-nexus").AvaCognitiveForecastGuidance;
};
