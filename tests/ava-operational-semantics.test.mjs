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

test("the projection contract exposes only compiler-owned relationships", () => {
  const state = stateFor();
  const before = JSON.stringify(state);
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
  assert.ok(result);
  assert.equal(result.relationships.kind, "TYPED_OPERATIONAL_RELATIONSHIPS");
  assert.equal(result.relationships.status, "AVAILABLE");
  assert.ok(result.relationships.relationships.some((relationship) =>
    relationship.sourceId === "formation" && relationship.targetId === "force-commitment",
  ));
  assert.ok(result.relationships.relationships.every((relationship) =>
    relationship.direction === "SOURCE_TO_TARGET" && relationship.readOnly === true,
  ));
  assert.equal(JSON.stringify(state), before);
});

test("campaign synopsis relationships join the current maneuver docket by stable ID", () => {
  const state = stateFor();
  const result = operational.projectAvaOperationalRelationships({
    state,
    entityIds: ["campaign-synopsis"],
  });
  assert.equal(result.status, "AVAILABLE");
  const current = result.relationships.filter((relationship) =>
    relationship.relation === "CURRENT_VISIBLE_MANEUVER",
  );
  assert.equal(current.length, game.situationForState(state).maneuvers.length);
  assert.ok(current.every((relationship) =>
    relationship.relation === "CURRENT_VISIBLE_MANEUVER" &&
    relationship.targetId.startsWith("maneuver:") &&
    relationship.joinKey.startsWith("currentSituation.maneuvers["),
  ));
  assert.ok(result.relationships.some((relationship) =>
    relationship.relation === "RELATED_CONCEPT" && relationship.targetId === "execution-confidence",
  ));
  assert.match(result.digest, /^[a-f0-9]{64}$/);
});

test("pairwise maneuver comparison exposes bounded evidence without a winner", () => {
  const state = stateFor();
  const before = JSON.stringify(state);
  const left = run("compare M1 M2", state);
  assert.equal(left.response.status, "OK", left.text);
  assert.equal(left.operationalSemantics.comparison.kind, "PAIRWISE_MANEUVER_COMPARISON");
  assert.equal(left.operationalSemantics.comparison.status, "AVAILABLE");
  assert.match(left.operationalSemantics.comparison.left.id, /^maneuver:/);
  assert.match(left.operationalSemantics.comparison.right.id, /^maneuver:/);
  assert.notEqual(
    left.operationalSemantics.comparison.left.id,
    left.operationalSemantics.comparison.right.id,
  );
  const reversedQuery = {
    ...left.compile.semantic,
    subject: {
      ...left.compile.semantic.subject,
      entityIds: [...left.compile.semantic.subject.entityIds].reverse(),
    },
  };
  const reversed = operational.projectAvaManeuverComparison({
    state,
    query: reversedQuery,
  });
  assert.equal(reversed.left.id, left.operationalSemantics.comparison.right.id);
  assert.equal(reversed.right.id, left.operationalSemantics.comparison.left.id);
  assert.deepEqual(
    left.operationalSemantics.comparison.dimensions.map((dimension) => dimension.id),
    reversed.dimensions.map((dimension) => dimension.id),
  );
  assert.equal("winner" in left.operationalSemantics.comparison, false);
  assert.ok(left.operationalSemantics.comparison.dimensions.length >= 7);
  assert.ok(left.operationalSemantics.comparison.dimensions.every((dimension) =>
    ["COMPARABLE", "NOT_COMPARABLE", "UNAVAILABLE", "AMBIGUOUS"].includes(dimension.status),
  ));
  assert.deepEqual(left.state, state);
  assert.equal(JSON.stringify(state), before);
  assert.doesNotMatch(
    JSON.stringify(left.operationalSemantics.comparison),
    /"(?:campaignSeed|resolutionTicket|preparedOrders|resolutionHistory|adversaryLedger|rng)"\s*:/i,
  );
});
