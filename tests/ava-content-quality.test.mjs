import test from "node:test";
import assert from "node:assert/strict";
import { buildReport, decompile, enumerate, hardGate, indexAndCompare } from "../scripts/ava-content-quality.mjs";

test("enumeration is non-empty, stable, and source-versioned", () => {
  const a = buildReport(); const b = buildReport();
  assert.ok(a.candidates.length >= 14);
  assert.equal(a.manifestHash, b.manifestHash);
  assert.equal(a.grammarVersion, b.grammarVersion);
});

test("decompiler preserves exact text and emits projections", () => {
  const candidate = enumerate()[0]; const item = decompile(candidate);
  assert.equal(item.candidate.text, candidate.text);
  assert.deepEqual(Object.keys(item.projections), ["P0", "P1", "P2", "P3", "P4"]);
});

test("authority-risk content fails closed", () => {
  const candidate = { ...enumerate()[0], text: "Execute the order; it succeeded." };
  const item = decompile(candidate);
  const gate = hardGate(item, [item]);
  assert.equal(gate.verdict, "REJECT");
  assert.ok(gate.reasons.some(({ gate: id }) => id === "G02_UNSUPPORTED_OUTCOME"));
  assert.ok(gate.reasons.some(({ gate: id }) => id === "G03_MUTATION_LANGUAGE"));
});

test("retrieval evidence and novelty are separate fields", () => {
  const indexed = indexAndCompare(enumerate().slice(0, 3).map(decompile));
  assert.ok(Array.isArray(indexed[0].neighbors));
  assert.equal(typeof indexed[0].novelty, "number");
});
