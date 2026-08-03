import test from "node:test";
import assert from "node:assert/strict";
import { aggregateWeakLabels, attributeDiff, bm25, buildRetrievalIndex, minhashCandidates } from "../scripts/ava-content-quality.mjs";

const docs = [
  { id: "a", text: "delay delegates terms", chord: "delay" },
  { id: "b", text: "trust requires corroboration", chord: "trust" },
  { id: "c", text: "delay is a choice", chord: "delay" },
];

test("BM25 and TF-IDF/MinHash indexes are deterministic and searchable", () => {
  const a = buildRetrievalIndex(docs); const b = buildRetrievalIndex(docs);
  assert.deepEqual(a, b);
  assert.equal(bm25("delay", a)[0].id, "a");
  assert.equal(minhashCandidates("delay delegates terms", a)[0].id, "a");
});

test("weak labels preserve hard safety rejection", () => {
  const label = aggregateWeakLabels({ candidate: { chord: "delay" }, features: { uniqueTokenRatio: 1, tokenCount: 8 }, gate: { reasons: [{ failureClass: "AUTHORITY_LEAK" }] } }, { acceptThreshold: 2 });
  assert.equal(label.verdict, "REJECT");
});

test("watcher attribution rejects multi-layer drift", () => {
  assert.deepEqual(attributeDiff({ grammarVersion: "a", corpusVersion: "a" }, { grammarVersion: "b", corpusVersion: "b" }).attributable, false);
  assert.equal(attributeDiff({ grammarVersion: "a", corpusVersion: "a" }, { grammarVersion: "b", corpusVersion: "a" }).reason, "grammarVersion");
});
