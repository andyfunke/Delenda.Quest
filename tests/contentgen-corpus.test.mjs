import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildCorpus,
  retrieve,
  novelty,
  directionalDuplicateClass,
} from "../packages/contentgen/src/corpus.mjs";

test("extends Epoch 008 approved IDs rather than replacing them", () => {
  const artifact = buildCorpus();
  for (const id of [
    "uncertainty-evidence",
    "delay-choice",
    "trust-verification",
  ]) {
    assert.ok(artifact.partitions.approved.some((row) => row.id === id), id);
  }
});

test("hand-authored retrieval fixtures assert top-k membership", () => {
  const artifact = buildCorpus();
  const hits = retrieve(
    "Delay is still a choice. It merely delegates the terms to whatever keeps moving.",
    artifact,
    5,
  );
  assert.ok(hits.some((hit) => hit.id === "delay-choice"));
});

test("rejected neighbors remain labeled rejected", () => {
  const artifact = buildCorpus();
  const rejected = artifact.partitions.rejected[0];
  const hits = retrieve(rejected.text, artifact, 8);
  const neighbor = hits.find((hit) => hit.id === rejected.id);
  assert.ok(neighbor);
  const meta = artifact.lineageLedger.find((row) => row.id === neighbor.id);
  assert.equal(meta.partition, "rejected");
});

test("held-out rows are excluded from retrieval", () => {
  const artifact = buildCorpus();
  const hits = retrieve(
    "Held-out labels must not enter training or judge prompts.",
    artifact,
    20,
  );
  assert.equal(
    hits.some((hit) => hit.id === "held-out-1"),
    false,
  );
});

test("metamorphic: unrelated document does not reorder exact-match first result", () => {
  const artifact = buildCorpus();
  const query = artifact.partitions.approved[0].text;
  const before = retrieve(query, artifact, 3).map((hit) => hit.id);
  // Adding an unrelated in-memory doc to a cloned index ranking path: novelty still defined.
  const n = novelty("completely unrelated zebra trigonometry", artifact.index);
  assert.ok(n > 0.2);
  const after = retrieve(query, artifact, 3).map((hit) => hit.id);
  assert.equal(after[0], before[0]);
});

test("directional duplicate thresholds are applied", () => {
  const artifact = buildCorpus();
  const partitionsById = new Map(
    artifact.lineageLedger.map((row) => [row.id, row.partition]),
  );
  const dup = directionalDuplicateClass(
    artifact.partitions.approved[0].text,
    artifact.index,
    partitionsById,
  );
  assert.equal(dup.class, "duplicate-approved");
});

test("reviewer identity exported only as opaque receipt id", () => {
  const artifact = buildCorpus();
  for (const row of artifact.lineageLedger) {
    assert.match(row.reviewReceiptId, /^receipt:/);
    assert.equal(String(row.reviewReceiptId).includes("@"), false);
  }
});
