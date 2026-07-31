import assert from "node:assert/strict";
import test from "node:test";

const cognition = await import(process.env.DELENDA_AVA_COGNITIVE_BUNDLE);
const game = await import(process.env.DELENDA_SUBSTRATE_GAME_BUNDLE);

const stateAndWorld = (overrides = {}, revision = "constraint-r1") => {
  const state = { ...game.initialState({ seed: 4242, theater: "lowland" }), ...overrides };
  return {
    state,
    world: cognition.worldSnapshotFromGameState(state, revision),
  };
};

const request = (world, input = {}) => ({
  id: "issue-one-order",
  expectedWorldRevision: world.revision,
  actionId: "issue-order",
  bindings: { actionId: "maneuver:advance", amount: 1 },
  ...input,
});

test("compiled constraint registry is closed and validates repair expressions", () => {
  const domain = cognition.DELENDA_COGNITIVE_DOMAIN;
  assert.deepEqual(domain.manifest.constraintIds, [
    "atrocity-doctrine-limit",
    "campaign-has-orders",
    "front-survivable",
    "issue-order-capacity",
  ]);
  const open = structuredClone(cognition.DELENDA_COGNITIVE_DOMAIN_SPEC);
  open.constraints[0].expression.left.variableId = "state.invented";
  assert.throws(() => cognition.compileCognitiveDomain(open), /unknown constraint variable/i);
  const badRepair = structuredClone(cognition.DELENDA_COGNITIVE_DOMAIN_SPEC);
  badRepair.constraints.find((item) => item.id === "issue-order-capacity").repairs[0].target.bindingId = "invented";
  assert.throws(() => cognition.compileCognitiveDomain(badRepair), /unknown constraint binding/i);
});

test("feasible, prerequisite-bound, resource-bound, and underspecified outcomes are distinct", () => {
  const { world } = stateAndWorld();
  assert.equal(cognition.evaluateFeasibility(request(world), world, cognition.DELENDA_COGNITIVE_DOMAIN).outcome, "FEASIBLE");

  const empty = stateAndWorld({ actions: 0 }, "constraint-empty").world;
  assert.equal(cognition.evaluateFeasibility(request(empty, {
    expectedWorldRevision: empty.revision,
    bindings: { actionId: "maneuver:advance", amount: 0 },
  }), empty, cognition.DELENDA_COGNITIVE_DOMAIN).outcome, "PREREQUISITE_BOUND");

  const capacity = cognition.evaluateFeasibility(request(world, {
    bindings: { actionId: "maneuver:advance", amount: 99 },
  }), world, cognition.DELENDA_COGNITIVE_DOMAIN);
  assert.equal(capacity.outcome, "RESOURCE_BOUND");
  assert.ok(capacity.responsibleFactIds.includes("fact:state.actions"));

  const missing = cognition.evaluateFeasibility(request(world, {
    bindings: { actionId: "maneuver:advance" },
  }), world, cognition.DELENDA_COGNITIVE_DOMAIN);
  assert.equal(missing.outcome, "UNDERSPECIFIED");
  assert.ok(missing.constraints.some((item) => item.missingBindings.includes("amount")));
});

test("impossible, forbidden, uncertain, and dominated complete all eight outcomes", () => {
  const loss = stateAndWorld({ front: -12 }, "constraint-loss").world;
  assert.equal(cognition.evaluateFeasibility({
    id: "loss-line",
    expectedWorldRevision: loss.revision,
    constraintIds: ["front-survivable"],
  }, loss, cognition.DELENDA_COGNITIVE_DOMAIN).outcome, "IMPOSSIBLE");

  const { world } = stateAndWorld();
  assert.equal(cognition.evaluateFeasibility(request(world, {
    authorityCeiling: "READ_ONLY",
  }), world, cognition.DELENDA_COGNITIVE_DOMAIN).outcome, "FORBIDDEN");

  const uncertainInput = structuredClone(world);
  delete uncertainInput.digest;
  const front = uncertainInput.facts.find((fact) => fact.variableId === "state.front");
  front.uncertainty = { kind: "INTERVAL", low: -13, high: -11 };
  const uncertain = cognition.compileWorldSnapshot(uncertainInput, cognition.DELENDA_COGNITIVE_DOMAIN);
  assert.equal(cognition.evaluateFeasibility({
    id: "uncertain-line",
    expectedWorldRevision: uncertain.revision,
    constraintIds: ["front-survivable"],
  }, uncertain, cognition.DELENDA_COGNITIVE_DOMAIN).outcome, "UNCERTAIN");

  const dominated = cognition.evaluateFeasibility(request(world, {
    costs: { orders: 2, risk: 1 },
    alternatives: [{
      id: "lower-cost",
      request: request(world, { id: "lower-cost-request", costs: { orders: 1, risk: 1 } }),
    }],
  }), world, cognition.DELENDA_COGNITIVE_DOMAIN);
  assert.equal(dominated.outcome, "DOMINATED");
  assert.equal(dominated.dominatedBy, "lower-cost");
});

test("smallest repair is replayable and closest alternatives prefer lower declared cost", () => {
  const { world } = stateAndWorld({ actions: 2 });
  const blocked = request(world, {
    bindings: { actionId: "maneuver:advance", amount: 3 },
    alternatives: [
      { id: "expensive", request: request(world, { id: "expensive", bindings: { actionId: "maneuver:advance", amount: 2 }, costs: { treasury: 4 } }) },
      { id: "cheap", request: request(world, { id: "cheap", bindings: { actionId: "maneuver:advance", amount: 2 }, costs: { treasury: 2 } }) },
    ],
  });
  const result = cognition.evaluateFeasibility(blocked, world, cognition.DELENDA_COGNITIVE_DOMAIN);
  assert.equal(result.outcome, "RESOURCE_BOUND");
  assert.equal(result.closestFeasibleAlternative, "cheap");
  assert.equal(result.smallestRepair.changes[0].value, 2);
  const repaired = cognition.applyFeasibilityRepair(
    blocked,
    result.smallestRepair,
    cognition.DELENDA_COGNITIVE_DOMAIN,
  );
  assert.equal(cognition.evaluateFeasibility(repaired, world, cognition.DELENDA_COGNITIVE_DOMAIN).outcome, "FEASIBLE");
});

test("incomparable cost vectors, duplicates, ad hoc constraints, and stale revisions fail closed", () => {
  const { world } = stateAndWorld();
  const incomparable = cognition.evaluateFeasibility(request(world, {
    costs: { orders: 2 },
    alternatives: [{
      id: "different-metric",
      request: request(world, { id: "different", costs: { treasury: 0 } }),
    }],
  }), world, cognition.DELENDA_COGNITIVE_DOMAIN);
  assert.equal(incomparable.outcome, "FEASIBLE");
  assert.equal(incomparable.dominatedBy, undefined);
  assert.throws(() => cognition.evaluateFeasibility(request(world, {
    alternatives: [
      { id: "same", request: request(world, { id: "one" }) },
      { id: "same", request: request(world, { id: "two" }) },
    ],
  }), world, cognition.DELENDA_COGNITIVE_DOMAIN), /duplicate feasibility alternative/i);
  assert.throws(() => cognition.evaluateFeasibility({
    id: "open",
    expectedWorldRevision: world.revision,
    constraintIds: ["invented-constraint"],
  }, world, cognition.DELENDA_COGNITIVE_DOMAIN), /undeclared constraint/i);
  assert.throws(() => cognition.evaluateFeasibility(request(world, {
    expectedWorldRevision: "stale",
  }), world, cognition.DELENDA_COGNITIVE_DOMAIN), /revision is stale/i);
});

test("typed quantities, authority labels, hidden facts, and undeclared bindings fail closed", () => {
  const { world } = stateAndWorld();
  assert.throws(() => cognition.evaluateFeasibility(request(world, {
    bindings: { actionId: "maneuver:advance", amount: -1 },
  }), world, cognition.DELENDA_COGNITIVE_DOMAIN), /below declared minimum/i);
  assert.throws(() => cognition.evaluateFeasibility(request(world, {
    bindings: { actionId: "maneuver:advance", amount: 1, invented: 4 },
  }), world, cognition.DELENDA_COGNITIVE_DOMAIN), /undeclared binding/i);
  assert.throws(() => cognition.evaluateFeasibility(request(world, {
    authorityCeiling: "ROOT",
  }), world, cognition.DELENDA_COGNITIVE_DOMAIN), /invalid authority ceiling/i);
  assert.throws(() => cognition.evaluateFeasibility(request(world, {
    alternatives: [{
      id: "negative-cost",
      request: request(world, { id: "negative-cost", costs: { treasury: -1 } }),
    }],
  }), world, cognition.DELENDA_COGNITIVE_DOMAIN), /nonnegative finite number/i);

  const hiddenInput = structuredClone(world);
  delete hiddenInput.digest;
  hiddenInput.facts.find((fact) => fact.variableId === "state.front").visibility = "HIDDEN";
  const hidden = cognition.compileWorldSnapshot(hiddenInput, cognition.DELENDA_COGNITIVE_DOMAIN);
  assert.throws(() => cognition.evaluateFeasibility({
    id: "hidden-front",
    expectedWorldRevision: hidden.revision,
    constraintIds: ["front-survivable"],
  }, hidden, cognition.DELENDA_COGNITIVE_DOMAIN), /visible world lacks state.front/i);

  const forgedWorld = structuredClone(world);
  forgedWorld.facts.find((fact) => fact.variableId === "state.actions").value += 1;
  assert.throws(() => cognition.evaluateFeasibility(request(forgedWorld), forgedWorld, cognition.DELENDA_COGNITIVE_DOMAIN), /world digest is forged/i);

  assert.throws(() => cognition.applyFeasibilityRepair(request(world), {
    id: "invented-repair",
    constraintId: "issue-order-capacity",
    changes: [{ bindingId: "amount", value: 0 }],
  }, cognition.DELENDA_COGNITIVE_DOMAIN), /undeclared feasibility repair/i);
});

test("SATISFY and CHECK_PRECONDITION execute through the proof-bearing authored adapter", () => {
  const { state, world } = stateAndWorld();
  const surface = cognition.compileSurfaceAst("check order", {
    operation: "INSPECT",
    subject: { type: "CAMPAIGN_CHOICE", entityIds: [] },
    scope: { group: "ALL", domains: ["MAIN"], excludedDomains: [] },
    timeframe: "CURRENT_DOCKET", criteria: ["OVERALL_VALUE"],
    polarity: "AFFIRMATIVE", requestedDetail: "REASONS", perspective: "PLAYER",
    outputForm: "TERMINAL", overlays: [], confidence: 1, sourceSpans: {},
  }, cognition.DELENDA_COGNITIVE_DOMAIN);
  const semanticTree = cognition.resolveSemanticTree({ surface, world, domain: cognition.DELENDA_COGNITIVE_DOMAIN });
  const value = request(world);
  const inputDatum = { kind: "RECORD", value, sourceIds: [], proofIds: [], authority: "READ_ONLY" };
  for (const operator of ["SATISFY", "CHECK_PRECONDITION"]) {
    const program = {
      id: `constraint-${operator}`,
      version: "1",
      semanticTreeDigest: semanticTree.digest,
      worldRevision: world.revision,
      authorityCeiling: "READ_ONLY",
      nodes: [{ id: "check", operator, inputs: { request: { kind: "LITERAL", datum: inputDatum } } }],
      outputNodeId: "check",
    };
    const result = cognition.executeCognitiveProgram(program, {
      domain: cognition.DELENDA_COGNITIVE_DOMAIN,
      world,
      semanticTree,
      adapters: cognition.constraintEngineAdapters,
    });
    assert.equal(result.status, "COMPLETED");
    assert.equal(result.output.value.outcome, "FEASIBLE");
    assert.ok(result.output.proofIds.includes("constraint-engine-proof"));
    assert.ok(result.output.sourceIds.includes("fact:state.actions"));
  }
  assert.equal(state.actions > 0, true);
});
