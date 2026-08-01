import type { SemanticResponse } from "../substrate/contracts";
import type { AvaAnswerPlan, AvaSemanticQuery } from "./schema";
import {
  COGNITIVE_OPERATOR_REGISTRY,
  type CognitiveNodeExecution,
  type CognitiveProgram,
  type CognitiveProgramNode,
  type CognitiveProgramResult,
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
  `${kind.toLowerCase()}:${cognitiveDigest(value)}`;

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

const canonicalEqual = (left: unknown, right: unknown) =>
  canonicalJson(left) === canonicalJson(right);

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

type ProofGraphCompositionRole = "response" | "cognitive";

const compositionId = (role: ProofGraphCompositionRole, id: string) =>
  `${role}:${id}`;

const remapProofGraph = (
  graph: CanonicalProofGraph,
  role: ProofGraphCompositionRole,
) => ({
  rootClaimIds: graph.rootClaimIds.map((id) => compositionId(role, id)),
  nodes: graph.nodes.map((node) => ({
    ...node,
    id: compositionId(role, node.id),
    dependencyIds: node.dependencyIds.map((id) => compositionId(role, id)),
    sourceIds: node.sourceIds.map((id) => compositionId(role, id)),
  })),
  obligations: {
    required: graph.obligations.required.map((id) => compositionId(role, id)),
    satisfied: graph.obligations.satisfied.map((id) => compositionId(role, id)),
    missing: graph.obligations.missing.map((id) => compositionId(role, id)),
  },
});

const cognitiveExecutionBinding = "cognitive-execution-binding";

const exactBindingNode = (
  actual: CanonicalProofNode | undefined,
  expected: CanonicalProofNode,
) => !!actual && canonicalEqual(actual, expected);

const canonicalExecutionSourceClaims = new Set([
  "Validated cognitive execution",
  "Validated cognitive decision execution",
]);

const isExactExecutionSource = (
  node: CanonicalProofNode | undefined,
  executionSourceId: string,
  executionDigest: string,
) =>
  !!node &&
  node.id === executionSourceId &&
  node.kind === "SOURCE" &&
  node.status === "PROVEN" &&
  canonicalExecutionSourceClaims.has(node.claim) &&
  node.dependencyIds.length === 0 &&
  canonicalEqual(node.sourceIds, [`execution:${executionDigest}`]) &&
  node.operatorId === undefined &&
  node.authority === undefined;

const countValue = (values: readonly string[], value: string) =>
  values.filter((item) => item === value).length;

/**
 * A previously bound graph is accepted only when its seal covers the complete
 * source -> obligation -> wrapper-root topology. Obligation-array strings are
 * bookkeeping, not proof of an execution edge.
 */
const validateExistingResponseBinding = (
  graph: CanonicalProofGraph,
  executionDigest: string,
  executionSourceId: string,
  obligationId: string,
) => {
  if (
    graph.executionDigest !== executionDigest ||
    countValue(graph.obligations.required, cognitiveExecutionBinding) !== 1 ||
    countValue(graph.obligations.satisfied, cognitiveExecutionBinding) !== 1 ||
    countValue(graph.obligations.missing, cognitiveExecutionBinding) !== 0 ||
    graph.rootClaimIds.length !== 1
  )
    throw new Error("response proof has a partial cognitive execution binding");

  const executionSources = graph.nodes.filter(
    (node) => node.id === executionSourceId,
  );
  const obligationNodes = graph.nodes.filter((node) => node.id === obligationId);
  const wrapper = graph.nodes.find((node) => node.id === graph.rootClaimIds[0]);
  const expectedObligation: CanonicalProofNode = {
    id: obligationId,
    kind: "OBLIGATION",
    status: "PROVEN",
    claim: cognitiveExecutionBinding,
    dependencyIds: [executionSourceId],
    sourceIds: [`execution:${executionDigest}`],
  };
  if (
    executionSources.length !== 1 ||
    obligationNodes.length !== 1 ||
    !isExactExecutionSource(
      executionSources[0],
      executionSourceId,
      executionDigest,
    ) ||
    !exactBindingNode(obligationNodes[0], expectedObligation) ||
    !wrapper
  )
    throw new Error("response proof has invalid cognitive execution binding topology");

  const priorRootClaimIds = wrapper.dependencyIds.filter(
    (id) => id !== executionSourceId && id !== obligationId,
  );
  if (
    !priorRootClaimIds.length ||
    !wrapper.dependencyIds.includes(executionSourceId) ||
    !wrapper.dependencyIds.includes(obligationId)
  )
    throw new Error("response proof has invalid cognitive execution binding topology");

  const { digest: _boundDigest, executionDigest: _boundExecution, ...shared } =
    graph;
  void _boundDigest;
  void _boundExecution;
  const priorNodesWithExecutionSource = graph.nodes.filter(
    (node) => node.id !== obligationId && node.id !== wrapper.id,
  );
  const priorNodeCandidates = [
    priorNodesWithExecutionSource.filter(
      (node) => node.id !== executionSourceId,
    ),
    priorNodesWithExecutionSource,
  ];
  const priorObligations = {
    required: graph.obligations.required.filter(
      (item) => item !== cognitiveExecutionBinding,
    ),
    satisfied: graph.obligations.satisfied.filter(
      (item) => item !== cognitiveExecutionBinding,
    ),
    missing: graph.obligations.missing,
  };
  const priorCandidates: Omit<CanonicalProofGraph, "digest">[] =
    priorNodeCandidates.flatMap((nodes) => [
      {
        ...shared,
        rootClaimIds: priorRootClaimIds,
        nodes,
        obligations: priorObligations,
      },
      {
        ...shared,
        executionDigest,
        rootClaimIds: priorRootClaimIds,
        nodes,
        obligations: priorObligations,
      },
    ]);
  const matchingPrior = priorCandidates.find((candidate) => {
    const prior = sealGraph(candidate);
    const priorValidation = validateCanonicalProofGraph(prior);
    if (!priorValidation.ok) return false;
    const expectedRootId = nodeId(
      graph.status === "COMPLETE" ? "CLAIM" : "BLOCKER",
      `response-execution-binding:${prior.digest}:${executionDigest}`,
    );
    const expectedWrapper: CanonicalProofNode = {
      id: expectedRootId,
      kind: graph.status === "COMPLETE" ? "CLAIM" : "BLOCKER",
      status: graph.status === "COMPLETE" ? "PROVEN" : "BLOCKED",
      claim: "Response derived from the validated cognitive execution",
      dependencyIds: unique([
        ...prior.rootClaimIds,
        executionSourceId,
        obligationId,
      ]),
      sourceIds: [`execution:${executionDigest}`],
    };
    return exactBindingNode(wrapper, expectedWrapper);
  });
  if (!matchingPrior)
    throw new Error("response proof has invalid cognitive execution binding topology");
  return graph;
};

/**
 * Adds an explicit, sealed response-to-execution edge before two proof graphs
 * can be composed. Merely placing independent roots beside each other does not
 * establish that the rendered response used the cognitive execution.
 */
export const bindResponseProofToExecution = (
  graph: CanonicalProofGraph,
  executionDigest: string,
): CanonicalProofGraph => {
  const validation = validateCanonicalProofGraph(graph);
  if (!validation.ok)
    throw new Error(
      `invalid response proof graph: ${validation.issues.join("; ")}`,
    );
  if (!executionDigest.trim())
    throw new Error("response proof requires a cognitive execution digest");
  if (graph.executionDigest && graph.executionDigest !== executionDigest)
    throw new Error("response proof cites a different cognitive execution");
  const executionSourceId = nodeId(
    "SOURCE",
    `execution:${executionDigest}`,
  );
  const obligationId = nodeId(
    "OBLIGATION",
    `${cognitiveExecutionBinding}:${executionDigest}`,
  );
  const hasBindingObligationMaterial =
    graph.obligations.required.includes(cognitiveExecutionBinding) ||
    graph.obligations.satisfied.includes(cognitiveExecutionBinding) ||
    graph.obligations.missing.includes(cognitiveExecutionBinding) ||
    graph.nodes.some((node) => node.id === obligationId);
  if (hasBindingObligationMaterial)
    return validateExistingResponseBinding(
      graph,
      executionDigest,
      executionSourceId,
      obligationId,
    );
  const existingExecutionSources = graph.nodes.filter(
    (node) => node.id === executionSourceId,
  );
  const expectedExecutionSource: CanonicalProofNode = {
    id: executionSourceId,
    kind: "SOURCE",
    status: "PROVEN",
    claim: "Validated cognitive execution",
    dependencyIds: [],
    sourceIds: [`execution:${executionDigest}`],
  };
  if (
    existingExecutionSources.length > 1 ||
    (existingExecutionSources.length === 1 &&
      !isExactExecutionSource(
        existingExecutionSources[0],
        executionSourceId,
        executionDigest,
      ))
  )
    throw new Error("response proof has a conflicting execution source");
  const rootId = nodeId(
    graph.status === "COMPLETE" ? "CLAIM" : "BLOCKER",
    `response-execution-binding:${graph.digest}:${executionDigest}`,
  );
  const { digest: _priorDigest, ...graphWithoutDigest } = graph;
  void _priorDigest;
  const bound = sealGraph({
    ...graphWithoutDigest,
    executionDigest,
    rootClaimIds: [rootId],
    nodes: [
      ...graph.nodes,
      ...(existingExecutionSources.length ? [] : [expectedExecutionSource]),
      {
        id: obligationId,
        kind: "OBLIGATION",
        status: "PROVEN",
        claim: cognitiveExecutionBinding,
        dependencyIds: [executionSourceId],
        sourceIds: [`execution:${executionDigest}`],
      },
      {
        id: rootId,
        kind: graph.status === "COMPLETE" ? "CLAIM" : "BLOCKER",
        status: graph.status === "COMPLETE" ? "PROVEN" : "BLOCKED",
        claim: "Response derived from the validated cognitive execution",
        dependencyIds: [
          ...graph.rootClaimIds,
          executionSourceId,
          obligationId,
        ],
        sourceIds: [`execution:${executionDigest}`],
      },
    ],
    obligations: {
      required: [...graph.obligations.required, cognitiveExecutionBinding],
      satisfied: [...graph.obligations.satisfied, cognitiveExecutionBinding],
      missing: graph.obligations.missing,
    },
  });
  const boundValidation = validateCanonicalProofGraph(bound);
  if (!boundValidation.ok)
    throw new Error(
      `bound response proof graph is invalid: ${boundValidation.issues.join("; ")}`,
    );
  return bound;
};

/**
 * Retains a Nexus response proof and its cognitive execution proof as one
 * independently valid graph. Imported identifiers are role-namespaced so two
 * otherwise identical graphs cannot alias each other's nodes or obligations.
 */
export const composeCanonicalProofGraphs = (
  responseGraph: CanonicalProofGraph,
  cognitiveGraph: CanonicalProofGraph,
): CanonicalProofGraph => {
  const responseValidation = validateCanonicalProofGraph(responseGraph);
  if (!responseValidation.ok)
    throw new Error(
      `invalid response proof graph: ${responseValidation.issues.join("; ")}`,
    );
  const cognitiveValidation = validateCanonicalProofGraph(cognitiveGraph);
  if (!cognitiveValidation.ok)
    throw new Error(
      `invalid cognitive proof graph: ${cognitiveValidation.issues.join("; ")}`,
    );
  if (responseGraph.worldRevision !== cognitiveGraph.worldRevision)
    throw new Error("proof graph world revisions do not match");
  if (
    !responseGraph.executionDigest ||
    !cognitiveGraph.executionDigest ||
    responseGraph.executionDigest !== cognitiveGraph.executionDigest
  )
    throw new Error(
      "response proof is not bound to the cognitive execution",
    );
  if (!responseGraph.rootClaimIds.length || !cognitiveGraph.rootClaimIds.length)
    throw new Error("proof graph composition requires roots from both graphs");

  const response = remapProofGraph(responseGraph, "response");
  const cognitive = remapProofGraph(cognitiveGraph, "cognitive");
  const compositionDigest = cognitiveDigest({
    responseDigest: responseGraph.digest,
    cognitiveDigest: cognitiveGraph.digest,
  });
  const rootId = `composition:root:${compositionDigest}`;
  const status =
    responseGraph.status === "REJECTED" || cognitiveGraph.status === "REJECTED"
      ? "REJECTED"
      : responseGraph.status === "BLOCKED" || cognitiveGraph.status === "BLOCKED"
        ? "BLOCKED"
        : "COMPLETE";
  const rootDependencies = [
    ...response.rootClaimIds,
    ...cognitive.rootClaimIds,
  ];
  const composed = sealGraph({
    version: "1",
    graphId: `composition:${compositionDigest}`,
    worldRevision: cognitiveGraph.worldRevision,
    semanticDigest: cognitiveDigest({
      responseSemanticDigest: responseGraph.semanticDigest,
      cognitiveSemanticDigest: cognitiveGraph.semanticDigest,
    }),
    executionDigest: cognitiveGraph.executionDigest,
    status,
    rootClaimIds: [rootId],
    nodes: [
      ...response.nodes,
      ...cognitive.nodes,
      {
        id: rootId,
        kind: status === "COMPLETE" ? "CLAIM" : "BLOCKER",
        status: status === "COMPLETE" ? "PROVEN" : "BLOCKED",
        claim: "Response and cognitive proofs retained",
        dependencyIds: rootDependencies,
        sourceIds: [],
      },
    ],
    obligations: {
      required: [
        ...response.obligations.required,
        ...cognitive.obligations.required,
      ],
      satisfied: [
        ...response.obligations.satisfied,
        ...cognitive.obligations.satisfied,
      ],
      missing: [
        ...response.obligations.missing,
        ...cognitive.obligations.missing,
      ],
    },
  });
  const validation = validateCanonicalProofGraph(composed);
  if (!validation.ok)
    throw new Error(
      `composed proof graph is invalid: ${validation.issues.join("; ")}`,
    );
  return composed;
};

const sortedWithDuplicates = (values: readonly string[]) => [...values].sort();

const programNodeDependencies = (node: CognitiveProgramNode) =>
  Object.values(node.inputs)
    .filter((reference) => reference.kind === "NODE")
    .map((reference) => reference.nodeId);

const assertExecutionMatchesProgramNode = (
  execution: CognitiveNodeExecution,
  node: CognitiveProgramNode,
) => {
  if (execution.operator !== node.operator)
    throw new Error(
      `operator result execution ${execution.nodeId} does not match the program operator`,
    );
  if (
    !canonicalEqual(
      sortedWithDuplicates(execution.dependencies),
      sortedWithDuplicates(programNodeDependencies(node)),
    )
  )
    throw new Error(
      `operator result execution ${execution.nodeId} does not match the program dependency topology`,
    );
  const spec = COGNITIVE_OPERATOR_REGISTRY.get(node.operator);
  if (!spec || !canonicalEqual(execution.obligations, spec.proofObligations))
    throw new Error(
      `operator result execution ${execution.nodeId} does not match the operator obligations`,
    );
  if (execution.status === "COMPLETED") {
    if (!execution.datum || execution.missingAdapter !== undefined)
      throw new Error(
        `completed operator result execution ${execution.nodeId} is malformed`,
      );
    if (
      spec.proofObligations.some(
        (obligation) => !execution.datum!.proofIds.includes(obligation),
      )
    )
      throw new Error(
        `completed operator result execution ${execution.nodeId} is missing proof obligations`,
      );
  } else if (execution.datum || !execution.missingAdapter?.trim()) {
    throw new Error(
      `blocked operator result execution ${execution.nodeId} is malformed`,
    );
  }
};

const assertOperatorResultBelongsToProgram = (
  program: CognitiveProgram,
  result: CognitiveProgramResult,
  world: CognitiveWorldSnapshot,
) => {
  if (program.version !== "1")
    throw new Error("unsupported cognitive program version");
  if (program.worldRevision !== world.revision)
    throw new Error("operator proof program world revision is stale");
  if (result.programId !== program.id)
    throw new Error("operator result belongs to a different cognitive program");
  if (
    result.worldRevision !== program.worldRevision ||
    result.worldRevision !== world.revision
  )
    throw new Error("operator result belongs to a different world revision");

  const programNodes = new Map<string, CognitiveProgramNode>();
  for (const node of program.nodes) {
    if (programNodes.has(node.id))
      throw new Error(`duplicate cognitive program node ${node.id}`);
    programNodes.set(node.id, node);
  }
  if (!programNodes.has(program.outputNodeId))
    throw new Error("cognitive program output node is absent");

  const reachable = new Set<string>();
  const visiting = new Set<string>();
  const visit = (nodeId: string) => {
    if (visiting.has(nodeId))
      throw new Error(`cognitive program dependency cycle at ${nodeId}`);
    if (reachable.has(nodeId)) return;
    const node = programNodes.get(nodeId);
    if (!node)
      throw new Error(`cognitive program has unknown dependency ${nodeId}`);
    visiting.add(nodeId);
    for (const dependency of programNodeDependencies(node)) visit(dependency);
    visiting.delete(nodeId);
    reachable.add(nodeId);
  };
  visit(program.outputNodeId);

  const executions = new Map<string, CognitiveNodeExecution>();
  for (const execution of result.executions) {
    if (executions.has(execution.nodeId))
      throw new Error(`duplicate operator result execution ${execution.nodeId}`);
    const node = programNodes.get(execution.nodeId);
    if (!node || !reachable.has(execution.nodeId))
      throw new Error(
        `operator result execution ${execution.nodeId} is not reachable in the program`,
      );
    assertExecutionMatchesProgramNode(execution, node);
    executions.set(execution.nodeId, execution);
  }
  for (const execution of result.executions)
    for (const dependency of execution.dependencies)
      if (!executions.has(dependency))
        throw new Error(
          `operator result execution ${execution.nodeId} omits executed dependency ${dependency}`,
        );

  const outputExecution = executions.get(program.outputNodeId);
  const blockedExecutions = result.executions.filter(
    (execution) => execution.status === "BLOCKED",
  );
  if (result.status === "COMPLETED") {
    if (
      result.blocker !== undefined ||
      !result.output ||
      executions.size !== reachable.size ||
      result.executions.some((execution) => execution.status !== "COMPLETED") ||
      !outputExecution?.datum ||
      !canonicalEqual(result.output, outputExecution.datum)
    )
      throw new Error(
        "completed operator result does not match the program output topology",
      );
    for (const nodeId of reachable)
      if (!executions.has(nodeId))
        throw new Error(
          `completed operator result omits reachable program node ${nodeId}`,
        );
    return;
  }
  if (result.output !== undefined || !result.blocker?.trim())
    throw new Error("incomplete operator result has invalid output or blocker");
  if (result.status === "BLOCKED") {
    if (
      blockedExecutions.length !== 1 ||
      result.blocker !== blockedExecutions[0].missingAdapter
    )
      throw new Error("blocked operator result does not match its blocked execution");
    return;
  }
  if (blockedExecutions.length)
    throw new Error("rejected operator result contains a blocked execution");
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
  assertOperatorResultBelongsToProgram(program, result, world);
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
  hasCognitiveDecision = false,
) => {
  const obligations = ["semantic-binding", "answer-derivation", "realization-lineage"];
  if (hasCognitiveDecision) obligations.push("cognitive-decision-realization");
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
  cognitiveDecision?: {
    executionDigest: string;
    decisionDigest: string;
    winnerId: string;
    ranking: readonly string[];
  };
}): CanonicalProofGraph => {
  const { worldRevision, semantic, answerPlan } = input;
  if (input.cognitiveDecision) {
    const binding = input.cognitiveDecision;
    if (
      !binding.executionDigest.trim() ||
      !binding.decisionDigest.trim() ||
      !binding.ranking.length ||
      binding.ranking[0] !== binding.winnerId ||
      binding.ranking.length !== new Set(binding.ranking).size ||
      canonicalJson(binding.ranking) !== canonicalJson(answerPlan.rankedOptions)
    )
      throw new Error("advisory realization is not bound to the cognitive ranking");
  }
  const nodes: CanonicalProofNode[] = [];
  const sourceIds: string[] = [];
  const derivationIds: string[] = [];
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
  if (input.cognitiveDecision) {
    const binding = input.cognitiveDecision;
    const executionSource = nodeId(
      "SOURCE",
      `execution:${binding.executionDigest}`,
    );
    sourceIds.push(executionSource);
    nodes.push({
      id: executionSource,
      kind: "SOURCE",
      status: "PROVEN",
      claim: "Validated cognitive decision execution",
      dependencyIds: [],
      sourceIds: [`execution:${binding.executionDigest}`],
    });
    const decisionClaim = nodeId(
      "CLAIM",
      `decision:${binding.decisionDigest}:${binding.winnerId}`,
    );
    derivationIds.push(decisionClaim);
    nodes.push({
      id: decisionClaim,
      kind: "CLAIM",
      status: "PROVEN",
      claim: `Cognitive decision selected ${binding.winnerId}`,
      dependencyIds: [executionSource],
      sourceIds: [`execution:${binding.executionDigest}`],
      operatorId: "RANK",
      authority: "READ_ONLY",
    });
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
  const required = advisoryObligations(
    semantic,
    answerPlan,
    !!input.cognitiveDecision,
  );
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
    dependencyIds: [
      ...sourceIds,
      ...derivationIds,
      ...realizationIds,
      ...obligationIds,
    ],
    sourceIds,
  });
  return sealGraph({
    version: "1",
    graphId: `advisory:${cognitiveDigest({ semantic, answerPlan, facts: unique(input.retrievedFacts) })}`,
    worldRevision,
    semanticDigest: cognitiveDigest(semantic),
    executionDigest: input.cognitiveDecision?.executionDigest,
    status: "COMPLETE",
    rootClaimIds: [rootId],
    nodes,
    obligations: { required, satisfied: required, missing: [] },
  });
};

const privateNexusProofRequestKeys = new Set([
  "accountdaykey",
  "confirmationphrase",
  "confirmationtoken",
  "confirmtoken",
  "expectedstateseal",
  "grantid",
  "idempotencykey",
  "origin",
  "proposaltoken",
  "resolutiongrant",
  "resolutiongrantid",
  "resolutionticket",
]);

const normalizedRequestKey = (key: string) =>
  key.replaceAll("_", "").replaceAll("-", "").toLowerCase();

const publicNexusProofRequestIdentity = (
  value: unknown,
  parentKey = "",
): unknown => {
  if (Array.isArray(value))
    return value.map((item) => publicNexusProofRequestIdentity(item, parentKey));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, child]) => {
      const normalized = normalizedRequestKey(key);
      if (
        privateNexusProofRequestKeys.has(normalized) ||
        (normalized === "token" &&
          normalizedRequestKey(parentKey) === "confirmation")
      )
        return [];
      return [[key, publicNexusProofRequestIdentity(child, key)]];
    }),
  );
};

export const buildNexusProofGraph = (input: {
  worldRevision: string;
  request: unknown;
  response: SemanticResponse<unknown>;
  executionDigest?: string;
  cognitiveDecision?: {
    executionDigest: string;
    decisionDigest: string;
    winnerId: string;
    ranking: readonly string[];
  };
}): CanonicalProofGraph => {
  if (
    input.cognitiveDecision &&
    (!input.cognitiveDecision.executionDigest.trim() ||
      !input.cognitiveDecision.decisionDigest.trim() ||
      !input.cognitiveDecision.winnerId.trim() ||
      input.cognitiveDecision.ranking[0] !==
        input.cognitiveDecision.winnerId)
  )
    throw new Error("Nexus cognitive decision binding is malformed");
  const requestIdentity = publicNexusProofRequestIdentity(input.request);
  // Authority credentials and private campaign material are validation inputs,
  // not semantic evidence. Nexus validates them before proof construction. A
  // public proof retains action, option, and semantic identifiers while never
  // becoming a comparison oracle for raw-state seals, grants, or tickets.
  const requestDigest = cognitiveDigest(canonicalJson(requestIdentity));
  const sourceId = nodeId("SOURCE", `request:${requestDigest}`);
  const authorityId = nodeId("AUTHORITY", input.response.status);
  const obligationId = nodeId("OBLIGATION", "nexus-response-lineage");
  const responseFactIdentity = publicNexusProofRequestIdentity(
    input.response.fact ?? input.response.status,
  );
  // Rendering is delivery text and may intentionally tell the authenticated
  // player how to use a short-lived capability. Public proof identity binds
  // only the response status and sanitized semantic fact, never that prose.
  const responseIdentity = {
    status: input.response.status,
    fact: responseFactIdentity,
  };
  const responseIdentityDigest = cognitiveDigest(
    canonicalJson(responseIdentity),
  );
  const rootId = nodeId("CLAIM", canonicalJson(responseIdentity));
  const rejected = ["REJECTED", "FORBIDDEN", "AMBIGUOUS", "STATE_CHANGED"].includes(
    input.response.status,
  );
  const obligation = "nexus-response-lineage";
  const decisionSourceId = input.cognitiveDecision
    ? nodeId(
        "SOURCE",
        `execution:${input.cognitiveDecision.executionDigest}`,
      )
    : undefined;
  const decisionClaimId = input.cognitiveDecision
    ? nodeId(
        "CLAIM",
        `decision:${input.cognitiveDecision.decisionDigest}:${input.cognitiveDecision.winnerId}`,
      )
    : undefined;
  const decisionObligation = "cognitive-decision-realization";
  return sealGraph({
    version: "1",
    graphId: `nexus:${requestDigest}`,
    worldRevision: input.worldRevision,
    semanticDigest: requestDigest,
    executionDigest:
      input.cognitiveDecision?.executionDigest ?? input.executionDigest,
    status: rejected ? "REJECTED" : "COMPLETE",
    rootClaimIds: [rootId],
    nodes: [
      { id: sourceId, kind: "SOURCE", status: "PROVEN", claim: "Validated Nexus request", dependencyIds: [], sourceIds: [`request:${requestDigest}`] },
      ...(decisionSourceId && input.cognitiveDecision
        ? [{
            id: decisionSourceId,
            kind: "SOURCE" as const,
            status: "PROVEN" as const,
            claim: "Validated cognitive decision execution",
            dependencyIds: [],
            sourceIds: [
              `execution:${input.cognitiveDecision.executionDigest}`,
            ],
          }]
        : []),
      ...(decisionClaimId && decisionSourceId && input.cognitiveDecision
        ? [{
            id: decisionClaimId,
            kind: "CLAIM" as const,
            status: "PROVEN" as const,
            claim: `Cognitive decision selected ${input.cognitiveDecision.winnerId}`,
            dependencyIds: [decisionSourceId],
            sourceIds: [
              `execution:${input.cognitiveDecision.executionDigest}`,
            ],
            operatorId: "RANK",
            authority: "READ_ONLY" as const,
          }]
        : []),
      { id: authorityId, kind: "AUTHORITY", status: rejected ? "BLOCKED" : "PROVEN", claim: `Nexus status ${input.response.status}`, dependencyIds: [sourceId], sourceIds: [sourceId] },
      { id: obligationId, kind: "OBLIGATION", status: "PROVEN", claim: obligation, dependencyIds: [sourceId], sourceIds: [sourceId] },
      { id: rootId, kind: rejected ? "BLOCKER" : "CLAIM", status: rejected ? "BLOCKED" : "PROVEN", claim: `Nexus ${input.response.status} response ${responseIdentityDigest}`, dependencyIds: [sourceId, authorityId, obligationId, ...(decisionClaimId ? [decisionClaimId] : [])], sourceIds: [sourceId] },
    ],
    obligations: {
      required: [
        obligation,
        ...(input.cognitiveDecision ? [decisionObligation] : []),
      ],
      satisfied: [
        obligation,
        ...(input.cognitiveDecision ? [decisionObligation] : []),
      ],
      missing: [],
    },
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
