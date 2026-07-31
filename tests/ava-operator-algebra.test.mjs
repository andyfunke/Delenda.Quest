import assert from "node:assert/strict";
import test from "node:test";

const cognition = await import(process.env.DELENDA_AVA_COGNITIVE_BUNDLE);
const game = await import(process.env.DELENDA_SUBSTRATE_GAME_BUNDLE);

const semantic = {
  operation: "CALCULATE",
  subject: { type: "METRIC", entityIds: ["legitimacy"] },
  scope: { group: "MAIN", domains: ["MAIN"], excludedDomains: [] },
  metric: "legitimacy",
  timeframe: "CURRENT_DAY",
  criteria: ["OVERALL_VALUE"], polarity: "AFFIRMATIVE", requestedDetail: "CALCULUS",
  perspective: "PLAYER", outputForm: "TERMINAL", overlays: [], confidence: 1,
  sourceSpans: {},
};

const context = () => {
  const state = game.initialState({ seed: 1729, theater: "lowland" });
  const world = cognition.worldSnapshotFromGameState(state, "operator-r1");
  const surface = cognition.compileSurfaceAst("calculate legitimacy", semantic, cognition.DELENDA_COGNITIVE_DOMAIN);
  const semanticTree = cognition.resolveSemanticTree({ surface, world, domain: cognition.DELENDA_COGNITIVE_DOMAIN });
  return { domain: cognition.DELENDA_COGNITIVE_DOMAIN, world, semanticTree };
};
const datum = (value, authority = "READ_ONLY") => ({
  kind: value === null ? "NULL" : Array.isArray(value) ? "LIST" : typeof value === "number" ? "NUMBER" : typeof value === "boolean" ? "BOOLEAN" : typeof value === "string" ? "STRING" : "RECORD",
  value, sourceIds: [], proofIds: [], authority,
});
const program = (ctx, nodes, outputNodeId, extra = {}) => ({
  id: "program-1", version: "1", semanticTreeDigest: ctx.semanticTree.digest,
  worldRevision: ctx.world.revision, authorityCeiling: "READ_ONLY", nodes, outputNodeId, ...extra,
});

test("operator registry contains exactly 55 unique typed routes with constraint execution authored", () => {
  const manifest = cognition.cognitiveOperatorManifest();
  assert.equal(manifest.count, 55);
  assert.equal(new Set(cognition.COGNITIVE_OPERATORS).size, 55);
  assert.equal(manifest.intrinsic.length, 25);
  assert.equal(manifest.adapted.length, 30);
  for (const operator of cognition.COGNITIVE_OPERATORS)
    assert.equal(cognition.COGNITIVE_OPERATOR_REGISTRY.get(operator).id, operator);
});

test("typed intrinsic graph executes deterministically with proof and dependency lineage", () => {
  const ctx = context();
  const nodes = [
    { id: "sum", operator: "SUM", inputs: { values: { kind: "LITERAL", datum: datum([4, 6]) } } },
    { id: "ratio", operator: "RATIO", inputs: {
      numerator: { kind: "NODE", nodeId: "sum" },
      denominator: { kind: "LITERAL", datum: datum(2) },
    } },
  ];
  const first = cognition.executeCognitiveProgram(program(ctx, nodes, "ratio"), ctx);
  const second = cognition.executeCognitiveProgram(program(ctx, nodes, "ratio"), ctx);
  assert.equal(first.status, "COMPLETED");
  assert.equal(first.output.value, 5);
  assert.deepEqual(first, second);
  assert.deepEqual(first.executions[1].dependencies, ["sum"]);
  assert.ok(first.output.proofIds.includes("typed-inputs"));
});

test("unbound authored operators block at their named adapter without fabricating a result", () => {
  const ctx = context();
  const result = cognition.executeCognitiveProgram(program(ctx, [{
    id: "forecast", operator: "FORECAST",
    inputs: { request: { kind: "LITERAL", datum: datum({ horizon: "short" }) } },
  }], "forecast"), ctx);
  assert.equal(result.status, "BLOCKED");
  assert.equal(result.output, undefined);
  assert.equal(result.executions[0].missingAdapter, "temporal-engine");
  assert.ok(result.executions[0].obligations.includes("operator:forecast"));
});

test("typed inputs, exact slots, graph cycles, and arithmetic hazards reject before output", () => {
  const ctx = context();
  const badType = cognition.executeCognitiveProgram(program(ctx, [{
    id: "sum", operator: "SUM", inputs: { values: { kind: "LITERAL", datum: datum("not-list") } },
  }], "sum"), ctx);
  assert.match(badType.blocker, /expected LIST/i);
  const extra = cognition.executeCognitiveProgram(program(ctx, [{
    id: "count", operator: "COUNT", inputs: { values: { kind: "LITERAL", datum: datum([]) }, invented: { kind: "LITERAL", datum: datum(1) } },
  }], "count"), ctx);
  assert.match(extra.blocker, /typed contract/i);
  const cyclic = cognition.executeCognitiveProgram(program(ctx, [
    { id: "a", operator: "IDENTITY", inputs: { value: { kind: "NODE", nodeId: "b" } } },
    { id: "b", operator: "IDENTITY", inputs: { value: { kind: "NODE", nodeId: "a" } } },
  ], "a"), ctx);
  assert.match(cyclic.blocker, /cycle/i);
  const zero = cognition.executeCognitiveProgram(program(ctx, [{
    id: "ratio", operator: "RATIO", inputs: { numerator: { kind: "LITERAL", datum: datum(2) }, denominator: { kind: "LITERAL", datum: datum(0) } },
  }], "ratio"), ctx);
  assert.match(zero.blocker, /denominator is zero/i);
});

test("world revision, semantic digest, hidden facts, and authority all fail closed", () => {
  const ctx = context();
  const baseNode = [{ id: "identity", operator: "IDENTITY", inputs: { value: { kind: "FACT", factId: "fact:state.legitimacy" } } }];
  assert.match(cognition.executeCognitiveProgram(program(ctx, baseNode, "identity", { worldRevision: "stale" }), ctx).blocker, /revision is stale/i);
  assert.match(cognition.executeCognitiveProgram(program(ctx, baseNode, "identity", { semanticTreeDigest: "forged" }), ctx).blocker, /stale or forged/i);
  const absent = [{ id: "identity", operator: "IDENTITY", inputs: { value: { kind: "FACT", factId: "fact:hidden" } } }];
  assert.match(cognition.executeCognitiveProgram(program(ctx, absent, "identity"), ctx).blocker, /hidden or absent/i);
  assert.match(cognition.executeCognitiveProgram(program(ctx, baseNode, "identity", { authorityCeiling: "MUTATE" }), ctx).blocker, /authority exceeds/i);
});

test("bound adapters must honor output type, authority, and evidence contracts", () => {
  const ctx = context();
  const p = program(ctx, [{ id: "forecast", operator: "FORECAST", inputs: { request: { kind: "LITERAL", datum: datum({ horizon: "short" }) } } }], "forecast");
  const wrongType = cognition.executeCognitiveProgram(p, { ...ctx, adapters: {
    "temporal-engine": () => ({ datum: datum(1), evidence: [] }),
  } });
  assert.match(wrongType.blocker, /output violates/i);
  const tooMuch = cognition.executeCognitiveProgram(p, { ...ctx, adapters: {
    "temporal-engine": () => ({ datum: datum({ horizon: "short" }, "MUTATE"), evidence: [] }),
  } });
  assert.match(tooMuch.blocker, /exceeded program authority/i);
  const hidden = cognition.executeCognitiveProgram(p, { ...ctx, adapters: {
    "temporal-engine": () => ({ datum: { ...datum({ horizon: "short" }), sourceIds: ["fact:hidden"] }, evidence: [] }),
  } });
  assert.match(hidden.blocker, /hidden or absent evidence/i);
});
