import type { SemanticResponse } from "../substrate/contracts";
import type { AvaAnswerPlan, AvaSemanticQuery } from "./schema";
import type {
  CognitiveProgram,
  CognitiveProgramResult,
} from "./operator-algebra";
import {
  canonicalJson,
  cognitiveDigest,
  type CognitiveAuthority,
} from "./cognitive-types";
import type { CognitiveWorldSnapshot } from "./world-model";

export type ProofNodeKind =
  | "SOURCE"
  | "CLAIM"
  | "OPERATOR"
  | "OBLIGATION"
  | "AUTHORITY"
  | "BLOCKER"
  | "REALIZATION";

export type ProofNodeStatus = "PROVEN" | "DECLARED" | "MISSING" | "BLOCKED";

export type CanonicalProofNode = {
  id: string;
  kind: ProofNodeKind;
  status: ProofNodeStatus;
  claim: string;
  dependencyIds: readonly string[];
  sourceIds: readonly string[];
  operatorId?: string;
  authority?: CognitiveAuthority;
};

export type CanonicalProofGraph = {
  version: "1";
  graphId: string;
  worldRevision: string;
  semanticDigest: string;
  executionDigest?: string;
  status: "COMPLETE" | "BLOCKED" | "REJECTED";
  rootClaimIds: readonly string[];
  nodes: readonly CanonicalProofNode[];
  obligations: {
    required: readonly string[];
    satisfied: readonly string[];
    missing: readonly string[];
  };
  digest: string;
};

export type ProofExplanationMode =
  | "CONCISE"
  | "OPERATIONAL"
  | "FULL_PROOF"
  | "COUNTERFACTUAL"
  | "DIAGNOSTIC"
  | "RECEIPT";

export type ProofExplanation = {
  mode: ProofExplanationMode;
  graphDigest: string;
  nodeIds: readonly string[];
  clauses: readonly { nodeId: string; text: string }[];
};

const unique = (values: readonly string[]) => [...new Set(values)].sort();
const nodeId = (kind: ProofNodeKind, value: string) =>
  `${kind.toLowerCase()}:${cognitiveDigest(value).slice(0, 16)}`;

const graphBody = (graph: Omit<CanonicalProofGraph, "digest">) => ({
  ...graph,
  rootClaimIds: unique(graph.rootClaimIds),
  nodes: [...graph.nodes]
    .map((node) => ({
      ...node,
      dependencyIds: unique(node.dependencyIds),
      sourceIds: unique(node.sourceIds),
    }))
    .sort((left, right) => left.id.localeCompare(right.id)),
  obligations: {
    required: unique(graph.obligations.required),
    satisfied: unique(graph.obligations.satisfied),
    missing: unique(graph.obligations.missing),
  },
});

const sealGraph = (graph: Omit<CanonicalProofGraph, "digest">): CanonicalProofGraph => {
  const body = graphBody(graph);
  return { ...body, digest: cognitiveDigest(body) };
};

export const validateCanonicalProofGraph = (
  graph: CanonicalProofGraph,
): { ok: true } | { ok: false; issues: readonly string[] } => {
  const issues: string[] = [];
  if (graph.version !== "1") issues.push("unsupported proof graph version");
  const unsealed = Object.fromEntries(
    Object.entries(graph).filter(([key]) => key !== "digest"),
  ) as Omit<CanonicalProofGraph, "digest">;
  if (cognitiveDigest(graphBody(unsealed)) !== graph.digest)
    issues.push("proof graph digest mismatch");
  const nodes = new Map<string, CanonicalProofNode>();
  for (const node of graph.nodes) {
    if (nodes.has(node.id)) issues.push(`duplicate proof node ${node.id}`);
    nodes.set(node.id, node);
  }
  for (const root of graph.rootClaimIds)
    if (!nodes.has(root)) issues.push(`missing root claim ${root}`);
  for (const node of graph.nodes)
    for (const dependencyId of node.dependencyIds)
      if (!nodes.has(dependencyId))
        issues.push(`${node.id} has dangling dependency ${dependencyId}`);

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id)) {
      issues.push(`proof graph cycle at ${id}`);
      return;
    }
    if (visited.has(id)) return;
    const node = nodes.get(id);
    if (!node) return;
    visiting.add(id);
    node.dependencyIds.forEach(visit);
    visiting.delete(id);
    visited.add(id);
  };
  graph.rootClaimIds.forEach(visit);
  for (const node of graph.nodes)
    if (!visited.has(node.id)) issues.push(`orphan proof node ${node.id}`);

  const required = new Set(graph.obligations.required);
  const satisfied = new Set(graph.obligations.satisfied);
  const missing = new Set(graph.obligations.missing);
  for (const obligation of satisfied)
    if (!required.has(obligation)) issues.push(`undeclared satisfied obligation ${obligation}`);
  for (const obligation of missing)
    if (!required.has(obligation)) issues.push(`undeclared missing obligation ${obligation}`);
  for (const obligation of required)
    if (!satisfied.has(obligation) && !missing.has(obligation))
      issues.push(`unaccounted obligation ${obligation}`);
  if (graph.status === "COMPLETE" && missing.size)
    issues.push("complete proof graph has missing obligations");
  return issues.length ? { ok: false, issues: unique(issues) } : { ok: true };
};

export const buildOperatorProofGraph = (input: {
  program: CognitiveProgram;
  result: CognitiveProgramResult;
  world: CognitiveWorldSnapshot;
}): CanonicalProofGraph => {
  const { program, result, world } = input;
  const { digest: resultDigest, ...resultBody } = result;
  if (cognitiveDigest(resultBody) !== resultDigest)
    throw new Error("operator result digest mismatch");
  const visibleFacts = new Map(
    world.facts
      .filter((fact) => fact.visibility !== "HIDDEN")
      .map((fact) => [fact.id, fact]),
  );
  const nodes = new Map<string, CanonicalProofNode>();
  const required: string[] = [];
  const satisfied: string[] = [];
  const missing: string[] = [];
  const add = (node: CanonicalProofNode) => nodes.set(node.id, node);

  for (const execution of result.executions) {
    const dependencyIds = execution.dependencies.map((id) => `operator:${id}`);
    const sourceIds = execution.datum?.sourceIds ?? [];
    const sourceNodeIds: string[] = [];
    for (const sourceId of sourceIds) {
      if (sourceId.startsWith("fact:") && !visibleFacts.has(sourceId))
        throw new Error(`proof cites hidden or absent evidence ${sourceId}`);
      const id = nodeId("SOURCE", sourceId);
      sourceNodeIds.push(id);
      add({
        id,
        kind: "SOURCE",
        status: "PROVEN",
        claim: visibleFacts.has(sourceId)
          ? `${visibleFacts.get(sourceId)!.entityId}.${visibleFacts.get(sourceId)!.variableId}`
          : `Evidence ${sourceId}`,
        dependencyIds: [],
        sourceIds: [sourceId],
      });
    }
    const obligationNodeIds = execution.obligations.map((obligation) => {
      const id = nodeId("OBLIGATION", `${execution.nodeId}:${obligation}`);
      required.push(`${execution.nodeId}:${obligation}`);
      const met =
        execution.status === "COMPLETED" &&
        !!execution.datum?.proofIds.includes(obligation);
      (met ? satisfied : missing).push(`${execution.nodeId}:${obligation}`);
      add({
        id,
        kind: "OBLIGATION",
        status: met ? "PROVEN" : "MISSING",
        claim: obligation,
        dependencyIds: sourceNodeIds,
        sourceIds,
        operatorId: execution.operator,
      });
      return id;
    });
    add({
      id: `operator:${execution.nodeId}`,
      kind: "OPERATOR",
      status: execution.status === "COMPLETED" ? "PROVEN" : "BLOCKED",
      claim:
        execution.status === "COMPLETED"
          ? `${execution.operator} completed`
          : `${execution.operator} requires ${execution.missingAdapter ?? "an unavailable dependency"}`,
      dependencyIds: [...dependencyIds, ...sourceNodeIds, ...obligationNodeIds],
      sourceIds,
      operatorId: execution.operator,
      authority: execution.datum?.authority,
    });
  }

  const executionRoot = `operator:${program.outputNodeId}`;
  let rootClaimIds = [executionRoot];
  if (!nodes.has(executionRoot)) {
    const blockerId = nodeId("BLOCKER", result.blocker ?? result.status);
    add({
      id: blockerId,
      kind: "BLOCKER",
      status: result.status === "REJECTED" ? "BLOCKED" : "MISSING",
      claim: result.blocker ?? result.status,
      dependencyIds: [...nodes.keys()].filter((id) => id.startsWith("operator:")),
      sourceIds: [],
    });
    rootClaimIds = [blockerId];
  }
  return sealGraph({
    version: "1",
    graphId: `operator-program:${program.id}`,
    worldRevision: world.revision,
    semanticDigest: program.semanticTreeDigest,
    executionDigest: result.digest,
    status:
      result.status === "COMPLETED"
        ? "COMPLETE"
        : result.status === "REJECTED"
          ? "REJECTED"
          : "BLOCKED",
    rootClaimIds,
    nodes: [...nodes.values()],
    obligations: { required, satisfied, missing },
  });
};

const advisoryObligations = (
  semantic: AvaSemanticQuery,
  answerPlan: AvaAnswerPlan,
) => {
  const obligations = ["semantic-binding", "answer-derivation", "realization-lineage"];
  if (
    ["ADVISE", "COMPARE", "RANK", "RECOMMEND"].includes(semantic.operation) &&
    answerPlan.rankedOptions.length > 1
  )
    obligations.push("decision-ranking");
  if (semantic.operation === "PREDICT") obligations.push("forecast-boundary");
  if (semantic.operation === "CHALLENGE") obligations.push("challenge-basis");
  return obligations;
};

export const buildAdvisoryProofGraph = (input: {
  worldRevision: string;
  semantic: AvaSemanticQuery;
  answerPlan: AvaAnswerPlan;
  retrievedFacts: readonly string[];
}): CanonicalProofGraph => {
  const { worldRevision, semantic, answerPlan } = input;
  const nodes: CanonicalProofNode[] = [];
  const sourceIds: string[] = [];
  const revisionSource = nodeId("SOURCE", `world:${worldRevision}`);
  sourceIds.push(revisionSource);
  nodes.push({
    id: revisionSource,
    kind: "SOURCE",
    status: "PROVEN",
    claim: `Campaign state revision ${worldRevision}`,
    dependencyIds: [],
    sourceIds: [`world:${worldRevision}`],
  });
  for (const fact of unique(input.retrievedFacts)) {
    const id = nodeId("SOURCE", fact);
    sourceIds.push(id);
    nodes.push({ id, kind: "SOURCE", status: "PROVEN", claim: fact, dependencyIds: [], sourceIds: [id] });
  }
  const clauseIds = unique(answerPlan.clauseIds);
  const realizationIds = clauseIds.map((clause) => {
    const id = nodeId("REALIZATION", clause);
    nodes.push({
      id,
      kind: "REALIZATION",
      status: "DECLARED",
      claim: `Compiled realization clause ${clause}`,
      dependencyIds: sourceIds,
      sourceIds,
    });
    return id;
  });
  const required = advisoryObligations(semantic, answerPlan);
  const obligationIds = required.map((obligation) => {
    const id = nodeId("OBLIGATION", obligation);
    nodes.push({
      id,
      kind: "OBLIGATION",
      status: "PROVEN",
      claim: obligation,
      dependencyIds: sourceIds,
      sourceIds,
    });
    return id;
  });
  const rootId = nodeId(
    "CLAIM",
    answerPlan.directAnswer ?? `${answerPlan.answerType}:${answerPlan.structureId}`,
  );
  nodes.push({
    id: rootId,
    kind: "CLAIM",
    status: "PROVEN",
    claim: answerPlan.directAnswer ?? answerPlan.answerType,
    dependencyIds: [...sourceIds, ...realizationIds, ...obligationIds],
    sourceIds,
  });
  return sealGraph({
    version: "1",
    graphId: `advisory:${cognitiveDigest({ semantic, answerPlan, facts: unique(input.retrievedFacts) }).slice(0, 24)}`,
    worldRevision,
    semanticDigest: cognitiveDigest(semantic),
    status: "COMPLETE",
    rootClaimIds: [rootId],
    nodes,
    obligations: { required, satisfied: required, missing: [] },
  });
};

export const buildNexusProofGraph = (input: {
  worldRevision: string;
  request: unknown;
  response: SemanticResponse<unknown>;
}): CanonicalProofGraph => {
  const requestDigest = cognitiveDigest(canonicalJson(input.request));
  const sourceId = nodeId("SOURCE", `request:${requestDigest}`);
  const authorityId = nodeId("AUTHORITY", input.response.status);
  const obligationId = nodeId("OBLIGATION", "nexus-response-lineage");
  const rootId = nodeId("CLAIM", canonicalJson(input.response.fact ?? input.response.status));
  const rejected = ["REJECTED", "FORBIDDEN", "AMBIGUOUS", "STATE_CHANGED"].includes(
    input.response.status,
  );
  const obligation = "nexus-response-lineage";
  return sealGraph({
    version: "1",
    graphId: `nexus:${requestDigest.slice(0, 24)}`,
    worldRevision: input.worldRevision,
    semanticDigest: requestDigest,
    status: rejected ? "REJECTED" : "COMPLETE",
    rootClaimIds: [rootId],
    nodes: [
      { id: sourceId, kind: "SOURCE", status: "PROVEN", claim: "Validated Nexus request", dependencyIds: [], sourceIds: [`request:${requestDigest}`] },
      { id: authorityId, kind: "AUTHORITY", status: rejected ? "BLOCKED" : "PROVEN", claim: `Nexus status ${input.response.status}`, dependencyIds: [sourceId], sourceIds: [sourceId] },
      { id: obligationId, kind: "OBLIGATION", status: "PROVEN", claim: obligation, dependencyIds: [sourceId], sourceIds: [sourceId] },
      { id: rootId, kind: rejected ? "BLOCKER" : "CLAIM", status: rejected ? "BLOCKED" : "PROVEN", claim: input.response.rendering.brief, dependencyIds: [sourceId, authorityId, obligationId], sourceIds: [sourceId] },
    ],
    obligations: { required: [obligation], satisfied: [obligation], missing: [] },
  });
};

export const selectProofExplanation = (
  graph: CanonicalProofGraph,
  mode: ProofExplanationMode,
): ProofExplanation => {
  const validation = validateCanonicalProofGraph(graph);
  if (!validation.ok)
    throw new Error(`invalid proof graph: ${validation.issues.join("; ")}`);
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const selected = new Set<string>();
  const include = (id: string, recursive: boolean) => {
    if (selected.has(id)) return;
    const node = nodes.get(id);
    if (!node) return;
    selected.add(id);
    if (recursive) node.dependencyIds.forEach((dependency) => include(dependency, true));
  };
  if (mode === "FULL_PROOF" || mode === "RECEIPT")
    graph.rootClaimIds.forEach((id) => include(id, true));
  else if (mode === "CONCISE") graph.rootClaimIds.forEach((id) => include(id, false));
  else {
    const wanted: ProofNodeKind[] =
      mode === "OPERATIONAL"
        ? ["CLAIM", "OPERATOR", "AUTHORITY", "BLOCKER"]
        : mode === "DIAGNOSTIC"
          ? ["BLOCKER", "OBLIGATION", "SOURCE"]
          : ["CLAIM", "SOURCE"];
    for (const node of graph.nodes)
      if (
        wanted.includes(node.kind) &&
        (mode !== "COUNTERFACTUAL" || /counter|assum|tradeoff|alternative/i.test(node.claim))
      )
        include(node.id, false);
    if (!selected.size) graph.rootClaimIds.forEach((id) => include(id, false));
  }
  const ordered = [...selected].sort();
  return {
    mode,
    graphDigest: graph.digest,
    nodeIds: ordered,
    clauses: ordered.map((id) => ({ nodeId: id, text: nodes.get(id)!.claim })),
  };
};
