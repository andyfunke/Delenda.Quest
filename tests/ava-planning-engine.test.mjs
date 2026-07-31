import assert from "node:assert/strict";
import test from "node:test";

const cognition = await import(process.env.DELENDA_AVA_COGNITIVE_BUNDLE);
const game = await import(process.env.DELENDA_SUBSTRATE_GAME_BUNDLE);

const context = () => {
  const state = game.initialState({ seed: 10100, theater: "river" });
  const world = cognition.worldSnapshotFromGameState(state, "planning-r1");
  return { state, world, domain: cognition.DELENDA_COGNITIVE_DOMAIN };
};

const action = (id, amount, dependsOn = []) => ({ id, actionId: "issue-order", bindings: { actionId: "advance", amount }, dependsOn });
const plan = (world, actions = [action("a", 1), action("b", 1, ["a"])]) => ({
  kind: "BUILD_PLAN", id: "plan-request", expectedWorldRevision: world.revision,
  scenarioId: "scenario:orders", actions,
});
const base = (world, kind) => ({ kind, id: `${kind.toLowerCase()}-request`, expectedWorldRevision: world.revision, scenarioId: "scenario:orders" });

test("planning compiler owns every action, branch, termination, and resource", () => {
  const domain = cognition.DELENDA_COGNITIVE_DOMAIN;
  assert.deepEqual(domain.manifest.planningActionIds, ["inspect", "issue-order"]);
  const missing = structuredClone(cognition.DELENDA_COGNITIVE_DOMAIN_SPEC);
  missing.planning.actionIds.pop();
  assert.throws(() => cognition.compileCognitiveDomain(missing), /every compiled action requires exactly one planning policy/i);
  const open = structuredClone(cognition.DELENDA_COGNITIVE_DOMAIN_SPEC);
  open.planning.branches[0].constraintId = "invented";
  assert.throws(() => cognition.compileCognitiveDomain(open), /open reference/i);
});

test("plans replay feasibility, dependencies, temporal schedule, and reservations", () => {
  const { world, domain } = context();
  const result = cognition.executePlanningRequest(plan(world), world, domain);
  assert.equal(result.status, "PLANNED");
  assert.equal(result.authority, "PLAN_ONLY_NO_MUTATION");
  assert.deepEqual(result.actions.map((item) => item.interval), [{ start: 0, end: 1 }, { start: 1, end: 2 }]);
  assert.equal(result.reservations.reduce((sum, item) => sum + item.amount, 0), 2);
  assert.ok(result.proofIds.includes("temporal-schedule-replay"));
});

test("cumulative double-spending produces a replayable smallest repair", () => {
  const { state, world, domain } = context();
  const available = state.actions;
  const request = plan(world, [action("a", available), action("b", 1, ["a"])]);
  const blocked = cognition.executePlanningRequest(request, world, domain);
  assert.equal(blocked.status, "BLOCKED");
  const repair = blocked.repairs.find((item) => item.reason === "RESOURCE_OVERSUBSCRIBED");
  assert.deepEqual(repair.changes, [{ bindingId: "amount", value: 0 }]);
  const repaired = structuredClone(request);
  repaired.actions.find((item) => item.id === repair.actionId).bindings.amount = repair.changes[0].value;
  assert.equal(cognition.executePlanningRequest(repaired, world, domain).status, "PLANNED");
});

test("standalone allocation is compiler-closed and cumulative", () => {
  const { state, world, domain } = context();
  const allocated = cognition.executePlanningRequest({
    ...base(world, "ALLOCATE"), resourceVariableId: "state.actions", amount: 1,
    priorReservations: [{ id: "prior", amount: 1 }],
  }, world, domain);
  assert.equal(allocated.status, state.actions >= 2 ? "ALLOCATED" : "BLOCKED");
  assert.throws(() => cognition.executePlanningRequest({
    ...base(world, "ALLOCATE"), resourceVariableId: "state.treasury", amount: 1, priorReservations: [],
  }, world, domain), /not compiler-declared/i);
});

test("compiled branches and terminations replay visible constraints", () => {
  const { world, domain } = context();
  const branch = cognition.executePlanningRequest({
    ...base(world, "BRANCH"), branchId: "orders-available", bindings: { actionId: "advance", amount: 1 },
  }, world, domain);
  assert.equal(branch.status, "BRANCHED");
  assert.equal(branch.selectedActionId, "issue-order");
  const termination = cognition.executePlanningRequest({
    ...base(world, "TERMINATE"), terminationId: "front-loss-line",
  }, world, domain);
  assert.equal(termination.status, "CONTINUE");
  assert.equal(termination.terminationSatisfied, false);
});

test("repairs replay original requests and ignore fabricated plan artifacts", () => {
  const { state, world, domain } = context();
  const request = plan(world, [action("a", state.actions), action("b", 1, ["a"])]);
  const repaired = cognition.executePlanningRequest({
    ...base(world, "REPAIR"), planRequest: request, fabricatedResult: { status: "PLANNED", repairs: [] },
  }, world, domain);
  assert.equal(repaired.kind, "REPAIR");
  assert.equal(repaired.status, "BLOCKED");
  assert.ok(repaired.repairs.length);
});

test("stale, cyclic, undeclared, duplicate, and overlong plans fail closed", () => {
  const { world, domain } = context();
  assert.throws(() => cognition.executePlanningRequest({ ...plan(world), expectedWorldRevision: "stale" }, world, domain), /revision is stale/i);
  assert.throws(() => cognition.executePlanningRequest(plan(world, [action("a", 1, ["b"]), action("b", 1, ["a"])]), world, domain), /cycle/i);
  assert.throws(() => cognition.executePlanningRequest(plan(world, [{ ...action("a", 1), actionId: "invented" }]), world, domain), /not compiler-approved/i);
  assert.throws(() => cognition.executePlanningRequest(plan(world, [action("a", 1), action("a", 1)]), world, domain), /ids must be unique/i);
  assert.throws(() => cognition.executePlanningRequest(plan(world, Array.from({ length: 9 }, (_, index) => action(`a${index}`, 0))), world, domain), /outside compiled policy/i);
});

test("equivalent action order canonicalizes to one plan digest", () => {
  const { world, domain } = context();
  const left = plan(world);
  const right = { ...left, actions: [...left.actions].reverse() };
  assert.equal(cognition.executePlanningRequest(left, world, domain).digest, cognition.executePlanningRequest(right, world, domain).digest);
});

test("all seven planning primitives share one typed proof-bearing adapter", () => {
  const { world, domain } = context();
  const semantic = { operation: "PREDICT", subject: { type: "CAMPAIGN_CHOICE", entityIds: [] }, scope: { group: "ALL", domains: ["MAIN"], excludedDomains: [] }, timeframe: "PROJECTED", criteria: ["OVERALL_VALUE"], polarity: "AFFIRMATIVE", requestedDetail: "REASONS", perspective: "PLAYER", outputForm: "TERMINAL", overlays: [], confidence: 1, sourceSpans: {} };
  const surface = cognition.compileSurfaceAst("plan orders", semantic, domain);
  const semanticTree = cognition.resolveSemanticTree({ surface, world, domain, authorityCeiling: "PLAN_ONLY" });
  const requests = {
    BUILD_PLAN: plan(world),
    EXPAND_ACTION: { ...base(world, "EXPAND_ACTION"), action: action("a", 1) },
    ALLOCATE: { ...base(world, "ALLOCATE"), resourceVariableId: "state.actions", amount: 1, priorReservations: [] },
    RESERVE: { ...base(world, "RESERVE"), resourceVariableId: "state.actions", amount: 1, priorReservations: [] },
    REPAIR: { ...base(world, "REPAIR"), planRequest: plan(world) },
    BRANCH: { ...base(world, "BRANCH"), branchId: "orders-available", bindings: { actionId: "advance", amount: 1 } },
    TERMINATE: { ...base(world, "TERMINATE"), terminationId: "front-loss-line" },
  };
  for (const operator of Object.keys(requests)) {
    const program = { id: `planning-${operator}`, version: "1", semanticTreeDigest: semanticTree.digest, worldRevision: world.revision, authorityCeiling: "PLAN_ONLY", nodes: [{ id: "planning", operator, inputs: { request: { kind: "LITERAL", datum: { kind: "RECORD", value: requests[operator], sourceIds: [], proofIds: [], authority: "READ_ONLY" } } } }], outputNodeId: "planning" };
    const result = cognition.executeCognitiveProgram(program, { domain, world, semanticTree, adapters: cognition.planningEngineAdapters });
    assert.equal(result.status, "COMPLETED", result.blocker);
    assert.equal(result.output.authority, "PLAN_ONLY");
    assert.ok(result.output.proofIds.includes("planning-engine-proof"));
  }
});
