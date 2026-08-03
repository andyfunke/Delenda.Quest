#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { trainPolicy } from "../packages/contentgen-train/src/trainer.mjs";

function arg(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return fallback;
  return process.argv[idx + 1];
}

const corpusVersion = arg("--corpus", "ava-taste/v2-calibrated");
const outDir = arg("--out", "content-quality/policy/out");
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
const canaries = readFileSync("content-quality/corpus/canaries.jsonl", "utf8")
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line));

const rows = [...approved, ...rejected].map((row, index) => ({
  ...row,
  sessionId: `session-${index % 3}`,
  discretePredicates: [
    row.failureClass ? `failureClass=${row.failureClass}` : null,
    row.chord ? `chord=${row.chord}` : null,
    row.imageFamily ? `imageFamily=${row.imageFamily}` : null,
  ].filter(Boolean),
}));

const result = trainPolicy(rows, {
  medium: "ava",
  corpusVersion,
  approvedCanaryIds: canaries.filter((row) => row.label === "approved").map((row) => row.id),
});

mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "policy-candidate.json"), `${JSON.stringify(result.policy, null, 2)}\n`);
writeFileSync(
  path.join(outDir, "held-out.jsonl"),
  `${result.heldOut.map((row) => JSON.stringify(row)).join("\n")}\n`,
);
writeFileSync(path.join(outDir, "training-receipt.json"), `${JSON.stringify(result.receipt, null, 2)}\n`);
writeFileSync(path.join(outDir, "prism-proposals.json"), `${JSON.stringify(result.proposals, null, 2)}\n`);
console.log(
  JSON.stringify({
    ok: true,
    policyHash: result.policy.policyHash,
    heldOut: result.heldOut.length,
    proposals: result.proposals.length,
    outDir,
  }),
);
