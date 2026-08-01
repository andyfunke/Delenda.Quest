import type { CompiledCognitiveDomain } from "./cognitive-domain";
import {
  canonicalJson,
  cloneCognitive,
  cognitiveDigest,
  type CognitiveAuthority,
} from "./cognitive-types";
import type { SurfaceAst } from "./surface-ast";
import { compileWorldSnapshot, type CognitiveWorldSnapshot } from "./world-model";
import { validateAvaSemanticQuery } from "./request-ir";
import {
  type AvaDiscourseState,
  type AvaSemanticQuery,
  type AvaSourceSpan,
} from "./schema";

export type SemanticProvenance = {
  kind: "SURFACE_CLAUSE" | "COMPILER" | "DISCOURSE" | "WORLD";
  sourceId: string;
};

export type ResolvedSemanticNode<T> = {
  id: string;
  value: T;
  provenance: SemanticProvenance;
};

export type ResolvedEntityBinding = {
  id: string;
  kind: string;
  conceptId?: string;
  factIds: readonly string[];
  provenance: SemanticProvenance;
};

export type RuntimeEntityBinding = {
  id: string;
  kind: string;
  conceptId?: string;
  factIds?: readonly string[];
};

export type ResolvedSemanticTree = {
  kind: "RESOLVED_SEMANTIC_TREE";
  version: "1";
  domainId: string;
  domainVersion: string;
  domainDigest: string;
  worldRevision: string;
  worldDigest: string;
  surfaceDigest: string;
  authorityCeiling: CognitiveAuthority;
  operation: ResolvedSemanticNode<AvaSemanticQuery["operation"]>;
  subjectType: ResolvedSemanticNode<AvaSemanticQuery["subject"]["type"]>;
  entities: readonly ResolvedEntityBinding[];
  directive?: ResolvedSemanticNode<NonNullable<AvaSemanticQuery["directive"]>>;
  scope: ResolvedSemanticNode<AvaSemanticQuery["scope"]>;
  metric?: ResolvedSemanticNode<string>;
  metricOperands?: ResolvedSemanticNode<string[]>;
  timeframe: ResolvedSemanticNode<AvaSemanticQuery["timeframe"]>;
  comparisonMode?: ResolvedSemanticNode<NonNullable<AvaSemanticQuery["comparisonMode"]>>;
  criteria: ResolvedSemanticNode<AvaSemanticQuery["criteria"]>;
  polarity: ResolvedSemanticNode<AvaSemanticQuery["polarity"]>;
  quantity?: ResolvedSemanticNode<NonNullable<AvaSemanticQuery["quantity"]>>;
  certainty?: ResolvedSemanticNode<NonNullable<AvaSemanticQuery["certainty"]>>;
  requestedDetail: ResolvedSemanticNode<AvaSemanticQuery["requestedDetail"]>;
  perspective: ResolvedSemanticNode<AvaSemanticQuery["perspective"]>;
  reference?: ResolvedSemanticNode<NonNullable<AvaSemanticQuery["reference"]>>;
  outputForm: ResolvedSemanticNode<AvaSemanticQuery["outputForm"]>;
  overlays: ResolvedSemanticNode<AvaSemanticQuery["overlays"]>;
  confidence: ResolvedSemanticNode<number>;
  sourceSpans: ResolvedSemanticNode<Record<string, AvaSourceSpan>>;
  digest: string;
};

export type ResolveSemanticTreeInput = {
  surface: SurfaceAst;
  domain: CompiledCognitiveDomain;
  world: CognitiveWorldSnapshot;
  runtimeEntities?: readonly RuntimeEntityBinding[];
  discourse?: AvaDiscourseState;
  authorityCeiling?: CognitiveAuthority;
  expectedWorldRevision?: string;
};

const provenanceFor = (
  surface: SurfaceAst,
  field: string,
  domain: CompiledCognitiveDomain,
): SemanticProvenance => {
  const clause = surface.clauses.find((item) =>
    item.semanticFields.some((owned) => owned === field || owned.startsWith(`${field}.`)),
  );
  return clause
    ? { kind: "SURFACE_CLAUSE", sourceId: clause.id }
    : { kind: "COMPILER", sourceId: `${domain.id}@${domain.version}:${field}` };
};

const node = <T>(
  surface: SurfaceAst,
  domain: CompiledCognitiveDomain,
  field: string,
  value: T,
): ResolvedSemanticNode<T> => ({
  id: `semantic:${field}`,
  value: cloneCognitive(value),
  provenance: provenanceFor(surface, field, domain),
});

const discourseEntityIds = (discourse?: AvaDiscourseState) =>
  new Set([
    ...(discourse?.lastEntities ?? []),
    ...(discourse?.lastRecommended ? [discourse.lastRecommended] : []),
    ...(discourse?.selectedObject ? [discourse.selectedObject] : []),
  ]);

const resolveEntities = (
  query: AvaSemanticQuery,
  input: ResolveSemanticTreeInput,
): ResolvedEntityBinding[] => {
  const runtime = new Map<string, RuntimeEntityBinding>();
  for (const item of input.runtimeEntities ?? []) {
    if (runtime.has(item.id)) throw new Error(`duplicate runtime entity ${item.id}`);
    if (item.conceptId && !input.domain.concepts.has(item.conceptId))
      throw new Error(`runtime entity ${item.id} cites unknown concept ${item.conceptId}`);
    runtime.set(item.id, item);
  }
  const discourseIds = discourseEntityIds(input.discourse);
  const visibleFacts = new Map(
    input.world.facts
      .filter((fact) => fact.visibility !== "HIDDEN")
      .map((fact) => [fact.id, fact]),
  );
  return query.subject.entityIds.map((id) => {
    const concept = input.domain.concepts.get(id);
    const dynamic = runtime.get(id);
    if (!concept && !dynamic)
      throw new Error(`semantic entity ${id} is outside the compiled and runtime ontology`);
    const factIds = [...(dynamic?.factIds ?? [])].sort();
    for (const factId of factIds)
      if (!visibleFacts.has(factId))
        throw new Error(`semantic entity ${id} cites hidden or absent fact ${factId}`);
    return {
      id,
      kind: dynamic?.kind ?? concept!.kind,
      conceptId: dynamic?.conceptId ?? concept?.id,
      factIds,
      provenance: discourseIds.has(id)
        ? { kind: "DISCOURSE", sourceId: `discourse:${id}` }
        : factIds.length
          ? { kind: "WORLD", sourceId: factIds[0] }
          : dynamic
            ? { kind: "COMPILER", sourceId: `runtime:${dynamic.id}` }
            : { kind: "COMPILER", sourceId: `concept:${concept!.id}` },
    };
  });
};

const treeBody = (tree: Omit<ResolvedSemanticTree, "digest">) => tree;

export const resolveSemanticTree = (
  input: ResolveSemanticTreeInput,
): ResolvedSemanticTree => {
  if (input.surface.digest !== cognitiveDigest({
    kind: input.surface.kind,
    version: input.surface.version,
    raw: input.surface.raw,
    normalized: input.surface.normalized,
    lexemes: input.surface.lexemes,
    clauses: input.surface.clauses,
    activations: input.surface.activations,
    semantic: input.surface.semantic,
  })) throw new Error("surface AST digest is invalid");
  if (input.world.domainId !== input.domain.id || input.world.domainVersion !== input.domain.version)
    throw new Error("semantic resolver domain and world do not match");
  const { digest: suppliedWorldDigest, ...worldBody } = input.world;
  const verifiedWorld = compileWorldSnapshot(worldBody, input.domain);
  if (suppliedWorldDigest !== verifiedWorld.digest)
    throw new Error("world snapshot digest is invalid");
  if (
    input.expectedWorldRevision !== undefined &&
    input.world.revision !== input.expectedWorldRevision
  ) throw new Error("semantic resolver received a stale world revision");
  const validation = validateAvaSemanticQuery(input.surface.semantic);
  if (!validation.ok)
    throw new Error(`semantic query is invalid: ${validation.issues.join("; ")}`);
  const query = validation.query;
  const body: Omit<ResolvedSemanticTree, "digest"> = {
    kind: "RESOLVED_SEMANTIC_TREE",
    version: "1",
    domainId: input.domain.id,
    domainVersion: input.domain.version,
    domainDigest: input.domain.digest,
    worldRevision: input.world.revision,
    worldDigest: input.world.digest,
    surfaceDigest: input.surface.digest,
    authorityCeiling: input.authorityCeiling ?? "READ_ONLY",
    operation: node(input.surface, input.domain, "operation", query.operation),
    subjectType: node(input.surface, input.domain, "subject", query.subject.type),
    entities: resolveEntities(query, input),
    ...(query.directive ? { directive: node(input.surface, input.domain, "directive", query.directive) } : {}),
    scope: node(input.surface, input.domain, "scope", query.scope),
    ...(query.metric !== undefined ? { metric: node(input.surface, input.domain, "metric", query.metric) } : {}),
    ...(query.metricOperands ? { metricOperands: node(input.surface, input.domain, "metricOperands", query.metricOperands) } : {}),
    timeframe: node(input.surface, input.domain, "timeframe", query.timeframe),
    ...(query.comparisonMode ? { comparisonMode: node(input.surface, input.domain, "comparisonMode", query.comparisonMode) } : {}),
    criteria: node(input.surface, input.domain, "criteria", query.criteria),
    polarity: node(input.surface, input.domain, "polarity", query.polarity),
    ...(query.quantity ? { quantity: node(input.surface, input.domain, "quantity", query.quantity) } : {}),
    ...(query.certainty ? { certainty: node(input.surface, input.domain, "certainty", query.certainty) } : {}),
    requestedDetail: node(input.surface, input.domain, "requestedDetail", query.requestedDetail),
    perspective: node(input.surface, input.domain, "perspective", query.perspective),
    ...(query.reference ? { reference: node(input.surface, input.domain, "reference", query.reference) } : {}),
    outputForm: node(input.surface, input.domain, "outputForm", query.outputForm),
    overlays: node(input.surface, input.domain, "overlays", query.overlays),
    confidence: node(input.surface, input.domain, "confidence", query.confidence),
    sourceSpans: node(input.surface, input.domain, "sourceSpans", query.sourceSpans),
  };
  return { ...body, digest: cognitiveDigest(treeBody(body)) };
};

export const lowerResolvedSemanticTree = (
  tree: ResolvedSemanticTree,
): AvaSemanticQuery => {
  const { digest, ...body } = tree;
  if (digest !== cognitiveDigest(treeBody(body)))
    throw new Error("resolved semantic tree digest is invalid");
  const query: AvaSemanticQuery = {
    operation: tree.operation.value,
    subject: { type: tree.subjectType.value, entityIds: tree.entities.map((item) => item.id) },
    ...(tree.directive ? { directive: cloneCognitive(tree.directive.value) } : {}),
    scope: cloneCognitive(tree.scope.value),
    ...(tree.metric ? { metric: tree.metric.value } : {}),
    ...(tree.metricOperands ? { metricOperands: cloneCognitive(tree.metricOperands.value) } : {}),
    timeframe: tree.timeframe.value,
    ...(tree.comparisonMode ? { comparisonMode: tree.comparisonMode.value } : {}),
    criteria: cloneCognitive(tree.criteria.value),
    polarity: tree.polarity.value,
    ...(tree.quantity ? { quantity: cloneCognitive(tree.quantity.value) } : {}),
    ...(tree.certainty ? { certainty: tree.certainty.value } : {}),
    requestedDetail: tree.requestedDetail.value,
    perspective: tree.perspective.value,
    ...(tree.reference ? { reference: cloneCognitive(tree.reference.value) } : {}),
    outputForm: tree.outputForm.value,
    overlays: cloneCognitive(tree.overlays.value),
    confidence: tree.confidence.value,
    sourceSpans: cloneCognitive(tree.sourceSpans.value),
  };
  const validation = validateAvaSemanticQuery(query);
  if (!validation.ok)
    throw new Error(`lowered semantic query is invalid: ${validation.issues.join("; ")}`);
  return validation.query;
};

export const resolvedSemanticTreeSignature = (tree: ResolvedSemanticTree) =>
  canonicalJson({
    kind: tree.kind,
    version: tree.version,
    domainDigest: tree.domainDigest,
    worldRevision: tree.worldRevision,
    worldDigest: tree.worldDigest,
    surfaceDigest: tree.surfaceDigest,
    authorityCeiling: tree.authorityCeiling,
    digest: tree.digest,
  });
