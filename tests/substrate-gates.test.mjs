import assert from "node:assert/strict";
import test from "node:test";

const gates = await import(process.env.DELENDA_SUBSTRATE_GATES_BUNDLE);

const ctx = {
  phase: "contact",
  theater: "lowland",
  bands: { supply: "critical" },
  scalars: { readiness: 40 },
  facts: [{ id: "salient_exists", sectorId: "s1", createdDay: 1 }],
  targetSectorId: "s1",
  history: [{ day: 1, blueprintId: "bp1" }],
  day: 3,
  module: "production",
  actorId: "orison",
  cladeId: "production-clade-industrial-command",
  activeNodeIds: ["production"],
  usedCounts: { production: 2 },
  seenRealizationIds: ["r1"],
  cooldownElapsed: { production: 3 },
  ordersRemaining: 2,
  priorities: { production_integrity: "critical" },
  tolerances: { treasury_expenditure: "low" },
  relationships: { orison: { trust: 60 } },
  dependencyStates: { doctrine: "owned" },
  excludedNodeIds: ["x1"],
  campaignDay: 3,
  surface: "web",
};

test("empty all/any/none rules", () => {
  assert.equal(gates.evaluateGate({ op: "all", gates: [] }, ctx), true);
  assert.equal(gates.evaluateGate({ op: "any", gates: [] }, ctx), false);
  assert.equal(gates.evaluateGate({ op: "none", gates: [] }, ctx), true);
});

test("every operator true and false cases", () => {
  const cases = [
    [{ op: "always" }, true],
    [{ op: "phase", values: ["contact"] }, true],
    [{ op: "phase", values: ["terminal"] }, false],
    [{ op: "theater", values: ["lowland"] }, true],
    [{ op: "band", key: "supply", values: ["critical"] }, true],
    [{ op: "scalar", key: "readiness", compare: "lt", value: 50 }, true],
    [{ op: "scalar", key: "readiness", compare: "gt", value: 50 }, false],
    [{ op: "fact", id: "salient_exists", present: true, sector: "target" }, true],
    [{ op: "fact", id: "missing", present: true }, false],
    [{ op: "history", blueprintId: "bp1", withinDays: 5, present: true }, true],
    [{ op: "module", values: ["production"] }, true],
    [{ op: "actor", values: ["orison"] }, true],
    [{ op: "clade", values: ["production-clade-industrial-command"] }, true],
    [{ op: "active", nodeId: "production", present: true }, true],
    [{ op: "used", nodeId: "production", compare: "eq", value: 2 }, true],
    [{ op: "seen", realizationId: "r1", present: true }, true],
    [{ op: "cooldown", nodeId: "production", elapsedDays: 2 }, true],
    [{ op: "orders", compare: "gte", value: 2 }, true],
    [{ op: "priority", dimension: "production_integrity", values: ["critical"] }, true],
    [{ op: "tolerance", dimension: "treasury_expenditure", values: ["low"] }, true],
    [{ op: "relationship", actorId: "orison", key: "trust", compare: "gt", value: 50 }, true],
    [{ op: "dependency", nodeId: "doctrine", state: "owned" }, true],
    [{ op: "exclusion", nodeId: "x1" }, false],
    [{ op: "exclusion", nodeId: "other" }, true],
    [{ op: "campaignAge", compare: "gte", day: 3 }, true],
    [{ op: "surface", values: ["web"] }, true],
    [{ op: "not", gate: { op: "always" } }, false],
    [{ op: "all", gates: [{ op: "always" }, { op: "phase", values: ["contact"] }] }, true],
    [{ op: "any", gates: [{ op: "phase", values: ["terminal"] }, { op: "always" }] }, true],
    [{ op: "none", gates: [{ op: "phase", values: ["terminal"] }] }, true],
  ];
  for (const [gate, expected] of cases) {
    assert.equal(gates.evaluateGate(gate, ctx), expected, JSON.stringify(gate));
  }
});

test("missing inputs do not coerce to zero", () => {
  const detailed = gates.evaluateGateDetailed(
    { op: "scalar", key: "missing", compare: "eq", value: 0 },
    {},
    { missingPolicy: "missing-input", trace: true },
  );
  assert.equal(detailed.result, false);
  assert.equal(detailed.status, "missing-input");
});

test("invalid schema fails validation", () => {
  const issues = gates.validateGate({ op: "invented" });
  assert.ok(issues.length);
  const detailed = gates.evaluateGateDetailed({ op: "invented" }, ctx, { trace: true });
  assert.equal(detailed.status, "invalid");
});

test("trace is deterministic and replayable", () => {
  const gate = {
    op: "all",
    gates: [
      { op: "phase", values: ["contact"] },
      { op: "orders", compare: "gt", value: 0 },
    ],
  };
  const a = gates.evaluateGateDetailed(gate, ctx, { trace: true });
  const b = gates.evaluateGateDetailed(gate, ctx, { trace: true });
  assert.deepEqual(a, b);
  assert.ok(a.traces.some((item) => item.path.includes("all")));
});
