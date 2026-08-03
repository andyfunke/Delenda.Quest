#!/usr/bin/env node
/**
 * Independent inventory validator — does not import the enumerator module.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

function fail(message) {
  console.error(`validate:contentgen-enumerate FAIL — ${message}`);
  process.exit(1);
}

const inventory = JSON.parse(
  fs.readFileSync(
    path.join(ROOT, "content-quality/inventory/production-inventory.v1.json"),
    "utf8",
  ),
);
const requiredOwners = [
  "app/ava/relevance-engine.ts",
  "app/game.ts",
  "app/campaign-substrate.ts",
  "app/sub-mission-content.ts",
  "app/war-dispatch.ts",
];
for (const owner of requiredOwners) {
  if (!inventory.productions.some((row) => row.owner === owner)) {
    fail(`inventory missing required owner ${owner}`);
  }
}

const outA = path.join(ROOT, ".tmp/contentgen-enumerate-a");
const outB = path.join(ROOT, ".tmp/contentgen-enumerate-b");
const handCalculatedExecutionMin = 3 + 1;

const runSync = (out) => {
  const result = spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      path.join(ROOT, "scripts/contentgen-enumerate.mjs"),
      "--seed",
      "7",
      "--out",
      out,
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    fail(`enumerate failed: ${result.stderr || result.stdout}`);
  }
  return {
    identity: fs.readFileSync(path.join(out, "identity-hash.txt"), "utf8"),
    candidates: fs
      .readFileSync(path.join(out, "candidates.jsonl"), "utf8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line)),
    capacity: JSON.parse(fs.readFileSync(path.join(out, "capacity.json"), "utf8")),
    bytes: {
      candidates: fs.readFileSync(path.join(out, "candidates.jsonl")),
      failures: fs.readFileSync(path.join(out, "failures.jsonl")),
      capacity: fs.readFileSync(path.join(out, "capacity.json")),
      identity: fs.readFileSync(path.join(out, "identity-hash.txt")),
    },
  };
};

const first = runSync(outA);
const second = runSync(outB);

if (!first.bytes.candidates.equals(second.bytes.candidates)) {
  fail("candidates.jsonl not byte-identical across two runs");
}
if (!first.bytes.failures.equals(second.bytes.failures)) {
  fail("failures.jsonl not byte-identical across two runs");
}
if (!first.bytes.capacity.equals(second.bytes.capacity)) {
  fail("capacity.json not byte-identical across two runs");
}
if (first.identity !== second.identity) {
  fail("identity-hash drift across two runs");
}

const productionIds = new Set(
  first.candidates.map((row) => row.provenance.productionId),
);
for (const production of inventory.productions) {
  if (!productionIds.has(production.id)) {
    fail(`enumerator omitted inventory production ${production.id}`);
  }
}

const ids = first.candidates.map((row) => row.candidateId);
if (new Set(ids).size !== ids.length) fail("duplicate candidateId emitted");

for (const candidate of first.candidates) {
  for (const cls of candidate.recipe.equivalenceClasses) {
    if (!cls.representatives?.length) {
      fail(`missing equivalence representative on ${candidate.candidateId}`);
    }
  }
}

const executionCount = first.candidates.filter(
  (row) => row.recipe.medium === "execution-scene",
).length;
if (executionCount < handCalculatedExecutionMin) {
  fail(
    `execution-scene candidate count ${executionCount} < hand-calculated ${handCalculatedExecutionMin}`,
  );
}

if (first.capacity.packCapacity < first.candidates.length) {
  fail("packCapacity below candidate count");
}

console.log("validate:contentgen-enumerate PASS");
console.log(`candidates=${first.candidates.length}`);
console.log(`identityHash=${first.identity.trim()}`);
console.log("byteIdentical=true");
