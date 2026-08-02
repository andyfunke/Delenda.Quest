import type { CognitiveValue } from "./cognitive-types";
import type {
  AvaOperationalAdvice,
  AvaOperationalCalculus,
  AvaOperationalComparison,
  AvaOperationalForecast,
  AvaOperationalRelationships,
  AvaOperationalSemanticResult,
  AvaOperationalUnavailableEvidence,
} from "./operational-contracts";

const valueText = (value: CognitiveValue | undefined): string => {
  if (value === undefined) return "UNAVAILABLE";
  if (value === null) return "NULL";
  if (typeof value === "string") return value;
  if (typeof value === "number") return Number.isInteger(value) ? `${value}` : value.toFixed(3);
  if (typeof value === "boolean") return value ? "YES" : "NO";
  if (Array.isArray(value)) return value.map(valueText).join(", ");
  if (value.kind === "INTERVAL" && typeof value.low === "number" && typeof value.high === "number")
    return value.low === value.high
      ? valueText(value.low)
      : `${valueText(value.low)} to ${valueText(value.high)}`;
  return Object.entries(value)
    .map(([key, child]) => `${key}=${valueText(child)}`)
    .join(", ");
};

const limitationLines = (limitations: readonly AvaOperationalUnavailableEvidence[]) =>
  limitations.length
    ? [
        "LIMITATIONS",
        ...limitations.map((limitation) =>
          `- ${limitation.id}: ${limitation.reason} [${limitation.status}]`,
        ),
      ]
    : [];

const calculusLines = (calculus: AvaOperationalCalculus): string[] => [
  `CALCULUS: ${calculus.identity} / ${calculus.revision}`,
  `CALCULUS DIGEST: ${calculus.digest}`,
  `EQUATIONS: ${calculus.equations.map((equation) => equation.id).join(", ") || "NONE"}`,
  `RULES: ${calculus.rules.map((rule) => `${rule.order + 1}:${rule.id}`).join(", ") || "NONE"}`,
  `UNCERTAINTIES: ${calculus.uncertainties.map((uncertainty) => `${uncertainty.id}=${valueText(uncertainty.value)}`).join(", ") || "NONE"}`,
  `BOUNDARIES: ${calculus.boundaries.join(", ")}`,
];

const renderAdvice = (advice: AvaOperationalAdvice, calculus?: AvaOperationalCalculus) => [
  "JUDGMENT / TYPED ADVICE",
  `OBJECTIVE: ${advice.objective.label}`,
  `QUESTION: ${advice.objective.question}`,
  `TARGET: ${advice.objective.target} · SECTOR: ${advice.objective.sector}`,
  `PRIORITY AXES: ${advice.priorityAxes.map((axis) => axis.label).join(" + ") || "OVERALL VALUE"}`,
  `RECOMMENDATION: [${advice.recommendation.optionId}] ${advice.recommendation.label ?? "visible compiled winner"}`,
  `OPTIONS: ${advice.options.map((option) => `[${option.id}] ${option.label ?? option.id} (${option.availability})`).join(" · ")}`,
  `ALTERNATIVES: ${advice.alternatives.map((alternative) => `[${alternative.optionId}] ${alternative.reason}`).join(" · ") || "NONE"}`,
  `OPERATIONAL BANDS: ${valueText(advice.operationalContext.disclosedBands)}`,
  ...(calculus ? calculusLines(calculus) : []),
  ...limitationLines(advice.limitations),
  "AUTHORITY: READ_ONLY · NO ORDER PREPARED OR ISSUED",
];

const renderForecast = (forecast: AvaOperationalForecast, calculus?: AvaOperationalCalculus) => [
  "FORECAST / DISCLOSED PROJECTION",
  `TARGET: ${forecast.targetId} · HORIZON: ${forecast.horizonId} · STATUS: ${forecast.status}`,
  `PROJECTION: ${valueText(forecast.projection)}`,
  `CHANGES: ${forecast.changes.map((change) => `${change.id}=${valueText(change.value)}`).join(" · ") || "NONE"}`,
  `CONFIDENCE: ${valueText(forecast.confidence?.value)}`,
  `ASSUMPTIONS: ${forecast.assumptions.join(" · ") || "NONE"}`,
  ...(calculus ? calculusLines(calculus) : [`CALCULUS DIGEST: ${forecast.calculusDigest}`]),
  ...limitationLines(forecast.limitations),
  "AUTHORITY: READ_ONLY · OUTCOME REMAINS UNBOUND",
];

const renderComparison = (comparison: AvaOperationalComparison) => [
  "MANEUVER COMPARISON / BOUNDED EVIDENCE",
  `LEFT: [${comparison.left.id}] ${comparison.left.label}${comparison.left.rationale ? ` — ${comparison.left.rationale}` : ""}`,
  `RIGHT: [${comparison.right.id}] ${comparison.right.label}${comparison.right.rationale ? ` — ${comparison.right.rationale}` : ""}`,
  `CONTEXT: ${comparison.sharedContext.situationId} · ${comparison.sharedContext.sector} · STATE ${comparison.sharedContext.stateRevision}`,
  "DIMENSIONS",
  ...comparison.dimensions.map((dimension) =>
    `- ${dimension.id}: ${dimension.status}; left=${valueText(dimension.left.value)}; right=${valueText(dimension.right.value)}; direction=${dimension.direction}${dimension.unit ? `; unit=${dimension.unit}` : ""}`,
  ),
  `VERDICT: ${comparison.verdict ?? "NOT_COMPARABLE"}`,
  ...limitationLines(comparison.limitations),
  "AUTHORITY: READ_ONLY · NO WINNER SELECTED · NO ORDER ISSUED",
];

const renderRelationships = (relationships: AvaOperationalRelationships) => [
  "OPERATIONAL RELATIONSHIPS / DECLARED EDGES",
  `ENTITIES: ${relationships.entityIds.join(", ") || "NONE"} · STATUS: ${relationships.status}`,
  ...relationships.relationships.map((relationship) =>
    `- ${relationship.sourceId} --${relationship.relation}--> ${relationship.targetId} [${relationship.joinKey}] / ${relationship.evidence.map((evidence) => `${evidence.sourcePath}.${evidence.field}`).join("; ")}`,
  ),
  `BOUNDS: entities ${relationships.bounds.maxEntities} · relationships ${relationships.bounds.maxRelationships} · evidence ${relationships.bounds.maxEvidenceFragmentsPerRelationship}`,
  ...limitationLines(relationships.limitations),
  "AUTHORITY: READ_ONLY · DECLARED RELATIONS ONLY",
];

export const renderAvaOperationalSemantics = (
  semantic: AvaOperationalSemanticResult,
): string => {
  const sections: string[][] = [];
  if (semantic.advice)
    sections.push(renderAdvice(semantic.advice, semantic.calculus));
  if (semantic.forecast)
    sections.push(renderForecast(semantic.forecast, semantic.calculus));
  if (semantic.comparison) sections.push(renderComparison(semantic.comparison));
  if (semantic.relationships) sections.push(renderRelationships(semantic.relationships));
  sections.push([
    `SEMANTIC RECEIPT: ${semantic.status} / ${semantic.instructionKind}`,
    `STATE REVISION: ${semantic.stateRevision}`,
    `CONTENT REVISION: ${semantic.contentRevision}`,
    `SEMANTIC DIGEST: ${semantic.digest}`,
  ]);
  return sections.map((section) => section.join("\n")).join("\n\n");
};
