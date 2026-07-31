import assert from "node:assert/strict";
import test from "node:test";

const cognition = await import(process.env.DELENDA_AVA_COGNITIVE_BUNDLE);
const game = await import(process.env.DELENDA_SUBSTRATE_GAME_BUNDLE);

const context = () => {
  const state = game.initialState({ seed: 8080, theater: "river" });
  const base = cognition.worldSnapshotFromGameState(state, "epistemic-r1");
  const input = structuredClone(base);
  delete input.digest;
  const sources = [
    ...input.sources,
    { id: "source:scout-a", kind: "WORLD", label: "Scout A", visibility: "AVA_VISIBLE", reliability: 0.8, independentGroup: "scout-a" },
    { id: "source:scout-a-copy", kind: "DERIVED", label: "Scout A copy", visibility: "AVA_VISIBLE", reliability: 0.7, independentGroup: "scout-a" },
    { id: "source:scout-b", kind: "WORLD", label: "Scout B", visibility: "AVA_VISIBLE", reliability: 0.6, independentGroup: "scout-b" },
    { id: "source:hidden", kind: "WORLD", label: "Hidden", visibility: "HIDDEN", reliability: 1, independentGroup: "enemy" },
  ];
  const facts = [
    ...input.facts,
    { id: "obs:a", variableId: "state.readiness", entityId: "campaign", value: 60, visibility: "AVA_VISIBLE", sourceIds: ["source:scout-a"], lineage: [], validFromDay: state.day, observedAtDay: state.day, uncertainty: { kind: "INTERVAL", low: 55, high: 65 } },
    { id: "obs:a-copy", variableId: "state.readiness", entityId: "campaign", value: 60, visibility: "AVA_VISIBLE", sourceIds: ["source:scout-a-copy"], lineage: ["obs:a"], validFromDay: state.day, observedAtDay: state.day, uncertainty: { kind: "EXACT" } },
    { id: "obs:b", variableId: "state.readiness", entityId: "campaign", value: 40, visibility: "AVA_VISIBLE", sourceIds: ["source:scout-b"], lineage: [], validFromDay: state.day, observedAtDay: state.day - 1, uncertainty: { kind: "EXACT" } },
    { id: "obs:hidden", variableId: "state.readiness", entityId: "campaign", value: 90, visibility: "HIDDEN", sourceIds: ["source:hidden"], lineage: [], validFromDay: state.day, observedAtDay: state.day, uncertainty: { kind: "EXACT" } },
  ];
  const world = cognition.compileWorldSnapshot({ ...input, sources, facts }, cognition.DELENDA_COGNITIVE_DOMAIN);
  return { world, domain: cognition.DELENDA_COGNITIVE_DOMAIN };
};

const base = (world, kind) => ({
  kind,
  id: `${kind.toLowerCase()}-request`,
  expectedWorldRevision: world.revision,
  actorId: "ava",
  scenarioId: "scenario:daily-assessment",
});

const estimate = (world) => ({
  ...base(world, "ESTIMATE"),
  variableId: "state.readiness",
  factIds: ["obs:a", "obs:a-copy", "obs:b"],
});

test("epistemic policy is compiler-closed", () => {
  const domain = cognition.DELENDA_COGNITIVE_DOMAIN;
  assert.equal(domain.manifest.epistemicPolicyId, "delenda-evidence-policy");
  const invalid = structuredClone(cognition.DELENDA_COGNITIVE_DOMAIN_SPEC);
  invalid.epistemic.minimumSourceReliability = 2;
  assert.throws(() => cognition.compileCognitiveDomain(invalid), /reliability is outside/i);
  const actors = structuredClone(cognition.DELENDA_COGNITIVE_DOMAIN_SPEC);
  actors.epistemic.actorIds.push("ava");
  assert.throws(() => cognition.compileCognitiveDomain(actors), /actors must be nonempty and unique/i);
  const rule = structuredClone(cognition.DELENDA_COGNITIVE_DOMAIN_SPEC);
  rule.epistemic.numericEstimationRule = "CALLER_SELECTED";
  assert.throws(() => cognition.compileCognitiveDomain(rule), /unknown estimation rule/i);
});

test("corroboration counts independent records and preserves refutation", () => {
  const { world, domain } = context();
  const result = cognition.executeEpistemicRequest({
    ...base(world, "CORROBORATE"), variableId: "state.readiness", proposition: 60,
    factIds: ["obs:a", "obs:a-copy", "obs:b"],
  }, world, domain);
  assert.equal(result.status, "MIXED");
  assert.deepEqual(result.supportFactIds, ["obs:a"]);
  assert.deepEqual(result.refutationFactIds, ["obs:b"]);
  assert.deepEqual(result.independentRecordIds, ["obs:a", "obs:b"]);
  assert.equal(result.confidence, 0.8);
});

test("dispute never erases supporting evidence", () => {
  const { world, domain } = context();
  const result = cognition.executeEpistemicRequest({
    ...base(world, "DISPUTE"), variableId: "state.readiness", proposition: 60,
    factIds: ["obs:a", "obs:b"],
  }, world, domain);
  assert.equal(result.status, "MIXED");
  assert.deepEqual(result.supportFactIds, ["obs:a"]);
  assert.deepEqual(result.refutationFactIds, ["obs:b"]);
});

test("estimates use authored weighted median and bounds replay the estimate", () => {
  const { world, domain } = context();
  const estimated = cognition.executeEpistemicRequest(estimate(world), world, domain);
  assert.equal(estimated.status, "ESTIMATED");
  assert.equal(estimated.value, 60);
  assert.equal(estimated.confidence, 0.7);
  const bounded = cognition.executeEpistemicRequest({
    ...base(world, "BOUND"), estimate: estimate(world),
  }, world, domain);
  assert.equal(bounded.status, "BOUNDED");
  assert.deepEqual(bounded.interval, { low: 40, high: 65 });
  assert.ok(bounded.proofIds.includes("estimate-replay"));
});

test("assumptions and downweights retain explicit policy lineage", () => {
  const { world, domain } = context();
  const assumed = cognition.executeEpistemicRequest({
    ...base(world, "ASSUME"), premiseId: "premise:equipment-holds",
    variableId: "state.equipment", value: 50,
  }, world, domain);
  assert.equal(assumed.status, "ASSUMED");
  assert.ok(assumed.proofIds.includes("premise:premise:equipment-holds"));
  const downweighted = cognition.executeEpistemicRequest({
    ...base(world, "DOWNWEIGHT"), factIds: ["obs:a", "obs:a-copy"], reason: "DEPENDENT",
  }, world, domain);
  assert.equal(downweighted.weights["obs:a"], 0.4);
  assert.throws(() => cognition.executeEpistemicRequest({
    ...base(world, "DOWNWEIGHT"), factIds: ["obs:a", "obs:b"], reason: "DEPENDENT",
  }, world, domain), /no shared record or lineage/i);
  assert.throws(() => cognition.executeEpistemicRequest({
    ...base(world, "ASSUME"), premiseId: "premise:overflow",
    variableId: "state.readiness", value: 101,
  }, world, domain), /above its declared maximum/i);
});

test("marginalization is an explicit finite hypothesis sum", () => {
  const { world, domain } = context();
  const result = cognition.executeEpistemicRequest({
    ...base(world, "MARGINALIZE"), modelId: "FINITE_HYPOTHESIS_SUM",
    hypotheses: [
      { id: "high", priorWeight: 0.5, likelihood: 0.8, value: 10 },
      { id: "low", priorWeight: 0.5, likelihood: 0.2, value: 0 },
    ],
  }, world, domain);
  assert.equal(result.status, "MARGINALIZED");
  assert.deepEqual(result.posterior, [{ id: "high", weight: 0.8 }, { id: "low", weight: 0.2 }]);
  assert.equal(result.value, 8);
});

test("hidden, stale, cross-actor, aged-out, forged, and ad hoc evidence fails closed", () => {
  const { world, domain } = context();
  assert.throws(() => cognition.executeEpistemicRequest({
    ...estimate(world), expectedWorldRevision: "stale",
  }, world, domain), /revision is stale/i);
  assert.throws(() => cognition.executeEpistemicRequest({
    ...estimate(world), actorId: "enemy",
  }, world, domain), /not compiler-approved/i);
  assert.throws(() => cognition.executeEpistemicRequest({
    ...estimate(world), factIds: ["obs:hidden"],
  }, world, domain), /hidden or absent/i);
  assert.throws(() => cognition.executeEpistemicRequest({
    ...base(world, "MARGINALIZE"), modelId: "AD_HOC", hypotheses: [],
  }, world, domain), /not compiler-approved/i);
  const forged = structuredClone(world);
  forged.facts.find((fact) => fact.id === "obs:a").value = 99;
  assert.throws(() => cognition.executeEpistemicRequest(estimate(forged), forged, domain), /digest is forged/i);
  const input = structuredClone(world);
  delete input.digest;
  input.facts.find((fact) => fact.id === "obs:b").observedAtDay = world.campaignDay - 4;
  const aged = cognition.compileWorldSnapshot(input, domain);
  assert.throws(() => cognition.executeEpistemicRequest(estimate(aged), aged, domain), /aged out/i);
});

test("all seven epistemic primitives share one typed proof-bearing adapter", () => {
  const { world, domain } = context();
  const semantic = {
    operation: "PREDICT", subject: { type: "CAMPAIGN_CHOICE", entityIds: [] },
    scope: { group: "ALL", domains: ["MAIN"], excludedDomains: [] }, timeframe: "PROJECTED",
    criteria: ["OVERALL_VALUE"], polarity: "AFFIRMATIVE", requestedDetail: "REASONS",
    perspective: "PLAYER", outputForm: "TERMINAL", overlays: [], confidence: 1, sourceSpans: {},
  };
  const surface = cognition.compileSurfaceAst("explain readiness", semantic, domain);
  const semanticTree = cognition.resolveSemanticTree({ surface, world, domain });
  const requests = {
    CORROBORATE: { ...base(world, "CORROBORATE"), variableId: "state.readiness", proposition: 60, factIds: ["obs:a", "obs:b"] },
    DISPUTE: { ...base(world, "DISPUTE"), variableId: "state.readiness", proposition: 60, factIds: ["obs:a", "obs:b"] },
    ASSUME: { ...base(world, "ASSUME"), premiseId: "premise:test", variableId: "state.readiness", value: 55 },
    ESTIMATE: estimate(world),
    BOUND: { ...base(world, "BOUND"), estimate: estimate(world) },
    DOWNWEIGHT: { ...base(world, "DOWNWEIGHT"), factIds: ["obs:a", "obs:a-copy"], reason: "DEPENDENT" },
    MARGINALIZE: { ...base(world, "MARGINALIZE"), modelId: "FINITE_HYPOTHESIS_SUM", hypotheses: [{ id: "a", priorWeight: 1, likelihood: 1, value: 2 }] },
  };
  for (const operator of Object.keys(requests)) {
    const program = {
      id: `epistemic-${operator}`, version: "1", semanticTreeDigest: semanticTree.digest,
      worldRevision: world.revision, authorityCeiling: "READ_ONLY",
      nodes: [{ id: "epistemic", operator, inputs: { request: { kind: "LITERAL", datum: {
        kind: "RECORD", value: requests[operator], sourceIds: [], proofIds: [], authority: "READ_ONLY",
      } } } }], outputNodeId: "epistemic",
    };
    const result = cognition.executeCognitiveProgram(program, {
      domain, world, semanticTree, adapters: cognition.epistemicEngineAdapters,
    });
    assert.equal(result.status, "COMPLETED", result.blocker);
    assert.ok(result.output.proofIds.includes("epistemic-engine-proof"));
  }
});
