import assert from "node:assert/strict";
import test from "node:test";

const cognition = await import(process.env.DELENDA_AVA_COGNITIVE_BUNDLE);
const game = await import(process.env.DELENDA_SUBSTRATE_GAME_BUNDLE);

const semantic = {
  operation: "EXPLAIN",
  subject: { type: "METRIC", entityIds: ["legitimacy"] },
  scope: { group: "MAIN", domains: ["MAIN"], excludedDomains: [] },
  metric: "legitimacy",
  timeframe: "CURRENT_DAY",
  criteria: [],
  polarity: "AFFIRMATIVE",
  requestedDetail: "REASONS",
  perspective: "PLAYER",
  outputForm: "TERMINAL",
  overlays: [],
  confidence: 1,
  sourceSpans: {},
};

test("cognitive digests use canonical UTF-8 SHA-256", () => {
  assert.equal(
    cognition.sha256Hex("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
  assert.match(cognition.cognitiveDigest({ message: "abc" }), /^[a-f0-9]{64}$/);
  assert.equal(
    cognition.cognitiveDigest({ second: 2, first: 1 }),
    cognition.cognitiveDigest({ first: 1, second: 2 }),
    "canonical object-key ordering changed",
  );
  assert.notEqual(
    cognition.cognitiveDigest({ first: 1, second: 2 }),
    cognition.cognitiveDigest({ first: 1, second: 3 }),
    "a one-value tamper retained the original digest",
  );
});

test("SHA-256 separates a known collision under the retired 32-bit digest", () => {
  const left = "fnv-acuqi7-15tk";
  const right = "fnv-1yx9vt9-1yfi";
  const retiredDigest = (value) => {
    const text = JSON.stringify(value);
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  };

  assert.equal(retiredDigest(left), retiredDigest(right));
  assert.notEqual(cognition.cognitiveDigest(left), cognition.cognitiveDigest(right));
  assert.match(cognition.cognitiveDigest(left), /^[a-f0-9]{64}$/);
  assert.match(cognition.cognitiveDigest(right), /^[a-f0-9]{64}$/);
});

test("dependencies 1-3 compile one closed and deterministic cognitive domain", () => {
  const domain = cognition.DELENDA_COGNITIVE_DOMAIN;
  assert.equal(domain.id, "delenda-cognitive-domain");
  assert.ok(domain.variables.size > 40);
  assert.ok(domain.concepts.size > 40);
  assert.equal(domain.digest, cognition.compileCognitiveDomain(
    cognition.DELENDA_COGNITIVE_DOMAIN_SPEC,
  ).digest);
  assert.deepEqual([...domain.variables], [...domain.variables].sort(([a], [b]) => a.localeCompare(b)));
});

test("domain compiler rejects open references, duplicate identity, and invalid ranges", () => {
  const source = structuredClone(cognition.DELENDA_COGNITIVE_DOMAIN_SPEC);
  source.variables.push({ ...source.variables[0] });
  assert.throws(() => cognition.compileCognitiveDomain(source), /duplicate variable/i);

  const open = structuredClone(cognition.DELENDA_COGNITIVE_DOMAIN_SPEC);
  open.actions[0].resourceVariables.push("state.fabricated");
  assert.throws(() => cognition.compileCognitiveDomain(open), /unknown resource variable/i);

  const inverted = structuredClone(cognition.DELENDA_COGNITIVE_DOMAIN_SPEC);
  inverted.variables[0].minimum = 2;
  inverted.variables[0].maximum = 1;
  assert.throws(() => cognition.compileCognitiveDomain(inverted), /range is inverted/i);
});

test("authoritative GameState projects into a typed immutable world snapshot", () => {
  const state = game.initialState({ seed: 1729, theater: "lowland" });
  const world = cognition.worldSnapshotFromGameState(state, "revision-1");
  assert.equal(world.campaignId, state.campaignId);
  assert.equal(cognition.worldFact(world, "state.legitimacy").value, state.legitimacy);
  assert.equal(cognition.worldFact(world, "production.munitions.stock").value, state.production.munitions.stock);
  assert.equal(world.digest, cognition.compileWorldSnapshot({ ...world, digest: undefined }, cognition.DELENDA_COGNITIVE_DOMAIN).digest);
});

test("world compiler fails closed on undeclared variables, ranges, lineage, and uncertainty", () => {
  const state = game.initialState({ seed: 7, theater: "ridge" });
  const world = cognition.worldSnapshotFromGameState(state, "revision-2");
  const input = { ...structuredClone(world) };
  delete input.digest;
  input.facts[0].variableId = "state.invented";
  assert.throws(() => cognition.compileWorldSnapshot(input, cognition.DELENDA_COGNITIVE_DOMAIN), /undeclared variable/i);

  const malformed = { ...structuredClone(world) };
  delete malformed.digest;
  const legitimacy = malformed.facts.find((fact) => fact.variableId === "state.legitimacy");
  legitimacy.value = 101;
  assert.throws(() => cognition.compileWorldSnapshot(malformed, cognition.DELENDA_COGNITIVE_DOMAIN), /maximum/i);

  const uncertainty = { ...structuredClone(world) };
  delete uncertainty.digest;
  uncertainty.facts[0].uncertainty = { kind: "INTERVAL", low: 2, high: 1 };
  assert.throws(() => cognition.compileWorldSnapshot(uncertainty, cognition.DELENDA_COGNITIVE_DOMAIN), /interval/i);
});

test("Ava-visible projection removes hidden facts and their hidden sources", () => {
  const state = game.initialState({ seed: 9, theater: "river" });
  const world = cognition.worldSnapshotFromGameState(state, "revision-3");
  const input = { ...structuredClone(world) };
  delete input.digest;
  input.sources.push({
    id: "enemy-secret",
    kind: "WORLD",
    label: "Hidden enemy actuality",
    visibility: "HIDDEN",
    reliability: 1,
    independentGroup: "enemy",
  });
  input.facts.push({
    id: "fact:hidden-enemy",
    variableId: "state.enemy",
    entityId: "enemy",
    value: 999999,
    visibility: "HIDDEN",
    sourceIds: ["enemy-secret"],
    lineage: [],
    validFromDay: state.day,
    observedAtDay: state.day,
    uncertainty: { kind: "EXACT" },
  });
  const complete = cognition.compileWorldSnapshot(input, cognition.DELENDA_COGNITIVE_DOMAIN);
  const visible = cognition.projectAvaVisibleWorld(complete, cognition.DELENDA_COGNITIVE_DOMAIN);
  assert.equal(visible.sources.some((source) => source.id === "enemy-secret"), false);
  assert.equal(visible.facts.some((fact) => fact.id === "fact:hidden-enemy"), false);
});

test("surface AST retains lexemes, finite semantic ownership, and concept activation", () => {
  const ast = cognition.compileSurfaceAst(
    "Ava, explain legitimacy please",
    semantic,
    cognition.DELENDA_COGNITIVE_DOMAIN,
  );
  assert.equal(ast.kind, "SURFACE_AST");
  assert.equal(ast.lexemes.map((item) => item.normalized).join(" "), "ava explain legitimacy please");
  assert.ok(ast.activations.some((item) => item.conceptId === "legitimacy"));
  assert.equal(ast.digest, cognition.compileSurfaceAst(
    "Ava, explain legitimacy please",
    semantic,
    cognition.DELENDA_COGNITIVE_DOMAIN,
  ).digest);
});

test("an LLM can suggest only a compiler-known concept", () => {
  assert.throws(
    () => cognition.compileSurfaceAst("what is the tactical aura", semantic, cognition.DELENDA_COGNITIVE_DOMAIN, undefined, ["tactical-aura"]),
    /outside the compiled domain/i,
  );
  const accepted = cognition.compileSurfaceAst(
    "what is the political support measure",
    semantic,
    cognition.DELENDA_COGNITIVE_DOMAIN,
    undefined,
    ["legitimacy"],
  );
  assert.equal(accepted.activations.at(-1).source, "VALIDATED_SUGGESTION");
});
