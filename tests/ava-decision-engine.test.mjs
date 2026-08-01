import assert from "node:assert/strict";
import test from "node:test";

const cognition = await import(process.env.DELENDA_AVA_COGNITIVE_BUNDLE);
const game = await import(process.env.DELENDA_SUBSTRATE_GAME_BUNDLE);

const context = () => {
  const state = game.initialState({ seed: 9090, theater: "river" });
  const base = cognition.worldSnapshotFromGameState(state, "decision-r1");
  const input = structuredClone(base); delete input.digest;
  const sourceId = input.sources[0].id;
  const projections = [
    ["a", "state.readiness", 90, { kind: "INTERVAL", low: 85, high: 95 }],
    ["a", "state.front", 0, { kind: "INTERVAL", low: -1, high: 1 }],
    ["a", "state.treasury", 90, { kind: "EXACT" }],
    ["b", "state.readiness", 50, { kind: "INTERVAL", low: 48, high: 52 }],
    ["b", "state.front", 8, { kind: "INTERVAL", low: 7, high: 9 }],
    ["b", "state.treasury", 20, { kind: "EXACT" }],
    ["c", "state.readiness", 100, { kind: "EXACT" }],
    ["c", "state.front", -13, { kind: "EXACT" }],
    ["c", "state.treasury", 100, { kind: "EXACT" }],
  ].map(([candidate, variableId, value, uncertainty]) => ({
    id: `projection:${candidate}:${variableId}`, variableId, entityId: candidate,
    value, visibility: "AVA_VISIBLE", sourceIds: [sourceId], lineage: [],
    validFromDay: state.day, observedAtDay: state.day, uncertainty,
  }));
  const world = cognition.compileWorldSnapshot({ ...input, facts: [...input.facts, ...projections] }, cognition.DELENDA_COGNITIVE_DOMAIN);
  return { world, domain: cognition.DELENDA_COGNITIVE_DOMAIN };
};

const candidate = (world, id) => ({
  id, scenarioId: "scenario:choice",
  metricFactIds: {
    readiness: `projection:${id}:state.readiness`,
    front: `projection:${id}:state.front`,
    treasury: `projection:${id}:state.treasury`,
  },
  feasibilityRequest: { id: `feasible:${id}`, expectedWorldRevision: world.revision, constraintIds: ["front-survivable", "atrocity-doctrine-limit"] },
});

const analysis = (world, kind = "RANK", modelId = "strategic-balance") => ({
  kind, id: `${kind.toLowerCase()}-request`, expectedWorldRevision: world.revision,
  scenarioId: "scenario:choice", modelId, candidates: [candidate(world, "a"), candidate(world, "b"), candidate(world, "c")],
});

test("decision compiler closes metrics, normalization, objectives, and weights", () => {
  const domain = cognition.DELENDA_COGNITIVE_DOMAIN;
  assert.deepEqual(domain.manifest.decisionModelIds, [
    "directive-strategic-posture",
    "front-priority",
    "strategic-balance",
  ]);
  assert.deepEqual(domain.decision.metrics.get("treasury").normalization, {
    kind: "POSITIVE_SATURATION", minimum: 0, scale: 80,
  });
  const directiveModel = domain.decision.models.get(
    "directive-strategic-posture",
  );
  assert.ok(directiveModel);
  assert.equal(
    directiveModel.objectives.reduce(
      (sum, objective) => sum + objective.weight,
      0,
    ),
    1,
  );
  assert.deepEqual(
    directiveModel.objectives.find(
      (objective) => objective.metricId === "directive-legal",
    ),
    { metricId: "directive-legal", weight: 0, hardMinimum: 1 },
  );
  assert.equal(
    cognition.DIRECTIVE_DECISION_COMPONENTS.reduce(
      (sum, component) =>
        sum +
        directiveModel.objectives.find(
          (objective) => objective.metricId === component.metricId,
        ).weight,
      0,
    ),
    1,
  );
  const baseWorld = cognition.worldSnapshotFromGameState(
    game.initialState({ seed: 41 }),
    "directive-projection-only-r1",
  );
  assert.equal(
    baseWorld.facts.some((fact) => fact.variableId.startsWith("directive.")),
    false,
    "candidate-only directive facts leaked into authoritative GameState projection",
  );
  const weights = structuredClone(cognition.DELENDA_COGNITIVE_DOMAIN_SPEC);
  weights.decision.models[0].objectives[0].weight = 0.9;
  assert.throws(() => cognition.compileCognitiveDomain(weights), /weights must sum to one/i);
  const open = structuredClone(cognition.DELENDA_COGNITIVE_DOMAIN_SPEC);
  open.decision.models[0].objectives[0].metricId = "invented";
  assert.throws(() => cognition.compileCognitiveDomain(open), /unknown metric/i);
  const invalidNormalization = structuredClone(cognition.DELENDA_COGNITIVE_DOMAIN_SPEC);
  invalidNormalization.decision.metrics.find((metric) => metric.id === "treasury").normalization.scale = 0;
  assert.throws(() => cognition.compileCognitiveDomain(invalidNormalization), /saturation normalization is invalid/i);
  const inventedNormalization = structuredClone(cognition.DELENDA_COGNITIVE_DOMAIN_SPEC);
  inventedNormalization.decision.metrics.find((metric) => metric.id === "treasury").normalization = { kind: "INVENTED", minimum: 0, scale: 80 };
  assert.throws(() => cognition.compileCognitiveDomain(inventedNormalization), /normalization kind is unknown/i);
});

test("candidate costs remain decision-sensitive above the old treasury ceiling", () => {
  const state = game.initialState({ seed: 9090, theater: "river" });
  assert.equal(state.treasury, 238);
  const base = cognition.worldSnapshotFromGameState(state, "decision-cost-r1");
  const input = structuredClone(base); delete input.digest;
  const sourceId = input.sources[0].id;
  const facts = [
    ["cheap", "state.readiness", 70], ["cheap", "state.front", 1], ["cheap", "state.treasury", state.treasury - 2],
    ["costly", "state.readiness", 70], ["costly", "state.front", 1], ["costly", "state.treasury", state.treasury - 14],
  ].map(([id, variableId, value]) => ({
    id: `projection:${id}:${variableId}`, variableId, entityId: id,
    value, visibility: "AVA_VISIBLE", sourceIds: [sourceId], lineage: [],
    validFromDay: state.day, observedAtDay: state.day, uncertainty: { kind: "EXACT" },
  }));
  const world = cognition.compileWorldSnapshot({ ...input, facts: [...input.facts, ...facts] }, cognition.DELENDA_COGNITIVE_DOMAIN);
  const projectedCandidate = (id) => ({
    ...candidate(world, id),
    feasibilityRequest: {
      id: `feasible:${id}`, expectedWorldRevision: world.revision,
      constraintIds: ["front-survivable", "atrocity-doctrine-limit"],
    },
  });
  const result = cognition.executeDecisionRequest({
    kind: "RANK", id: "rank-cost-sensitivity", expectedWorldRevision: world.revision,
    scenarioId: "scenario:choice", modelId: "strategic-balance",
    candidates: [projectedCandidate("costly"), projectedCandidate("cheap")],
  }, world, cognition.DELENDA_COGNITIVE_DOMAIN);
  const cheap = result.candidates.find((item) => item.candidateId === "cheap");
  const costly = result.candidates.find((item) => item.candidateId === "costly");
  const cheapTreasury = cheap.metrics.find((metric) => metric.metricId === "treasury");
  const costlyTreasury = costly.metrics.find((metric) => metric.metricId === "treasury");
  assert.equal(result.winnerId, "cheap");
  assert.ok(cheapTreasury.normalized.low > costlyTreasury.normalized.high);
  assert.ok(cheap.utility.low > costly.utility.high);
});

test("robust ranking carries uncertainty, hard objectives, regret, and tradeoffs", () => {
  const { world, domain } = context();
  const result = cognition.executeDecisionRequest(analysis(world), world, domain);
  assert.equal(result.status, "ANALYZED");
  assert.equal(result.winnerId, "a");
  assert.equal(result.candidates.find((item) => item.candidateId === "c").hardObjectivesSatisfied, false);
  assert.ok(result.candidates.every((item) => item.worstCaseRegret >= 0));
  assert.ok(result.tradeoffs.some((item) => item.startsWith("front:b>")));
});

test("Pareto dominance is metric-wise and preserves incomparable candidates", () => {
  const { world, domain } = context();
  const result = cognition.executeDecisionRequest(analysis(world, "PARETO"), world, domain);
  assert.deepEqual(result.paretoFront, ["a", "b"]);
  assert.ok(result.candidates.find((item) => item.candidateId === "c").dominatedBy.length > 0);
});

test("falsification replays analysis instead of accepting a caller result", () => {
  const { world, domain } = context();
  const falsified = cognition.executeDecisionRequest({
    kind: "FALSIFY", id: "falsify", expectedWorldRevision: world.revision,
    scenarioId: "scenario:choice", analysis: analysis(world), claimedWinnerId: "b",
  }, world, domain);
  assert.equal(falsified.status, "FALSIFIED");
  assert.equal(falsified.winnerId, "a");
});

test("sensitivity varies only across compiler-approved models", () => {
  const { world, domain } = context();
  const result = cognition.executeDecisionRequest({
    kind: "SENSITIVITY", id: "sensitivity", expectedWorldRevision: world.revision,
    scenarioId: "scenario:choice", analysis: analysis(world), alternateModelId: "front-priority",
  }, world, domain);
  assert.equal(result.status, "SENSITIVE");
  assert.equal(result.winnerId, "a");
  assert.equal(result.alternateWinnerId, "b");
});

test("hidden lineage, stale revisions, cross-scenario facts, and ad hoc models fail closed", () => {
  const { world, domain } = context();
  assert.throws(() => cognition.executeDecisionRequest({ ...analysis(world), modelId: "ad-hoc" }, world, domain), /not compiler-approved/i);
  assert.throws(() => cognition.executeDecisionRequest({ ...analysis(world), expectedWorldRevision: "stale" }, world, domain), /revision is stale/i);
  const crossed = analysis(world); crossed.candidates[0].scenarioId = "scenario:other";
  assert.throws(() => cognition.executeDecisionRequest(crossed, world, domain), /crosses scenario scope/i);
  const hidden = structuredClone(world); delete hidden.digest;
  hidden.facts.find((fact) => fact.id === "projection:a:state.front").visibility = "HIDDEN";
  const hiddenWorld = cognition.compileWorldSnapshot(hidden, domain);
  assert.throws(() => cognition.executeDecisionRequest(analysis(hiddenWorld), hiddenWorld, domain), /hidden or absent metric fact/i);
  const crossedProjection = analysis(world);
  crossedProjection.candidates[0].metricFactIds.front =
    crossedProjection.candidates[1].metricFactIds.front;
  assert.throws(
    () => cognition.executeDecisionRequest(crossedProjection, world, domain),
    /projection belongs to b, not a/i,
  );
});

test("equivalent candidate order canonicalizes to one decision digest", () => {
  const { world, domain } = context();
  const left = analysis(world);
  const right = { ...left, candidates: [...left.candidates].reverse() };
  assert.equal(cognition.executeDecisionRequest(left, world, domain).digest, cognition.executeDecisionRequest(right, world, domain).digest);
});

test("all eight decision primitives share one typed proof-bearing adapter", () => {
  const { world, domain } = context();
  const semantic = { operation: "PREDICT", subject: { type: "CAMPAIGN_CHOICE", entityIds: [] }, scope: { group: "ALL", domains: ["MAIN"], excludedDomains: [] }, timeframe: "PROJECTED", criteria: ["OVERALL_VALUE"], polarity: "AFFIRMATIVE", requestedDetail: "REASONS", perspective: "PLAYER", outputForm: "TERMINAL", overlays: [], confidence: 1, sourceSpans: {} };
  const surface = cognition.compileSurfaceAst("compare plans", semantic, domain);
  const semanticTree = cognition.resolveSemanticTree({ surface, world, domain });
  const requests = Object.fromEntries(["COMPARE", "SCORE", "RANK", "OPTIMIZE", "DOMINANCE", "PARETO"].map((kind) => [kind, analysis(world, kind)]));
  requests.FALSIFY = { kind: "FALSIFY", id: "f", expectedWorldRevision: world.revision, scenarioId: "scenario:choice", analysis: analysis(world), claimedWinnerId: "a" };
  requests.SENSITIVITY = { kind: "SENSITIVITY", id: "s", expectedWorldRevision: world.revision, scenarioId: "scenario:choice", analysis: analysis(world), alternateModelId: "front-priority" };
  for (const operator of Object.keys(requests)) {
    const program = { id: `decision-${operator}`, version: "1", semanticTreeDigest: semanticTree.digest, worldRevision: world.revision, authorityCeiling: "READ_ONLY", nodes: [{ id: "decision", operator, inputs: { request: { kind: "LITERAL", datum: { kind: "RECORD", value: requests[operator], sourceIds: [], proofIds: [], authority: "READ_ONLY" } } } }], outputNodeId: "decision" };
    const result = cognition.executeCognitiveProgram(program, { domain, world, semanticTree, adapters: cognition.decisionEngineAdapters });
    assert.equal(result.status, "COMPLETED", result.blocker);
    assert.ok(result.output.proofIds.includes("decision-engine-proof"));
  }
});
