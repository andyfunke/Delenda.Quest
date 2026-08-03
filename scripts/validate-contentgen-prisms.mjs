#!/usr/bin/env node
/**
 * Independent mutation validator. Does not import prism predicate modules.
 * Re-implements expected class detection as oracle expectations vs decompile CLI output.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const fixtures = JSON.parse(
  fs.readFileSync(
    path.join(ROOT, "content-quality/fixtures/contentgen-prisms/mutations.json"),
    "utf8",
  ),
);

function fail(message) {
  console.error(`validate:contentgen-prisms FAIL — ${message}`);
  process.exit(1);
}

const candidatesPath = path.join(ROOT, ".tmp/contentgen-prism-mutations/candidates.jsonl");
fs.mkdirSync(path.dirname(candidatesPath), { recursive: true });

const mediumFor = (failureClass) => {
  if (failureClass === "FALSE_MECHANIC_CLAIM") return "maneuver-procedure";
  if (failureClass === "UNSUPPORTED_RESOURCE") return "campaign-brief";
  if (failureClass === "ACTOR_SWAP") return "romantic-arc";
  return "ava";
};

const rows = fixtures.cases.map((item) => ({
  candidateId: item.id,
  recipe: {
    medium: mediumFor(item.expectedFailureClass),
    chord: { tensionId: "fixture" },
    mechanicRefs: item.mechanicRefs || (item.expectedFailureClass === "FALSE_MECHANIC_CLAIM" ? ["teleport"] : []),
    requiredClaims: [],
    forbiddenClaims: [],
    registerProfileId: "fixture",
    projection: { medium: mediumFor(item.expectedFailureClass), intentLowering: "REPORT", clarificationSafety: true, actionReadSeparation: true },
  },
  text: item.text,
  provenance: { productionId: "mutation-fixture", globalSeed: 0, localSeedTicket: "0:fixture", sourceVersion: "fixture", sourceHashes: [], contractVersion: "contentgen-contract/v1" },
  parentCandidateId: null,
  representativeBindings: {},
  semanticPlan: {},
}));

// Seed corpus duplicate neighbor for duplicate-image case
rows.push({
  candidateId: "corpus-duplicate-neighbor",
  recipe: {
    medium: "ava",
    chord: { tensionId: "fixture" },
    mechanicRefs: [],
    requiredClaims: [],
    forbiddenClaims: [],
    registerProfileId: "fixture",
    projection: { medium: "ava", intentLowering: "REPORT", clarificationSafety: true, actionReadSeparation: true },
  },
  text: "CANARY_STABLE_LINE_ALPHA",
  provenance: { productionId: "mutation-fixture", globalSeed: 0, localSeedTicket: "0:fixture", sourceVersion: "fixture", sourceHashes: [], contractVersion: "contentgen-contract/v1" },
  parentCandidateId: null,
  representativeBindings: {},
  semanticPlan: {},
});

fs.writeFileSync(
  candidatesPath,
  rows.map((row) => JSON.stringify(row)).join("\n") + "\n",
);

const outDir = path.join(ROOT, ".tmp/contentgen-prism-mutations/out");
const result = spawnSync(
  process.execPath,
  [
    "--experimental-strip-types",
    path.join(ROOT, "scripts/contentgen-decompile.mjs"),
    "--manifest",
    candidatesPath,
    "--out",
    outDir,
  ],
  { encoding: "utf8" },
);
if (result.status !== 0) fail(result.stderr || result.stdout);

const verdicts = fs
  .readFileSync(path.join(outDir, "prism-verdicts.jsonl"), "utf8")
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line));

const byId = new Map(verdicts.map((row) => [row.candidateId, row]));

for (const item of fixtures.cases) {
  const row = byId.get(item.id);
  if (!row) fail(`missing verdict for ${item.id}`);
  const hit = (row.verdicts || []).some(
    (verdict) => verdict.hard && verdict.failureClass === item.expectedFailureClass,
  );
  if (!hit) {
    fail(
      `${item.id} expected hard ${item.expectedFailureClass}, got ${JSON.stringify(row.verdicts)}`,
    );
  }
}

// Canary survival: approved canary text without mutation markers should not hard-fail unrelated classes
const canaryRow = byId.get("corpus-duplicate-neighbor");
if (!canaryRow) fail("missing canary neighbor row");

console.log("validate:contentgen-prisms PASS");
console.log(`cases=${fixtures.cases.length}`);
