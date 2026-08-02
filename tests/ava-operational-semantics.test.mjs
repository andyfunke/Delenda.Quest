import test from "node:test";
import assert from "node:assert/strict";

const operational = await import(process.env.DELENDA_AVA_OPERATIONAL_BUNDLE);
const nexus = await import(process.env.DELENDA_AVA_NEXUS_BUNDLE);
const game = await import(process.env.DELENDA_SUBSTRATE_GAME_BUNDLE);

const stateFor = (seed = 708) =>
  game.initialState({ seed, theater: "lowland" });

const contextFor = (state, surface = "web") => ({
  playerId: `operational-${surface}@example.com`,
  campaignId: state.campaignId,
  campaignRevision: nexus.avaNexusStateRevision(state),
  surface,
  authority: "observer",
  nowMs: 1_700_000_000_000,
});

const run = (line, state = stateFor(), surface = "web") =>
  nexus.runAvaNexusLine(
    line,
    contextFor(state, surface),
    state,
    nexus.createAvaNexusSession(),
  );

test("canonical decision evidence is deterministic and read-only", () => {
  const state = stateFor();
  const before = JSON.stringify(state);
  const left = run("advise", state);
  const right = run("advise", state);
  assert.equal(left.response.status, "OK", left.text);
  assert.ok(left.operationalSemantics);
  assert.deepEqual(left.operationalSemantics, right.operationalSemantics);
  assert.equal(left.operationalSemantics.calculus.identity, "delenda-cognitive-decision");
  assert.equal(left.operationalSemantics.authority, "READ_ONLY");
  assert.equal(left.operationalSemantics.mutation, false);
  assert.match(left.operationalSemantics.calculus.digest, /^[a-f0-9]{64}$/);
  assert.ok(left.operationalSemantics.calculus.equations.length >= 3);
  assert.ok(left.operationalSemantics.calculus.rules.length >= 1);
  assert.ok(left.operationalSemantics.calculus.optionEnvelope.length >= 2);
  assert.equal(left.operationalSemantics.advice.kind, "TYPED_ADVICE");
  assert.equal(
    left.operationalSemantics.advice.recommendation.authority,
    "COMPILED_DECISION_WINNER",
  );
  assert.equal(
    left.operationalSemantics.advice.recommendation.optionId,
    left.operationalSemantics.calculus.optionEnvelope.find(
      (option) => option.availability === "AVAILABLE",
    ).id,
  );
  assert.ok(left.operationalSemantics.advice.objective.problemClass);
  assert.ok(left.operationalSemantics.advice.priorityAxes.length >= 1);
  assert.equal(
    left.operationalSemantics.advice.equations,
    left.operationalSemantics.calculus.equations,
  );
  assert.equal(
    left.operationalSemantics.advice.rules,
    left.operationalSemantics.calculus.rules,
  );
  assert.deepEqual(left.state, state);
  assert.equal(JSON.stringify(state), before);
  assert.doesNotMatch(
    JSON.stringify(left.operationalSemantics),
    /"(?:resolutionTicket|campaignSeed|preparedOrders|resolutionHistory|adversaryLedger|rng)"\s*:/i,
  );
});

test("forecast evidence preserves the active temporal owner and sealed boundary", () => {
  const state = stateFor();
  const result = run("forecast M1", state);
  assert.equal(result.response.status, "OK", result.text);
  assert.equal(result.operationalSemantics.forecast.kind, "TYPED_FORECAST");
  assert.equal(
    result.operationalSemantics.calculus.identity,
    "ava-temporal-disclosed-projection",
  );
  assert.ok(result.operationalSemantics.calculus.rules.length >= 1);
  assert.equal(result.operationalSemantics.mutation, false);
  assert.deepEqual(result.state, state);
});

test("the projection contract is directly callable without inventing a result", () => {
  const state = stateFor();
  const result = operational.projectAvaOperationalSemantics({
    state,
    query: {
      operation: "EXPLAIN",
      subject: { type: "METRIC", entityIds: ["formation"] },
      scope: { group: "MAIN", domains: ["MAIN"], excludedDomains: [] },
      timeframe: "CURRENT_DAY",
      criteria: [],
      polarity: "AFFIRMATIVE",
      requestedDetail: "REASONS",
      perspective: "PLAYER",
      outputForm: "TERMINAL",
      overlays: [],
      confidence: 1,
      sourceSpans: {},
    },
    instruction: { kind: "EXPLAIN", entity: { id: "formation", kind: "metric", label: "Formation" }, facet: "meaning" },
  });
  assert.equal(result, undefined);
});
