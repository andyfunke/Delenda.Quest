import assert from "node:assert/strict";
import test from "node:test";

const cognition = await import(process.env.DELENDA_AVA_COGNITIVE_BUNDLE);
const game = await import(process.env.DELENDA_SUBSTRATE_GAME_BUNDLE);
const nexus = await import(process.env.DELENDA_AVA_NEXUS_BUNDLE);

const semantic = {
  operation: "CALCULATE",
  subject: { type: "METRIC", entityIds: ["legitimacy"] },
  scope: { group: "MAIN", domains: ["MAIN"], excludedDomains: [] },
  metric: "legitimacy",
  timeframe: "CURRENT_DAY",
  criteria: ["OVERALL_VALUE"],
  polarity: "AFFIRMATIVE",
  requestedDetail: "CALCULUS",
  perspective: "PLAYER",
  outputForm: "TERMINAL",
  overlays: [],
  confidence: 1,
  sourceSpans: {},
};

const context = () => {
  const state = game.initialState({ seed: 2718, theater: "lowland" });
  const world = cognition.worldSnapshotFromGameState(state, "proof-r1");
  const surface = cognition.compileSurfaceAst(
    "calculate legitimacy",
    semantic,
    cognition.DELENDA_COGNITIVE_DOMAIN,
  );
  const semanticTree = cognition.resolveSemanticTree({
    surface,
    world,
    domain: cognition.DELENDA_COGNITIVE_DOMAIN,
  });
  return { state, domain: cognition.DELENDA_COGNITIVE_DOMAIN, world, semanticTree };
};

const datum = (value) => ({
  kind: Array.isArray(value)
    ? "LIST"
    : typeof value === "number"
      ? "NUMBER"
      : typeof value === "boolean"
        ? "BOOLEAN"
        : typeof value === "string"
          ? "STRING"
          : "RECORD",
  value,
  sourceIds: [],
  proofIds: [],
  authority: "READ_ONLY",
});

const resealProofGraph = (graph) => {
  const clone = structuredClone(graph);
  delete clone.digest;
  return { ...clone, digest: cognition.cognitiveDigest(clone) };
};

const program = (ctx, nodes, outputNodeId) => ({
  id: "proof-program",
  version: "1",
  semanticTreeDigest: ctx.semanticTree.digest,
  worldRevision: ctx.world.revision,
  authorityCeiling: "READ_ONLY",
  nodes,
  outputNodeId,
});

test("completed operator programs produce a sealed, complete canonical proof graph", () => {
  const ctx = context();
  const compiled = program(ctx, [
    {
      id: "sum",
      operator: "SUM",
      inputs: { values: { kind: "LITERAL", datum: datum([3, 4]) } },
    },
    {
      id: "ratio",
      operator: "RATIO",
      inputs: {
        numerator: { kind: "NODE", nodeId: "sum" },
        denominator: { kind: "LITERAL", datum: datum(7) },
      },
    },
  ], "ratio");
  const result = cognition.executeCognitiveProgram(compiled, ctx);
  const graph = cognition.buildOperatorProofGraph({
    program: compiled,
    result,
    world: ctx.world,
  });
  assert.equal(graph.status, "COMPLETE");
  assert.deepEqual(cognition.validateCanonicalProofGraph(graph), { ok: true });
  assert.equal(graph.executionDigest, result.digest);
  assert.equal(graph.obligations.missing.length, 0);
  assert.ok(graph.nodes.some((node) => node.operatorId === "RATIO"));
});

test("Nexus response and cognitive execution compose into one sealed proof", () => {
  const ctx = context();
  const compiled = program(ctx, [{
    id: "count",
    operator: "COUNT",
    inputs: { values: { kind: "LITERAL", datum: datum([1, 2]) } },
  }], "count");
  const result = cognition.executeCognitiveProgram(compiled, ctx);
  const cognitiveGraph = cognition.buildOperatorProofGraph({
    program: compiled,
    result,
    world: ctx.world,
  });
  const responseGraph = cognition.buildNexusProofGraph({
    worldRevision: ctx.world.revision,
    request: { operation: "COUNT" },
    response: {
      status: "OK",
      fact: { count: 2 },
      rendering: { compact: "2", brief: "Two items." },
      campaignRevision: ctx.world.revision,
    },
  });
  assert.throws(
    () => cognition.composeCanonicalProofGraphs(responseGraph, cognitiveGraph),
    /not bound to the cognitive execution/i,
  );
  const boundResponse = cognition.bindResponseProofToExecution(
    responseGraph,
    result.digest,
  );
  assert.equal(
    cognition.bindResponseProofToExecution(boundResponse, result.digest).digest,
    boundResponse.digest,
  );
  assert.equal(boundResponse.executionDigest, result.digest);
  assert.ok(
    boundResponse.obligations.satisfied.includes(
      "cognitive-execution-binding",
    ),
  );
  const composed = cognition.composeCanonicalProofGraphs(
    boundResponse,
    cognitiveGraph,
  );
  assert.deepEqual(cognition.validateCanonicalProofGraph(composed), { ok: true });
  assert.equal(composed.executionDigest, result.digest);
  assert.equal(composed.rootClaimIds.length, 1);
  assert.ok(composed.nodes.some((node) => node.id.startsWith("response:")));
  assert.ok(composed.nodes.some((node) => node.id.startsWith("cognitive:")));
  const otherRevisionResponse = cognition.buildNexusProofGraph({
    worldRevision: "other-revision",
    request: { operation: "COUNT" },
    response: {
      status: "OK",
      fact: { count: 2 },
      rendering: { compact: "2", brief: "Two items." },
      campaignRevision: "other-revision",
    },
  });
  assert.throws(
    () => cognition.composeCanonicalProofGraphs(
      cognition.bindResponseProofToExecution(
        otherRevisionResponse,
        result.digest,
      ),
      cognitiveGraph,
    ),
    /world revisions do not match/i,
  );
  const forgedBinding = cognition.buildNexusProofGraph({
    worldRevision: ctx.world.revision,
    request: { operation: "COUNT" },
    response: {
      status: "OK",
      fact: { count: 2 },
      rendering: { compact: "2", brief: "Two items." },
      campaignRevision: ctx.world.revision,
    },
    executionDigest: "forged-execution",
  });
  assert.throws(
    () =>
      cognition.bindResponseProofToExecution(
        forgedBinding,
        result.digest,
      ),
    /different cognitive execution/i,
  );

  const obligationOnly = structuredClone(responseGraph);
  obligationOnly.executionDigest = result.digest;
  obligationOnly.obligations.required = [
    ...obligationOnly.obligations.required,
    "cognitive-execution-binding",
  ].sort();
  obligationOnly.obligations.satisfied = [
    ...obligationOnly.obligations.satisfied,
    "cognitive-execution-binding",
  ].sort();
  const resealedBypass = resealProofGraph(obligationOnly);
  assert.deepEqual(cognition.validateCanonicalProofGraph(resealedBypass), {
    ok: true,
  });
  assert.throws(
    () =>
      cognition.bindResponseProofToExecution(
        resealedBypass,
        result.digest,
      ),
    /cognitive execution binding/i,
  );
});

test("blocked operator programs retain their adapter blocker and missing obligations", () => {
  const ctx = context();
  const compiled = program(ctx, [{
    id: "forecast",
    operator: "FORECAST",
    inputs: { request: { kind: "LITERAL", datum: datum({ horizon: "short" }) } },
  }], "forecast");
  const result = cognition.executeCognitiveProgram(compiled, ctx);
  const graph = cognition.buildOperatorProofGraph({ program: compiled, result, world: ctx.world });
  assert.equal(graph.status, "BLOCKED");
  assert.ok(graph.obligations.missing.some((item) => item.endsWith("operator:forecast")));
  assert.ok(graph.nodes.some((node) => /temporal-engine/.test(node.claim)));
  assert.deepEqual(cognition.validateCanonicalProofGraph(graph), { ok: true });
});

test("operator proof construction rejects a post-hoc altered execution result", () => {
  const ctx = context();
  const compiled = program(ctx, [{
    id: "count",
    operator: "COUNT",
    inputs: { values: { kind: "LITERAL", datum: datum([1, 2]) } },
  }], "count");
  const result = cognition.executeCognitiveProgram(compiled, ctx);
  const forged = structuredClone(result);
  forged.output.value = 999;
  assert.throws(
    () => cognition.buildOperatorProofGraph({ program: compiled, result: forged, world: ctx.world }),
    /result digest mismatch/i,
  );
});

test("operator proof construction rejects results replayed across programs", () => {
  const ctx = context();
  const expectedProgram = program(ctx, [{
    id: "count",
    operator: "COUNT",
    inputs: { values: { kind: "LITERAL", datum: datum([1, 2]) } },
  }], "count");
  const otherProgram = { ...expectedProgram, id: "other-proof-program" };
  const otherResult = cognition.executeCognitiveProgram(otherProgram, ctx);
  assert.equal(otherResult.status, "COMPLETED");
  assert.throws(
    () => cognition.buildOperatorProofGraph({
      program: expectedProgram,
      result: otherResult,
      world: ctx.world,
    }),
    /different cognitive program/i,
  );

  const differentTopology = program(ctx, [{
    id: "count",
    operator: "SUM",
    inputs: { values: { kind: "LITERAL", datum: datum([1, 2]) } },
  }], "count");
  const topologyResult = cognition.executeCognitiveProgram(differentTopology, ctx);
  assert.equal(topologyResult.status, "COMPLETED");
  assert.throws(
    () => cognition.buildOperatorProofGraph({
      program: expectedProgram,
      result: topologyResult,
      world: ctx.world,
    }),
    /does not match the program operator/i,
  );
});

test("Nexus proof identity excludes nested authority secrets but retains public action IDs", () => {
  const response = (overrides = {}) => ({
    status: "OK",
    fact: {
      accepted: true,
      action: {
        id: "action-alpha",
        optionId: "option-one",
        resolutionTicket: "private-response-ticket-a",
      },
      ...overrides,
    },
    rendering: { compact: "Ready", brief: "The action is ready." },
    campaignRevision: "proof-public-r1",
  });
  const request = {
    kind: "EXECUTE",
    origin: "web",
    expectedStateSeal: "private-state-seal-a",
    idempotencyKey: "private-idempotency-a",
    action: {
      id: "action-alpha",
      optionId: "option-one",
      details: {
        resolutionTicket: "private-resolution-ticket-a",
      },
    },
    authority: {
      resolutionGrant: {
        grantId: "private-grant-a",
        accountDayKey: "private-day-a",
      },
      confirmation: { token: "private-confirmation-a" },
      proposalToken: "private-proposal-a",
    },
  };
  const changedSecrets = structuredClone(request);
  changedSecrets.origin = "ssh";
  changedSecrets.expectedStateSeal = "private-state-seal-b";
  changedSecrets.idempotencyKey = "private-idempotency-b";
  changedSecrets.action.details.resolutionTicket = "private-resolution-ticket-b";
  changedSecrets.authority.resolutionGrant.grantId = "private-grant-b";
  changedSecrets.authority.resolutionGrant.accountDayKey = "private-day-b";
  changedSecrets.authority.confirmation.token = "private-confirmation-b";
  changedSecrets.authority.proposalToken = "private-proposal-b";

  const proof = (requestValue, responseValue = response()) => cognition.buildNexusProofGraph({
    worldRevision: "proof-public-r1",
    request: requestValue,
    response: responseValue,
  });
  assert.equal(proof(request).digest, proof(changedSecrets).digest);
  assert.equal(
    proof(request, response()).digest,
    proof(request, response({
      action: {
        id: "action-alpha",
        optionId: "option-one",
        resolutionTicket: "private-response-ticket-b",
      },
    })).digest,
  );

  const changedPublicAction = structuredClone(request);
  changedPublicAction.action.id = "action-bravo";
  assert.notEqual(proof(request).digest, proof(changedPublicAction).digest);
  const changedPublicOption = structuredClone(request);
  changedPublicOption.action.optionId = "option-two";
  assert.notEqual(proof(request).digest, proof(changedPublicOption).digest);
  assert.notEqual(
    proof(request, response()).digest,
    proof(request, response({
      action: {
        id: "action-bravo",
        optionId: "option-one",
        resolutionTicket: "private-response-ticket-a",
      },
    })).digest,
  );

  const preparedResponse = (proposalToken) => ({
    status: "PREPARED",
    fact: {
      normalizedAction: {
        choiceId: "choice-one",
        mechanicId: "choice-one",
        title: "Choice One",
      },
      campaignId: "campaign-public",
      campaignRevision: "proof-public-r1",
      orderCost: 1,
      ordersBefore: 3,
      ordersAfter: 2,
      knownConsequences: [],
      reversible: false,
      expiresAt: "2026-07-31T12:10:00.000Z",
      proposalToken,
      confirmationPhrase: `confirm ${proposalToken}`,
    },
    rendering: {
      compact: "ORDER PREPARED",
      brief: `Choice One. Confirm with confirm ${proposalToken}`,
    },
    campaignRevision: "proof-public-r1",
  });
  const preparedA = proof(
    request,
    preparedResponse("private-proposal-a"),
  );
  const preparedB = proof(
    changedSecrets,
    preparedResponse("private-proposal-b"),
  );
  assert.equal(preparedA.digest, preparedB.digest);
  for (const graph of [preparedA, preparedB]) {
    const serialized = JSON.stringify(graph);
    for (const secret of ["private-proposal-a", "private-proposal-b"])
      assert.equal(serialized.includes(secret), false);
  }
});

test("prepared orders compose with cognition without retaining proposal tokens", () => {
  const state = game.initialState({ seed: 9393 });
  const contextFor = () => ({
    playerId: "proof-player",
    campaignId: state.campaignId,
    campaignRevision: nexus.avaNexusStateRevision(state),
    surface: "web",
    authority: "command",
    nowMs: 1_700_010_000_000,
  });
  const docket = nexus.runAvaNexusLine(
    "production",
    contextFor(),
    state,
    nexus.createAvaNexusSession(),
  );
  const choice = docket.response.fact.choices[0];
  const prepare = (idempotencyKey) =>
    nexus.runAvaNexusRequest(
      {
        kind: "action",
        origin: "browser-ui",
        action: {
          kind: "directive",
          familyId: choice.familyId,
          choiceId: choice.choiceId,
        },
        mode: "execute",
        idempotencyKey,
        expectedStateSeal: nexus.avaNexusStateRevision(docket.state),
      },
      contextFor(),
      docket.state,
      nexus.createAvaNexusSession(),
    );
  const preparedA = prepare("private-idempotency-a");
  const preparedB = prepare("private-idempotency-b");
  assert.equal(preparedA.response.status, "PREPARED", preparedA.text);
  assert.equal(preparedB.response.status, "PREPARED", preparedB.text);
  assert.notEqual(
    preparedA.response.fact.proposalToken,
    preparedB.response.fact.proposalToken,
  );
  assert.equal(preparedA.proofGraph.digest, preparedB.proofGraph.digest);
  assert.ok(preparedA.cognitiveActivation);
  assert.ok(preparedA.proofGraph.executionDigest);
  assert.ok(
    preparedA.proofGraph.nodes.some((node) => node.id.startsWith("response:")),
  );
  assert.ok(
    preparedA.proofGraph.nodes.some((node) => node.id.startsWith("cognitive:")),
  );
  assert.deepEqual(cognition.validateCanonicalProofGraph(preparedA.proofGraph), {
    ok: true,
  });
  assert.deepEqual(cognition.validateCanonicalProofGraph(preparedB.proofGraph), {
    ok: true,
  });
  for (const prepared of [preparedA, preparedB]) {
    const serialized = JSON.stringify(prepared.proofGraph);
    for (const secret of [
      preparedA.response.fact.proposalToken,
      preparedB.response.fact.proposalToken,
    ])
      assert.equal(serialized.includes(secret), false);
  }
});

test("explanation modes select different subsets of one immutable graph", () => {
  const graph = cognition.buildAdvisoryProofGraph({
    worldRevision: "world-1",
    semantic: { ...semantic, operation: "ADVISE" },
    answerPlan: {
      answerType: "COMPARATIVE_RECOMMENDATION",
      directAnswer: "Take the first course.",
      rankedOptions: ["first", "second"],
      decisiveReasons: ["It preserves readiness."],
      tradeoffs: ["It spends materiel."],
      cautions: [],
      assumptions: [],
      alternatives: [{ criterion: "risk", optionId: "second" }],
      calculationDisclosure: "NONE",
      stateRevision: "world-1",
      structureId: "answer-contrast",
      clauseIds: ["answer", "contrast"],
    },
    retrievedFacts: ["Readiness is currently constrained."],
  });
  const concise = cognition.selectProofExplanation(graph, "CONCISE");
  const full = cognition.selectProofExplanation(graph, "FULL_PROOF");
  assert.equal(concise.graphDigest, full.graphDigest);
  assert.ok(full.nodeIds.length > concise.nodeIds.length);
  assert.ok(full.nodeIds.every((id) => graph.nodes.some((node) => node.id === id)));
});

test("forged, dangling, and orphaned proof material fails validation", () => {
  const graph = cognition.buildAdvisoryProofGraph({
    worldRevision: "world-2",
    semantic,
    answerPlan: {
      answerType: "EXPLANATION",
      directAnswer: "Legitimacy is visible.",
      rankedOptions: [], decisiveReasons: [], tradeoffs: [], cautions: [],
      assumptions: [], alternatives: [], calculationDisclosure: "NONE",
      stateRevision: "world-2", structureId: "explain", clauseIds: ["answer"],
    },
    retrievedFacts: ["Legitimacy is 50."],
  });
  const forged = structuredClone(graph);
  forged.nodes[0].claim = "Post-hoc invented evidence";
  const altered = cognition.validateCanonicalProofGraph(forged);
  assert.equal(altered.ok, false);
  assert.ok(altered.issues.some((issue) => /digest mismatch/.test(issue)));

  const dangling = structuredClone(graph);
  dangling.nodes.find((node) => node.id === dangling.rootClaimIds[0]).dependencyIds.push("missing:node");
  const invalid = cognition.validateCanonicalProofGraph(dangling);
  assert.equal(invalid.ok, false);
  assert.ok(invalid.issues.some((issue) => /dangling dependency/.test(issue)));

  const orphaned = structuredClone(graph);
  orphaned.nodes.push({
    id: "source:orphan",
    kind: "SOURCE",
    status: "PROVEN",
    claim: "Hidden after-the-fact evidence",
    dependencyIds: [],
    sourceIds: ["source:orphan"],
  });
  const orphanValidation = cognition.validateCanonicalProofGraph(orphaned);
  assert.equal(orphanValidation.ok, false);
  assert.ok(orphanValidation.issues.some((issue) => /orphan proof node/.test(issue)));
});

test("Nexus exposes the same advisory proof graph at result, envelope, and Terminal", () => {
  const state = game.initialState({ seed: 8181 });
  const ctx = {
    playerId: "proof-player",
    campaignId: state.campaignId,
    campaignRevision: nexus.avaNexusStateRevision(state),
    surface: "web",
    authority: "command",
    nowMs: 1_700_010_000_000,
  };
  const result = nexus.runAvaNexusLine(
    "what should I do",
    ctx,
    state,
    nexus.createAvaNexusSession(),
  );
  assert.equal(result.proofGraph.digest, result.envelope.proofGraph.digest);
  assert.equal(result.proofGraph.digest, result.terminalResult.proofGraph.digest);
  assert.deepEqual(cognition.validateCanonicalProofGraph(result.proofGraph), { ok: true });
});

test("equivalent web, SSH, and MCP requests retain surface-independent proof identity", () => {
  const state = game.initialState({ seed: 9191 });
  const run = (surface) => nexus.runAvaNexusLine(
    "what should I do",
    {
      playerId: "proof-player",
      campaignId: state.campaignId,
      campaignRevision: nexus.avaNexusStateRevision(state),
      surface,
      authority: "command",
      nowMs: 1_700_010_000_000,
    },
    state,
    nexus.createAvaNexusSession(),
  );
  const digests = ["web", "ssh", "mcp"].map((surface) => run(surface).proofGraph.digest);
  assert.equal(new Set(digests).size, 1);
});

test("JUSTIFY and category challenge do not inherit unexecuted ranking or falsification duties", () => {
  const plan = {
    answerType: "EXPLANATION",
    directAnswer: "The prior recommendation follows from its retained reason.",
    rankedOptions: ["first"],
    decisiveReasons: ["retained reason"],
    tradeoffs: [], cautions: [], assumptions: [], alternatives: [],
    calculationDisclosure: "NONE", stateRevision: "world-3",
    structureId: "justify", clauseIds: ["answer", "reason"],
  };
  const justify = cognition.buildAdvisoryProofGraph({
    worldRevision: "world-3",
    semantic: { ...semantic, operation: "JUSTIFY" },
    answerPlan: plan,
    retrievedFacts: ["retained reason"],
  });
  const challenge = cognition.buildAdvisoryProofGraph({
    worldRevision: "world-3",
    semantic: { ...semantic, operation: "CHALLENGE" },
    answerPlan: plan,
    retrievedFacts: ["categories remain separate"],
  });
  assert.equal(justify.obligations.required.includes("decision-ranking"), false);
  assert.equal(challenge.obligations.required.includes("decision-ranking"), false);
  assert.equal(challenge.obligations.required.includes("falsification"), false);
  assert.ok(challenge.obligations.required.includes("challenge-basis"));
});
