import assert from "node:assert/strict";
import test from "node:test";

const cognition = await import(process.env.DELENDA_AVA_COGNITIVE_BUNDLE);
const game = await import(process.env.DELENDA_SUBSTRATE_GAME_BUNDLE);

const context = (day = 1, revision = "temporal-r1") => {
  const state = { ...game.initialState({ seed: 6060, theater: "ridge" }), day };
  const world = cognition.worldSnapshotFromGameState(state, revision);
  return { state, world, domain: cognition.DELENDA_COGNITIVE_DOMAIN };
};

const schedule = (world, events, input = {}) => ({
  kind: "SCHEDULE",
  id: "schedule-1",
  expectedWorldRevision: world.revision,
  mode: "DEPENDENCY",
  events,
  ...input,
});

test("temporal policy compiles contiguous named horizons and phase arithmetic", () => {
  const domain = cognition.DELENDA_COGNITIVE_DOMAIN;
  assert.deepEqual(domain.temporal.phaseOrder, ["DAWN", "COMMAND", "ACTION", "RESOLUTION"]);
  assert.equal(cognition.normalizeTemporalPoint({ day: 2, phase: "ACTION" }, domain), 6);
  assert.deepEqual(cognition.temporalPointFromPhase(6, domain), { day: 2, phase: "ACTION" });
  const gap = structuredClone(cognition.DELENDA_COGNITIVE_DOMAIN_SPEC);
  gap.temporal.horizons[1].startPhase += 1;
  assert.throws(() => cognition.compileCognitiveDomain(gap), /overlap|gap/i);
  const short = structuredClone(cognition.DELENDA_COGNITIVE_DOMAIN_SPEC);
  short.temporal.horizons.at(-1).endPhase -= 1;
  assert.throws(() => cognition.compileCognitiveDomain(short), /cover the projection limit/i);
});

test("all thirteen closed-open interval relations are exhaustive", () => {
  const right = { start: 4, end: 8 };
  const cases = [
    [{ start: 0, end: 3 }, "BEFORE"],
    [{ start: 0, end: 4 }, "MEETS"],
    [{ start: 2, end: 6 }, "OVERLAPS"],
    [{ start: 4, end: 6 }, "STARTS"],
    [{ start: 5, end: 7 }, "DURING"],
    [{ start: 5, end: 8 }, "FINISHES"],
    [{ start: 4, end: 8 }, "EQUALS"],
    [{ start: 2, end: 8 }, "FINISHED_BY"],
    [{ start: 2, end: 10 }, "CONTAINS"],
    [{ start: 4, end: 10 }, "STARTED_BY"],
    [{ start: 6, end: 10 }, "OVERLAPPED_BY"],
    [{ start: 8, end: 10 }, "MET_BY"],
    [{ start: 9, end: 10 }, "AFTER"],
  ];
  assert.deepEqual(cases.map(([left]) => cognition.relateTemporalIntervals(left, right)), cases.map(([, relation]) => relation));
});

test("dependency schedules permit concurrency while serial schedules remain deterministic", () => {
  const { world, domain } = context();
  const events = [
    { id: "a", durationPhases: 2, dependsOn: [] },
    { id: "b", durationPhases: 1, dependsOn: ["a"] },
    { id: "c", durationPhases: 1, dependsOn: [] },
  ];
  const dependency = cognition.executeTemporalRequest(schedule(world, events), world, domain);
  assert.equal(dependency.status, "SCHEDULED");
  assert.deepEqual(dependency.events.map((event) => [event.id, event.interval]), [
    ["a", { start: 0, end: 2 }],
    ["c", { start: 0, end: 1 }],
    ["b", { start: 2, end: 3 }],
  ]);
  const serial = cognition.executeTemporalRequest(schedule(world, [...events].reverse(), {
    mode: "SERIAL",
  }), world, domain);
  assert.deepEqual(serial.events.map((event) => event.id), ["a", "b", "c"]);
  assert.deepEqual(serial, cognition.executeTemporalRequest(schedule(world, events, {
    mode: "SERIAL",
  }), world, domain));
});

test("deadlines, exclusivity, cycles, and cumulative projection limits fail closed", () => {
  const { world, domain } = context();
  const conflict = cognition.executeTemporalRequest(schedule(world, [
    { id: "a", durationPhases: 3, dependsOn: [], deadlinePhase: 2, exclusiveResource: "staff" },
    { id: "b", durationPhases: 2, dependsOn: [], exclusiveResource: "staff" },
  ]), world, domain);
  assert.equal(conflict.status, "CONFLICT");
  assert.ok(conflict.conflicts.some((item) => /deadline missed/.test(item)));
  assert.ok(conflict.conflicts.some((item) => /exclusive resource/.test(item)));
  assert.throws(() => cognition.executeTemporalRequest(schedule(world, [
    { id: "a", durationPhases: 1, dependsOn: ["b"] },
    { id: "b", durationPhases: 1, dependsOn: ["a"] },
  ]), world, domain), /dependency cycle/i);
  const tooLong = cognition.executeTemporalRequest(schedule(world, [
    { id: "a", durationPhases: 6, dependsOn: [] },
    { id: "b", durationPhases: 6, dependsOn: [] },
    { id: "c", durationPhases: 6, dependsOn: [] },
  ], { mode: "SERIAL" }), world, domain);
  assert.equal(tooLong.status, "CONFLICT");
  assert.ok(tooLong.conflicts.some((item) => /projection limit/.test(item)));
});

test("evidence age distinguishes current, fresh, stale, historical, and future", () => {
  const { world, domain } = context(5, "temporal-age");
  const make = (observedAtDay, validFromDay, validUntilDay) => {
    const input = structuredClone(world);
    delete input.digest;
    const fact = input.facts.find((item) => item.variableId === "state.legitimacy");
    fact.observedAtDay = observedAtDay;
    fact.validFromDay = validFromDay;
    if (validUntilDay === undefined) delete fact.validUntilDay;
    else fact.validUntilDay = validUntilDay;
    const compiled = cognition.compileWorldSnapshot(input, domain);
    return [compiled.facts.find((item) => item.id === fact.id), compiled];
  };
  const cases = [
    [...make(5, 5), "CURRENT"],
    [...make(4, 1), "FRESH"],
    [...make(2, 1), "STALE"],
    [...make(1, 1, 4), "HISTORICAL"],
    [...make(6, 6), "FUTURE"],
  ];
  assert.deepEqual(cases.map(([fact, snapshot]) => cognition.assessEvidenceAge(fact, snapshot, domain).state), cases.map((item) => item[2]));
});

test("forecast envelopes require declared horizons and scenarios while outcomes remain unbound", () => {
  const { world, domain } = context();
  const forecast = cognition.executeTemporalRequest({
    kind: "FORECAST",
    id: "forecast-1",
    expectedWorldRevision: world.revision,
    scenarioId: "scenario:hold-current-orders",
    horizonId: "near",
    assumptions: ["No unmodeled order is issued"],
  }, world, domain);
  assert.equal(forecast.status, "FORECAST_ENVELOPE");
  assert.equal(forecast.forecast.outcomeSemantics, "UNBOUND");
  assert.deepEqual(forecast.forecast.interval, { start: 4, end: 8 });
  assert.throws(() => cognition.executeTemporalRequest({
    kind: "FORECAST", id: "open", expectedWorldRevision: world.revision,
    scenarioId: "", horizonId: "near", assumptions: [],
  }, world, domain), /scenario id/i);
  assert.throws(() => cognition.executeTemporalRequest({
    kind: "FORECAST", id: "open", expectedWorldRevision: world.revision,
    scenarioId: "scenario:x", horizonId: "invented", assumptions: [],
  }, world, domain), /undeclared forecast horizon/i);
});

test("hidden, altered, and stale temporal evidence or requests are rejected", () => {
  const { world, domain } = context();
  const fact = world.facts.find((item) => item.variableId === "state.legitimacy");
  assert.throws(() => cognition.assessEvidenceAge({ ...fact, observedAtDay: 0 }, world, domain), /altered temporal evidence/i);
  const hiddenInput = structuredClone(world);
  delete hiddenInput.digest;
  hiddenInput.facts.find((item) => item.id === fact.id).visibility = "HIDDEN";
  const hidden = cognition.compileWorldSnapshot(hiddenInput, domain);
  assert.throws(() => cognition.assessEvidenceAge(hidden.facts.find((item) => item.id === fact.id), hidden, domain), /hidden or absent/i);
  assert.throws(() => cognition.executeTemporalRequest({
    kind: "DELAY", id: "stale", expectedWorldRevision: "stale", value: 1, phases: 1,
  }, world, domain), /revision is stale/i);
});

test("SEQUENCE, FORECAST, and DELAY share one proof-bearing temporal adapter", () => {
  const { world, domain } = context();
  const semantic = {
    operation: "PREDICT", subject: { type: "CAMPAIGN_CHOICE", entityIds: [] },
    scope: { group: "ALL", domains: ["MAIN"], excludedDomains: [] },
    timeframe: "PROJECTED", criteria: ["OVERALL_VALUE"], polarity: "AFFIRMATIVE",
    requestedDetail: "REASONS", perspective: "PLAYER", outputForm: "TERMINAL",
    overlays: [], confidence: 1, sourceSpans: {},
  };
  const surface = cognition.compileSurfaceAst("forecast", semantic, domain);
  const semanticTree = cognition.resolveSemanticTree({ surface, world, domain });
  const requests = {
    SEQUENCE: schedule(world, [{ id: "a", durationPhases: 1, dependsOn: [] }]),
    FORECAST: { kind: "FORECAST", id: "f", expectedWorldRevision: world.revision, scenarioId: "scenario:x", horizonId: "immediate", assumptions: [] },
    DELAY: { kind: "DELAY", id: "d", expectedWorldRevision: world.revision, value: "hold", phases: 1 },
  };
  for (const operator of Object.keys(requests)) {
    const program = {
      id: `temporal-${operator}`, version: "1", semanticTreeDigest: semanticTree.digest,
      worldRevision: world.revision, authorityCeiling: "READ_ONLY",
      nodes: [{ id: "temporal", operator, inputs: { request: { kind: "LITERAL", datum: {
        kind: "RECORD", value: requests[operator], sourceIds: [], proofIds: [], authority: "READ_ONLY",
      } } } }], outputNodeId: "temporal",
    };
    const result = cognition.executeCognitiveProgram(program, {
      domain, world, semanticTree, adapters: cognition.temporalEngineAdapters,
    });
    assert.equal(result.status, "COMPLETED");
    assert.ok(result.output.proofIds.includes("temporal-engine-proof"));
  }
});
