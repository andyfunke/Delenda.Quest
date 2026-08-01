import assert from "node:assert/strict";
import test from "node:test";

const cognition = await import(process.env.DELENDA_AVA_COGNITIVE_BUNDLE);
const game = await import(process.env.DELENDA_SUBSTRATE_GAME_BUNDLE);

const query = (entityIds = ["legitimacy"]) => ({
  operation: "EXPLAIN",
  subject: { type: "METRIC", entityIds },
  scope: { group: "MAIN", domains: ["MAIN"], excludedDomains: [] },
  metric: "legitimacy",
  metricOperands: ["legitimacy", "resistance"],
  timeframe: "CURRENT_DAY",
  comparisonMode: "PAIR",
  criteria: ["OVERALL_VALUE"],
  polarity: "AFFIRMATIVE",
  quantity: { kind: "CARDINAL", value: 2 },
  certainty: "CERTAIN",
  requestedDetail: "CALCULUS",
  perspective: "PLAYER",
  reference: { type: "LAST_SUBJECT" },
  outputForm: "TERMINAL",
  overlays: [{ kind: "ASSUME_STATE", target: "resistance", value: 20, sourceText: "assume resistance 20" }],
  confidence: 1,
  sourceSpans: { operation: { start: 0, end: 7, text: "explain" } },
});

const fixture = (semantic = query(), options = {}) => {
  const state = game.initialState({ seed: 1729, theater: "lowland" });
  const world = cognition.worldSnapshotFromGameState(state, "world-r1");
  const surface = cognition.compileSurfaceAst(
    "explain legitimacy assuming resistance twenty",
    semantic,
    cognition.DELENDA_COGNITIVE_DOMAIN,
  );
  return { state, world, surface, ...options };
};

test("resolved semantic tree lowers to the complete legacy query by whole-IR equality", () => {
  const { world, surface } = fixture();
  const tree = cognition.resolveSemanticTree({ surface, world, domain: cognition.DELENDA_COGNITIVE_DOMAIN });
  assert.equal(tree.kind, "RESOLVED_SEMANTIC_TREE");
  assert.deepEqual(cognition.lowerResolvedSemanticTree(tree), query());
});

test("every canonical semantic field retains one explicit provenance owner", () => {
  const { world, surface } = fixture();
  const tree = cognition.resolveSemanticTree({ surface, world, domain: cognition.DELENDA_COGNITIVE_DOMAIN });
  for (const [name, value] of Object.entries(tree)) {
    if (["kind", "version", "domainId", "domainVersion", "domainDigest", "worldRevision", "worldDigest", "surfaceDigest", "authorityCeiling", "entities", "digest"].includes(name)) continue;
    assert.ok(value.provenance?.sourceId, `${name} has no provenance`);
  }
  assert.ok(tree.entities.every((item) => item.provenance.sourceId));
});

test("runtime entities close dynamic campaign ontology without entering the domain spec", () => {
  const semantic = query(["daily-maneuver-17"]);
  const { world, surface } = fixture(semantic);
  const tree = cognition.resolveSemanticTree({
    surface,
    world,
    domain: cognition.DELENDA_COGNITIVE_DOMAIN,
    runtimeEntities: [{ id: "daily-maneuver-17", kind: "maneuver", factIds: ["fact:state.actions"] }],
  });
  assert.equal(tree.entities[0].id, "daily-maneuver-17");
  assert.equal(tree.entities[0].provenance.kind, "WORLD");
  assert.deepEqual(cognition.lowerResolvedSemanticTree(tree), semantic);
});

test("compiler-owned runtime descriptors can bind without fabricated world evidence", () => {
  const semantic = query(["forecast:{\"plan\":true}"]);
  const { world, surface } = fixture(semantic);
  const tree = cognition.resolveSemanticTree({
    surface,
    world,
    domain: cognition.DELENDA_COGNITIVE_DOMAIN,
    runtimeEntities: [{ id: semantic.subject.entityIds[0], kind: "semantic-descriptor" }],
  });
  assert.deepEqual(tree.entities[0].factIds, []);
  assert.deepEqual(tree.entities[0].provenance, {
    kind: "COMPILER",
    sourceId: `runtime:${semantic.subject.entityIds[0]}`,
  });
});

test("unknown, duplicate, and open runtime entities fail closed", () => {
  const semantic = query(["invented-aura"]);
  const { world, surface } = fixture(semantic);
  assert.throws(() => cognition.resolveSemanticTree({ surface, world, domain: cognition.DELENDA_COGNITIVE_DOMAIN }), /outside the compiled and runtime ontology/i);
  assert.throws(() => cognition.resolveSemanticTree({
    surface,
    world,
    domain: cognition.DELENDA_COGNITIVE_DOMAIN,
    runtimeEntities: [
      { id: "invented-aura", kind: "metric" },
      { id: "invented-aura", kind: "metric" },
    ],
  }), /duplicate runtime entity/i);
  assert.throws(() => cognition.resolveSemanticTree({
    surface,
    world,
    domain: cognition.DELENDA_COGNITIVE_DOMAIN,
    runtimeEntities: [{ id: "invented-aura", kind: "metric", conceptId: "not-compiled" }],
  }), /unknown concept/i);
});

test("hidden or absent evidence cannot bind a semantic entity", () => {
  const semantic = query(["enemy-actuality"]);
  const { world, surface, state } = fixture(semantic);
  const body = structuredClone(world);
  delete body.digest;
  body.sources.push({ id: "secret", kind: "WORLD", label: "Enemy actuality", visibility: "HIDDEN", reliability: 1, independentGroup: "enemy" });
  body.facts.push({
    id: "fact:secret-enemy",
    variableId: "state.enemy",
    entityId: "enemy",
    value: 999999,
    visibility: "HIDDEN",
    sourceIds: ["secret"],
    lineage: [],
    validFromDay: state.day,
    observedAtDay: state.day,
    uncertainty: { kind: "EXACT" },
  });
  const complete = cognition.compileWorldSnapshot(body, cognition.DELENDA_COGNITIVE_DOMAIN);
  assert.throws(() => cognition.resolveSemanticTree({
    surface,
    world: complete,
    domain: cognition.DELENDA_COGNITIVE_DOMAIN,
    runtimeEntities: [{ id: "enemy-actuality", kind: "enemy", factIds: ["fact:secret-enemy"] }],
  }), /hidden or absent fact/i);
});

test("forged source and world digests cannot reach semantic lowering", () => {
  const { world, surface } = fixture();
  const forgedSurface = structuredClone(surface);
  forgedSurface.semantic.operation = "WARN";
  assert.throws(() => cognition.resolveSemanticTree({ surface: forgedSurface, world, domain: cognition.DELENDA_COGNITIVE_DOMAIN }), /surface AST digest/i);
  const forgedWorld = structuredClone(world);
  const altered = forgedWorld.facts.find((fact) => fact.variableId === "state.legitimacy");
  altered.value -= 1;
  assert.throws(() => cognition.resolveSemanticTree({ surface, world: forgedWorld, domain: cognition.DELENDA_COGNITIVE_DOMAIN }), /world snapshot digest/i);
});

test("stale revisions and post-resolution tree alterations fail closed", () => {
  const { world, surface } = fixture();
  assert.throws(() => cognition.resolveSemanticTree({
    surface,
    world,
    domain: cognition.DELENDA_COGNITIVE_DOMAIN,
    expectedWorldRevision: "world-r2",
  }), /stale world revision/i);
  const tree = cognition.resolveSemanticTree({ surface, world, domain: cognition.DELENDA_COGNITIVE_DOMAIN });
  tree.operation.value = "WARN";
  assert.throws(() => cognition.lowerResolvedSemanticTree(tree), /tree digest/i);
});
