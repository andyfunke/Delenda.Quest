import assert from "node:assert/strict";
import test from "node:test";

const cognition = await import(process.env.DELENDA_AVA_COGNITIVE_BUNDLE);
const game = await import(process.env.DELENDA_SUBSTRATE_GAME_BUNDLE);

const context = (revision = "causal-r1") => {
  const state = game.initialState({ seed: 7070, theater: "river" });
  const world = cognition.worldSnapshotFromGameState(state, revision);
  return { state, world, domain: cognition.DELENDA_COGNITIVE_DOMAIN };
};

const scenario = (world, input = {}) => ({
  kind: "SCENARIO",
  id: "scenario-request",
  expectedWorldRevision: world.revision,
  scenarioId: "scenario:withdraw-support",
  interventions: [{ variableId: "state.materiel", value: 0, role: "TREATMENT" }],
  assumptions: ["Equipment remains at its visible value"],
  horizonPhases: 4,
  ...input,
});

test("causal compiler owns an acyclic structural model with bounded delays", () => {
  const domain = cognition.DELENDA_COGNITIVE_DOMAIN;
  assert.deepEqual(domain.manifest.causalEquationIds, ["front-from-readiness", "readiness-from-support"]);
  assert.deepEqual(domain.causal.order, ["readiness-from-support", "front-from-readiness"]);
  const cycle = structuredClone(cognition.DELENDA_COGNITIVE_DOMAIN_SPEC);
  cycle.causal.equations.find((item) => item.id === "readiness-from-support").inputs[0].variableId = "state.front";
  assert.throws(() => cognition.compileCognitiveDomain(cycle), /causal graph contains a cycle/i);
  const delayed = structuredClone(cognition.DELENDA_COGNITIVE_DOMAIN_SPEC);
  delayed.causal.equations[0].delayPhases = 99;
  assert.throws(() => cognition.compileCognitiveDomain(delayed), /delay exceeds temporal policy/i);
});

test("surgical interventions propagate only through compiler-approved equations", () => {
  const { world, domain } = context();
  const result = cognition.executeCausalRequest(scenario(world), world, domain);
  assert.equal(result.status, "INTERVENTION_PROPAGATED");
  assert.deepEqual(result.changes.map((change) => change.variableId), [
    "state.materiel",
    "state.readiness",
    "state.front",
  ]);
  const readiness = result.changes.find((change) => change.variableId === "state.readiness");
  assert.equal(readiness.equationId, "readiness-from-support");
  assert.deepEqual(readiness.interventionIds, ["state.materiel"]);
  assert.ok(readiness.sourceFactIds.includes("intervention:scenario:withdraw-support:state.materiel"));
});

test("intervening on an endogenous variable severs its incoming equation", () => {
  const { world, domain } = context();
  const result = cognition.executeCausalRequest(scenario(world, {
    scenarioId: "scenario:readiness-control",
    interventions: [{ variableId: "state.readiness", value: 50, role: "CONTROL" }],
  }), world, domain);
  const readiness = result.changes.find((change) => change.variableId === "state.readiness");
  assert.equal(readiness.counterfactual, 50);
  assert.equal(readiness.equationId, undefined);
  assert.deepEqual(readiness.interventionIds, ["state.readiness"]);
  assert.ok(result.changes.some((change) => change.variableId === "state.front"));
});

test("counterfactuals retain baseline, intervention, assumptions, delays, and proof", () => {
  const { world, domain } = context();
  const result = cognition.executeCausalRequest({
    kind: "COUNTERFACTUAL",
    id: "counterfactual-1",
    expectedWorldRevision: world.revision,
    scenario: scenario(world),
  }, world, domain);
  assert.equal(result.status, "COUNTERFACTUAL_COMPUTED");
  assert.ok(result.changes.every((change) => change.baseline !== change.counterfactual));
  assert.ok(result.changes.find((change) => change.variableId === "state.front").arrivalPhase === 2);
  assert.deepEqual(result.assumptions, ["Equipment remains at its visible value"]);
  assert.ok(result.proofIds.includes("baseline-counterfactual-comparison"));
});

test("cause identification requires replayed intervention; observation remains candidates only", () => {
  const { world, domain } = context();
  const identified = cognition.executeCausalRequest({
    kind: "FIND_CAUSE",
    id: "find-1",
    expectedWorldRevision: world.revision,
    effectVariableId: "state.front",
    scenario: scenario(world),
  }, world, domain);
  assert.equal(identified.status, "IDENTIFIED_BY_INTERVENTION");
  assert.deepEqual(identified.causeVariableIds, ["state.materiel"]);

  const observed = cognition.executeCausalRequest({
    kind: "FIND_CAUSE",
    id: "find-observed",
    expectedWorldRevision: world.revision,
    effectVariableId: "state.front",
    observationalFactIds: ["fact:state.readiness"],
  }, world, domain);
  assert.equal(observed.status, "CANDIDATES_ONLY");
  assert.equal(observed.causeVariableIds.length, 0);
  assert.ok(observed.candidateVariableIds.includes("state.readiness"));

  const fabricated = cognition.executeCausalRequest({
    kind: "FIND_CAUSE",
    id: "find-forged",
    expectedWorldRevision: world.revision,
    effectVariableId: "state.front",
    scenario: { status: "INTERVENTION_PROPAGATED", changes: [{ variableId: "state.front" }] },
  }, world, domain);
  assert.equal(fabricated.status, "CANDIDATES_ONLY");
});

test("hidden, stale, contradictory, irrelevant, and malformed causal inputs fail closed", () => {
  const { world, domain } = context();
  assert.throws(() => cognition.executeCausalRequest(scenario(world, {
    expectedWorldRevision: "stale",
  }), world, domain), /revision is stale/i);
  assert.throws(() => cognition.executeCausalRequest(scenario(world, {
    interventions: [
      { variableId: "state.materiel", value: 1, role: "TREATMENT" },
      { variableId: "state.materiel", value: 2, role: "CONTROL" },
    ],
  }), world, domain), /repeats an intervention target/i);
  assert.throws(() => cognition.executeCausalRequest(scenario(world, {
    interventions: [{ variableId: "state.materiel", value: 1, role: "INSTRUMENT" }],
  }), world, domain), /invalid causal role/i);
  assert.throws(() => cognition.executeCausalRequest({
    kind: "FIND_CAUSE", id: "irrelevant", expectedWorldRevision: world.revision,
    effectVariableId: "state.front", observationalFactIds: ["fact:state.treasury"],
  }, world, domain), /irrelevant to the causal path/i);

  const hiddenInput = structuredClone(world);
  delete hiddenInput.digest;
  hiddenInput.facts.find((fact) => fact.variableId === "state.materiel").visibility = "HIDDEN";
  const hidden = cognition.compileWorldSnapshot(hiddenInput, domain);
  assert.throws(() => cognition.executeCausalRequest(scenario(hidden, {
    expectedWorldRevision: hidden.revision,
  }), hidden, domain), /hidden, absent, or nonnumeric|lacks visible evidence/i);
});

test("all four causal primitives share one typed, proof-bearing adapter", () => {
  const { world, domain } = context();
  const semantic = {
    operation: "PREDICT", subject: { type: "CAMPAIGN_CHOICE", entityIds: [] },
    scope: { group: "ALL", domains: ["MAIN"], excludedDomains: [] },
    timeframe: "PROJECTED", criteria: ["OVERALL_VALUE"], polarity: "AFFIRMATIVE",
    requestedDetail: "REASONS", perspective: "PLAYER", outputForm: "TERMINAL",
    overlays: [], confidence: 1, sourceSpans: {},
  };
  const surface = cognition.compileSurfaceAst("counterfactual", semantic, domain);
  const semanticTree = cognition.resolveSemanticTree({ surface, world, domain });
  const requests = {
    INTERVENE: scenario(world),
    PROPAGATE_EFFECT: scenario(world, { id: "propagate" }),
    COUNTERFACTUAL: { kind: "COUNTERFACTUAL", id: "counter", expectedWorldRevision: world.revision, scenario: scenario(world) },
    FIND_CAUSE: { kind: "FIND_CAUSE", id: "cause", expectedWorldRevision: world.revision, effectVariableId: "state.front", scenario: scenario(world) },
  };
  for (const operator of Object.keys(requests)) {
    const program = {
      id: `causal-${operator}`, version: "1", semanticTreeDigest: semanticTree.digest,
      worldRevision: world.revision, authorityCeiling: "READ_ONLY",
      nodes: [{ id: "causal", operator, inputs: { request: { kind: "LITERAL", datum: {
        kind: "RECORD", value: requests[operator], sourceIds: [], proofIds: [], authority: "READ_ONLY",
      } } } }], outputNodeId: "causal",
    };
    const result = cognition.executeCognitiveProgram(program, {
      domain, world, semanticTree, adapters: cognition.causalEngineAdapters,
    });
    assert.equal(result.status, "COMPLETED", result.blocker);
    assert.ok(result.output.proofIds.includes("causal-engine-proof"));
  }
});
