import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { trainPolicy, TRAINER_CONFIG_V1, auditSlotCount } from "../packages/contentgen-train/src/trainer.mjs";
import { minePrismProposals } from "../packages/contentgen-train/src/prism-mine.mjs";
import {
  detectMutations,
  evaluatePolicy,
} from "../packages/contentgen-evaluate/src/evaluate.mjs";

function loadRows() {
  const approved = readFileSync("content-quality/corpus/approved.jsonl", "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const rejected = readFileSync("content-quality/corpus/rejected.jsonl", "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  return [...approved, ...rejected].map((row, index) => ({
    ...row,
    sessionId: `session-${index % 3}`,
    discretePredicates: [
      row.failureClass ? `failureClass=${row.failureClass}` : null,
      row.chord ? `chord=${row.chord}` : null,
    ].filter(Boolean),
  }));
}

test("trainer config matches §4.5 pinned values", () => {
  assert.equal(TRAINER_CONFIG_V1.iterations, 500);
  assert.equal(TRAINER_CONFIG_V1.l2PenaltyLambda, 1e-4);
  assert.equal(TRAINER_CONFIG_V1.learningRate.numerator, 0.2);
  assert.equal(auditSlotCount(10), 2);
  assert.equal(auditSlotCount(3), 1);
});

test("policy reproduces byte-identically from the same rows", () => {
  const rows = loadRows();
  const a = trainPolicy(rows, { corpusVersion: "ava-taste/v2-calibrated" });
  const b = trainPolicy(rows, { corpusVersion: "ava-taste/v2-calibrated" });
  assert.equal(a.policy.policyHash, b.policy.policyHash);
  assert.deepEqual(a.policy.weights, b.policy.weights);
});

test("independent evaluator does not import trainer", () => {
  const source = readFileSync(
    "packages/contentgen-evaluate/src/evaluate.mjs",
    "utf8",
  );
  assert.doesNotMatch(source, /contentgen-train/);
  assert.doesNotMatch(source, /from \"\.\.\/contentgen-train/);
});

test("held-out evaluation and mutation suite", () => {
  const rows = loadRows();
  const trained = trainPolicy(rows, { corpusVersion: "ava-taste/v2-calibrated" });
  const report = evaluatePolicy(trained.policy, trained.heldOut);
  assert.ok(Number.isFinite(report.heldOutLogLoss));
  assert.ok(report.balancedAccuracy >= 0);
  assert.ok(report.falseNegativeRate <= 1);
  const mutations = detectMutations(trained.policy, trained.heldOut);
  assert.equal(mutations.labelFlipDetected, true);
  assert.equal(mutations.weightTamperDetected, true);
  assert.equal(mutations.siblingLeakVisible, true);
});

test("unauthenticated labels fail closed", () => {
  assert.throws(
    () =>
      trainPolicy([{ id: "x", text: "hi", label: "maybe", chord: "a" }], {
        corpusVersion: "t",
      }),
    /UNAUTHENTICATED_LABEL/,
  );
});

test("prism proposals never auto-activate", () => {
  const failures = Array.from({ length: 12 }, (_, i) => ({
    id: `f-${i}`,
    label: 0,
    failureClass: "GENERIC_ABSTRACTION",
    discretePredicates: ["failureClass=GENERIC_ABSTRACTION", "chord=urgency"],
    sessionId: i < 6 ? "s1" : "s2",
  }));
  const proposals = minePrismProposals(failures, { approvedCanaryIds: [] });
  assert.ok(proposals.length >= 1);
  assert.ok(proposals.every((row) => row.status === "PROPOSED"));
});
