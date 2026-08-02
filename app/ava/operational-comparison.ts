import {
  DELENDA_COGNITIVE_DOMAIN,
} from "./cognitive-domain";
import { cognitiveDigest, type CognitiveValue } from "./cognitive-types";
import {
  MANEUVERS,
  explainManeuverChance,
  maneuversForState,
  situationForState,
  type GameState,
  type Maneuver,
} from "../game";
import { projectAvaEnvelope } from "./projection";
import { projectAvaAction } from "./runtime";
import { avaVisibleWorldRevision } from "./world-model";
import type { AvaCompilerTrace, AvaSemanticQuery } from "./schema";
import type {
  AvaOperationalComparison,
  AvaOperationalComparisonDimension,
  AvaOperationalManeuverIdentity,
  AvaOperationalProvenance,
  AvaOperationalUnavailableEvidence,
} from "./operational-contracts";

const MANEUVER_PATH = "app/game.ts::maneuversForState";
const CHANCE_PATH = "app/game.ts::explainManeuverChance";
const ACTION_PATH = "app/ava/runtime.ts::projectAvaAction";
const ENVELOPE_PATH = "app/ava/projection.ts::projectAvaEnvelope";

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

const numberValue = (value: number): CognitiveValue => value;

const intervalValue = (low: number, high: number): CognitiveValue =>
  low === high ? low : { kind: "INTERVAL", low, high };

const maneuverIdFromEntity = (entityId: string) =>
  entityId.startsWith("maneuver:") ? entityId.slice("maneuver:".length) : undefined;

const identityFor = (
  state: GameState,
  id: string,
): { identity: AvaOperationalManeuverIdentity; maneuver?: Maneuver } => {
  const situation = situationForState(state);
  const sourceOrder = situation.maneuvers.indexOf(id);
  const maneuver = maneuversForState(state).find((candidate) => candidate.id === id);
  const canonical = MANEUVERS.find((candidate) => candidate.id === id);
  const presentation = situation.maneuverPresentations?.[id];
  const sourceIds = [id];
  return {
    ...(maneuver ? { maneuver } : {}),
    identity: {
      id: `maneuver:${id}`,
      label: maneuver?.label ?? canonical?.label ?? `Unavailable maneuver ${id}`,
      ...(maneuver?.flavor || canonical?.flavor
        ? { rationale: maneuver?.flavor ?? canonical?.flavor }
        : {}),
      ...(presentation?.realizationId
        ? { presentationId: presentation.realizationId }
        : {}),
      ...(sourceOrder >= 0 ? { sourceOrder } : {}),
      provenance: [
        provenance(MANEUVER_PATH, "maneuvers", sourceIds, sourceOrder >= 0 ? sourceOrder : undefined),
        ...(presentation
          ? [
              provenance(
                "app/campaign-substrate.ts::CompiledSituation.maneuverPresentations",
                "label/rationale/realizationId",
                sourceIds,
              ),
            ]
          : []),
      ],
    },
  };
};

const comparisonValue = (
  value: CognitiveValue | undefined,
  unit: string | undefined,
  evidence: AvaOperationalProvenance,
) => ({
  ...(value === undefined ? {} : { value }),
  ...(unit ? { unit } : {}),
  provenance: [evidence],
});

const unavailableDimension = (
  id: string,
  semanticDomain: string,
  left: AvaOperationalManeuverIdentity,
  right: AvaOperationalManeuverIdentity,
  reason: string,
): AvaOperationalComparisonDimension => ({
  id,
  status: "UNAVAILABLE",
  semanticDomain,
  direction: "UNSPECIFIED",
  left: comparisonValue(
    undefined,
    undefined,
    provenance(MANEUVER_PATH, "unavailable", [left.id, right.id]),
  ),
  right: comparisonValue(
    undefined,
    undefined,
    provenance(MANEUVER_PATH, "unavailable", [left.id, right.id]),
  ),
  sourcePath: MANEUVER_PATH,
  note: reason,
});

const scalarDimension = (input: {
  id: string;
  semanticDomain: string;
  unit?: string;
  direction: AvaOperationalComparisonDimension["direction"];
  left: number;
  right: number;
  leftId: string;
  rightId: string;
  field: string;
  ruleId?: string;
  note?: string;
}): AvaOperationalComparisonDimension => ({
  id: input.id,
  status: "COMPARABLE",
  semanticDomain: input.semanticDomain,
  ...(input.unit ? { unit: input.unit } : {}),
  direction: input.direction,
  left: comparisonValue(
    numberValue(input.left),
    input.unit,
    provenance(MANEUVER_PATH, input.field, [input.leftId]),
  ),
  right: comparisonValue(
    numberValue(input.right),
    input.unit,
    provenance(MANEUVER_PATH, input.field, [input.rightId]),
  ),
  ...(input.ruleId ? { ruleId: input.ruleId } : {}),
  sourcePath: MANEUVER_PATH,
  ...(input.note ? { note: input.note } : {}),
});

const confidenceDimension = (
  state: GameState,
  left: Maneuver,
  right: Maneuver,
): AvaOperationalComparisonDimension => {
  const leftConfidence = explainManeuverChance(state, left).result;
  const rightConfidence = explainManeuverChance(state, right).result;
  return {
    id: "execution-confidence",
    status: "COMPARABLE",
    semanticDomain: "maneuver execution confidence",
    unit: "probability",
    direction: "HIGHER_IS_BETTER",
    left: comparisonValue(
      numberValue(leftConfidence),
      "probability",
      provenance(CHANCE_PATH, "result", [left.id]),
    ),
    right: comparisonValue(
      numberValue(rightConfidence),
      "probability",
      provenance(CHANCE_PATH, "result", [right.id]),
    ),
    ruleId: "maneuver-chance",
    sourcePath: CHANCE_PATH,
    note: "Only the disclosed chance result is exposed; its authority-owned terms are not copied into the comparison model.",
  };
};

const projectedGroundDimension = (
  state: GameState,
  opportunityFraction: number,
  left: Maneuver,
  right: Maneuver,
  leftIdentity: AvaOperationalManeuverIdentity,
  rightIdentity: AvaOperationalManeuverIdentity,
): { dimension: AvaOperationalComparisonDimension; limitation?: AvaOperationalUnavailableEvidence } => {
  const leftPreview = projectAvaAction(
    state,
    { kind: "maneuver", maneuverId: left.id },
    opportunityFraction,
  );
  const rightPreview = projectAvaAction(
    state,
    { kind: "maneuver", maneuverId: right.id },
    opportunityFraction,
  );
  if (!leftPreview.executed || !rightPreview.executed) {
    const missing = [
      ...(!leftPreview.executed ? [left.id] : []),
      ...(!rightPreview.executed ? [right.id] : []),
    ];
    const reason = "A current action projection is unavailable at the read-only runtime boundary.";
    return {
      dimension: unavailableDimension(
        "projected-ground-movement",
        "disclosed operational projection",
        leftIdentity,
        rightIdentity,
        reason,
      ),
      limitation: {
        id: "projected-ground-movement-unavailable",
        reason,
        status: "UNAVAILABLE",
        provenance: [provenance(ACTION_PATH, "executed", missing)],
      },
    };
  }
  const leftProjection = projectAvaEnvelope(leftPreview.state, left);
  const rightProjection = projectAvaEnvelope(rightPreview.state, right);
  return {
    dimension: {
      id: "projected-ground-movement",
      status: "COMPARABLE",
      semanticDomain: "disclosed operational projection",
      unit: "km",
      direction: "HIGHER_IS_BETTER",
      left: comparisonValue(
        intervalValue(leftProjection.groundLow, leftProjection.groundHigh),
        "km",
        provenance(ENVELOPE_PATH, "groundLow/groundHigh", [left.id]),
      ),
      right: comparisonValue(
        intervalValue(rightProjection.groundLow, rightProjection.groundHigh),
        "km",
        provenance(ENVELOPE_PATH, "groundLow/groundHigh", [right.id]),
      ),
      ruleId: "disclosed-ground-envelope",
      sourcePath: ENVELOPE_PATH,
      note: "The projection is an unresolved disclosed envelope; no sealed outcome is exposed or selected.",
    },
  };
};

const directionalRelation = (
  dimension: AvaOperationalComparisonDimension,
): -1 | 0 | 1 | undefined => {
  if (dimension.status !== "COMPARABLE") return undefined;
  const left = dimension.left.value;
  const right = dimension.right.value;
  if (typeof left !== "number" || typeof right !== "number") {
    if (
      !left ||
      !right ||
      typeof left !== "object" ||
      typeof right !== "object" ||
      Array.isArray(left) ||
      Array.isArray(right) ||
      typeof left.low !== "number" ||
      typeof left.high !== "number" ||
      typeof right.low !== "number" ||
      typeof right.high !== "number"
    )
      return undefined;
    if (left.high < right.low) return dimension.direction === "LOWER_IS_BETTER" ? 1 : -1;
    if (right.high < left.low) return dimension.direction === "LOWER_IS_BETTER" ? -1 : 1;
    return undefined;
  }
  if (left === right || dimension.direction === "CONTEXT_DEPENDENT" || dimension.direction === "UNSPECIFIED") return 0;
  if (dimension.direction === "LOWER_IS_BETTER") return left < right ? 1 : -1;
  return left > right ? 1 : -1;
};

const authoredEvidenceFor = (trace?: AvaCompilerTrace): string[] =>
  [...new Set((trace?.authoredEvidence ?? []).map((evidence) => evidence.phrase))].sort();

const verdictFor = (dimensions: readonly AvaOperationalComparisonDimension[]) => {
  const relations = dimensions.map(directionalRelation).filter(
    (relation): relation is -1 | 0 | 1 => relation !== undefined,
  );
  if (!relations.length) return { status: "NOT_COMPARABLE" as const, verdict: "NOT_COMPARABLE" as const };
  const leftBetter = relations.includes(1);
  const rightBetter = relations.includes(-1);
  if (leftBetter && rightBetter) return { status: "AVAILABLE" as const, verdict: "TRADEOFF" as const };
  if (leftBetter || rightBetter) return { status: "AVAILABLE" as const, verdict: "INSUFFICIENT_EVIDENCE" as const };
  if (dimensions.some((dimension) => dimension.status === "COMPARABLE"))
    return { status: "AVAILABLE" as const, verdict: "BALANCED" as const };
  return { status: "NOT_COMPARABLE" as const, verdict: "NOT_COMPARABLE" as const };
};

export const projectAvaManeuverComparison = (input: {
  state: GameState;
  query: AvaSemanticQuery;
  trace?: AvaCompilerTrace;
  opportunityFraction?: number;
}): AvaOperationalComparison | undefined => {
  if (input.query.subject.entityIds.length !== 2) return undefined;
  const ids = input.query.subject.entityIds.map(maneuverIdFromEntity);
  if (ids.some((id): id is undefined => id === undefined)) return undefined;
  const [leftId, rightId] = ids as [string, string];
  const left = identityFor(input.state, leftId);
  const right = identityFor(input.state, rightId);
  const situation = situationForState(input.state);
  const limitations: AvaOperationalUnavailableEvidence[] = [];
  if (!left.maneuver || !right.maneuver) {
    const missing = [
      ...(!left.maneuver ? [leftId] : []),
      ...(!right.maneuver ? [rightId] : []),
    ];
    limitations.push({
      id: "maneuver-not-present",
      reason: "One or both requested maneuver identities are not present in the current visible maneuver docket.",
      status: "NOT_PRESENT",
      provenance: [provenance(MANEUVER_PATH, "maneuvers", missing)],
    });
  }
  const dimensions: AvaOperationalComparisonDimension[] = [];
  if (left.maneuver && right.maneuver) {
    dimensions.push(
      confidenceDimension(input.state, left.maneuver, right.maneuver),
      scalarDimension({
        id: "commitment",
        semanticDomain: "committed personnel",
        unit: "personnel",
        direction: "LOWER_IS_BETTER",
        left: left.maneuver.commitment,
        right: right.maneuver.commitment,
        leftId,
        rightId,
        field: "commitment",
      }),
      scalarDimension({
        id: "casualty-factor",
        semanticDomain: "casualty factor",
        unit: "multiplier",
        direction: "LOWER_IS_BETTER",
        left: left.maneuver.casualty,
        right: right.maneuver.casualty,
        leftId,
        rightId,
        field: "casualty",
      }),
      scalarDimension({
        id: "supply-burden",
        semanticDomain: "operational supply burden",
        unit: "multiplier",
        direction: "LOWER_IS_BETTER",
        left: left.maneuver.supply,
        right: right.maneuver.supply,
        leftId,
        rightId,
        field: "supply",
      }),
      scalarDimension({
        id: "success-pressure",
        semanticDomain: "success pressure",
        unit: "pressure",
        direction: "CONTEXT_DEPENDENT",
        left: left.maneuver.successPressure,
        right: right.maneuver.successPressure,
        leftId,
        rightId,
        field: "successPressure",
      }),
      scalarDimension({
        id: "failure-pressure",
        semanticDomain: "failure pressure",
        unit: "pressure",
        direction: "CONTEXT_DEPENDENT",
        left: left.maneuver.failurePressure,
        right: right.maneuver.failurePressure,
        leftId,
        rightId,
        field: "failurePressure",
      }),
    );
    const projection = projectedGroundDimension(
      input.state,
      input.opportunityFraction ?? 0,
      left.maneuver,
      right.maneuver,
      left.identity,
      right.identity,
    );
    dimensions.push(projection.dimension);
    if (projection.limitation) limitations.push(projection.limitation);
  } else {
    dimensions.push(
      ...[
        "execution-confidence",
        "commitment",
        "casualty-factor",
        "supply-burden",
        "success-pressure",
        "failure-pressure",
        "projected-ground-movement",
      ].map((id) => unavailableDimension(id, "maneuver evidence", left.identity, right.identity, "Comparison requires two visible current maneuver identities.")),
    );
  }
  const outcome = left.maneuver && right.maneuver
    ? verdictFor(dimensions)
    : { status: "UNAVAILABLE" as const, verdict: "NOT_COMPARABLE" as const };
  const body: Omit<AvaOperationalComparison, "digest"> = {
    kind: "PAIRWISE_MANEUVER_COMPARISON",
    status: outcome.status,
    left: left.identity,
    right: right.identity,
    sharedContext: {
      situationId: situation.id,
      sector: situation.sector,
      stateRevision: avaVisibleWorldRevision(input.state),
      contentRevision: input.state.contentPackVersion,
      calculusRevision: DELENDA_COGNITIVE_DOMAIN.version,
    },
    dimensions,
    verdict: outcome.verdict,
    authoredEvidence: authoredEvidenceFor(input.trace),
    limitations,
  };
  return seal(body) as AvaOperationalComparison;
};
