import test from "node:test";
import assert from "node:assert/strict";

const operational = await import(process.env.DELENDA_AVA_OPERATIONAL_BUNDLE);
const concepts = await import(process.env.DELENDA_AVA_CONCEPTS_BUNDLE);
const nexus = await import(process.env.DELENDA_AVA_NEXUS_BUNDLE);
const game = await import(process.env.DELENDA_SUBSTRATE_GAME_BUNDLE);

const stateFor = (seed = 708) => game.initialState({ seed, theater: "lowland" });
const contextFor = (state) => ({
  playerId: "generated-operational@example.com",
  campaignId: state.campaignId,
  campaignRevision: nexus.avaNexusStateRevision(state),
  surface: "web",
  authority: "observer",
  nowMs: 1_700_000_000_000,
});
const hiddenKeys = /"(?:campaignSeed|resolutionTicket|preparedOrders|resolutionHistory|adversaryLedger|rng)"\s*:/i;

test("generated concept relationship corpus preserves declared ownership", () => {
  const state = stateFor();
  for (const concept of Object.values(concepts.CONCEPTS)) {
    if (!concept.related.length) continue;
    const result = operational.projectAvaOperationalRelationships({
      state,
      entityIds: [concept.id],
    });
    assert.notEqual(result.status, "UNAVAILABLE", concept.id);
    for (const relationship of result.relationships.filter((item) => item.relation === "RELATED_CONCEPT")) {
      assert.equal(relationship.sourceId, concept.id);
      assert.equal(relationship.relation, "RELATED_CONCEPT");
      assert.equal(relationship.direction, "SOURCE_TO_TARGET");
      assert.equal(relationship.readOnly, true);
      assert.ok(relationship.joinKey.startsWith(`CONCEPTS.${concept.id}.related[`));
      assert.ok(relationship.evidence.length <= result.bounds.maxEvidenceFragmentsPerRelationship);
      assert.ok(concepts.CONCEPTS[relationship.targetId]);
    }
    assert.match(result.digest, /^[a-f0-9]{64}$/);
  }
});

test("generated current maneuver comparison corpus preserves identity and no-action boundaries", () => {
  const state = stateFor();
  const current = game.situationForState(state).maneuvers;
  assert.ok(current.length >= 2);
  for (let leftIndex = 0; leftIndex < current.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < current.length; rightIndex += 1) {
      const leftId = current[leftIndex];
      const rightId = current[rightIndex];
      const before = JSON.stringify(state);
      const result = operational.projectAvaManeuverComparison({
        state,
        query: {
          operation: "COMPARE",
          subject: { type: "CAMPAIGN_CHOICE", entityIds: [`maneuver:${leftId}`, `maneuver:${rightId}`] },
          scope: { group: "MAIN", domains: ["MAIN"], excludedDomains: [] },
          timeframe: "CURRENT_DAY",
          criteria: ["OVERALL_VALUE"],
          polarity: "AFFIRMATIVE",
          requestedDetail: "CALCULUS",
          perspective: "PLAYER",
          outputForm: "TERMINAL",
          overlays: [],
          confidence: 1,
          sourceSpans: {},
        },
      });
      assert.equal(result.status, "AVAILABLE");
      assert.equal(result.left.id, `maneuver:${leftId}`);
      assert.equal(result.right.id, `maneuver:${rightId}`);
      assert.deepEqual(result.dimensions.map((dimension) => dimension.id), [
        "execution-confidence",
        "commitment",
        "casualty-factor",
        "supply-burden",
        "success-pressure",
        "failure-pressure",
        "projected-ground-movement",
      ]);
      assert.equal("winner" in result, false);
      assert.doesNotMatch(JSON.stringify(result), hiddenKeys);
      assert.equal(JSON.stringify(state), before);
    }
  }
});

test("generated advice aliases and guarded neighbors remain typed and read-only", () => {
  const state = stateFor();
  for (const line of ["advise", "what should I do", "recommend a next move"]) {
    const result = nexus.runAvaNexusLine(line, contextFor(state), state, nexus.createAvaNexusSession());
    assert.equal(result.response.status, "OK", line);
    assert.equal(result.operationalSemantics.advice.kind, "TYPED_ADVICE", line);
    assert.equal(result.operationalSemantics.authority, "READ_ONLY", line);
    assert.equal(result.operationalSemantics.mutation, false, line);
    assert.doesNotMatch(JSON.stringify(result.operationalSemantics), hiddenKeys, line);
    assert.deepEqual(result.state, state, line);
  }
  for (const line of ["stage advance", "issue advance", "do not advance", "prepare gain territory"]) {
    const result = nexus.runAvaNexusLine(line, contextFor(state), state, nexus.createAvaNexusSession());
    assert.notEqual(result.response.status, "EXECUTED", line);
    assert.deepEqual(result.state, state, line);
  }
});

test("generated unavailable relationship requests fail closed at the declared bound", () => {
  const state = stateFor();
  const result = operational.projectAvaOperationalRelationships({
    state,
    entityIds: Array.from({ length: 21 }, (_, index) => `synthetic-${index}`),
  });
  assert.equal(result.status, "UNAVAILABLE");
  assert.equal(result.relationships.length, 0);
  assert.ok(result.limitations.some((limitation) => limitation.id === "entity-bound-exceeded"));
  assert.doesNotMatch(JSON.stringify(result), hiddenKeys);
});
