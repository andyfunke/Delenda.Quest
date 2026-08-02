import { CONCEPTS } from "../concepts";
import { MANEUVERS, situationForState, type GameState } from "../game";
import { cognitiveDigest } from "./cognitive-types";
import { avaVisibleWorldRevision } from "./world-model";
import type {
  AvaOperationalProvenance,
  AvaOperationalRelationship,
  AvaOperationalRelationships,
  AvaOperationalUnavailableEvidence,
} from "./operational-contracts";

const MAX_ENTITIES = 20;
const MAX_RELATIONSHIPS = 64;
const MAX_EVIDENCE_FRAGMENTS = 4;

const provenance = (
  sourcePath: string,
  field: string,
  sourceIds: readonly string[],
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

const bounds = {
  maxEntities: MAX_ENTITIES,
  maxRelationships: MAX_RELATIONSHIPS,
  maxEvidenceFragmentsPerRelationship: MAX_EVIDENCE_FRAGMENTS,
} as const;

const unavailable = (
  id: string,
  reason: string,
  status: AvaOperationalUnavailableEvidence["status"],
  sourcePath: string,
  field: string,
  sourceIds: readonly string[],
): AvaOperationalUnavailableEvidence => ({
  id,
  reason,
  status,
  provenance: [provenance(sourcePath, field, sourceIds)],
});

const relatedConceptsFor = (
  sourceId: string,
  currentRevision: string,
): AvaOperationalRelationship[] => {
  const concept = CONCEPTS[sourceId];
  if (!concept) return [];
  return concept.related.flatMap((targetId, sourceOrder) => {
    if (!CONCEPTS[targetId]) return [];
    return [
      {
        sourceId,
        targetId,
        relation: "RELATED_CONCEPT" as const,
        direction: "SOURCE_TO_TARGET" as const,
        joinKey: `CONCEPTS.${sourceId}.related[${sourceOrder}]`,
        sourceOrder,
        evidence: [
          provenance(
            `app/concepts.ts::CONCEPTS.${sourceId}`,
            "related",
            [sourceId, targetId],
            sourceOrder,
          ),
        ],
        currentRevision,
        readOnly: true as const,
      },
    ];
  });
};

const currentManeuversFor = (
  state: GameState,
  currentRevision: string,
): { relationships: AvaOperationalRelationship[]; limitations: AvaOperationalUnavailableEvidence[] } => {
  const situation = situationForState(state);
  const limitations: AvaOperationalUnavailableEvidence[] = [];
  const relationships = situation.maneuvers.flatMap((maneuverId, sourceOrder) => {
    if (!MANEUVERS.some((maneuver) => maneuver.id === maneuverId)) {
      limitations.push(
        unavailable(
          `maneuver:${maneuverId}:not-present`,
          "The current situation references a maneuver identity absent from the canonical maneuver catalog.",
          "NOT_PRESENT",
          "app/game.ts::situationForState",
          "maneuvers",
          [maneuverId],
        ),
      );
      return [];
    }
    return [
      {
        sourceId: "campaign-synopsis",
        targetId: `maneuver:${maneuverId}`,
        relation: "CURRENT_VISIBLE_MANEUVER" as const,
        direction: "SOURCE_TO_TARGET" as const,
        joinKey: `currentSituation.maneuvers[${sourceOrder}]`,
        sourceOrder,
        evidence: [
          provenance(
            "app/game.ts::situationForState",
            "currentSituation.maneuvers",
            ["campaign-synopsis", `maneuver:${maneuverId}`],
            sourceOrder,
          ),
          provenance(
            "app/campaign-substrate.ts::CompiledSituation.maneuverPresentations",
            "realizationId/label/rationale",
            [maneuverId],
          ),
        ].slice(0, MAX_EVIDENCE_FRAGMENTS),
        currentRevision,
        readOnly: true as const,
      },
    ];
  });
  return { relationships, limitations };
};

export const projectAvaOperationalRelationships = (input: {
  state: GameState;
  entityIds: readonly string[];
}): AvaOperationalRelationships => {
  const entityIds = [...new Set(input.entityIds)].sort();
  const currentRevision = avaVisibleWorldRevision(input.state);
  const limitations: AvaOperationalUnavailableEvidence[] = [];
  if (entityIds.length > MAX_ENTITIES) {
    limitations.push(
      unavailable(
        "entity-bound-exceeded",
        `The relationship projection accepts at most ${MAX_ENTITIES} entities and does not truncate an over-bound request.`,
        "UNAVAILABLE",
        "app/ava/operational-relationships.ts",
        "maxEntities",
        entityIds,
      ),
    );
    const body: Omit<AvaOperationalRelationships, "digest"> = {
      kind: "TYPED_OPERATIONAL_RELATIONSHIPS",
      status: "UNAVAILABLE",
      entityIds,
      relationships: [],
      limitations,
      bounds,
    };
    return seal(body) as AvaOperationalRelationships;
  }
  const currentManeuverProjection = entityIds.includes("campaign-synopsis")
    ? currentManeuversFor(input.state, currentRevision)
    : { relationships: [], limitations: [] };
  const relationships = entityIds.flatMap((entityId) => [
    ...relatedConceptsFor(entityId, currentRevision),
    ...(entityId === "campaign-synopsis"
      ? currentManeuverProjection.relationships
      : []),
  ]);
  limitations.push(...currentManeuverProjection.limitations);
  if (relationships.length > MAX_RELATIONSHIPS) {
    limitations.push(
      unavailable(
        "relationship-bound-exceeded",
        `The relationship projection found ${relationships.length} edges, above the bound of ${MAX_RELATIONSHIPS}; it does not truncate the result.`,
        "UNAVAILABLE",
        "app/ava/operational-relationships.ts",
        "maxRelationships",
        entityIds,
      ),
    );
  }
  const status = relationships.length > MAX_RELATIONSHIPS
    ? "UNAVAILABLE"
    : relationships.length
      ? "AVAILABLE"
      : "NOT_PRESENT";
  const body: Omit<AvaOperationalRelationships, "digest"> = {
    kind: "TYPED_OPERATIONAL_RELATIONSHIPS",
    status,
    entityIds,
    relationships: relationships.length > MAX_RELATIONSHIPS ? [] : relationships,
    limitations,
    bounds,
  };
  return seal(body) as AvaOperationalRelationships;
};
